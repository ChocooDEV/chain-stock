import { NextRequest, NextResponse } from "next/server";
import { PublicKey, Transaction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getGiftByClaimSeed, hasRecentVerifiedCaptcha } from "@/lib/db/queries";
import { getConnection } from "@/lib/solana/connection";
import { isValidSolanaAddress } from "@/lib/solana/address";
import { decodeClaimSeed } from "@/lib/solana/claimSeed";
import { getConfigPda, getGiftPda, getServerProgram } from "@/lib/solana/program";
import { getBackendAuthorityKeypair } from "@/lib/solana/backendAuthority";
import { normalizeEmail } from "@/lib/email";
import { apiError } from "@/lib/api/gifts";

/**
 * Builds a `claim_gift` transaction server-side and hands it back
 * unsigned (or, for dedicated-by-email, backend-authority-partially-
 * signed) for the claimer's Privy wallet to sign and submit — the one
 * route on the claim path the backend has to build a transaction for
 * (see docs/Architecture.md's "only prepare-claim involves the backend
 * in transaction construction" rule).
 *
 * **Devnet-mode simplification**: real claim settlement also swaps the
 * released USDC into the target stock token via Jupiter (and, for
 * sponsored no-SOL claims, a second leg reimbursing the fee-payer) — see
 * Architecture.md's "Composing the swap". Jupiter has no devnet
 * liquidity at all, so there's nothing to test that against yet; this
 * builds `claim_gift` alone, meaning a devnet claim pays out raw
 * (mock-)USDC rather than the stock token. Revisit once this is pointed
 * at mainnet. Every claim here is also self-funded (the claimer pays
 * their own transaction fee) rather than backend-sponsored — sponsoring
 * needs the backend wallet to hold and spend a real SOL float, a
 * separate piece of work from validating the escrow/claim mechanics
 * themselves.
 */
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
  const configAccount = await program.account.config.fetch(getConfigPda());

  // Same self-referential-seed reasoning as cancel_gift's client-side
  // call (see HistoryPageClient.tsx) — `gift` has to be passed
  // explicitly via `accountsPartial`, not left to auto-resolution.
  const instruction = await program.methods
    .claimGift()
    .accountsPartial({
      claimer,
      payer: claimer,
      backendAuthority: backendAuthority.publicKey,
      gift: giftPda,
      rentReceiver: claimer,
      usdcMint: configAccount.usdcMint,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  const transaction = new Transaction({
    feePayer: claimer,
    blockhash,
    lastValidBlockHeight,
  }).add(instruction);

  if (gift.recipientMode === "dedicated_email") {
    transaction.partialSign(backendAuthority);
  }

  const serialized = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  return NextResponse.json({
    transaction: Buffer.from(serialized).toString("base64"),
  });
}
