pub mod cancel_gift;
pub mod claim_gift;
pub mod close_config;
pub mod create_gift;
pub mod initialize_config;
pub mod update_config;

// Only the Accounts structs are re-exported unqualified (for `Context<T>`
// use in lib.rs) — every module's `handler` fn shares the same name on
// purpose (mirrors the instruction it belongs to), so those stay
// qualified (`create_gift::handler(...)`) to avoid a glob collision.
pub use cancel_gift::CancelGift;
pub use claim_gift::ClaimGift;
pub use close_config::CloseConfig;
pub use create_gift::CreateGift;
pub use initialize_config::InitializeConfig;
pub use update_config::UpdateConfig;

// `#[derive(Accounts)]` also emits a `pub(crate) mod __client_accounts_*`
// per struct (used by the `#[program]` macro to build the crate's
// `accounts` module for client codegen) which it expects reachable at the
// crate root as `crate::__client_accounts_*` — re-export those here too,
// or `#[program]` in lib.rs fails with "unresolved import `crate`".
pub(crate) use cancel_gift::__client_accounts_cancel_gift;
pub(crate) use claim_gift::__client_accounts_claim_gift;
pub(crate) use close_config::__client_accounts_close_config;
pub(crate) use create_gift::__client_accounts_create_gift;
pub(crate) use initialize_config::__client_accounts_initialize_config;
pub(crate) use update_config::__client_accounts_update_config;
