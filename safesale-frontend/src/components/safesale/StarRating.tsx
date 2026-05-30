import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

interface Props {
  rating: number;
  size?: number;
  className?: string;
  showNumber?: boolean;
}

export function StarRating({ rating, size = 14, className, showNumber = false }: Props) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="inline-flex">
        {[0, 1, 2, 3, 4].map((i) => {
          const fillPct = i < full ? 100 : i === full && hasHalf ? 50 : 0;
          return (
            <span key={i} className="relative" style={{ width: size, height: size }}>
              <Star
                className="absolute inset-0 text-amber-200"
                fill="currentColor"
                strokeWidth={0}
                style={{ width: size, height: size }}
              />
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fillPct}%` }}
              >
                <Star
                  className="text-amber-500"
                  fill="currentColor"
                  strokeWidth={0}
                  style={{ width: size, height: size }}
                />
              </span>
            </span>
          );
        })}
      </span>
      {showNumber && (
        <span className="text-xs font-medium tabular-nums text-ink">
          {rating.toFixed(1)}
        </span>
      )}
    </span>
  );
}
