import { createHash } from "node:crypto";

/** SHA-256 of the caller's IP — stored instead of the raw address in
 *  `claim_attempts` (anti-bot rate-limiting only, see docs/Architecture.md's
 *  Security hardening section), same privacy reasoning as not storing
 *  plaintext emails on-chain. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

/** Best-effort client IP from the headers a proxy/CDN sets — never
 *  trust this for anything beyond rate-limiting; it's guessable. */
export function getClientIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();
  return request.headers.get("x-real-ip");
}
