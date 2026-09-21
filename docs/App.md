# ChainStock — Product Spec (Working Draft)

Hackathon: [Stocklana](https://hackathons.solana.com/hackathons/stocklana)
Deadline: **Friday, Sept 18, 2026, 4:00 PM ET**
Prize pool: $100k main track + $5k Meteora DBC track + $5k Clawpump agent track
Judging: "would this be a real app people actually use" — real user problem, working end-to-end demo, Solana-specific value, execution quality.

Name note: "ChainStock" is already used by an unrelated Australian stock-investing app (Play Store / Crunchbase). No collision in the Solana/crypto space. Fine for the hackathon; revisit before any real launch.

## One-liner

Send someone real, tokenized stock as a gift — as easy as sending a link. Later: get paid in stock instead of (or alongside) stablecoins.

## Phase 1 — Stock Gifting (build first)

### Sender flow
1. Pick a stock (from Backpack/Sunrise's tokenized securities list).
2. Pick a dollar amount (e.g. "$25").
3. Pick a recipient mode:
   - **Dedicated gift** — wallet address, or email address.
   - **General/FCFS link** — no identity check, single winner, first valid claim takes it.
4. Confirm — sender's $25 in USDC is **escrowed**, nothing is swapped or minted yet.

### Custody & swap model — swap happens at claim time, not send time

Decision (this turn): the escrow holds **USDC**, not the target stock, from send until claim. The stock swap (via Jupiter, routing through whatever DEX Sunrise seeded liquidity on) executes atomically as part of the **claim transaction**.

Why: if we swapped into the stock at send time, an unclaimed gift would be exposed to that stock's price risk the whole time it sits waiting to be claimed — a $25 gift could be worth $5 by the time someone opens the link, which defeats the point of gifting a fixed dollar amount. Holding USDC in escrow means:
- The gift is always worth exactly what the sender put in, until the recipient actually claims it.
- Cancel/refund is trivial — return the exact USDC amount, no repurchase or slippage.
- The claim page can show a **live quote** ("$25 → ~0.041 NVDA at current price") right before the recipient confirms, sourced from `GET /api/stocks` (see Architecture.md).
- We only need DEX liquidity to exist at the moment of claim, not for the entire unclaimed lifetime of the gift.

### Claim flow
- **Single "Claim" CTA, not separate login/claim steps.** The claim page shows one button. If the recipient isn't logged in yet, clicking it routes them into the wallet-connect / Privy sign-up step first, then completes the claim automatically once that's done — not three simultaneous buttons ("Connect wallet" / "Sign up" / "Claim") competing for attention.
- **Dedicated gift:** recipient identity is a **wallet address or an email address only** — no Twitter/X handle (dropped: there's no way to send someone a gift by their Twitter handle in the current sender flow, so there was never anything for a Twitter-verification step to attach to). Recipient connects the matching wallet, or — if sent to an email address — logs into Privy with that same email; Privy already verifies email ownership at login (OTP), so the backend just checks the authenticated session's verified email against the gift's recipient email before co-signing, no separate OAuth flow needed. Either way, the recipient signs and pays for the claim transaction themselves.
  - **Not provider-restricted.** Privy's email OTP verifies ownership of any address (Gmail, a company domain, anything) the same way — sends a one-time code, the recipient proves they control the inbox by entering it. There's no verification reason to only accept one provider, so `GiftForm`'s email field and the backend's validation both accept any well-formed email.
- **General/FCFS link:** no identity check required, but protected against bots:
  - CAPTCHA (Turnstile/hCaptcha) on the claim page.
  - One claim per wallet address, enforced server-side — the wallet address comes from whichever way the recipient connected through Privy (a fresh embedded wallet or an existing one), same as every other claim.
  - Long, unguessable claim link tokens (no sequential/enumerable IDs).
  - Rate limiting by IP/device as a second layer.
  - Single winner only (no split pools — simplest to build and to keep bot-resistant in the time available).

### Wallet-less claiming (the actual point of the app)
Onboarding non-crypto people by gifting them real stock is the core growth loop, so claiming can't require the recipient to already have a wallet or SOL. Claim page offers **Privy embedded wallet creation** on the spot (email/social login, no seed phrase), and the recipient also has the option to connect an existing wallet (Phantom, Solflare, Backpack, etc.) if they already have one.

**Gas is the claimer's own cost, paid from their own funds — never from the treasury:**
- Recipient connects an existing wallet that already holds SOL: they just sign and pay their own claim transaction fee, exactly like any normal Solana transaction. No sponsorship involved.
- Recipient claims via a fresh Privy wallet with no SOL yet: Solana requires the fee payer to already hold enough lamports *before* a transaction runs, so a brand-new wallet can't fund its own first transaction. The backend's fee-payer wallet fronts the SOL for this specific transaction (Privy's native Solana sponsorship via Grid), and — within that same transaction — a small slice of the claimant's own escrowed USDC (part of their gift) is swapped to SOL and paid straight back to the fee-payer wallet, reimbursing it per-claim. **Only in this case**, the recipient nets slightly less than face value (e.g. ~$24.90 on a $25 gift) — the cost of their own network fee, paid from their own gift, same as anyone without gas money transacting on any chain. The fee-payer wallet needs a one-time manual SOL seed to front the first few claims before per-claim reimbursements start covering it; after that it's self-sustaining.
- This is **completely separate from the platform fee/treasury** (see Monetization below) — the treasury is never drawn on to cover gas, and gas reimbursement never touches the treasury either. Two independent flows.
- Sponsorship is **scoped strictly to the claim transaction only** — nothing beyond it. If the recipient later wants to transfer, redeem to real shares, or do anything else, that's on their own SOL from then on.
- Known attack to mitigate: Privy's own docs flag that rent refunds from closing token accounts (ATAs) go to the account *owner*, not the fee payer — so sponsorship must only ever cover the specific claim instruction, never arbitrary user-submitted transactions, or it becomes cheaply drainable.

### Monetization
ChainStock takes a fee on every gift, charged **on top of** the amount the sender specifies — not carved out of the recipient's side. A $25 gift means the sender pays $25 + fee, the full $25 is what gets escrowed and later delivered. The fee goes straight to the project's **treasury wallet, which only ever accumulates — it's pure revenue, never spent on gas, sponsorship, or any other operating cost** (that's funded separately and only from the claimer's own gift in the no-SOL case — see Gas above). Shown transparently at checkout on the create-gift screen (e.g. "$25.00 gift + $0.63 fee").

**Structure: percentage with a minimum floor**, default **2.5%, minimum $0.15** — scales with gift size while still covering costs on very small gifts. Both numbers are tunable without a redeploy (see Architecture.md's fee config account) so this default isn't precious.

Enforced **on-chain**, inside the `create_gift` instruction itself, not in a backend that could silently change it — this is a real trust/demo angle: the take rate is publicly auditable on-chain, the same way the escrow itself is. See [Architecture.md](Architecture.md) for the mechanism.

Recipients who connect an existing funded wallet instead of using Privy just skip the sponsorship path entirely and pay their own claim fee, same as normal.

### Cancel / refund
Unclaimed gifts never expire automatically — **this applies to both dedicated gifts and general/FCFS links.** Sender gets a **cancel button** that refunds the escrowed USDC back to them at any time before claim, regardless of recipient mode.

### Gift history

A small profile icon next to "How it works" in the landing nav is the entry
point — click it, connect (same Privy modal as the claim page; it offers
both a fresh embedded wallet and connecting an existing external wallet, so
a sender who used `@solana/wallet-adapter` directly on `/gift` can still see
their history by connecting that same wallet through Privy), and you land
on `/history`: one long, scrollable page with two stacked sections —
**"Gifts you've sent"** (docs/mockup/sender-history.png: stock, amount,
recipient, status, cancel action while still pending) and **"Gifts you've
claimed"** below it (same idea, minus the recipient/actions columns — every
row there is already claimed by definition). The connected wallet address
is the join key for both halves: sent gifts where `sender_wallet` matches
it, claimed gifts where `recipient_wallet` matches it.

### Fun/social layer (design phase)
- "Unwrap" moment on the claim page.
- Optional gift message.
- Themed wrapper (birthday, holiday, etc).
- Sender manually shares the claim link (v1) — no auto-DM/reply integration, since that needs Twitter API app approval which is a timeline risk we don't need to take on.

## Phase 2 — Backpack redeem (build after Phase 1 works)

Sunrise (Wormhole Labs) distributes Backpack-issued tokenized stocks as canonical, DeFi-composable SPL tokens with real liquidity across Solana DEXs/aggregators — that's confirmed by Backpack's own docs describing the tokens as usable as DeFi collateral, in LPs, and tradable via aggregators, which wouldn't be possible if transfers were restricted to KYC'd/whitelisted wallets. So Phase 1's gifting core (escrow → Jupiter swap → transfer) doesn't need to call Backpack's mint/redeem endpoint at all, and avoids the risk of needing our own Backpack API account approved/KYC'd against a 3-day deadline for the core flow.

Phase 2 is where we give the project a genuine touchpoint with the hackathon's namesake API (the whole event is framed around Backpack opening this endpoint, so it's worth showing it used, not just Sunrise-listed tokens moved around like any other SPL token): a **"redeem to real shares"** button on the claim/portfolio page that calls Backpack's actual redeem endpoint, converting a gifted/held token into a real brokerage entitlement in the recipient's Backpack account. This is additive on top of Phase 1, not load-bearing for it — Phase 1 works standalone if Backpack API access is slow to come through, and Phase 2 slots in once it's available.

## Phase 3 — Multi-stock send / "pay in stock" (build after Phase 2)

Payroll/invoicing style flow: employer or DAO disburses payments split between USDC and one or more tokenized stocks in a single transaction, to a list of recipients. Reuses the same escrow → swap → deliver pipeline as gifting, just with multiple line items per transaction and no claim step (recipients are already known wallets). Spec TBD in detail once Phases 1 and 2 are working — same core primitives (quote, swap-on-settlement, deliver) apply.

## Data & backend architecture

**Source of truth for money is always on-chain, never the database.** Each gift's escrowed USDC lives in a Solana account (a PDA), and claim/cancel are on-chain instructions that move or refund it directly. This is what makes a gift trustworthy — no one, including us, can quietly edit a balance in a database. Single-winner FCFS enforcement falls out of this for free too: once a gift's vault is claimed/emptied, a second claim attempt just fails on-chain, no separate "already claimed" bookkeeping needed for correctness.

**What the database is actually for** (index + auxiliary state, not custody):
- Fast UI queries — sender's gift history, looking up a gift by its claim-link token. Technically queryable straight from the chain (`getProgramAccounts` with filters), but that doesn't scale to decent UX (slow, rate-limited, poor pagination/sorting) — the standard pattern for Solana consumer apps is an off-chain index mirroring on-chain state for exactly this reason.
- Off-chain-only extras — optional gift message, themed wrapper choice. Fine to lose if the DB ever needed rebuilding, unlike the money.
- Anti-bot state for FCFS links — CAPTCHA verification and rate-limit counters need to exist before a transaction is even attempted, so they're inherently off-chain.

If the DB were wiped, worst case is losing gift messages and rebuilding the index from on-chain history — never losing funds.

## Legal consent

First time a visitor is about to send or claim a gift — the moment they're about to connect a wallet and move real funds, not every page visit — a popup (`LegalGateProvider`/`LegalAcceptanceModal`, `src/components/legal/`) requires them to check a box agreeing to the Terms of Service and Privacy Policy (`/terms`, `/privacy`) before the send/claim flow continues. Declining just closes the modal and cancels that attempt; nothing about the app is otherwise locked. Acceptance is localStorage-only, scoped to the browser rather than to a wallet address or account — ChainStock has no persistent user-account system to hang a server-side record off (wallet-adapter and Privy are both just signing identities), so this is the practical equivalent of the pattern rather than the full server-backed version. Bumping `LEGAL_VERSION` (`src/lib/legal/constants.ts`) forces everyone to re-accept, for whenever the terms change materially.

**Pick: Neon** (serverless Postgres) instead of Supabase — the founder's Supabase free tier is already at its 2-project cap. Neon is effectively a drop-in Postgres replacement (same SQL, same ORM code, no Supabase-specific rework needed) with a generous free tier and an HTTP driver suited to serverless deploys. Not using Supabase's auth/realtime here anyway (Privy handles wallet auth), so there's no feature loss in switching.

**Write pattern for the hackathon timeline:** backend writes to the DB in the same request where it builds/submits the on-chain transaction, treating each row as a cache rather than standing up a separate indexer/webhook listener. Less robust long-term (a webhook-driven indexer, e.g. via Helius, would avoid any drift between chain state and DB state) but the right tradeoff given the time available — reconciling drift later is a smaller problem than not shipping.

## Architecture

See [Architecture.md](Architecture.md) for the on-chain program design (accounts, instructions, PDA/seed strategy, how the swap is composed into the claim transaction), the swap-failure/slippage policy, and the concrete app stack.

## UI / design system

See [Design.md](Design.md) for screens, information architecture, visual identity, and component patterns.

## Open technical risks to verify early

1. **Jupiter liquidity depth per ticker** — confirm quote depth on target tickers before committing to them in the demo; some of the newer/less popular listings may have thin pools.
2. **Backpack API access turnaround** — needed only for the optional redeem touchpoint, not the core flow; apply early in case approval takes time.
3. **Price feed — resolved, built differently than first researched:** the originally-assumed Backpack `/api/v1/ticker` endpoint isn't what shipped. The real `GET /api/stocks` route (see Architecture.md) instead sources the stock catalog from Sunrise's own API (`https://api.sunrise.xyz/v1/tokens`, filtered to real Backpack Securities tokens) and live prices from Jupiter's Price API v3 (`https://lite-api.jup.ag/price/v3`) — both public, no-auth. Polled client-side every 15s via `useLiveStocks`.
4. **Stock logos:** Backpack Exchange serves per-symbol logos at `https://backpack.exchange/api/stock-logo/<SYMBOL>` (real company marks — Apple, Tesla, Nvidia, etc.). Proxy through an image CDN for resizing/caching rather than hotlinking directly, e.g. via [wsrv.nl](https://wsrv.nl/) (the pattern Jupiter.ag itself uses): `https://wsrv.nl/?w=32&h=32&url=<url-encoded-logo-url>&dpr=2&quality=80`. Worth a trademark-usage check before any real launch; fine for the hackathon demo.

## Explicitly out of scope for the hackathon build

- Split/pooled FCFS links (multi-claimer red envelope) — single winner only for now.
- Auto-notify recipient via Twitter (DM/reply) — sender shares the link manually.
- Universal "round-up" investing across arbitrary wallets/dApps — dropped as an idea (not feasible in the time available; see prior discussion).
- Expiry on unclaimed gifts — none for now, cancel-by-sender only.
