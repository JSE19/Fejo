/**
 * `ListingThumb` — square image for product cards in order/payout rows,
 * detail-page hero cards, and anywhere else a Blossom-URL listing
 * image needs to render.
 *
 * Why this exists alongside `ProductImage`:
 *
 *   - `ProductImage` (in this same folder) renders a deterministic
 *     gradient-and-shape placeholder driven by a `{ seed, hueA, hueB,
 *     label }` object. No URLs. Built for the marketing/landing
 *     mockups where there's no real product yet.
 *
 *   - Real backend listings carry actual HTTPS image URLs from Blossom
 *     uploads (see `useUploadFile` + the listings create flow). When
 *     present, we render the URL directly via `<img>` with proper
 *     sanitisation. When absent (cold demo / fixture / failed upload),
 *     we fall back to a deterministic gradient driven by either the
 *     image's `seed` field OR — if even that's missing — the listing
 *     `alt` text, so different listings get visually distinct
 *     placeholders.
 *
 * Earlier in the 4-day demo sprint this exact helper was inlined in 4
 * different files (`BuyerOrder.tsx`, `OrderDetailPage.tsx`,
 * `OrdersPage.tsx`, `EarningsPage.tsx`) because we kept iterating
 * faster than we could consolidate. PROGRESS.md flagged the cleanup as
 * "refactor pass before launch." This is that pass — single source of
 * truth, all 4 call-sites collapse to imports.
 *
 * Size is an explicit pixel number rather than a Tailwind size class
 * because consumers use it at 40, 48, 56 px depending on layout
 * density and inline `style` width/height is the cheapest way to keep
 * the gradient placeholder square without burning class permutations.
 */

import { Package } from "lucide-react";

import type { ApiListingImage } from "@/lib/api";
import { sanitizeUrl } from "@/lib/utils";

export interface ListingThumbProps {
  /** First image of `listing.images`. Optional — falls back to a gradient. */
  image: ApiListingImage | undefined;
  /** Alt text for the rendered img. Also seeds the gradient placeholder. */
  alt: string;
  /** Pixel size (square). Common values: 40, 48, 56. */
  size: number;
  /**
   * Optional override for the placeholder icon's relative size — a
   * fraction of `size`. Defaults to ~25 % which reads well across the
   * common values. Pass `0.4` for very small thumbs (40px).
   */
  iconScale?: number;
  /** Extra classes on the outer element (img or div). */
  className?: string;
}

export function ListingThumb({
  image,
  alt,
  size,
  iconScale = 0.25,
  className,
}: ListingThumbProps) {
  const url = image?.url ? sanitizeUrl(image.url) : undefined;
  const dim = { width: size, height: size };

  if (url) {
    return (
      <img
        src={url}
        alt={alt}
        loading="lazy"
        className={`shrink-0 rounded-xl object-cover ${className ?? ""}`.trim()}
        style={dim}
      />
    );
  }

  // No URL — synthesise a stable gradient from the seed (or alt text)
  // so each listing gets a visually distinct placeholder.
  const seed = image?.seed ?? alt;
  const h = hash(seed);
  const hueA = ((h % 360) + 360) % 360;
  const hueB = (((h * 7) % 360) + 360) % 360;
  const iconPx = Math.max(12, Math.round(size * iconScale));

  return (
    <div
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-xl bg-surface text-ink-soft ${className ?? ""}`.trim()}
      style={{
        ...dim,
        background: `linear-gradient(135deg, hsl(${hueA} 35% 88%), hsl(${hueB} 30% 80%))`,
      }}
    >
      <Package style={{ width: iconPx, height: iconPx }} className="opacity-60" />
    </div>
  );
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}
