import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

/** Shared page shell for /terms and /privacy — plain prose pages, no
 *  hero/mascot treatment (the rest of the app's illustrated style would
 *  fight with a document someone's actually trying to read). */
export function LegalDocumentShell({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <div className="pb-20 pt-10">
      <Container>
        <div className="flex items-center justify-between gap-4">
          <Logo variant="compact" className="!h-9" />
          <Button href="/" variant="secondary" className="px-4 py-2 text-sm">
            Back home
          </Button>
        </div>

        <div className="mx-auto mt-12 max-w-2xl">
          <h1 className="font-display text-4xl font-bold sm:text-5xl">{title}</h1>
          <p className="mt-2 text-sm text-ink/50">Last updated {lastUpdated}</p>

          <div className="prose prose-ink mt-10 max-w-none space-y-8 text-ink/80 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
            {children}
          </div>
        </div>
      </Container>
    </div>
  );
}
