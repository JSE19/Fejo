import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface TimelineStep {
  key: string;
  title: string;
  description?: string;
  at?: string;
  state: "done" | "active" | "pending" | "alert";
}

export function Timeline({ steps, className }: { steps: TimelineStep[]; className?: string }) {
  return (
    <ol className={cn("relative", className)}>
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        const isDone = step.state === "done";
        const isActive = step.state === "active";
        const isAlert = step.state === "alert";

        return (
          <li key={step.key} className={cn("relative flex gap-3 pb-5", last && "pb-0")}>
            {!last && (
              <span
                className={cn(
                  "absolute left-[11px] top-6 h-[calc(100%-12px)] w-px",
                  isDone ? "bg-brand/40" : "bg-border"
                )}
                aria-hidden
              />
            )}
            <span
              className={cn(
                "relative z-10 mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full ring-4",
                isDone && "bg-brand text-brand-foreground ring-brand/15",
                isActive && "bg-white text-brand ring-brand/15 border border-brand/40",
                step.state === "pending" && "bg-white text-muted-foreground ring-border/30 border border-border",
                isAlert && "bg-rose-500 text-white ring-rose-500/15"
              )}
            >
              {isDone ? (
                <Check className="h-3 w-3" strokeWidth={3} />
              ) : isActive ? (
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              ) : isAlert ? (
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
              )}
            </span>
            <div className="min-w-0 flex-1 pt-0">
              <div className="flex items-baseline justify-between gap-3">
                <p
                  className={cn(
                    "text-sm font-medium",
                    step.state === "pending" ? "text-muted-foreground" : "text-ink"
                  )}
                >
                  {step.title}
                </p>
                {step.at && (
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {step.at}
                  </span>
                )}
              </div>
              {step.description && (
                <p className="mt-0.5 text-xs leading-snug text-ink-soft">
                  {step.description}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
