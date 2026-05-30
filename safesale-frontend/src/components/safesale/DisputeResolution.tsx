import { formatNGN, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Scale, ArrowRight, Undo2, CheckCircle2, Split } from "lucide-react";
import type { DisputeResolution as Res } from "@/lib/types";

interface Props {
  resolution: Res;
  /** Which party is currently viewing this card. Influences phrasing. */
  viewer: "buyer" | "seller" | "admin";
  className?: string;
}

/**
 * Calm, clear resolution outcome card.
 * Shown to both buyer and seller once a mediator has decided.
 */
export function DisputeResolutionCard({ resolution, viewer, className }: Props) {
  const { outcome, buyerRefundNGN, sellerReleaseNGN, reasoning, mediator, resolvedAt } = resolution;
  const total = buyerRefundNGN + sellerReleaseNGN;

  const headline = (() => {
    if (outcome === "release") {
      return viewer === "buyer"
        ? "Funds released to seller"
        : viewer === "seller"
          ? "Full payment released to you"
          : "Resolved — full release to seller";
    }
    if (outcome === "refund") {
      return viewer === "buyer"
        ? "Full refund coming to you"
        : viewer === "seller"
          ? "Full refund issued to buyer"
          : "Resolved — full refund to buyer";
    }
    return viewer === "buyer"
      ? "Partial refund issued"
      : viewer === "seller"
        ? "Partial release"
        : "Resolved — partial split";
  })();

  const Icon = outcome === "release" ? CheckCircle2 : outcome === "refund" ? Undo2 : Split;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-brand-soft via-white to-white p-5 shadow-[0_8px_24px_-16px_rgba(15,42,30,0.15)]",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-brand-soft-foreground">
              Dispute resolved
            </p>
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-medium text-emerald-900 ring-1 ring-inset ring-emerald-200">
              <Scale className="h-2.5 w-2.5" />
              Final
            </span>
          </div>
          <p className="mt-1 text-base font-semibold text-ink sm:text-lg">{headline}</p>
        </div>
      </div>

      {/* Split visual */}
      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-white">
        <div className="flex h-2">
          <div
            className="h-full bg-rose-300"
            style={{ width: `${(buyerRefundNGN / total) * 100}%` }}
            title="Buyer refund"
          />
          <div
            className="h-full bg-brand"
            style={{ width: `${(sellerReleaseNGN / total) * 100}%` }}
            title="Seller release"
          />
        </div>
        <div className="grid grid-cols-2 divide-x divide-border">
          <div className="p-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              <p className="text-[10px] font-medium uppercase tracking-wider text-ink-soft">
                {viewer === "buyer" ? "Refunded to you" : "Refunded to buyer"}
              </p>
            </div>
            <p className="mt-1 text-sm font-semibold tabular-nums text-ink">
              {formatNGN(buyerRefundNGN)}
            </p>
          </div>
          <div className="p-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-brand" />
              <p className="text-[10px] font-medium uppercase tracking-wider text-ink-soft">
                {viewer === "seller" ? "Released to you" : "Released to seller"}
              </p>
            </div>
            <p className="mt-1 text-sm font-semibold tabular-nums text-ink">
              {formatNGN(sellerReleaseNGN)}
            </p>
          </div>
        </div>
      </div>

      {/* Reasoning */}
      <div className="mt-4 rounded-xl border border-border bg-surface-2/30 p-3.5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-ink-soft">
          Mediator's reasoning
        </p>
        <p className="mt-1 text-sm leading-relaxed text-ink">{reasoning}</p>
        <p className="mt-2 text-[11px] text-ink-soft">
          — {mediator} · {formatDate(resolvedAt)}
        </p>
      </div>

      {/* Next-step footnote */}
      <div className="mt-4 flex items-center gap-2 text-xs text-ink-soft">
        <ArrowRight className="h-3.5 w-3.5 text-brand" />
        {viewer === "buyer" &&
          (outcome === "release"
            ? "Funds released. Thanks for your patience."
            : buyerRefundNGN > 0
              ? `Your refund of ${formatNGN(buyerRefundNGN)} lands in your bank within 60 seconds.`
              : "No refund issued for this case.")}
        {viewer === "seller" &&
          (sellerReleaseNGN > 0
            ? `${formatNGN(sellerReleaseNGN)} has been released to your bank account.`
            : "No funds released for this case.")}
        {viewer === "admin" && "Both parties have been notified of this outcome."}
      </div>
    </div>
  );
}
