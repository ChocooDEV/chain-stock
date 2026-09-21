"use client";

import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { getClientRpcUrl } from "@/lib/solana/env";

/**
 * Wraps the app with Solana wallet-adapter context so any page can call
 * useWallet() / useWalletModal() to connect the sender's own wallet
 * (Phantom, Solflare, Backpack, ...) — separate from Privy, which is only
 * used for the walletless recipient/claim flow (see docs/Architecture.md's
 * "Wallets & keys" section: sender connects a real wallet and signs
 * `create_gift` themselves, Privy is recipient-only).
 *
 * `wallets={[]}` is intentional, not a TODO — modern wallet-adapter
 * auto-detects installed wallets via the Wallet Standard, so no explicit
 * adapter list is needed.
 */
export function SolanaWalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Cluster-aware (see lib/solana/env.ts) — currently devnet while the
  // program is only deployed there (docs/Wallets.md). A connected wallet
  // extension must itself be switched to the matching cluster, or its
  // own signed transactions will target the wrong network.
  const endpoint = useMemo(() => getClientRpcUrl(), []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
