import bs58 from "bs58";

/**
 * The real `claim_seed` — random 16 bytes matching `create_gift`'s
 * `[u8; 16]` instruction argument (`anchor/programs/chainstock/src/
 * instructions/create_gift.rs`), generated client-side by the sender at
 * send time. Random specifically so a claim link can't be enumerated by
 * scanning possible `Gift` PDAs (see that file's doc comment). Base58
 * rather than hex purely for a shorter, URL-friendlier claim link.
 */
export function generateClaimSeed(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

export function encodeClaimSeed(seed: Uint8Array): string {
  return bs58.encode(seed);
}

export function decodeClaimSeed(encoded: string): Uint8Array {
  const decoded = bs58.decode(encoded);
  if (decoded.length !== 16) {
    throw new Error(`claim_seed must decode to 16 bytes, got ${decoded.length}`);
  }
  return decoded;
}
