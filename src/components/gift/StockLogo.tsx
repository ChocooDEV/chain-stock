"use client";

import { useState } from "react";
import Image from "next/image";
import { TrendingUp } from "lucide-react";

/**
 * Backpack's per-symbol logos (proxied through wsrv.nl, see lib/stocks.ts)
 * aren't 100% reliable — e.g. INTC's consistently 404s through the proxy
 * even though the source SVG itself is fine. Falls back to a plain
 * placeholder on load failure instead of showing a broken-image icon.
 */
export function StockLogo({
  src,
  alt = "",
  size = 40,
}: {
  src: string;
  alt?: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        aria-hidden
        style={{ width: size, height: size }}
        className="flex shrink-0 items-center justify-center rounded-full bg-ink/10 text-ink/30"
      >
        <TrendingUp style={{ width: size * 0.5, height: size * 0.5 }} />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      unoptimized
      onError={() => setFailed(true)}
      style={{ width: size, height: size }}
      className="shrink-0 rounded-full bg-cloud object-contain"
    />
  );
}
