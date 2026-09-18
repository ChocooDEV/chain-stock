"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import tickerTexture from "../../public/textures/ticker-tape.png";

export type TickerItem = {
  symbol: string;
  direction?: "up" | "down";
  /** When provided, renders as a live price ticker ("SYMBOL ▲ $123.45")
   *  instead of the plain decorative badge ("▲ SYMBOL"). */
  price?: number;
};

const FLIP_INTERVAL_MS = 2200;

const SIZE_CLASSES = {
  // Also starts smaller on mobile, same reason as "lg" below — "sm" is
  // still wide enough to overflow a phone viewport once real prices (not
  // just a bare symbol) are attached, e.g. the gift-sent page's banner.
  sm: "gap-2 px-3 py-2 text-xs sm:gap-4 sm:px-5 sm:py-3 sm:text-sm",
  // Starts much smaller than its desktop size — at the desktop "lg" size,
  // 3 items with live prices (e.g. "SPCX ▼ $144.48") run well past a
  // phone viewport's width once you add the -rotate-2 tilt on top.
  lg: "gap-3 px-4 py-2.5 text-xs sm:gap-8 sm:px-8 sm:py-5 sm:text-lg lg:text-xl",
};

/**
 * Torn ticker-tape strip — the recurring decorative/informational texture
 * from Design.md, used on the landing hero, gift page header, claim page,
 * gift-sent confirmation, and gift-history rows. Kept deliberately
 * small/textural (Space Mono/ticker font), never the page's hero content.
 *
 * The torn-paper look comes from `ticker-tape.png` itself (real alpha-edge
 * transparency, see docs/Mascot.md) stretched to fill the container —
 * there's no CSS clip-path shape to keep in sync with the text's width.
 *
 * Two data modes:
 * - Decorative (`live` false/omitted, e.g. the landing hero): purely
 *   illustrative — every couple of seconds one random symbol flips
 *   direction/color internally, like a live stock board, with no real
 *   price data involved.
 * - Live (`live` true, e.g. the gift page's price banner): renders
 *   exactly what's passed in `items`, which the caller refreshes from a
 *   real price feed (see useLiveStocks) — this component doesn't
 *   simulate anything in that mode. Each item's arrow+text block remounts
 *   (via a key tied to its price/direction) whenever its value changes,
 *   replaying a small "blip" animation instead of swapping instantly.
 */
export function TickerStrip({
  items: initialItems,
  live = false,
  size = "sm",
  className = "",
}: {
  items: TickerItem[];
  live?: boolean;
  size?: "sm" | "lg";
  className?: string;
}) {
  const [simulated, setSimulated] = useState(initialItems);

  useEffect(() => {
    if (live) return;
    const flip = () => {
      setSimulated((current) => {
        const flippable = current
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.direction);
        if (flippable.length === 0) return current;
        const { index } =
          flippable[Math.floor(Math.random() * flippable.length)];
        return current.map((item, i) =>
          i === index
            ? { ...item, direction: item.direction === "up" ? "down" : "up" }
            : item,
        );
      });
    };
    const id = setInterval(flip, FLIP_INTERVAL_MS);
    return () => clearInterval(id);
  }, [live]);

  const items = live ? initialItems : simulated;

  return (
    <div
      className={`relative inline-flex -rotate-2 items-center drop-shadow-md ${SIZE_CLASSES[size]} ${className}`}
    >
      <Image
        src={tickerTexture}
        alt=""
        aria-hidden
        fill
        priority
        sizes="800px"
        className="-z-10 object-fill"
      />
      {items.map((item) => (
        <span
          key={`${item.symbol}-${item.price ?? item.direction ?? "flat"}`}
          className="animate-ticker-flash inline-flex items-center font-ticker font-bold tracking-tight text-ink"
        >
          {item.price !== undefined ? (
            <>
              {item.symbol}
              {item.direction && (
                <span
                  className={`relative mx-1.5 ${item.direction === "up" ? "text-gain" : "text-loss"}`}
                >
                  <span aria-hidden>{item.direction === "up" ? "▲" : "▼"}</span>
                  <span className="sr-only">{item.direction === "up" ? " up " : " down "}</span>
                </span>
              )}
              ${item.price.toFixed(2)}
            </>
          ) : (
            <>
              {item.direction && (
                <span
                  className={`relative mr-1 ${item.direction === "up" ? "text-gain" : "text-loss"}`}
                >
                  <span aria-hidden>{item.direction === "up" ? "▲" : "▼"}</span>
                  <span className="sr-only">{item.direction === "up" ? "up " : "down "}</span>
                </span>
              )}
              {item.symbol}
            </>
          )}
        </span>
      ))}
    </div>
  );
}
