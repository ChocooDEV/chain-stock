import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getGiftByClaimSeed } from "@/lib/db/queries";
import { toClaimGift } from "@/lib/gift";
import { ClaimPageClient } from "./ClaimPageClient";

/**
 * `document.title` is kept to just "ChainStock" — same reason as /gift and
 * /gift/sent: Privy's login modal (and any wallet it opens) shows the tab
 * title verbatim as the site name, and this page is exactly where that
 * flow is triggered. The OG/Twitter description, unlike the title, isn't
 * shown inside Privy's UI, so it's free to say the real thing: what's
 * actually in the gift, so a pasted claim link previews as "$25 of AAPL"
 * rather than generic site copy. `openGraph-image.tsx`/`twitter-image.tsx`
 * in this same route segment generate the matching card image.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ claimSeed: string }>;
}): Promise<Metadata> {
  const { claimSeed } = await params;
  const row = await getGiftByClaimSeed(claimSeed);
  if (!row) {
    return { title: "ChainStock" };
  }

  const gift = toClaimGift(row);
  const description = `Someone sent you $${gift.amountUsd} of ${gift.symbol} on ChainStock — real stock, no wallet required to claim.`;

  // `openGraph`/`twitter` here don't deep-merge with the root layout's
  // (Next.js metadata resolution replaces the whole object per segment
  // that defines one, not just the fields it sets) — so every field this
  // page cares about, not just `description`, has to be repeated here or
  // it silently reverts to Next's own default (e.g. `twitter.card`
  // falling back to "summary" instead of the root's
  // "summary_large_image", which is what actually happened before this
  // comment was written).
  return {
    title: "ChainStock",
    description,
    openGraph: {
      title: "ChainStock",
      description,
      siteName: "ChainStock",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "ChainStock",
      description,
    },
  };
}

export default async function ClaimPage({
  params,
}: {
  params: Promise<{ claimSeed: string }>;
}) {
  const { claimSeed } = await params;
  // Calls the same query `/api/gifts/[claimSeed]` uses, directly — no
  // reason for this server component to round-trip through its own API
  // route over HTTP. `cache()`-wrapped (see queries.ts), so this is the
  // same DB round-trip `generateMetadata` above already made, not a
  // second one.
  const row = await getGiftByClaimSeed(claimSeed);

  // Renders the app's real 404 page (src/app/not-found.tsx) — a stale or
  // mistyped claim link genuinely isn't a page that exists.
  if (!row) {
    notFound();
  }

  return (
    <ClaimPageClient
      gift={toClaimGift(row)}
      // Site keys aren't secret (they're embedded in every page that
      // renders the widget, same as any third-party analytics key) —
      // passed as a prop here rather than a NEXT_PUBLIC_-prefixed env
      // var purely to match this repo's existing pattern for Privy's app
      // ID (see src/app/layout.tsx), not because it needs protecting.
      turnstileSiteKey={process.env.CLOUDFLARE_SITE_KEY}
    />
  );
}
