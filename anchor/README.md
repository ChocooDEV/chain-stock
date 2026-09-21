# ChainStock — Anchor program

Implements the on-chain design in [../docs/Architecture.md](../docs/Architecture.md):
`Config` (fee params) and `Gift` (per-gift escrow) PDAs, and the
`initialize_config` / `update_config` / `create_gift` / `claim_gift` /
`cancel_gift` instructions. `close_config` was added during the security
pass below — an admin-only recovery path, not part of the original design,
see that section for why it exists.

## Status: builds, tests pass, deployed and verified on devnet

Originally written without a local toolchain — WSL2 turned out to work
fine on this machine once actually tried (the earlier Credential Guard
concern didn't hold up). Since then: `anchor build` succeeds,
`cargo test -p chainstock` passes all 4 LiteSVM unit tests, and the
program has been deployed to devnet and exercised end-to-end
(`initialize_config` → `create_gift` → `claim_gift`) with real
transactions against a real validator — see
[`examples/devnet_validate.rs`](programs/chainstock/examples/devnet_validate.rs).
Deployed address: `3ubCASxd8ci746bJRNkdLZQvAzyS8kngFQ6smE3XohV5`.

Still open: more test coverage (see below), the security checklist pass,
and the actual mainnet deploy. See `../TODO.md` section 1 for the current
punch list.

## Toolchain setup (WSL2)

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
# Solana CLI (pinned to Anchor 1.1.x's CI-tested pairing)
sh -c "$(curl -sSfL https://release.anza.xyz/v3.1.10/install)"
# Anchor CLI via avm
cargo install --git https://github.com/solana-foundation/anchor avm --locked --force
avm install 1.1.2 && avm use 1.1.2
```

**If the repo lives on a Windows-mounted path** (`/mnt/c/...`, `/mnt/d/...`
— DrvFs), `cargo build-sbf`'s final `llvm-objcopy` step fails with
`Operation not permitted` — DrvFs doesn't support whatever in-place
rewrite it does. Work around it by building into WSL's native
filesystem:

```bash
export CARGO_TARGET_DIR="$HOME/chainstock-target"
NO_DNA=1 anchor build --no-idl
# then copy the output where the repo/tests expect it:
cp "$CARGO_TARGET_DIR"/deploy/chainstock.so target/deploy/chainstock.so
cp "$CARGO_TARGET_DIR"/deploy/chainstock-keypair.json target/deploy/chainstock-keypair.json
```

`--no-idl`: IDL generation pulls in the same dev-dependencies as
`cargo test` (see below) via its own internal compile pass — untested
whether it now succeeds given those are fixed; worth revisiting before
wiring up the Codama TypeScript client.

## Build

```bash
cd anchor/
export CARGO_TARGET_DIR="$HOME/chainstock-target"   # if on a Windows-mounted path, see above
NO_DNA=1 anchor build --no-idl
```

Real bugs fixed here, all matching what was predicted before a toolchain
existed:
- `init_if_needed` on `recipient_usdc` (`claim_gift.rs`) needs
  `anchor-lang`'s `init-if-needed` cargo feature explicitly enabled —
  added in `programs/chainstock/Cargo.toml`.
- `CpiContext::new`/`new_with_signer` in Anchor 1.1.2 take the token
  program as a `Pubkey` (call `.key()` on the `Program`/`Interface`
  account), not an `AccountInfo` — fixed in all three instruction
  handlers.
- `instructions/mod.rs` selectively re-exports only the `Accounts`
  structs (deliberately, to avoid every module's identically-named
  `handler` fn colliding on a glob import) — but that also hid the
  `#[derive(Accounts)]`-generated `pub(crate) mod __client_accounts_*`
  that `#[program]`'s codegen expects reachable at the crate root. Fixed
  by re-exporting those modules explicitly alongside the structs.
- Missing `idl-build` feature in `Cargo.toml` (`anchor-lang/idl-build`,
  `anchor-spl/idl-build`).

## `anchor keys list`

Real program ID already generated and synced: `3ubCASxd8ci746bJRNkdLZQvAzyS8kngFQ6smE3XohV5`
(`declare_id!()` in `lib.rs`, `[programs.*]` in `Anchor.toml`). The actual
keypair lives at `target/deploy/chainstock-keypair.json` (gitignored) —
**back it up**; losing it means losing the ability to upgrade this exact
program ID. If you ever need to regenerate for a fresh deploy instead,
delete that file and rerun `anchor build`, then update both files above
to match `anchor keys list`'s new output.

## Unit tests (LiteSVM)

```bash
cargo test -p chainstock
```

All 11 pass: `create_gift`'s escrow + fee split, `claim_gift` rejecting a
non-matching dedicated-wallet claimer, `claim_gift`'s happy path (payout +
both accounts closed), `cancel_gift`'s refund + non-sender rejection, the
dedicated-by-email path (both the negative case — self-funded claim
without the backend's co-signature — and the positive sponsored/no-SOL
case), FCFS's actual single-winner enforcement (second claim against an
already-closed vault), the fee-calculation edge case at the
`fee_min_usdc` floor (both sides of the bps/floor crossover), and three
regression tests from the security audit below (`update_config` actually
persisting, both settlement instructions surviving a donation-griefing
attempt, and `create_gift` rejecting a mint other than `config.usdc_mint`).

Getting this green needed more than small API-name fixes:
- `solana_sdk::system_instruction`/`system_program` moved to the separate
  `solana-system-interface` crate.
- `Keypair::clone` was removed from the modern `solana-keypair` crate —
  use `.insecure_clone()` (name is deliberate: explicit about what you're
  doing, test/dev-only).
- `Pack`/`Mint::LEN`/`Account::unpack` need importing from spl-token's own
  re-exported trait (`spl_token::solana_program::program_pack::Pack`),
  not `solana_sdk`'s — they're different crate-version instances of the
  same trait name, and rustc won't accept the wrong one.
- The big one: `spl-token`/`spl-associated-token-account` resolve
  `Pubkey`/`Instruction` through a **structurally separate, older**
  `solana-pubkey`/`solana-instruction` crate line than `solana-sdk` does
  — both still current in today's Solana Rust ecosystem, genuinely
  incompatible Rust types for the same 32-byte/struct shape. Extensive
  attempts to unify the whole dependency graph onto one line didn't work
  (both SPL crates pin the older line directly in their own published
  manifests — not something a version bump on our end can fix). Fixed
  with explicit `to_spl_pubkey`/`from_spl_pubkey`/`from_spl_ix` conversion
  helpers at every boundary crossing in `tests/claim_flow.rs` (see that
  file's top doc comment).
- `litesvm`'s pinned version matters a lot here: the compatibility
  matrix's recommendation for Anchor 1.1.x (`0.14.0`) has an *internal*
  version split in its own manifest (direct `wincode 0.5.5` dep vs. a
  transitive `solana-account` pulling `wincode 0.6.1`) that fails to
  compile no matter what we pin elsewhere. `0.13.0` resolves to one
  consistent line. See `Cargo.toml`'s dev-dependencies comment for the
  full reasoning — worth reading before bumping this version casually.

## Devnet: deployed and verified

```bash
anchor deploy --provider.cluster devnet
```

Deployed at `3ubCASxd8ci746bJRNkdLZQvAzyS8kngFQ6smE3XohV5`. Verified for
real (not simulation) via
[`examples/devnet_validate.rs`](programs/chainstock/examples/devnet_validate.rs) —
a standalone `RpcClient`-based script exercising `initialize_config`,
`create_gift`, and `claim_gift` against the live deploy:

```bash
cargo run -p chainstock --example devnet_validate
```

`Config` PDA is live at `GUozf14j6EFBGCdkonKnTRJ2u2uGuxawJtViEukxiHbz`.
Wallet details (admin/treasury/upgrade-authority and backend-authority/
fee-payer — see Architecture.md's "hackathon-practical setup" for why
those are split the way they are) are in `../docs/Wallets.md`
(gitignored, **not** in this repo's history — back it up externally and
get it off disk once you have).

## Integration tests (Surfpool, mainnet fork) — not yet run

`tests/integration/full_flow.test.ts` is a skeleton, not runnable yet —
it needs a generated TypeScript client (Codama, off the IDL `anchor
build` would produce — currently skipped via `--no-idl`, see the
toolchain-setup note above about revisiting that). Fill in its `TODO`s
once that client exists. Install its tooling from this directory:
`npm install` (see `package.json`), then `npm run test:integration`.

## Security pass — done, 3 real bugs found and fixed

Full audit against `../.agents/skills/solana-dev/references/security.md`'s
checklist: **`../docs/SecurityAudit.md`**. Short version:

- **Fixed:** `update_config` was silently non-functional (missing `mut`
  on the `config` account — writes never persisted).
- **Fixed:** donation griefing — anyone could send 1 base unit of the
  escrow token directly to a gift's vault to permanently brick both
  `claim_gift` and `cancel_gift` (SPL's `CloseAccount` requires an
  exactly-zero balance), freezing that gift's funds forever. Both
  settlement instructions now transfer the vault's actual live balance
  instead of the stored `gift.amount_usdc`.
- **Fixed:** `usdc_mint` wasn't pinned to any known mint address —
  `create_gift` was mint-agnostic, trusting the client to always supply
  real USDC. `Config` gained an admin-settable `usdc_mint` field, and
  `create_gift` now rejects any other mint via an `address` constraint.
  Needed a small admin-only `close_config` instruction too, to migrate
  the already-deployed devnet `Config` (sized for the pre-fix layout) —
  see the audit doc's finding #3 for why `realloc` alone can't do this.

All three are covered by new regression tests (see "Unit tests" above)
and were deployed as program upgrades to devnet, re-verified live via
`examples/devnet_validate.rs` (including the `Config` migration path
itself, run for real against the live pre-fix account).

The `ClaimGift` multi-signer composition (self-paid vs. sponsored vs.
dedicated-by-email — see the doc comment on `ClaimGift` in
`instructions/claim_gift.rs`) and `init_if_needed` on `recipient_usdc`
were both specifically re-reviewed as part of this pass (they were the
two judgment calls flagged when this program was first written, before
any compiler or test feedback existed) — both check out, see the audit
doc's "Reviewed, no issues found" section for the reasoning.

The `Config.backend_authority` field itself still doesn't appear in
Architecture.md's original `Config` account field list — it was added
here because the program has no other way to recognize "the trusted
backend" on-chain. `../docs/Architecture.md` should be updated to match
now that this is confirmed (via the audit + devnet validation) to be the
right approach — see the `Config` struct's doc comment in `state.rs`.

## Deploying to mainnet

Not devnet — tokenized stocks and real Jupiter liquidity only exist on
mainnet (see Architecture.md's opening note; devnet was only ever for
validating the program mechanics themselves). Reserve real small-money
smoke tests ($1-2) for right before launch, not routine dev. Generate
fresh mainnet keypairs rather than reusing the devnet ones in
`../docs/Wallets.md` — see that file's "Once mainnet is real" section.
