import { AnchorProvider, BN, Program, type Wallet } from "@coral-xyz/anchor";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import { Connection, Keypair, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import idl from "./idl/chainstock.json";
import type { Chainstock } from "./idl/chainstock";

/** Same address as `declare_id!()` in `anchor/programs/chainstock/src/lib.rs`
 *  — read from the IDL rather than duplicated as a separate constant, so
 *  the two can never drift. */
export const CHAINSTOCK_PROGRAM_ID = new PublicKey(idl.address);

const CONFIG_SEED = Buffer.from("config");
const GIFT_SEED = Buffer.from("gift");

/** Same derivation as `anchor/programs/chainstock/src/constants.rs` +
 *  each instruction's `seeds = [...]` constraint — keep these two in
 *  sync by hand, there's no shared source of truth between Rust and TS. */
export function getConfigPda(): PublicKey {
  return PublicKey.findProgramAddressSync([CONFIG_SEED], CHAINSTOCK_PROGRAM_ID)[0];
}

export function getGiftPda(claimSeed: Uint8Array): PublicKey {
  return PublicKey.findProgramAddressSync(
    [GIFT_SEED, Buffer.from(claimSeed)],
    CHAINSTOCK_PROGRAM_ID,
  )[0];
}

/** Classic Token Program ATA only — matches the mock-USDC mint
 *  `docs/Wallets.md`'s devnet `Config.usdc_mint` points at (see
 *  `close_config.rs`'s doc comment). Real USDC is also classic SPL
 *  Token, not Token-2022, so this doesn't need to change for mainnet.
 *  `allowOwnerOffCurve: true` always — needed for the vault (owned by
 *  the off-curve `Gift` PDA) and harmless for a regular wallet owner: it
 *  only skips an on-curve validity assertion, the derived address is
 *  identical either way. */
export function getAta(owner: PublicKey, mint: PublicKey): PublicKey {
  return getAssociatedTokenAddressSync(
    mint,
    owner,
    true,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
}

/** Wraps a connected wallet-adapter wallet (via `useAnchorWallet()`) into
 *  an `AnchorProvider` and returns a typed `Program<Chainstock>` client
 *  for building instructions. Takes wallet-adapter's own `AnchorWallet`
 *  type, not `@coral-xyz/anchor`'s `Wallet` — the two are structurally
 *  incompatible at the type level (`Wallet` declares a `payer: Keypair`
 *  field meant for Node-side, keypair-holding usage; a browser wallet
 *  extension never exposes a raw keypair) even though `AnchorProvider`
 *  only ever actually calls `publicKey`/`signTransaction`/
 *  `signAllTransactions` on it at runtime — hence the cast. */
export function getProgram(connection: Connection, wallet: AnchorWallet): Program<Chainstock> {
  const provider = new AnchorProvider(connection, wallet as unknown as Wallet, {
    commitment: "confirmed",
  });
  return new Program(idl as Chainstock, provider);
}

/** Minimal local equivalent of `@coral-xyz/anchor`'s own `NodeWallet` —
 *  not imported directly because its ESM build (`dist/esm/index.js`) has
 *  a real packaging bug in the installed version (an `import` at the top
 *  of the file alongside a stray `exports.Wallet = require(...)` line,
 *  which is invalid in real ESM), so Next's production build fails to
 *  resolve it ("'Wallet' is not exported from '@coral-xyz/anchor'") even
 *  though `tsc --noEmit` alone doesn't catch it. This mirrors
 *  `nodewallet.js`'s actual implementation exactly. */
class ServerWallet implements Wallet {
  constructor(readonly payer: Keypair) {}

  get publicKey(): PublicKey {
    return this.payer.publicKey;
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    if (tx instanceof VersionedTransaction) {
      tx.sign([this.payer]);
    } else {
      tx.partialSign(this.payer);
    }
    return tx;
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
    return Promise.all(txs.map((tx) => this.signTransaction(tx)));
  }
}

/** Server-side variant of `getProgram` — for API routes building
 *  instructions with a real, held `Keypair` (e.g. `backend_authority`,
 *  see `backendAuthority.ts`) rather than a browser wallet-adapter
 *  connection. */
export function getServerProgram(connection: Connection, keypair: Keypair): Program<Chainstock> {
  const provider = new AnchorProvider(connection, new ServerWallet(keypair), {
    commitment: "confirmed",
  });
  return new Program(idl as Chainstock, provider);
}

export { BN };
