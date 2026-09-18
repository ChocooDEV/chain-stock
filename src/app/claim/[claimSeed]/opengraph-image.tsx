import { renderClaimCard, renderDefaultCard, OG_SIZE } from "@/lib/og/cards";

// Node runtime, not the edge default — image generation reads font/mascot
// files off disk and the gift row from the database, neither of which
// the edge runtime can do here.
export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";
// Static, not per-gift — Next's file-convention `alt` export can't read
// `params` (it's evaluated without them), unlike the default function.
export const alt = "A ChainStock gift is waiting for you to claim.";

export default async function Image({
  params,
}: {
  params: Promise<{ claimSeed: string }>;
}) {
  const { claimSeed } = await params;
  // Falls back to the generic card for a stale/unknown claim_seed rather
  // than erroring — a social-media crawler fetching this route should
  // always get *an* image, the same way the page itself always renders
  // something (its own real 404 page) instead of a broken preview.
  return (await renderClaimCard(claimSeed)) ?? renderDefaultCard();
}
