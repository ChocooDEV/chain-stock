"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { hasAcceptedCurrentLegal, setLegalAccepted } from "@/lib/legal/storage";
import { LegalAcceptanceModal } from "./LegalAcceptanceModal";

type LegalGateContextValue = {
  /**
   * Resolves `true` immediately if already accepted (current version).
   * Otherwise opens the modal and resolves once the visitor answers:
   * `true` on accept, `false` on decline. Callers should bail out of
   * whatever they were about to do (connect a wallet, sign a
   * transaction) when this resolves `false`.
   */
  requireAcceptance: () => Promise<boolean>;
};

const LegalGateContext = createContext<LegalGateContextValue | null>(null);

/**
 * Gates the *first* send or claim behind a Terms/Privacy acceptance
 * popup (see docs/App.md's "Legal consent" section) — not every page
 * visit, only the moment someone is about to actually connect a wallet
 * and move funds. Mounted once in `layout.tsx`; `GiftForm.tsx` and
 * `ClaimPageClient.tsx` both call `useLegalGate().requireAcceptance()`
 * at the top of their send/claim handlers, before doing anything
 * wallet-related.
 */
export function LegalGateProvider({ children }: { children: React.ReactNode }) {
  const [modalOpen, setModalOpen] = useState(false);
  // Holds the in-flight requireAcceptance() call's resolver while the
  // modal is open — a ref (not state) since it's only ever read/written
  // from event handlers, never rendered.
  const resolverRef = useRef<((accepted: boolean) => void) | null>(null);

  const requireAcceptance = useCallback((): Promise<boolean> => {
    if (hasAcceptedCurrentLegal()) {
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setModalOpen(true);
    });
  }, []);

  const handleAccept = () => {
    setLegalAccepted();
    setModalOpen(false);
    resolverRef.current?.(true);
    resolverRef.current = null;
  };

  const handleDecline = () => {
    setModalOpen(false);
    resolverRef.current?.(false);
    resolverRef.current = null;
  };

  return (
    <LegalGateContext.Provider value={{ requireAcceptance }}>
      {children}
      {modalOpen && (
        <LegalAcceptanceModal onAccept={handleAccept} onDecline={handleDecline} />
      )}
    </LegalGateContext.Provider>
  );
}

export function useLegalGate(): LegalGateContextValue {
  const context = useContext(LegalGateContext);
  if (!context) {
    throw new Error("useLegalGate must be used within a LegalGateProvider");
  }
  return context;
}
