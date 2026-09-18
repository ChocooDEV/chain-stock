/** Any well-formed email, not provider-restricted — Privy's own email
 *  login verifies ownership via a one-time code regardless of which
 *  provider hosts the inbox (Gmail, a company domain, anything), so
 *  there's no verification reason to narrow this to one provider. See
 *  docs/App.md's "Dedicated gift" recipient-identity decision. Shared
 *  between the frontend form and the backend's request validation
 *  (src/lib/api/gifts.ts) so the two can't drift apart. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value);
}

/**
 * Canonical form for a recipient email wherever it's compared or hashed
 * — trim + lowercase. Must be applied identically at every touchpoint:
 * `POST /api/gifts` (stores the sender-entered email), the client-side
 * transaction builder that hashes it for the on-chain
 * `recipient_email_hash` arg (not built yet — needs the deployed
 * program, see TODO.md), and `prepare-claim`'s comparison against the
 * claimer's Privy-verified email (also not built yet). Any drift here
 * — e.g. one call site forgetting to lowercase — means a real
 * dedicated-by-email gift silently fails to match its own claim.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * `sha256(normalizeEmail(email))`, matching the on-chain program's
 * documented construction (see `recipient_email_hash`'s doc comment in
 * anchor/programs/chainstock/src/state.rs: "A commitment (e.g.
 * sha256(lowercased email))"). Built on Web Crypto (`crypto.subtle`)
 * rather than Node's `crypto` module so this one implementation runs
 * unchanged in both the browser (client-side transaction building) and
 * Next.js API routes (server-side verification) — the two environments
 * that need to agree on this hash.
 */
export async function hashEmail(email: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(normalizeEmail(email));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return new Uint8Array(digest);
}

/** Hex-encoded `hashEmail`, for contexts that want a string (logging,
 *  JSON, off-chain storage) rather than raw bytes. */
export async function hashEmailHex(email: string): Promise<string> {
  const digest = await hashEmail(email);
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}
