export type StockConfig = {
  symbol: string;
  name: string;
  mint: string;
};

const SUNRISE_TOKENS_URL = "https://api.sunrise.xyz/v1/tokens";

type SunriseToken = {
  address: string;
  symbol: string;
  name: string;
  assetClass: string;
  issuer: string | null;
};

function isSunriseToken(value: unknown): value is SunriseToken {
  if (typeof value !== "object" || value === null) return false;
  const token = value as Record<string, unknown>;
  return (
    typeof token.address === "string" &&
    typeof token.symbol === "string" &&
    typeof token.name === "string" &&
    typeof token.assetClass === "string" &&
    (token.issuer === null || typeof token.issuer === "string")
  );
}

/**
 * The full current catalog of real, on-chain Backpack Securities stock
 * tokens (issued through Backpack's broker-dealer subsidiary, listed via
 * Sunrise, redeemable 1:1 for the underlying share) — not Backed
 * Finance's unrelated "xStocks" product. Fetched live rather than
 * hardcoded: Backpack adds new listings over time (50+ at the time of
 * writing, well past the ~20 expected), and Sunrise's own API is the
 * authoritative source for which mints are real vs. an unrelated token
 * squatting on the same ticker text.
 *
 * Shared by `GET /api/stocks` and `src/lib/liquidity.ts`'s cron check —
 * both need the same catalog, and the second one existing (see
 * TODO.md's Jupiter liquidity-depth findings) is exactly why this used
 * to live only inline in the stocks route: a second consumer showed up.
 */
export async function fetchStockCatalog(): Promise<StockConfig[]> {
  const tokens: SunriseToken[] = [];
  let cursor: string | undefined;

  do {
    const url = cursor
      ? `${SUNRISE_TOKENS_URL}?cursor=${encodeURIComponent(cursor)}`
      : SUNRISE_TOKENS_URL;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) break;
    const body = await res.json();
    const rawTokens = body?.data?.tokens;
    if (Array.isArray(rawTokens)) tokens.push(...rawTokens.filter(isSunriseToken));
    cursor =
      typeof body?.data?.pagination?.nextCursor === "string"
        ? body.data.pagination.nextCursor
        : undefined;
  } while (cursor);

  return tokens
    .filter(
      (token) =>
        token.assetClass === "stock" && token.issuer === "backpack_securities",
    )
    .map((token) => ({
      symbol: token.symbol,
      name: token.name.replace(/\s*-\s*Backpack Securities$/, ""),
      mint: token.address,
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
