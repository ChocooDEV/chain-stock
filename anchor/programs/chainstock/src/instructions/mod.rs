pub mod cancel_gift;
pub mod claim_gift;
pub mod create_gift;
pub mod initialize_config;
pub mod update_config;

// Only the Accounts structs are re-exported unqualified (for `Context<T>`
// use in lib.rs) — every module's `handler` fn shares the same name on
// purpose (mirrors the instruction it belongs to), so those stay
// qualified (`create_gift::handler(...)`) to avoid a glob collision.
pub use cancel_gift::CancelGift;
pub use claim_gift::ClaimGift;
pub use create_gift::CreateGift;
pub use initialize_config::InitializeConfig;
pub use update_config::UpdateConfig;
