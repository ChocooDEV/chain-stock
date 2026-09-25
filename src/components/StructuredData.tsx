import { getSiteUrl } from "@/lib/site";

// Single source of truth for the site's one-line description — also used
// by the root layout's own metadata (title/OG/Twitter), so the two never
// drift apart.
export const SITE_DESCRIPTION = "Send a friend real stock, as easily as sending a link.";

/**
 * Site-wide JSON-LD (Organization + WebSite) — the baseline schema.org
 * markup that actually affects how Google renders rich results and how
 * AI answer engines describe the site, unlike llms.txt (checked before
 * adding either: llms.txt has negligible real-world crawler uptake as of
 * this writing, so skipped in favor of this). Rendered once in the root
 * layout, not per-page — both types describe the site as a whole.
 *
 * `@graph` combines both into one script tag rather than two separate
 * ones, sharing `@context` — standard JSON-LD shorthand for multiple
 * related entities on the same page.
 */
export function StructuredData() {
  const siteUrl = getSiteUrl();

  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "ChainStock",
        url: siteUrl,
        logo: `${siteUrl}/icon.png`,
        description: SITE_DESCRIPTION,
      },
      {
        "@type": "WebSite",
        name: "ChainStock",
        url: siteUrl,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // Static, server-built object from site config — not user input, so
      // no injection concern; JSON-LD requires raw (unescaped) content.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
