/**
 * Cluster config, read from env so the same code runs against devnet
 * (current — see docs/Wallets.md and docs/SecurityAudit.md for the
 * devnet program/Config PDA this points at) and mainnet later just by
 * changing env vars, not code. `NEXT_PUBLIC_*` variants exist because
 * Next.js only inlines `NEXT_PUBLIC_`-prefixed vars into client bundles —
 * `SOLANA_RPC_URL` (server-only, see connection.ts) and
 * `NEXT_PUBLIC_SOLANA_RPC_URL` should point at the same cluster.
 */
export function getCluster(): "devnet" | "mainnet-beta" {
  return process.env.NEXT_PUBLIC_SOLANA_CLUSTER === "mainnet-beta"
    ? "mainnet-beta"
    : "devnet";
}

export function isDevnet(): boolean {
  return getCluster() === "devnet";
}

/** Client-side RPC endpoint — falls back to the public devnet endpoint
 *  (rate-limited, fine for local dev) rather than silently defaulting to
 *  mainnet the way `connection.ts`'s server-side fallback historically
 *  did, since sending a real transaction to the wrong cluster is a much
 *  worse failure mode for wallet-adapter's own connection than a
 *  read-only server fetch. */
export function getClientRpcUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    (isDevnet()
      ? "https://api.devnet.solana.com"
      : "https://api.mainnet-beta.solana.com")
  );
}
