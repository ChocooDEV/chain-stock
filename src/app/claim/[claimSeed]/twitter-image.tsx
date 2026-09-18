import { renderClaimCard, renderDefaultCard, OG_SIZE } from "@/lib/og/cards";

// Near-duplicate of opengraph-image.tsx, not a re-export from it — see
// that file's comment for why (Next's route-segment-config discovery
// needs each special file to declare it directly).
export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "A ChainStock gift is waiting for you to claim.";

export default async function Image({
  params,
}: {
  params: Promise<{ claimSeed: string }>;
}) {
  const { claimSeed } = await params;
  return (await renderClaimCard(claimSeed)) ?? renderDefaultCard();
}
