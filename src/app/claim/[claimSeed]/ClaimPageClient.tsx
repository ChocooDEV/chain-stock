"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Loader } from "@/components/Loader";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { SparkBurst } from "@/components/SparkBurst";
import { TickerStrip } from "@/components/TickerStrip";
import { ClaimUnwrap } from "@/components/claim/ClaimUnwrap";
import { CaptchaOverlay } from "@/components/claim/CaptchaOverlay";
import { useLiveStocks } from "@/hooks/useLiveStocks";
import { useToast } from "@/hooks/useToast";
import type { ClaimGift } from "@/lib/gift";
import { formatShares } from "@/lib/shares";
import { toTickerItem } from "@/lib/stocks";
import { TURNSTILE_ACTION_CLAIM_FCFS } from "@/lib/turnstile";
import rallyCelebrating from "../../../../public/mascot/rally-celebrating.png";

/**
 * Claim screen (docs/mockup/claim.png) — UI only for now, same phase as
 * the create-gift page: authentication is real (Privy), the claim
 * transaction itself isn't wired yet (claiming just navigates straight
 * to the post-claim page once authenticated).
 *
 * Deliberately ONE "Claim gift" button, not the mockup's three ("Connect
 * wallet" / "Sign up to claim" / "Claim gift") — docs/App.md decided
 * against that explicitly: "a single 'Claim' CTA... if the recipient
 * isn't logged in yet, clicking it routes them into the wallet-connect /
 * Privy sign-up step first, then completes the claim automatically once
 * that's done." Privy's own login() modal already offers both connecting
 * an existing wallet and email/social sign-up in one place, so a second
 * and third button on this page would just duplicate what that modal
 * already does.
 *
 * FCFS gifts additionally require a Turnstile check (docs/App.md's FCFS
 * anti-bot section) before the Claim button unlocks — dedicated gifts
 * skip it entirely, since wallet/email identity already gates those. The
 * check itself renders as a full-screen blurred overlay
 * (`CaptchaOverlay`) rather than inline in the page, so the gate reads
 * as a deliberate step rather than a stray checkbox in the layout.
 */
export function ClaimPageClient({
  gift,
  turnstileSiteKey,
}: {
  gift: ClaimGift;
  turnstileSiteKey: string | undefined;
}) {
  const router = useRouter();
  const { ready, authenticated, login } = usePrivy();
  const { stocks, loading } = useLiveStocks();
  const { toast, showToast, dismiss: dismissToast } = useToast();
  const [claiming, setClaiming] = useState(false);

  // FCFS-only anti-bot check (docs/App.md's FCFS section) — dedicated
  // gifts already have identity verification via wallet/email, so
  // there's nothing for a CAPTCHA to add there. `needsCaptcha` stays
  // false (fails open, not closed) if `turnstileSiteKey` wasn't
  // configured — same convention as `PrivyClientProvider`'s missing-appId
  // fallback: a missing dev credential degrades gracefully with a
  // console warning rather than blocking the whole page.
  const needsCaptcha = gift.recipientMode === "fcfs" && !!turnstileSiteKey;
  const [captchaStatus, setCaptchaStatus] = useState<
    "pending" | "verifying" | "verified" | "error"
  >("pending");

  if (gift.recipientMode === "fcfs" && !turnstileSiteKey && process.env.NODE_ENV !== "production") {
    console.warn(
      "CLOUDFLARE_SITE_KEY is not set — the FCFS anti-bot check won't run.",
    );
  }

  const stock = stocks.find((s) => s.symbol === gift.symbol) ?? null;
  const shares = stock && stock.price > 0 ? gift.amountUsd / stock.price : null;

  const bannerItems = useMemo(
    () => (stock ? [toTickerItem(stock)] : []),
    [stock],
  );

  const handleCaptchaVerify = async (token: string) => {
    setCaptchaStatus("verifying");
    try {
      const res = await fetch("/api/captcha/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, claimSeed: gift.claimSeed }),
      });
      if (!res.ok) throw new Error("verification failed");
      setCaptchaStatus("verified");
    } catch {
      setCaptchaStatus("error");
      showToast("Couldn't verify you're human — try the check again.");
    }
  };

  const handleClaim = () => {
    if (!ready) return;
    if (needsCaptcha && captchaStatus !== "verified") return;
    if (!authenticated) {
      login();
      return;
    }
    // Claim transaction wiring (claim_gift + swap, backend-co-signed for
    // no-SOL Privy wallets — see docs/Architecture.md's fee-payer
    // section) comes next; this is the point where it plugs in, before
    // the unwrap animation below. For now the animation fires as soon as
    // authenticated, same UI-first phase as the rest of this flow.
    setClaiming(true);
  };

  if (loading) {
    return (
      <Container>
        <Loader label="Fetching your gift…" />
      </Container>
    );
  }

  return (
    <div className="pb-20 pt-16 sm:pt-20">
      <Container>
        <div className="mx-auto max-w-xl text-center">
          {bannerItems.length > 0 && (
            <div className="flex justify-center">
              {/* No extra rotate here — TickerStrip already rotates itself
                  internally (`-rotate-2`), so this wrapper only exists to
                  give SparkBurst a shrink-wrapped anchor to position against. */}
              <div className="relative inline-block">
                <SparkBurst variant="fan-sm" />
                <TickerStrip items={bannerItems} live />
              </div>
            </div>
          )}

          <h1 className="mt-8 font-display text-5xl font-bold sm:text-6xl">
            ${gift.amountUsd} of {gift.symbol}
          </h1>
          {shares !== null && (
            <p className="mt-3 text-lg text-ink/60">
              ≈ {formatShares(shares)} shares at today&rsquo;s price.
            </p>
          )}

          <div className="relative mt-8 inline-block">
            <SparkBurst />
            <Button
              type="button"
              onClick={handleClaim}
              disabled={!ready || claiming || (needsCaptcha && captchaStatus !== "verified")}
              className="px-16 py-5 text-xl"
            >
              Claim gift
            </Button>
          </div>

          <div className="relative mx-auto mt-12 w-64 sm:w-80">
            <Image
              src={rallyCelebrating}
              alt=""
              aria-hidden
              priority
              className="w-full drop-shadow-[0_20px_25px_rgba(33,27,29,0.25)]"
            />
          </div>
        </div>
      </Container>

      {claiming && (
        <ClaimUnwrap
          symbol={gift.symbol}
          amountUsd={gift.amountUsd}
          logoUrl={stock?.logoUrl ?? null}
          shares={shares}
          onDone={() => router.push(`/claim/${gift.claimSeed}/success`)}
        />
      )}

      {needsCaptcha && (
        <CaptchaOverlay
          siteKey={turnstileSiteKey!}
          action={TURNSTILE_ACTION_CLAIM_FCFS}
          status={captchaStatus}
          onVerify={handleCaptchaVerify}
          onExpire={() => setCaptchaStatus("pending")}
        />
      )}

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
