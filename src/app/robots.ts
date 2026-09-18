import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

/**
 * Standard search-engine crawling rules — doesn't affect the share-card
 * feature elsewhere in the app. Social-preview bots (Twitterbot,
 * facebookexternalhit, Slackbot) fetch a page's OG/Twitter meta tags
 * directly to build a link preview and don't respect `robots.txt`; this
 * file only controls what Google/Bing/etc. crawl and index.
 *
 * Only `/` and `/gift` are allowed — a claim link is meant to be shared
 * with one specific recipient via its own link, not discovered through
 * search, and `/history`/`/gift/sent` both show a connected wallet's own
 * data. `/api/` is never content worth indexing.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/gift"],
      disallow: ["/gift/sent", "/claim/", "/history", "/api/"],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
