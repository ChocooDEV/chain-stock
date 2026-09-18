const BASE58_CHARS =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/**
 * Stand-in for the real `claim_seed` — an actual one only exists once
 * `create_gift` has landed on-chain and the backend has indexed it (see
 * docs/Architecture.md), neither of which is wired up yet.
 *
 * Generated once, at the moment `GiftForm` calls this (i.e. when "Send
 * gift" is clicked), and carried through the URL to `/gift/sent?id=...`
 * — not regenerated on the confirmation page itself, which would produce
 * a *different* fake link on every reload and make the mock obvious in
 * the wrong way. Once the backend exists, this id becomes the real
 * `claim_seed` and `/gift/sent` fetches the actual gift record by it
 * instead of reading it out of local draft state.
 */
export function generateMockClaimSeed() {
  let seed = "";
  for (let i = 0; i < 10; i += 1) {
    seed += BASE58_CHARS[Math.floor(Math.random() * BASE58_CHARS.length)];
  }
  return seed;
}
