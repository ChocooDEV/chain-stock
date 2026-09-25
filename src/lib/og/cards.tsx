import { ImageResponse } from "next/og";
import { getGiftByClaimSeed } from "@/lib/db/queries";
import { toClaimGift } from "@/lib/gift";
import { loadOgFont, loadPublicImageDataUri } from "@/lib/og/assets";

export const OG_SIZE = { width: 1200, height: 630 };

const INK = "#211b1d";
const INK_60 = "rgba(33, 27, 29, 0.6)";
const CLOUD = "#fbf4ec";

/**
 * Space Mono, not the app's usual Fredoka/Inter pairing — those are only
 * shipped as variable TTFs, and satori (the renderer behind
 * `next/og`'s `ImageResponse`) crashes on them (`Cannot read properties
 * of undefined (reading '256')`, a known class of satori/variable-font
 * incompatibility, not a bug in this code). Space Mono has real static
 * Regular/Bold files and is already the app's ticker/price-chip face
 * (see docs/Fonts.md), so it's a legitimate brand choice here too, not
 * just a workaround.
 */
async function loadOgFonts() {
  return Promise.all([
    loadOgFont("space-mono/SpaceMono-Bold.ttf", "Space Mono", 700),
    loadOgFont("space-mono/SpaceMono-Regular.ttf", "Space Mono", 400),
  ]);
}

/**
 * Shared card chrome (background, padding, logo) for both OG images
 * below — the only thing that differs between them is the headline
 * copy and which mascot pose sits on the right.
 */
function CardShell({
  logoDataUri,
  mascotDataUri,
  mascotWidth,
  mascotHeight,
  children,
}: {
  logoDataUri: string;
  mascotDataUri: string;
  mascotWidth: number;
  mascotHeight: number;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        background: CLOUD,
        padding: 64,
        fontFamily: "Space Mono",
      }}
    >
      <div style={{ display: "flex" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoDataUri} width={220} height={98} alt="" />
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 650 }}>
          {children}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mascotDataUri} width={mascotWidth} height={mascotHeight} alt="" />
      </div>
    </div>
  );
}

/** Generic card for any page that doesn't have its own (the homepage,
 *  /gift, /history, ...) — static content, no per-request data, so
 *  Next.js can cache the rendered PNG at build time. */
export async function renderDefaultCard(): Promise<ImageResponse> {
  const [fonts, logoDataUri, mascotDataUri] = await Promise.all([
    loadOgFonts(),
    loadPublicImageDataUri("mascot/logo-header.png", "image/png"),
    loadPublicImageDataUri("mascot/rally-waving.png", "image/png"),
  ]);

  return new ImageResponse(
    (
      <CardShell
        logoDataUri={logoDataUri}
        mascotDataUri={mascotDataUri}
        mascotWidth={330}
        mascotHeight={451}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "Space Mono",
            fontWeight: 700,
            fontSize: 72,
            lineHeight: 1.1,
            color: INK,
          }}
        >
          Send real stock, as easily as a link.
        </div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 30, color: INK_60 }}>
          Gift real, tokenized stock in seconds - no wallet required to
          claim.
        </div>
      </CardShell>
    ),
    { ...OG_SIZE, fonts },
  );
}

/** Per-gift card for a claim link — the one that actually matters most:
 *  this is the card people see when a claim link gets pasted into
 *  Twitter/Slack/iMessage, so it shows the real gift instead of generic
 *  site copy. Returns null for an unknown/stale `claim_seed` so the
 *  caller can fall back to `renderDefaultCard` rather than erroring the
 *  social-media crawler fetching this route. */
export async function renderClaimCard(claimSeed: string): Promise<ImageResponse | null> {
  const row = await getGiftByClaimSeed(claimSeed);
  if (!row) return null;
  const gift = toClaimGift(row);

  const [fonts, logoDataUri, mascotDataUri] = await Promise.all([
    loadOgFonts(),
    loadPublicImageDataUri("mascot/logo-header.png", "image/png"),
    loadPublicImageDataUri("mascot/rally-celebrating.png", "image/png"),
  ]);

  return new ImageResponse(
    (
      <CardShell
        logoDataUri={logoDataUri}
        mascotDataUri={mascotDataUri}
        mascotWidth={339}
        mascotHeight={466}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "Space Mono",
            fontWeight: 700,
            fontSize: 88,
            lineHeight: 1.05,
            color: INK,
          }}
        >
          ${gift.amountUsd} of {gift.symbol}
        </div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 32, color: INK_60 }}>
          Someone sent you real stock on ChainStock.
        </div>
      </CardShell>
    ),
    { ...OG_SIZE, fonts },
  );
}
