use anchor_lang::prelude::*;

use crate::constants::{CONFIG_SEED, MAX_FEE_BPS};
use crate::errors::ChainStockError;
use crate::state::Config;

/// Admin-only. Every parameter is optional so a single call can tune just
/// one field without having to resend the others. See docs/Architecture.md.
#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = admin @ ChainStockError::Unauthorized,
    )]
    pub config: Account<'info, Config>,

    pub admin: Signer<'info>,
}

pub fn handler(
    ctx: Context<UpdateConfig>,
    fee_bps: Option<u16>,
    fee_min_usdc: Option<u64>,
    treasury: Option<Pubkey>,
    backend_authority: Option<Pubkey>,
) -> Result<()> {
    let config = &mut ctx.accounts.config;

    if let Some(fee_bps) = fee_bps {
        require!(fee_bps <= MAX_FEE_BPS, ChainStockError::FeeTooHigh);
        config.fee_bps = fee_bps;
    }
    if let Some(fee_min_usdc) = fee_min_usdc {
        config.fee_min_usdc = fee_min_usdc;
    }
    if let Some(treasury) = treasury {
        config.treasury = treasury;
    }
    if let Some(backend_authority) = backend_authority {
        config.backend_authority = backend_authority;
    }

    Ok(())
}
