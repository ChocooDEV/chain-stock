"use client";

import { useEffect, useState } from "react";
import type { GiftJson } from "@/lib/api/gifts";

type HistoryState = {
  sent: GiftJson[];
  claimed: GiftJson[];
  loading: boolean;
};

function dedupeByClaimSeed(gifts: GiftJson[]): GiftJson[] {
  const seen = new Map<string, GiftJson>();
  for (const gift of gifts) seen.set(gift.claimSeed, gift);
  return Array.from(seen.values());
}

/**
 * Fetches a wallet's sent + claimed gift history from the real backend
 * (`GET /api/gifts?sender=`/`?recipient=`, see Architecture.md) — used by
 * `/history` once at least one wallet is connected.
 *
 * Takes an *array* of addresses, not one: a person can connect via
 * wallet-adapter (currently the only path that can send, since
 * `create_gift` requires it — see GiftForm.tsx) and separately via Privy
 * (currently the only path that can claim), and there's nothing stopping
 * the same person from having sent gifts under one and claimed under the
 * other, or reconnecting later under a different identity — see
 * HistoryPageClient's own comment for why both are read here rather than
 * assuming just one. Results across every connected address are merged
 * and de-duplicated by `claimSeed` (a gift shows once even if, in some
 * future flow, it were indexed as reachable under more than one
 * address). An empty array means "no wallet connected yet," not "a
 * connected wallet with no gifts" — callers should gate their own
 * loading UI on wallet-connection state separately from this hook's
 * `loading`.
 */
export function useGiftHistory(walletAddresses: string[]) {
  const [state, setState] = useState<HistoryState>({
    sent: [],
    claimed: [],
    loading: true,
  });

  // Array identity changes every render even with the same contents —
  // key the effect off the actual addresses (sorted, joined) instead, or
  // it would re-fetch in an infinite loop.
  const addressesKey = [...walletAddresses].sort().join(",");

  useEffect(() => {
    const addresses = addressesKey ? addressesKey.split(",") : [];
    if (addresses.length === 0) {
      setState({ sent: [], claimed: [], loading: false });
      return;
    }

    let cancelled = false;
    setState((current) => ({ ...current, loading: true }));

    async function fetchHistory() {
      try {
        const results = await Promise.all(
          addresses.map((address) =>
            Promise.all([
              fetch(`/api/gifts?sender=${encodeURIComponent(address)}`),
              fetch(`/api/gifts?recipient=${encodeURIComponent(address)}`),
            ]),
          ),
        );

        const sent: GiftJson[] = [];
        const claimed: GiftJson[] = [];
        for (const [sentRes, claimedRes] of results) {
          const sentJson = sentRes.ok ? await sentRes.json() : { gifts: [] };
          const claimedJson = claimedRes.ok ? await claimedRes.json() : { gifts: [] };
          sent.push(...(sentJson.gifts ?? []));
          claimed.push(...(claimedJson.gifts ?? []));
        }

        if (!cancelled) {
          setState({
            sent: dedupeByClaimSeed(sent),
            claimed: dedupeByClaimSeed(claimed),
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
  }, [addressesKey]);

  return state;
}
