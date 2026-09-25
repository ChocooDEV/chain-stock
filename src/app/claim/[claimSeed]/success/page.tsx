import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getGiftByClaimSeed } from "@/lib/db/queries";
import { toClaimGift } from "@/lib/gift";
import { SuccessPageClient } from "./SuccessPageClient";

// Kept to just "ChainStock" — same reason as the rest of the claim flow:
// this page can be reached via back/forward navigation from a page a
// wallet/Privy modal could still be open on.
export const metadata: Metadata = {
  title: "ChainStock",
  description: "You've got stock - see what you just claimed.",
};

export default async function ClaimSuccessPage({
  params,
}: {
  params: Promise<{ claimSeed: string }>;
}) {
  const { claimSeed } = await params;
  const row = await getGiftByClaimSeed(claimSeed);

  if (!row) {
    notFound();
  }

  return <SuccessPageClient gift={toClaimGift(row)} />;
}
