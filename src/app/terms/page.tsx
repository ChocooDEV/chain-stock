import type { Metadata } from "next";
import { LegalDocumentShell } from "@/components/legal/LegalDocumentShell";
import { TERMS_LAST_UPDATED } from "@/lib/legal/constants";

export const metadata: Metadata = {
  title: "Terms of Service - ChainStock",
};

/**
 * Placeholder-but-complete draft terms, not reviewed by a lawyer — good
 * enough to actually gate the send/claim flow behind (see
 * `LegalGateProvider`) and to be honest with early users about what
 * ChainStock is and isn't, but get real legal review before any real
 * launch with real money at stake.
 */
export default function TermsPage() {
  return (
    <LegalDocumentShell title="Terms of Service" lastUpdated={TERMS_LAST_UPDATED}>
      <section>
        <h2>1. Overview</h2>
        <p>
          ChainStock lets one person send another a gift denominated in a
          tokenized stock, settled on the Solana blockchain. By connecting a
          wallet, signing in, sending a gift, or claiming one, you agree to
          these Terms. If you don&rsquo;t agree, don&rsquo;t use ChainStock.
        </p>
      </section>

      <section>
        <h2>2. Eligibility</h2>
        <p>
          You must be legally able to enter into these Terms in your
          jurisdiction, and old enough to do so under local law. Tokenized
          stock gifting may not be available or lawful everywhere - you&rsquo;re
          responsible for checking your own local rules before sending or
          claiming a gift.
        </p>
      </section>

      <section>
        <h2>3. Accounts and wallets</h2>
        <p>
          Sending a gift requires connecting your own Solana wallet (e.g.
          Phantom, Solflare, Backpack) - you hold your own keys, ChainStock
          never has custody of your funds or the ability to move them
          without your signature. Claiming a gift uses Privy, which can
          create a wallet for you automatically if you don&rsquo;t already have
          one. You&rsquo;re responsible for keeping your wallet and any
          associated recovery credentials secure; ChainStock cannot recover
          lost keys or reverse a transaction once it&rsquo;s confirmed on-chain.
        </p>
      </section>

      <section>
        <h2>4. How gifting works</h2>
        <p>
          Sending a gift escrows funds in an on-chain program account until
          the recipient claims it or the sender cancels it. A small platform
          fee is charged at send time. The program is the source of truth
          for every gift&rsquo;s status - ChainStock&rsquo;s own database is only a
          convenience index of what already happened on-chain, never the
          other way around. A claimed or expired gift cannot be un-claimed;
          a canceled gift cannot be re-sent under the same link.
        </p>
      </section>

      <section>
        <h2>5. Digital assets and blockchain risk</h2>
        <p>
          Tokenized stocks, stablecoins, and the underlying blockchain
          carry real risk: prices move, networks can be congested or
          disrupted, smart contracts can contain bugs despite testing and
          review, and blockchain transactions are generally irreversible.
          ChainStock does not guarantee the value, liquidity, or continued
          tradability of any asset it lets you send or claim.
        </p>
      </section>

      <section>
        <h2>6. Fees</h2>
        <p>
          ChainStock charges a platform fee on every gift sent, set on-chain
          and visible before you send. Network (transaction) fees are
          separate, paid to the Solana network itself, and outside
          ChainStock&rsquo;s control.
        </p>
      </section>

      <section>
        <h2>7. Prohibited use</h2>
        <p>You agree not to use ChainStock to:</p>
        <ul>
          <li>Send gifts funded by stolen, fraudulent, or illegally obtained assets</li>
          <li>Launder money or finance any illegal activity</li>
          <li>Circumvent any sanctions, export control, or other applicable law</li>
          <li>Abuse, spam, or attempt to exploit the platform, its smart contracts, or other users</li>
        </ul>
      </section>

      <section>
        <h2>8. Third-party services</h2>
        <p>
          ChainStock relies on third-party infrastructure it doesn&rsquo;t
          control, including Solana RPC providers, Privy (wallet
          authentication), Backpack Securities and Sunrise (the underlying
          tokenized-stock issuer/listings), Jupiter (token swaps), and
          Cloudflare Turnstile (anti-bot checks). Their availability,
          accuracy, and terms are their own - ChainStock isn&rsquo;t responsible
          for their failures or changes.
        </p>
      </section>

      <section>
        <h2>9. Disclaimers</h2>
        <p>
          ChainStock is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without
          warranties of any kind, express or implied, including
          merchantability, fitness for a particular purpose, and
          non-infringement. We don&rsquo;t warrant that the service will be
          uninterrupted, secure, or error-free.
        </p>
      </section>

      <section>
        <h2>10. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, ChainStock and its
          operators aren&rsquo;t liable for any indirect, incidental, special,
          consequential, or punitive damages, or for any loss of funds,
          data, or goodwill arising from your use of the service, including
          losses from blockchain network issues, smart contract behavior,
          or third-party service failures.
        </p>
      </section>

      <section>
        <h2>11. Changes to these terms</h2>
        <p>
          We may update these Terms as the product evolves. Material
          changes require re-acceptance before you can send or claim
          another gift.
        </p>
      </section>

      <section>
        <h2>12. Contact</h2>
        <p>Questions about these Terms? Reach out through the app.</p>
      </section>
    </LegalDocumentShell>
  );
}
