"use client";

import { useEffect, useState } from "react";
import type { GiftJson } from "@/lib/api/gifts";

type HistoryState = {
  sent: GiftJson[];
  claimed: GiftJson[];
  loading: boolean;
};

/**
 * Fetches a wallet's sent + claimed gift history from the real backend
 * (`GET /api/gifts?sender=`/`?recipient=`, see Architecture.md) — used by
 * `/history` once a wallet is connected. `null` wallet address means "not
 * connected yet," not "connected wallet with no gifts" — callers should
 * gate their own loading UI on `ready` (from Privy) separately from this
 * hook's `loading`.
 */
export function useGiftHistory(walletAddress: string | null) {
  const [state, setState] = useState<HistoryState>({
    sent: [],
    claimed: [],
    loading: true,
  });

  useEffect(() => {
    if (!walletAddress) {
      setState({ sent: [], claimed: [], loading: false });
      return;
    }

    let cancelled = false;
    setState((current) => ({ ...current, loading: true }));

    async function fetchHistory() {
      try {
        const [sentRes, claimedRes] = await Promise.all([
          fetch(`/api/gifts?sender=${encodeURIComponent(walletAddress!)}`),
          fetch(`/api/gifts?recipient=${encodeURIComponent(walletAddress!)}`),
        ]);
        const sentJson = sentRes.ok ? await sentRes.json() : { gifts: [] };
        const claimedJson = claimedRes.ok ? await claimedRes.json() : { gifts: [] };
        if (!cancelled) {
          setState({
            sent: sentJson.gifts ?? [],
            claimed: claimedJson.gifts ?? [],
            loading: false,
          });
        }
      } catch {
        // Network hiccup — show an empty history rather than an error
        // state; the page's own copy already explains gifts live behind
        // the connected wallet, so an empty table reads fine either way.
        if (!cancelled) setState({ sent: [], claimed: [], loading: false });
      }
    }

    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  return state;
}
