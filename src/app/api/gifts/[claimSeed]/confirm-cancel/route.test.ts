import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { gifts } from "@/lib/db/schema";

const getConfirmedTransactionOrNullMock = vi.fn();
vi.mock("@/lib/solana/connection", () => ({
  getConfirmedTransactionOrNull: getConfirmedTransactionOrNullMock,
}));

const { POST } = await import("@/app/api/gifts/[claimSeed]/confirm-cancel/route");

const VALID_ADDRESS = "11111111111111111111111111111111";
const testClaimSeeds: string[] = [];

function testClaimSeed(): string {
  const seed = `vitest-ccl-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  testClaimSeeds.push(seed);
  return seed;
}

async function insertPendingGift() {
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
  });
  return claimSeed;
}

function confirmCancelRequest(claimSeed: string, body: unknown) {
  const req = new NextRequest(`http://localhost/api/gifts/${claimSeed}/confirm-cancel`, {
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

describe("POST /api/gifts/:claimSeed/confirm-cancel", () => {
  it("404s for an unknown claimSeed", async () => {
    const res = await confirmCancelRequest("does-not-exist", { cancelTxSignature: "sig" });
    expect(res.status).toBe(404);
  });

  it("400s without a cancelTxSignature", async () => {
    const claimSeed = await insertPendingGift();
    const res = await confirmCancelRequest(claimSeed, {});
    expect(res.status).toBe(400);
  });

  it("409s when the transaction can't be confirmed", async () => {
    getConfirmedTransactionOrNullMock.mockResolvedValueOnce(null);
    const claimSeed = await insertPendingGift();
    const res = await confirmCancelRequest(claimSeed, { cancelTxSignature: "sig" });
    expect(res.status).toBe(409);
  });

  it("flips a pending gift to canceled", async () => {
    const claimSeed = await insertPendingGift();
    const res = await confirmCancelRequest(claimSeed, { cancelTxSignature: "real-cancel-sig" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("canceled");
  });

  it("under concurrent confirm-cancel calls for the same gift, exactly one succeeds", async () => {
    const claimSeed = await insertPendingGift();
    const [a, b] = await Promise.all([
      confirmCancelRequest(claimSeed, { cancelTxSignature: "sig-a" }),
      confirmCancelRequest(claimSeed, { cancelTxSignature: "sig-b" }),
    ]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([200, 409]);
  });

  it("a canceled gift can't also be confirm-claimed later (cross-route race)", async () => {
    // Not the same route twice — the pending -> claimed and pending ->
    // canceled transitions share the same underlying guard (status =
    // 'pending' in the UPDATE's WHERE), so this confirms cancel wins
    // don't leave the row looking claimable by a stale confirm-claim call.
    const claimSeed = await insertPendingGift();
    const cancel = await confirmCancelRequest(claimSeed, { cancelTxSignature: "sig" });
    expect(cancel.status).toBe(200);

    const { POST: confirmClaim } = await import(
      "@/app/api/gifts/[claimSeed]/confirm-claim/route"
    );
    const req = new NextRequest(`http://localhost/api/gifts/${claimSeed}/confirm-claim`, {
      method: "POST",
      body: JSON.stringify({ claimTxSignature: "sig", recipientWallet: VALID_ADDRESS }),
      headers: { "Content-Type": "application/json" },
    });
    const claim = await confirmClaim(req, { params: Promise.resolve({ claimSeed }) });
    expect(claim.status).toBe(409);
  });
});
