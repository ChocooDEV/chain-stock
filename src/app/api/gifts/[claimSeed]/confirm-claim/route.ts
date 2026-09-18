import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { gifts } from "@/lib/db/schema";
import { getGiftByClaimSeed } from "@/lib/db/queries";
import { getConfirmedTransactionOrNull } from "@/lib/solana/connection";
import { isValidSolanaAddress } from "@/lib/solana/address";
import { apiError, toGiftJson } from "@/lib/api/gifts";

/**
 * Frontend calls this after the signed claim transaction (from
 * `prepare-claim`, not built yet — see TODO.md) lands on-chain. Verifies
 * confirmation and flips the index row to `claimed`.
 *
 * Also sets `recipientWallet` here, not just at `create_gift` time —
 * for FCFS and dedicated-by-email gifts, nobody knows which wallet will
 * actually claim until this moment (see docs/Architecture.md's
 * `?recipient=<wallet>` bullet: "a gift only gets a recipient_wallet
 * once claimed"). For dedicated-by-wallet gifts it should already match
 * what was stored at creation — checked here as a sanity guard, even
 * though the real enforcement already happened on-chain in `claim_gift`.
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
  const claimTxSignature =
    typeof b.claimTxSignature === "string" ? b.claimTxSignature : null;
  const recipientWallet =
    typeof b.recipientWallet === "string" ? b.recipientWallet : null;

  if (!claimTxSignature) {
    return apiError(400, "claimTxSignature is required");
  }
  if (!recipientWallet || !isValidSolanaAddress(recipientWallet)) {
    return apiError(400, "recipientWallet must be a valid Solana address");
  }

  const gift = await getGiftByClaimSeed(claimSeed);
  if (!gift) {
    return apiError(404, "No gift found for that claim link");
  }
  if (gift.status !== "pending") {
    return apiError(409, `Gift is already ${gift.status}, not pending`);
  }
  if (
    gift.recipientMode === "dedicated_wallet" &&
    gift.recipientWallet !== recipientWallet
  ) {
    return apiError(
      409,
      "recipientWallet doesn't match this gift's dedicated recipient",
    );
  }

  const tx = await getConfirmedTransactionOrNull(claimTxSignature);
  if (!tx) {
    return apiError(
      409,
      "claimTxSignature not found or not yet confirmed — retry once it lands",
    );
  }
  if (tx.meta?.err) {
    return apiError(400, "claimTxSignature refers to a failed transaction");
  }

  // Re-check `status = 'pending'` inside the UPDATE's own WHERE, not just
  // in the SELECT above — two concurrent confirm-claim calls for the same
  // gift could otherwise both pass the earlier check-then-act read and
  // the second UPDATE would silently clobber the first's result. This
  // makes the pending -> claimed transition an atomic compare-and-swap:
  // if another request already flipped it between our SELECT and here,
  // `updated` comes back empty and we report the conflict instead of
  // overwriting.
  const [updated] = await db
    .update(gifts)
    .set({
      status: "claimed",
      recipientWallet,
      claimTxSignature,
      claimedAt: new Date(),
    })
    .where(and(eq(gifts.claimSeed, claimSeed), eq(gifts.status, "pending")))
    .returning();

  if (!updated) {
    return apiError(409, "Gift was already claimed or canceled by another request");
  }

  return NextResponse.json(toGiftJson(updated));
}
