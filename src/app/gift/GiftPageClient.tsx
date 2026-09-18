"use client";

import { useMemo } from "react";
import { Logo } from "@/components/Logo";
import { Loader } from "@/components/Loader";
import { Container } from "@/components/ui/Container";
import { TickerStrip } from "@/components/TickerStrip";
import { GiftForm } from "@/components/gift/GiftForm";
import { useLiveStocks } from "@/hooks/useLiveStocks";
import { getFeaturedBannerItems } from "@/lib/stocks";

/**
 * Owns the one live-price poll (useLiveStocks) shared between the large
 * ticker banner up top and the stock picker/amount estimate further down
 * in GiftForm, so the page makes one /api/stocks poll, not two.
 */
export function GiftPageClient() {
  const { stocks, loading } = useLiveStocks();

  // The banner is a curated highlight strip (FEATURED_SYMBOLS — shared
  // with the landing page's decorative ticker so both pages show the same
  // tickers), not the full catalog: the real catalog is 40+ tickers (see
  // StockPicker, which does show all of them, searchable), and rotating a
  // strip that wide would push its corners above the viewport (the tilt's
  // vertical excursion grows with width) besides overflowing a phone-width
  // screen at "lg" size.
  const bannerItems = useMemo(() => getFeaturedBannerItems(stocks), [stocks]);

  // Gate the whole page behind one loading state instead of revealing
  // pieces as they individually become ready — the banner used to pop in
  // after the rest of the page had already rendered, which read as a
  // layout jump rather than a page loading.
  if (loading) {
    return (
      <Container>
        <Loader label="Fetching live prices…" />
      </Container>
    );
  }

  return (
    <div className="pb-20 pt-10 sm:pt-14">
      <Container>
        {bannerItems.length > 0 && (
          <div className="mb-10 flex justify-center">
            <TickerStrip items={bannerItems} live size="lg" />
          </div>
        )}

        <div className="mx-auto max-w-xl text-center">
          <div className="relative flex justify-center">
            {/* Contact shadow — grounds the logo instead of letting it
                float, same treatment as Rally's hero image on the landing
                page. Separate from the drop-shadow filter on the image
                itself (which follows its alpha silhouette all around);
                this is the shadow cast underneath. */}
            <div
              aria-hidden
              className="absolute bottom-1 h-5 w-32 rounded-full bg-ink/30 blur-lg sm:w-40"
            />
            <Logo variant="header" />
          </div>
          <h1 className="mt-6 font-display text-6xl font-bold sm:text-7xl">
            Send a gift
          </h1>
          <p className="mt-4 text-lg text-ink/70">
            Real stock. Real people.
          </p>
        </div>

        <div className="mt-12">
          <GiftForm stocks={stocks} loading={loading} />
        </div>
      </Container>
    </div>
  );
}
