"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { StockLogo } from "@/components/gift/StockLogo";
import { formatShares } from "@/lib/shares";
import rallyCelebrating from "../../../public/mascot/rally-celebrating.png";

const SKIP_DELAY_MS = 900;
const HOLD_MS = 2300;

const PARTICLE_COUNT = 28;
const PARTICLE_COLORS = ["bg-coral", "bg-gold", "bg-teal"];

type Particle = {
  id: number;
  colorClass: string;
  tx: number;
  ty: number;
  rot: number;
  delayMs: number;
};

function useConfettiParticles(): Particle[] {
  return useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => {
        const angle = (360 / PARTICLE_COUNT) * i + (Math.random() * 18 - 9);
        const distance = 90 + Math.random() * 170;
        const rad = (angle * Math.PI) / 180;
        return {
          id: i,
          colorClass: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
          tx: Math.cos(rad) * distance,
          ty: Math.sin(rad) * distance,
          rot: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 360),
          delayMs: Math.random() * 150,
        };
      }),
    [],
  );
}

/**
 * The app's one deliberately orchestrated animation (docs/Design.md's
 * "one big motion moment" principle) — fires once, right when a gift is
 * actually claimed, then reveals the post-claim page underneath.
 * Everything else in the product stays static on purpose.
 *
 * Built from code (particles/rays/a card reveal) rather than a pre-shot
 * video: the overlay's background matches the page's own Cloud tone
 * exactly, so it composites with zero visible seam — a real transparent
 * video would need either alpha-channel encoding (unreliable browser
 * support) or a precisely color-matched backdrop baked into the footage,
 * neither of which the current mascot clip has (it was shot on solid
 * black). Rally himself is the existing `rally-celebrating.png`, which
 * already has real alpha transparency (see docs/Mascot.md's background-
 * removal pipeline), so he composites cleanly without any of that.
 *
 * Layout note: the rays/flash/confetti layers are `position: absolute`,
 * which takes them out of the flex flow below — they're centered
 * explicitly (`top-1/2 left-1/2` plus a fixed negative margin) rather
 * than relying on the flex container's `items-center`, which only
 * applies to in-flow children. Getting this wrong is exactly the bug
 * that shipped in this app's `sr-only` labels earlier: an absolutely
 * positioned element with no positioned ancestor/no explicit offset
 * doesn't go where you'd expect.
 *
 * Exit note: `onDone` (the caller's `router.push` to the success page) is
 * called immediately when the sequence ends, with no self-managed fade
 * first. Fading this overlay's own opacity down would only reveal
 * whatever's still mounted *underneath* it — the stale claim page, since
 * navigation hasn't happened yet — which is exactly the bug an earlier
 * version of this component had (a visible flash of the pre-claim screen
 * right before the success page appeared). Calling `onDone` first and
 * otherwise doing nothing lets this component keep rendering its settled
 * end state, harmlessly, for however long Next takes to swap in the new
 * route, however long that is — it disappears the instant that swap
 * happens, never earlier.
 */
export function ClaimUnwrap({
  symbol,
  amountUsd,
  logoUrl,
  shares,
  onDone,
}: {
  symbol: string;
  amountUsd: number;
  logoUrl: string | null;
  shares: number | null;
  onDone: () => void;
}) {
  const particles = useConfettiParticles();
  const doneRef = useRef(false);
  const [showSkip, setShowSkip] = useState(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish();
      return;
    }

    const skipTimer = setTimeout(() => setShowSkip(true), SKIP_DELAY_MS);
    const holdTimer = setTimeout(finish, HOLD_MS);

    return () => {
      clearTimeout(skipTimer);
      clearTimeout(holdTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="dialog"
      aria-label="Claiming your gift"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-cloud"
    >
      {/* Ambient light rays, rotating slowly behind everything else. */}
      <div
        aria-hidden
        className="animate-ray-spin absolute left-1/2 top-1/2 h-[150vmax] w-[150vmax] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "repeating-conic-gradient(from 0deg, rgba(244,183,64,0.28) 0deg 5deg, transparent 5deg 26deg)",
          filter: "blur(2px)",
        }}
      />

      {/* Impact flash, dead center, once. */}
      <div
        aria-hidden
        className="animate-flash-pulse absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold sm:h-56 sm:w-56"
        style={{ filter: "blur(4px)" }}
      />

      {/* Confetti burst — each particle gets its own trajectory via CSS
          custom properties, all sharing one keyframe (see globals.css).
          Centered via top/left + a fixed margin offset (half its own
          size) rather than `transform`, since the animation itself
          drives `transform` for the outward flight. */}
      {particles.map((p) => (
        <span
          key={p.id}
          aria-hidden
          className={`animate-confetti-fly absolute left-1/2 top-1/2 h-2 w-3.5 -ml-[7px] -mt-1 rounded-sm ${p.colorClass}`}
          style={
            {
              "--confetti-tx": `${p.tx}px`,
              "--confetti-ty": `${p.ty}px`,
              "--confetti-rot": `${p.rot}deg`,
              animationDelay: `${p.delayMs}ms`,
            } as React.CSSProperties
          }
        />
      ))}

      {/* The prize card — the same info shown on the pre-claim screen,
          now presented as the payoff rather than a preview. */}
      <div className="animate-card-pop relative flex flex-col items-center gap-3 overflow-hidden rounded-3xl border border-ink/10 bg-white px-10 py-8 shadow-lg">
        <div
          aria-hidden
          className="animate-shine-sweep pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white to-transparent"
          style={{ animationDelay: "550ms" }}
        />
        {logoUrl && <StockLogo src={logoUrl} size={56} />}
        <p className="font-display text-3xl font-bold sm:text-4xl">
          ${amountUsd} of {symbol}
        </p>
        {shares !== null && (
          <p className="text-ink/60">
            ≈ {formatShares(shares)} shares, right now
          </p>
        )}
      </div>

      {/* Rally, landing a beat after the card and overlapping its bottom
          edge slightly — reads as leaning in to celebrate the card,
          rather than an unrelated element floating nearby. */}
      <div
        className="animate-mascot-pop relative z-10 -mt-6 w-28 sm:w-36"
        style={{ animationDelay: "350ms" }}
      >
        <Image
          src={rallyCelebrating}
          alt=""
          aria-hidden
          priority
          className="w-full drop-shadow-[0_16px_20px_rgba(33,27,29,0.25)]"
        />
      </div>

      {showSkip && (
        <button
          type="button"
          onClick={finish}
          aria-label="Skip animation"
          className="absolute bottom-8 right-8 rounded-full border border-ink/20 px-4 py-2 text-sm font-medium text-ink/60 transition hover:border-ink/40 hover:text-ink"
        >
          Skip
        </button>
      )}
    </div>
  );
}
