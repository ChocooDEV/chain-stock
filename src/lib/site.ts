/**
 * The app's own public URL — used anywhere an absolute URL is required
 * (metadata's `metadataBase`, `robots.ts`, `sitemap.ts`). Reads from an
 * env var rather than hardcoding the domain so local/preview
 * deployments still resolve correctly; set `NEXT_PUBLIC_SITE_URL` to
 * `https://chain-stock.xyz` in the production environment.
 */
export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
