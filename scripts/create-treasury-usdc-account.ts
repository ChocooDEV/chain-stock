// One-time mainnet setup, step 2: creates the treasury's USDC associated
// token account. `create_gift` requires `treasury_usdc` to already exist
// (see anchor/programs/chainstock/src/instructions/create_gift.rs's
// comment on that account — deliberately not `init`, so an ordinary
// sender never incidentally pays rent to provision it) and fails with
// Anchor's `AccountNotInitialized` (error code 3012 / 0xbc4) otherwise —
// exactly the error seen sending the first real mainnet gift, confirmed
// by checking this exact address on-chain and finding it didn't exist.
//
// Usage (from repo root):
//   npx tsx scripts/create-treasury-usdc-account.ts <treasury-keypair.json>
//
// <treasury-keypair.json> is Wallet 1's keypair file — same one used for
// mainnet-init-config.ts, since `config.treasury` was set to Wallet 1's
// pubkey. Pays the ATA's rent (~0.002 SOL) and becomes its owner.

import { readFileSync } from "node:fs";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { MAINNET_USDC_MINT } from "../src/lib/liquidity";

function loadEnvLocal() {
  let raw: string;
  try {
    raw = readFileSync(".env.local", "utf8");
  } catch {
    return;
  }
  for (const line of raw.split("\n")) {
    const match = line.trimEnd().match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.trim().replace(/^"|"$/g, "");
  }
}

function loadKeypair(path: string): Keypair {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

async function main() {
  const treasuryPath = process.argv[2];
  if (!treasuryPath) {
    console.error("Usage: npx tsx scripts/create-treasury-usdc-account.ts <treasury-keypair.json>");
    process.exit(1);
  }

  loadEnvLocal();

  const treasury = loadKeypair(treasuryPath);
  const usdcMint = new PublicKey(MAINNET_USDC_MINT);
  const treasuryUsdc = getAssociatedTokenAddressSync(
    usdcMint,
    treasury.publicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  const rpcUrl = process.env.SOLANA_RPC_URL;
  if (!rpcUrl) {
    console.error("SOLANA_RPC_URL is not set (checked real env and .env.local)");
    process.exit(1);
  }
  const connection = new Connection(rpcUrl, "confirmed");

  const existing = await connection.getAccountInfo(treasuryUsdc);
  if (existing) {
    console.log(`treasury_usdc (${treasuryUsdc.toBase58()}) already exists — nothing to do.`);
    return;
  }

  console.log("Creating treasury's USDC account:");
  console.log("  treasury:     ", treasury.publicKey.toBase58());
  console.log("  usdc_mint:    ", usdcMint.toBase58());
  console.log("  treasury_usdc:", treasuryUsdc.toBase58(), "(this must match create_gift's derived address)");

  const transaction = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(
      treasury.publicKey,
      treasuryUsdc,
      treasury.publicKey,
      usdcMint,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    ),
  );

  const signature = await connection.sendTransaction(transaction, [treasury]);
  await connection.confirmTransaction(signature, "confirmed");

  console.log("\nConfirmed:", signature);
  console.log("treasury_usdc is now live at:", treasuryUsdc.toBase58());
}

main().catch((error) => {
  console.error("create-treasury-usdc-account failed:", error);
  process.exit(1);
});
