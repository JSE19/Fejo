import { cn } from "@/lib/utils";
import { hashStr } from "@/lib/seeded";
import type { ProductImage as P } from "@/lib/types";

interface Props {
  image: P;
  className?: string;
  rounded?: string;
  label?: boolean;
}

/**
 * Renders a deterministic, beautiful gradient-based product placeholder
 * with an abstract category shape. No external network calls.
 */
export function ProductImage({ image, className, rounded = "rounded-xl", label = false }: Props) {
  const h = hashStr(image.seed);
  const angle = h % 360;
  const accent = (h >> 4) % 360;
  const shape = h % 5;

  const bg = `linear-gradient(${angle}deg, hsl(${image.hueA} 35% 88%) 0%, hsl(${image.hueB} 30% 80%) 100%)`;

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted",
        rounded,
        className
      )}
      style={{ background: bg }}
    >
      {/* Subtle accent blob */}
      <div
        className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-40 blur-2xl"
        style={{ background: `hsl(${accent} 60% 70%)` }}
      />
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={`g-${image.seed}`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={`hsl(${image.hueA} 40% 96%)`} stopOpacity="0.7" />
            <stop offset="100%" stopColor={`hsl(${image.hueB} 35% 60%)`} stopOpacity="0.35" />
          </linearGradient>
        </defs>
        {shape === 0 && (
          <>
            <circle cx="100" cy="105" r="50" fill={`url(#g-${image.seed})`} />
            <circle cx="80" cy="90" r="14" fill={`hsl(${accent} 55% 80%)`} opacity="0.6" />
          </>
        )}
        {shape === 1 && (
          <>
            <rect x="55" y="55" width="90" height="120" rx="10" fill={`url(#g-${image.seed})`} />
            <rect x="68" y="72" width="64" height="2" fill={`hsl(${image.hueB} 40% 40%)`} opacity="0.4" />
            <rect x="68" y="82" width="40" height="2" fill={`hsl(${image.hueB} 40% 40%)`} opacity="0.3" />
          </>
        )}
        {shape === 2 && (
          <>
            <path
              d="M50 130 Q100 60 150 130 Q140 170 100 175 Q60 170 50 130 Z"
              fill={`url(#g-${image.seed})`}
            />
            <circle cx="100" cy="120" r="6" fill={`hsl(${accent} 70% 50%)`} opacity="0.5" />
          </>
        )}
        {shape === 3 && (
          <>
            <rect x="40" y="80" width="120" height="60" rx="30" fill={`url(#g-${image.seed})`} />
            <circle cx="70" cy="110" r="8" fill={`hsl(${accent} 60% 85%)`} />
            <circle cx="130" cy="110" r="8" fill={`hsl(${accent} 60% 85%)`} />
          </>
        )}
        {shape === 4 && (
          <>
            <polygon
              points="100,40 160,100 100,160 40,100"
              fill={`url(#g-${image.seed})`}
            />
            <line x1="60" y1="100" x2="140" y2="100" stroke={`hsl(${image.hueB} 40% 40%)`} strokeWidth="1" opacity="0.4" />
          </>
        )}
        {/* Grain */}
        <rect width="200" height="200" fill="white" opacity="0.04" />
      </svg>
      {label && (
        <span className="absolute bottom-2 left-2 rounded-md bg-white/70 px-2 py-0.5 text-[10px] font-medium text-ink-soft backdrop-blur-sm">
          {image.label}
        </span>
      )}
    </div>
  );
}
