import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { tokenLiquidity } from "@/lib/db/schema";

// Mocked so this test doesn't spend a minute hitting the real Jupiter
// quote API on every run — the check itself (retry/backoff, the
// NO_ROUTES_FOUND distinction) has its own unit-level coverage worth
// adding separately; this route's job is auth + wiring the result into
// the DB, which is what these tests actually verify.
const checkAllTickersLiquidityMock = vi.fn();
vi.mock("@/lib/liquidity", () => ({
  checkAllTickersLiquidity: checkAllTickersLiquidityMock,
}));

const { GET } = await import("@/app/api/cron/check-liquidity/route");

function cronRequest(authHeader?: string) {
  return new NextRequest("http://localhost/api/cron/check-liquidity", {
    headers: authHeader ? { Authorization: authHeader } : {},
  });
}

const testMints: string[] = [];

afterEach(() => {
  vi.unstubAllEnvs();
  checkAllTickersLiquidityMock.mockReset();
});

afterAll(async () => {
  for (const mint of testMints) {
    await db.delete(tokenLiquidity).where(eq(tokenLiquidity.mint, mint));
  }
});

describe("GET /api/cron/check-liquidity — auth", () => {
  it("401s with no Authorization header", async () => {
    const res = await GET(cronRequest());
    expect(res.status).toBe(401);
    expect(checkAllTickersLiquidityMock).not.toHaveBeenCalled();
  });

  it("401s with the wrong secret", async () => {
    vi.stubEnv("CRON_SECRET", "the-real-secret");
    const res = await GET(cronRequest("Bearer wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("500s when CRON_SECRET isn't configured on the server", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const res = await GET(cronRequest("Bearer anything"));
    expect(res.status).toBe(500);
    expect(checkAllTickersLiquidityMock).not.toHaveBeenCalled();
  });

  it("succeeds with the correct secret", async () => {
    vi.stubEnv("CRON_SECRET", "the-real-secret");
    checkAllTickersLiquidityMock.mockResolvedValueOnce({ results: [], inconclusive: [] });
    const res = await GET(cronRequest("Bearer the-real-secret"));
    expect(res.status).toBe(200);
  });
});

describe("GET /api/cron/check-liquidity — persists results", () => {
  it("upserts each result into token_liquidity and reports untradable/inconclusive in the response", async () => {
    vi.stubEnv("CRON_SECRET", "the-real-secret");
    const tradableMint = "vitest-tradable-mint";
    const untradableMint = "vitest-untradable-mint";
    testMints.push(tradableMint, untradableMint);

    checkAllTickersLiquidityMock.mockResolvedValueOnce({
      results: [
        { mint: tradableMint, symbol: "GOOD", tradable: true, priceImpactPct: 0.001 },
        { mint: untradableMint, symbol: "BAD", tradable: false, priceImpactPct: null },
      ],
      inconclusive: [{ mint: "vitest-flaky-mint", symbol: "FLAKY" }],
    });

    const res = await GET(cronRequest("Bearer the-real-secret"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.checked).toBe(2);
    expect(json.untradable).toEqual(["BAD"]);
    expect(json.inconclusive).toEqual(["FLAKY"]);

    const rows = await db
      .select()
      .from(tokenLiquidity)
      .where(eq(tokenLiquidity.mint, tradableMint));
    expect(rows[0].tradable).toBe(true);

    const untradableRows = await db
      .select()
      .from(tokenLiquidity)
      .where(eq(tokenLiquidity.mint, untradableMint));
    expect(untradableRows[0].tradable).toBe(false);

    // The inconclusive one was never persisted — that's the whole point
    // (see liquidity.ts: never guess tradable/untradable from an
    // ambiguous result).
    const inconclusiveRows = await db
      .select()
      .from(tokenLiquidity)
      .where(eq(tokenLiquidity.mint, "vitest-flaky-mint"));
    expect(inconclusiveRows).toHaveLength(0);
  });

  it("upserting an existing mint updates it rather than duplicating", async () => {
    vi.stubEnv("CRON_SECRET", "the-real-secret");
    const mint = "vitest-flip-mint";
    testMints.push(mint);

    checkAllTickersLiquidityMock.mockResolvedValueOnce({
      results: [{ mint, symbol: "FLIP", tradable: false, priceImpactPct: null }],
      inconclusive: [],
    });
    await GET(cronRequest("Bearer the-real-secret"));

    checkAllTickersLiquidityMock.mockResolvedValueOnce({
      results: [{ mint, symbol: "FLIP", tradable: true, priceImpactPct: 0.02 }],
      inconclusive: [],
    });
    await GET(cronRequest("Bearer the-real-secret"));

    const rows = await db.select().from(tokenLiquidity).where(eq(tokenLiquidity.mint, mint));
    expect(rows).toHaveLength(1);
    expect(rows[0].tradable).toBe(true);
  });
});
