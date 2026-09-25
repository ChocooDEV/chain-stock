import { PublicKey, TransactionInstruction } from "@solana/web3.js";

const QUOTE_URL = "https://lite-api.jup.ag/swap/v1/quote";
const SWAP_INSTRUCTIONS_URL = "https://lite-api.jup.ag/swap/v1/swap-instructions";

/**
 * 1%. Measured price impact for a $25 swap into the Backpack Securities
 * catalog sits under 0.01%, so this is almost entirely headroom for price
 * movement between quoting and landing rather than for depth. Too tight
 * fails claims that would otherwise settle fine; too loose invites a bad
 * fill on a thin ticker.
 */
export const CLAIM_SLIPPAGE_BPS = 100;

/**
 * Caps how many accounts a route may touch. The claim transaction also
 * carries `claim_gift` (12 accounts) and an idempotent ATA creation, and
 * the whole thing has to fit Solana's 1232-byte limit — a measured
 * single-hop route leaves ~290 bytes spare, so this keeps Jupiter from
 * returning a multi-hop route that would blow the budget.
 */
const MAX_ROUTE_ACCOUNTS = 40;

/** Opaque to us — handed straight back to the swap-instructions call. */
export type JupiterQuote = {
  inAmount: string;
  outAmount: string;
  priceImpactPct: string;
  routePlan: unknown[];
};

type RawInstruction = {
  programId: string;
  accounts: { pubkey: string; isSigner: boolean; isWritable: boolean }[];
  data: string;
};

export type JupiterSwapInstructions = {
  computeBudgetInstructions: TransactionInstruction[];
  swapInstruction: TransactionInstruction;
  addressLookupTableAddresses: string[];
};

function toInstruction(raw: RawInstruction): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey(raw.programId),
    keys: raw.accounts.map((account) => ({
      pubkey: new PublicKey(account.pubkey),
      isSigner: account.isSigner,
      isWritable: account.isWritable,
    })),
    data: Buffer.from(raw.data, "base64"),
  });
}

export async function fetchSwapQuote({
  inputMint,
  outputMint,
  amount,
  slippageBps = CLAIM_SLIPPAGE_BPS,
}: {
  inputMint: PublicKey;
  outputMint: PublicKey;
  amount: bigint;
  slippageBps?: number;
}): Promise<JupiterQuote> {
  const url =
    `${QUOTE_URL}?inputMint=${inputMint.toBase58()}` +
    `&outputMint=${outputMint.toBase58()}` +
    `&amount=${amount.toString()}` +
    `&slippageBps=${slippageBps}` +
    `&maxAccounts=${MAX_ROUTE_ACCOUNTS}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Jupiter quote failed (${res.status})`);
  }
  const body = await res.json();
  if (!body || typeof body !== "object" || !Array.isArray(body.routePlan)) {
    throw new Error(
      typeof body?.error === "string"
        ? `Jupiter has no route for this stock right now: ${body.error}`
        : "Jupiter returned no route for this stock right now",
    );
  }
  return body as JupiterQuote;
}

/**
 * `skipUserAccountsRpcCalls` is required, not an optimization: at build
 * time the claimer's USDC account is still empty (or absent entirely) —
 * `claim_gift` funds it earlier in this same transaction — so letting
 * Jupiter pre-check balances would fail on a perfectly valid claim.
 *
 * `destinationTokenAccount` is passed so Jupiter doesn't emit its own
 * setup instruction for it. Its setup instructions pay for account
 * creation from `userPublicKey`, which on a sponsored claim is exactly
 * the wallet with no SOL; the caller creates that account itself with the
 * correct payer instead.
 */
export async function fetchSwapInstructions({
  quote,
  userPublicKey,
  destinationTokenAccount,
}: {
  quote: JupiterQuote;
  userPublicKey: PublicKey;
  destinationTokenAccount: PublicKey;
}): Promise<JupiterSwapInstructions> {
  const res = await fetch(SWAP_INSTRUCTIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: userPublicKey.toBase58(),
      destinationTokenAccount: destinationTokenAccount.toBase58(),
      wrapAndUnwrapSol: false,
      skipUserAccountsRpcCalls: true,
      dynamicComputeUnitLimit: false,
    }),
  });

  if (!res.ok) {
    throw new Error(`Jupiter swap-instructions failed (${res.status})`);
  }
  const body = await res.json();
  if (!body?.swapInstruction) {
    throw new Error(
      typeof body?.error === "string"
        ? `Jupiter couldn't build the swap: ${body.error}`
        : "Jupiter couldn't build the swap for this claim",
    );
  }

  return {
    computeBudgetInstructions: (body.computeBudgetInstructions ?? []).map(toInstruction),
    swapInstruction: toInstruction(body.swapInstruction),
    addressLookupTableAddresses: body.addressLookupTableAddresses ?? [],
  };
}
