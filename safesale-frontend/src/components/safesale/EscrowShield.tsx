import { cn } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";

/**
 * The signature SafeSale "Payment locked in escrow" panel.
 * Designed to maximally reassure both buyers and sellers.
 */
export function EscrowShield({
  amount,
  className,
  caption = "Held safely in escrow until you confirm delivery",
}: {
  amount: string;
  className?: string;
  caption?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-brand-soft via-white to-brand-soft/60 p-5",
        className
      )}
    >
      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-emerald-100/60 blur-3xl" />

      <div className="relative flex items-start gap-4">
        <div className="relative">
          <span className="absolute inset-0 rounded-full bg-brand/15 animate-lock-pulse" />
          <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-[0_8px_24px_-8px_color-mix(in_oklab,var(--brand)_70%,transparent)]">
            <ShieldCheck className="h-6 w-6" />
          </span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-brand-soft-foreground/80">
              Payment locked
            </p>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-medium text-emerald-900 ring-1 ring-inset ring-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Verified
            </span>
          </div>
          <p className="mt-1 text-2xl font-semibold text-ink">{amount}</p>
          <p className="mt-2 text-sm leading-snug text-ink-soft">{caption}</p>
        </div>
      </div>
    </div>
  );
}
