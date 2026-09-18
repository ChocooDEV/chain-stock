"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Container } from "@/components/ui/Container";
import iconStock from "../../../public/icons/landing_stock.png";
import iconClaim from "../../../public/icons/landing_claim.png";
import iconRedeem from "../../../public/icons/landing_redeem.png";

type Feature = {
  icon: typeof iconStock;
  alt: string;
  text: string;
};

const features: Feature[] = [
  {
    icon: iconStock,
    alt: "",
    text: "Own real stock, not points.",
  },
  {
    icon: iconClaim,
    alt: "",
    text: "Claim with just an email.",
  },
  {
    icon: iconRedeem,
    alt: "",
    text: "Redeem to real shares, anytime.",
  },
];

export function FeatureGrid() {
  const gridRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    // Respect reduced-motion, and skip the observer dance entirely if the
    // grid is already on screen at mount (a tall viewport, or landing
    // directly on #how-it-works) — no point animating what's already visible.
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !gridRef.current
    ) {
      setRevealed(true);
      return;
    }

    const el = gridRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="how-it-works" className="py-12 sm:py-16">
      <Container>
        <div ref={gridRef} className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {features.map(({ icon, alt, text }, index) => (
            <div
              key={text}
              className={`flex items-center gap-4 transition-all duration-500 ease-out ${
                revealed ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Fixed-width slot so text starts at the same x position across
                  rows despite the three icons having different aspect ratios —
                  matters on mobile where the grid stacks into one column.
                  hover/active trigger a quick wiggle as playful feedback. */}
              <div className="flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center hover:animate-shake active:animate-shake">
                {/* decorative — the feature text already conveys the meaning */}
                <Image src={icon} alt={alt} className="h-full w-full object-contain" />
              </div>
              <p className="font-display text-lg font-semibold">{text}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
