import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { gifts } from "@/lib/db/schema";
import { getGiftByClaimSeed } from "@/lib/db/queries";
import { getConfirmedTransactionOrNull } from "@/lib/solana/connection";
import { apiError, toGiftJson } from "@/lib/api/gifts";

/**
 * Sender builds/signs/submits `cancel_gift` entirely themselves — no
 * backend co-sign needed (docs/Architecture.md). This is the only route
 * on that path: verifies the signature landed and flips the index row to
 * `canceled`. (Architecture.md's original API list also named a separate
 * `/cancel` route "same pattern as create," but `create_gift` only ever
 * needed one route — `POST /api/gifts` — for the same reason: nothing
 * backend-side happens before the client submits its own transaction, so
 * there's nothing for a second route to do. Simplified to match that
 * precedent; Architecture.md should be updated to drop the extra name.)
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
  const cancelTxSignature =
    typeof b.cancelTxSignature === "string" ? b.cancelTxSignature : null;

  if (!cancelTxSignature) {
    return apiError(400, "cancelTxSignature is required");
  }

  const gift = await getGiftByClaimSeed(claimSeed);
  if (!gift) {
    return apiError(404, "No gift found for that claim link");
  }
  if (gift.status !== "pending") {
    return apiError(409, `Gift is already ${gift.status}, not pending`);
  }

  const tx = await getConfirmedTransactionOrNull(cancelTxSignature);
  if (!tx) {
    return apiError(
      409,
      "cancelTxSignature not found or not yet confirmed — retry once it lands",
    );
  }
  if (tx.meta?.err) {
    return apiError(400, "cancelTxSignature refers to a failed transaction");
  }

  // Same atomic compare-and-swap reasoning as confirm-claim's UPDATE —
  // see that file's comment.
  const [updated] = await db
    .update(gifts)
    .set({
      status: "canceled",
      cancelTxSignature,
      canceledAt: new Date(),
    })
    .where(and(eq(gifts.claimSeed, claimSeed), eq(gifts.status, "pending")))
    .returning();

  if (!updated) {
    return apiError(409, "Gift was already claimed or canceled by another request");
  }

  return NextResponse.json(toGiftJson(updated));
}
