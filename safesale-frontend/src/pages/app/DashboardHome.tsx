/**
 * Seller Dashboard Home — `/app`.
 *
 * The seller's command surface. Per the Stitch prompt
 * (.stitch-designs/02-seller-dashboard.prompt.md) the page must, in
 * order:
 *
 *   1. Tell them at a glance how their business is doing today.
 *   2. Surface anything that needs them — a single prioritised list.
 *   3. Get them to the next action in one tap.
 *
 * Sections (top-to-bottom):
 *
 *   - Welcome banner with the prioritised one-liner + "New listing" /
 *     "Copy shop link" actions.
 *   - 4 KPI tiles: locked in escrow, paid out (7d), orders to ship,
 *     active listings. All read off `useSellerOrders()` +
 *     `useMyListings()`.
 *   - "Needs your attention" — prioritised order rows. Currently the
 *     two types we surface are `payment_locked` (needs shipping) and
 *     `disputed` (needs response). Each row routes to
 *     `/app/orders/<orderToken>`.
 *   - Recent orders (5) and listings preview (4) two-up.
 *   - Reputation strip — placeholder for the kind 1985 review feed
 *     until that's wired.
 *
 * Empty states matter: a freshly-signed-up seller sees friendly nudges
 * instead of zeros, and the "Needs your attention" card hides itself
 * entirely when there's nothing to do.
 *
 * Layout + visual direction adapted from the Stitch HTML at
 * `.stitch-designs/02-seller-dashboard.html`. The Stitch output used
 * Material Symbols, glassmorphism, a violet primary, an FAB, and its
 * own sidebar — all explicitly forbidden by the design contract in
 * AGENTS.md. We keep the structural layout and discard those bits in
 * favour of the existing AppShell + SafeSale tokens + lucide icons.
 */

import { useSeoMeta } from "@unhead/react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import {
  AlertCircle,
  Building2,
  Copy,
  Lock,
  PackageCheck,
  Plus,
  Sparkles,
  Star,
  Tag,
  Truck,
  Wallet,
} from "lucide-react";

import { AppShell } from "@/components/safesale/AppShell";
import { Avatar } from "@/components/safesale/Avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentSeller } from "@/hooks/useCurrentSeller";
import { useMyListings, type MyListing } from "@/hooks/useMyListings";
import { useSellerOrders } from "@/hooks/useSellerOrders";
import { useToast } from "@/hooks/useToast";
import { httpApi } from "@/lib/api/http";
import type { ApiOrderStatus, SellerOrderRow } from "@/lib/api";
import { formatNGN, formatRelative } from "@/lib/format";
import { cn, sanitizeUrl } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                                Constants                                    */
/* -------------------------------------------------------------------------- */

/** Order statuses counted as "money still in escrow on this seller's behalf". */
const LOCKED_STATUSES: ReadonlySet<ApiOrderStatus> = new Set<ApiOrderStatus>([
  "paid",
  "shipped",
  "disputed",
]);

/** Statuses that show up in "Needs your attention" — the seller can act. */
const ACTION_STATUSES: ReadonlySet<ApiOrderStatus> = new Set<ApiOrderStatus>([
  "paid",
  "disputed",
]);

/** 7-day window for "paid out this week". */
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/* -------------------------------------------------------------------------- */
/*                                Page                                        */
/* -------------------------------------------------------------------------- */

export default function DashboardHome() {
  useSeoMeta({ title: "Home — SafeSale" });

  const [seller] = useCurrentSeller();
  const { orders, isLoading: ordersLoading } = useSellerOrders();
  const { data: listings = [], isLoading: listingsLoading } = useMyListings();

  const { data: sellerData } = useQuery({
    queryKey: ["seller", seller?.handle],
    queryFn: async () => {
      if (!seller?.handle) throw new Error("No seller handle");
      return httpApi.getSeller(seller.handle);
    },
    enabled: !!seller?.handle,
  });
  const needsBank = sellerData?.seller && !sellerData.seller.bankVerifiedName;

  // Derived KPIs + lists. All memoised because they walk the orders array.
  const stats = useMemo(() => deriveStats(orders), [orders]);
  const actionRows = useMemo(
    () =>
      orders
        .filter((o) => ACTION_STATUSES.has(o.status))
        .sort(
          (a, b) =>
            // Oldest unhandled first — the seller should act on the row
            // that's been waiting the longest.
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
    [orders],
  );
  const recentRows = useMemo(() => orders.slice(0, 5), [orders]);

  const firstName = (seller?.name ?? "").split(" ")[0] || "there";
  const shopHandle = seller?.handle ? `safesale.app/${seller.handle}` : null;
  // Build a working shop URL from the current origin so copied links
  // actually resolve. The aspirational safesale.app/handle format is
  // shown as the subtitle but the clipboard gets a real, openable URL.
  const shopCopyUrl = seller?.handle
    ? `${window.location.origin}/app/listings`
    : null;

  const { toast } = useToast();
  const copyShopUrl = () => {
    if (!shopCopyUrl) {
      toast({
        title: "Set up your shop first",
        description:
          "Finish onboarding so we can give you a shareable shop link.",
      });
      return;
    }
    void navigator.clipboard?.writeText(shopCopyUrl).then(() => {
      toast({ title: "Shop link copied" });
    });
  };

  // Action slot in the AppShell header — primary CTA + copy link.
  const headerAction = (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={copyShopUrl}
        className="h-9"
      >
        <Copy className="mr-1 h-4 w-4" />
        <span className="hidden sm:inline">Copy shop link</span>
        <span className="sm:hidden">Copy link</span>
      </Button>
      <Button
        asChild
        size="sm"
        className="h-9 bg-brand text-brand-foreground hover:bg-brand/90"
      >
        <Link to="/app/listings">
          <Plus className="mr-1 h-4 w-4" />
          New listing
        </Link>
      </Button>
    </div>
  );

  return (
    <AppShell title="Home" subtitle={shopHandle ?? undefined} action={headerAction}>
      <div className="space-y-6">
        <WelcomeBanner
          firstName={firstName}
          loading={ordersLoading}
          actionRows={actionRows}
        />

        {needsBank && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-900">
                  Set up your payout details
                </p>
                <p className="mt-1 text-sm text-amber-800">
                  Add your Nigerian bank account so buyers can release funds to you.
                  Without it, payouts will be blocked.
                </p>
                <Link
                  to="/app/settings"
                  className="mt-3 inline-flex h-9 items-center rounded-lg bg-amber-800 px-4 text-xs font-semibold text-white hover:bg-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2"
                >
                  Add bank details
                </Link>
              </div>
            </div>
          </section>
        )}

        <KpiGrid
          stats={stats}
          activeListings={listings.length}
          loading={ordersLoading || listingsLoading}
        />

        <NeedsAttentionCard rows={actionRows} loading={ordersLoading} />

        <div className="grid gap-6 lg:grid-cols-2">
          <RecentOrdersCard rows={recentRows} loading={ordersLoading} />
          <ListingsPreviewCard
            listings={listings}
            loading={listingsLoading}
          />
        </div>

        <ReputationStrip />
      </div>
    </AppShell>
  );
}

/* -------------------------------------------------------------------------- */
/*                             Welcome banner                                 */
/* -------------------------------------------------------------------------- */

function WelcomeBanner({
  firstName,
  loading,
  actionRows,
}: {
  firstName: string;
  loading: boolean;
  actionRows: SellerOrderRow[];
}) {
  const greeting = useMemo(() => timeOfDayGreeting(), []);

  const subline = (() => {
    if (loading) return "Catching up on your shop…";
      const needsShip = actionRows.filter(
        (r) => r.status === "paid",
      ).length;
      const oldestShip = actionRows.find(
        (r) => r.status === "paid",
      );
    if (needsShip > 0 && oldestShip) {
      const word = needsShip === 1 ? "order" : "orders";
      return (
        <>
          You have{" "}
          <strong className="font-semibold text-ink">
            {needsShip} {word} waiting to ship
          </strong>
          . The oldest is from {formatRelative(oldestShip.createdAt)}.
        </>
      );
    }
    if (actionRows.length > 0) {
      return "You have items that need a response.";
    }
    return "You're all caught up. Time to share your shop link?";
  })();

  return (
    <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
      <p className="text-sm text-ink-soft">{greeting},</p>
      <h2 className="mt-1 text-2xl font-semibold leading-tight text-ink sm:text-3xl">
        {firstName} <span aria-hidden>👋</span>
      </h2>
      <p className="mt-2 max-w-prose text-sm text-ink-soft">{subline}</p>
    </section>
  );
}

function timeOfDayGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/* -------------------------------------------------------------------------- */
/*                                  KPI grid                                  */
/* -------------------------------------------------------------------------- */

interface DerivedStats {
  lockedNGN: number;
  lockedCount: number;
  paidThisWeekNGN: number;
  ordersToShip: number;
  oldestShipAgo: string | null;
}

function deriveStats(orders: SellerOrderRow[]): DerivedStats {
  let lockedNGN = 0;
  let lockedCount = 0;
  let paidThisWeekNGN = 0;
  let ordersToShip = 0;
  let oldestShipAt: number | null = null;

  const cutoff = Date.now() - WEEK_MS;
  for (const o of orders) {
    if (LOCKED_STATUSES.has(o.status)) {
      lockedNGN += o.amountNGN;
      lockedCount += 1;
    }
    if (o.status === "completed") {
      const releasedTs = o.releasedAt
        ? new Date(o.releasedAt).getTime()
        : new Date(o.updatedAt).getTime();
      if (releasedTs >= cutoff) {
        paidThisWeekNGN += o.amountNGN;
      }
    }
    if (o.status === "paid") {
      ordersToShip += 1;
      const ts = new Date(o.createdAt).getTime();
      if (oldestShipAt === null || ts < oldestShipAt) oldestShipAt = ts;
    }
  }

  return {
    lockedNGN,
    lockedCount,
    paidThisWeekNGN,
    ordersToShip,
    oldestShipAgo:
      oldestShipAt !== null
        ? formatRelative(new Date(oldestShipAt).toISOString())
        : null,
  };
}

function KpiGrid({
  stats,
  activeListings,
  loading,
}: {
  stats: DerivedStats;
  activeListings: number;
  loading: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KpiTile
        icon={Lock}
        label="Locked in escrow"
        value={formatNGN(stats.lockedNGN)}
        sub={
          stats.lockedCount > 0
            ? `Across ${stats.lockedCount} active order${stats.lockedCount === 1 ? "" : "s"}`
            : "Nothing in escrow right now"
        }
        loading={loading}
      />
      <KpiTile
        icon={Wallet}
        label="Paid out this week"
        value={formatNGN(stats.paidThisWeekNGN)}
        sub={
          stats.paidThisWeekNGN > 0
            ? "Last 7 days"
            : "No releases yet this week"
        }
        loading={loading}
      />
      <KpiTile
        icon={Truck}
        label="Orders to ship"
        value={String(stats.ordersToShip)}
        sub={
          stats.ordersToShip > 0
            ? stats.oldestShipAgo
              ? `Oldest ${stats.oldestShipAgo}`
              : "Get them out today"
            : "All caught up 🎉"
        }
        emphasizeSub={stats.ordersToShip > 0}
        loading={loading}
      />
      <KpiTile
        icon={Tag}
        label="Active listings"
        value={String(activeListings)}
        sub={
          <Link
            to="/app/listings"
            className="text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
          >
            View all →
          </Link>
        }
        loading={loading}
      />
    </div>
  );
}

function KpiTile({
  icon: Icon,
  label,
  value,
  sub,
  loading,
  emphasizeSub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: React.ReactNode;
  loading?: boolean;
  emphasizeSub?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-ink-soft">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-3 text-3xl font-semibold leading-none text-ink tabular-nums">
        {loading ? <Skeleton className="h-8 w-24" /> : value}
      </div>
      <div
        className={cn(
          "mt-2 text-xs",
          emphasizeSub ? "text-amber-700" : "text-ink-soft",
        )}
      >
        {loading ? <Skeleton className="h-3 w-32" /> : sub}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                          Needs your attention                              */
/* -------------------------------------------------------------------------- */

function NeedsAttentionCard({
  rows,
  loading,
}: {
  rows: SellerOrderRow[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <section className="rounded-2xl border border-border bg-white p-5">
        <div className="space-y-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-white">
      <header className="flex items-center justify-between px-5 py-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          {rows.length > 0 && (
            <AlertCircle className="h-4 w-4 text-amber-600" />
          )}
          Needs your attention
        </h3>
        <Link
          to="/app/orders"
          className="text-xs font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
        >
          View all orders →
        </Link>
      </header>

      {rows.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <Sparkles className="mx-auto h-5 w-5 text-brand" />
          <p className="mt-3 text-sm font-medium text-ink">
            You're all caught up
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            New orders will show up here as soon as buyers pay.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <AttentionRow key={row.orderToken} row={row} />
          ))}
        </ul>
      )}
    </section>
  );
}

function AttentionRow({ row }: { row: SellerOrderRow }) {
  const isShip = row.status === "paid";
  const isDispute = row.status === "disputed";

  return (
    <li className="flex items-center gap-4 px-5 py-4">
      <Avatar seed={row.buyerName} name={row.buyerName} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">
          {row.buyerName.split(" ")[0]} — {truncate(row.listing.title, 30)}
        </p>
        <p className="mt-0.5 text-xs text-ink-soft">
          {formatNGN(row.amountNGN)} · {formatRelative(row.createdAt)}
        </p>
      </div>
      <Button
        asChild
        size="sm"
        variant={isDispute ? "outline" : "default"}
        className={cn(
          "h-9 px-3 text-xs font-semibold",
          isShip && "bg-brand text-brand-foreground hover:bg-brand/90",
          isDispute && "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100",
        )}
      >
        <Link to={`/app/orders/${row.orderToken}`}>
          {isShip ? "Mark shipped →" : "Respond →"}
        </Link>
      </Button>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Recent orders                                 */
/* -------------------------------------------------------------------------- */

function RecentOrdersCard({
  rows,
  loading,
}: {
  rows: SellerOrderRow[];
  loading: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-white">
      <header className="flex items-center justify-between px-5 py-4">
        <h3 className="text-sm font-semibold text-ink">Recent orders</h3>
        <Link
          to="/app/orders"
          className="text-xs font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
        >
          View all
        </Link>
      </header>
      {loading ? (
        <div className="space-y-2 px-5 pb-5">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-sm font-medium text-ink">No orders yet</p>
          <p className="mt-1 text-xs text-ink-soft">
            Share your shop link to get your first sale.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <RecentOrderRow key={row.orderToken} row={row} />
          ))}
        </ul>
      )}
    </section>
  );
}

function RecentOrderRow({ row }: { row: SellerOrderRow }) {
  return (
    <li>
      <Link
        to={`/app/orders/${row.orderToken}`}
        className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">
            {row.listing.title}
          </p>
          <p className="truncate text-xs text-ink-soft">
            {row.buyerName} · {formatRelative(row.createdAt)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-sm font-semibold tabular-nums text-ink">
            {formatNGN(row.amountNGN)}
          </span>
          <StatusPill status={row.status} />
        </div>
      </Link>
    </li>
  );
}

function StatusPill({ status }: { status: ApiOrderStatus }) {
  const map: Record<
    ApiOrderStatus,
    { bg: string; text: string; label: string }
  > = {
    pending_payment: {
      bg: "bg-surface",
      text: "text-ink-soft",
      label: "PENDING",
    },
    paid: {
      bg: "bg-brand-soft",
      text: "text-brand-soft-foreground",
      label: "PAID",
    },
    shipped: {
      bg: "bg-brand-soft",
      text: "text-brand-soft-foreground",
      label: "SHIPPED",
    },
    completed: {
      bg: "bg-emerald-100",
      text: "text-emerald-800",
      label: "COMPLETED",
    },
    disputed: {
      bg: "bg-amber-100",
      text: "text-amber-800",
      label: "DISPUTED",
    },
    refunded: {
      bg: "bg-rose-100",
      text: "text-rose-800",
      label: "REFUNDED",
    },
  };
  const s = map[status];
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-tight",
        s.bg,
        s.text,
      )}
    >
      {s.label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*                            Listings preview                                */
/* -------------------------------------------------------------------------- */

function ListingsPreviewCard({
  listings,
  loading,
}: {
  listings: MyListing[];
  loading: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-white">
      <header className="flex items-center justify-between px-5 py-4">
        <h3 className="text-sm font-semibold text-ink">Your listings</h3>
        <Link
          to="/app/listings"
          className="text-xs font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
        >
          Manage →
        </Link>
      </header>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 p-4">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <Skeleton className="aspect-square w-full rounded-xl" />
        </div>
      ) : listings.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <Tag className="mx-auto h-5 w-5 text-ink-soft" />
          <p className="mt-3 text-sm font-medium text-ink">No listings yet</p>
          <p className="mt-1 text-xs text-ink-soft">
            Your first listing takes about 2 minutes — title, price, photo,
            done.
          </p>
          <Button
            asChild
            size="sm"
            className="mt-4 bg-brand text-brand-foreground hover:bg-brand/90"
          >
            <Link to="/app/listings">
              <Plus className="mr-1 h-4 w-4" />
              Create your first listing
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 p-4">
          {listings.slice(0, 3).map((l) => (
            <ListingTile key={l.id} listing={l} />
          ))}
          {/* Always show the empty-creator tile after the listings, capped at 4 total. */}
          {listings.length < 4 && <NewListingTile />}
        </div>
      )}
    </section>
  );
}

function ListingTile({ listing }: { listing: MyListing }) {
  const url = listing.images[0] ? sanitizeUrl(listing.images[0]) : undefined;
  return (
    <Link
      to={`/buy/${listing.id}`}
      className="group block overflow-hidden rounded-xl border border-border bg-white transition-colors hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      {url ? (
        <img
          src={url}
          alt={listing.title}
          loading="lazy"
          className="aspect-square w-full object-cover"
        />
      ) : (
        <div
          aria-hidden
          className="flex aspect-square w-full items-center justify-center bg-surface text-ink-soft"
        >
          <PackageCheck className="h-8 w-8 opacity-50" />
        </div>
      )}
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-medium text-ink">
          {listing.title}
        </p>
        <p className="mt-1 text-sm font-semibold tabular-nums text-ink">
          {formatNGN(listing.priceNGN)}
        </p>
      </div>
    </Link>
  );
}

function NewListingTile() {
  return (
    <Link
      to="/app/listings"
      className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface text-ink-soft transition-colors hover:border-brand hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <Plus className="h-5 w-5" />
      <span className="text-xs font-medium">New listing</span>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/*                            Reputation strip                                */
/* -------------------------------------------------------------------------- */

/**
 * Placeholder reputation strip — real values will come from a Nostr
 * kind 1985 review feed (per NIP.md). For now the strip renders the
 * brand-new-seller copy so the section is honest about what's known.
 */
function ReputationStrip() {
  return (
    <section className="rounded-2xl border border-border bg-brand-soft/40 p-5 sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-soft-foreground">
        Your reputation
      </p>
      <div className="mt-3 flex items-start gap-3">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
        <div>
          <p className="text-sm font-medium text-ink">
            Your reputation will appear here after your first completed sale.
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            Buyers will leave a star rating and review on Nostr — verifiable
            from any client, not just SafeSale.
          </p>
        </div>
        {/* Filled-star icons hidden for new sellers, but kept here as a
            visual hint for the data shape we'll show once we have reviews. */}
        <span aria-hidden className="ml-auto hidden text-brand sm:inline-flex">
          <Star className="h-4 w-4 fill-current" />
        </span>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 helpers                                    */
/* -------------------------------------------------------------------------- */

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}
