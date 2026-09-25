"use client";

import { useEffect, useState } from "react";
import { TurnstileWidget } from "@/components/claim/TurnstileWidget";

type CaptchaStatus = "pending" | "verifying" | "verified" | "error";

const HOLD_AFTER_VERIFIED_MS = 500;
const FADE_MS = 300;

/**
 * Full-screen blurred overlay for the FCFS anti-bot check (docs/App.md's
 * FCFS section) — an inline checkbox wedged between the amount and the
 * Claim button read as an afterthought, and blocking the whole page
 * behind a blur makes "you must clear this before claiming" obvious
 * without extra copy. The backdrop blurs what's behind it rather than
 * hiding it, so the claim details stay visible (if illegible) the whole
 * time, then sharpen the moment this unmounts.
 *
 * Stays mounted for a beat after `status` flips to "verified" (so the
 * widget's own checkmark is visible) before fading out and unmounting —
 * disappearing instantly on success would read as a glitch, not a pass.
 */
export function CaptchaOverlay({
  siteKey,
  action,
  status,
  onVerify,
  onExpire,
}: {
  siteKey: string;
  action: string;
  status: CaptchaStatus;
  onVerify: (token: string) => void;
  onExpire: () => void;
}) {
  const [mounted, setMounted] = useState(true);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    if (status !== "verified") return;
    const fadeTimer = setTimeout(() => setFadingOut(true), HOLD_AFTER_VERIFIED_MS);
    const unmountTimer = setTimeout(
      () => setMounted(false),
      HOLD_AFTER_VERIFIED_MS + FADE_MS,
    );
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
    };
  }, [status]);

  if (!mounted) return null;

  return (
    <div
      role="dialog"
      aria-label="Security check"
      className={`fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-md transition-opacity duration-300 ${
        fadingOut ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="mx-4 flex flex-col items-center gap-4 rounded-3xl border border-ink/10 bg-white px-8 py-10 text-center shadow-lg">
        <div>
          <p className="font-display text-xl font-bold">Quick security check</p>
          <p className="mt-1 text-sm text-ink/60">
            Confirming you&rsquo;re not a bot before you claim.
          </p>
        </div>
        <TurnstileWidget
          siteKey={siteKey}
          action={action}
          onVerify={onVerify}
          onExpire={onExpire}
        />
        {status === "error" && (
          <p className="text-sm text-loss">
            Verification failed - try the check again.
          </p>
        )}
      </div>
    </div>
  );
}
