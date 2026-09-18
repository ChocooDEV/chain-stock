import { CheckCircle2, Clock, MinusCircle } from "lucide-react";
import type { GiftStatus } from "@/lib/historyTypes";

const STATUS_CONFIG: Record<
  GiftStatus,
  { label: string; icon: typeof Clock; className: string }
> = {
  pending: { label: "Pending", icon: Clock, className: "bg-gold/15 text-gold" },
  claimed: { label: "Claimed", icon: CheckCircle2, className: "bg-teal/15 text-teal" },
  canceled: { label: "Canceled", icon: MinusCircle, className: "bg-ink/10 text-ink/40" },
};

/** Small colored pill used in the gift-history tables (docs/mockup/sender-history.png). */
export function StatusPill({ status }: { status: GiftStatus }) {
  const { label, icon: Icon, className } = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${className}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  );
}
