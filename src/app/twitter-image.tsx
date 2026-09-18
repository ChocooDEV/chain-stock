import { renderDefaultCard, OG_SIZE } from "@/lib/og/cards";

// Near-duplicate of opengraph-image.tsx, not a re-export from it — Next's
// file-convention discovery for `runtime`/`size`/`contentType` expects
// each special file to declare its own route segment config directly,
// not import it from another module. The actual rendering logic (the
// only part worth sharing) lives in `renderDefaultCard`.
export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "ChainStock — send real stock, as easily as a link.";

export default async function Image() {
  return renderDefaultCard();
}
