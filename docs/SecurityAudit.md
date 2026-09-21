# ChainStock — Anchor program security audit

Manual audit against the checklist in
[`.agents/skills/solana-dev/references/security.md`](../.agents/skills/solana-dev/references/security.md),
run against the compiled program on 2026-09-18 (the first session with a
working toolchain — see `TODO.md` section 1 and `anchor/README.md`).
Covers `initialize_config`, `update_config`, `create_gift`, `claim_gift`,
`cancel_gift`, and the `Config`/`Gift` account definitions.

Three real bugs found, all fixed. Two low-severity/accepted-tradeoff
notes. Everything else in the checklist reviewed clear — see "Reviewed,
no issues found" below for the full list of what was checked.

## Fixed

### 1. `update_config` was silently non-functional

**File:** `anchor/programs/chainstock/src/instructions/update_config.rs`

The `config` account in `UpdateConfig`'s `#[derive(Accounts)]` struct
wasn't marked `mut`:

```rust
#[account(
    seeds = [CONFIG_SEED],
    bump = config.bump,
    has_one = admin @ ChainStockError::Unauthorized,
)]
pub config: Account<'info, Config>,
```

Anchor only generates code to write a deserialized account's mutated
fields back to on-chain data for accounts marked `mut`. The handler
mutated `config.fee_bps`, `config.treasury`, etc. in memory, but without
`mut` those writes were never persisted — the instruction would return
`Ok(())` every time, giving the caller (and any block explorer) every
appearance of success, while the `Config` account's actual on-chain data
never changed. **Every past call to `update_config` — including the
`fee_bps`/`fee_min_usdc`/`backend_authority` set at `initialize_config`
— would have been permanently stuck**, with no error to signal it.

**Fix:** added `mut`. **Regression test:** `update_config_persists_and_is_admin_gated`
in `tests/claim_flow.rs` — updates `fee_bps`, then calls `create_gift` and
asserts the charged fee reflects the *new* rate (an indirect but solid
proof the write actually landed, since the old bug would have silently
kept charging the original rate forever). Also checks non-admin calls are
rejected.

### 2. Donation griefing could permanently freeze any gift's escrow

**Files:** `claim_gift.rs`, `cancel_gift.rs`

Both `claim_gift` and `cancel_gift` transferred exactly `gift.amount_usdc`
(the value stored at `create_gift` time) out of the vault, then called the
token program's `CloseAccount` instruction on the vault. `CloseAccount`
**requires the token account's balance to be exactly zero** to succeed —
standard, correct SPL Token behavior.

The vault's address is a plain Associated Token Account
(`get_associated_token_address(gift_pda, usdc_mint)`) — fully
deterministic and publicly derivable by anyone the moment a gift exists
on-chain. **Anyone holding even 1 base unit of the escrow token could
send it directly to that address** (no instruction in this program
mediates or expects this — a plain SPL transfer, not a call into
`chainstock` at all). From that point on, the vault's real balance would
permanently exceed `gift.amount_usdc`, so *every future* `claim_gift` or
`cancel_gift` attempt would drain only the recorded amount, leave the
donated excess behind, and then fail at the `CloseAccount` step —
reverting the whole transaction (Solana transactions are all-or-nothing).
**There was no recovery path**: every retry hits the exact same failure,
permanently freezing the sender's escrowed funds with neither the sender
nor the intended recipient able to ever retrieve them. Cost to an
attacker: a fraction of a cent, and no relationship to the sender or
recipient required — pure third-party griefing.

This matches the checklist's "Donation Attacks" category
("never derive protocol state from raw account balances") — the bug was
trusting the *stored* `gift.amount_usdc` as if it were guaranteed to
equal the vault's *actual* balance at settlement time.

**Fix:** both instructions now read `ctx.accounts.vault.amount` (the
vault's live balance) immediately before transferring, and transfer that
full amount instead of the stored value. This guarantees the vault is
always empty afterward (so `CloseAccount` always succeeds) and turns any
donated excess into a harmless bonus for whoever receives the transfer
(the recipient on claim, the sender on cancel) rather than a permanent
freeze. `gift.amount_usdc` is untouched as the informational/originally-
escrowed record.

**Regression tests:** `claim_gift_survives_a_donation_griefing_attempt`
and `cancel_gift_survives_a_donation_griefing_attempt` in
`tests/claim_flow.rs` — both donate extra tokens to a gift's vault before
settling it, and assert the settlement still succeeds and the full
(original + donated) balance lands with the correct party.

Both fixes were deployed as a program upgrade to devnet and re-verified
end-to-end via `examples/devnet_validate.rs` against the live network
(see `anchor/README.md`).

### 3. `usdc_mint` wasn't pinned to a known mint address on-chain

**Files:** `state.rs`, `initialize_config.rs`, `update_config.rs`,
`create_gift.rs`, plus a new `close_config.rs`

`usdc_mint` was accepted as a regular `InterfaceAccount<'info, Mint>`
parameter in `create_gift`, with no comparison against any known mint
pubkey. The program was therefore mint-agnostic by construction — it
would happily escrow and move *any* SPL Token or Token-2022 mint a caller
passed, trusting the client (and, downstream, the off-chain indexer) to
always supply real USDC.

Per `TODO.md`, `POST /api/gifts` doesn't yet decode the transaction's
instruction data against the claimed fields either — meaning the
off-chain index had no independent check. Combined, a malicious
`create_gift` caller could have denominated a "gift" in a worthless or
malicious token (e.g. a Token-2022 mint with the Permanent Delegate
extension, letting the creator silently drain the vault out from under an
intended recipient via a completely separate CPI path this program never
sees) while the app's UI/database showed it as an ordinary-looking
USDC-denominated gift.

**Fix:** added `usdc_mint: Pubkey` to `Config`, admin-settable at
`initialize_config` and updatable via `update_config` — the same pattern
already used for `treasury`/`backend_authority`, chosen specifically
because the real address differs per cluster (devnet test mints vs.
mainnet's real USDC) and can't be a single hardcoded constant. `create_gift`
now has an `#[account(address = config.usdc_mint @ ChainStockError::WrongUsdcMint)]`
constraint on its `usdc_mint` account, rejecting any other mint outright.
`claim_gift`/`cancel_gift` don't need the same check — a gift's vault
already has its real mint locked in from creation, and their own
`associated_token::mint = usdc_mint` constraints already cross-check
whatever `usdc_mint` is passed against the vault's actual stored mint.

Growing `Config` by one field meant the already-deployed devnet `Config`
PDA (sized for the old, smaller layout) could no longer be deserialized
by the upgraded program — Anchor's `realloc` constraint can't rescue
this, since deserialization into the typed struct happens *before* any
`realloc` logic runs (confirmed by reading `anchor-syn`'s actual codegen
order, not assumed). Added a minimal admin-only `close_config` instruction
(deliberately `UncheckedAccount` + manual validation reading just the
fixed-offset `admin` field, rather than a typed `Account<'info, Config>`,
for the same reason) as the general-purpose recovery path for this exact
situation, then used it once to close and re-initialize the live devnet
Config with the new field.

**Regression test:** `create_gift_rejects_a_mint_other_than_configs_usdc_mint`
in `tests/claim_flow.rs` — creates a second, genuinely different mint and
confirms `create_gift` rejects it. Verified live on devnet too: the
migration (`close_config` then fresh `initialize_config`) and the
ongoing-refresh path (`update_config` re-pointing `usdc_mint` at a new
run's fresh test mint) were both exercised for real via
`examples/devnet_validate.rs`, followed by a full create/claim cycle
succeeding only because the pinned mint matched.

## Low severity / accepted tradeoffs (not fixed)

- **Fee rounding.** `create_gift`'s bps-based fee calculation
  (`amount_usdc * fee_bps / 10_000`) uses integer division, which
  truncates (rounds down) — technically against the protocol's favor per
  the checklist's rounding-direction guidance. In practice this loses at
  most 1 base unit (`$0.000001`) per transaction, and is dominated by the
  `fee_min_usdc` floor for the vast majority of realistic gift amounts.
  Not worth the added complexity of round-up arithmetic for this
  magnitude of impact.
- **`create_gift` PDA griefing via observed `claim_seed`.** The `Gift`
  PDA's address is derived from a client-supplied, 128-bit random
  `claim_seed`. An attacker actively monitoring the mempool for a
  specific pending `create_gift` transaction could theoretically extract
  its `claim_seed` and submit their own `create_gift` with the same seed
  and a higher priority fee, causing the legitimate sender's transaction
  to fail (Anchor's `init` rejects an already-occupied PDA). No funds are
  ever at risk (Solana transactions are atomic; a failed `create_gift`
  moves nothing), and the legitimate sender simply retries with a fresh
  seed. This is an inherent characteristic of any client-seeded PDA
  pattern, not something specific to this program's design.

## Reviewed, no issues found

Checked against the full checklist; each of these was reasoned through
against this program's actual account structs and handlers, not just
assumed safe by default:

- **Missing owner checks** — every state/token account uses typed
  `Account<'info, T>` / `InterfaceAccount<'info, T>` wrappers, which
  Anchor validates automatically. The `UncheckedAccount`s
  (`backend_authority`, `rent_receiver`, and `close_config`'s `config`)
  are each deliberately unchecked for documented, low/no-risk reasons
  (identity checked manually; rent-destination has no fund-safety impact;
  `close_config` manually checks owner + the stored admin field itself,
  by design — see finding #3).
- **Missing signer checks** — `admin`/`sender`/`claimer`/`payer` are all
  typed `Signer<'info>`. `backend_authority`'s signature is correctly
  checked manually and conditionally (required only for dedicated-by-
  email claims), since that's state-dependent and can't be expressed as a
  static Anchor constraint.
- **Arbitrary CPI** — `token_program`/`associated_token_program`/
  `system_program` are all typed `Program`/`Interface` accounts; Anchor
  validates the program ID.
- **Reinitialization attacks** — `Config`/`Gift`/`vault` all use plain
  `init` (fails on an existing account). `recipient_usdc`'s
  `init_if_needed` is the one documented exception, reviewed: since ATA
  addresses are fully determined by (owner, mint, token program), there's
  no "wrong data" a reinitialization could introduce — the `associated_token::*`
  constraints validate the account's mint/authority match regardless of
  whether it was just created or already existed.
- **PDA sharing** — `Gift`'s seeds include the random `claim_seed`
  (unique per gift); the vault's ATA authority is the `Gift` PDA itself
  (unique per gift). No PDA or vault is ever shared across users/gifts.
- **Type cosplay** — Anchor's automatic 8-byte discriminators via
  `#[account]` distinguish `Config` from `Gift`.
- **Duplicate mutable accounts** — Anchor 1.0+'s automatic `dup`
  constraint is active; empirically confirmed firing correctly during
  devnet testing this session (`ConstraintDuplicateMutableAccount` when a
  test script accidentally passed the same ATA as both `sender_usdc` and
  `treasury_usdc`).
- **Revival attacks** — `Gift`'s Anchor `close` constraint uses the
  framework's standard hardened closure (closed-account discriminator
  sentinel, not naive zeroing). The vault's manual `CloseAccount` CPI is
  the SPL Token program's own audited closure logic.
- **Data matching** — `has_one` constraints correctly gate
  `update_config` (admin) and `cancel_gift` (sender); every token account
  uses `associated_token::mint`/`associated_token::authority` constraints
  that validate both the account's actual fields and its address
  derivation.
- **Sysvar spoofing** — the only sysvar read is `Clock::get()` in
  `create_gift`, which is syscall-based (no externally-supplied account
  to spoof).
- **Bump canonicalization** — both PDAs (`Config`, `Gift`) follow the
  correct pattern throughout: canonical bump derived and stored once at
  `init`, later instructions verify against the *stored* bump rather than
  re-deriving.
- **Lamport griefing on init** — all initialization goes through
  Anchor's own `init` / `associated_token::` constraint machinery, which
  already implements the "top up the deficit, don't naively transfer"
  pattern internally.
- **Hidden backdoors** — `fee_bps` is hard-capped at `MAX_FEE_BPS` (10%)
  in both `initialize_config` and `update_config`, so even a compromised
  admin key can't set an arbitrary fee. No pause/drain/backdoor function
  exists anywhere in the program.
- **Self-reentrancy, log-parsing-as-source-of-truth, unvalidated
  `remaining_accounts`** — not applicable; the program never CPIs into
  itself, never accepts `remaining_accounts`, and all logic reads
  on-chain account state directly rather than parsing logs.
- **Unchecked type casts** — the one `as u64` cast in `create_gift`'s fee
  calculation is mathematically proven safe (the u128 intermediate result
  is bounded below `amount_usdc`, itself a `u64`, by construction) rather
  than merely assumed safe.

## Not applicable to this program

The checklist's Token-2022-specific sections (transfer fees, permanent
delegate, transfer hooks, mint close/reinitialization, memo transfer)
are moot for `create_gift` now that finding #3 pins `usdc_mint` to
`config.usdc_mint` — a malicious caller can no longer substitute a
Token-2022 mint with these extensions there. They'd still apply if a
future admin ever set `config.usdc_mint` itself to a Token-2022 mint with
one of these extensions (that's an operational/admin-trust concern, not a
program bug) — real USDC is classic SPL Token, not Token-2022, so under
normal/intended usage none of these apply today.
