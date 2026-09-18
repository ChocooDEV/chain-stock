# ChainStock — Design System & UI Spec (Working Draft)

Companion to [App.md](App.md) (product/business spec). This doc owns screens, information architecture, visual identity, and component/interaction patterns.

## References

Three sites the founder pointed to as the vibe to aim for:
- **[phantom.com](https://phantom.com/)** — confident, approachable consumer-fintech polish; friendly mascot (the ghost); big rounded headlines; trust conveyed through warmth, not corporate seriousness.
- **[sanctum.so/app](https://sanctum.so/app)** — playful, jewel-toned, gamified; a recurring character guide; "delightful"/"fun" copy tone; collectible/reward motifs; makes a financial product feel light rather than intimidating.
- **[claynosaurz.com](https://www.claynosaurz.com/)** — tactile, dimensional, clay-textured 3D character illustration; warm earth tones plus bright accents; nothing flat or generic-vector; "come as you are" inclusive, adventurous copy.

Common thread across all three: a **recurring character/mascot**, **dimensional/tactile illustration** (not flat generic icons), **warm-but-vivid color** (never dark-neon-crypto, never muted cream-corporate), and copy that's confident and warm rather than technical or salesy. That's the direction to build toward, more than any single site's specifics.

## Concept: "Ticker tape" + a mascot

Grounding choice, not a default: a ticker-tape parade is the one place stock-market ephemera literally became a symbol of celebration — paper ticker tape, printed with real stock quotes, thrown from windows as confetti. That's the authentic bridge between "this is a real financial instrument" and "this is a fun, social gift," and it's specific to *this* product rather than a generic crypto or generic fintech look.

Given the reference sites, ticker-tape shouldn't be the *entire* visual language on its own — on its own it reads more editorial/graphic-design than warm/social. It works best as a **supporting texture** (torn-strip headers, printed-ticker micro-details, the unwrap motion) underneath a primary language built the way Phantom/Sanctum/Claynosaurz build theirs: a **mascot-led, dimensional, rounded** identity carrying most of the warmth.

**Mascot:** see [Mascot.md](Mascot.md) for the full character description, usage rules, pose library, and image-generation prompts — kept as its own standalone doc so it can be handed off independently of the rest of this design system.

Tone (decided): **fully playful/social throughout** — the claim page, the sender dashboard, gift history, all of it, not just one isolated "fun moment."

## Design principles

1. **Mascot + ticker-tape texture, not neon-crypto or cream-fintech.** The dimensional character carries most of the warmth (per the references); ticker-tape details ground it specifically in "gifting real stock" so it doesn't collapse into a generic friendly-fintech-mascot app either.
2. **Numbers are sacred.** However playful the chrome gets, dollar amounts, share quantities, and prices are always rendered in the clean tabular body face at full contrast. Personality never costs legibility of money.
3. **One big motion moment, plus restrained everyday polish.** The unwrap/claim confirmation is the single orchestrated, multi-beat animation in the product — nothing else gets that much choreography. Elsewhere, small, purposeful micro-interactions (a button lifting on hover, a table row highlighting, the landing feature row revealing on scroll, a header picking up a blur once you scroll past the hero) are welcome and add real polish — the thing to avoid is decorating *everything* uniformly (a fade-in on every card, a wiggle on every icon), which is what reads as generic-AI-page rather than intentional.
4. **Plain-language copy, active voice, warm not corporate.** "Claim your gift," "You'll receive," "Gift sent" — not "Submit," "Initialize," or system-speak. Closer to Sanctum's "delightful and fun" register than a brokerage's. The interface's vocabulary stays consistent through a whole flow (a button that says "Claim" produces a confirmation that says "Claimed").

## Color

Core palette (5, named) — warmer and more vivid than a muted editorial palette, in line with the references' jewel-tone/bright-accent energy rather than dark-neon-crypto or cream-corporate:
| Name | Hex | Use |
|---|---|---|
| Ink | `#211B1D` | Primary text, high-contrast elements. Used sparingly, not as a full-bleed dark background. |
| Cloud | `#FBF4EC` | Soft warm off-white — dominant UI surface, brighter/lighter than a "paper" tone so the mascot and accent colors pop. |
| Confetti Coral | `#FF5A4E` | Primary accent — main CTA/brand color, the "streamer" color. |
| Confetti Gold | `#F4B740` | Secondary accent. |
| Confetti Teal | `#00A896` | Tertiary accent — deliberately not the Solana purple/teal gradient, to avoid reading as generic Solana-app chrome. |

Semantic (separate from brand palette, standard financial meaning — don't get creative here):
| Name | Hex | Use |
|---|---|---|
| Gain | `#1E9E6B` | Price up / positive change. |
| Loss | `#E1483E` | Price down / negative change. |

## Type

See [Fonts.md](Fonts.md) for the finalized typefaces, downloaded font files, licensing, and usage CSS — kept as its own standalone doc, same pattern as Mascot.md.

Summary: **Fredoka** for display (headlines, hero numbers, gift amounts), **Inter** for body copy and tabular numbers, **Space Mono** for the small ticker-texture details only (symbol chips, torn-strip headers) — never as a hero face. Line length under 80 characters for body copy; one clear type scale, intentional weights rather than defaulting to a huge family of sizes.

## Screens / information architecture

(Moved and expanded from App.md.)

1. **Landing page** — sells the concept fast; mostly for judges skimming, and for cold visitors before they've received a gift.
2. **Create a gift** (sender) — stock picker, dollar amount, recipient mode (dedicated wallet/email vs. general FCFS link), confirm → escrow. Reads like writing out a gift receipt: single column, register-style layout.
3. **Gift sent / share** — confirmation with the shareable claim link (sharing is manual in v1).
4. **Claim page** (recipient) — standalone, no dashboard chrome/nav, since this is often a cold, possibly non-crypto visitor's first touch. Structure: a torn-ticker-strip element "prints" the gift's details (stock, amount) before the big unwrap CTA. Single "Claim gift" CTA, not a separate wallet-connect/sign-up step (see App.md's Claim flow decision) — Privy's own login modal covers both connecting an existing wallet and signing up. Live quote shown before confirming ("$25 → ~0.041 NVDA"). The unwrap/confetti moment is the one big animation in the product.
5. **Post-claim view** — claimed position, plus the Phase 2 "redeem to real shares" button once built.
6. **Sender's gift history** — sent gifts with status (pending / claimed / canceled) and the cancel button for any unclaimed gift, dedicated or FCFS (see App.md's Cancel/refund decision).
7. **404 / not-found** — any unmatched route, a real page rather than a silent redirect home. Rally in the "lost/confused" pose (see Mascot.md).

### Rough claim-page layout concept (ASCII)

**Superseded in one spot:** the "[ Connect wallet ] [ Sign up ]" row below predates App.md's later single-CTA decision — the shipped claim page has just one "Claim gift" button, which routes into Privy's login (covering both connect-existing and sign-up) only if the visitor isn't authenticated yet. Left as-is below since it's still useful for the overall layout shape (torn-strip header, big number, live quote, CTA).

```
┌───────────────────────────────────┐
│   [ torn ticker-strip header ]     │  ← "AAPL · $25 · from @jerome"
│                                     │     printed/punched look
├───────────────────────────────────┤
│                                     │
│      big display number            │  ← "$25 of AAPL"
│      live quote line               │  ← "≈ 0.13 shares right now"
│                                     │
│   [ Connect wallet ]  [ Sign up ]  │  ← existing wallet vs Privy
│                                     │
│         [ Claim gift → ]           │  ← the one big CTA,
│                                     │     triggers the unwrap moment
└───────────────────────────────────┘
```

Left-aligned content within a centered single column; no sidebar, no nav — the page has exactly one job.

## Components / patterns (to flesh out during build)

- Mascot character (bull) — appears at claim/unwrap success, empty states, onboarding. Not on every screen; reserved for emotional beats, same way Phantom/Sanctum use their character sparingly rather than as constant chrome.
- Ticker-strip header (used on claim page, gift-sent confirmation, gift history rows) — the supporting texture detail, small/printed-looking, not the dominant visual element.
- Wallet-connect vs. Privy-signup toggle/pair (claim page).
- Live quote line (used on claim page and create-gift page — same price-fetch component).
- Status badge: pending / claimed / canceled (gift history).
- Unwrap/confetti motion (claim confirmation only — not reused elsewhere), mascot appears as part of this moment.
- Cancel-gift control (gift history, any pending gift — dedicated or FCFS).

## Open design questions for the actual mockup pass

- Exact confetti/unwrap motion treatment (literal paper-strip animation vs. more abstract).
- Whether the FCFS general-link claim page needs a visually distinct "first come, first served" framing vs. the dedicated-gift claim page, given the different trust/urgency framing.
- Mobile layout for the ticker-strip header at narrow widths.
