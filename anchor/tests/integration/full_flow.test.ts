// Integration-test skeleton for the create_gift -> claim_gift / cancel_gift
// flow, against a Surfpool mainnet fork (real USDC mint, real ATA/Token
// program behavior) — see .agents/skills/solana-dev/references/testing.md.
//
// NOT RUNNABLE YET: it references `../../target/types/chainstock` and a
// Codama-generated Kit client, neither of which exist until `anchor build`
// (+ `anchor idl` / Codama codegen) has actually run once, on a machine
// with the toolchain installed (see this session's WSL setup thread).
// This file exists so that step has a concrete test to write against
// rather than starting from a blank page — fill in the `TODO`s once the
// generated client exists.
//
// Run (once wired up): `npx vitest run --config vitest.config.surfpool.ts`
// from this `anchor/` directory.

import { afterAll, describe, expect, it } from "vitest";
import { address, createClient } from "@solana/kit";
import { surfpool } from "@solana/surfpool/kit";

// Real Solana mainnet USDC mint — Surfpool lazily forks whatever accounts
// a test actually touches, so this needs no separate seeding step.
const USDC_MINT = address("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

// TODO: import the Codama-generated Kit client once `anchor build` has run:
// import { getCreateGiftInstruction, getClaimGiftInstruction, getCancelGiftInstruction } from "../../clients/js/src";

const client = await createClient().use(surfpool());

afterAll(() => client.surfnet.stop());

describe("ChainStock create -> claim flow", () => {
  it("escrows amount_usdc + fee on create_gift", async () => {
    // Give the sender a funded USDC ATA via cheatcode instead of a real
    // mint+transfer sequence — see testing.md's "Set up state with
    // cheatcodes" best practice.
    await client.cheatcodes
      .setTokenAccount(client.payer.address, USDC_MINT, { amount: 1_000_000_000n })
      .send();

    // TODO: build + send create_gift, assert vault balance == amount_usdc
    // and treasury balance == the expected 2.5%/$0.15-floor fee (see
    // docs/App.md's Monetization section).
  });

  it("dedicated-by-wallet claim pays out to the right recipient", async () => {
    // TODO: create_gift with recipient_mode=Dedicated + recipient_wallet,
    // then claim_gift signed by that wallet; assert recipient_usdc balance
    // and that the vault + Gift PDA are both closed afterward.
  });

  it("rejects a claim from a wallet the gift wasn't dedicated to", async () => {
    // TODO: same as above but sign claim_gift with an unrelated keypair;
    // expect the transaction to fail with UnauthorizedClaimer.
  });

  it("cancel_gift refunds the sender and closes the vault", async () => {
    // TODO: create_gift, cancel_gift by sender, assert sender's USDC
    // balance is restored and both accounts are closed.
  });

  it("FCFS: second claim attempt fails once the vault is closed", async () => {
    // TODO: create_gift with recipient_mode=Fcfs, claim_gift once
    // successfully, then attempt a second claim_gift against the same
    // (now-closed) Gift PDA and expect it to fail — this is the actual
    // single-winner enforcement per docs/Architecture.md, not a database
    // flag.
  });
});
