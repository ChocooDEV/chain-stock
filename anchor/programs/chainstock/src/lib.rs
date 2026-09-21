use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;
use state::RecipientMode;

declare_id!("3ubCASxd8ci746bJRNkdLZQvAzyS8kngFQ6smE3XohV5");

/// ChainStock's escrow/claim program — see docs/Architecture.md for the
/// full design rationale. Source of truth for money is always on-chain,
/// never the off-chain index (docs/App.md): every gift's escrowed USDC
/// lives in a real Solana account until `claim_gift` or `cancel_gift`
/// moves it, and both instructions always fully close the `Gift` PDA and
/// its vault — no permanently-alive accounts, no database-editable
/// balance.
#[program]
pub mod chainstock {
    use super::*;

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        treasury: Pubkey,
        backend_authority: Pubkey,
        usdc_mint: Pubkey,
        fee_bps: u16,
        fee_min_usdc: u64,
    ) -> Result<()> {
        instructions::initialize_config::handler(
            ctx,
            treasury,
            backend_authority,
            usdc_mint,
            fee_bps,
            fee_min_usdc,
        )
    }

    pub fn update_config(
        ctx: Context<UpdateConfig>,
        fee_bps: Option<u16>,
        fee_min_usdc: Option<u64>,
        treasury: Option<Pubkey>,
        backend_authority: Option<Pubkey>,
        usdc_mint: Option<Pubkey>,
    ) -> Result<()> {
        instructions::update_config::handler(
            ctx,
            fee_bps,
            fee_min_usdc,
            treasury,
            backend_authority,
            usdc_mint,
        )
    }

    pub fn close_config(ctx: Context<CloseConfig>) -> Result<()> {
        instructions::close_config::handler(ctx)
    }

    pub fn create_gift(
        ctx: Context<CreateGift>,
        claim_seed: [u8; 16],
        amount_usdc: u64,
        stock_mint: Pubkey,
        recipient_mode: RecipientMode,
        recipient_wallet: Option<Pubkey>,
        recipient_email_hash: Option<[u8; 32]>,
    ) -> Result<()> {
        instructions::create_gift::handler(
            ctx,
            claim_seed,
            amount_usdc,
            stock_mint,
            recipient_mode,
            recipient_wallet,
            recipient_email_hash,
        )
    }

    pub fn claim_gift(ctx: Context<ClaimGift>) -> Result<()> {
        instructions::claim_gift::handler(ctx)
    }

    pub fn cancel_gift(ctx: Context<CancelGift>) -> Result<()> {
        instructions::cancel_gift::handler(ctx)
    }
}
