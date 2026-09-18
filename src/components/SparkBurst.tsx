// Angles measured in standard CSS terms (0° = pointing right, clockwise
// positive, since CSS y grows downward: 90°=down, 180°=left, 270°=up).
// Spread wide enough that the dashes read as distinct sparks with visible
// gaps between them (docs/mockup/landing.png) rather than merging into one
// solid chevron shape.
const RIGHT_ANGLES = [-38, 0, 38];
const LEFT_ANGLES = [142, 180, 218];
// Wider wrap-around arc (up, through upper-left and left, to lower-left) —
// matches the fuller circular spread around Rally's hand in
// docs/mockup/landing.png, as opposed to the tighter fan used for the CTA.
const WRAP_ANGLES = [255, 212, 169, 126];

type Variant = "fan" | "fan-sm" | "wrap" | "ring";

// Radius (distance from the anchor point) and dash size are both
// per-variant, not shared — tuning one context previously de-tuned
// another when they shared one constant. "fan" is the CTA-scale accent;
// "fan-sm" is the same tight 3-dash spread at a much smaller scale, for
// flanking small inline icons (e.g. the gift-box/recipient-mode icons)
// rather than a full-size button; "wrap" is the wider arc around Rally's
// hand; "ring" reuses wrap's fuller arc on BOTH sides (via SparkBurst) to
// read as fully encircling a wide element like a headline, at its own
// radius rather than wrap's icon-scale one. Radius is a CSS custom
// property (not a plain number) so it can shrink on narrow viewports
// where needed.
const RADIUS_VAR = "var(--spark-radius)";
const RADIUS_CLASSES: Record<Variant, string> = {
  // Fixed (not responsive) — the CTA is centered on mobile with room either
  // side, so the same offset used on desktop doesn't risk off-screen
  // clipping and the spacing should read identically at both sizes.
  fan: "[--spark-radius:28px]",
  "fan-sm": "[--spark-radius:14px]",
  wrap: "[--spark-radius:14px] sm:[--spark-radius:34px]",
  ring: "[--spark-radius:22px] sm:[--spark-radius:48px]",
};

// Dash length halved from the original w-5 across the board (h-1 w-2.5).
// "fan-sm" uses the same dash weight as "fan" — measuring the mockup's
// gift-box sparks against its icon showed the dashes themselves aren't
// dramatically smaller than the CTA's, they just sit closer in (a
// smaller radius, not a smaller dash) around a smaller anchor.
const DASH_SIZE_CLASSES: Record<Variant, string> = {
  fan: "h-1 w-2.5",
  "fan-sm": "h-1 w-2.5",
  wrap: "h-1 w-2.5",
  ring: "h-1 w-2.5",
};

// Animation lives on an inner element, kept separate from the outer
// element's rotate/translateX positioning below — a CSS animation replaces
// the whole `transform` property on whatever it's applied to, so animating
// scale on the same element that's positioned via `transform` would wipe
// out the rotate+translateX placement. "wrap"/"ring" twinkle gently in
// top-to-bottom order (WRAP_ANGLES is already listed in that order); the
// "fan" variants pop in with a bouncier overshoot. Each dash's
// `animation-delay` is index-based, and because every dash in a cluster
// shares one `animation-duration`, that per-dash phase offset persists on
// every loop — not just the first mount — so the staggered order keeps
// repeating.
const ANIMATION_CLASS: Record<Variant, string> = {
  fan: "animate-spark-pop",
  "fan-sm": "animate-spark-pop",
  wrap: "animate-spark-twinkle",
  ring: "animate-spark-twinkle",
};
const STAGGER_MS: Record<Variant, number> = {
  fan: 140,
  "fan-sm": 120,
  wrap: 220,
  ring: 180,
};

function Spark({
  angleDeg,
  anchor,
  variant,
  index,
}: {
  angleDeg: number;
  anchor: "left" | "right";
  variant: Variant;
  index: number;
}) {
  return (
    <span
      aria-hidden
      className={`absolute top-1/2 ${RADIUS_CLASSES[variant]} ${
        anchor === "left" ? "left-0" : "left-full"
      }`}
      style={{
        transform: `translate(-50%, -50%) rotate(${angleDeg}deg) translateX(${RADIUS_VAR})`,
      }}
    >
      <span
        className={`block rounded-full bg-gold ${DASH_SIZE_CLASSES[variant]} ${ANIMATION_CLASS[variant]}`}
        style={{ animationDelay: `${index * STAGGER_MS[variant]}ms` }}
      />
    </span>
  );
}

const VARIANT_ANGLES: Record<"left" | "right", Record<Variant, number[]>> = {
  left: { fan: LEFT_ANGLES, "fan-sm": LEFT_ANGLES, wrap: WRAP_ANGLES, ring: WRAP_ANGLES },
  right: {
    fan: RIGHT_ANGLES,
    "fan-sm": RIGHT_ANGLES,
    wrap: RIGHT_ANGLES.map((a) => 180 - a),
    ring: WRAP_ANGLES.map((a) => 180 - a),
  },
};

/**
 * One cluster of gold dashes, all at the same radius from a single anchor
 * point (`rotate` then `translate`, in that explicit order via inline style
 * — Tailwind's transform utilities always compose translate before rotate
 * internally, which breaks this trick). `anchor` picks which edge it hangs
 * off: "left" points away to the left (use on the right edge of whatever
 * it's decorating), "right" points away to the right (use on the left
 * edge). `variant` picks the spread and scale: "fan" is the CTA-scale
 * 3-dash arc; "fan-sm" is the same arc at icon scale; "wrap" is a wider
 * 4-dash arc that wraps further around the anchor, for when the
 * decoration needs to read as surrounding something (e.g. Rally's hand)
 * rather than just flanking it. Position it with an absolutely-positioned
 * wrapper — this component itself renders at `top-1/2` of its nearest
 * `relative` ancestor.
 */
export function SparkCluster({
  anchor,
  variant = "fan",
}: {
  anchor: "left" | "right";
  variant?: Variant;
}) {
  const angles = VARIANT_ANGLES[anchor][variant];
  return (
    <>
      {angles.map((angle, index) => (
        <Spark
          key={angle}
          angleDeg={angle}
          anchor={anchor}
          variant={variant}
          index={index}
        />
      ))}
    </>
  );
}

/**
 * Both clusters at once, flanking an element on both sides — the accent
 * used around the CTA in the mockups (docs/Mockup.md, docs/mockup/
 * landing.png) at the default `variant="fan"`, at `variant="fan-sm"`
 * around small icons (e.g. the gift-box/recipient-mode icons on the gift
 * page), and at `variant="ring"` fully encircling a wide element like a
 * headline (each side's fuller wrap-style arc meeting the other's). Wrap
 * the target in a `relative inline-block` container and render this
 * alongside it.
 */
export function SparkBurst({
  variant = "fan",
}: {
  variant?: Extract<Variant, "fan" | "fan-sm" | "ring">;
} = {}) {
  return (
    <>
      <SparkCluster anchor="left" variant={variant} />
      <SparkCluster anchor="right" variant={variant} />
    </>
  );
}
