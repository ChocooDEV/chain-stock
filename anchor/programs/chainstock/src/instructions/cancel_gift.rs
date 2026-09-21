use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    close_account, transfer_checked, CloseAccount, Mint, TokenAccount, TokenInterface,
    TransferChecked,
};

use crate::constants::GIFT_SEED;
use crate::errors::ChainStockError;
use crate::state::{Gift, GiftStatus};

/// Same instruction for both dedicated and FCFS gifts — per docs/App.md's
/// "FCFS is cancelable too" decision. Sender is always both the
/// authorizer and the rent receiver here (never sponsored), so this needs
/// no separate `rent_receiver` account the way `claim_gift` does.
#[derive(Accounts)]
pub struct CancelGift<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,

    #[account(
        mut,
        seeds = [GIFT_SEED, gift.claim_seed.as_ref()],
        bump = gift.bump,
        has_one = sender @ ChainStockError::UnauthorizedCanceler,
        close = sender,
    )]
    pub gift: Account<'info, Gift>,

    pub usdc_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = gift,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = sender,
    )]
    pub sender_usdc: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn handler(ctx: Context<CancelGift>) -> Result<()> {
    require!(
        ctx.accounts.gift.status == GiftStatus::Pending,
        ChainStockError::GiftNotPending
    );

    let claim_seed = ctx.accounts.gift.claim_seed;
    let bump = ctx.accounts.gift.bump;
    let decimals = ctx.accounts.usdc_mint.decimals;
    let signer_seeds: &[&[u8]] = &[GIFT_SEED, claim_seed.as_ref(), &[bump]];
    let signer_seeds_arr = &[signer_seeds];

    let token_program = ctx.accounts.token_program.key();

    // See claim_gift.rs's handler for why this is the vault's actual live
    // balance rather than `gift.amount_usdc` — the same donation-griefing
    // vector (anyone sending extra tokens to the vault's public ATA to
    // permanently break `close_account`'s zero-balance requirement)
    // applies equally to cancel's refund path.
    let amount = ctx.accounts.vault.amount;

    transfer_checked(
        CpiContext::new_with_signer(
            token_program,
            TransferChecked {
                from: ctx.accounts.vault.to_account_info(),
                mint: ctx.accounts.usdc_mint.to_account_info(),
                to: ctx.accounts.sender_usdc.to_account_info(),
                authority: ctx.accounts.gift.to_account_info(),
            },
            signer_seeds_arr,
        ),
        amount,
        decimals,
    )?;

    close_account(CpiContext::new_with_signer(
        token_program,
        CloseAccount {
            account: ctx.accounts.vault.to_account_info(),
            destination: ctx.accounts.sender.to_account_info(),
            authority: ctx.accounts.gift.to_account_info(),
        },
        signer_seeds_arr,
    ))?;

    ctx.accounts.gift.status = GiftStatus::Canceled;

    Ok(())
}
