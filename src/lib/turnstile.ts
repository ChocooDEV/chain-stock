/** Shared between the client widget and the server's siteverify check
 *  (src/app/api/captcha/verify/route.ts) so the two `action` strings
 *  can't drift apart — Cloudflare's siteverify response echoes back
 *  whatever action the widget was rendered with, and the backend must
 *  check it matches what it expected. */
export const TURNSTILE_ACTION_CLAIM_FCFS = "claim-fcfs";
