import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

type Variant = "primary" | "secondary";

const baseClasses =
  "inline-flex items-center justify-center rounded-full px-8 py-4 font-display font-semibold text-lg transition hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:translate-y-0 disabled:opacity-50 disabled:pointer-events-none";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-coral text-cloud shadow-sm hover:brightness-95 hover:shadow-md focus-visible:outline-coral",
  secondary:
    "bg-transparent text-ink border border-ink/20 hover:border-ink/40 hover:shadow-sm focus-visible:outline-ink",
};

type CommonProps = {
  variant?: Variant;
  children: ReactNode;
  className?: string;
};

type ButtonAsLink = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps> & {
    href: string;
  };

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    href?: undefined;
  };

export type ButtonProps = ButtonAsLink | ButtonAsButton;

/** Primary/secondary CTA used across every screen — see Design.md. */
export function Button(props: ButtonProps) {
  const { variant = "primary", children, className = "" } = props;
  const classes = `${baseClasses} ${variantClasses[variant]} ${className}`;

  if (typeof props.href === "string") {
    const { href, variant: _v, children: _c, className: _cn, ...rest } = props;
    return (
      <Link href={href} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  const { variant: _v, children: _c, className: _cn, href: _h, ...rest } = props;
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
