import { LEGAL_ACCEPTANCE_STORAGE_KEY, LEGAL_VERSION } from "./constants";

type LegalAcceptanceRecord = {
  version: string;
  acceptedAt: string;
};

/**
 * ChainStock has no persistent user-account system to hang server-side
 * acceptance off of (wallet-adapter and Privy are both just signing
 * identities, not accounts) — so this is deliberately localStorage-only,
 * scoped to the browser rather than to a specific wallet address. A
 * visitor who clears storage or switches browsers gets re-prompted; that
 * false negative is an acceptable tradeoff for not building a users
 * table + API routes just for this. Every accessor is wrapped in
 * try/catch and returns a safe default — private-mode/blocked-storage
 * should degrade to "always re-prompt," never crash the send/claim flow
 * it gates.
 */
export function hasAcceptedCurrentLegal(): boolean {
  try {
    const raw = localStorage.getItem(LEGAL_ACCEPTANCE_STORAGE_KEY);
    if (!raw) return false;
    const record: LegalAcceptanceRecord = JSON.parse(raw);
    return record.version === LEGAL_VERSION;
  } catch {
    return false;
  }
}

export function setLegalAccepted(): void {
  try {
    const record: LegalAcceptanceRecord = {
      version: LEGAL_VERSION,
      acceptedAt: new Date().toISOString(),
    };
    localStorage.setItem(LEGAL_ACCEPTANCE_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage unavailable — the gate will just re-prompt next time,
    // which is the correct fail-safe here, not a bug to fix.
  }
}
