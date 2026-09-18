import { describe, expect, it } from "vitest";
import { toClaimedGiftRow, toSentGiftRow } from "@/lib/historyRows";
import type { GiftJson } from "@/lib/api/gifts";

function makeGiftJson(overrides: Partial<GiftJson>): GiftJson {
  return {
    claimSeed: "seed-1",
    giftPda: "11111111111111111111111111111111",
    senderWallet: "11111111111111111111111111111111",
    stockMint: "11111111111111111111111111111111",
    stockSymbol: "AAPL",
    amountUsdc: "25000000",
    feeUsdc: "630000",
    recipientMode: "fcfs",
    recipientWallet: null,
    recipientEmail: null,
    status: "pending",
    message: null,
    theme: null,
    createdAt: new Date().toISOString(),
    claimedAt: null,
    canceledAt: null,
    createTxSignature: "fake-sig",
    claimTxSignature: null,
    cancelTxSignature: null,
    ...overrides,
  };
}

describe("toSentGiftRow", () => {
  it("converts USDC base units to dollars", () => {
    expect(toSentGiftRow(makeGiftJson({ amountUsdc: "25000000" })).amountUsd).toBe(25);
  });

  it("fcfs mode shows 'Anyone — first to claim' and type 'fcfs'", () => {
    const row = toSentGiftRow(makeGiftJson({ recipientMode: "fcfs" }));
    expect(row.recipient).toBe("Anyone — first to claim");
    expect(row.recipientType).toBe("fcfs");
  });

  it("dedicated_email mode shows the email and type 'email'", () => {
    const row = toSentGiftRow(
      makeGiftJson({ recipientMode: "dedicated_email", recipientEmail: "sam@example.com" }),
    );
    expect(row.recipient).toBe("sam@example.com");
    expect(row.recipientType).toBe("email");
  });

  it("dedicated_wallet mode shows a shortened address and type 'wallet'", () => {
    const row = toSentGiftRow(
      makeGiftJson({
        recipientMode: "dedicated_wallet",
        recipientWallet: "5xY9pQ2zAbCdEfGhIjKlMnOpQrStUvWxYz1234567890",
      }),
    );
    expect(row.recipient).toBe("5xY9...7890");
    expect(row.recipientType).toBe("wallet");
  });

  it("carries id/symbol/status straight through", () => {
    const row = toSentGiftRow(
      makeGiftJson({ claimSeed: "abc", stockSymbol: "TSLA", status: "claimed" }),
    );
    expect(row.id).toBe("abc");
    expect(row.symbol).toBe("TSLA");
    expect(row.status).toBe("claimed");
  });
});

describe("toClaimedGiftRow", () => {
  const HOUR = 60 * 60_000;
  const DAY = 24 * HOUR;
  const WEEK = 7 * DAY;

  it("shows an em dash when never claimed", () => {
    expect(toClaimedGiftRow(makeGiftJson({ claimedAt: null })).claimedAgo).toBe("—");
  });

  it("shows 'just now' for under an hour", () => {
    const claimedAt = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(toClaimedGiftRow(makeGiftJson({ claimedAt })).claimedAgo).toBe("just now");
  });

  it("shows hours for under a day, with correct singular/plural", () => {
    const oneHourAgo = new Date(Date.now() - 1 * HOUR - 1000).toISOString();
    expect(toClaimedGiftRow(makeGiftJson({ claimedAt: oneHourAgo })).claimedAgo).toBe(
      "1 hour ago",
    );
    const threeHoursAgo = new Date(Date.now() - 3 * HOUR).toISOString();
    expect(toClaimedGiftRow(makeGiftJson({ claimedAt: threeHoursAgo })).claimedAgo).toBe(
      "3 hours ago",
    );
  });

  it("shows days for under a week", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * DAY).toISOString();
    expect(toClaimedGiftRow(makeGiftJson({ claimedAt: twoDaysAgo })).claimedAgo).toBe(
      "2 days ago",
    );
  });

  it("shows weeks beyond that", () => {
    const threeWeeksAgo = new Date(Date.now() - 3 * WEEK).toISOString();
    expect(toClaimedGiftRow(makeGiftJson({ claimedAt: threeWeeksAgo })).claimedAgo).toBe(
      "3 weeks ago",
    );
  });
});
