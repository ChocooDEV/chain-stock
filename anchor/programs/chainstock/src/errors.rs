use anchor_lang::prelude::*;

#[error_code]
pub enum ChainStockError {
    #[msg("Signer is not the config admin")]
    Unauthorized,
    #[msg("fee_bps exceeds the hard-coded maximum")]
    FeeTooHigh,
    #[msg("amount_usdc must be greater than zero")]
    ZeroAmount,
    #[msg("Dedicated gift must set exactly one of recipient_wallet / recipient_email_hash")]
    InvalidDedicatedRecipient,
    #[msg("FCFS gift must not set recipient_wallet or recipient_email_hash")]
    UnexpectedFcfsRecipient,
    #[msg("Gift is not in Pending status")]
    GiftNotPending,
    #[msg("Signer is not the recipient this gift is dedicated to")]
    UnauthorizedClaimer,
    #[msg("Dedicated-by-email claims require the backend authority's co-signature")]
    MissingBackendAttestation,
    #[msg("Signer is not the gift's original sender")]
    UnauthorizedCanceler,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("usdc_mint does not match config.usdc_mint")]
    WrongUsdcMint,
}
