import { Keypair } from "@solana/web3.js";

let cached: Keypair | null = null;

/**
 * The `backend_authority` keypair — server-only, never imported from a
 * "use client" file (Next.js would fail the build if a client bundle
 * tried to pull in `BACKEND_AUTHORITY_SECRET_KEY`, since env vars without
 * a `NEXT_PUBLIC_` prefix are stripped from client bundles entirely; this
 * module has no explicit safeguard beyond that). Used to co-sign
 * dedicated-by-email claims and, if sponsoring, front the transaction fee
 * — see `prepare-claim`'s route and docs/Architecture.md's "Fee-payer
 * wallet" section. Devnet key is Wallet 2 in docs/Wallets.md; a real
 * launch needs a fresh one in a real secrets manager, not a plain env var
 * (see that file's "Once mainnet is real" section).
 */
export function getBackendAuthorityKeypair(): Keypair {
  if (!cached) {
    const raw = process.env.BACKEND_AUTHORITY_SECRET_KEY;
    if (!raw) {
      throw new Error("BACKEND_AUTHORITY_SECRET_KEY is not set");
    }
    cached = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
  }
  return cached;
}
