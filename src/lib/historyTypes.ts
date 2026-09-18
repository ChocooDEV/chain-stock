/** Row shapes the `/history` table components render — see
 *  src/lib/historyRows.ts for the real `GiftJson` -> row converters. */

export type GiftStatus = "pending" | "claimed" | "canceled";
export type RecipientType = "wallet" | "email" | "fcfs";

export type SentGiftRow = {
  id: string;
  symbol: string;
  amountUsd: number;
  recipient: string;
  recipientType: RecipientType;
  status: GiftStatus;
};

export type ClaimedGiftRow = {
  id: string;
  symbol: string;
  amountUsd: number;
  claimedAgo: string;
};
