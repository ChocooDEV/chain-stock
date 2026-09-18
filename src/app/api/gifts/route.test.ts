import { afterAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { gifts } from "@/lib/db/schema";

// Real DB (see vitest.setup.ts for how DATABASE_URL gets loaded), fake
// Solana RPC — these tests care whether POST /api/gifts's own logic
// (validation, the idempotency/conflict fix) is correct, not whether a
// real transaction landed on mainnet. Mocked before importing the route
// so the module picks up the fake from its first import.
const getConfirmedTransactionOrNullMock = vi.fn();
vi.mock("@/lib/solana/connection", () => ({
  getConfirmedTransactionOrNull: getConfirmedTransactionOrNullMock,
}));

const { POST } = await import("@/app/api/gifts/route");

const VALID_ADDRESS = "11111111111111111111111111111111";
const testClaimSeeds: string[] = [];

function testClaimSeed(): string {
  const seed = `vitest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  testClaimSeeds.push(seed);
  return seed;
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    claimSeed: testClaimSeed(),
    giftPda: VALID_ADDRESS,
    senderWallet: VALID_ADDRESS,
    stockMint: VALID_ADDRESS,
    stockSymbol: "AAPL",
    amountUsdc: "25000000",
    feeUsdc: "630000",
    recipientMode: "fcfs",
    createTxSignature: "fake-sig-1",
    ...overrides,
  };
}

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/gifts", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

afterAll(async () => {
  for (const claimSeed of testClaimSeeds) {
    await db.delete(gifts).where(eq(gifts.claimSeed, claimSeed));
  }
});

describe("POST /api/gifts — validation", () => {
  it("400s when a required field is missing", async () => {
    const res = await POST(postRequest(validBody({ claimSeed: undefined })));
    expect(res.status).toBe(400);
  });

  it("400s on an invalid Solana address", async () => {
    const res = await POST(postRequest(validBody({ giftPda: "not-an-address" })));
    expect(res.status).toBe(400);
  });

  it("400s on a malformed recipient shape (fcfs with a wallet set)", async () => {
    const res = await POST(
      postRequest(validBody({ recipientMode: "fcfs", recipientWallet: VALID_ADDRESS })),
    );
    expect(res.status).toBe(400);
  });

  it("400s on a non-positive amountUsdc", async () => {
    const res = await POST(postRequest(validBody({ amountUsdc: "0" })));
    expect(res.status).toBe(400);
  });

  it("400s on invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/gifts", {
      method: "POST",
      body: "{not json",
      headers: { "Content-Type": "application/json" },
    });
    expect((await POST(req)).status).toBe(400);
  });
});

describe("POST /api/gifts — transaction verification", () => {
  it("409s when the transaction can't be found/confirmed yet", async () => {
    getConfirmedTransactionOrNullMock.mockResolvedValueOnce(null);
    const res = await POST(postRequest(validBody()));
    expect(res.status).toBe(409);
  });

  it("400s when the transaction landed but failed on-chain", async () => {
    getConfirmedTransactionOrNullMock.mockResolvedValueOnce({ meta: { err: "InstructionError" } });
    const res = await POST(postRequest(validBody()));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/gifts — insert, idempotency, conflict", () => {
  it("201s and indexes a new gift on first insert", async () => {
    getConfirmedTransactionOrNullMock.mockResolvedValue({ meta: { err: null } });
    const body = validBody();
    const res = await POST(postRequest(body));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.claimSeed).toBe(body.claimSeed);
    expect(json.amountUsdc).toBe("25000000");
  });

  it("200s (not 201) on a genuine retry — same claimSeed, same signature", async () => {
    getConfirmedTransactionOrNullMock.mockResolvedValue({ meta: { err: null } });
    const body = validBody();
    const first = await POST(postRequest(body));
    expect(first.status).toBe(201);

    const retry = await POST(postRequest(body));
    expect(retry.status).toBe(200);
    const json = await retry.json();
    expect(json.claimSeed).toBe(body.claimSeed);
  });

  it("409s on a real conflict — same claimSeed, different signature", async () => {
    getConfirmedTransactionOrNullMock.mockResolvedValue({ meta: { err: null } });
    const body = validBody();
    const first = await POST(postRequest(body));
    expect(first.status).toBe(201);

    const conflicting = await POST(
      postRequest({ ...body, createTxSignature: "a-different-signature" }),
    );
    expect(conflicting.status).toBe(409);
  });
});
