import { afterAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { gifts } from "@/lib/db/schema";
import { GET } from "@/app/api/gifts/[claimSeed]/route";

const VALID_ADDRESS = "11111111111111111111111111111111";
const testClaimSeeds: string[] = [];

function testClaimSeed(): string {
  const seed = `vitest-get-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  testClaimSeeds.push(seed);
  return seed;
}

function getRequest(claimSeed: string) {
  const req = new NextRequest(`http://localhost/api/gifts/${claimSeed}`);
  return GET(req, { params: Promise.resolve({ claimSeed }) });
}

afterAll(async () => {
  for (const claimSeed of testClaimSeeds) {
    await db.delete(gifts).where(eq(gifts.claimSeed, claimSeed));
  }
});

describe("GET /api/gifts/:claimSeed", () => {
  it("404s for an unknown claimSeed", async () => {
    const res = await getRequest("does-not-exist-at-all");
    expect(res.status).toBe(404);
  });

  it("200s with the gift's JSON shape for a known claimSeed", async () => {
    const claimSeed = testClaimSeed();
    await db.insert(gifts).values({
      claimSeed,
      giftPda: VALID_ADDRESS,
      senderWallet: VALID_ADDRESS,
      stockMint: VALID_ADDRESS,
      stockSymbol: "TSLA",
      amountUsdc: 15000000n,
      feeUsdc: 375000n,
      recipientMode: "fcfs",
      status: "pending",
      createTxSignature: "fake-sig",
    });

    const res = await getRequest(claimSeed);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.claimSeed).toBe(claimSeed);
    expect(json.stockSymbol).toBe("TSLA");
    expect(json.amountUsdc).toBe("15000000");
  });
});
