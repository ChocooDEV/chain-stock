# ChainStock — Demo Manual

A walkthrough of every screen, as they exist today. **UI/UX is real; the
money isn't yet** — every screen below is fully built and wired for
interaction, but `create_gift`/`claim_gift`/`cancel_gift` aren't
connected to the real Solana program yet (see `../../TODO.md` for exactly
what's left). Stock prices, catalog, and logos are real, live data (all
via Jupiter — see Architecture.md's `GET /api/stocks`). The claim and
history pages read the **real database** now
(`GET /api/gifts/...`, see Architecture.md) — the screenshots below show
them populated via `scripts/seed-demo-gifts.mjs`, since no real gifts
exist yet without the deployed program to actually create one. Only the
create-gift screen (`/gift`) still submits nothing real.

Screenshots are desktop (1440×900) and mobile (390×844), captured
straight from the running app — nothing staged in an image editor. Two
short video clips at the bottom show the actual click-through flow.

## 1. Landing page

![Landing — desktop](screenshots/01-landing-desktop.png)

The pitch, for a cold visitor or a judge skimming fast: what ChainStock is,
one clear CTA ("Send a gift"), three feature callouts. Rally waves,
ticker strips flip in the background — purely decorative on this page,
not real prices.

<details>
<summary>Mobile</summary>

![Landing — mobile](screenshots/01-landing-mobile.png)

</details>

## 2. Create a gift — `/gift`

![Create a gift — desktop](screenshots/02-create-gift-desktop.png)

The sender's flow: pick a stock from the real, live Backpack Securities
catalog (search included — the catalog is 40+ tickers), choose a dollar
amount (live share estimate updates as you type), then choose how to
send it — a specific wallet address or email address, or a
first-come-first-served link anyone can claim. "Send gift" currently
gates on a connected Solana wallet (via wallet-adapter) and then goes
straight to the confirmation screen — it doesn't build/submit a real
`create_gift` transaction yet.

<details>
<summary>Mobile</summary>

![Create a gift — mobile](screenshots/02-create-gift-mobile.png)

</details>

## 3. Gift sent — `/gift/sent`

![Gift sent — desktop](screenshots/03-gift-sent-desktop.png)

Confirmation right after "Send gift": a summary card, a copyable claim
link, and share buttons (X, email, copy-link). This is where a real
sender would actually hand the link to whoever they're gifting.

<details>
<summary>Mobile</summary>

![Gift sent — mobile](screenshots/03-gift-sent-mobile.png)

</details>

## 4. Claim page — `/claim/[claimSeed]`

![Claim — desktop](screenshots/04-claim-desktop.png)

What the recipient sees after opening the link — often their very first
interaction with the product, possibly with no crypto wallet at all.
Deliberately **one** "Claim gift" button, not three ("Connect wallet" /
"Sign up" / "Claim") — clicking it routes into Privy's login (covering
both an existing wallet and walletless email/social sign-up) only if
they're not already authenticated, then would complete the claim
automatically. The claim transaction itself isn't wired up yet.

<details>
<summary>Mobile</summary>

![Claim — mobile](screenshots/04-claim-mobile.png)

</details>

## 5. Post-claim — `/claim/[claimSeed]/success`

![Post-claim — desktop](screenshots/05-claim-success-desktop.png)

What claiming actually gets you: the holding (shares + current value),
Rally celebrating. The "Redeem to real shares" button from the original
mockup is intentionally hidden here — that's Phase 2 (calls Backpack's
real redeem API), not built yet.

<details>
<summary>Mobile</summary>

![Post-claim — mobile](screenshots/05-claim-success-mobile.png)

</details>

## 6. Gift history — `/history`

![History — desktop](screenshots/06-history-desktop.png)

Reached via the profile icon on the landing page (gated behind Privy
connect — shown here already connected, for illustration). Two stacked
sections: gifts sent (with status and a cancel action while still
pending — for FCFS links too, not just dedicated ones) and gifts
claimed. Reads real data now (`GET /api/gifts?sender=`/`?recipient=`,
keyed off the connected wallet) — rows shown here came from
`scripts/seed-demo-gifts.mjs`, since a fresh wallet has nothing to show
until `create_gift` is wired to the deployed program.

<details>
<summary>Mobile</summary>

![History — mobile](screenshots/06-history-mobile.png)

</details>

## 7. 404 — any unmatched route

![404 — desktop](screenshots/07-404-desktop.png)

A real page, not a silent redirect to the landing page — so a stale or
mistyped link is clearly explained rather than just bouncing somewhere
unexplained.

<details>
<summary>Mobile</summary>

![404 — mobile](screenshots/07-404-mobile.png)

</details>

## Video clips

Both are `.webm` (Playwright's native recording format — no `ffmpeg`
available in this environment to transcode to `.mp4`; any modern browser
or video player opens `.webm` directly).

### `videos/gift-creation.webm` — sending a gift

Search for a stock, select it, bump the amount up, toggle between the
two recipient modes, fill in a wallet address, hit "Send gift." Stops
where the wallet-adapter connect modal opens — there's no real wallet
extension installed in this recording environment to actually connect.

### `videos/claim-flow.webm` — receiving one

Starts on the gift-sent confirmation, copies the link, follows it to the
claim page, and taps "Claim gift" — which triggers Privy's real login
flow (its modal is heavier to load than everything else on the page
combined, so it may not have finished appearing by the clip's end; this
environment's automated recording couldn't reliably wait it out). The
post-claim destination that a completed claim leads to isn't in this
clip — see the screenshot in section 5 above instead, since completing a
real Privy login isn't scriptable here.
