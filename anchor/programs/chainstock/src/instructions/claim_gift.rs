use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{
    close_account, transfer_checked, CloseAccount, Mint, TokenAccount, TokenInterface,
    TransferChecked,
};

use crate::constants::{CONFIG_SEED, GIFT_SEED};
use crate::errors::ChainStockError;
use crate::state::{Config, Gift, GiftStatus, RecipientMode};

/// Authorization differs by recipient mode (see docs/Architecture.md), but
/// every mode ends up needing the same account shape, so one `Accounts`
/// struct covers all three rather than three near-duplicate ones:
///
/// - **Dedicated-by-wallet**: `claimer` must equal `gift.recipient_wallet`
///   — checked on-chain, fully permissionless otherwise.
/// - **Dedicated-by-email**: the program can't check an email itself, so
///   `backend_authority` must be a real co-signer — it only signs after
///   checking the caller's Privy-verified email off-chain (see App.md).
/// - **FCFS**: no identity check; whoever lands a valid transaction first
///   wins (the vault closing on success is what stops a second claim, not
///   a status flag some client could race).
///
/// `payer` funds the recipient's USDC associated-token-account if it
/// doesn't exist yet (a fresh Privy wallet has none) and is expected to
/// also be the transaction's fee payer — either `claimer` themself
/// (self-funded) or `backend_authority`'s own keypair (sponsored, see
/// App.md's "Wallet-less claiming"). `backend_authority` is always
/// present as an account (so its pubkey can be checked against
/// `config.backend_authority`) but is only required to actually *sign*
/// for dedicated-by-email claims.
#[derive(Accounts)]
pub struct ClaimGift<'info> {
    pub claimer: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: identity checked against `config.backend_authority` in the
    /// handler; only required to have actually signed for
    /// dedicated-by-email claims (checked there too).
    pub backend_authority: UncheckedAccount<'info>,

    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [GIFT_SEED, gift.claim_seed.as_ref()],
        bump = gift.bump,
        close = rent_receiver,
    )]
    pub gift: Account<'info, Gift>,

    /// CHECK: rent destination only — see docs/Architecture.md's "Rent
    /// destination" rule (whoever paid the tx fee receives it). No
    /// exploit if a client points this elsewhere; worst case is a wrong
    /// party keeping ~0.002 SOL of rent, not a fund-safety issue.
    #[account(mut)]
    pub rent_receiver: UncheckedAccount<'info>,

    pub usdc_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = gift,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = usdc_mint,
        associated_token::authority = claimer,
    )]
    pub recipient_usdc: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ClaimGift>) -> Result<()> {
    let gift = &ctx.accounts.gift;
    require!(gift.status == GiftStatus::Pending, ChainStockError::GiftNotPending);

    // Always validated, regardless of mode — cheap, and means no code path
    // can later be tempted to trust an unchecked backend_authority pubkey.
    require_keys_eq!(
        ctx.accounts.backend_authority.key(),
        ctx.accounts.config.backend_authority,
        ChainStockError::Unauthorized
    );

    match gift.recipient_mode {
        RecipientMode::Dedicated => {
            if let Some(recipient_wallet) = gift.recipient_wallet {
                require_keys_eq!(
                    ctx.accounts.claimer.key(),
                    recipient_wallet,
                    ChainStockError::UnauthorizedClaimer
                );
            } else {
                // Dedicated-by-email: gift.recipient_email_hash is Some.
                // The hash comparison itself already happened off-chain,
                // in the backend route that decided to co-sign this
                // transaction at all — see docs/Architecture.md.
                require!(
                    ctx.accounts.backend_authority.is_signer,
                    ChainStockError::MissingBackendAttestation
                );
            }
        }
        RecipientMode::Fcfs => {
            // No identity check — link secrecy plus the off-chain anti-bot
            // layer (CAPTCHA, rate limiting) is the real access control
            // here, not on-chain identity. See docs/Architecture.md.
        }
    }

    let amount = gift.amount_usdc;
    let claim_seed = gift.claim_seed;
    let bump = gift.bump;
    let decimals = ctx.accounts.usdc_mint.decimals;
    let signer_seeds: &[&[u8]] = &[GIFT_SEED, claim_seed.as_ref(), &[bump]];
    let signer_seeds_arr = &[signer_seeds];

    let token_program = ctx.accounts.token_program.to_account_info();

    transfer_checked(
        CpiContext::new_with_signer(
            token_program.clone(),
            TransferChecked {
                from: ctx.accounts.vault.to_account_info(),
                mint: ctx.accounts.usdc_mint.to_account_info(),
                to: ctx.accounts.recipient_usdc.to_account_info(),
                authority: ctx.accounts.gift.to_account_info(),
            },
            signer_seeds_arr,
        ),
        amount,
        decimals,
    )?;

    // The vault is a token-program-owned account, not a plain Anchor
    // `Account<T>` — closing it needs the token program's own
    // CloseAccount CPI (which also checks `amount == 0`, satisfied since
    // the transfer above just drained it), not Anchor's `close`
    // constraint (that's used on `gift` below instead, which *is* a
    // plain Anchor account).
    close_account(CpiContext::new_with_signer(
        token_program,
        CloseAccount {
            account: ctx.accounts.vault.to_account_info(),
            destination: ctx.accounts.rent_receiver.to_account_info(),
            authority: ctx.accounts.gift.to_account_info(),
        },
        signer_seeds_arr,
    ))?;

    ctx.accounts.gift.status = GiftStatus::Claimed;

    Ok(())
}
