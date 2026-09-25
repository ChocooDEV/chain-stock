import type { Metadata } from "next";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PitchSlideshow, type Slide } from "@/components/pitch/PitchSlideshow";
import landingShot from "../../../public/pitch/1-landing.png";
import createGiftShot from "../../../public/pitch/2-create-gift.png";
import giftSentShot from "../../../public/pitch/3-gift-sent.png";
import claimShot from "../../../public/pitch/4-claim.png";

export const metadata: Metadata = {
  title: "Pitch - ChainStock",
  description: "Send someone real, tokenized stock as a gift, just by sending a link.",
};

// Real screenshots of the running app, not mockups — same screens
// docs/demo/MANUAL.md walks through, condensed to the four that tell the
// core send -> claim story. The claim slide is the actual first real
// mainnet gift ($5 of MSTR), not staged data.
const slides: Slide[] = [
  {
    image: landingShot,
    alt: "ChainStock landing page",
    title: "Send a friend real stock",
    caption: "Like, actually real - not points, not an IOU.",
  },
  {
    image: createGiftShot,
    alt: "Create-a-gift form, picking a stock and amount",
    title: "Pick a stock, an amount, and how to send it",
    caption: "A specific wallet or email, or an open link anyone can claim first.",
  },
  {
    image: giftSentShot,
    alt: "Gift sent confirmation screen with a shareable claim link",
    title: "Get a link, right away",
    caption: "Share it however you'd send anything else - text, DM, email.",
  },
  {
    image: claimShot,
    alt: "Claim page showing a real gift of $5 of MSTR",
    title: "They claim it, even with zero SOL",
    caption: "No wallet required to start - one click and it's real stock in their account.",
  },
];

/**
 * A short, mostly-visual pitch for sharing as a standalone link (e.g. a
 * hackathon submission) - a slideshow of real screenshots doing the
 * explaining instead of a wall of text.
 */
export default function PitchPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-10 sm:py-14">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
              Send someone real stock,
              <br />
              <span className="text-coral">just by sending a link.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-lg text-ink/70">
              A quick look at how it actually works, screen by screen.
            </p>
          </div>

          <div className="mt-10">
            <PitchSlideshow slides={slides} />
          </div>

          <div className="mt-10 flex justify-center">
            <Button href="/gift" className="px-14 text-xl">
              Send a gift
            </Button>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
