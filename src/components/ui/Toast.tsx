"use client";

import { AlertCircle, Info, X } from "lucide-react";
import type { ToastState, ToastType } from "@/hooks/useToast";

const ICON_CLASSES: Record<ToastType, string> = {
  error: "text-coral",
  info: "text-teal",
};

/**
 * Single transient message, bottom-center — paired with `useToast`. Kept
 * to the app's existing card language (rounded-2xl, soft shadow) rather
 * than introducing a new visual style, just inverted (ink background) so
 * it reads as an overlay rather than another page card. `type` picks the
 * icon/accent color — "error" for validation failures, "info" for
 * confirmations like "Link copied" (which isn't an error and shouldn't
 * look like one).
 */
export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastState;
  onDismiss: () => void;
}) {
  if (!toast) return null;
  const Icon = toast.type === "info" ? Info : AlertCircle;

  return (
    <div
      role={toast.type === "error" ? "alert" : "status"}
      aria-live={toast.type === "error" ? "assertive" : "polite"}
      aria-atomic="true"
      className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
    >
      <div className="animate-toast-in flex items-center gap-3 rounded-2xl bg-ink px-5 py-3 text-cloud shadow-lg">
        <Icon className={`h-5 w-5 shrink-0 ${ICON_CLASSES[toast.type]}`} aria-hidden />
        <p className="text-sm font-medium">{toast.text}</p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="text-cloud/50 transition hover:text-cloud"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
