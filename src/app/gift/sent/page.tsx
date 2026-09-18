import type { Metadata } from "next";
import { Suspense } from "react";
import { Loader } from "@/components/Loader";
import { Container } from "@/components/ui/Container";
import { GiftSentClient } from "./GiftSentClient";

// Kept to just "ChainStock" (not "Gift sent! — ChainStock") for the same
// reason as /gift: a wallet's connect prompt shows document.title
// verbatim as the site name, and a longer title truncates there
// ("Gift sent! — StockPa..."). Client-side back/forward navigation
// between this page and /gift can also leave whichever title was set
// last, so every route a wallet flow can touch (directly or via
// navigation history) needs to stay this short — not just the one
// route where the connect button actually lives.
export const metadata: Metadata = {
  title: "ChainStock",
  description: "Your gift is on its way — share the claim link with your friend.",
};

export default function GiftSentPage() {
  // GiftSentClient reads the `?id=` query param via useSearchParams(),
  // which Next.js requires to sit under a Suspense boundary (otherwise
  // the whole route bails out of static rendering with a build warning).
  return (
    <Suspense
      fallback={
        <Container>
          <Loader label="Preparing your gift…" />
        </Container>
      }
    >
      <GiftSentClient />
    </Suspense>
  );
}
