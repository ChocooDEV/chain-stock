"use client";

import { useEffect, useState } from "react";

export type RecipientMode = "specific" | "fcfs";

export type GiftDraft = {
  symbol: string | null;
  amountUsd: number;
  recipientMode: RecipientMode;
  recipientValue: string;
};

const STORAGE_KEY = "chainstock:gift-draft";

const DEFAULT_DRAFT: GiftDraft = {
  symbol: null,
  amountUsd: 25,
  recipientMode: "specific",
  recipientValue: "",
};

/**
 * Persists the in-progress "send a gift" form to localStorage, so a
 * sender's picks (stock, amount, recipient) survive the wallet-connect
 * interruption that clicking "Send gift" can trigger — a mobile wallet's
 * approve-then-return deep link can reload the page, which would
 * otherwise wipe in-memory form state.
 */
export function useGiftDraft() {
  const [draft, setDraft] = useState<GiftDraft>(DEFAULT_DRAFT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDraft((current) => ({ ...current, ...JSON.parse(raw) }));
    } catch {
      // Malformed or inaccessible storage — fall back to defaults.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    // Debounced rather than writing on every keystroke/click — coalesces
    // a burst of edits (e.g. typing a wallet address) into one write.
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      } catch {
        // Storage unavailable (private mode, quota) — non-fatal.
      }
    }, 250);
    return () => clearTimeout(timeoutId);
  }, [draft, hydrated]);

  // Called once a gift has actually been sent (see /gift/sent), so the
  // next visit to /gift starts from a blank form instead of the previous
  // gift's stock/amount/recipient still sitting there. Goes through
  // `setDraft` (not just clearing localStorage directly) so it also
  // supersedes the debounced write-back above — otherwise a write already
  // in flight when this runs could land after the clear and resurrect the
  // old draft.
  const resetDraft = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable — nothing to clean up.
    }
    setDraft(DEFAULT_DRAFT);
  };

  // Exposed so callers that apply their own default-if-empty logic (e.g.
  // GiftForm defaulting `symbol` to the first live stock) can wait for
  // this localStorage read to land first — otherwise that logic runs on
  // the pre-hydration `DEFAULT_DRAFT` values on every fresh mount (a
  // mobile wallet's approve-then-return deep link reload, notably) and
  // unconditionally overwrites whatever was about to be restored.
  return [draft, setDraft, resetDraft, hydrated] as const;
}
