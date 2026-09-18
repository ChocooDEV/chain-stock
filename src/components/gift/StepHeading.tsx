const COLOR_CLASSES = {
  teal: "bg-teal",
  gold: "bg-gold",
};

/** Numbered circle + title used to mark each step of the create-gift form. */
export function StepHeading({
  step,
  color,
  children,
}: {
  step: number;
  color: keyof typeof COLOR_CLASSES;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-base font-bold text-white ${COLOR_CLASSES[color]}`}
        aria-hidden
      >
        {step}
      </span>
      <h2 className="font-display text-2xl font-bold">{children}</h2>
    </div>
  );
}
