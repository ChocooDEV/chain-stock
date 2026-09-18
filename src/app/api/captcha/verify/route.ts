import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api/gifts";
import { getClientIp, hashIp } from "@/lib/api/ipHash";
import { isValidSolanaAddress } from "@/lib/solana/address";
import { recordCaptchaVerification } from "@/lib/db/queries";
import { TURNSTILE_ACTION_CLAIM_FCFS } from "@/lib/turnstile";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type SiteverifyResponse = {
  success: boolean;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
};

/**
 * Verifies a completed Turnstile challenge from the claim page's FCFS
 * anti-bot widget (docs/App.md's FCFS section) and records the pass in
 * `claim_attempts`. `prepare-claim` (not built yet — needs the deployed
 * program) will check for a recent verified row here before proceeding
 * for `fcfs` mode; this route's own job ends at "was this token real."
 *
 * Never trust a client-reported "verified" boolean — the whole point of
 * server-side siteverify is that only Cloudflare and this backend (which
 * holds the secret key) can confirm a token actually passed the
 * challenge. The token itself is single-use; Cloudflare rejects replay.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : null;
  const claimSeed = typeof body?.claimSeed === "string" ? body.claimSeed : null;
  const walletAddress =
    typeof body?.walletAddress === "string" ? body.walletAddress : null;

  if (!token || token.length > 2048) {
    return apiError(400, "Missing or invalid captcha token");
  }
  if (!claimSeed) {
    return apiError(400, "claimSeed is required");
  }
  if (walletAddress && !isValidSolanaAddress(walletAddress)) {
    return apiError(400, "walletAddress must be a valid Solana address");
  }

  const secret = process.env.CLOUDFLARE_SECRET;
  if (!secret) {
    return apiError(500, "Turnstile is not configured on this server");
  }

  const remoteIp = getClientIp(request);

  const verifyRes = await fetch(SITEVERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret,
      response: token,
      ...(remoteIp ? { remoteip: remoteIp } : {}),
    }),
  });
  const result: SiteverifyResponse = await verifyRes.json();

  // Hostname isn't cross-checked against an allowlist here — the
  // Turnstile site key itself is already domain-restricted in the
  // Cloudflare dashboard, and this app doesn't have a fixed production
  // domain yet (still on localhost/LAN IPs during development). Revisit
  // once a real domain exists, per the Cloudflare integration guide's
  // recommendation.
  if (!result.success || result.action !== TURNSTILE_ACTION_CLAIM_FCFS) {
    return apiError(403, "Captcha verification failed");
  }

  await recordCaptchaVerification({
    claimSeed,
    walletAddress,
    ipHash: remoteIp ? hashIp(remoteIp) : null,
  });

  return NextResponse.json({ verified: true });
}
