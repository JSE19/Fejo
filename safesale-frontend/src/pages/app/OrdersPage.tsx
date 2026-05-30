/**
 * Seller Orders — `/app/orders`.
 *
 * The seller's full order feed, filterable and searchable. Reads from
 * the live backend via `useSellerOrders()` (GET /api/orders/seller/:npub)
 * so this page agrees with the dashboard at all times — both surfaces
 * key off the same TanStack Query cache and refresh together.
 *
 * Design ported from `.stitch-designs/04-seller-orders.html` — same
 * recipe used on screens #2 and #3: Stitch shipped the right layout
 * (heading row → attention strip → search/filter chips → desktop
 * table + mobile cards), but in Material Design tokens with a violet
 * primary, custom sidebar, Material Symbols, and invented fields
 * (BTC conversion, member-since, shipping fees) that don't exist on
 * our `SellerOrderRow`. All of those are stripped here; the page
 * uses SafeSale tokens + lucide-react + the existing `EscrowStatusPill`
 * primitive (which already supports all statuses).
 *
 * Each row links to `/app/orders/<orderToken>` (the seller order
 * detail page, also fully wired in Phase 8 step C).
 *
 * Filter chips intentionally omit `pending_payment` as a top-level
 * chip — those orders are informational (the seller can't act on
 * them), so they only appear under "All". `paid + disputed`
 * are what surface in the amber "Needs your attention" strip at the
 * top of the page; same source of truth as the dashboard's same strip.
 */

import { useSeoMeta } from "@unhead/react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { AppShell } from "@/components/safesale/AppShell";
import { EscrowStatusPill } from "@/components/safesale/EscrowStatus";
import { ListingThumb } from "@/components/safesale/ListingThumb";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  ChevronRight,
  Loader2,
  Package,
  Search,
  User,
} from "lucide-react";

import { useCurrentSeller } from "@/hooks/useCurrentSeller";
import { useSellerOrders } from "@/hooks/useSellerOrders";
import { useToast } from "@/hooks/useToast";
import { httpApi } from "@/lib/api/http";
import type { ApiOrderStatus, SellerOrderRow } from "@/lib/api";
import { formatNGN, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ------------------------------ filter spec ----------------------------- */

type FilterKey = "all" | "to_ship" | "shipped" | "completed" | "disputed" | "refunded";

interface FilterSpec {
  key: FilterKey;
  label: string;
  matches: (s: ApiOrderStatus) => boolean;
}

/**
 * Six chips, in display order. `pending_payment` deliberately isn't a
 * chip — those rows are read-only (seller can't act on them). They show
 * up under "All" only. Same six categories as the dashboard.
 */
const FILTERS: FilterSpec[] = [
  { key: "all", label: "All", matches: () => true },
  { key: "to_ship", label: "To ship", matches: (s) => s === "paid" },
  {
    key: "shipped",
    label: "Shipped",
    matches: (s) => s === "shipped",
  },
  { key: "completed", label: "Completed", matches: (s) => s === "completed" },
  { key: "disputed", label: "Disputed", matches: (s) => s === "disputed" },
  { key: "refunded", label: "Refunded", matches: (s) => s === "refunded" },
];

/* ------------------------------------- page ---------------------------------- */

export default function OrdersPage() {
  useSeoMeta({ title: "Orders — SafeSale" });

  const [seller] = useCurrentSeller();
  const { orders, isLoading } = useSellerOrders();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");

  /* Live counts per filter — drive the chip badges. */
  const filterCounts = useMemo(() => {
    const counts: Record<FilterKey, number> = {
      all: orders.length,
      to_ship: 0,
      shipped: 0,
      completed: 0,
      disputed: 0,
      refunded: 0,
    };
    for (const o of orders) {
      for (const f of FILTERS) {
        if (f.key !== "all" && f.matches(o.status)) counts[f.key] += 1;
      }
    }
    return counts;
  }, [orders]);

  /* Needs-attention strip: paid + disputed. */
  const attention = useMemo(() => {
    const toShip = orders.filter((o) => o.status === "paid").length;
    const disputed = orders.filter((o) => o.status === "disputed").length;
    return { toShip, disputed, total: toShip + disputed };
  }, [orders]);

  const filtered = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter) ?? FILTERS[0];
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (!f.matches(o.status)) return false;
      if (!q) return true;
      return (
        o.shortId.toLowerCase().includes(q) ||
        o.buyerName.toLowerCase().includes(q) ||
        o.listing.title.toLowerCase().includes(q)
      );
    });
  }, [orders, filter, query]);

  const subtitle = isLoading
    ? "Loading…"
    : orders.length === 1
      ? "1 order so far"
      : `${orders.length} orders so far`;

  return (
    <AppShell title="Orders" subtitle={subtitle}>
      <div className="space-y-6">
        {/* 1. Needs-your-attention strip — only when there's actually something */}
        {attention.total > 0 && <AttentionStrip {...attention} />}

        {/* 2. Search + filter chips */}
        <SearchAndFilters
          query={query}
          onQueryChange={setQuery}
          filter={filter}
          onFilterChange={setFilter}
          counts={filterCounts}
        />

        {/* 3. Body */}
        {isLoading ? (
          <ListSkeleton />
        ) : !seller ? (
          <NotSignedUpEmpty />
        ) : orders.length === 0 ? (
          <NeverHadAnOrderEmpty />
        ) : filtered.length === 0 ? (
          <FilteredEmpty
            query={query}
            onClear={() => {
              setQuery("");
              setFilter("all");
            }}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-2xl border border-border bg-white sm:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-surface text-[11px] font-medium uppercase tracking-wider text-ink-soft">
                  <tr>
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Buyer</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Updated</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((o) => (
                    <OrderTableRow key={o.orderToken} order={o} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="space-y-3 sm:hidden">
              {filtered.map((o) => (
                <OrderMobileCard key={o.orderToken} order={o} />
              ))}
            </ul>
          </>
        )}
      </div>
    </AppShell>
  );
}

/* -------------------------- attention strip --------------------------- */

function AttentionStrip({
  toShip,
  disputed,
  total,
}: {
  toShip: number;
  disputed: number;
  total: number;
}) {
  const breakdown: string[] = [];
  if (toShip > 0) breakdown.push(`${toShip} to ship`);
  if (disputed > 0)
    breakdown.push(`${disputed} ${disputed === 1 ? "disputed" : "disputed"}`);

  const headline =
    total === 1
      ? "1 order needs your action."
      : `You have ${total} orders that need action.`;

  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:p-5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </div>
      <p className="flex-1 text-sm font-medium text-amber-900">{headline}</p>
      {breakdown.length > 0 && (
        <p className="text-xs text-amber-800">{breakdown.join(" · ")}</p>
      )}
    </div>
  );
}

/* ----------------------- search + filter chips ----------------------- */

function SearchAndFilters({
  query,
  onQueryChange,
  filter,
  onFilterChange,
  counts,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  filter: FilterKey;
  onFilterChange: (k: FilterKey) => void;
  counts: Record<FilterKey, number>;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-white p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search by buyer, order id, or product"
          className="h-10 pl-10"
          aria-label="Search orders"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((f) => {
          const count = counts[f.key];
          const isActive = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => onFilterChange(f.key)}
              className={cn(
                "inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                isActive
                  ? "border-brand-soft bg-brand-soft text-brand-soft-foreground"
                  : "border-border bg-white text-ink-soft hover:text-ink",
                !isActive && count === 0 && "opacity-60",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "ml-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
                  isActive ? "bg-white/50 text-current" : "bg-surface text-ink-soft",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------- desktop table row --------------------------- */

function OrderTableRow({ order }: { order: SellerOrderRow }) {
  const isPaid = order.status === "paid";
  return (
    <tr className="group transition-colors hover:bg-surface focus-within:bg-surface">
      <td className="px-4 py-3 align-middle">
        <Link
          to={`/app/orders/${order.orderToken}`}
          className="flex items-center gap-3 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <ListingThumb
            image={order.listing.images[0]}
            alt={order.listing.title}
            size={48}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">
              {order.listing.title}
            </p>
            <p className="mt-0.5 truncate font-mono text-[11px] tabular-nums text-ink-soft">
              {order.shortId}
              {order.variant ? ` · ${order.variant}` : ""}
            </p>
          </div>
        </Link>
      </td>
      <td className="px-4 py-3 align-middle">
        <p className="truncate text-sm text-ink">{order.buyerName}</p>
        <p className="mt-0.5 truncate text-xs text-ink-soft">{order.buyerCity}</p>
      </td>
      <td className="px-4 py-3 align-middle">
        <p className="text-sm font-semibold tabular-nums text-ink">
          {formatNGN(order.amountNGN)}
        </p>
      </td>
      <td className="px-4 py-3 align-middle">
        <EscrowStatusPill status={order.status} size="sm" />
      </td>
      <td className="px-4 py-3 align-middle text-right">
        <p className="text-xs text-ink-soft">
          {formatRelative(order.updatedAt)}
        </p>
      </td>
      <td className="w-28 px-2 align-middle text-right">
        {isPaid ? (
          <ShipDialog
            orderToken={order.orderToken}
            listingTitle={order.listing.title}
          />
        ) : (
          <Link
            to={`/app/orders/${order.orderToken}`}
            className="inline-flex items-center justify-center rounded-md p-1 text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            aria-label="View order"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </td>
    </tr>
  );
}

/* --------------------------- mobile card row --------------------------- */

function OrderMobileCard({ order }: { order: SellerOrderRow }) {
  const isPaid = order.status === "paid";
  return (
    <li className="rounded-2xl border border-border bg-white p-4 transition-colors active:bg-surface">
      <Link
        to={`/app/orders/${order.orderToken}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
      >
        <div className="flex items-center gap-3">
          <ListingThumb
            image={order.listing.images[0]}
            alt={order.listing.title}
            size={48}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">
              {order.listing.title}
            </p>
            <p className="mt-0.5 truncate font-mono text-[11px] tabular-nums text-ink-soft">
              {order.shortId}
              {order.variant ? ` · ${order.variant}` : ""}
            </p>
          </div>
          <EscrowStatusPill status={order.status} size="sm" />
        </div>

        <div className="mt-3 flex items-baseline justify-between gap-3">
          <p className="truncate text-xs text-ink-soft">
            {order.buyerName}, {order.buyerCity}
          </p>
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold tabular-nums text-ink">
              {formatNGN(order.amountNGN)}
            </p>
          </div>
        </div>

        <p className="mt-2 text-[11px] text-ink-soft">
          Updated · {formatRelative(order.updatedAt)}
        </p>
      </Link>

      {isPaid && (
        <div className="mt-3 border-t border-border pt-3">
          <ShipDialog
            orderToken={order.orderToken}
            listingTitle={order.listing.title}
          />
        </div>
      )}
    </li>
  );
}

/* ------------------------- skeleton + empties -------------------------- */

function ListSkeleton() {
  return (
    <>
      {/* Desktop table skeleton */}
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-white sm:block">
        <table className="w-full">
          <tbody className="divide-y divide-border">
            {[0, 1, 2, 3, 4].map((i) => (
              <tr key={i}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-4 w-20" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-6 w-24 rounded-full" />
                </td>
                <td className="px-4 py-3 text-right">
                  <Skeleton className="ml-auto h-3 w-16" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards skeleton */}
      <ul className="space-y-3 sm:hidden">
        {[0, 1, 2].map((i) => (
          <li
            key={i}
            className="rounded-2xl border border-border bg-white p-4"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="mt-3 flex justify-between">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function NotSignedUpEmpty() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface text-ink-soft">
        <User className="h-7 w-7" aria-hidden />
      </div>
      <p className="mt-4 text-base font-semibold text-ink">
        Finish signing up to see your orders
      </p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
        You need a seller profile before orders can land here.
      </p>
      <Link
        to="/onboarding"
        className="mt-5 inline-flex h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-brand-foreground hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        Complete signup
      </Link>
    </div>
  );
}

function NeverHadAnOrderEmpty() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface text-ink-soft">
        <Package className="h-7 w-7" aria-hidden />
      </div>
      <p className="mt-4 text-base font-semibold text-ink">No orders yet</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
        When a buyer pays, the order will appear here. Share your listing
        links and you're in business.
      </p>
      <Link
        to="/app/listings"
        className="mt-5 inline-flex h-11 items-center rounded-lg border border-border bg-white px-4 text-sm font-medium text-ink hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        View my listings
      </Link>
    </div>
  );
}

/* -------------------------- inline ship dialog ------------------------ */

function ShipDialog({
  orderToken,
  listingTitle,
}: {
  orderToken: string;
  listingTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [tracking, setTracking] = useState("");
  const [carrier, setCarrier] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const shipMutation = useMutation({
    mutationFn: () =>
      httpApi.shipOrder(orderToken, {
        trackingNumber: tracking || undefined,
        carrier: carrier || undefined,
      }),
    onSuccess: () => {
      setOpen(false);
      setTracking("");
      setCarrier("");
      queryClient.invalidateQueries({ queryKey: ["sellerOrders"] });
      toast({
        title: "Marked as shipped",
        description: `Order ${orderToken.slice(0, 8)}… is now shipped.`,
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to ship",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          className="h-8 w-full bg-brand text-xs font-semibold text-brand-foreground hover:bg-brand/90 sm:w-auto"
        >
          Mark shipped
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Mark as shipped</DialogTitle>
          <DialogDescription>
            Confirm you've dispatched "{listingTitle}" and add tracking info.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="ship-carrier">Carrier (optional)</Label>
            <Input
              id="ship-carrier"
              placeholder="e.g. DHL, FedEx, NIPOST"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ship-tracking">Tracking number (optional)</Label>
            <Input
              id="ship-tracking"
              placeholder="e.g. 1Z999AA10123456784"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            className="h-9"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => shipMutation.mutate()}
            disabled={shipMutation.isPending}
            className="h-9 bg-brand text-brand-foreground hover:bg-brand/90"
          >
            {shipMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Shipping…
              </>
            ) : (
              "Confirm shipped"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------- skeleton + empties -------------------------- */

function FilteredEmpty({
  query,
  onClear,
}: {
  query: string;
  onClear: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center">
      <p className="text-sm font-medium text-ink">
        {query ? `No orders match "${query}".` : "No orders match this filter."}
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-3 text-sm font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
      >
        Clear filters
      </button>
    </div>
  );
}
