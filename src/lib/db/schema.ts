import {
  bigint,
  boolean,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";

/**
 * Off-chain index of on-chain `Gift` state, plus off-chain-only extras —
 * see docs/Architecture.md's "Database schema" section. Source of truth
 * for money is always the on-chain `Gift` PDA, never this table (see
 * docs/App.md's "Data & backend architecture"): every row here mirrors
 * confirmed on-chain state, written only after a transaction actually
 * lands, never ahead of it.
 *
 * `amount_usdc`/`fee_usdc` use `bigint` (mode: "bigint", not "number") —
 * USDC base units (6 decimals) stay well under JS's 2^53 safe-integer
 * ceiling for any realistic gift size, but bigint mode avoids that class
 * of bug entirely rather than relying on the amounts staying small.
 */
export const gifts = pgTable("gifts", {
  claimSeed: text("claim_seed").primaryKey(),
  giftPda: text("gift_pda").notNull(),
  senderWallet: text("sender_wallet").notNull(),
  stockMint: text("stock_mint").notNull(),
  stockSymbol: text("stock_symbol").notNull(),
  amountUsdc: bigint("amount_usdc", { mode: "bigint" }).notNull(),
  feeUsdc: bigint("fee_usdc", { mode: "bigint" }).notNull(),

  // Mirrors the on-chain program's RecipientMode split (see
  // anchor/programs/chainstock/src/state.rs): 'fcfs' has neither wallet nor
  // email set; 'dedicated_wallet' sets recipientWallet only;
  // 'dedicated_email' sets recipientEmail only. No DB-level CHECK
  // constraint enforcing that shape yet — enforce it in the API route
  // that writes this row (POST /api/gifts, after create_gift confirms),
  // matching exactly what the on-chain instruction itself required.
  recipientMode: text("recipient_mode", {
    enum: ["dedicated_wallet", "dedicated_email", "fcfs"],
  }).notNull(),
  recipientWallet: text("recipient_wallet"),
  /**
   * The real email address, off-chain only — never put this on-chain
   * (the `Gift` PDA only ever stores `recipient_email_hash`, a
   * commitment). Needed here so `prepare-claim` can compare the caller's
   * Privy-verified email against it before deciding to co-sign a claim.
   */
  recipientEmail: text("recipient_email"),

  status: text("status", {
    enum: ["pending", "claimed", "canceled"],
  })
    .notNull()
    .default("pending"),

  message: text("message"),
  theme: text("theme"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),

  createTxSignature: text("create_tx_signature").notNull(),
  claimTxSignature: text("claim_tx_signature"),
  cancelTxSignature: text("cancel_tx_signature"),
});

export type GiftRow = InferSelectModel<typeof gifts>;

/**
 * Anti-bot/rate-limiting only for FCFS claim attempts — a website-level
 * throttle, not a protocol-level guarantee (the on-chain `claim_gift`
 * instruction is a public instruction callable directly via RPC,
 * bypassing this entirely — see docs/Architecture.md's Security
 * hardening section). Never used to decide claim authorization on its
 * own, only to rate-limit/CAPTCHA-gate attempts before `prepare-claim`
 * will proceed for `fcfs` mode.
 */
export const claimAttempts = pgTable("claim_attempts", {
  id: text("id").primaryKey(), // app-generated (e.g. crypto.randomUUID())
  claimSeed: text("claim_seed").notNull(),
  walletAddress: text("wallet_address"),
  ipHash: text("ip_hash"),
  attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
  captchaVerified: boolean("captcha_verified").notNull().default(false),
});

/**
 * Cached result of the last `GET /api/cron/check-liquidity` run (see
 * `src/lib/liquidity.ts`) — whether a Jupiter swap route actually exists
 * for each catalog token, not just whether it has a reference price.
 * Needed because Jupiter's price API can report a real price for a token
 * with zero trading liquidity (a live example: `XYZ`/"Block" — see
 * TODO.md's Jupiter liquidity-depth findings), which `GET /api/stocks`'s
 * old `price > 0` filter didn't catch. `GET /api/stocks` filters the
 * catalog against this table; fails open (a mint with no row here, e.g.
 * before the cron has ever run, stays visible) rather than closed, so a
 * missed/late cron run can't accidentally hide every stock in the app.
 */
export const tokenLiquidity = pgTable("token_liquidity", {
  mint: text("mint").primaryKey(),
  symbol: text("symbol").notNull(),
  tradable: boolean("tradable").notNull(),
  priceImpactPct: text("price_impact_pct"),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
});
