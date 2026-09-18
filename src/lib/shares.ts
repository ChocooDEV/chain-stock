/** Fractional shares at some prices can be tiny — show enough decimals
 *  that the estimate doesn't just round to "0.00". Used anywhere a dollar
 *  amount is converted to an estimated share count at a live price (the
 *  create-gift amount step, the claim page, the post-claim and gift-history
 *  pages). */
export function formatShares(shares: number) {
  if (shares >= 1) return shares.toFixed(2);
  if (shares >= 0.01) return shares.toFixed(3);
  return shares.toFixed(4);
}
