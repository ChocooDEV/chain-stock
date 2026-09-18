import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

/**
 * Just the two stable, public pages — matches `robots.ts`'s `allow`
 * list. Per-gift claim links and per-wallet history/sent pages are
 * deliberately excluded, same reasoning as there: they're personal or
 * ephemeral, not content meant to be discovered through search.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  return [
    { url: siteUrl, changeFrequency: "monthly", priority: 1 },
    { url: `${siteUrl}/gift`, changeFrequency: "monthly", priority: 0.8 },
  ];
}
