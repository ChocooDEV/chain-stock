"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useWallets as useSolanaWallets } from "@privy-io/react-auth/solana";
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
import type { SentGiftRow } from "@/lib/historyTypes";

/**
 * /history (docs/App.md's "Gift history" section, docs/mockup/
 * sender-history.png) — one long page, two stacked sections: gifts sent
 * and gifts claimed, both keyed off the same connected wallet. Reads the
 * real backend now (`GET /api/gifts?sender=`/`?recipient=`, see
 * Architecture.md) — but since `create_gift` isn't wired to a deployed
 * program yet (see TODO.md), no real gifts exist to index, so this will
 * genuinely show empty tables until either that's wired or you seed some
 * test rows directly (see scripts/seed-demo-gifts.mjs).
 *
 * Gated on Privy the same way the claim page is: reachable directly (not
 * just via the landing nav's profile icon), so it needs its own
 * connect-first state rather than assuming the visitor already
 * authenticated on a previous page.
 */
export function HistoryPageClient() {
  const { ready, authenticated, login } = usePrivy();
  const { wallets } = useSolanaWallets();
  const walletAddress = wallets[0]?.address ?? null;

  const { stocks, loading: stocksLoading } = useLiveStocks();
  const { sent, claimed, loading: historyLoading } = useGiftHistory(
    authenticated ? walletAddress : null,
  );
  const { toast, showToast, dismiss: dismissToast } = useToast();

  const handleCancel = (row: SentGiftRow) => {
    showToast(
      `Canceling the $${row.amountUsd} gift isn't wired up yet — coming next.`,
      "info",
    );
  };

  if (!ready || stocksLoading) {
    return (
      <Container>
        <Loader label="Loading your history…" />
      </Container>
    );
  }

  if (!authenticated) {
    return (
      <Container>
        <div className="mx-auto max-w-md py-24 text-center">
          <h1 className="font-display text-3xl font-bold">
            Connect to see your gifts
          </h1>
          <p className="mt-3 text-ink/60">
            Your sent and claimed gifts live behind your wallet — connect to
            view them.
          </p>
          <Button onClick={() => login()} className="mt-8">
            Connect
          </Button>
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
