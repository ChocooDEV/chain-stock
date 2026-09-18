// Seeds a handful of realistic gift rows directly into the database for
// local testing of /history and /claim/[claimSeed] — standing in for the
// real create_gift -> POST /api/gifts pipeline, which can't run yet
// without the Anchor program deployed (see TODO.md). Inserts straight
// via Drizzle, bypassing the API route's on-chain signature verification
// entirely (appropriate here: this is a dev seed, not a simulation of a
// real transaction).
//
// Usage: node scripts/seed-demo-gifts.mjs <your-solana-wallet-address>
//   Run with the dev server up (reads its /api/stocks for real symbols).
//   Requires DATABASE_URL_UNPOOLED (or DATABASE_URL) in .env.local.

import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pgTable, bigint, boolean, text, timestamp } from "drizzle-orm/pg-core";

const walletAddress = process.argv[2];
if (!walletAddress) {
  console.error("Usage: node scripts/seed-demo-gifts.mjs <your-solana-wallet-address>");
  process.exit(1);
}

function loadEnvVar(name) {
  const line = readFileSync(".env.local", "utf8")
    .split("\n")
    .find((l) => l.startsWith(`${name}=`));
  if (!line) return undefined;
  return line.slice(name.length + 1).trim().replace(/^"|"$/g, "");
}

const databaseUrl = loadEnvVar("DATABASE_URL");
if (!databaseUrl) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}

// Inline schema (mirrors src/lib/db/schema.ts) — kept standalone so this
// script has no dependency on the Next.js/TS build pipeline.
const gifts = pgTable("gifts", {
  claimSeed: text("claim_seed").primaryKey(),
  giftPda: text("gift_pda").notNull(),
  senderWallet: text("sender_wallet").notNull(),
  stockMint: text("stock_mint").notNull(),
  stockSymbol: text("stock_symbol").notNull(),
  amountUsdc: bigint("amount_usdc", { mode: "bigint" }).notNull(),
  feeUsdc: bigint("fee_usdc", { mode: "bigint" }).notNull(),
  recipientMode: text("recipient_mode").notNull(),
  recipientWallet: text("recipient_wallet"),
  recipientEmail: text("recipient_email"),
  status: text("status").notNull().default("pending"),
  message: text("message"),
  theme: text("theme"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  createTxSignature: text("create_tx_signature").notNull(),
  claimTxSignature: text("claim_tx_signature"),
  cancelTxSignature: text("cancel_tx_signature"),
});

const db = drizzle(neon(databaseUrl));

const PLACEHOLDER_WALLET = "11111111111111111111111111111111";
const FAKE_SIG_PREFIX = "SEEDDEMOFAKE";

function fakeSignature(suffix) {
  return `${FAKE_SIG_PREFIX}${suffix}${"1".repeat(64)}`.slice(0, 64);
}

async function fetchRealStocks() {
  const res = await fetch("http://localhost:3400/api/stocks");
  if (!res.ok) throw new Error("Couldn't reach /api/stocks — is the dev server running?");
  const { stocks } = await res.json();
  if (!stocks?.length) throw new Error("/api/stocks returned no stocks");
  return stocks;
}

function usdcBaseUnits(dollars) {
  return BigInt(Math.round(dollars * 1_000_000));
}

async function main() {
  const stocks = await fetchRealStocks();
  const pick = (i) => stocks[i % stocks.length];

  const now = Date.now();
  const rows = [
    // Sent by this wallet — a mix of pending/claimed/canceled, dedicated/fcfs.
    {
      claimSeed: `seed-sent-1-${now}`,
      giftPda: PLACEHOLDER_WALLET,
      senderWallet: walletAddress,
      stockMint: pick(0).mint,
      stockSymbol: pick(0).symbol,
      amountUsdc: usdcBaseUnits(25),
      feeUsdc: usdcBaseUnits(0.63),
      recipientMode: "dedicated_email",
      recipientEmail: "sam@friendmail.com",
      status: "pending",
      createTxSignature: fakeSignature("A"),
    },
    {
      claimSeed: `seed-sent-2-${now}`,
      giftPda: PLACEHOLDER_WALLET,
      senderWallet: walletAddress,
      stockMint: pick(1).mint,
      stockSymbol: pick(1).symbol,
      amountUsdc: usdcBaseUnits(50),
      feeUsdc: usdcBaseUnits(1.25),
      recipientMode: "fcfs",
      status: "pending",
      createTxSignature: fakeSignature("B"),
    },
    {
      claimSeed: `seed-sent-3-${now}`,
      giftPda: PLACEHOLDER_WALLET,
      senderWallet: walletAddress,
      stockMint: pick(2).mint,
      stockSymbol: pick(2).symbol,
      amountUsdc: usdcBaseUnits(20),
      feeUsdc: usdcBaseUnits(0.5),
      recipientMode: "dedicated_wallet",
      recipientWallet: PLACEHOLDER_WALLET,
      status: "canceled",
      createTxSignature: fakeSignature("C"),
      canceledAt: new Date(),
      cancelTxSignature: fakeSignature("CC"),
    },
    // Claimed BY this wallet — shows up in the "Gifts you've claimed" section.
    {
      claimSeed: `seed-claimed-1-${now}`,
      giftPda: PLACEHOLDER_WALLET,
      senderWallet: PLACEHOLDER_WALLET,
      stockMint: pick(3).mint,
      stockSymbol: pick(3).symbol,
      amountUsdc: usdcBaseUnits(30),
      feeUsdc: usdcBaseUnits(0.75),
      recipientMode: "fcfs",
      recipientWallet: walletAddress,
      status: "claimed",
      createTxSignature: fakeSignature("D"),
      claimedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      claimTxSignature: fakeSignature("DD"),
    },
    // A live claim link you can actually open: /claim/<claimSeed> below.
    {
      claimSeed: `seed-claimable-${now}`,
      giftPda: PLACEHOLDER_WALLET,
      senderWallet: PLACEHOLDER_WALLET,
      stockMint: pick(4).mint,
      stockSymbol: pick(4).symbol,
      amountUsdc: usdcBaseUnits(15),
      feeUsdc: usdcBaseUnits(0.38),
      recipientMode: "fcfs",
      status: "pending",
      createTxSignature: fakeSignature("E"),
    },
  ];

  await db.insert(gifts).values(rows).onConflictDoNothing();

  console.log(`Seeded ${rows.length} gifts for ${walletAddress}.`);
  console.log(`\nOpen /history while connected as that wallet to see them.`);
  const claimable = rows.find((r) => r.claimSeed.startsWith("seed-claimable"));
  console.log(`Or try a live claim page: /claim/${claimable.claimSeed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
