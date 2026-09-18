import { NextResponse } from "next/server";
import { getGiftByClaimSeed } from "@/lib/db/queries";
import { apiError, toGiftJson } from "@/lib/api/gifts";

/**
 * Fetch gift details for the claim page (docs/Architecture.md) — reads
 * the off-chain index written by `POST /api/gifts`. Called both by
 * external clients hitting this route directly and, more importantly,
 * by `src/app/claim/[claimSeed]/page.tsx` itself (via `getGiftByClaimSeed`
 * directly, not an HTTP round-trip to this route — see that file).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ claimSeed: string }> },
) {
  const { claimSeed } = await params;
  const row = await getGiftByClaimSeed(claimSeed);

  if (!row) {
    return apiError(404, "No gift found for that claim link");
  }

  return NextResponse.json(toGiftJson(row));
}
