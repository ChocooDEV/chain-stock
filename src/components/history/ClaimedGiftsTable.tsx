import { StockCell } from "@/components/history/StockCell";
import type { ClaimedGiftRow } from "@/lib/historyTypes";
import type { LiveStock } from "@/lib/stocks";
import { formatShares } from "@/lib/shares";

const GRID_COLS = "sm:grid-cols-[1.6fr_1fr_1fr]";

/**
 * "Gifts you've claimed" — same shape as SentGiftsTable but without the
 * recipient/actions columns: every row here is already claimed by
 * definition (this table only ever shows what `GET /api/gifts?recipient=
 * <wallet>` returns, see Architecture.md), so there's nothing to act on
 * or identify a recipient for.
 */
export function ClaimedGiftsTable({
  rows,
  stocks,
}: {
  rows: ClaimedGiftRow[];
  stocks: LiveStock[];
}) {
  const stockFor = (symbol: string) =>
    stocks.find((s) => s.symbol === symbol) ?? null;

  return (
    <div className="overflow-hidden rounded-3xl border border-ink/10 bg-white">
      <div
        className={`hidden gap-4 border-b border-ink/10 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink/40 sm:grid ${GRID_COLS}`}
      >
        <span>Stock</span>
        <span>Amount</span>
        <span>Claimed</span>
      </div>

      <div className="divide-y divide-ink/10">
        {rows.map((row) => {
          const stock = stockFor(row.symbol);
          const shares =
            stock && stock.price > 0 ? row.amountUsd / stock.price : null;

          return (
            <div
              key={row.id}
              className={`flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-ink/[0.02] sm:grid sm:items-center sm:gap-4 ${GRID_COLS}`}
            >
              <div className="flex items-center justify-between sm:contents">
                <StockCell symbol={row.symbol} stock={stock} />
                <span className="text-sm text-ink/50 sm:hidden">
                  {row.claimedAgo}
                </span>
              </div>

              <div>
                <p className="font-display font-bold">${row.amountUsd}</p>
                {shares !== null && (
                  <p className="text-xs text-ink/50">
                    ≈ {formatShares(shares)} shares
                  </p>
                )}
              </div>

              <p className="hidden text-sm text-ink/50 sm:block">
                {row.claimedAgo}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
