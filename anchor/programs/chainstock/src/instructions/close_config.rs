use anchor_lang::prelude::*;

use crate::constants::CONFIG_SEED;
use crate::errors::ChainStockError;

/// Admin-only escape hatch: closes the `Config` PDA, refunding its rent
/// to `admin`. Exists so a schema change to `Config` (adding/removing a
/// field) can be recovered from by closing the old-layout account and
/// calling `initialize_config` fresh, rather than being permanently stuck
/// with an account the current program version's `Config` struct can no
/// longer deserialize. Deliberately uses `UncheckedAccount` + manual
/// validation rather than `Account<'info, Config>`: the whole point is to
/// close an account that may be in an *old* layout the *current* `Config`
/// struct doesn't match, and typed deserialization would fail before this
/// handler ever ran. Not part of the normal operational flow — only ever
/// needed around a program upgrade that changes `Config`'s shape.
#[derive(Accounts)]
pub struct CloseConfig<'info> {
    /// CHECK: owner and the stored `admin` field are validated manually
    /// in the handler (see its comment for why this isn't a typed
    /// `Account<'info, Config>`). `admin` is read directly from a fixed
    /// byte offset that's valid across any `Config` layout version, since
    /// it's always the first field immediately after the 8-byte
    /// discriminator, regardless of what's been added after it.
    #[account(mut, seeds = [CONFIG_SEED], bump)]
    pub config: UncheckedAccount<'info>,

    #[account(mut)]
    pub admin: Signer<'info>,
}

pub fn handler(ctx: Context<CloseConfig>) -> Result<()> {
    let config_info = ctx.accounts.config.to_account_info();
    require_keys_eq!(*config_info.owner, crate::ID, ChainStockError::Unauthorized);

    {
        let data = config_info.try_borrow_data()?;
        require!(data.len() >= 40, ChainStockError::Unauthorized); // 8-byte discriminator + 32-byte admin pubkey, minimum
        let stored_admin = Pubkey::try_from(&data[8..40]).map_err(|_| ChainStockError::Unauthorized)?;
        require_keys_eq!(stored_admin, ctx.accounts.admin.key(), ChainStockError::Unauthorized);
    }

    let admin_info = ctx.accounts.admin.to_account_info();
    let lamports = config_info.lamports();
    **admin_info.try_borrow_mut_lamports()? = admin_info
        .lamports()
        .checked_add(lamports)
        .ok_or(ChainStockError::Overflow)?;
    **config_info.try_borrow_mut_lamports()? = 0;
    config_info.try_borrow_mut_data()?.fill(0);

    Ok(())
}
