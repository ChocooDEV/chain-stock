import type { Metadata } from "next";
import { HistoryPageClient } from "./HistoryPageClient";

// Kept to just "ChainStock" — same reason as every other page a Privy login
// could be triggered from (see /claim's page.tsx): visiting /history
// directly while signed out triggers the same login() modal.
export const metadata: Metadata = {
  title: "ChainStock",
  description: "Everything you've sent and claimed on ChainStock.",
};

export default function HistoryPage() {
  return <HistoryPageClient />;
}
