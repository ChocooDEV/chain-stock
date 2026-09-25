export type StockConfig = {
  symbol: string;
  name: string;
  mint: string;
};

const JUPITER_TAG_URL = "https://lite-api.jup.ag/tokens/v2/tag?query=verified";

/**
 * Every Backpack Securities stock token observed on mainnet shares this
 * exact freeze authority — a real on-chain invariant, not just a text
 * label Jupiter assigned. Cross-checked below rather than trusted
 * outright: `tags` alone would accept anything Jupiter happened to tag
 * both `stocks` and `backpack`, which is Jupiter's own third-party
 * classification, not Backpack's direct attestation. Verified 2026-09-25
 * against all 61 currently-tagged tokens; if Backpack ever rotates this
 * key, matched tokens would silently drop out here rather than admit an
 * impostor — the fail-safe direction for a financial catalog.
 */
const BACKPACK_FREEZE_AUTHORITY = "2cVYpagTt7ZGc3mmTXBa7fAznUtx5DUu6aCq8uVDaf4a";

type JupiterVerifiedToken = {
  id: string;
  symbol: string;
  name: string;
  tags?: string[];
  freezeAuthority?: string | null;
};

function isJupiterVerifiedToken(value: unknown): value is JupiterVerifiedToken {
  if (typeof value !== "object" || value === null) return false;
  const token = value as Record<string, unknown>;
  return (
    typeof token.id === "string" &&
    typeof token.symbol === "string" &&
    typeof token.name === "string"
  );
}

/**
 * The full current catalog of real, on-chain Backpack Securities stock
 * tokens (issued through Backpack's broker-dealer subsidiary, distributed
 * via Sunrise, redeemable 1:1 for the underlying share) — not Backed
 * Finance's unrelated "xStocks" product. Fetched live rather than
 * hardcoded: Backpack adds new listings over time (50+ at the time of
 * writing, well past the ~20 expected).
 *
 * Sourced from Jupiter's token API (the same host already used for
 * prices and swap quotes, so no new dependency) rather than Sunrise's own
 * listings API: `tags.includes("stocks")` alone matches 1,600+ tokens
 * across every tokenized-stock issuer on Solana (e.g. `AAPLx` vs.
 * `AAPLon` are different, unrelated issuers), so `backpack` narrows it,
 * and `BACKPACK_FREEZE_AUTHORITY` above is the authenticity check that
 * keeps an unrelated token from qualifying just by being tagged the same
 * way Jupiter tagged real Backpack tokens.
 *
 * Shared by `GET /api/stocks` and `src/lib/liquidity.ts`'s cron check —
 * both need the same catalog, and the second one existing (see
 * TODO.md's Jupiter liquidity-depth findings) is exactly why this used
 * to live only inline in the stocks route: a second consumer showed up.
 */
export async function fetchStockCatalog(): Promise<StockConfig[]> {
  const res = await fetch(JUPITER_TAG_URL, { next: { revalidate: 300 } });
  if (!res.ok) {
    throw new Error(`Jupiter verified-token list request failed (${res.status})`);
  }
  const body = await res.json();
  if (!Array.isArray(body)) {
    throw new Error("Jupiter verified-token list returned an unexpected shape");
  }

  return body
    .filter(isJupiterVerifiedToken)
    .filter(
      (token) =>
        !!token.tags?.includes("stocks") &&
        !!token.tags?.includes("backpack") &&
        token.freezeAuthority === BACKPACK_FREEZE_AUTHORITY,
    )
    .map((token) => ({
      symbol: token.symbol,
      name: token.name.replace(/\s*-\s*Backpack Securities$/, ""),
      mint: token.id,
    }));
}

/** Live price snapshot for one stock, as returned by `/api/stocks`. */
export type LiveStock = StockConfig & {
  price: number;
  changePercent24h: number;
  logoUrl: string;
};

/**
 * Backpack serves per-symbol stock logos at this endpoint (real company
 * marks). Proxied through wsrv.nl for resizing/caching rather than
 * hotlinked directly — the pattern Jupiter.ag itself uses (see App.md).
 */
export function stockLogoUrl(symbol: string, size = 64) {
  const source = `https://backpack.exchange/api/stock-logo/${symbol}`;
  return `https://wsrv.nl/?w=${size}&h=${size}&url=${encodeURIComponent(source)}&dpr=2&quality=80`;
}

/**
 * The handful of tickers used for illustrative/decorative purposes —
 * the landing page's hero ticker (purely decorative, no live data) and
 * the gift page's highlight banner (a curated slice of the real live
 * catalog, not the raw fetch order) both pull from this same list, so
 * the two pages read as consistent rather than showing different
 * tickers at random. All three are real Backpack Securities spot
 * tokens (see the gift-page catalog in `/api/stocks`) — recognizable
 * names, not necessarily the most liquid ones.
 */
export const FEATURED_SYMBOLS = ["SPCX", "RDDT", "AMC"];

/** Shapes one live stock into the `{symbol, price, direction}` a live
 *  TickerStrip item needs. */
export function toTickerItem(stock: LiveStock) {
  return {
    symbol: stock.symbol,
    price: stock.price,
    direction: (stock.changePercent24h >= 0 ? "up" : "down") as "up" | "down",
  };
}

/** The FEATURED_SYMBOLS highlight strip, resolved against the live
 *  catalog and shaped for TickerStrip — shared by every page that shows
 *  it (gift, gift/sent) so the derivation only lives in one place. */
export function getFeaturedBannerItems(stocks: LiveStock[]) {
  return FEATURED_SYMBOLS.map((symbol) =>
    stocks.find((stock) => stock.symbol === symbol),
  )
    .filter((stock): stock is LiveStock => stock !== undefined)
    .map(toTickerItem);
}
