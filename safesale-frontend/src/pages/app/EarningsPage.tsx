/**
 * Seller Earnings — `/app/earnings`.
 *
 * Designed and ported directly from spec — no Stitch round-trip on
 * this screen (cost more than the layout it produced for the other
 * pages). Same visual contract as #2 / #3 / #4: semantic tokens,
 * lucide icons only, mobile-first.
 *
 * Data source: 100 % `useSellerOrders()` — the same TanStack cache
 * the dashboard and the orders list use, so all three surfaces agree
 * at all times. Backend has no dedicated `/api/earnings` endpoint yet
 * (per PROGRESS.md "Still on mock data" + PRD delta #8). When it
 * lands, the aggregation done here in JavaScript moves to a single
 * `apiClient.getEarnings()` call; the UI doesn't change.
 *
 * What the page surfaces (every number derived from real orders):
 *
 *   - Released (lifetime)  — sum of amountNGN across `completed` orders
 *   - Locked in escrow     — sum of amountNGN across `paid` orders
 *   - This month           — sum of amountNGN across `completed` orders
 *                            where releasedAt ≥ first of current month
 *   - Pending shipment     — count of orders still in `paid`
 *                            (work the seller can do to release more sats)
 *   - Payout history       — completed orders, newest first, with NGN +
 *                            sats per row
 *
 * What's intentionally *NOT* on this page:
 *
 *   - Working "Cash out to Naira" button. The Bitnob payout integration
 *     (PRD delta #2) and the LN melt to seller wallet are both on
 *     Joy's plate. Frontend shows a clearly-labelled "Cash out · coming
 *     soon" CTA that toasts a friendly note when tapped — same honest
 *     pattern we used for "Edit listing" on screen #3.
 *
 *   - Sparkline / weekly chart. Earlier stub had a fabricated 7-day
 *     array; we don't have real time-series data and inventing one
 *     would be a fake-stat in the same category as the old TrustStrip
 *     numbers. Dropped.
 *
 *   - Bank account "on file." The current backend Seller schema
 *     supports `bankName`, `bankAccountNumber`, `bankAccountName` but
 *     nothing reads/writes them yet. Showing a fake "GTB ****2841" row
 *     in the meantime is lying. Replaced with an honest empty-state
 *     card pointing at the future feature.
 *
 *   - Sats-to-NGN live conversion. We display the sats figure from the
 *     order row exactly as the backend stored it (locked-in rate at
 *     order creation, per BACKEND.md). Re-computing in JS would either
 *     require a live rate fetch (over-scope) or another fabricated
 *     constant (dishonest).
 */

import { useSeoMeta } from "@unhead/react";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import { AppShell } from "@/components/safesale/AppShell";
import { EscrowStatusPill } from "@/components/safesale/EscrowStatus";
import { ListingThumb } from "@/components/safesale/ListingThumb";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowDownCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { useCurrentSeller } from "@/hooks/useCurrentSeller";
import { useSellerOrders } from "@/hooks/useSellerOrders";
import { useToast } from "@/hooks/useToast";
import type { SellerOrderRow } from "@/lib/api";
import { formatNGN, formatRelative } from "@/lib/format";

/* ----------------------------------------------------------------------- */
/*                                Page                                     */
/* ----------------------------------------------------------------------- */

export default function EarningsPage() {
  useSeoMeta({ title: "Earnings — SafeSale" });

  const [seller] = useCurrentSeller();
  const { orders, isLoading } = useSellerOrders();
  const { toast } = useToast();

  const stats = useMemo(() => computeStats(orders), [orders]);
  const completed = useMemo(
    () =>
      orders
        .filter((o) => o.status === "completed")
        .sort((a, b) => +new Date(b.releasedAt ?? b.updatedAt) - +new Date(a.releasedAt ?? a.updatedAt)),
    [orders],
  );

  const onCashOut = () => {
    toast({
      title: "Cash-out coming soon",
      description:
        "Naira payout via MavaPay will be available once you add your bank details. Your funds are safely held.",
    });
  };

  return (
    <AppShell
      title="Earnings"
      subtitle="Every released order, every sat — straight from the chain, not made up."
    >
      <div className="space-y-6">
        {/* 1. Hero — released-lifetime + cash-out CTA */}
        <section className="overflow-hidden rounded-2xl border border-border bg-white p-5 sm:p-6">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-soft">
            Released to you (lifetime)
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-3">
            {isLoading ? (
              <Skeleton className="h-9 w-48" />
            ) : (
              <>
                <p className="text-3xl font-semibold tracking-tight text-ink tabular-nums sm:text-4xl">
                  {formatNGN(stats.releasedNGN)}
                </p>
              </>
            )}
          </div>
          <p className="mt-2 text-xs text-ink-soft">
            Every released payout is verifiable on MavaPay. No platform
            balance — your money, your control.
          </p>

          <Button
            type="button"
            onClick={onCashOut}
            size="lg"
            className="mt-5 h-12 w-full rounded-lg bg-brand text-base font-semibold text-brand-foreground hover:bg-brand/90 sm:w-auto"
          >
            <ArrowDownCircle className="mr-2 h-4 w-4" aria-hidden />
            Cash out · Coming soon
          </Button>
        </section>

        {/* 2. Stats grid */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon={ShieldCheck}
            label="Locked in escrow"
            value={isLoading ? null : formatNGN(stats.lockedNGN)}
            sub={null}
            footnote={
              stats.toShipCount > 0
                ? `${stats.toShipCount} order${stats.toShipCount === 1 ? "" : "s"} to ship`
                : "All caught up"
            }
            footnoteTone={stats.toShipCount > 0 ? "warn" : "ok"}
          />
          <StatCard
            icon={TrendingUp}
            label="This month"
            value={isLoading ? null : formatNGN(stats.monthNGN)}
            sub={null}
            footnote={
              stats.monthCount > 0
                ? `${stats.monthCount} release${stats.monthCount === 1 ? "" : "s"}`
                : "No releases yet this month"
            }
          />
          <StatCard
            icon={CheckCircle2}
            label="Completed orders"
            value={isLoading ? null : String(stats.completedCount)}
            sub={isLoading ? null : "all time"}
            footnote={
              stats.completedCount > 0
                ? `Latest · ${formatRelative(completed[0]?.releasedAt ?? completed[0]?.updatedAt ?? "")}`
                : "When buyers release, they show up here"
            }
          />
        </section>

        {/* 3. Bank-on-file panel — honest empty state */}
        <BankPanel />

        {/* 4. Payout history (=completed orders) */}
        <section className="overflow-hidden rounded-2xl border border-border bg-white">
          <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-ink-soft">
                Payout history
              </p>
              <p className="mt-0.5 text-xs text-ink-soft">
                Every order the buyer released. Newest first.
              </p>
            </div>
            <Link
              to="/app/orders"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
            >
              All orders <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          </header>

          {isLoading ? (
            <PayoutSkeleton />
          ) : !seller ? (
            <EmptyNotSignedUp />
          ) : completed.length === 0 ? (
            <EmptyNoPayouts toShipCount={stats.toShipCount} />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-white text-[11px] font-medium uppercase tracking-wider text-ink-soft">
                    <tr>
                      <th className="px-4 py-3">Order</th>
                      <th className="px-4 py-3">Buyer</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3">Released</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {completed.map((o) => (
                      <PayoutRow key={o.orderToken} order={o} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile stacked cards */}
              <ul className="divide-y divide-border sm:hidden">
                {completed.map((o) => (
                  <PayoutMobile key={o.orderToken} order={o} />
                ))}
              </ul>
            </>
          )}
        </section>

        {/* 5. Footnote — what 'released' actually means cryptographically */}
        <p className="px-1 text-[11px] italic leading-relaxed text-ink-soft">
          Funds held in SafeSale's MavaPay custodial wallet and released via
          bank transfer. No sats, no Lightning — Naira in, Naira out.
        </p>
      </div>
    </AppShell>
  );
}

/* ----------------------------------------------------------------------- */
/*                            Aggregation                                  */
/* ----------------------------------------------------------------------- */

interface Stats {
  releasedNGN: number;
  lockedNGN: number;
  monthNGN: number;
  monthCount: number;
  completedCount: number;
  toShipCount: number;
}

function computeStats(orders: SellerOrderRow[]): Stats {
  const firstOfMonthMs = (() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  })();

  let releasedNGN = 0;
  let lockedNGN = 0;
  let monthNGN = 0;
  let monthCount = 0;
  let completedCount = 0;
  let toShipCount = 0;

  for (const o of orders) {
    if (o.status === "completed") {
      releasedNGN += o.amountNGN;
      completedCount += 1;

      const releasedAt = o.releasedAt ? Date.parse(o.releasedAt) : null;
      if (releasedAt && releasedAt >= firstOfMonthMs) {
        monthNGN += o.amountNGN;
        monthCount += 1;
      }
    } else if (o.status === "paid") {
      lockedNGN += o.amountNGN;
      toShipCount += 1;
    }
  }

  return {
    releasedNGN,
    lockedNGN,
    monthNGN,
    monthCount,
    completedCount,
    toShipCount,
  };
}

/* ----------------------------------------------------------------------- */
/*                            Subcomponents                                */
/* ----------------------------------------------------------------------- */

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  footnote,
  footnoteTone,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string | null;
  sub: string | null;
  footnote: string;
  footnoteTone?: "warn" | "ok";
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-ink-soft">
          {label}
        </p>
        <Icon className="h-4 w-4 text-ink-soft" aria-hidden />
      </div>
      <div className="mt-2 min-h-[2rem]">
        {value === null ? (
          <Skeleton className="h-6 w-32" />
        ) : (
          <p className="text-xl font-semibold tabular-nums text-ink">{value}</p>
        )}
      </div>
      <div className="mt-0.5 min-h-[1rem]">
        {sub === null ? (
          <Skeleton className="h-3 w-20" />
        ) : (
          <p className="text-[11px] tabular-nums text-ink-soft">{sub}</p>
        )}
      </div>
      <p
        className={
          "mt-3 border-t border-border pt-3 text-[11px] " +
          (footnoteTone === "warn"
            ? "text-amber-800"
            : footnoteTone === "ok"
              ? "text-brand-soft-foreground"
              : "text-ink-soft")
        }
      >
        {footnote}
      </p>
    </div>
  );
}

function BankPanel() {
  return (
    <section className="rounded-2xl border border-dashed border-border bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-ink-soft">
          <Building2 className="h-5 w-5" aria-hidden />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-ink">
            No bank account on file yet
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Naira payouts via MavaPay need a Nigerian bank account on file.
            Add your bank details in settings to receive payouts directly
            to your account.
          </p>
        </div>
        <Link
          to="/app/settings"
          className="inline-flex h-10 shrink-0 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-brand-foreground hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          Add bank
        </Link>
      </div>
    </section>
  );
}

function PayoutRow({ order }: { order: SellerOrderRow }) {
  return (
    <tr className="hover:bg-surface">
      <td className="px-4 py-3 align-middle">
        <div className="flex items-center gap-3">
          <ListingThumb
            image={order.listing.images[0]}
            alt={order.listing.title}
            size={40}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">
              {order.listing.title}
            </p>
            <p className="mt-0.5 font-mono text-[11px] tabular-nums text-ink-soft">
              {order.shortId}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 align-middle">
        <p className="truncate text-sm text-ink">{order.buyerName}</p>
        <p className="mt-0.5 truncate text-xs text-ink-soft">
          {order.buyerCity}
        </p>
      </td>
      <td className="px-4 py-3 align-middle text-right">
        <p className="text-sm font-semibold tabular-nums text-ink">
                  {formatNGN(order.amountNGN)}
                </p>
              </td>
              <td className="px-4 py-3 align-middle">
                <div className="flex items-center gap-2">
                  <EscrowStatusPill status={order.status} size="sm" />
                  <span className="text-[11px] text-ink-soft">
                    {formatRelative(order.releasedAt ?? order.updatedAt)}
                  </span>
                </div>
              </td>
            </tr>
          );
        }

        function PayoutMobile({ order }: { order: SellerOrderRow }) {
          return (
            <li className="px-4 py-4">
              <div className="flex items-center gap-3">
                <ListingThumb
                  image={order.listing.images[0]}
                  alt={order.listing.title}
                  size={40}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {order.listing.title}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] tabular-nums text-ink-soft">
                    {order.shortId}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums text-ink">
                    {formatNGN(order.amountNGN)}
                  </p>
                </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-xs text-ink-soft">
          {order.buyerName}, {order.buyerCity}
        </p>
        <span className="text-[11px] text-ink-soft">
          {formatRelative(order.releasedAt ?? order.updatedAt)}
        </span>
      </div>
    </li>
  );
}

/* ----------------------------------------------------------------------- */
/*                            Empty / loading                              */
/* ----------------------------------------------------------------------- */

function PayoutSkeleton() {
  return (
    <ul className="divide-y divide-border">
      {[0, 1, 2].map((i) => (
        <li key={i} className="px-4 py-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <div className="shrink-0 space-y-2 text-right">
              <Skeleton className="ml-auto h-4 w-16" />
              <Skeleton className="ml-auto h-3 w-12" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyNotSignedUp() {
  return (
    <div className="border-t border-border p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface text-ink-soft">
        <Wallet className="h-6 w-6" aria-hidden />
      </div>
      <p className="mt-4 text-base font-semibold text-ink">
        Finish signing up to see your payouts
      </p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
        You'll see every released order here once your seller profile is
        live.
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

function EmptyNoPayouts({ toShipCount }: { toShipCount: number }) {
  return (
    <div className="border-t border-border p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface text-ink-soft">
        <Clock className="h-6 w-6" aria-hidden />
      </div>
      <p className="mt-4 text-base font-semibold text-ink">No payouts yet</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
        {toShipCount > 0
          ? `You have ${toShipCount} order${toShipCount === 1 ? "" : "s"} locked in escrow. Mark them shipped, the buyer releases, and the sats land here.`
          : "When a buyer releases their first payment, it'll appear here. Share your listing link to bring in your first sale."}
      </p>
      <Link
        to="/app/orders"
        className="mt-5 inline-flex h-11 items-center rounded-lg border border-border bg-white px-4 text-sm font-medium text-ink hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        Go to orders
      </Link>
    </div>
  );
}
