"use client";

import { ChevronDown, ChevronUp, TrendingUp } from "lucide-react";
import { SparkBurst } from "@/components/SparkBurst";
import { formatShares } from "@/lib/shares";

const STEP = 5;
const MIN = 5;

/**
 * Step 2 of the create-gift form: the dollar amount, flanked by the same
 * spark accents used around the landing CTA, plus a live "≈ N shares of
 * SYMBOL right now" estimate — informational only. The escrow always holds
 * USDC, not the stock itself (see docs/App.md), so this number is just
 * "what this would buy today," not a locked-in share count.
 */
export function AmountInput({
  amountUsd,
  onChange,
  selectedStock,
}: {
  amountUsd: number;
  onChange: (value: number) => void;
  selectedStock: { symbol: string; price: number } | null;
}) {
  const shares =
    selectedStock && selectedStock.price > 0
      ? amountUsd / selectedStock.price
      : null;

  return (
    <div>
      {/* Centering wrapper kept separate from the positioning wrapper below
          — flex-centering a `relative` box directly would stretch it to
          the full row width, and SparkBurst's left-0/left-full anchors
          would then land on that wide box's edges instead of the amount
          card's actual edges (see src/components/landing/Hero.tsx for the
          same bug, hit and fixed there first). */}
      <div className="flex justify-center">
        <div className="relative inline-block">
          <SparkBurst />
          <div className="flex items-center gap-4 rounded-2xl border border-ink/10 bg-white px-6 py-4">
            <span className="flex items-baseline font-display text-4xl font-bold">
              $
              <input
                type="text"
                inputMode="numeric"
                aria-label="Gift amount in US dollars"
                value={amountUsd}
                onChange={(event) => {
                  const digits = event.target.value.replace(/\D/g, "");
                  onChange(digits === "" ? 0 : Number(digits));
                }}
                onBlur={() => onChange(Math.max(MIN, amountUsd))}
                className="ml-1 w-28 bg-transparent font-display text-4xl font-bold focus:outline-none"
              />
            </span>
            <div className="flex flex-col">
              <button
                type="button"
                aria-label="Increase amount"
                onClick={() => onChange(amountUsd + STEP)}
                className="text-ink/50 transition hover:text-ink"
              >
                <ChevronUp className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Decrease amount"
                onClick={() => onChange(Math.max(MIN, amountUsd - STEP))}
                className="text-ink/50 transition hover:text-ink"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedStock && shares !== null && (
        <div className="mt-3 flex justify-center">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-teal/10 px-4 py-1.5 text-sm font-medium text-teal">
            <TrendingUp className="h-4 w-4" aria-hidden />≈{" "}
            {formatShares(shares)} shares of {selectedStock.symbol} right
            now.
          </p>
        </div>
      )}

      <p className="mt-2 text-center text-xs text-ink/70">
        ${MIN} minimum per gift
      </p>
    </div>
  );
}
