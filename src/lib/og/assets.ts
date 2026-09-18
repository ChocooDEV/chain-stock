import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Loads a file from `public/` as a base64 data URI, for embedding
 * directly in OG-image JSX (`<img src="data:...">`). Satori (the
 * renderer behind `next/og`'s `ImageResponse`) has no network access to
 * the app's own dev/preview server, so a relative `/mascot/...` URL
 * doesn't work here the way it does in a normal page — the bytes have
 * to be inlined.
 */
export async function loadPublicImageDataUri(
  relativePath: string,
  mime: "image/png",
): Promise<string> {
  const bytes = await readFile(path.join(process.cwd(), "public", relativePath));
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

/** Loads a font file from `public/fonts/` as the `{ name, data, weight,
 *  style }` shape `ImageResponse`'s `fonts` option expects. */
export async function loadOgFont(
  relativePath: string,
  name: string,
  weight: 400 | 500 | 600 | 700,
): Promise<{ name: string; data: Buffer; weight: 400 | 500 | 600 | 700; style: "normal" }> {
  const data = await readFile(path.join(process.cwd(), "public", "fonts", relativePath));
  return { name, data, weight, style: "normal" };
}
