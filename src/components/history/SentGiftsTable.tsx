import { StockCell } from "@/components/history/StockCell";
import { StatusPill } from "@/components/history/StatusPill";
import type { SentGiftRow } from "@/lib/historyTypes";
import type { LiveStock } from "@/lib/stocks";
import { formatShares } from "@/lib/shares";

const GRID_COLS = "sm:grid-cols-[1.6fr_1fr_1.6fr_0.9fr_0.7fr]";

/**
 * "Gifts you've sent" (docs/mockup/sender-history.png) — a table on sm+
 * (grid, so every row's columns line up under the header), a stacked card
 * per row below that (a 5-column table has no readable mobile shape, so
 * it collapses rather than shrinking/scrolling).
 */
export function SentGiftsTable({
  rows,
  stocks,
  onCancel,
}: {
  rows: SentGiftRow[];
  stocks: LiveStock[];
  onCancel: (row: SentGiftRow) => void;
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
        <span>Recipient</span>
        <span>Status</span>
        <span>Actions</span>
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
                <span className="sm:hidden">
                  <StatusPill status={row.status} />
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

              <p className="min-w-0 truncate text-sm text-ink/70">
                {row.recipient}
              </p>

              <span className="hidden sm:inline-flex">
                <StatusPill status={row.status} />
              </span>

              <div className="text-left sm:text-right">
                {row.status === "pending" ? (
                  <button
                    type="button"
                    onClick={() => onCancel(row)}
                    className="text-sm font-semibold text-coral hover:brightness-90"
                  >
                    Cancel
                  </button>
                ) : (
                  <span className="text-sm text-ink/30">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
