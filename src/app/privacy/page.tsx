import type { Metadata } from "next";
import { LegalDocumentShell } from "@/components/legal/LegalDocumentShell";
import { PRIVACY_LAST_UPDATED } from "@/lib/legal/constants";

export const metadata: Metadata = {
  title: "Privacy Policy - ChainStock",
};

/**
 * Placeholder-but-complete draft privacy policy, not reviewed by a
 * lawyer — see terms/page.tsx's doc comment for the same caveat.
 */
export default function PrivacyPage() {
  return (
    <LegalDocumentShell title="Privacy Policy" lastUpdated={PRIVACY_LAST_UPDATED}>
      <section>
        <h2>1. Overview</h2>
        <p>
          This policy explains what ChainStock collects, why, and how it&rsquo;s
          handled. ChainStock is a non-custodial app - we never hold your
          funds or private keys.
        </p>
      </section>

      <section>
        <h2>2. Information we collect</h2>
        <ul>
          <li>
            <strong>Wallet addresses</strong> - the public addresses of
            wallets you connect (wallet-adapter for sending, Privy for
            claiming), plus whatever a Solana block explorer would already
            show about them.
          </li>
          <li>
            <strong>Email address</strong> - only if you sign in with email
            via Privy, or if a gift sender enters your email as the
            recipient (stored to match you to that gift at claim time, and
            hashed before being recorded on-chain - your plaintext email
            never touches the blockchain).
          </li>
          <li>
            <strong>Gift details</strong> - amount, stock, recipient
            (wallet/email/open-link), status, and the on-chain transaction
            signatures for anything you send or claim.
          </li>
          <li>
            <strong>Anti-bot signals</strong> - a hashed IP address and
            Cloudflare Turnstile result, recorded only for open-link (FCFS)
            claim attempts.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. How we use it</h2>
        <p>
          To operate the core product: index and display your gift history,
          verify claim eligibility, run anti-bot checks, and show accurate
          gift/claim links. We don&rsquo;t sell your data or use it for
          third-party advertising.
        </p>
      </section>

      <section>
        <h2>4. How we share it</h2>
        <p>
          We share data with the service providers ChainStock is built on
          (see Terms &sect;8: Privy, Solana RPC providers, Cloudflare) only as
          needed to run the product, and if required by law or to protect
          against fraud or abuse.
        </p>
      </section>

      <section>
        <h2>5. Blockchain data</h2>
        <p>
          Solana is a public, permanent ledger. Wallet addresses, transaction
          amounts, and gift status are publicly visible and permanently
          recorded on-chain once confirmed, whether or not you keep using
          ChainStock. We can&rsquo;t delete or alter on-chain data - only what
          lives in our own database.
        </p>
      </section>

      <section>
        <h2>6. Cookies and local storage</h2>
        <p>
          We use your browser&rsquo;s local storage for functional purposes -
          e.g. remembering your in-progress gift draft, and whether
          you&rsquo;ve accepted these Terms - not for third-party ad tracking.
        </p>
      </section>

      <section>
        <h2>7. Data retention</h2>
        <p>
          Gift and claim records are kept indefinitely, matching the
          permanence of the on-chain record they mirror. You can ask us to
          delete off-chain data tied to your email address; wallet
          addresses and on-chain activity can&rsquo;t be un-recorded.
        </p>
      </section>

      <section>
        <h2>8. Security</h2>
        <p>
          We take reasonable technical measures to protect the data we
          hold, but no system is perfectly secure. You&rsquo;re responsible for
          your own wallet security - see Terms &sect;3.
        </p>
      </section>

      <section>
        <h2>9. Your choices</h2>
        <p>
          You can disconnect your wallet or sign out at any time. Declining
          these Terms means you can browse the app but can&rsquo;t send or
          claim a gift.
        </p>
      </section>

      <section>
        <h2>10. International users</h2>
        <p>
          ChainStock may process data in different countries than where you
          live. By using the service you consent to that transfer, to the
          extent permitted by local law.
        </p>
      </section>

      <section>
        <h2>11. Children&rsquo;s privacy</h2>
        <p>
          ChainStock isn&rsquo;t directed at children and shouldn&rsquo;t be used by
          anyone under the age required to hold cryptocurrency or
          securities-linked assets in their jurisdiction.
        </p>
      </section>

      <section>
        <h2>12. Changes to this policy</h2>
        <p>
          We may update this policy as the product evolves. Material
          changes require re-acceptance before you can send or claim
          another gift.
        </p>
      </section>

      <section>
        <h2>13. Contact</h2>
        <p>Questions about this policy? Reach out through the app.</p>
      </section>
    </LegalDocumentShell>
  );
}
