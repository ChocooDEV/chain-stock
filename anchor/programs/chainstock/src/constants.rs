/// Hard cap on `Config.fee_bps`, enforced inside both `initialize_config`
/// and `update_config` — so even a compromised or malicious admin key
/// can't set an arbitrary fee. 1000 bps = 10%. See docs/Architecture.md's
/// Security hardening section.
pub const MAX_FEE_BPS: u16 = 1000;

pub const CONFIG_SEED: &[u8] = b"config";
pub const GIFT_SEED: &[u8] = b"gift";
