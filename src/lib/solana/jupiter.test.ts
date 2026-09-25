import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { fetchSwapInstructions, fetchSwapQuote } from "./jupiter";

const USDC = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const STOCK = new PublicKey("SPCXxcqXj6e5dJDVNovHN8744zkbhM2bYudU45BimGb");
const USER = new PublicKey("7U4uFTqbthLLd4nNq6aY9yV7AeGhLW6Xr5mFxDTqcSKn");
const DESTINATION = new PublicKey("11111111111111111111111111111111");

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

function ok(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 });
}

describe("fetchSwapQuote", () => {
  it("requests the configured slippage and account cap", async () => {
    fetchMock.mockResolvedValueOnce(ok({ routePlan: [{}], outAmount: "1000" }));

    await fetchSwapQuote({ inputMint: USDC, outputMint: STOCK, amount: 25_000_000n });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain(`inputMint=${USDC.toBase58()}`);
    expect(url).toContain(`outputMint=${STOCK.toBase58()}`);
    expect(url).toContain("amount=25000000");
    expect(url).toContain("slippageBps=100");
    expect(url).toContain("maxAccounts=40");
  });

  it("throws when Jupiter has no route, so the caller can't silently pay out USDC", async () => {
    fetchMock.mockResolvedValueOnce(ok({ error: "NO_ROUTES_FOUND" }));

    await expect(
      fetchSwapQuote({ inputMint: USDC, outputMint: STOCK, amount: 25_000_000n }),
    ).rejects.toThrow(/NO_ROUTES_FOUND/);
  });

  it("throws on a transport failure", async () => {
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 502 }));

    await expect(
      fetchSwapQuote({ inputMint: USDC, outputMint: STOCK, amount: 1n }),
    ).rejects.toThrow(/502/);
  });
});

describe("fetchSwapInstructions", () => {
  const rawSwap = {
    programId: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
    accounts: [
      { pubkey: USER.toBase58(), isSigner: true, isWritable: true },
      { pubkey: STOCK.toBase58(), isSigner: false, isWritable: false },
    ],
    data: Buffer.from([1, 2, 3]).toString("base64"),
  };

  it("skips balance pre-checks and names the destination account", async () => {
    fetchMock.mockResolvedValueOnce(ok({ swapInstruction: rawSwap }));

    await fetchSwapInstructions({
      quote: { inAmount: "1", outAmount: "2", priceImpactPct: "0", routePlan: [] },
      userPublicKey: USER,
      destinationTokenAccount: DESTINATION,
    });

    const payload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    // claim_gift funds the source account earlier in the same transaction,
    // so a pre-flight balance check would reject a valid claim.
    expect(payload.skipUserAccountsRpcCalls).toBe(true);
    expect(payload.destinationTokenAccount).toBe(DESTINATION.toBase58());
    expect(payload.wrapAndUnwrapSol).toBe(false);
  });

  it("deserializes instructions into web3 form", async () => {
    fetchMock.mockResolvedValueOnce(
      ok({
        swapInstruction: rawSwap,
        computeBudgetInstructions: [rawSwap],
        addressLookupTableAddresses: [STOCK.toBase58()],
      }),
    );

    const result = await fetchSwapInstructions({
      quote: { inAmount: "1", outAmount: "2", priceImpactPct: "0", routePlan: [] },
      userPublicKey: USER,
      destinationTokenAccount: DESTINATION,
    });

    expect(result.swapInstruction.programId.toBase58()).toBe(rawSwap.programId);
    expect(result.swapInstruction.keys).toHaveLength(2);
    expect(result.swapInstruction.keys[0].isSigner).toBe(true);
    expect([...result.swapInstruction.data]).toEqual([1, 2, 3]);
    expect(result.computeBudgetInstructions).toHaveLength(1);
    expect(result.addressLookupTableAddresses).toEqual([STOCK.toBase58()]);
  });

  it("throws when Jupiter can't build the swap", async () => {
    fetchMock.mockResolvedValueOnce(ok({ error: "ROUTE_EXPIRED" }));

    await expect(
      fetchSwapInstructions({
        quote: { inAmount: "1", outAmount: "2", priceImpactPct: "0", routePlan: [] },
        userPublicKey: USER,
        destinationTokenAccount: DESTINATION,
      }),
    ).rejects.toThrow(/ROUTE_EXPIRED/);
  });
});
