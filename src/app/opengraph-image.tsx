import { renderDefaultCard, OG_SIZE } from "@/lib/og/cards";

// Node runtime, not the edge default — image generation reads font/mascot
// files off disk (`node:fs/promises`), which the edge runtime can't do.
export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "ChainStock — send real stock, as easily as a link.";

export default async function Image() {
  return renderDefaultCard();
}
