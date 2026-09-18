import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { gifts } from "@/lib/db/schema";
import { getGiftsBySender, getClaimedGiftsByRecipient } from "@/lib/db/queries";
import { getConfirmedTransactionOrNull } from "@/lib/solana/connection";
import { isValidSolanaAddress } from "@/lib/solana/address";
import {
  apiError,
  parsePositiveBigInt,
  toGiftJson,
  validateRecipientShape,
} from "@/lib/api/gifts";

/**
 * Index a newly created gift — the sender's wallet already built, signed,
 * and submitted `create_gift` itself (see docs/Architecture.md's "only
 * prepare-claim involves the backend in transaction construction" rule);
 * this route just mirrors that confirmed on-chain state into the
 * off-chain index for fast queries (gift lookup, sender/recipient
 * history — see App.md's "Data & backend architecture").
 *
 * Verifies `createTxSignature` actually landed before indexing anything —
 * cheap (existence + no error), but NOT yet a full decode of the
 * transaction's instruction data against the claimed fields (amounts,
 * accounts). That needs the program's real IDL, which doesn't exist
 * until `anchor build` has run somewhere with the toolchain (see
 * TODO.md) — until then, a malicious/buggy client could index a
 * plausible-looking but inaccurate row. Money itself is never at risk
 * either way (the on-chain `Gift` account is the actual source of
 * truth), only this convenience index could show something slightly
 * wrong in the meantime.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "Invalid JSON body");
  }
  if (typeof body !== "object" || body === null) {
    return apiError(400, "Invalid JSON body");
  }
  const b = body as Record<string, unknown>;

  const claimSeed = typeof b.claimSeed === "string" ? b.claimSeed : null;
  const giftPda = typeof b.giftPda === "string" ? b.giftPda : null;
  const senderWallet = typeof b.senderWallet === "string" ? b.senderWallet : null;
  const stockMint = typeof b.stockMint === "string" ? b.stockMint : null;
  const stockSymbol = typeof b.stockSymbol === "string" ? b.stockSymbol : null;
  const createTxSignature =
    typeof b.createTxSignature === "string" ? b.createTxSignature : null;
  const message = typeof b.message === "string" ? b.message : null;
  const theme = typeof b.theme === "string" ? b.theme : null;

  if (!claimSeed || !stockSymbol || !createTxSignature) {
    return apiError(400, "claimSeed, stockSymbol, and createTxSignature are required");
  }
  if (!giftPda || !isValidSolanaAddress(giftPda)) {
    return apiError(400, "giftPda must be a valid Solana address");
  }
  if (!senderWallet || !isValidSolanaAddress(senderWallet)) {
    return apiError(400, "senderWallet must be a valid Solana address");
  }
  if (!stockMint || !isValidSolanaAddress(stockMint)) {
    return apiError(400, "stockMint must be a valid Solana address");
  }

  const recipient = validateRecipientShape(
    b.recipientMode,
    b.recipientWallet,
    b.recipientEmail,
  );
  if (!recipient) {
    return apiError(
      400,
      "recipientMode must be dedicated_wallet/dedicated_email/fcfs, with exactly the matching recipientWallet or recipientEmail set",
    );
  }

  const amountUsdc = parsePositiveBigInt(b.amountUsdc);
  const feeUsdc = parsePositiveBigInt(b.feeUsdc);
  if (amountUsdc === null || feeUsdc === null) {
    return apiError(400, "amountUsdc and feeUsdc must be positive integer strings");
  }

  const tx = await getConfirmedTransactionOrNull(createTxSignature);
  if (!tx) {
    return apiError(
      409,
      "createTxSignature not found or not yet confirmed — retry once it lands",
    );
  }
  if (tx.meta?.err) {
    return apiError(400, "createTxSignature refers to a failed transaction");
  }

  const [inserted] = await db
    .insert(gifts)
    .values({
      claimSeed,
      giftPda,
      senderWallet,
      stockMint,
      stockSymbol,
      amountUsdc,
      feeUsdc,
      recipientMode: recipient.mode,
      recipientWallet: recipient.wallet,
      recipientEmail: recipient.email,
      message,
      theme,
      createTxSignature,
    })
    .onConflictDoNothing({ target: gifts.claimSeed })
    .returning();

  if (inserted) {
    return NextResponse.json(toGiftJson(inserted), { status: 201 });
  }

  // claimSeed already indexed — a legitimate retry of the exact same call
  // is idempotent (200, the existing row), but a *different*
  // createTxSignature for an already-used claimSeed is a real conflict,
  // not something to silently paper over by just handing back whatever
  // was there first.
  const [existing] = await db.select().from(gifts).where(eq(gifts.claimSeed, claimSeed));
  if (!existing) {
    return apiError(500, "Failed to index gift");
  }
  if (existing.createTxSignature !== createTxSignature) {
    return apiError(409, "claimSeed is already indexed under a different transaction");
  }
  return NextResponse.json(toGiftJson(existing), { status: 200 });
}

/**
 * `GET /api/gifts?sender=<wallet>` — sender's gift history.
 * `GET /api/gifts?recipient=<wallet>` — recipient's claimed-gift history,
 * only ever `claimed` rows (a gift only gets `recipientWallet` set once
 * claimed for FCFS/dedicated-by-email gifts — see `confirm-claim`).
 * See docs/Architecture.md's "API routes" section.
 */
export async function GET(request: NextRequest) {
  const sender = request.nextUrl.searchParams.get("sender");
  const recipient = request.nextUrl.searchParams.get("recipient");

  if (!sender && !recipient) {
    return apiError(400, "Provide a ?sender= or ?recipient= wallet address");
  }
  if (sender && recipient) {
    return apiError(400, "Provide only one of ?sender= or ?recipient=");
  }

  const wallet = sender ?? recipient!;
  if (!isValidSolanaAddress(wallet)) {
    return apiError(400, "That doesn't look like a valid Solana wallet address");
  }

  const rows = sender
    ? await getGiftsBySender(sender)
    : await getClaimedGiftsByRecipient(recipient!);

  return NextResponse.json({ gifts: rows.map(toGiftJson) });
}
