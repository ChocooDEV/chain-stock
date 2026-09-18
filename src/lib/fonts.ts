import localFont from "next/font/local";

/**
 * Display face — headlines, hero numbers, gift amounts. Never used for small
 * data labels; see Fonts.md for the role split.
 */
export const fontDisplay = localFont({
  src: "../../public/fonts/fredoka/Fredoka-Variable.ttf",
  variable: "--font-fredoka",
  weight: "300 700",
  display: "swap",
});

/** Body face — copy, amounts in tables, confirmations. Tabular figures on. */
export const fontBody = localFont({
  src: "../../public/fonts/inter/Inter-Variable.ttf",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

/**
 * Ticker-texture face — symbol chips, torn-strip headers, small printed
 * price tickers only. Never a hero face; see Design.md.
 */
export const fontTicker = localFont({
  src: [
    {
      path: "../../public/fonts/space-mono/SpaceMono-Regular.ttf",
      weight: "400",
    },
    {
      path: "../../public/fonts/space-mono/SpaceMono-Bold.ttf",
      weight: "700",
    },
  ],
  variable: "--font-space-mono",
  display: "swap",
});
