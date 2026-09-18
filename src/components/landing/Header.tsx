"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { ProfileButton } from "@/components/landing/ProfileButton";

/** How far the page needs to scroll before the header picks up its
 *  scrolled treatment — a little past where the hero's ticker strip sits,
 *  so it doesn't flicker on a one-pixel scroll. */
const SCROLL_THRESHOLD_PX = 24;

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 py-4 transition-[background-color,box-shadow,backdrop-filter] duration-300 ${
        scrolled
          ? "bg-cloud/80 shadow-sm backdrop-blur-md"
          : "bg-transparent"
      }`}
    >
      <Container>
        <div className="flex items-center justify-between gap-4">
          <Logo />
          <a
            href="#how-it-works"
            className="group relative hidden font-display font-medium text-ink/80 hover:text-ink sm:block"
          >
            How it works
            <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-coral transition-all duration-300 group-hover:w-full" />
          </a>
          <ProfileButton />
          <Button href="/gift" className="px-5 py-2.5 text-sm">
            Send a gift
          </Button>
        </div>
      </Container>
    </header>
  );
}
