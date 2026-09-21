use anchor_lang::prelude::*;

/// Platform fee parameters, singleton PDA (seeds: `["config"]`) — tunable
/// without a redeploy, and the take rate is publicly auditable on-chain
/// rather than living in a backend. See docs/Architecture.md.
#[account]
#[derive(InitSpace)]
pub struct Config {
    /// The only signer allowed to call `update_config`.
    pub admin: Pubkey,
    /// Where the platform fee portion of every `create_gift` goes.
    pub treasury: Pubkey,
    /// The backend's signing key. Required co-signer on every
    /// dedicated-by-email claim (proves the backend already checked the
    /// claimer's Privy-verified email off-chain — see docs/App.md's
    /// "Wallet-less claiming" section) and the account that receives rent
    /// refunds / reimbursement on sponsored (no-SOL) claims. Not present
    /// in the original Architecture.md field list — added here because
    /// the program has no other way to recognize "the trusted backend"
    /// on-chain; docs/Architecture.md should be updated to match.
    pub backend_authority: Pubkey,
    /// The only mint `create_gift` will accept as the escrow currency.
    /// Without this, the program was mint-agnostic — anyone could escrow
    /// an arbitrary (fake, or Token-2022-with-a-permanent-delegate) token
    /// while it still looked like an ordinary gift in the app. See
    /// docs/SecurityAudit.md finding #3. Admin-settable (like `treasury`)
    /// rather than hardcoded, since the address differs per cluster
    /// (devnet test mints vs. mainnet's real USDC) and this same pattern
    /// already exists for every other operational parameter here.
    pub usdc_mint: Pubkey,
    /// Basis points, e.g. 250 = 2.5%. Hard-capped at `MAX_FEE_BPS` inside
    /// `update_config` and `initialize_config` — even a compromised admin
    /// key can't set an arbitrary fee.
    pub fee_bps: u16,
    /// Minimum fee in USDC base units (6 decimals), e.g. 150_000 = $0.15.
    pub fee_min_usdc: u64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum RecipientMode {
    Dedicated,
    Fcfs,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum GiftStatus {
    Pending,
    Claimed,
    Canceled,
}

/// One gift's escrow record, PDA (seeds: `["gift", claim_seed]`) — see
/// docs/Architecture.md's "Gift account" section. The vault (a USDC token
/// account owned by this PDA) is created alongside it at `create_gift` and
/// always fully closed by whichever instruction settles the gift
/// (`claim_gift` or `cancel_gift`) — no permanently-alive accounts.
#[account]
#[derive(InitSpace)]
pub struct Gift {
    pub sender: Pubkey,
    /// Target tokenized-stock mint — informational only for the program
    /// (the actual USDC -> stock swap happens outside this program, see
    /// "Composing the swap" in Architecture.md); stored so an indexer
    /// doesn't have to separately track which mint a gift is denominated
    /// against.
    pub stock_mint: Pubkey,
    /// Escrowed face value. The recipient always receives exactly this
    /// amount — the platform fee is charged on top at `create_gift`, not
    /// carved out of this figure.
    pub amount_usdc: u64,
    pub recipient_mode: RecipientMode,
    /// Set for dedicated-by-wallet gifts (`recipient_mode == Dedicated`).
    pub recipient_wallet: Option<Pubkey>,
    /// Set for dedicated-by-email gifts (`recipient_mode == Dedicated`).
    /// A commitment (e.g. `sha256(lowercased email)`), not the raw email
    /// address — email identity itself is verified off-chain by Privy at
    /// claim time (see docs/Architecture.md), this hash only lets the
    /// backend prove *which* gift a given verified email is allowed to
    /// claim without putting the plaintext address on-chain.
    pub recipient_email_hash: Option<[u8; 32]>,
    pub status: GiftStatus,
    pub created_at: i64,
    /// Random, client-generated at `create_gift` — the claim link encodes
    /// this directly. Random (not a derivable sender+nonce seed)
    /// specifically so a claim link can't be enumerated by scanning
    /// possible PDAs.
    pub claim_seed: [u8; 16],
    pub bump: u8,
}
