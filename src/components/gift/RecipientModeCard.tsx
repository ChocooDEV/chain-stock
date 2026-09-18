"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Link2, Mail } from "lucide-react";
import { SparkBurst } from "@/components/SparkBurst";
import type { RecipientMode } from "@/hooks/useGiftDraft";

const COPY: Record<
  RecipientMode,
  {
    icon: typeof Mail;
    title: string;
    description: string;
    iconClassName: string;
  }
> = {
  specific: {
    icon: Mail,
    title: "Send to someone specific",
    description: "Enter a Solana wallet address or email address.",
    iconClassName: "rotate-12 text-gold",
  },
  fcfs: {
    icon: Link2,
    title: "Anyone can claim",
    description: "Generates a first-come-first-served link.",
    iconClassName: "text-teal",
  },
};

/**
 * Step 3 of the create-gift form: dedicated-recipient vs. FCFS-link mode
 * (see docs/App.md and docs/Architecture.md's `recipient_mode`). The FCFS
 * side shows a placeholder link, not a real one — an actual claim link
 * only exists once `create_gift` has been sent on-chain, which isn't
 * wired up yet.
 */
export function RecipientModeCard({
  mode,
  active,
  onSelect,
  children,
}: {
  mode: RecipientMode;
  active: boolean;
  onSelect: () => void;
  children?: React.ReactNode;
}) {
  const { icon: Icon, title, description, iconClassName } = COPY[mode];

  // Reshakes the icon every time this card newly becomes the active one —
  // not on mount (the default mode shouldn't shake immediately), and not
  // while it stays active (clicking an already-selected card is a no-op
  // mode change). A CSS animation only replays via a state change like
  // hover; selecting can happen via click or keyboard, so instead a
  // "shake count" bumps on each true activation and remounts the icon
  // (via `key`) to replay the animation from scratch.
  const [shakeCount, setShakeCount] = useState(0);
  const wasActive = useRef(active);
  useEffect(() => {
    if (active && !wasActive.current) {
      setShakeCount((count) => count + 1);
    }
    wasActive.current = active;
  }, [active]);

  // A plain <button> can't be used here — `children` includes a real
  // <input> in the "specific" card, and interactive elements can't nest
  // inside a <button> (invalid HTML). A div with `role="radio"` gets the
  // same click/keyboard-activation semantics without that constraint,
  // and matches the mutually-exclusive nature of these two cards (see
  // the radiogroup wrapper in GiftForm).
  return (
    <div
      role="radio"
      aria-checked={active}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`relative flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 px-5 py-6 text-center transition-colors ${
        active ? "border-teal bg-teal/5" : "border-ink/10 bg-white hover:border-ink/20"
      }`}
    >
      <span
        aria-hidden
        className={`absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border-2 ${
          active ? "border-teal bg-teal text-white" : "border-ink/20"
        }`}
      >
        {active && <Check className="h-4 w-4" strokeWidth={3} />}
      </span>

      <span
        key={shakeCount}
        className={`relative inline-block ${shakeCount > 0 ? "animate-shake" : ""}`}
      >
        <SparkBurst variant="fan-sm" />
        <Icon className={`h-8 w-8 ${iconClassName}`} aria-hidden />
      </span>
      <span className="font-display text-base font-bold">{title}</span>
      <span className="text-sm text-ink/70">{description}</span>

      {children}
    </div>
  );
}
