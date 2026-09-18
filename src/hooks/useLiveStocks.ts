"use client";

import { useEffect, useState } from "react";
import type { LiveStock } from "@/lib/stocks";

const POLL_MS = 15_000;

/**
 * Polls our `/api/stocks` route (a server-side proxy for Jupiter's price
 * API — see that route for why a proxy is needed) so any live-price UI
 * stays current without the caller managing its own interval. Keeps the
 * last known prices on a failed poll rather than clearing them, so a
 * transient network hiccup doesn't blank out the page.
 */
export function useLiveStocks() {
  const [stocks, setStocks] = useState<LiveStock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchStocks = async () => {
      try {
        const res = await fetch("/api/stocks");
        const data = await res.json();
        if (!cancelled && Array.isArray(data.stocks)) {
          setStocks(data.stocks);
        }
      } catch {
        // Keep showing the last known prices.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchStocks();
    const id = setInterval(fetchStocks, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { stocks, loading };
}
