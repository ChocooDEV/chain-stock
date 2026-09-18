import { cache } from "react";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { claimAttempts, gifts, tokenLiquidity, type GiftRow } from "@/lib/db/schema";

/** Shared by the API route, the claim page's server component, and that
 *  page's `generateMetadata` — no reason for the page to round-trip
 *  through its own API route over HTTP when it can just call the same
 *  query directly. Wrapped in React's `cache()` so `generateMetadata`
 *  and the page component (which both need this same row, once React
 *  renders both within a single request) share one DB round-trip
 *  instead of two. */
export const getGiftByClaimSeed = cache(async (claimSeed: string): Promise<GiftRow | null> => {
  const [row] = await db.select().from(gifts).where(eq(gifts.claimSeed, claimSeed));
  return row ?? null;
});

export async function getGiftsBySender(senderWallet: string): Promise<GiftRow[]> {
  return db
    .select()
    .from(gifts)
    .where(eq(gifts.senderWallet, senderWallet))
    .orderBy(desc(gifts.createdAt));
}

/** Only ever `claimed` rows — a gift only gets `recipientWallet` set once
 *  claimed for FCFS/dedicated-by-email gifts (see `confirm-claim`). */
export async function getClaimedGiftsByRecipient(
  recipientWallet: string,
): Promise<GiftRow[]> {
  return db
    .select()
    .from(gifts)
    .where(and(eq(gifts.recipientWallet, recipientWallet), eq(gifts.status, "claimed")))
    .orderBy(desc(gifts.claimedAt));
}

/** Records a passed Turnstile check for an FCFS claim attempt (see
 *  `POST /api/captcha/verify`) — `prepare-claim` (not built yet) will
 *  check for a recent verified row here before proceeding, per
 *  App.md's FCFS anti-bot section. `walletAddress` is nullable since
 *  the widget can complete before the recipient has authenticated (the
 *  single-CTA claim flow only triggers Privy login on the claim click
 *  itself). */
export async function recordCaptchaVerification(input: {
  claimSeed: string;
  walletAddress: string | null;
  ipHash: string | null;
}): Promise<void> {
  await db.insert(claimAttempts).values({
    id: crypto.randomUUID(),
    claimSeed: input.claimSeed,
    walletAddress: input.walletAddress,
    ipHash: input.ipHash,
    captchaVerified: true,
  });
}

/** Mints `GET /api/stocks` should drop from the catalog — see
 *  `token_liquidity`'s schema comment for why this check exists and why
 *  it fails open (only mints explicitly marked untradable are excluded;
 *  a mint with no row yet stays visible). */
export async function getUntradableMints(): Promise<Set<string>> {
  const rows = await db
    .select({ mint: tokenLiquidity.mint })
    .from(tokenLiquidity)
    .where(eq(tokenLiquidity.tradable, false));
  return new Set(rows.map((row) => row.mint));
}

/** Upserts one ticker's result from a `check-liquidity` run — "upsert"
 *  because the cron job re-checks the full catalog every run, so a
 *  ticker that goes from untradable back to tradable (or vice versa)
 *  needs its existing row overwritten, not a new one inserted
 *  alongside it. */
export async function upsertLiquidityCheck(input: {
  mint: string;
  symbol: string;
  tradable: boolean;
  priceImpactPct: number | null;
}): Promise<void> {
  await db
    .insert(tokenLiquidity)
    .values({
      mint: input.mint,
      symbol: input.symbol,
      tradable: input.tradable,
      priceImpactPct: input.priceImpactPct === null ? null : String(input.priceImpactPct),
      checkedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: tokenLiquidity.mint,
      set: {
        symbol: input.symbol,
        tradable: input.tradable,
        priceImpactPct: input.priceImpactPct === null ? null : String(input.priceImpactPct),
        checkedAt: new Date(),
      },
    });
}
