import { NextResponse } from "next/server";
import { fetchStockCatalog, stockLogoUrl, type LiveStock } from "@/lib/stocks";
import { getUntradableMints } from "@/lib/db/queries";

const JUPITER_PRICE_URL = "https://lite-api.jup.ag/price/v3";
const JUPITER_BATCH_SIZE = 50; // Jupiter's price API caps `ids` at 50 per request.

async function fetchPrices(
  mints: string[],
): Promise<Record<string, { usdPrice?: number; priceChange24h?: number; stockData?: { price?: number } }>> {
  const prices: Record<string, { usdPrice?: number; priceChange24h?: number; stockData?: { price?: number } }> = {};

  for (let i = 0; i < mints.length; i += JUPITER_BATCH_SIZE) {
    const batch = mints.slice(i, i + JUPITER_BATCH_SIZE);
    const res = await fetch(`${JUPITER_PRICE_URL}?ids=${batch.join(",")}`, {
      next: { revalidate: 10 },
    });
    if (!res.ok) continue;
    const body = await res.json();
    if (body && typeof body === "object") Object.assign(prices, body);
  }

  return prices;
}

export async function GET() {
  const catalog = await fetchStockCatalog();
  if (catalog.length === 0) {
    return NextResponse.json(
      { error: "Failed to fetch stock catalog" },
      { status: 502 },
    );
  }

  // Best-effort — a DB hiccup here shouldn't take down the whole stock
  // picker. Fails open (empty set = nothing gets excluded on this
  // basis), matching `token_liquidity`'s own fail-open design.
  const untradableMints = await getUntradableMints().catch(() => new Set<string>());

  const prices = await fetchPrices(catalog.map((stock) => stock.mint));

  const stocks: LiveStock[] = catalog
    .filter((stock) => !untradableMints.has(stock.mint))
    .map((stock) => {
      const entry = prices[stock.mint];
      return {
        ...stock,
        // stockData.price is the real underlying share price; usdPrice is
        // the on-chain trading price, which can drift slightly from it.
        price: entry?.stockData?.price ?? entry?.usdPrice ?? 0,
        changePercent24h: entry?.priceChange24h ?? 0,
        logoUrl: stockLogoUrl(stock.symbol),
      };
    })
    // Drop anything Jupiter has no live price for at all (e.g. untraded
    // in 7 days). Doesn't catch every illiquid ticker on its own — some
    // report a real `stockData.price` with zero actual trading route
    // (see `token_liquidity`'s schema comment) — hence the mint filter
    // above as the real check; this is just a cheap first pass.
    .filter((stock) => stock.price > 0);

  return NextResponse.json({ stocks });
}
