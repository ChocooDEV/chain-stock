"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";

// Built once at module scope, not per-render — same connector set every
// time, no reason to reconstruct it on every PrivyClientProvider mount.
const solanaConnectors = toSolanaWalletConnectors();

/**
 * Privy is the recipient/claimer's auth — a walletless "sign up with
 * email/social and get a Solana wallet automatically" path, alongside the
 * option to connect an existing wallet through Privy's own modal (see
 * docs/App.md's claim-page section). This is deliberately separate from
 * `SolanaWalletProvider` (`@solana/wallet-adapter`), which is the
 * *sender's* wallet-connect on the create-gift page — two different
 * people, two different auth mechanisms, per docs/Architecture.md's
 * "Wallets & keys" split.
 *
 * `appId` is read server-side from `process.env.PRIVY_APP_ID` (not
 * `NEXT_PUBLIC_PRIVY_APP_ID`) in the root layout and passed down as a
 * prop — that works fine despite the env var not being NEXT_PUBLIC_-
 * prefixed, since the *value* is what ends up embedded in the client
 * bundle once passed as a prop, not the env var name itself. The app id
 * isn't secret (Privy's own docs embed it directly in frontend code);
 * `PRIVY_SECRET` is the one that must stay server-only, for backend
 * claim-verification calls once those exist.
 */
export function PrivyClientProvider({
  appId,
  children,
}: {
  appId: string | undefined;
  children: React.ReactNode;
}) {
  if (!appId) {
    // Don't crash the whole app over a missing/misconfigured env var —
    // pages that don't touch Privy (landing, /gift) still work; anything
    // that calls usePrivy() will just get privy-less behavior. Warn in
    // every environment (including production) since this failure mode
    // is otherwise silent — a misconfigured deploy would break the claim
    // page with nothing in the logs to explain why.
    console.warn(
      "PRIVY_APP_ID is not set — Privy-dependent features (the claim page) won't work.",
    );
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: { walletChainType: "solana-only" },
        loginMethods: ["email", "wallet", "google"],
        embeddedWallets: {
          solana: { createOnLogin: "users-without-wallets" },
        },
        externalWallets: {
          solana: { connectors: solanaConnectors },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
