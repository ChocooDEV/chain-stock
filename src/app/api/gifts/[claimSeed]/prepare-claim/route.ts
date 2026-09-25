import { NextRequest, NextResponse } from "next/server";
import {
  AddressLookupTableAccount,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { getGiftByClaimSeed, hasRecentVerifiedCaptcha } from "@/lib/db/queries";
import { getConnection } from "@/lib/solana/connection";
import { isValidSolanaAddress } from "@/lib/solana/address";
import { decodeClaimSeed } from "@/lib/solana/claimSeed";
import { getAta, getConfigPda, getGiftPda, getServerProgram } from "@/lib/solana/program";
import { getBackendAuthorityKeypair } from "@/lib/solana/backendAuthority";
import {
  fetchSwapInstructions,
  fetchSwapQuote,
  type JupiterSwapInstructions,
} from "@/lib/solana/jupiter";
import { normalizeEmail } from "@/lib/email";
import { apiError } from "@/lib/api/gifts";

/**
 * Builds the claim transaction server-side and hands it back
 * partially-signed where the backend is a required signer, for the
 * claimer's Privy wallet to sign and submit — the one route on the claim
 * path the backend builds a transaction for (see docs/Architecture.md's
 * "only prepare-claim involves the backend in transaction construction"
 * rule).
 *
 * Per Architecture.md's "Composing the swap", this is one atomic
 * transaction rather than a program-level Jupiter CPI:
 *   1. `claim_gift` releases the escrowed USDC into the claimer's own
 *      USDC account.
 *   2. A Jupiter swap instruction converts exactly that USDC into the
 *      stock mint the gift names, landing in the claimer's stock account.
 * If the swap can't fill (price moved past slippage, route vanished) the
 * whole transaction fails, so the gift stays `Pending` and is simply
 * retried — no state where USDC is released but unconverted. For that
 * reason a failed quote is surfaced as an error rather than silently
 * falling back to paying out raw USDC, which would deliver an asset the
 * gift didn't promise.
 *
 * A versioned (v0) transaction is required: Jupiter routes reference
 * address lookup tables, which legacy transactions can't carry, and the
 * composed transaction only fits Solana's 1232-byte limit once account
 * references are compressed through them.
 */

/**
 * Below this, the claimer can't be expected to cover the fee plus up to
 * two associated-token-account rents (~0.0041 SOL worst case), so the
 * backend authority pays instead — Architecture.md's "no-SOL Privy
 * claims". Above it they pay their own way and the backend never signs.
 */
const SELF_FUND_MIN_LAMPORTS = 10_000_000;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ claimSeed: string }> },
) {
  const { claimSeed } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "Invalid JSON body");
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const claimerWallet = typeof b.claimerWallet === "string" ? b.claimerWallet : null;
  const recipientEmail = typeof b.recipientEmail === "string" ? b.recipientEmail : null;

  if (!claimerWallet || !isValidSolanaAddress(claimerWallet)) {
    return apiError(400, "claimerWallet must be a valid Solana address");
  }

  const gift = await getGiftByClaimSeed(claimSeed);
  if (!gift) {
    return apiError(404, "No gift found for that claim link");
  }
  if (gift.status !== "pending") {
    return apiError(409, `Gift is already ${gift.status}, not pending`);
  }

  // Authorization mirrors claim_gift.rs's own on-chain checks — this
  // isn't the real security boundary (the program enforces it
  // regardless), it's what decides *whether this route builds and
  // returns a transaction at all*, so a caller who can't legitimately
  // claim doesn't even get one to attempt submitting.
  if (gift.recipientMode === "dedicated_wallet") {
    if (gift.recipientWallet !== claimerWallet) {
      return apiError(403, "This gift is dedicated to a different wallet");
    }
  } else if (gift.recipientMode === "dedicated_email") {
    if (!recipientEmail || normalizeEmail(recipientEmail) !== gift.recipientEmail) {
      return apiError(403, "recipientEmail doesn't match this gift's dedicated recipient");
    }
  } else {
    // fcfs — see App.md's anti-bot section; POST /api/captcha/verify
    // must have recorded a recent pass for this claimSeed first.
    const verified = await hasRecentVerifiedCaptcha(claimSeed);
    if (!verified) {
      return apiError(403, "Complete the captcha check before claiming");
    }
  }

  const claimer = new PublicKey(claimerWallet);
  const claimSeedBytes = decodeClaimSeed(claimSeed);
  const giftPda = getGiftPda(claimSeedBytes);
  const backendAuthority = getBackendAuthorityKeypair();

  const connection = getConnection();
  const program = getServerProgram(connection, backendAuthority);

  const [configAccount, giftAccount, claimerLamports] = await Promise.all([
    program.account.config.fetch(getConfigPda()),
    program.account.gift.fetch(giftPda),
    connection.getBalance(claimer),
  ]);

  const usdcMint = configAccount.usdcMint;
  // On-chain rather than from the gift row: this decides which asset real
  // money is converted into, so it comes from the account the program
  // itself enforces, not a database column that could drift from it.
  const stockMint = giftAccount.stockMint;

  // `claim_gift` releases the vault's live balance, not `gift.amount_usdc`
  // (see its handler's comment on donated excess), so the swap has to be
  // quoted against that same live figure or the amounts wouldn't match.
  // Anything that lands in the vault after this read simply stays behind
  // as USDC dust for the claimer rather than breaking the swap.
  const vault = getAta(giftPda, usdcMint);
  const vaultBalance = await connection.getTokenAccountBalance(vault).catch(() => null);
  if (!vaultBalance) {
    return apiError(409, "This gift's escrow account no longer exists on-chain");
  }
  const swapAmount = BigInt(vaultBalance.value.amount);
  if (swapAmount === 0n) {
    return apiError(409, "This gift's escrow is empty");
  }

  const sponsored = claimerLamports < SELF_FUND_MIN_LAMPORTS;
  const payer = sponsored ? backendAuthority.publicKey : claimer;

  // Backpack Securities stock tokens are Token-2022, while USDC is
  // classic SPL — so the output account's program is read off the mint
  // rather than assumed, and the two legs of this transaction genuinely
  // use different token programs.
  const stockMintAccount = await connection.getAccountInfo(stockMint);
  if (!stockMintAccount) {
    return apiError(502, "Couldn't load this gift's stock mint on-chain");
  }
  const stockTokenProgram = stockMintAccount.owner;
  const stockAta = getAssociatedTokenAddressSync(
    stockMint,
    claimer,
    false,
    stockTokenProgram,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  let swap: JupiterSwapInstructions;
  try {
    const quote = await fetchSwapQuote({
      inputMint: usdcMint,
      outputMint: stockMint,
      amount: swapAmount,
    });
    swap = await fetchSwapInstructions({
      quote,
      userPublicKey: claimer,
      destinationTokenAccount: stockAta,
    });
  } catch (error) {
    return apiError(
      503,
      error instanceof Error ? error.message : "Couldn't price the stock swap right now",
    );
  }

  // Same self-referential-seed reasoning as cancel_gift's client-side
  // call (see HistoryPageClient.tsx) — `gift` has to be passed
  // explicitly via `accountsPartial`, not left to auto-resolution.
  //
  // `rentReceiver` follows the payer: on a sponsored claim the reclaimed
  // vault and gift rent is what makes fronting the fee roughly
  // self-funding for the backend authority (see below).
  const claimInstruction = await program.methods
    .claimGift()
    .accountsPartial({
      claimer,
      payer,
      backendAuthority: backendAuthority.publicKey,
      gift: giftPda,
      rentReceiver: payer,
      usdcMint,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();

  const lookupTables = (
    await Promise.all(
      swap.addressLookupTableAddresses.map((address) =>
        connection.getAddressLookupTable(new PublicKey(address)),
      ),
    )
  )
    .map((result) => result.value)
    .filter((table): table is AddressLookupTableAccount => table !== null);

  const { blockhash } = await connection.getLatestBlockhash();
  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions: [
      ...swap.computeBudgetInstructions,
      // Idempotent: harmless if the claimer already holds this stock, and
      // paid for by whoever is covering this claim.
      createAssociatedTokenAccountIdempotentInstruction(
        payer,
        stockAta,
        claimer,
        stockMint,
        stockTokenProgram,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      ),
      claimInstruction,
      swap.swapInstruction,
    ],
  }).compileToV0Message(lookupTables);

  const transaction = new VersionedTransaction(message);

  // Sponsored claims need the backend's signature as fee payer;
  // dedicated-by-email needs it as the program's off-chain email
  // attestation (claim_gift.rs's MissingBackendAttestation check).
  if (sponsored || gift.recipientMode === "dedicated_email") {
    transaction.sign([backendAuthority]);
  }

  return NextResponse.json({
    transaction: Buffer.from(transaction.serialize()).toString("base64"),
    sponsored,
  });
}
