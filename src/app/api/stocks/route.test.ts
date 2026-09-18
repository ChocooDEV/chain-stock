import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { tokenLiquidity } from "@/lib/db/schema";

const fetchStockCatalogMock = vi.fn();
vi.mock("@/lib/stocks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/stocks")>();
  return { ...actual, fetchStockCatalog: fetchStockCatalogMock };
});

const { GET } = await import("@/app/api/stocks/route");

const JUPITER_PRICE_URL = "https://lite-api.jup.ag/price/v3";
const realFetch = globalThis.fetch;
let fetchMock: ReturnType<typeof vi.fn>;

const testMints: string[] = [];

beforeEach(() => {
  fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.startsWith(JUPITER_PRICE_URL)) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            "mint-tradable": { usdPrice: 100, priceChange24h: 1.5 },
            "mint-untradable": { stockData: { price: 77.6 } },
            "mint-both-prices": { usdPrice: 50, stockData: { price: 55 } },
          }),
          { status: 200 },
        ),
      );
    }
    return realFetch(input, init);
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchStockCatalogMock.mockReset();
});

afterAll(async () => {
  for (const mint of testMints) {
    await db.delete(tokenLiquidity).where(eq(tokenLiquidity.mint, mint));
  }
});

describe("GET /api/stocks", () => {
  it("502s when the catalog fetch comes back empty", async () => {
    fetchStockCatalogMock.mockResolvedValueOnce([]);
    const res = await GET();
    expect(res.status).toBe(502);
  });

  it("filters out a mint token_liquidity has marked untradable", async () => {
    const untradableMint = "vitest-stocks-untradable";
    testMints.push(untradableMint);
    await db.insert(tokenLiquidity).values({
      mint: untradableMint,
      symbol: "BAD",
      tradable: false,
    });

    fetchStockCatalogMock.mockResolvedValueOnce([
      { symbol: "GOOD", name: "Good Co", mint: "mint-tradable" },
      { symbol: "BAD", name: "Bad Co", mint: untradableMint },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    const symbols = json.stocks.map((s: { symbol: string }) => s.symbol);
    expect(symbols).toContain("GOOD");
    expect(symbols).not.toContain("BAD");
  });

  it("still returns everything when there's nothing marked untradable", async () => {
    fetchStockCatalogMock.mockResolvedValueOnce([
      { symbol: "GOOD", name: "Good Co", mint: "mint-tradable" },
    ]);
    const res = await GET();
    const json = await res.json();
    expect(json.stocks.map((s: { symbol: string }) => s.symbol)).toEqual(["GOOD"]);
  });

  it("drops a stock with no live price at all, even if not marked untradable", async () => {
    fetchStockCatalogMock.mockResolvedValueOnce([
      { symbol: "NOPRICE", name: "No Price Co", mint: "mint-with-no-price-entry" },
    ]);
    const res = await GET();
    const json = await res.json();
    expect(json.stocks).toHaveLength(0);
  });

  it("falls back to usdPrice when stockData.price is absent", async () => {
    fetchStockCatalogMock.mockResolvedValueOnce([
      { symbol: "GOOD", name: "Good Co", mint: "mint-tradable" },
    ]);
    const res = await GET();
    const json = await res.json();
    expect(json.stocks[0].price).toBe(100);
  });

  it("prefers stockData.price over usdPrice when both exist", async () => {
    fetchStockCatalogMock.mockResolvedValueOnce([
      { symbol: "BOTH", name: "Both Co", mint: "mint-both-prices" },
    ]);
    const res = await GET();
    const json = await res.json();
    expect(json.stocks[0].price).toBe(55);
  });
});
