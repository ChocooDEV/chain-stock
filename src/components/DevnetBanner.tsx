import { isDevnet } from "@/lib/solana/env";

/**
 * Site-wide notice that this deploy is pointed at devnet, not mainnet —
 * so nobody mistakes a test gift (fake mock-USDC, no real value) for a
 * real one. Renders nothing once `NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta`
 * is set for a real launch; no separate flag to remember to flip.
 */
export function DevnetBanner() {
  if (!isDevnet()) return null;

  return (
    <div className="sticky top-0 z-50 bg-gold px-4 py-2 text-center text-sm font-semibold text-ink">
      DEVNET MODE - test gifts only, no real money or stock involved.
    </div>
  );
}
