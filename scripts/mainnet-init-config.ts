// One-time mainnet setup: calls `initialize_config` to create the
// `Config` PDA that `create_gift`/`claim_gift`/`cancel_gift` all require —
// see anchor/programs/chainstock/src/instructions/initialize_config.rs.
// No gift can be created or claimed on mainnet until this has run once.
//
// Deliberately TypeScript reusing the app's own Anchor client
// (`getServerProgram`/`getConfigPda`), not a hand-rolled raw instruction
// the way `anchor/programs/chainstock/examples/devnet_validate.rs` builds
// one — for a one-shot, irreversible mainnet write, reusing the exact
// client code path the app already runs (and that GiftForm.tsx exercises
// on every real gift) is less risky than re-deriving account/PDA/
// discriminator logic by hand a second time.
//
// Usage (from repo root):
//   npx tsx scripts/mainnet-init-config.ts <admin-keypair.json>
//
// <admin-keypair.json> is Wallet 1's keypair file (solana-keygen JSON
// array format) — becomes `admin` AND `treasury` in one call, per this
// session's decision to match the devnet setup. It signs and pays for
// this transaction. `backend_authority` is read from this repo's own
// `BACKEND_AUTHORITY_SECRET_KEY` (.env.local) via the same
// `getBackendAuthorityKeypair()` the live app uses — not a second
// hand-typed pubkey — so there's no way for this script's value to drift
// from what the deployed backend actually signs claims with.
//
// Refuses to run if a Config PDA already exists at this program's address
// on whatever cluster SOLANA_RPC_URL points at — initialize_config is a
// create-only instruction (`init`, not `init_if_needed`), so a second
// call would simply fail on-chain anyway; this just fails faster with a
// clearer message.

import { readFileSync } from "node:fs";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { BN, getConfigPda, getServerProgram } from "../src/lib/solana/program";
import { getBackendAuthorityKeypair } from "../src/lib/solana/backendAuthority";
import { MAINNET_USDC_MINT } from "../src/lib/liquidity";

// Matches devnet (docs/Wallets.md) — this session's explicit choice to
// keep launch fee parameters unchanged. `update_config` can adjust these
// later without a redeploy if that changes.
const FEE_BPS = 250;
const FEE_MIN_USDC = 150_000;

function loadEnvLocal() {
  let raw: string;
  try {
    raw = readFileSync(".env.local", "utf8");
  } catch {
    return; // fine if it's not present; real env vars may be set another way
  }
  for (const line of raw.split("\n")) {
    // .env.local has CRLF line endings on this machine — strip a trailing
    // \r before matching, or every line silently fails to parse.
    const match = line.trimEnd().match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue; // real env wins
    process.env[key] = rawValue.trim().replace(/^"|"$/g, "");
  }
}

function loadKeypair(path: string): Keypair {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

async function main() {
  const adminPath = process.argv[2];
  if (!adminPath) {
    console.error("Usage: npx tsx scripts/mainnet-init-config.ts <admin-keypair.json>");
    process.exit(1);
  }

  loadEnvLocal();

  const admin = loadKeypair(adminPath);
  const backendAuthority = getBackendAuthorityKeypair().publicKey;
  const usdcMint = new PublicKey(MAINNET_USDC_MINT);
  const treasury = admin.publicKey;

  const rpcUrl = process.env.SOLANA_RPC_URL;
  if (!rpcUrl) {
    console.error("SOLANA_RPC_URL is not set (checked real env and .env.local)");
    process.exit(1);
  }
  const connection = new Connection(rpcUrl, "confirmed");

  const configPda = getConfigPda();
  const existing = await connection.getAccountInfo(configPda);
  if (existing) {
    console.error(
      `Config PDA ${configPda.toBase58()} already exists on this cluster — refusing to re-initialize.`,
    );
    process.exit(1);
  }

  console.log("About to call initialize_config with:");
  console.log("  cluster (RPC):     ", rpcUrl);
  console.log("  admin:             ", admin.publicKey.toBase58());
  console.log("  treasury:          ", treasury.toBase58(), "(same as admin)");
  console.log("  backend_authority: ", backendAuthority.toBase58());
  console.log("  usdc_mint:         ", usdcMint.toBase58(), "(verify this against Circle's own docs before proceeding)");
  console.log("  fee_bps:           ", FEE_BPS);
  console.log("  fee_min_usdc:      ", FEE_MIN_USDC);
  console.log("  config PDA:        ", configPda.toBase58());

  const program = getServerProgram(connection, admin);
  const signature = await program.methods
    .initializeConfig(treasury, backendAuthority, usdcMint, FEE_BPS, new BN(FEE_MIN_USDC))
    .accountsPartial({
      admin: admin.publicKey,
      config: configPda,
    })
    .rpc();

  console.log("\ninitialize_config confirmed:", signature);
  console.log("Config PDA is now live at:", configPda.toBase58());
}

main().catch((error) => {
  console.error("initialize_config failed:", error);
  process.exit(1);
});
