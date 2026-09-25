import Link from "next/link";
import { SiX } from "react-icons/si";
import { Container } from "@/components/ui/Container";

/**
 * Landing page footer — just the two links a hackathon-stage app actually
 * needs (Terms, and attribution), not a full sitemap. Kept separate from
 * `LegalDocumentShell` (the /terms, /privacy page wrapper), which doesn't
 * render on the landing page itself.
 */
export function Footer() {
  return (
    <footer className="border-t border-ink/10 py-8">
      <Container>
        <div className="flex flex-col items-center justify-between gap-4 text-sm text-ink/60 sm:flex-row">
          <Link href="/terms" className="hover:text-ink">
            Terms &amp; Conditions
          </Link>
          <a
            href="https://x.com/chocoo_web3"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-ink"
          >
            Made by Chocoo
            <SiX className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>
      </Container>
    </footer>
  );
}
