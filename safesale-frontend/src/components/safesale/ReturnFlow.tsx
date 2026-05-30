import { ProductImage } from "@/components/safesale/ProductImage";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/format";
import type { ReturnEvidence } from "@/lib/types";
import {
  Check,
  Camera,
  PackageOpen,
  Truck,
  PackageCheck,
  AlertCircle,
  Info,
} from "lucide-react";

interface Props {
  evidence?: ReturnEvidence;
  viewer: "buyer" | "seller" | "admin";
  className?: string;
}

type CheckpointKey = "receivedByBuyer" | "packedForReturn" | "receivedBackBySeller";

/**
 * The damaged-return flow widget.
 *
 * Three photo checkpoints, in order. Each must be filled (with timestamped
 * uploads) before the next one unlocks. This is the spec's most-protected
 * scenario — the one where both buyer and seller can have a real grievance.
 *
 *   1. Buyer receives item       → photos of condition on arrival
 *   2. Buyer ships return         → photos of packing + courier receipt
 *   3. Seller receives return     → photos of condition after return
 *
 * The widget adapts to the viewer:
 *   - Buyer: sees the "your responsibility" checkpoints prominently with
 *     guidance about why skipping a step weakens their case.
 *   - Seller: sees the buyer's evidence as "incoming", their own as their
 *     responsibility on step 3.
 *   - Admin: sees all three, can compare side-by-side, no actions.
 */
export function ReturnFlow({ evidence, viewer, className }: Props) {
  const e = evidence ?? {};
  const steps: Array<{
    key: CheckpointKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    owner: "buyer" | "seller";
    desc: string;
    skippedConsequence: string;
  }> = [
    {
      key: "receivedByBuyer",
      label: "On arrival to buyer",
      icon: PackageOpen,
      owner: "buyer",
      desc: "Photos of the item the moment it arrived — every angle, every flaw.",
      skippedConsequence:
        "Without these photos, the seller can later claim the item was already damaged at the buyer's end.",
    },
    {
      key: "packedForReturn",
      label: "Packed for return",
      icon: Truck,
      owner: "buyer",
      desc: "Photos of the item being packed and the courier receipt with tracking.",
      skippedConsequence:
        "Without these, you can't prove the item left in the same condition it arrived.",
    },
    {
      key: "receivedBackBySeller",
      label: "Received back by seller",
      icon: PackageCheck,
      owner: "seller",
      desc: "Photos of the item the moment it arrived back at the seller.",
      skippedConsequence:
        "Without these, the seller forfeits the right to claim return damage.",
    },
  ];

  // Determine which step is currently active.
  const activeIdx = steps.findIndex((s) => !e[s.key]);

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50/40 via-white to-white p-5",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-indigo-700">
            Return in progress
          </p>
          <h3 className="mt-1 text-base font-semibold text-ink">
            Three-step photo trail
          </h3>
          <p className="mt-1 max-w-md text-xs text-ink-soft">
            Every return on SafeSale requires timestamped photo evidence at
            three stages. This protects both sides from blame for damage that
            happens in transit.
          </p>
        </div>
        <div className="hidden sm:block">
          <Info className="h-4 w-4 text-indigo-500" />
        </div>
      </div>

      {/* Step list */}
      <ol className="mt-5 space-y-3">
        {steps.map((step, i) => {
          const done = !!e[step.key];
          const active = !done && i === activeIdx;
          const future = !done && i > activeIdx;
          const data = e[step.key];

          return (
            <li
              key={step.key}
              className={cn(
                "overflow-hidden rounded-xl border bg-white",
                done && "border-emerald-200/70 bg-brand-soft/30",
                active && "border-indigo-300 ring-2 ring-indigo-100",
                future && "border-border opacity-75"
              )}
            >
              <div className="flex items-start gap-3 p-4">
                {/* Numbered chip */}
                <span
                  className={cn(
                    "mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    done && "bg-brand text-brand-foreground",
                    active && "bg-indigo-600 text-white",
                    future && "bg-secondary text-ink-soft"
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        active ? "text-ink" : "text-ink"
                      )}
                    >
                      {step.label}
                    </p>
                    <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-ink-soft">
                      {step.owner === "buyer" ? "Buyer" : "Seller"} step
                    </span>
                    {data && (
                      <span className="text-[10px] text-ink-soft">
                        · {data.count} photo{data.count === 1 ? "" : "s"}{" "}
                        uploaded {formatRelative(data.at)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                    {step.desc}
                  </p>
                  {/* Tracking number on step 2 */}
                  {step.key === "packedForReturn" && data && "trackingNumber" in data && data.trackingNumber && (
                    <p className="mt-1.5 text-[11px] text-ink">
                      Tracking:{" "}
                      <span className="font-mono font-medium">
                        {data.trackingNumber}
                      </span>
                    </p>
                  )}

                  {/* Inline thumbnails of uploaded evidence */}
                  {data && (
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {Array.from({ length: data.count }).map((_, idx) => (
                        <ProductImage
                          key={idx}
                          image={{
                            seed: `ret-${step.key}-${idx}`,
                            hueA: step.owner === "buyer" ? 0 : 150,
                            hueB: step.owner === "buyer" ? 20 : 170,
                            label: "",
                          }}
                          className="aspect-square"
                          rounded="rounded-md"
                        />
                      ))}
                    </div>
                  )}

                  {/* Active step CTA */}
                  {active && viewer === step.owner && (
                    <div className="mt-3 space-y-2">
                      <button className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700">
                        <Camera className="h-3.5 w-3.5" />
                        Upload {step.key === "packedForReturn" ? "photos + receipt" : "photos"}
                      </button>
                      <div className="flex items-start gap-2 rounded-md bg-rose-50/60 px-3 py-2 text-[11px] text-rose-900">
                        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                        <span>{step.skippedConsequence}</span>
                      </div>
                    </div>
                  )}

                  {/* Active step but viewer is the OTHER party */}
                  {active && viewer !== step.owner && viewer !== "admin" && (
                    <p className="mt-2 text-[11px] text-indigo-700">
                      Waiting on the {step.owner} to complete this step.
                    </p>
                  )}

                  {future && (
                    <p className="mt-2 text-[11px] text-ink-soft">
                      Unlocks after step {i} is complete.
                    </p>
                  )}
                </div>

                <step.icon
                  className={cn(
                    "hidden h-5 w-5 shrink-0 sm:block",
                    done && "text-brand",
                    active && "text-indigo-600",
                    future && "text-ink-soft/50"
                  )}
                />
              </div>
            </li>
          );
        })}
      </ol>

      {/* Closing note */}
      <p className="mt-4 text-[11px] leading-relaxed text-ink-soft">
        When all three sets are uploaded, the mediator will compare the photos
        and decide proportionally — including a partial refund if the return
        arrived in worse condition than it left.
      </p>
    </section>
  );
}
