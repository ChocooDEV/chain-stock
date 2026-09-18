"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { User } from "lucide-react";

/**
 * Entry point to /history (docs/App.md's "Gift history" section) — same
 * single-CTA pattern as the claim page's "Claim gift" button: one click,
 * not a separate "connect" step first. If already authenticated it jumps
 * straight to /history; otherwise it opens Privy's login modal and,
 * once that resolves, continues the redirect itself rather than making
 * the person click again.
 */
export function ProfileButton() {
  const router = useRouter();
  const { ready, authenticated, login } = usePrivy();
  const [awaitingLogin, setAwaitingLogin] = useState(false);

  useEffect(() => {
    if (awaitingLogin && authenticated) {
      router.push("/history");
    }
  }, [awaitingLogin, authenticated, router]);

  const handleClick = () => {
    if (!ready) return;
    if (authenticated) {
      router.push("/history");
      return;
    }
    setAwaitingLogin(true);
    login();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!ready}
      aria-label="Your gifts"
      className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 text-ink/70 transition hover:border-ink/30 hover:text-ink disabled:opacity-50"
    >
      <User className="h-5 w-5" aria-hidden />
    </button>
  );
}
