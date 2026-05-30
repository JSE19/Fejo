import { useSeoMeta } from "@unhead/react";
import { Link, useParams } from "react-router-dom";
import { useState } from "react";

import { Logo } from "@/components/safesale/Logo";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/safesale/Avatar";
import { ProductImage } from "@/components/safesale/ProductImage";
import { StarRating } from "@/components/safesale/StarRating";
import { Skeleton } from "@/components/ui/skeleton";

import { useListing, type NostrListing } from "@/hooks/useListing";
import { useAuthor } from "@/hooks/useAuthor";
import { genUserName } from "@/lib/genUserName";
import { formatNGN, formatRelative } from "@/lib/format";
import { cn, sanitizeUrl } from "@/lib/utils";
import { hashStr } from "@/lib/seeded";

import {
  BadgeCheck,
  ChevronLeft,
  Lock,
  Scale,
  Share2,
  ShieldCheck,
  Truck,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                  Page                                      */
/* -------------------------------------------------------------------------- */

export default function PublicListing() {
  const { id = "" } = useParams<{ id: string }>();
  const { data: listing, isLoading, error } = useListing(id);

  useSeoMeta({
    title: listing ? `${listing.title} — SafeSale` : "Listing — SafeSale",
    description: listing
      ? `${listing.title} · ${formatNGN(listing.priceNGN)} · Pay safely with SafeSale escrow.`
      : undefined,
  });

  if (isLoading) {
    return <PublicListingSkeleton />;
  }

  if (error || !listing) {
    return <ListingNotFound id={id} />;
  }

  return <PublicListingView listing={listing} />;
}

/* -------------------------------------------------------------------------- */
/*                              View (loaded)                                 */
/* -------------------------------------------------------------------------- */

function PublicListingView({ listing }: { listing: NostrListing }) {
  const [activeImage, setActiveImage] = useState(0);

  // Seller display: read kind-0 metadata for name + picture; fall back
  // to a deterministic generated handle so the buyer never sees a raw
  // hex pubkey. Reputation fields (rating / reviewCount / completedOrders)
  // are intentionally undefined for now — they'll surface once the
  // backend publishes kind 1985 reviews on release (PRD delta #4).
  const author = useAuthor(listing.sellerPubkey);
  const sellerName =
    author.data?.metadata?.name ??
    author.data?.metadata?.display_name ??
    genUserName(listing.sellerPubkey);
  const sellerAvatarUrl = sanitizeUrl(author.data?.metadata?.picture);
  // Reputation fields wait on backend kind-1985 publishing (PRD delta #4);
  // hidden behind opt-in nullables so the JSX conditionals re-light when
  // we wire them.
  const sellerVerified: boolean = false;
  const reputation: {
    rating?: number;
    reviewCount?: number;
    completedOrders?: number;
  } = {};
  const sellerRating = reputation.rating;
  const sellerReviewCount = reputation.reviewCount;
  const sellerCompletedOrders = reputation.completedOrders;

  const heroImage = listing.images[activeImage] ?? listing.images[0];

  return (
    <div className="min-h-screen bg-surface text-ink">
      {/* Sticky header */}
      <header className="fixed inset-x-0 top-0 z-40 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/75">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            to="/"
            aria-label="Back home"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-background text-ink-soft shadow-sm transition-colors hover:bg-secondary hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <Logo />
          <button
            type="button"
            aria-label="Share listing"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-background text-ink-soft shadow-sm transition-colors hover:bg-secondary hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            onClick={() => {
              const url = window.location.href;
              if (navigator.share) {
                navigator.share({ title: listing.title, url }).catch(() => {});
              } else {
                navigator.clipboard?.writeText(url);
              }
            }}
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-32 pt-20 sm:px-6 md:pt-24 lg:pb-12">
        <div className="grid gap-8 lg:grid-cols-[1.1fr,1fr] lg:gap-12">
          {/* ------------------------ Gallery + body ------------------------ */}
          <div className="space-y-8">
            <Gallery
              listing={listing}
              activeIndex={activeImage}
              onSelect={setActiveImage}
              hero={heroImage}
            />

            {/* Description + specs — desktop only (mobile shows compact version inline below) */}
            <div className="hidden space-y-8 md:block">
              <section>
                <h2 className="text-xl font-semibold tracking-tight text-ink">
                  About this item
                </h2>
                <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-ink-soft">
                  {listing.description}
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold tracking-tight text-ink">
                  Details
                </h2>
                <dl className="mt-3 overflow-hidden rounded-xl border border-border bg-background">
                  <SpecRow
                    k="In stock"
                    v={
                      listing.inStock === 0
                        ? "Out of stock"
                        : listing.inStock === 1
                        ? "1 available"
                        : `${listing.inStock} available`
                    }
                  />
                  {listing.category && (
                    <SpecRow k="Category" v={capitalize(listing.category)} />
                  )}
                  {listing.delivery && (
                    <SpecRow k="Delivery" v={listing.delivery} />
                  )}
                  <SpecRow k="Listed" v={formatRelative(epochToIso(listing.publishedAt))} />
                </dl>
              </section>
            </div>
          </div>

          {/* ----------------------------- Info rail ------------------------- */}
          <aside className="space-y-6">
            {/* Title + price */}
            <section className="space-y-4 rounded-2xl border border-border bg-background p-6 shadow-sm sm:p-8">
              <div>
                {listing.category && (
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                    {capitalize(listing.category)}
                  </p>
                )}
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                  {listing.title}
                </h1>
                {listing.summary && (
                  <p className="mt-2 text-sm text-ink-soft">{listing.summary}</p>
                )}
              </div>
              <p className="text-3xl font-semibold tabular-nums tracking-tight text-ink sm:text-4xl">
                {formatNGN(listing.priceNGN)}
              </p>

              {/* Seller mini-card */}
              <div className="border-t border-border/60 pt-4">
                <div className="flex items-center gap-3">
                  {sellerAvatarUrl ? (
                    <img
                      src={sellerAvatarUrl}
                      alt=""
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <Avatar
                      seed={listing.sellerPubkey}
                      name={sellerName}
                      size={48}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-ink">
                        {sellerName}
                      </p>
                      {sellerVerified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-soft-foreground">
                          <BadgeCheck className="h-3 w-3" /> Verified
                        </span>
                      )}
                    </div>
                    {sellerRating !== undefined && (
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-soft">
                        <StarRating rating={sellerRating} size={11} />
                        <span className="tabular-nums">
                          {sellerRating.toFixed(1)}
                          {sellerReviewCount !== undefined && (
                            <> · {sellerReviewCount} reviews</>
                          )}
                        </span>
                        {sellerCompletedOrders !== undefined && (
                          <>
                            <span>·</span>
                            <span>{sellerCompletedOrders} orders</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Escrow trust panel — hero element */}
            <EscrowTrustPanel />

            {/* CTA — desktop */}
            <Button
              asChild
              size="lg"
              className="hidden h-14 w-full rounded-xl bg-brand text-base font-semibold text-brand-foreground shadow-[0_12px_24px_-12px_color-mix(in_oklab,var(--brand)_60%,transparent)] hover:bg-brand/90 md:inline-flex"
            >
              <Link to={`/checkout/${listing.id}`}>
                <Lock className="mr-2 h-5 w-5" />
                Buy safely
              </Link>
            </Button>

            {/* Mobile-only inline description (the desktop one lives in the left column) */}
            <section className="rounded-2xl border border-border bg-background p-5 md:hidden">
              <h2 className="text-base font-semibold text-ink">About this item</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                {listing.description}
              </p>
            </section>
          </aside>
        </div>
      </main>

      {/* Sticky mobile bottom CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 pb-safe pt-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-medium uppercase tracking-wider text-ink-soft">
              Price
            </span>
            <span className="text-base font-semibold tabular-nums text-ink">
              {formatNGN(listing.priceNGN)}
            </span>
          </div>
          <Button
            asChild
            className="h-12 flex-1 rounded-xl bg-brand text-base font-semibold text-brand-foreground shadow-[0_12px_24px_-12px_color-mix(in_oklab,var(--brand)_60%,transparent)] hover:bg-brand/90"
          >
            <Link to={`/checkout/${listing.id}`}>
              <Lock className="mr-2 h-4 w-4" />
              Buy safely
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Gallery                                     */
/* -------------------------------------------------------------------------- */

function Gallery({
  listing,
  activeIndex,
  onSelect,
  hero,
}: {
  listing: NostrListing;
  activeIndex: number;
  onSelect: (index: number) => void;
  hero: string;
}) {
  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl bg-background shadow-sm aspect-square lg:aspect-[4/5]">
        <ListingImage src={hero} alt={listing.title} className="h-full w-full" />
        {listing.category && (
          <span className="absolute left-4 top-4 rounded-full bg-brand px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-foreground shadow-sm">
            {capitalize(listing.category)}
          </span>
        )}
      </div>

      {listing.images.length > 1 && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {listing.images.map((url, i) => {
            const isActive = i === activeIndex;
            return (
              <button
                type="button"
                key={`${url}-${i}`}
                onClick={() => onSelect(i)}
                aria-label={`Show image ${i + 1}`}
                aria-pressed={isActive}
                className={cn(
                  "h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                  isActive
                    ? "border-brand"
                    : "border-transparent opacity-70 hover:opacity-100",
                )}
              >
                <ListingImage src={url} alt="" className="h-full w-full" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                          ListingImage (URL or seed)                        */
/* -------------------------------------------------------------------------- */

/**
 * Renders either a real https image (after sanitization) or, when the
 * URL is a `safesale://fixture-image/...` placeholder produced by the
 * useListing fixture fallback, an attractive deterministic gradient.
 */
function ListingImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  // Fixture placeholders look like: safesale://fixture-image/<listingId>/<seed>
  if (src.startsWith("safesale://")) {
    const seed = src.replace(/^safesale:\/\/fixture-image\//, "");
    const h = hashStr(seed);
    return (
      <ProductImage
        image={{
          seed,
          hueA: h % 360,
          hueB: (h >> 8) % 360,
          label: "",
        }}
        className={className}
        rounded="rounded-none"
      />
    );
  }
  const safe = sanitizeUrl(src);
  if (!safe) {
    // Defensive: render a neutral surface rather than a broken <img>.
    return (
      <div
        aria-hidden
        className={cn("bg-secondary", className)}
      />
    );
  }
  return (
    <img
      src={safe}
      alt={alt}
      loading="lazy"
      className={cn("object-cover", className)}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*                              Trust panel                                   */
/* -------------------------------------------------------------------------- */

function EscrowTrustPanel() {
  return (
    <section className="rounded-2xl border border-brand/15 bg-brand-soft/40 p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-4">
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-sm">
          <ShieldCheck className="h-6 w-6" />
        </span>
        <div>
          <h3 className="text-base font-semibold text-ink">
            Protected by SafeSale
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Your money is held safely until you confirm you've received your
            order. Full refund if anything goes wrong.
          </p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Pillar icon={Lock} label="Held in escrow" />
        <Pillar icon={Truck} label="Tracked delivery" />
        <Pillar icon={Scale} label="Fair dispute" />
      </div>
      <Link
        to="/how-it-works"
        className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        How SafeSale escrow works →
      </Link>
    </section>
  );
}

function Pillar({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-brand/10 bg-background/80 px-3 py-4 text-center">
      <Icon className="h-5 w-5 text-brand" />
      <span className="text-xs font-semibold text-ink">{label}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Spec row                                    */
/* -------------------------------------------------------------------------- */

function SpecRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[140px,1fr] border-b border-border last:border-b-0">
      <dt className="bg-surface/60 px-4 py-3 text-sm font-medium text-ink-soft">
        {k}
      </dt>
      <dd className="px-4 py-3 text-sm text-ink">{v}</dd>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                          Loading + Not-found                               */
/* -------------------------------------------------------------------------- */

function PublicListingSkeleton() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-20 sm:px-6 md:pt-24 lg:grid-cols-[1.1fr,1fr] lg:gap-12">
        <Skeleton className="aspect-square w-full rounded-2xl lg:aspect-[4/5]" />
        <div className="space-y-6">
          <div className="space-y-4 rounded-2xl border border-border bg-background p-6 sm:p-8">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-10 w-40" />
            <div className="flex items-center gap-3 pt-2">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function ListingNotFound({ id }: { id: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-surface px-6 text-center">
      <div className="max-w-md">
        <Logo />
        <p className="mt-8 text-xl font-semibold tracking-tight text-ink">
          We couldn't find that listing
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          {id ? "It may have been removed or the link is incorrect." : "No listing was specified."}
        </p>
        <Button
          asChild
          className="mt-6 bg-brand text-brand-foreground hover:bg-brand/90"
        >
          <Link to="/">Back home</Link>
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Helpers                                    */
/* -------------------------------------------------------------------------- */

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

function epochToIso(epochSec: number): string {
  return new Date(epochSec * 1000).toISOString();
}
