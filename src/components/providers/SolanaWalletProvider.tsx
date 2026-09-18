"use client";

import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";

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
  // Public mainnet-beta RPC — fine for read-only wallet connection during
  // UI-only work, but swap in a real RPC provider (Helius/QuickNode/etc.)
  // before any transaction actually gets submitted.
  const endpoint = useMemo(() => clusterApiUrl("mainnet-beta"), []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
