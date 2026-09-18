"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

type TurnstileGlobal = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action?: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
};

/**
 * Renders via the imperative `window.turnstile.render()` API rather than
 * Turnstile's implicit `data-sitekey` div — the implicit form works for
 * plain HTML but fights React's own DOM management (Turnstile injects an
 * iframe into the div itself; a re-render can wipe or duplicate it).
 * Loads the Cloudflare script once via `next/script` (deduped
 * automatically if this component ever appears more than once) and only
 * calls `render()` once that's confirmed loaded.
 */
export function TurnstileWidget({
  siteKey,
  action,
  onVerify,
  onExpire,
}: {
  siteKey: string;
  action: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(
    () => typeof window !== "undefined" && "turnstile" in window,
  );

  useEffect(() => {
    const turnstile = (window as unknown as { turnstile?: TurnstileGlobal }).turnstile;
    if (!scriptLoaded || !turnstile || !containerRef.current || widgetIdRef.current) {
      return;
    }
    widgetIdRef.current = turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action,
      callback: onVerify,
      "expired-callback": onExpire,
    });
    return () => {
      if (widgetIdRef.current) {
        turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callbacks
    // are expected to be stable per mount; re-rendering the widget on
    // every callback identity change would reset the challenge the user
    // is mid-solving.
  }, [scriptLoaded, siteKey, action]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onReady={() => setScriptLoaded(true)}
      />
      <div ref={containerRef} />
    </>
  );
}
