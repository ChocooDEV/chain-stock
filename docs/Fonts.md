# Fonts

Companion to [Design.md](Design.md) (design system). This doc is the standalone source of truth for actual typeface choices, downloaded font files, licensing, and usage CSS — kept independent so it can be handed to whoever builds the real screens without needing the rest of the design system as context.

Fonts were picked to match what actually rendered well across the six generated screens in [Mockup.md](Mockup.md) — the big rounded, bold, friendly headline look, plus a clean numeric-heavy body face and a small textural mono for the ticker-tape details — rather than picked in the abstract.

## Chosen typefaces

| Role (per Design.md) | Typeface | Why |
|---|---|---|
| **Display** — headlines, hero numbers, gift amounts | [Fredoka](https://fonts.google.com/specimen/Fredoka) | Rounded, bold, confident terminals — the closest free match to the friendly headline look in the mockups (`"Send a friend real stock. Like, actually real."`), and distinct from a generic display serif or a technical mono. |
| **Body** — copy, amounts in tables, confirmations | [Inter](https://fonts.google.com/specimen/Inter) | Clean humanist sans with real tabular/lining figures via OpenType (`tnum`) — needed so dollar amounts and share counts line up cleanly in the gift-history table. The most battle-tested free face for number-heavy UI. |
| **Ticker texture** — symbol chips, torn-strip headers, small printed price tickers | [Space Mono](https://fonts.google.com/specimen/Space+Mono) | A mono with actual character (slightly quirky, typewriter-esque) rather than a sterile coding-tool mono — fits the "printed ticker tape" texture concept. Used small and sparingly per Design.md, never as a hero face. |

All three are Google Fonts, licensed under the **SIL Open Font License 1.1** — free for commercial use, can be embedded/self-hosted, modified, and redistributed; attribution is appreciated but not required. Full license text is included next to each font file below.

## Files

Located under `public/fonts/` so they're served directly at `/fonts/...` (matching the CSS below) without any build step.

```
public/fonts/
  fredoka/
    Fredoka-Variable.ttf   — variable font, axes: wght (300–700), wdth
    OFL.txt
  inter/
    Inter-Variable.ttf     — variable font, axes: wght (100–900), opsz
    OFL.txt
  space-mono/
    SpaceMono-Regular.ttf
    SpaceMono-Bold.ttf
    OFL.txt
```

Fredoka and Inter are shipped as single variable-font files covering their whole weight range; Space Mono is only used at two weights so it's kept as static Regular/Bold files instead.

## Usage (as actually built)

Loaded via `next/font/local` (`src/lib/fonts.ts`), not hand-rolled `@font-face` rules — Next.js generates those itself, plus font-specific CSS variables (`--font-fredoka`, `--font-inter`, `--font-space-mono`) it injects on the `<html>` element:

```ts
// src/lib/fonts.ts
export const fontDisplay = localFont({
  src: "../../public/fonts/fredoka/Fredoka-Variable.ttf",
  variable: "--font-fredoka",
  weight: "300 700",
  display: "swap",
});
// fontBody (Inter) and fontTicker (Space Mono, two static weights) follow the same shape.
```

Role assignment (`src/app/globals.css`) maps those generated variables onto the role names this doc and Design.md actually refer to:

```css
:root {
  --font-display: var(--font-fredoka), ui-rounded, sans-serif;
  --font-body: var(--font-inter), ui-sans-serif, sans-serif;
  --font-ticker: var(--font-space-mono), ui-monospace, monospace;
}

body {
  font-family: var(--font-body);
  font-variant-numeric: tabular-nums; /* keep $ amounts/share counts aligned, app-wide */
}
```

`font-variant-numeric: tabular-nums` is set once, globally, on `body` — every Fredoka/Space Mono element sets its own `font-family` anyway, so this only ever affects the body-face (numeric-heavy) text it's meant for: the history tables' dollar amounts, share counts, gift cards.

## Open items

- Fredoka's `wdth` axis and Inter's `opsz` axis aren't pinned to specific values above — default browser behavior is fine for now; revisit if headlines look off at very large hero sizes.
- No italic weights downloaded for any of the three — not currently used anywhere in the design system.
