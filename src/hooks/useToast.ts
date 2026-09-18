"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_DURATION_MS = 3500;

export type ToastType = "error" | "info";

export type ToastState = { text: string; type: ToastType } | null;

/**
 * Minimal transient-message state for the `Toast` component — one message
 * at a time, auto-dismissed after a delay. Not a queue/context: nothing
 * in the app needs more than one caller showing a toast at once yet, so
 * this stays a plain hook rather than a global provider.
 */
export function useToast(durationMs = DEFAULT_DURATION_MS) {
  const [toast, setToast] = useState<ToastState>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => setToast(null), []);

  const showToast = useCallback(
    (text: string, type: ToastType = "error") => {
      setToast({ text, type });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setToast(null), durationMs);
    },
    [durationMs],
  );

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  return { toast, showToast, dismiss };
}
