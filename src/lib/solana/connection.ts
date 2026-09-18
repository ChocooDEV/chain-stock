import { Connection, type VersionedTransactionResponse } from "@solana/web3.js";

let connection: Connection | null = null;

/**
 * Shared server-side RPC connection — mainnet, since tokenized stocks and
 * real Jupiter liquidity only exist there (docs/Architecture.md). Falls
 * back to the public mainnet-beta endpoint when `SOLANA_RPC_URL` isn't
 * set, same stopgap as `SolanaWalletProvider`'s client-side connection —
 * fine for reads during development, but swap in a real RPC provider
 * (Helius/Triton/etc.) before this ever submits real transactions (see
 * the solana-dev skill's security checklist: "Malicious / Observing
 * RPC").
 */
export function getConnection(): Connection {
  if (!connection) {
    const endpoint =
      process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
    connection = new Connection(endpoint, "confirmed");
  }
  return connection;
}

// Transaction signatures are always base58-encoded 64-byte ed25519
// signatures — real ones land around 87-88 characters, but leading
// zero-bytes can shorten that, so this stays a loose sanity check rather
// than an exact length match.
const SIGNATURE_RE = /^[1-9A-HJ-NP-Za-km-z]{64,100}$/;

/**
 * Fetches a confirmed transaction, or `null` if it can't be found —
 * folding two failure modes into one result on purpose: not-yet-landed
 * (the caller should just retry once it confirms) and malformed input
 * (a signature that isn't even validly formatted). Both mean the same
 * thing to every caller here: "we can't verify this happened," so they
 * don't need to be told apart.
 *
 * This exists because `Connection.getTransaction` throws a raw
 * `SolanaJSONRPCError` for a malformed signature instead of returning
 * `null` like it does for a well-formed-but-unknown one — every route
 * that called it directly without a validity check or try/catch would
 * crash with an unhandled 500 on garbage input rather than a clean 4xx.
 * Found via manual testing (an intentionally-bad signature during a
 * review pass), not caught by any earlier check.
 */
export async function getConfirmedTransactionOrNull(
  signature: string,
): Promise<VersionedTransactionResponse | null> {
  if (!SIGNATURE_RE.test(signature)) return null;
  try {
    return await getConnection().getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
  } catch {
    return null;
  }
}
