"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PublicKey, Transaction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { SparkBurst } from "@/components/SparkBurst";
import { useGiftDraft, type RecipientMode } from "@/hooks/useGiftDraft";
import { useToast } from "@/hooks/useToast";
import { generateClaimSeed, encodeClaimSeed } from "@/lib/solana/claimSeed";
import { BN, getConfigPda, getGiftPda, getProgram } from "@/lib/solana/program";
import { isValidSolanaAddress } from "@/lib/solana/address";
import { isValidEmail, hashEmail } from "@/lib/email";
import { useLegalGate } from "@/components/legal/LegalGateProvider";
import { StepHeading } from "@/components/gift/StepHeading";
import { StockPicker } from "@/components/gift/StockPicker";
import { AmountInput } from "@/components/gift/AmountInput";
import { RecipientModeCard } from "@/components/gift/RecipientModeCard";
import type { LiveStock } from "@/lib/stocks";

const USDC_DECIMALS = 6;

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
 * The create-gift form (docs/mockup/create-gift.png). "Send gift" gates
 * on wallet connection (per the sender-signs-everything model in
 * docs/Architecture.md), then builds and submits the real `create_gift`
 * instruction via the connected wallet-adapter wallet (see
 * lib/solana/program.ts), waits for confirmation, indexes it via
 * `POST /api/gifts`, and only then navigates to the confirmation screen.
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
  const [draft, setDraft, resetDraft] = useGiftDraft();
  const { connected, publicKey, sendTransaction } = useWallet();
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();
  const { setVisible: setWalletModalVisible } = useWalletModal();
  const { toast, showToast, dismiss: dismissToast } = useToast();
  const { requireAcceptance } = useLegalGate();
  const [sending, setSending] = useState(false);

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

  const handleSend = async () => {
    const recipientError = getRecipientError(
      draft.recipientMode,
      draft.recipientValue,
    );
    if (recipientError) {
      showToast(recipientError);
      return;
    }
    const acceptedTerms = await requireAcceptance();
    if (!acceptedTerms) return;
    if (!connected || !publicKey || !anchorWallet) {
      setWalletModalVisible(true);
      return;
    }
    if (!selectedStock) {
      showToast("Pick a stock first.");
      return;
    }
    if (sending) return;

    setSending(true);
    try {
      const program = getProgram(connection, anchorWallet);
      const configPda = getConfigPda();
      const config = await program.account.config.fetch(configPda);

      const claimSeedBytes = generateClaimSeed();
      const claimSeed = encodeClaimSeed(claimSeedBytes);
      const giftPda = getGiftPda(claimSeedBytes);
      const usdcMint = config.usdcMint;
      const stockMint = new PublicKey(selectedStock.mint);

      const amountUsdc = new BN(Math.round(draft.amountUsd * 10 ** USDC_DECIMALS));
      const feeFromBps = amountUsdc.mul(new BN(config.feeBps)).divn(10_000);
      const feeMinUsdc = new BN(config.feeMinUsdc.toString());
      const feeUsdc = feeFromBps.gt(feeMinUsdc) ? feeFromBps : feeMinUsdc;

      let recipientMode: { dedicated: Record<string, never> } | { fcfs: Record<string, never> };
      let recipientWallet: PublicKey | null = null;
      let recipientEmailHashBytes: number[] | null = null;
      let recipientEmail: string | null = null;
      let apiRecipientMode: "dedicated_wallet" | "dedicated_email" | "fcfs";

      if (draft.recipientMode === "fcfs") {
        recipientMode = { fcfs: {} };
        apiRecipientMode = "fcfs";
      } else {
        recipientMode = { dedicated: {} };
        const value = draft.recipientValue.trim();
        if (value.includes("@")) {
          recipientEmail = value;
          recipientEmailHashBytes = Array.from(await hashEmail(value));
          apiRecipientMode = "dedicated_email";
        } else {
          recipientWallet = new PublicKey(value);
          apiRecipientMode = "dedicated_wallet";
        }
      }

      // `config`/`gift`/`senderUsdc`/`vault`/`treasuryUsdc`/
      // `associatedTokenProgram`/`systemProgram` are all deliberately
      // omitted, not forgotten — Anchor's TS client auto-resolves every
      // account whose address is fully derivable from the IDL's PDA/ATA
      // seed metadata (including `treasuryUsdc`, which needs an internal
      // fetch of `config.treasury` to derive) plus its own well-known
      // program-ID defaults. Passing them anyway is a type error (the
      // generated type narrows those fields to `never`) — `tokenProgram`
      // is the one exception, since the program accepts either the
      // classic Token or Token-2022 program and can't default to one.
      const instruction = await program.methods
        .createGift(
          Array.from(claimSeedBytes),
          amountUsdc,
          stockMint,
          recipientMode,
          recipientWallet,
          recipientEmailHashBytes,
        )
        .accounts({
          sender: publicKey,
          usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .instruction();

      const transaction = new Transaction().add(instruction);
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");

      const indexRes = await fetch("/api/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimSeed,
          giftPda: giftPda.toBase58(),
          senderWallet: publicKey.toBase58(),
          stockMint: selectedStock.mint,
          stockSymbol: selectedStock.symbol,
          amountUsdc: amountUsdc.toString(),
          feeUsdc: feeUsdc.toString(),
          recipientMode: apiRecipientMode,
          recipientWallet: recipientWallet?.toBase58(),
          recipientEmail,
          createTxSignature: signature,
        }),
      });
      if (!indexRes.ok) {
        const body = await indexRes.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to index the gift");
      }

      resetDraft();
      router.push(`/gift/sent?id=${claimSeed}`);
    } catch (error) {
      showToast(
        error instanceof Error
          ? `Couldn't send the gift: ${error.message}`
          : "Couldn't send the gift - try again.",
      );
    } finally {
      setSending(false);
    }
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
            <Button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className="px-20 py-4 text-2xl"
            >
              {sending ? "Sending…" : "Send gift"}
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
