import { NextResponse } from "next/server";
import { isValidSolanaAddress } from "@/lib/solana/address";
import { EMAIL_RE, normalizeEmail } from "@/lib/email";
import type { GiftRow } from "@/lib/db/schema";

export function apiError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/** Public JSON shape for a gift row — bigints serialize as strings (JSON
 *  has no bigint type), everything else matches the DB schema field
 *  names 1:1 in camelCase. */
export type GiftJson = {
  claimSeed: string;
  giftPda: string;
  senderWallet: string;
  stockMint: string;
  stockSymbol: string;
  amountUsdc: string;
  feeUsdc: string;
  recipientMode: "dedicated_wallet" | "dedicated_email" | "fcfs";
  recipientWallet: string | null;
  recipientEmail: string | null;
  status: "pending" | "claimed" | "canceled";
  message: string | null;
  theme: string | null;
  createdAt: string;
  claimedAt: string | null;
  canceledAt: string | null;
  createTxSignature: string;
  claimTxSignature: string | null;
  cancelTxSignature: string | null;
};

export function toGiftJson(row: GiftRow): GiftJson {
  return {
    ...row,
    amountUsdc: row.amountUsdc.toString(),
    feeUsdc: row.feeUsdc.toString(),
    createdAt: row.createdAt.toISOString(),
    claimedAt: row.claimedAt?.toISOString() ?? null,
    canceledAt: row.canceledAt?.toISOString() ?? null,
  };
}

/** Parses a decimal string into a positive bigint — used for
 *  amountUsdc/feeUsdc, which travel as JSON strings since JSON has no
 *  bigint type. Rejects anything that isn't plain digits (no "0x..",
 *  no "1e10", no leading "+"/"-") so a malformed value fails loudly
 *  instead of silently coercing to 0n. */
export function parsePositiveBigInt(value: unknown): bigint | null {
  if (typeof value !== "string" || !/^[0-9]+$/.test(value)) return null;
  const parsed = BigInt(value);
  return parsed > 0n ? parsed : null;
}

export type RecipientMode = "dedicated_wallet" | "dedicated_email" | "fcfs";

/** Mirrors the on-chain program's own validation (create_gift's
 *  InvalidDedicatedRecipient / UnexpectedFcfsRecipient checks, see
 *  anchor/programs/chainstock/src/instructions/create_gift.rs) — the two
 *  should never be allowed to drift apart. */
export function validateRecipientShape(
  recipientMode: unknown,
  recipientWallet: unknown,
  recipientEmail: unknown,
): { mode: RecipientMode; wallet: string | null; email: string | null } | null {
  if (
    recipientMode !== "dedicated_wallet" &&
    recipientMode !== "dedicated_email" &&
    recipientMode !== "fcfs"
  ) {
    return null;
  }

  const wallet = typeof recipientWallet === "string" ? recipientWallet : null;
  const email = typeof recipientEmail === "string" ? recipientEmail : null;

  if (recipientMode === "dedicated_wallet") {
    if (!wallet || email || !isValidSolanaAddress(wallet)) return null;
    return { mode: recipientMode, wallet, email: null };
  }
  if (recipientMode === "dedicated_email") {
    if (!email || wallet) return null;
    // Normalized before validating, not just before storing — so a
    // pasted email with incidental leading/trailing whitespace doesn't
    // get rejected as "invalid" for a reason the user can't see. The
    // stored form must be normalized too: this is the only write path
    // for `recipientEmail`, and `prepare-claim` (not built yet) will
    // need to compare a Privy-verified email against the same
    // normalization (see `normalizeEmail`'s doc comment).
    const normalized = normalizeEmail(email);
    if (!EMAIL_RE.test(normalized)) return null;
    return { mode: recipientMode, wallet: null, email: normalized };
  }
  // fcfs
  if (wallet || email) return null;
  return { mode: recipientMode, wallet: null, email: null };
}
