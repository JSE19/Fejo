import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  variant?: "full" | "mark";
}

export function Logo({ className, variant = "full" }: LogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      {variant === "full" && (
        <span className="text-[17px] font-semibold tracking-[-0.02em] text-ink">
          SafeSale
        </span>
      )}
    </div>
  );
}

/**
 * SafeSale mark — interlocked "SS" monogram.
 *
 * Two flowing S curves drawn as ribbons that overlap at the middle.
 * Reads as:
 *   • "SS" — the brand initials
 *   • Two parties tied together by the same agreement
 *   • Money in motion (a handshake, not a vault)
 *
 * Letterform marks (Stripe, Slack, Square, Shopify, Stake) age much
 * better than icon marks and feel ownable rather than templated.
 *
 * Pure SVG, no background tile — sits cleanly on white cards, the
 * emerald hero gradient, and the warm off-white background.
 * Optically tuned to read at 16px (favicon) through hero sizes.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex h-8 w-8 items-center justify-center",
        className
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 32 32"
        className="h-full w-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Brand emerald, deep → bright, top-left to bottom-right */}
          <linearGradient id="ss-primary" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="hsl(160 68% 22%)" />
            <stop offset="55%" stopColor="hsl(158 64% 32%)" />
            <stop offset="100%" stopColor="hsl(150 58% 40%)" />
          </linearGradient>

          {/* Inner ribbon — slightly lighter so the overlap reads */}
          <linearGradient id="ss-secondary" x1="6" y1="28" x2="28" y2="6" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="hsl(154 56% 44%)" />
            <stop offset="100%" stopColor="hsl(160 64% 30%)" />
          </linearGradient>

          {/*
            Mask that knocks a notch out of the back ribbon where the
            front ribbon crosses it, creating a true "woven" interlock.
          */}
          <mask id="ss-weave" maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32">
            <rect width="32" height="32" fill="white" />
            {/* punch a small gap where the front ribbon enters the back */}
            <path
              d="M 14.5 14 Q 16 15.5 17.5 17"
              stroke="black"
              strokeWidth="3.6"
              strokeLinecap="round"
              fill="none"
            />
          </mask>
        </defs>

        {/*
          BACK ribbon — first S.
          Drawn as a thick stroke that swoops:
            top-right  → middle-left  → bottom-right
          A small notch is masked out at the crossover.
        */}
        <path
          d="
            M 22.5 7
            C 18.5 6.2, 13.5 6.6, 11 9
            C 8.5 11.4, 9.5 14.2, 13 15.5
          "
          stroke="url(#ss-primary)"
          strokeWidth="3.6"
          strokeLinecap="round"
          fill="none"
          mask="url(#ss-weave)"
        />
        <path
          d="
            M 13 15.5
            C 16.5 16.8, 22 17.4, 22 20.6
            C 22 23.2, 18 25.4, 12.5 25.4
          "
          stroke="url(#ss-primary)"
          strokeWidth="3.6"
          strokeLinecap="round"
          fill="none"
        />

        {/*
          FRONT ribbon — second S, mirrored across the diagonal.
          Goes:
            bottom-left → middle-right → top-left
          Drawn on top so it visibly crosses the back ribbon.
        */}
        <path
          d="
            M 9.5 25
            C 13.5 25.8, 18.5 25.4, 21 23
            C 23.5 20.6, 22.5 17.8, 19 16.5
          "
          stroke="url(#ss-secondary)"
          strokeWidth="3.6"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="
            M 19 16.5
            C 15.5 15.2, 10 14.6, 10 11.4
            C 10 8.8, 14 6.6, 19.5 6.6
          "
          stroke="url(#ss-secondary)"
          strokeWidth="3.6"
          strokeLinecap="round"
          fill="none"
        />

        {/*
          Tiny gold "spark of value" tucked into the crossover.
          Connects this mark to the gold sats accents used elsewhere.
        */}
        <circle cx="16" cy="16" r="1.6" fill="hsl(38 92% 58%)" />
      </svg>
    </span>
  );
}
