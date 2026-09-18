import Image from "next/image";
import rallyResting from "../../public/mascot/rally-resting.png";

/**
 * Full-section loading state — Rally curled up asleep, per docs/Mascot.md's
 * "Resting (empty state)" pose, with a gentle breathing animation so it
 * reads as "waiting," not a static/broken image. Meant to replace a
 * page's whole content area while its data loads (see the gift page),
 * not to sit alongside partially-loaded content — revealing a page in
 * one piece once data is ready avoids pieces (e.g. a price banner)
 * popping in after everything else has already rendered.
 */
export function Loader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 py-20">
      <Image
        src={rallyResting}
        alt=""
        aria-hidden
        priority
        className="w-40 animate-loader-breathe drop-shadow-[0_10px_15px_rgba(33,27,29,0.15)] sm:w-48"
      />
      <p className="font-display text-sm text-ink/70">{label}</p>
    </div>
  );
}
