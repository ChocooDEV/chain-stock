"use client";

import Image, { type StaticImageData } from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type Slide = {
  image: StaticImageData;
  alt: string;
  title: string;
  caption: string;
};

/**
 * A real product walkthrough, not a stock deck — every image is an
 * actual screenshot of the running app (the claim slide is the real
 * first mainnet gift, $5 of MSTR), the same way docs/demo/MANUAL.md
 * documents each screen, just condensed to the handful that tell the
 * core gift -> claim story and presented one at a time instead of a
 * long scrolling page.
 */
export function PitchSlideshow({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);
  const slide = slides[index];

  const goTo = (next: number) => setIndex((next + slides.length) % slides.length);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="overflow-hidden rounded-3xl border border-ink/10 bg-white shadow-sm">
        <div className="relative flex aspect-[16/11] items-center justify-center bg-cloud">
          <Image
            src={slide.image}
            alt={slide.alt}
            className="h-full w-full object-cover object-top"
            priority={index === 0}
          />
        </div>
        <div className="p-6 text-center sm:p-8">
          <p className="font-display text-xl font-bold sm:text-2xl">{slide.title}</p>
          <p className="mt-2 text-ink/70">{slide.caption}</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-6">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          aria-label="Previous slide"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 bg-white text-ink/70 transition hover:border-ink/30 hover:text-ink"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>

        <div className="flex gap-2">
          {slides.map((s, i) => (
            <button
              key={s.title}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index}
              className={`h-2 w-2 rounded-full transition-all ${
                i === index ? "w-6 bg-coral" : "bg-ink/20 hover:bg-ink/40"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => goTo(index + 1)}
          aria-label="Next slide"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 bg-white text-ink/70 transition hover:border-ink/30 hover:text-ink"
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
