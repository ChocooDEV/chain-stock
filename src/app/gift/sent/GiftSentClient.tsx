"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy, Link2, Mail } from "lucide-react";
// lucide-react (the icon set used everywhere else in the app) is a
// generic UI set with no brand/social logos — the real X mark comes from
// react-icons' Simple Icons bundle instead, tree-shaken to just this icon.
import { SiX } from "react-icons/si";
import { Logo } from "@/components/Logo";
import { Loader } from "@/components/Loader";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { SparkBurst } from "@/components/SparkBurst";
import { CurvedText } from "@/components/CurvedText";
import { TickerStrip } from "@/components/TickerStrip";
import { StockLogo } from "@/components/gift/StockLogo";
import { useGiftDraft, type GiftDraft } from "@/hooks/useGiftDraft";
import { useLiveStocks } from "@/hooks/useLiveStocks";
import { useToast } from "@/hooks/useToast";
import { getFeaturedBannerItems } from "@/lib/stocks";
import { copyToClipboard } from "@/lib/clipboard";
import rallyThumbsUp from "../../../../public/mascot/rally-thumbs-up.png";

/**
 * Confirmation screen after "Send gift" (docs/mockup/gift-send.png).
 * Requires `?id=` — GiftForm generates it (see lib/claimSeed.ts) at the
 * moment of sending and puts it in the URL when it navigates here, so
 * this page can't be reached as a bare, context-free route (someone
 * bookmarking or guessing the URL lands back on /gift instead of a
 * placeholder-looking confirmation for a gift that doesn't exist).
 */
export function GiftSentClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const claimSeed = searchParams.get("id");

  const [draft, , resetDraft] = useGiftDraft();
  const { stocks, loading } = useLiveStocks();
  const { toast, showToast, dismiss: dismissToast } = useToast();

  // Snapshots the draft the moment it has real (hydrated) data, then
  // clears it — so this confirmation still has the sent gift's details
  // to display, but the next visit to /gift starts from a blank form
  // instead of the previous gift's stock/amount/recipient still sitting
  // there. Can't just read-then-clear inline: hydration happens async
  // (localStorage read is itself inside an effect), so the first render
  // sees the hook's default draft, not the real one.
  const [sentDraft, setSentDraft] = useState<GiftDraft | null>(null);
  useEffect(() => {
    if (!sentDraft && draft.symbol) {
      setSentDraft(draft);
      resetDraft();
    }
  }, [draft, sentDraft, resetDraft]);
  const display = sentDraft ?? draft;

  useEffect(() => {
    if (!claimSeed) {
      router.replace("/gift");
    }
  }, [claimSeed, router]);

  // The real production domain doesn't exist yet — hardcoding it here
  // would send a copied/shared link to a dead/parked domain during local
  // dev (or any non-production deploy). Using the page's own origin
  // means the link is always actually correct for wherever this is
  // running. Safe to read directly (not behind useEffect/useState): this
  // only ever renders once `claimSeed` and `loading` are both settled,
  // by which point we're well past the initial server-rendered pass.
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const claimUrl = claimSeed ? `${origin}/claim/${claimSeed}` : "";
  const selectedStock = stocks.find((stock) => stock.symbol === display.symbol) ?? null;

  const bannerItems = useMemo(() => getFeaturedBannerItems(stocks), [stocks]);

  const shareText = `I sent you $${display.amountUsd} of ${display.symbol ?? "stock"} on ChainStock! Claim it here: ${claimUrl}`;

  const copyLink = async () => {
    const succeeded = await copyToClipboard(claimUrl);
    if (succeeded) {
      showToast("Link copied to clipboard.", "info");
    } else {
      showToast("Couldn't copy automatically — copy the link manually.");
    }
  };

  if (!claimSeed) {
    // The redirect effect above is already in flight — render nothing
    // rather than a flash of broken-looking content (empty link, etc).
    return null;
  }

  if (loading) {
    return (
      <Container>
        <Loader label="Preparing your gift…" />
      </Container>
    );
  }

  return (
    <div className="pb-20 pt-16 sm:pt-14">
      <Container>
        {/* Wider than the content column below (max-w-4xl vs max-w-xl,
            same "narrow content, wide decorative margins" split used for
            the /gift footer) — the ticker, Rally, and the note sit out at
            this box's corners while the actual headline+card stay in a
            centered, narrower column. */}
        <div className="relative mx-auto max-w-4xl">
          {bannerItems.length > 0 && (
            <div className="absolute -left-2 -top-4 -rotate-3">
              <TickerStrip items={bannerItems} live />
            </div>
          )}

          <div className="absolute -bottom-20 -right-2 sm:-bottom-32 sm:-right-12">
            <Image
              src={rallyThumbsUp}
              alt=""
              aria-hidden
              priority
              className="w-28 drop-shadow-[0_16px_20px_rgba(33,27,29,0.25)] sm:w-56 lg:w-64"
            />
          </div>

          <p className="absolute bottom-2 left-0 hidden -rotate-6 text-center font-display text-sm leading-snug text-ink/50 sm:block">
            Good
            <br />
            things
            <br />
            compound ♥
          </p>

          <div className="mx-auto max-w-xl pt-12 sm:pt-0">
            <div className="text-center">
              <div className="flex justify-center">
                <Logo
                  variant="compact"
                  // "!h-*" overrides the compact variant's own sizes —
                  // Tailwind utilities of equal specificity don't
                  // reliably win by className order, only by generated
                  // stylesheet order, so plain (non-important) utilities
                  // here wouldn't be guaranteed to beat the base variant's.
                  // Restating all three breakpoints (not just the mobile
                  // one that's actually changing) matters: an unprefixed
                  // "!h-11" alone would win at every breakpoint, including
                  // sm/lg where the base variant's own value is already
                  // correct and shouldn't be overridden.
                  className="!h-11 drop-shadow-[0_10px_14px_rgba(33,27,29,0.35)] sm:!h-12 lg:!h-14"
                />
              </div>

              <div className="relative mt-6 inline-block">
                <SparkBurst variant="ring" />
                <h1 className="font-display text-6xl font-bold sm:text-7xl">
                  <CurvedText text="Gift sent!" />
                </h1>
              </div>
            </div>

            <div className="mt-10 rounded-3xl border border-ink/10 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-4">
                {selectedStock && (
                  <StockLogo src={selectedStock.logoUrl} size={48} />
                )}
                <div className="min-w-0">
                  <p className="font-display text-2xl font-bold">
                    ${display.amountUsd} of {display.symbol ?? "…"}
                  </p>
                  <p className="truncate text-ink/60">
                    {display.recipientMode === "specific" && display.recipientValue
                      ? `for ${display.recipientValue}`
                      : "for anyone with the link"}
                  </p>
                </div>
              </div>

              <div className="my-6 border-t border-ink/10" />

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-ink/10 bg-cloud px-4 py-3 text-sm text-ink/70">
                  <Link2 className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">{claimUrl}</span>
                </div>
                <Button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex shrink-0 items-center gap-2 px-6 py-3 text-base"
                >
                  <Copy className="h-4 w-4" aria-hidden />
                  Copy link
                </Button>
              </div>

              <p className="mt-6 text-center text-sm text-ink/60">
                Share it however you&rsquo;d like — text, DM, however
                you&rsquo;d send anything else.
              </p>

              <div className="mt-4 flex justify-center gap-4">
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Share on X"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-white transition hover:brightness-110"
                >
                  <SiX className="h-4 w-4" aria-hidden />
                </a>
                <a
                  href={`mailto:?subject=${encodeURIComponent("A gift for you on ChainStock")}&body=${encodeURIComponent(shareText)}`}
                  aria-label="Share via email"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-gold text-white transition hover:brightness-95"
                >
                  <Mail className="h-5 w-5" aria-hidden />
                </a>
                <button
                  type="button"
                  onClick={copyLink}
                  aria-label="Copy link"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-teal text-white transition hover:brightness-95"
                >
                  <Link2 className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Container>

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
