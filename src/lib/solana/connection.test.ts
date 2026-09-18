import { describe, expect, it, vi, beforeEach } from "vitest";

// Mocked before importing the module under test — `@solana/web3.js`'s
// `Connection` is replaced with a fake whose `getTransaction` behavior
// each test controls, so these stay fast unit tests with zero real
// network calls (unlike hitting the live RPC, which would make this
// suite flaky/slow for no real gain over what's mocked here).
const getTransactionMock = vi.fn();
vi.mock("@solana/web3.js", () => ({
  Connection: class {
    getTransaction = getTransactionMock;
  },
}));

const { getConfirmedTransactionOrNull } = await import("@/lib/solana/connection");

describe("getConfirmedTransactionOrNull", () => {
  beforeEach(() => {
    getTransactionMock.mockReset();
  });

  it("returns null for an empty string without calling the RPC", async () => {
    expect(await getConfirmedTransactionOrNull("")).toBeNull();
    expect(getTransactionMock).not.toHaveBeenCalled();
  });

  it("returns null for a too-short string without calling the RPC", async () => {
    expect(await getConfirmedTransactionOrNull("abc")).toBeNull();
    expect(getTransactionMock).not.toHaveBeenCalled();
  });

  it("returns null for a string with invalid base58 characters, without calling the RPC", async () => {
    // '0', 'O', 'I', 'l' are all excluded from the base58 alphabet.
    const fakeButInvalidChars = "0".repeat(88);
    expect(await getConfirmedTransactionOrNull(fakeButInvalidChars)).toBeNull();
    expect(getTransactionMock).not.toHaveBeenCalled();
  });

  it("returns null (not a thrown error) when the RPC throws for a well-formed signature", async () => {
    // This is the exact bug connection.ts's doc comment describes:
    // Connection.getTransaction throwing for malformed-looking input
    // that nonetheless passed the format check, or any other RPC error.
    const wellFormedFake = "1".repeat(88);
    getTransactionMock.mockRejectedValueOnce(new Error("RPC exploded"));
    expect(await getConfirmedTransactionOrNull(wellFormedFake)).toBeNull();
    expect(getTransactionMock).toHaveBeenCalledOnce();
  });

  it("returns the transaction when the RPC finds one", async () => {
    const wellFormedFake = "1".repeat(88);
    const fakeTx = { meta: { err: null }, transaction: {} };
    getTransactionMock.mockResolvedValueOnce(fakeTx);
    expect(await getConfirmedTransactionOrNull(wellFormedFake)).toBe(fakeTx);
  });
});
