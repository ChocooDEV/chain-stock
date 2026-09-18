import { describe, expect, it } from "vitest";
import {
  parsePositiveBigInt,
  toGiftJson,
  validateRecipientShape,
} from "@/lib/api/gifts";
import type { GiftRow } from "@/lib/db/schema";

// System Program address — a real, always-valid base58 pubkey, same
// placeholder used by scripts/seed-demo-gifts.mjs.
const VALID_ADDRESS = "11111111111111111111111111111111";
const INVALID_ADDRESS = "not-a-real-address";

describe("validateRecipientShape", () => {
  it("accepts dedicated_wallet with a valid address and no email", () => {
    const result = validateRecipientShape("dedicated_wallet", VALID_ADDRESS, undefined);
    expect(result).toEqual({ mode: "dedicated_wallet", wallet: VALID_ADDRESS, email: null });
  });

  it("rejects dedicated_wallet with an invalid address", () => {
    expect(validateRecipientShape("dedicated_wallet", INVALID_ADDRESS, undefined)).toBeNull();
  });

  it("rejects dedicated_wallet with both wallet and email set", () => {
    expect(
      validateRecipientShape("dedicated_wallet", VALID_ADDRESS, "sam@example.com"),
    ).toBeNull();
  });

  it("rejects dedicated_wallet with no wallet at all", () => {
    expect(validateRecipientShape("dedicated_wallet", undefined, undefined)).toBeNull();
  });

  it("accepts dedicated_email with a valid email and normalizes it", () => {
    const result = validateRecipientShape(
      "dedicated_email",
      undefined,
      "  Sam@Example.com  ",
    );
    expect(result).toEqual({
      mode: "dedicated_email",
      wallet: null,
      email: "sam@example.com",
    });
  });

  it("rejects dedicated_email with a malformed email", () => {
    expect(validateRecipientShape("dedicated_email", undefined, "not-an-email")).toBeNull();
  });

  it("rejects dedicated_email with both wallet and email set", () => {
    expect(
      validateRecipientShape("dedicated_email", VALID_ADDRESS, "sam@example.com"),
    ).toBeNull();
  });

  it("accepts fcfs with neither wallet nor email", () => {
    expect(validateRecipientShape("fcfs", undefined, undefined)).toEqual({
      mode: "fcfs",
      wallet: null,
      email: null,
    });
  });

  it("rejects fcfs with a wallet or email set", () => {
    expect(validateRecipientShape("fcfs", VALID_ADDRESS, undefined)).toBeNull();
    expect(validateRecipientShape("fcfs", undefined, "sam@example.com")).toBeNull();
  });

  it("rejects an unknown recipientMode", () => {
    expect(validateRecipientShape("bogus", undefined, undefined)).toBeNull();
  });
});

describe("parsePositiveBigInt", () => {
  it("parses a plain positive digit string", () => {
    expect(parsePositiveBigInt("25000000")).toBe(25000000n);
  });

  it("rejects zero", () => {
    expect(parsePositiveBigInt("0")).toBeNull();
  });

  it("rejects a negative sign", () => {
    expect(parsePositiveBigInt("-5")).toBeNull();
  });

  it("rejects a leading plus sign", () => {
    expect(parsePositiveBigInt("+5")).toBeNull();
  });

  it("rejects hex/scientific-notation strings", () => {
    expect(parsePositiveBigInt("0x10")).toBeNull();
    expect(parsePositiveBigInt("1e10")).toBeNull();
  });

  it("rejects a non-string value", () => {
    expect(parsePositiveBigInt(25000000)).toBeNull();
    expect(parsePositiveBigInt(null)).toBeNull();
    expect(parsePositiveBigInt(undefined)).toBeNull();
  });

  it("handles a value well past Number's safe-integer ceiling", () => {
    const huge = "9007199254740993000"; // > 2^53, would lose precision as a Number
    expect(parsePositiveBigInt(huge)).toBe(BigInt(huge));
  });
});

describe("toGiftJson", () => {
  it("serializes bigints as strings and dates as ISO strings", () => {
    const row: GiftRow = {
      claimSeed: "seed-1",
      giftPda: VALID_ADDRESS,
      senderWallet: VALID_ADDRESS,
      stockMint: VALID_ADDRESS,
      stockSymbol: "AAPL",
      amountUsdc: 25000000n,
      feeUsdc: 630000n,
      recipientMode: "fcfs",
      recipientWallet: null,
      recipientEmail: null,
      status: "pending",
      message: null,
      theme: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      claimedAt: null,
      canceledAt: null,
      createTxSignature: "fake-sig",
      claimTxSignature: null,
      cancelTxSignature: null,
    };

    const json = toGiftJson(row);
    expect(json.amountUsdc).toBe("25000000");
    expect(json.feeUsdc).toBe("630000");
    expect(json.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(json.claimedAt).toBeNull();
    expect(json.canceledAt).toBeNull();
  });
});
