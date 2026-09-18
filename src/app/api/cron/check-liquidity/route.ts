import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api/gifts";
import { checkAllTickersLiquidity } from "@/lib/liquidity";
import { upsertLiquidityCheck } from "@/lib/db/queries";

// Checking ~50 tickers against Jupiter's quote API, deliberately
// throttled to stay under its rate limit (see liquidity.ts), can take a
// while — ask for the most execution time Vercel will give a serverless
// function so a slow run doesn't get killed mid-check. Actual cap is
// still whatever the hosting plan allows.
export const maxDuration = 60;

/**
 * Vercel Cron target (see `vercel.json`) — re-checks every catalog
 * ticker's actual Jupiter swap-route liquidity and persists the result
 * to `token_liquidity`, which `GET /api/stocks` filters against (see
 * that table's schema comment for why a price-only check isn't enough).
 *
 * Auth via `CRON_SECRET`: Vercel automatically sends `Authorization:
 * Bearer $CRON_SECRET` on cron-triggered requests once that env var is
 * set on the project (Vercel's "Securing cron jobs" convention) — this
 * rejects anyone else hitting the route directly. Set the same value in
 * `.env.local` for local testing (see `scripts/check-jupiter-liquidity.mjs`).
 */
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return apiError(500, "CRON_SECRET is not configured on this server");
  }
  if (request.headers.get("authorization") !== `Bearer ${expected}`) {
    return apiError(401, "Unauthorized");
  }

  const { results, inconclusive } = await checkAllTickersLiquidity();

  for (const result of results) {
    await upsertLiquidityCheck(result);
  }

  const untradable = results.filter((r) => !r.tradable);

  return NextResponse.json({
    checked: results.length,
    untradable: untradable.map((r) => r.symbol),
    // Left unwritten in token_liquidity on purpose (see liquidity.ts) —
    // surfaced here so a look at the cron's own invocation log still
    // shows which tickers Jupiter's rate limit prevented checking this
    // run, without that uncertainty ever being persisted as a real
    // tradable/untradable answer.
    inconclusive: inconclusive.map((r) => r.symbol),
  });
}
