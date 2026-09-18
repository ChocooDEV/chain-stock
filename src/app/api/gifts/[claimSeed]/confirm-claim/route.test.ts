import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { gifts } from "@/lib/db/schema";

const getConfirmedTransactionOrNullMock = vi.fn();
vi.mock("@/lib/solana/connection", () => ({
  getConfirmedTransactionOrNull: getConfirmedTransactionOrNullMock,
}));

const { POST } = await import("@/app/api/gifts/[claimSeed]/confirm-claim/route");

const VALID_ADDRESS = "11111111111111111111111111111111";
const OTHER_ADDRESS = "So11111111111111111111111111111111111111112";
const testClaimSeeds: string[] = [];

function testClaimSeed(): string {
  const seed = `vitest-cc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  testClaimSeeds.push(seed);
  return seed;
}

async function insertPendingGift(overrides: Partial<typeof gifts.$inferInsert> = {}) {
  const claimSeed = testClaimSeed();
  await db.insert(gifts).values({
    claimSeed,
    giftPda: VALID_ADDRESS,
    senderWallet: VALID_ADDRESS,
    stockMint: VALID_ADDRESS,
    stockSymbol: "AAPL",
    amountUsdc: 25000000n,
    feeUsdc: 630000n,
    recipientMode: "fcfs",
    status: "pending",
    createTxSignature: "fake-create-sig",
    ...overrides,
  });
  return claimSeed;
}

function confirmClaimRequest(claimSeed: string, body: unknown) {
  const req = new NextRequest(`http://localhost/api/gifts/${claimSeed}/confirm-claim`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
  return POST(req, { params: Promise.resolve({ claimSeed }) });
}

beforeEach(() => {
  getConfirmedTransactionOrNullMock.mockReset();
  getConfirmedTransactionOrNullMock.mockResolvedValue({ meta: { err: null } });
});

afterAll(async () => {
  for (const claimSeed of testClaimSeeds) {
    await db.delete(gifts).where(eq(gifts.claimSeed, claimSeed));
  }
});

describe("POST /api/gifts/:claimSeed/confirm-claim", () => {
  it("404s for an unknown claimSeed", async () => {
    const res = await confirmClaimRequest("does-not-exist", {
      claimTxSignature: "sig",
      recipientWallet: VALID_ADDRESS,
    });
    expect(res.status).toBe(404);
  });

  it("400s without a claimTxSignature", async () => {
    const claimSeed = await insertPendingGift();
    const res = await confirmClaimRequest(claimSeed, { recipientWallet: VALID_ADDRESS });
    expect(res.status).toBe(400);
  });

  it("400s on an invalid recipientWallet", async () => {
    const claimSeed = await insertPendingGift();
    const res = await confirmClaimRequest(claimSeed, {
      claimTxSignature: "sig",
      recipientWallet: "not-an-address",
    });
    expect(res.status).toBe(400);
  });

  it("409s when the dedicated recipientWallet doesn't match", async () => {
    const claimSeed = await insertPendingGift({
      recipientMode: "dedicated_wallet",
      recipientWallet: VALID_ADDRESS,
    });
    const res = await confirmClaimRequest(claimSeed, {
      claimTxSignature: "sig",
      recipientWallet: OTHER_ADDRESS,
    });
    expect(res.status).toBe(409);
  });

  it("409s when the transaction can't be confirmed", async () => {
    getConfirmedTransactionOrNullMock.mockResolvedValueOnce(null);
    const claimSeed = await insertPendingGift();
    const res = await confirmClaimRequest(claimSeed, {
      claimTxSignature: "sig",
      recipientWallet: VALID_ADDRESS,
    });
    expect(res.status).toBe(409);
  });

  it("flips a pending gift to claimed and sets recipientWallet", async () => {
    const claimSeed = await insertPendingGift();
    const res = await confirmClaimRequest(claimSeed, {
      claimTxSignature: "real-claim-sig",
      recipientWallet: VALID_ADDRESS,
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("claimed");
    expect(json.recipientWallet).toBe(VALID_ADDRESS);
  });

  it("409s on a second confirm-claim against an already-claimed gift", async () => {
    const claimSeed = await insertPendingGift();
    const first = await confirmClaimRequest(claimSeed, {
      claimTxSignature: "sig-1",
      recipientWallet: VALID_ADDRESS,
    });
    expect(first.status).toBe(200);

    const second = await confirmClaimRequest(claimSeed, {
      claimTxSignature: "sig-2",
      recipientWallet: VALID_ADDRESS,
    });
    expect(second.status).toBe(409);
  });

  it("under concurrent confirm-claim calls for the same gift, exactly one succeeds", async () => {
    // The actual race-condition fix this route exists to verify (see
    // confirm-claim's own doc comment on the atomic compare-and-swap
    // UPDATE): two requests racing the same pending -> claimed
    // transition must not both win.
    const claimSeed = await insertPendingGift();
    const [a, b] = await Promise.all([
      confirmClaimRequest(claimSeed, { claimTxSignature: "sig-a", recipientWallet: VALID_ADDRESS }),
      confirmClaimRequest(claimSeed, { claimTxSignature: "sig-b", recipientWallet: VALID_ADDRESS }),
    ]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([200, 409]);
  });
});
