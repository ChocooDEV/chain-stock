"use client";

import { useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets as useSolanaWallets } from "@privy-io/react-auth/solana";
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Transaction } from "@solana/web3.js";
import { Logo } from "@/components/Logo";
import { Loader } from "@/components/Loader";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { SparkBurst } from "@/components/SparkBurst";
import { SentGiftsTable } from "@/components/history/SentGiftsTable";
import { ClaimedGiftsTable } from "@/components/history/ClaimedGiftsTable";
import { useLiveStocks } from "@/hooks/useLiveStocks";
import { useGiftHistory } from "@/hooks/useGiftHistory";
import { useToast } from "@/hooks/useToast";
import { toClaimedGiftRow, toSentGiftRow } from "@/lib/historyRows";
import { decodeClaimSeed } from "@/lib/solana/claimSeed";
import { getConfigPda, getGiftPda, getProgram } from "@/lib/solana/program";
import type { SentGiftRow } from "@/lib/historyTypes";

/**
 * /history (docs/App.md's "Gift history" section, docs/mockup/
 * sender-history.png) — one long page, two stacked sections: gifts sent
 * and gifts claimed.
 *
 * Reads history for *both* wallet identities this app has, not just one:
 * the wallet-adapter wallet (currently the only one that can send, since
 * `create_gift` requires it — see GiftForm.tsx) and the Privy wallet
 * (currently the only one that can claim). A visitor might have either
 * connected, both, or reconnect under a different one later — there's no
 * guarantee "the wallet that sent" and "the wallet that's currently
 * connected" are the same identity, so this merges results from
 * whichever are actually connected right now rather than picking one and
 * silently missing the other (see `useGiftHistory`'s doc comment).
 */
export function HistoryPageClient() {
  const { ready, authenticated, login } = usePrivy();
  const { wallets: privyWallets } = useSolanaWallets();
  const privyAddress = privyWallets[0]?.address ?? null;

  const { connected: walletAdapterConnected, publicKey, sendTransaction } = useWallet();
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();
  const { setVisible: setWalletModalVisible } = useWalletModal();
  const walletAdapterAddress = publicKey?.toBase58() ?? null;

  const addresses = useMemo(
    () =>
      Array.from(
        new Set(
          [
            authenticated ? privyAddress : null,
            walletAdapterConnected ? walletAdapterAddress : null,
          ].filter((address): address is string => address !== null),
        ),
      ),
    [authenticated, privyAddress, walletAdapterConnected, walletAdapterAddress],
  );
  const hasAnyIdentity = addresses.length > 0;

  const { stocks, loading: stocksLoading } = useLiveStocks();
  const { sent, claimed, loading: historyLoading } = useGiftHistory(addresses);
  const { toast, showToast, dismiss: dismissToast } = useToast();
  const [canceling, setCanceling] = useState<string | null>(null);

  const handleCancel = async (row: SentGiftRow) => {
    if (!walletAdapterConnected || !publicKey || !anchorWallet) {
      showToast("Connect the wallet you sent this gift from to cancel it.");
      return;
    }
    if (canceling) return;

    const confirmed = window.confirm(
      `Cancel the $${row.amountUsd} ${row.symbol} gift? This refunds it to your wallet immediately and can't be undone.`,
    );
    if (!confirmed) return;

    setCanceling(row.id);
    try {
      const claimSeedBytes = decodeClaimSeed(row.id);
      const giftPda = getGiftPda(claimSeedBytes);
      const program = getProgram(connection, anchorWallet);
      // `usdc_mint` isn't stored per-gift (see `state.rs`'s `Gift` struct
      // — only `Config.usdc_mint`, global), so this needs the same
      // config fetch GiftForm.tsx's create_gift call makes.
      const config = await program.account.config.fetch(getConfigPda());

      // Unlike `create_gift`/`claim_gift`, `cancel_gift` takes no
      // instruction args — its `gift` PDA seed reads `gift.claim_seed`
      // from the account's *own* stored data (see the IDL's
      // self-referential seed for it), which Anchor's client can't
      // auto-resolve (it would need the address to read the field it
      // needs to derive the address) — its generated type won't even let
      // `.accounts()` accept `gift` explicitly, since the resolver
      // optimistically claims it either way. `accountsPartial` is the
      // documented escape hatch for exactly this: it skips the strict
      // "did you specify a resolvable account" check, letting `gift`
      // override what the (here, unsatisfiable) auto-resolution would
      // have attempted. `sender`/`vault`/`senderUsdc` still auto-resolve
      // (the first two via `gift`'s own `has_one`/authority data once
      // it's this explicitly provided).
      const instruction = await program.methods
        .cancelGift()
        .accountsPartial({
          gift: giftPda,
          usdcMint: config.usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .instruction();

      const transaction = new Transaction().add(instruction);
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");

      const res = await fetch(`/api/gifts/${row.id}/confirm-cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelTxSignature: signature }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to confirm the cancellation");
      }

      showToast(`Canceled — the $${row.amountUsd} gift was refunded to your wallet.`, "info");
      // Re-fetch by forcing the addresses effect to rerun would need a
      // key bump; simplest correct fix is a full reload of this page's
      // data, which a location reload trivially achieves without adding
      // a manual refetch path to useGiftHistory just for this one case.
      window.location.reload();
    } catch (error) {
      showToast(
        error instanceof Error
          ? `Couldn't cancel: ${error.message}`
          : "Couldn't cancel the gift — try again.",
      );
    } finally {
      setCanceling(null);
    }
  };

  if (!ready || stocksLoading) {
    return (
      <Container>
        <Loader label="Loading your history…" />
      </Container>
    );
  }

  if (!hasAnyIdentity) {
    return (
      <Container>
        <div className="mx-auto max-w-md py-24 text-center">
          <h1 className="font-display text-3xl font-bold">
            Connect to see your gifts
          </h1>
          <p className="mt-3 text-ink/60">
            Your sent and claimed gifts live behind your wallet — connect
            the one you sent from, the one you claimed with, or both.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button onClick={() => setWalletModalVisible(true)}>
              Connect wallet
            </Button>
            <Button onClick={() => login()} className="bg-ink/10 text-ink hover:bg-ink/20">
              Sign in with Privy
            </Button>
          </div>
        </div>
      </Container>
    );
  }

  if (historyLoading) {
    return (
      <Container>
        <Loader label="Loading your history…" />
      </Container>
    );
  }

  const sentGifts = sent.map(toSentGiftRow);
  const claimedGifts = claimed.map(toClaimedGiftRow);

  return (
    <div className="pb-20 pt-8">
      <Container>
        <div className="flex items-center justify-between gap-4">
          <Logo />
          <Button href="/gift" className="px-5 py-2.5 text-sm">
            Send a new gift
          </Button>
        </div>

        <div className="mx-auto mt-12 max-w-xl text-center">
          <div className="relative inline-block">
            <SparkBurst variant="ring" />
            <h1 className="font-display text-5xl font-bold sm:text-6xl">
              Gifts you&rsquo;ve sent
            </h1>
          </div>
          <p className="mt-4 text-lg text-ink/70">
            Real stock. Real people. A little more generous.
          </p>
        </div>

        <div className="mt-10">
          {sentGifts.length > 0 ? (
            <SentGiftsTable rows={sentGifts} stocks={stocks} onCancel={handleCancel} />
          ) : (
            <p className="text-center text-ink/50">
              No gifts sent yet from this wallet.
            </p>
          )}
        </div>

        <div className="mx-auto mt-20 max-w-xl text-center">
          <h2 className="font-display text-4xl font-bold sm:text-5xl">
            Gifts you&rsquo;ve claimed
          </h2>
        </div>

        <div className="mt-10">
          {claimedGifts.length > 0 ? (
            <ClaimedGiftsTable rows={claimedGifts} stocks={stocks} />
          ) : (
            <p className="text-center text-ink/50">
              No gifts claimed yet with this wallet.
            </p>
          )}
        </div>
      </Container>

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
