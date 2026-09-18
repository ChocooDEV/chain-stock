import type { ReactNode } from "react";

/**
 * Consistent page gutters and max-width. Every top-level section should
 * wrap its content in this rather than repeating padding/max-width rules.
 */
export function Container({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  );
}
