"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

/**
 * Full-screen blurred overlay gating the first send/claim (see
 * `LegalGateProvider`) — same visual language as `CaptchaOverlay`
 * (blur what's behind rather than hide it, rounded white card) so the
 * two "you must clear this before continuing" moments in the app read
 * as one consistent pattern, not two different UI languages.
 */
export function LegalAcceptanceModal({
  onAccept,
  onDecline,
}: {
  onAccept: () => void;
  onDecline: () => void;
}) {
  const [checked, setChecked] = useState(false);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-md"
    >
      <div className="w-full max-w-sm rounded-3xl border border-ink/10 bg-white px-8 py-10 text-center shadow-lg">
        <p id="legal-modal-title" className="font-display text-xl font-bold">
          Before you continue
        </p>
        <p className="mt-2 text-sm text-ink/60">
          ChainStock moves real on-chain funds. Please read and agree to our{" "}
          <Link href="/terms" target="_blank" className="font-semibold text-teal underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" target="_blank" className="font-semibold text-teal underline">
            Privacy Policy
          </Link>{" "}
          before sending or claiming a gift.
        </p>

        <label className="mt-6 flex items-start gap-3 rounded-xl bg-cloud p-3 text-left text-sm text-ink/80">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => setChecked(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-teal"
          />
          I have read and agree to the Terms of Service and Privacy Policy.
        </label>

        <div className="mt-6 flex flex-col gap-3">
          <Button
            type="button"
            onClick={onAccept}
            disabled={!checked}
            className="w-full px-6 py-3 text-base"
          >
            Agree &amp; continue
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onDecline}
            className="w-full px-6 py-3 text-base"
          >
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}
