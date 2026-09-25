import type { Metadata } from "next";
import { fontDisplay, fontBody, fontTicker } from "@/lib/fonts";
import { SolanaWalletProvider } from "@/components/providers/SolanaWalletProvider";
import { PrivyClientProvider } from "@/components/providers/PrivyClientProvider";
import { LegalGateProvider } from "@/components/legal/LegalGateProvider";
import { DevnetBanner } from "@/components/DevnetBanner";
import { StructuredData, SITE_DESCRIPTION } from "@/components/StructuredData";
import { getSiteUrl } from "@/lib/site";
import "./globals.css";

/**
 * `metadataBase` resolves every relative OG/Twitter image URL this app
 * emits (the `opengraph-image.tsx`/`twitter-image.tsx` files throughout
 * `src/app/`) into an absolute one — required for link-preview cards to
 * work on Twitter/Slack/iMessage/etc., which won't fetch a relative
 * path. See `getSiteUrl`'s doc comment for the env var this reads.
 */
export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "ChainStock",
  description: SITE_DESCRIPTION,
  openGraph: {
    title: "ChainStock",
    description: SITE_DESCRIPTION,
    siteName: "ChainStock",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ChainStock",
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontDisplay.variable} ${fontBody.variable} ${fontTicker.variable}`}
    >
      <body>
        <StructuredData />
        <DevnetBanner />
        <PrivyClientProvider appId={process.env.PRIVY_APP_ID}>
          <SolanaWalletProvider>
            <LegalGateProvider>{children}</LegalGateProvider>
          </SolanaWalletProvider>
        </PrivyClientProvider>
      </body>
    </html>
  );
}
