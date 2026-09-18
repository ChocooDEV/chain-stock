import type { GiftRow } from "@/lib/db/schema";

/** USDC's base unit is 6 decimals — same conversion the Anchor program
 *  itself uses (see anchor/programs/chainstock/src/instructions/create_gift.rs). */
const USDC_DECIMALS = 6;

/**
 * The shape the claim-flow client components (`ClaimPageClient`,
 * `SuccessPageClient`) actually render — a small, display-oriented view
 * of a `GiftRow`, not the full DB row. Kept as its own type (rather than
 * having those components take `GiftRow` directly) so they don't need to
 * know about USDC base-unit conversion or the on-chain `recipient_mode`
 * enum's exact spelling.
 */
export type ClaimGift = {
  claimSeed: string;
  symbol: string;
  amountUsd: number;
  recipientMode: "specific" | "fcfs";
};

export function toClaimGift(row: GiftRow): ClaimGift {
  return {
    claimSeed: row.claimSeed,
    symbol: row.stockSymbol,
    amountUsd: Number(row.amountUsdc) / 10 ** USDC_DECIMALS,
    recipientMode: row.recipientMode === "fcfs" ? "fcfs" : "specific",
  };
}
