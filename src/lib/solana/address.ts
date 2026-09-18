import { PublicKey } from "@solana/web3.js";

/** Real base58 decode + 32-byte length check, not a regex guess — same
 *  approach as GiftForm's client-side validator, reused server-side. */
export function isValidSolanaAddress(value: string): boolean {
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}
