/**
 * Renders text along a gentle arc — dips slightly in the middle, lifts at
 * the ends (docs/mockup/gift-send.png's "Gift sent!" headline), rather
 * than sitting on a flat baseline. Each character is a normal in-flow
 * inline-block span; only a paint-time `transform` (rotate + translateY)
 * is applied per character, so the element's layout box is unaffected —
 * a sibling relying on this component's rendered size to position itself
 * (e.g. SparkBurst, which needs its wrapper to shrink-wrap the real
 * content) sees the same box it would if this just rendered plain text.
 *
 * Spaces are swapped for non-breaking spaces so their inline-block span
 * doesn't collapse to zero width.
 */
export function CurvedText({
  text,
  radius = 450,
  degreesPerChar = 1.7,
  className = "",
}: {
  text: string;
  radius?: number;
  degreesPerChar?: number;
  className?: string;
}) {
  const chars = [...text];
  const center = (chars.length - 1) / 2;

  return (
    // Fragmenting text into per-character spans can make screen readers
    // spell it out instead of reading it as a word — aria-label carries
    // the real string, and the fragmented rendering is hidden from it.
    <span className={`inline-block whitespace-pre ${className}`} aria-label={text}>
      <span aria-hidden>
        {chars.map((char, index) => {
          const angleDeg = (index - center) * degreesPerChar;
          const angleRad = (angleDeg * Math.PI) / 180;
          const lift = radius * (1 - Math.cos(angleRad));
          return (
            <span
              key={index}
              className="inline-block"
              style={{
                transform: `translateY(-${lift}px) rotate(${angleDeg}deg)`,
              }}
            >
              {char === " " ? " " : char}
            </span>
          );
        })}
      </span>
    </span>
  );
}
