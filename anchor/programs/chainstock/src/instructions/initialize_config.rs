use anchor_lang::prelude::*;

use crate::constants::{CONFIG_SEED, MAX_FEE_BPS};
use crate::errors::ChainStockError;
use crate::state::Config;

/// One-time setup, not listed as a named instruction in Architecture.md's
/// prose (which only documents `update_config`) but required to actually
/// create the `Config` singleton PDA in the first place. Whoever calls
/// this becomes `admin` — per Architecture.md's "hackathon-practical
/// setup," that's expected to be a single founder-held keypair for now.
#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + Config::INIT_SPACE,
        seeds = [CONFIG_SEED],
        bump,
    )]
    pub config: Account<'info, Config>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializeConfig>,
    treasury: Pubkey,
    backend_authority: Pubkey,
    usdc_mint: Pubkey,
    fee_bps: u16,
    fee_min_usdc: u64,
) -> Result<()> {
    require!(fee_bps <= MAX_FEE_BPS, ChainStockError::FeeTooHigh);

    let config = &mut ctx.accounts.config;
    config.admin = ctx.accounts.admin.key();
    config.treasury = treasury;
    config.backend_authority = backend_authority;
    config.usdc_mint = usdc_mint;
    config.fee_bps = fee_bps;
    config.fee_min_usdc = fee_min_usdc;
    config.bump = ctx.bumps.config;

    Ok(())
}
