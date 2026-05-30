import { cn } from "@/lib/utils";
import type { EscrowStatus } from "@/lib/types";
import {
  CheckCircle2,
  Clock,
  ShieldCheck,
  Truck,
  PackageCheck,
  AlertTriangle,
  Undo2,
} from "lucide-react";

interface StyleSpec {
  label: string;
  dot: string;
  bg: string;
  text: string;
  ring: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const styles: Record<EscrowStatus, StyleSpec> = {
  pending_payment: {
    label: "Pending payment",
    dot: "bg-amber-500",
    bg: "bg-amber-50",
    text: "text-amber-800",
    ring: "ring-amber-200/70",
    Icon: Clock,
  },
  paid: {
    label: "Paid",
    dot: "bg-brand",
    bg: "bg-brand-soft",
    text: "text-brand-soft-foreground",
    ring: "ring-emerald-200/70",
    Icon: ShieldCheck,
  },
  shipped: {
    label: "Shipped",
    dot: "bg-sky-500",
    bg: "bg-sky-50",
    text: "text-sky-800",
    ring: "ring-sky-200/70",
    Icon: Truck,
  },

  completed: {
    label: "Completed",
    dot: "bg-emerald-600",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    ring: "ring-emerald-200/70",
    Icon: CheckCircle2,
  },

  disputed: {
    label: "Dispute open",
    dot: "bg-rose-500",
    bg: "bg-rose-50",
    text: "text-rose-800",
    ring: "ring-rose-200/70",
    Icon: AlertTriangle,
  },
  resolved: {
    label: "Resolved",
    dot: "bg-slate-500",
    bg: "bg-slate-100",
    text: "text-slate-700",
    ring: "ring-slate-200/70",
    Icon: CheckCircle2,
  },
  refunded: {
    label: "Refunded",
    dot: "bg-slate-500",
    bg: "bg-slate-100",
    text: "text-slate-700",
    ring: "ring-slate-200/70",
    Icon: Undo2,
  },

};

interface PillProps {
  status: EscrowStatus;
  className?: string;
  size?: "sm" | "md";
  withIcon?: boolean;
}

export function EscrowStatusPill({
  status,
  className,
  size = "md",
  withIcon = true,
}: PillProps) {
  const s = styles[status];
  const { Icon } = s;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset",
        s.bg,
        s.text,
        s.ring,
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        className
      )}
    >
      {withIcon ? (
        <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      ) : (
        <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      )}
      {s.label}
    </span>
  );
}
