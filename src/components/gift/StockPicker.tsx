"use client";

import { useState } from "react";
import { Check, Search } from "lucide-react";
import { StockLogo } from "@/components/gift/StockLogo";
import type { LiveStock } from "@/lib/stocks";

/**
 * Step 1 of the create-gift form: search + select from the live catalog of
 * real Backpack Securities stock tokens (see /api/stocks). The search box
 * isn't decorative — the catalog is 40+ tickers, not the handful shown in
 * early mockups, so filtering is how a sender actually finds one.
 */
export function StockPicker({
  stocks,
  loading,
  selected,
  onSelect,
}: {
  stocks: LiveStock[];
  loading: boolean;
  selected: string | null;
  onSelect: (symbol: string) => void;
}) {
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? stocks.filter(
        (stock) =>
          stock.symbol.toLowerCase().includes(normalizedQuery) ||
          stock.name.toLowerCase().includes(normalizedQuery),
      )
    : stocks;

  return (
    <div>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/40"
          aria-hidden
        />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search for a stock..."
          aria-label="Search for a stock"
          className="w-full rounded-2xl border border-ink/10 bg-white py-4 pl-12 pr-4 font-body text-base text-ink placeholder:text-ink/40 focus:border-teal focus:outline-none"
        />
      </div>

      <div className="styled-scrollbar mt-3 max-h-80 divide-y divide-ink/10 overflow-y-auto rounded-2xl border border-ink/10 bg-white">
        {loading && stocks.length === 0 && (
          <p className="p-4 text-sm text-ink/70">Loading live prices…</p>
        )}
        {!loading && filtered.length === 0 && (
          <p className="p-4 text-sm text-ink/70">
            No stock matches &ldquo;{query}&rdquo;.
          </p>
        )}
        {filtered.map((stock) => {
          const isSelected = stock.symbol === selected;
          const isUp = stock.changePercent24h >= 0;
          return (
            <button
              key={stock.symbol}
              type="button"
              onClick={() => onSelect(stock.symbol)}
              className={`flex w-full items-center gap-4 px-4 py-3 text-left transition-colors ${
                isSelected ? "bg-teal/10" : "hover:bg-ink/[0.03]"
              }`}
            >
              <StockLogo src={stock.logoUrl} size={40} />
              <span className="min-w-0 flex-1">
                <span className="block font-display font-bold">
                  {stock.symbol}
                </span>
                <span className="block truncate text-sm text-ink/60">
                  {stock.name}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-ticker font-bold">
                  ${stock.price.toFixed(2)}
                </span>
                <span
                  className={`relative block text-sm font-medium ${isUp ? "text-gain" : "text-loss"}`}
                >
                  <span aria-hidden>{isUp ? "▲" : "▼"}</span>{" "}
                  <span className="sr-only">{isUp ? "up " : "down "}</span>
                  {Math.abs(stock.changePercent24h).toFixed(2)}%
                </span>
              </span>
              <span
                aria-hidden
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                  isSelected ? "border-teal bg-teal text-white" : "border-ink/20"
                }`}
              >
                {isSelected && <Check className="h-4 w-4" strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
