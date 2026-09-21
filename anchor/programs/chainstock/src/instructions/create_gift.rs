use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked};

use crate::constants::{CONFIG_SEED, GIFT_SEED};
use crate::errors::ChainStockError;
use crate::state::{Config, Gift, GiftStatus, RecipientMode};

#[derive(Accounts)]
#[instruction(claim_seed: [u8; 16])]
pub struct CreateGift<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,

    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,

    #[account(
        init,
        payer = sender,
        space = 8 + Gift::INIT_SPACE,
        seeds = [GIFT_SEED, claim_seed.as_ref()],
        bump,
    )]
    pub gift: Account<'info, Gift>,

    // Pinned to `config.usdc_mint` — without this, `create_gift` was
    // mint-agnostic: anyone could escrow an arbitrary (fake, or
    // Token-2022-with-a-permanent-delegate) token while it still looked
    // like an ordinary gift in the app. See docs/SecurityAudit.md finding
    // #3. `claim_gift`/`cancel_gift` don't need the same check — a gift's
    // vault already has its real mint locked in from creation, and their
    // own `associated_token::mint = usdc_mint` constraints already cross-
    // check the passed-in `usdc_mint` against the vault's actual stored
    // mint field.
    #[account(address = config.usdc_mint @ ChainStockError::WrongUsdcMint)]
    pub usdc_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = sender,
    )]
    pub sender_usdc: InterfaceAccount<'info, TokenAccount>,

    /// The escrow vault — a fresh USDC token account owned by the `Gift`
    /// PDA itself, so only this program (via a PDA signer) can ever move
    /// funds out of it.
    #[account(
        init,
        payer = sender,
        associated_token::mint = usdc_mint,
        associated_token::authority = gift,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    /// The platform fee's destination. Not `init` here — provisioning the
    /// treasury's own USDC account is a one-time ops step, not something
    /// every sender should incidentally pay rent for.
    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = config.treasury,
    )]
    pub treasury_usdc: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateGift>,
    claim_seed: [u8; 16],
    amount_usdc: u64,
    stock_mint: Pubkey,
    recipient_mode: RecipientMode,
    recipient_wallet: Option<Pubkey>,
    recipient_email_hash: Option<[u8; 32]>,
) -> Result<()> {
    require!(amount_usdc > 0, ChainStockError::ZeroAmount);

    match recipient_mode {
        RecipientMode::Dedicated => require!(
            recipient_wallet.is_some() ^ recipient_email_hash.is_some(),
            ChainStockError::InvalidDedicatedRecipient
        ),
        RecipientMode::Fcfs => require!(
            recipient_wallet.is_none() && recipient_email_hash.is_none(),
            ChainStockError::UnexpectedFcfsRecipient
        ),
    }

    let config = &ctx.accounts.config;
    // Checked arithmetic throughout — see the security checklist in
    // .agents/skills/solana-dev/references/security.md.
    let fee_from_bps = (amount_usdc as u128)
        .checked_mul(config.fee_bps as u128)
        .ok_or(ChainStockError::Overflow)?
        .checked_div(10_000)
        .ok_or(ChainStockError::Overflow)? as u64;
    let fee = fee_from_bps.max(config.fee_min_usdc);

    let decimals = ctx.accounts.usdc_mint.decimals;
    let token_program = ctx.accounts.token_program.key();

    // 1. amount_usdc into the escrow vault.
    transfer_checked(
        CpiContext::new(
            token_program,
            TransferChecked {
                from: ctx.accounts.sender_usdc.to_account_info(),
                mint: ctx.accounts.usdc_mint.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.sender.to_account_info(),
            },
        ),
        amount_usdc,
        decimals,
    )?;

    // 2. fee into the treasury — same transaction, so a sender is charged
    // amount_usdc + fee in total but Gift.amount_usdc only ever records
    // the escrowed face value (the recipient's later claim is unaffected
    // by the fee).
    transfer_checked(
        CpiContext::new(
            token_program,
            TransferChecked {
                from: ctx.accounts.sender_usdc.to_account_info(),
                mint: ctx.accounts.usdc_mint.to_account_info(),
                to: ctx.accounts.treasury_usdc.to_account_info(),
                authority: ctx.accounts.sender.to_account_info(),
            },
        ),
        fee,
        decimals,
    )?;

    let gift = &mut ctx.accounts.gift;
    gift.sender = ctx.accounts.sender.key();
    gift.stock_mint = stock_mint;
    gift.amount_usdc = amount_usdc;
    gift.recipient_mode = recipient_mode;
    gift.recipient_wallet = recipient_wallet;
    gift.recipient_email_hash = recipient_email_hash;
    gift.status = GiftStatus::Pending;
    gift.created_at = Clock::get()?.unix_timestamp;
    gift.claim_seed = claim_seed;
    gift.bump = ctx.bumps.gift;

    Ok(())
}
