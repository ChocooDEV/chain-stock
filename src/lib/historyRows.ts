import type { GiftJson } from "@/lib/api/gifts";
import type { ClaimedGiftRow, SentGiftRow } from "@/lib/historyTypes";

const USDC_DECIMALS = 6;

function usdcToDollars(amountUsdc: string): number {
  return Number(amountUsdc) / 10 ** USDC_DECIMALS;
}

/** "5xY9pQ2zAbC..." -> "5xY9...pQ2z" — same shape the mock data used, for
 *  a wallet address too long to show in full in a table cell. */
function shortenAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function recipientDisplay(gift: GiftJson): string {
  if (gift.recipientMode === "fcfs") return "Anyone — first to claim";
  if (gift.recipientMode === "dedicated_email") return gift.recipientEmail ?? "";
  return gift.recipientWallet ? shortenAddress(gift.recipientWallet) : "";
}

function recipientType(mode: GiftJson["recipientMode"]): SentGiftRow["recipientType"] {
  if (mode === "dedicated_wallet") return "wallet";
  if (mode === "dedicated_email") return "email";
  return "fcfs";
}

export function toSentGiftRow(gift: GiftJson): SentGiftRow {
  return {
    id: gift.claimSeed,
    symbol: gift.stockSymbol,
    amountUsd: usdcToDollars(gift.amountUsdc),
    recipient: recipientDisplay(gift),
    recipientType: recipientType(gift.recipientMode),
    status: gift.status,
  };
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/** Coarse relative time ("2 days ago", "3 weeks ago") — matches the
 *  granularity the mock data used, not a general-purpose formatter. */
function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < HOUR) return "just now";
  if (ms < DAY) {
    const hours = Math.floor(ms / HOUR);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (ms < WEEK) {
    const days = Math.floor(ms / DAY);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }
  const weeks = Math.floor(ms / WEEK);
  return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
}

export function toClaimedGiftRow(gift: GiftJson): ClaimedGiftRow {
  return {
    id: gift.claimSeed,
    symbol: gift.stockSymbol,
    amountUsd: usdcToDollars(gift.amountUsdc),
    claimedAgo: gift.claimedAt ? timeAgo(gift.claimedAt) : "—",
  };
}
