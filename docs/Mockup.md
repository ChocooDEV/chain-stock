# UI Mockups — Image-Generation Prompts

Companion to [Design.md](Design.md) (design system), [Mascot.md](Mascot.md) (character), and [App.md](App.md) (product spec). Purpose: generate static visual mockups of each core screen via ChatGPT image generation, to validate the visual direction and produce demo/pitch material.

**These are direction-setting comps, not the coded implementation.** ChatGPT image output is a flat image, not usable React/HTML/CSS — once a mockup direction is approved here, the real screens still get built in code against the same design tokens (Design.md's colors/type) and content (this doc's copy). Treat this file as the visual brief the eventual code build follows, not a shortcut past it.

## How to use

- Same consistency approach as Mascot.md: since ChatGPT can't read Design.md directly, the **design tokens block** below is repeated (or summarized) in every screen prompt so the palette/type/texture stays consistent across separately-generated screens.
- Where a screen uses Rally, attach the relevant generated pose image (`mascot/rally-<pose>.png`) to the prompt rather than describing the mascot in text — you already have the real asset, use it as a reference image the same way the pose prompts referenced the reference sheet.
- Generate each screen as a desktop browser-frame mockup (1600×1000-ish) for v1; mobile layouts are a later pass once a desktop direction is locked (see Design.md's open question on the ticker-strip header at narrow widths).
- Use real placeholder copy (below), not lorem ipsum — per Design.md's writing principles, the words are part of the design.

## Design tokens block (include in every prompt)

> Design system: warm cream background (#FBF4EC), near-black ink text (#211B1D), vivid coral primary accent/CTA color (#FF5A4E), gold secondary accent (#F4B740), teal tertiary accent (#00A896), green for gains (#1E9E6B) and red for losses (#E1483E). Big, confident, rounded-friendly display typography for headlines and numbers — not a technical/mono look. Small monospace text used only for ticker-symbol chips and printed ticker-tape texture details (torn paper strip elements, small printed price tickers) — never as the dominant typeface. Overall mood: playful, warm, tactile, gift-culture energy — not a serious/corporate fintech look, not a dark neon-crypto look. Rounded corners, soft shadows used sparingly, generous whitespace.

## Screen prompts

**1. Landing page**
> [Design tokens block above.] A landing page for "ChainStock," an app for gifting real, tokenized stock to friends as easily as sending a link. Hero section: large rounded display headline reading "Send a friend real stock. Like, actually real." with a shorter supporting line "Pick a stock, pick an amount, send a link — no wallet required to receive it." A big coral primary button reading "Send a gift." Below the hero, three simple feature callouts with small icons: "Real shares, not points," "Claim with just an email," "Cash out to real shares anytime." Include Rally [attach mascot/rally-waving.png] near the hero, waving, as the friendly welcoming presence. Ticker-tape torn-strip texture used as a subtle decorative border element near the top of the page, printed with a few real ticker symbols (AAPL, TSLA, NVDA). Desktop browser-frame mockup, clean layout, generous whitespace.

**2. Create a gift (sender)**
> [Design tokens block above.] A "send a gift" form screen, single centered column, styled like writing out a gift receipt. Step 1: a stock picker showing a searchable list with a few real examples (AAPL — Apple, TSLA — Tesla, NVDA — Nvidia), each row showing the current price. Step 2: a dollar amount input, large and prominent, showing "$25" with a live-quote line underneath reading "≈ 0.13 shares of NVDA right now." Step 3: recipient mode toggle between two options — "Send to someone specific" (an input field with placeholder text "Wallet address or @handle" — no email field) and "Anyone can claim" (generates a first-come-first-served link) — shown as two tappable cards. A big coral "Send gift" button at the bottom. Desktop browser-frame mockup, single centered column layout, torn-ticker-strip header at the top of the form.

**3. Gift sent / share**
> [Design tokens block above.] A confirmation screen shown right after sending a gift. Large rounded headline "Gift sent!" A card showing the gift summary: "$25 of NVDA, for @friendhandle." A prominent copyable link field with a "Copy link" button. A secondary line: "Share it however you'd like — text, DM, however you'd send anything else." Rally appears small in a corner [attach mascot/rally-thumbs-up.png], giving a thumbs up. Desktop browser-frame mockup, centered card layout.

**4. Claim page (recipient)** — the centerpiece screen
> [Design tokens block above.] A standalone claim page, no navigation bar, no sidebar, just one centered card — this is often a visitor's very first interaction with the product, possibly with no crypto wallet at all. At the top, a torn-ticker-strip header reading "NVDA · $25 · from @jerome." Below it, a large display line: "$25 of NVDA" with a live quote underneath: "≈ 0.13 shares at today's price." Exactly **one** call-to-action button: a single big coral "Claim gift" button — not separate "connect wallet" or "sign up" buttons alongside it. A small caption underneath explains what happens next: "We'll ask you to connect a wallet or sign up in one click — no wallet? No problem." Feature Rally prominently [attach mascot/rally-celebrating.png] near the claim button, mid-celebration with confetti made of ticker-tape strips, as if anticipating the unwrap moment. Desktop browser-frame mockup, single centered column, nothing else on the page.

**5. Post-claim view**
> [Design tokens block above.] A portfolio/holdings view shown after claiming a gift. Shows one holding card: "0.13 shares of NVDA," current value, and change since claim shown in green if positive. A secondary button "Redeem to real shares" with a small explainer line "Turn this into an actual brokerage holding." Rally appears small [attach mascot/rally-thumbs-up.png] near the top of the card as a small congratulatory touch. Desktop browser-frame mockup, clean single-card layout with plenty of whitespace.

## Assets

File naming: `mockup/<screen>.png`.

| File | Screen | Status |
|---|---|---|
| `mockup/landing.png` | Landing page | ✅ Generated |
| `mockup/create-gift.png` | Create a gift | ✅ Generated |
| `mockup/gift-send.png` | Gift sent / share | ✅ Generated |
| `mockup/claim.png` | Claim page | ✅ Generated |
| `mockup/post-claim.png` | Post-claim view | ✅ Generated |
| `mockup/sender-history.png` | Sender's gift history | ✅ Generated |

All six screens generated and reviewed. Overall: strong hit on the design system — palette, rounded display type, ticker-tape texture, and Rally's placement (present at emotional beats, correctly absent from the data-dense history table) all landed as specified.

## Review notes — decisions the mockups surfaced (resolved)

Reviewing against [App.md](App.md) surfaced four things that weren't cosmetic. All four are now decided and reflected in App.md:

1. **Recipient identifier: wallet address or Twitter/X handle only, no email.** The "email" copy in landing/create-gift (`you@friend.com`) was a drift from spec — email was considered as a third identifier but rejected (in practice it'd mean "Gmail-only" verification, not worth the surface area). Copy needs fixing to wallet address / @handle when these screens get rebuilt for real.
   **Superseded during the real build:** this flipped the other way — there's no path in the sender flow to address a gift by Twitter handle, so a handle-verification step had nothing to attach to. The shipped decision (App.md) is wallet address or email address, with Privy's own email-login verification standing in for what would've been a Twitter OAuth check. No Twitter/X identity anywhere in the recipient model.
2. **Claim page: one "Claim" button, not three.** Resolved as: single CTA, routes to wallet-connect/Privy sign-up first if not logged in, then completes the claim automatically — not "Connect wallet" / "Sign up" / "Claim gift" all visible at once. Screen needs re-mocking with this simplified flow before it's used as the real build reference.
3. **FCFS/general-link gifts are cancelable too.** Confirmed — cancel isn't limited to dedicated gifts, App.md updated accordingly.
4. **Real company logos: yes, use them.** Sourced from Backpack Exchange's own logo endpoint (`https://backpack.exchange/api/stock-logo/<SYMBOL>`), proxied through an image CDN like wsrv.nl for resizing — the same pattern Jupiter.ag uses. Documented in App.md's technical notes.

**Follow-up:** the claim page mockup (#2) should be regenerated to match the single-CTA flow before it's treated as final reference for the build.

**6. Sender's gift history**
> [Design tokens block above.] A dashboard-style table/list view of gifts a sender has sent. Each row: stock, amount, recipient (wallet/handle or "Anyone — first to claim"), and a status badge — "Pending" (gold), "Claimed" (teal), "Canceled" (muted grey). Pending rows have a small "Cancel" text-button on the right. Top of the page has a header bar with a "Send a new gift" coral button. No mascot on this screen — it's a data-dense utility view, kept clean and legible per the design system's "numbers are sacred" rule. Desktop browser-frame mockup, table/list layout.
