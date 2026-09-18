"use client";

import Image from "next/image";
import { Logo } from "@/components/Logo";
import { Loader } from "@/components/Loader";
import { Container } from "@/components/ui/Container";
import { SparkBurst } from "@/components/SparkBurst";
import { StockLogo } from "@/components/gift/StockLogo";
import { useLiveStocks } from "@/hooks/useLiveStocks";
import type { ClaimGift } from "@/lib/gift";
import { formatShares } from "@/lib/shares";
import rallyCelebrating from "../../../../../public/mascot/rally-celebrating.png";

/**
 * Post-claim screen (docs/mockup/post-claim.png) — what the recipient
 * lands on right after claiming. Reachable at /claim/[claimSeed]/success
 * (not the mockup's flat /portfolio) because Phase 1 only ever has one
 * holding to show — the gift this claimSeed points to — not a real
 * multi-holding portfolio, which would need backend indexing across
 * every gift a wallet has claimed. That's a real future page, not this
 * one wearing the wrong name.
 *
 * "Redeem to real shares" (docs/mockup/post-claim.png) is hidden for
 * now — it's explicitly Phase 2 in App.md (calls Backpack's actual
 * redeem API once that access is approved), so there's nothing for it
 * to do yet.
 */
export function SuccessPageClient({ gift }: { gift: ClaimGift }) {
  const { stocks, loading } = useLiveStocks();

  const stock = stocks.find((s) => s.symbol === gift.symbol) ?? null;
  const shares = stock && stock.price > 0 ? gift.amountUsd / stock.price : null;

  if (loading) {
    return (
      <Container>
        <Loader label="Loading your holding…" />
      </Container>
    );
  }

  return (
    <div className="pb-20 pt-16 sm:pt-20">
      <Container>
        <div className="mx-auto max-w-xl text-center">
          <div className="relative flex justify-center">
            {/* Same contact-shadow treatment as the logo on /gift. */}
            <div
              aria-hidden
              className="absolute bottom-1 h-5 w-32 rounded-full bg-ink/30 blur-lg sm:w-40"
            />
            <Logo variant="header" />
          </div>

          <h1 className="mt-6 font-display text-5xl font-bold sm:text-6xl">
            You&rsquo;ve got stock!
          </h1>
          <p className="mt-3 text-lg text-ink/60">
            Congrats — you just claimed a gift.
          </p>

          <div className="mt-10 rounded-3xl border border-ink/10 bg-white p-6 text-left shadow-sm sm:p-8">
            <div className="flex items-center gap-4">
              {stock && <StockLogo src={stock.logoUrl} size={48} />}
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink/40">
                  Your holding
                </p>
                {shares !== null ? (
                  <p className="font-display text-2xl font-bold">
                    {formatShares(shares)} shares of {gift.symbol}
                  </p>
                ) : (
                  <p className="font-display text-2xl font-bold">
                    {gift.symbol}
                  </p>
                )}
                <p className="text-ink/60">≈ ${gift.amountUsd.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="mt-10 flex justify-center">
            <div className="relative inline-block">
              <SparkBurst variant="ring" />
              <Image
                src={rallyCelebrating}
                alt=""
                aria-hidden
                priority
                className="w-40 drop-shadow-[0_16px_20px_rgba(33,27,29,0.25)] sm:w-48"
              />
              <p className="absolute -right-4 -top-2 -rotate-6 font-display text-sm text-ink/50 sm:-right-8">
                Nice one! ♥
              </p>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
