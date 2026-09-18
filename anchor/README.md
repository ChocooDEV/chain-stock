# ChainStock — Anchor program

Implements the on-chain design in [../docs/Architecture.md](../docs/Architecture.md):
`Config` (fee params) and `Gift` (per-gift escrow) PDAs, and the
`initialize_config` / `update_config` / `create_gift` / `claim_gift` /
`cancel_gift` instructions.

## Status: written, not yet built or tested

This program was written without a local Rust/Solana/Anchor toolchain —
the dev machine it was authored on is Windows without WSL, and WSL setup
hit a Credential Guard / org-policy conflict (see the session that wrote
this). **Nothing here has been compiled, let alone tested or deployed.**
Treat every file as a careful first draft against the spec, not verified
working code.

## Before doing anything else: build it

```bash
# From this directory (anchor/), on a machine with Rust + Solana CLI + Anchor CLI:
NO_DNA=1 anchor build
```

Fix whatever the compiler surfaces — likely candidates, roughly in order
of likelihood:
- Exact `anchor-spl`/`anchor-lang` API names for `token_interface` types
  drifting slightly from what's written here (written against the
  solana-dev skill's Anchor 1.1.2 reference, but not compiler-checked).
- `InitSpace` derive behavior on `Option<Pubkey>` / `Option<[u8; 32]>` /
  fixed-size `[u8; 16]` array fields in `state.rs`.
- Dev-dependency version pins in `programs/chainstock/Cargo.toml`
  (`spl-token`, `spl-associated-token-account`) may need bumping/pinning
  to whatever's actually compatible with the installed Solana CLI's
  `solana-*` crate versions.

Once it builds:

```bash
anchor keys list
```

...and update the placeholder program ID (`Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS`,
the well-known Anchor tutorial placeholder — deliberately not a real
generated key) in **both** `declare_id!()` in
`programs/chainstock/src/lib.rs` and the `[programs.*]` tables in
`Anchor.toml`.

## Then: unit tests (LiteSVM)

```bash
cargo test -p chainstock
```

`programs/chainstock/tests/claim_flow.rs` covers: `create_gift`'s escrow +
fee split, `claim_gift` rejecting a non-matching dedicated-wallet
claimer, `claim_gift`'s happy path (payout + both accounts closed), and
`cancel_gift`'s refund + non-sender rejection. **Not covered yet** —
worth adding before trusting this: the dedicated-by-email path (needs a
`backend_authority` co-signer scenario), FCFS's actual single-winner
enforcement (second claim attempt against an already-closed vault), and
a fee-calculation edge case at the `fee_min_usdc` floor.

## Then: integration tests (Surfpool, mainnet fork)

`tests/integration/full_flow.test.ts` is a skeleton, not runnable yet —
it needs a generated TypeScript client (Codama, off the IDL `anchor
build` produces) that doesn't exist until the first successful build.
Fill in its `TODO`s once that client exists. Install its tooling from
this directory: `npm install` (see `package.json`), then
`npm run test:integration`.

## Then: security pass

Before touching mainnet with real money, run the full checklist at
`../.agents/skills/solana-dev/references/security.md` against the actual
compiled program, not just this read-through. A few items worth a second
look specifically because they were judgment calls made while writing
this without compiler feedback:

- `claim_gift`'s `rent_receiver` and `ClaimGift`'s `payer`/`backend_authority`
  account wiring (see the doc comment on `ClaimGift` in
  `instructions/claim_gift.rs`) — the multi-signer composition (self-paid
  vs. sponsored vs. dedicated-by-email) is the most intricate part of this
  program and the one most likely to have a subtle bug.
- `init_if_needed` on `recipient_usdc` in `claim_gift.rs` — flagged in
  code comments as the one intentional exception to the "avoid
  `init_if_needed`" rule (standard for a deterministic ATA address, unlike
  arbitrary program state), but worth a second opinion.
- The `Config.backend_authority` field itself doesn't appear in
  Architecture.md's original `Config` account field list — it was added
  here because the program has no other way to recognize "the trusted
  backend" on-chain. `../docs/Architecture.md` should be updated to
  match once this is confirmed as the right approach (see the `Config`
  struct's doc comment in `state.rs`).

## Deploying

Mainnet, not devnet — tokenized stocks and real Jupiter liquidity only
exist on mainnet (see Architecture.md's opening note). Reserve real
small-money smoke tests ($1-2) for right before launch, not routine dev.
