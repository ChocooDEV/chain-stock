import { StockLogo } from "@/components/gift/StockLogo";
import type { LiveStock } from "@/lib/stocks";

/** Logo + symbol + company name — the leftmost cell of every gift-history
 *  row (docs/mockup/sender-history.png). `stock` is nullable because a
 *  row's symbol can momentarily miss the live catalog (still loading, or
 *  briefly delisted) — falls back to just the bare symbol rather than
 *  hiding the row. */
export function StockCell({ symbol, stock }: { symbol: string; stock: LiveStock | null }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {stock && <StockLogo src={stock.logoUrl} size={36} />}
      <div className="min-w-0">
        <p className="font-display font-bold leading-tight">{symbol}</p>
        {stock && (
          <p className="truncate text-xs text-ink/70">{stock.name}</p>
        )}
      </div>
    </div>
  );
}
