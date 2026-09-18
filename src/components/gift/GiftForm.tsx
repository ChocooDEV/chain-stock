"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { SparkBurst } from "@/components/SparkBurst";
import { useGiftDraft, type RecipientMode } from "@/hooks/useGiftDraft";
import { useToast } from "@/hooks/useToast";
import { generateMockClaimSeed } from "@/lib/claimSeed";
import { isValidSolanaAddress } from "@/lib/solana/address";
import { isValidEmail } from "@/lib/email";
import { StepHeading } from "@/components/gift/StepHeading";
import { StockPicker } from "@/components/gift/StockPicker";
import { AmountInput } from "@/components/gift/AmountInput";
import { RecipientModeCard } from "@/components/gift/RecipientModeCard";
import type { LiveStock } from "@/lib/stocks";

/**
 * Any well-formed email works — Privy's own login verifies ownership via
 * a one-time code regardless of provider, so there's nothing gained by
 * restricting this to one (see docs/App.md's recipient-identity
 * decision). Validated here and surfaced via a toast on submit.
 */
function getRecipientError(
  mode: RecipientMode,
  value: string,
): string | null {
  if (mode !== "specific") return null;
  const trimmed = value.trim();
  if (!trimmed) return "Enter a Solana wallet address or email address to send to.";
  if (trimmed.includes("@")) {
    return isValidEmail(trimmed)
      ? null
      : "That doesn't look like a valid email address.";
  }
  return isValidSolanaAddress(trimmed)
    ? null
    : "That doesn't look like a valid Solana wallet address.";
}

/**
 * The create-gift form (docs/mockup/create-gift.png). UI only for now —
 * the "Send gift" button gates on wallet connection (per the sender-signs-
 * everything model in docs/Architecture.md) and logs the draft instead of
 * building/submitting `create_gift`; that instruction wiring comes next.
 *
 * Takes the live stock list as props rather than fetching it itself, so
 * the page can share one `useLiveStocks` poll with the price banner above
 * the form instead of each running its own.
 */
export function GiftForm({
  stocks,
  loading,
}: {
  stocks: LiveStock[];
  loading: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useGiftDraft();
  const { connected } = useWallet();
  const { setVisible: setWalletModalVisible } = useWalletModal();
  const { toast, showToast, dismiss: dismissToast } = useToast();

  // Default to the first live stock once the catalog loads, if the sender
  // hasn't already picked (or restored) one.
  useEffect(() => {
    if (!draft.symbol && stocks.length > 0) {
      setDraft((current) => ({ ...current, symbol: stocks[0].symbol }));
    }
  }, [stocks, draft.symbol, setDraft]);

  const selectedStock = stocks.find((stock) => stock.symbol === draft.symbol) ?? null;

  const selectSpecificMode = () =>
    setDraft((current) => ({ ...current, recipientMode: "specific" }));

  const handleSend = () => {
    const recipientError = getRecipientError(
      draft.recipientMode,
      draft.recipientValue,
    );
    if (recipientError) {
      showToast(recipientError);
      return;
    }
    if (!connected) {
      setWalletModalVisible(true);
      return;
    }
    // Transaction wiring (create_gift + index call) comes next — this is
    // the point where it plugs in. For now, go straight to the
    // confirmation screen with a mock id in the URL (see
    // lib/claimSeed.ts) — /gift/sent requires this and redirects back
    // here without it, so that page can't be reached as a bare,
    // context-free route, only from an actual (mock, for now) send.
    router.push(`/gift/sent?id=${generateMockClaimSeed()}`);
  };

  return (
    <div>
      <div className="mx-auto max-w-xl space-y-10">
        <section className="space-y-4">
          <StepHeading step={1} color="teal">
            Pick a stock
          </StepHeading>
          <StockPicker
            stocks={stocks}
            loading={loading}
            selected={draft.symbol}
            onSelect={(symbol) => setDraft((current) => ({ ...current, symbol }))}
          />
        </section>

        <section className="space-y-4">
          <StepHeading step={2} color="gold">
            Choose an amount
          </StepHeading>
          <AmountInput
            amountUsd={draft.amountUsd}
            onChange={(amountUsd) => setDraft((current) => ({ ...current, amountUsd }))}
            selectedStock={selectedStock}
          />
        </section>

        <section className="space-y-4">
          <StepHeading step={3} color="teal">
            Choose how to send it
          </StepHeading>
          <div
            role="radiogroup"
            aria-label="How to send it"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            <RecipientModeCard
              mode="specific"
              active={draft.recipientMode === "specific"}
              onSelect={selectSpecificMode}
            >
              <input
                type="text"
                value={draft.recipientValue}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    recipientValue: event.target.value,
                  }))
                }
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
                // Focusing this field (by click or by tabbing in) commits to
                // "specific" mode even if "Anyone can claim" was selected —
                // otherwise a sender could type an address here while FCFS
                // stays active, and that typed value would be silently
                // ignored when sending.
                onFocus={selectSpecificMode}
                placeholder="So11111111111111111111111111111111111111112"
                aria-label="Solana wallet address or email address"
                className="w-full rounded-xl border border-ink/10 bg-cloud px-3 py-2 text-center text-sm placeholder:text-ink/40 focus:border-teal focus:outline-none"
              />
            </RecipientModeCard>
            <RecipientModeCard
              mode="fcfs"
              active={draft.recipientMode === "fcfs"}
              onSelect={() =>
                setDraft((current) => ({ ...current, recipientMode: "fcfs" }))
              }
            >
              {/* Not an input — just a preview of the link shape, generated
                  only once the gift actually exists on-chain. cursor-not-
                  allowed signals that, unlike the wallet/email field next
                  to it, this one isn't editable. */}
              <p className="w-full cursor-not-allowed truncate rounded-xl border border-ink/10 bg-cloud px-3 py-2 text-center text-sm text-ink/40">
                chain-stock.xyz/claim/…
              </p>
            </RecipientModeCard>
          </div>
        </section>
      </div>

      {/* Wider than the form column above (max-w-3xl vs max-w-xl) and its
          own equal 1fr side columns (not justify-between, which balances
          outer edges rather than centering the middle item) — the icon
          and note sit out past the form's edges while the button stays on
          the page's true center line, matching the mockup. */}
      <div className="mx-auto mt-10 max-w-3xl">
        <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-[1fr_auto_1fr]">
          <div className="relative hidden cursor-pointer justify-self-start hover:animate-shake sm:block">
            <SparkBurst variant="fan-sm" />
            <Gift className="-rotate-12 h-10 w-10 text-teal" aria-hidden />
          </div>
          <div className="relative inline-block justify-self-center">
            <SparkBurst />
            <Button type="button" onClick={handleSend} className="px-20 py-4 text-2xl">
              Send gift
            </Button>
          </div>
          <p className="hidden -rotate-3 justify-self-end text-center font-display text-sm leading-snug text-ink/50 sm:block">
            Good
            <br />
            things
            <br />
            compound ♥
          </p>
        </div>
      </div>

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
