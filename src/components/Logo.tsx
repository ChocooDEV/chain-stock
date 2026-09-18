import Image from "next/image";
import Link from "next/link";
import logoCompact from "../../public/mascot/logo-compact.png";
import logoHeader from "../../public/mascot/logo-header.png";

const VARIANTS = {
  /** Face badge + plain wordmark — small, tight nav bars (landing header). */
  compact: { src: logoCompact, className: "h-9 w-auto sm:h-12 lg:h-14" },
  /** Fuller Rally-leaning-on-the-$ lockup — standalone/hero placements
   *  with room to breathe (e.g. the gift page). See docs/Mascot.md's
   *  "Logo lockup" section for why the two assets are kept separate. A
   *  drop-shadow (not box-shadow — this follows the image's alpha
   *  silhouette rather than its rectangular box, same as Rally's hero
   *  image on the landing page) gives it some lift. Stronger than a
   *  straight scaled-down version of the landing hero's shadow — at this
   *  much smaller size a proportionally-scaled shadow reads as barely
   *  there, so opacity/blur are pushed higher to stay visible. */
  header: {
    src: logoHeader,
    className: "h-16 w-auto drop-shadow-[0_10px_14px_rgba(33,27,29,0.35)] sm:h-20",
  },
};

export function Logo({
  variant = "compact",
  className: extraClassName = "",
}: {
  variant?: keyof typeof VARIANTS;
  /** Appended to the variant's own classes — e.g. a drop-shadow for a
   *  standalone placement, without changing every other use of the same
   *  variant (like the landing nav bar, which stays flat on purpose). */
  className?: string;
}) {
  const { src, className } = VARIANTS[variant];
  return (
    <Link href="/" className="inline-flex items-center" aria-label="ChainStock home">
      <Image src={src} alt="ChainStock" priority className={`${className} ${extraClassName}`} />
    </Link>
  );
}
