import { fetchStockCatalog } from "@/lib/stocks";

const JUPITER_QUOTE_URL = "https://lite-api.jup.ag/swap/v1/quote";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDC_DECIMALS = 6;
// Matches the gift form's default amount — the smallest realistic gift
// size, and therefore the easiest one to route. If a ticker can't clear
// even this, it can't clear a real gift of any size.
const CHECK_AMOUNT_USD = 25;
// Jupiter's public lite-api rate-limits aggressively (confirmed via a
// blunt 100-request burst while researching this — see TODO.md); batches
// of 3 with a delay between them stays well under it while keeping the
// whole ~50-ticker catalog checkable inside one serverless invocation.
const CONCURRENCY = 3;
const BATCH_DELAY_MS = 300;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 3000;

export type LiquidityCheckResult = {
  mint: string;
  symbol: string;
  tradable: boolean;
  priceImpactPct: number | null;
};

type QuoteOutcome = { tradable: boolean; priceImpactPct: number | null } | "retry";

async function quoteOnce(mint: string): Promise<QuoteOutcome> {
  const amountBaseUnits = Math.round(CHECK_AMOUNT_USD * 10 ** USDC_DECIMALS);
  const url = `${JUPITER_QUOTE_URL}?inputMint=${USDC_MINT}&outputMint=${mint}&amount=${amountBaseUnits}&slippageBps=50`;
  const res = await fetch(url);

  if (res.status === 429) return "retry";

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    // Jupiter's own signal for "no path exists" — a real, conclusive
    // answer, not a transient failure. Any other 4xx/5xx is ambiguous
    // (could be a malformed request, a momentary upstream issue, etc.)
    // and gets retried rather than treated as evidence of no liquidity.
    if (body?.errorCode === "NO_ROUTES_FOUND") {
      return { tradable: false, priceImpactPct: null };
    }
    return "retry";
  }

  const body = await res.json();
  return { tradable: true, priceImpactPct: Number(body.priceImpactPct) };
}

/** Retries transient failures, but never turns "still unsure after
 *  retrying" into a tradable/untradable guess — the caller treats a
 *  `null` result as "skip this ticker this run," leaving whatever
 *  `token_liquidity` already has for it untouched. */
async function checkTicker(
  mint: string,
): Promise<{ tradable: boolean; priceImpactPct: number | null } | null> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const result = await quoteOnce(mint);
    if (result !== "retry") return result;
    if (attempt < MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
    }
  }
  return null;
}

/**
 * Checks every ticker in the live Backpack Securities catalog (see
 * `fetchStockCatalog` in `stocks.ts`) for actual Jupiter swap-route
 * liquidity, not just a reference price —
 * see `token_liquidity`'s schema comment (`src/lib/db/schema.ts`) for
 * why the price-only check `GET /api/stocks` used to rely on isn't
 * enough (a real example: `XYZ`/"Block" has a reference price but zero
 * trading liquidity).
 */
export async function checkAllTickersLiquidity(): Promise<{
  results: LiquidityCheckResult[];
  inconclusive: { mint: string; symbol: string }[];
}> {
  const catalog = await fetchStockCatalog();
  const results: LiquidityCheckResult[] = [];
  const inconclusive: { mint: string; symbol: string }[] = [];

  for (let i = 0; i < catalog.length; i += CONCURRENCY) {
    const batch = catalog.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (stock) => ({ stock, outcome: await checkTicker(stock.mint) })),
    );
    for (const { stock, outcome } of batchResults) {
      if (outcome === null) {
        inconclusive.push({ mint: stock.mint, symbol: stock.symbol });
      } else {
        results.push({ mint: stock.mint, symbol: stock.symbol, ...outcome });
      }
    }
    if (i + CONCURRENCY < catalog.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  return { results, inconclusive };
}
