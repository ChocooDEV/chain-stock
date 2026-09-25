import type { Metadata } from "next";
import Image from "next/image";
import { Logo } from "@/components/Logo";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { SparkBurst } from "@/components/SparkBurst";
import rallyLost from "../../public/mascot/rally-404.png";

export const metadata: Metadata = {
  title: "Page not found - ChainStock",
};

/**
 * Next.js's global 404 (any unmatched route renders this, App Router
 * convention) — a real page rather than redirecting to "/", since a
 * silent redirect hides that anything went wrong at all (a stale/typo'd
 * claim link just bounces to the landing page with no explanation). See
 * docs/Mascot.md's "lost/confused" pose for why Rally reads as
 * cheerfully lost here, not distressed.
 */
export default function NotFound() {
  return (
    <div className="pb-20 pt-16 sm:pt-20">
      <Container>
        <div className="mx-auto max-w-xl text-center">
          <div className="relative flex justify-center">
            <div
              aria-hidden
              className="absolute bottom-1 h-5 w-32 rounded-full bg-ink/30 blur-lg sm:w-40"
            />
            <Logo variant="header" />
          </div>

          <div className="relative mt-8 inline-block">
            <SparkBurst variant="fan-sm" />
            <h1 className="font-display text-5xl font-bold sm:text-6xl">
              Lost the thread?
            </h1>
          </div>
          <p className="mt-4 text-lg text-ink/70">
            We couldn&rsquo;t find that page... the link might be old, or a
            letter went astray somewhere
          </p>

          <div className="relative mx-auto mt-10 w-56 sm:w-72">
            <Image
              src={rallyLost}
              alt=""
              aria-hidden
              priority
              className="w-full drop-shadow-[0_20px_25px_rgba(33,27,29,0.25)]"
            />
          </div>

          <div className="mt-10">
            <Button href="/" className="px-10 py-4 text-lg">
              Back home
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
}
