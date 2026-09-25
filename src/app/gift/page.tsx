import type { Metadata } from "next";
import { GiftPageClient } from "./GiftPageClient";

// Kept to just "ChainStock" (not a page-specific title like "Send a gift —
// ChainStock") because Solana wallets (Phantom et al.) show `document.title`
// verbatim as the connecting site's name in their connect prompt — a
// longer title gets truncated there ("Send a gift — StockP...").
export const metadata: Metadata = {
  title: "ChainStock",
  description: "Pick a stock, pick an amount, send a link - onboard your friends.",
};

export default function GiftPage() {
  return <GiftPageClient />;
}
