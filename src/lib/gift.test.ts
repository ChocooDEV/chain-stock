import { describe, expect, it } from "vitest";
import { toClaimGift } from "@/lib/gift";
import type { GiftRow } from "@/lib/db/schema";

function makeRow(overrides: Partial<GiftRow>): GiftRow {
  return {
    claimSeed: "seed-1",
    giftPda: "11111111111111111111111111111111",
    senderWallet: "11111111111111111111111111111111",
    stockMint: "11111111111111111111111111111111",
    stockSymbol: "AAPL",
    amountUsdc: 25000000n,
    feeUsdc: 630000n,
    recipientMode: "fcfs",
    recipientWallet: null,
    recipientEmail: null,
    status: "pending",
    message: null,
    theme: null,
    createdAt: new Date(),
    claimedAt: null,
    canceledAt: null,
    createTxSignature: "fake-sig",
    claimTxSignature: null,
    cancelTxSignature: null,
    ...overrides,
  };
}

describe("toClaimGift", () => {
  it("converts USDC base units (6 decimals) to a dollar amount", () => {
    const gift = toClaimGift(makeRow({ amountUsdc: 25000000n }));
    expect(gift.amountUsd).toBe(25);
  });

  it("handles a non-round dollar amount", () => {
    const gift = toClaimGift(makeRow({ amountUsdc: 12345678n }));
    expect(gift.amountUsd).toBeCloseTo(12.345678, 6);
  });

  it("maps recipientMode 'fcfs' straight through", () => {
    expect(toClaimGift(makeRow({ recipientMode: "fcfs" })).recipientMode).toBe("fcfs");
  });

  it("maps both dedicated modes to 'specific'", () => {
    expect(
      toClaimGift(makeRow({ recipientMode: "dedicated_wallet" })).recipientMode,
    ).toBe("specific");
    expect(
      toClaimGift(makeRow({ recipientMode: "dedicated_email" })).recipientMode,
    ).toBe("specific");
  });

  it("carries claimSeed and stockSymbol through unchanged", () => {
    const gift = toClaimGift(makeRow({ claimSeed: "abc-123", stockSymbol: "TSLA" }));
    expect(gift.claimSeed).toBe("abc-123");
    expect(gift.symbol).toBe("TSLA");
  });
});
