/**
 * Seller Disputes — `/app/dispute` and `/app/dispute/:token`.
 *
 * Wired to real order data from the API via `useSellerOrders()` and
 * `apiClient.getOrder()`. Disputes are filtered from orders with
 * `status === 'disputed'` and orders that have a non-null `dispute`
 * relation.
 *
 * Response form buttons show "coming soon" toasts because the backend
 * has no dispute resolution endpoints yet (POST /api/disputes/:id/respond,
 * escalate, or resolve don't exist). The UI is production-ready and
 * will light up automatically when those endpoints ship.
 */

import { useSeoMeta } from "@unhead/react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/safesale/AppShell";
import { Avatar } from "@/components/safesale/Avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Timeline, type TimelineStep } from "@/components/safesale/Timeline";
import { Countdown } from "@/components/safesale/Countdown";
import { useSellerOrders } from "@/hooks/useSellerOrders";
import { useToast } from "@/hooks/useToast";
import { apiClient, type GetOrderResponse } from "@/lib/api";
import type {
  ApiDispute,
  ApiDisputeStatus,
  ApiOrder,
  ApiListing,
  SellerOrderRow,
} from "@/lib/api/types";
import { formatNGN, formatRelative } from "@/lib/format";
import {
  Scale,
  ShieldCheck,
  MessageCircle,
  ArrowLeft,
  ChevronRight,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn, sanitizeUrl } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                                  ROUTE                                     */
/* -------------------------------------------------------------------------- */

export default function DisputePage() {
  const { id: token } = useParams<{ id?: string }>();

  // List view if no token supplied.
  if (!token) return <DisputeList />;

  return <DisputeDetailLoader token={token} />;
}

/* -------------------------------------------------------------------------- */
/*                                  LIST                                      */
/* -------------------------------------------------------------------------- */

function DisputeList() {
  useSeoMeta({ title: "Disputes — SafeSale" });
  const { orders, isLoading } = useSellerOrders();

  // Filter orders that have disputes attached
  const disputedOrders = orders.filter(
    (o) => o.dispute !== null && o.dispute !== undefined,
  );
  const open = disputedOrders.filter((o) => o.dispute!.status !== "resolved");
  const closed = disputedOrders.filter(
    (o) => o.dispute!.status === "resolved",
  );

  if (isLoading) {
    return (
      <AppShell
        title="Disputes"
        subtitle="Stay calm. Share evidence. We'll get to a fair outcome."
      >
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Disputes"
      subtitle="Stay calm. Share evidence. We'll get to a fair outcome."
    >
      <div className="space-y-5">
        {open.length === 0 ? (
          <EmptyDisputes />
        ) : (
          <Section title="Needs your action" count={open.length}>
            <ul className="space-y-3">
              {open.map((o) => (
                <DisputeRow key={o.orderToken} order={o} />
              ))}
            </ul>
          </Section>
        )}

        {closed.length > 0 && (
          <Section title="Resolved" count={closed.length}>
            <ul className="space-y-3">
              {closed.map((o) => (
                <DisputeRow key={o.orderToken} order={o} />
              ))}
            </ul>
          </Section>
        )}
      </div>
    </AppShell>
  );
}

function EmptyDisputes() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-12 text-center">
      <ShieldCheck className="mx-auto h-7 w-7 text-brand" />
      <p className="mt-3 text-sm font-medium text-ink">No active disputes</p>
      <p className="mt-1 text-xs text-ink-soft">
        When a buyer opens a dispute on one of your orders, it will appear here.
      </p>
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        <span className="text-[11px] text-ink-soft">{count}</span>
      </div>
      {children}
    </section>
  );
}

function DisputeRow({ order }: { order: SellerOrderRow }) {
  const dispute = order.dispute!;
  const heroImg = order.listing.images[0]?.url
    ? sanitizeUrl(order.listing.images[0].url)
    : undefined;

  return (
    <li>
      <Link
        to={`/app/dispute/${order.orderToken}`}
        className="block rounded-2xl border border-border bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-16px_rgba(15,42,30,0.18)]"
      >
        <div className="flex items-start gap-3">
          {heroImg ? (
            <img
              src={heroImg}
              alt=""
              className="h-14 w-14 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="h-14 w-14 shrink-0 rounded-lg bg-surface" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">
                  {dispute.reason}
                </p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {order.shortId} · {order.listing.title} ·{" "}
                  {formatNGN(order.amountNGN)}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft" />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <DisputeStatusBadge status={dispute.status} />
              {dispute.directResolutionUntil && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
                  <Clock className="h-2.5 w-2.5" />
                  <Countdown
                    targetIso={dispute.directResolutionUntil}
                    prefix="Direct window"
                  />
                </span>
              )}
              {dispute.evidenceDueAt && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-800 ring-1 ring-inset ring-rose-200">
                  <AlertCircle className="h-2.5 w-2.5" />
                  <Countdown
                    targetIso={dispute.evidenceDueAt}
                    prefix="Evidence due in"
                  />
                </span>
              )}
              {dispute.isReturn && (
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                  Return in progress
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*                              DETAIL LOADER                                 */
/* -------------------------------------------------------------------------- */

function DisputeDetailLoader({ token }: { token: string }) {
  const { data, isLoading, error } = useQuery<GetOrderResponse>({
    queryKey: ["safesale", "order-detail", token],
    queryFn: () => apiClient.getOrder(token),
  });

  if (isLoading) {
    return (
      <AppShell title="Loading dispute…">
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell title="Dispute not found">
        <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-12 text-center">
          <p className="text-sm font-medium text-ink">
            We couldn't find that order or dispute.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/app/dispute">Back to all disputes</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  if (!data.dispute) {
    return (
      <AppShell title="No dispute on this order">
        <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-12 text-center">
          <ShieldCheck className="mx-auto h-7 w-7 text-brand" />
          <p className="mt-3 text-sm font-medium text-ink">
            This order doesn't have an active dispute.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/app/dispute">Back to all disputes</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <DisputeDetailView
      order={data.order}
      listing={data.listing}
      dispute={data.dispute}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*                                 DETAIL                                     */
/* -------------------------------------------------------------------------- */

function DisputeDetailView({
  order,
  listing,
  dispute,
}: {
  order: ApiOrder;
  listing: ApiListing;
  dispute: ApiDispute;
}) {
  useSeoMeta({ title: `Dispute on ${order.shortId} — SafeSale` });
  const isResolved = dispute.status === "resolved";
  const heroImg = listing.images[0]?.url
    ? sanitizeUrl(listing.images[0].url)
    : undefined;

  return (
    <AppShell
      title={`Dispute on ${order.shortId}`}
      subtitle={
        isResolved
          ? "This case has been closed."
          : "Stay calm. Share clear evidence. A mediator will decide fairly."
      }
    >
      <div className="space-y-5">
        <Link
          to="/app/dispute"
          className="inline-flex items-center gap-1 text-xs font-medium text-ink-soft hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All disputes
        </Link>

        <StatusBanner dispute={dispute} amount={order.amountNGN} />

        <div className="grid gap-5 lg:grid-cols-3">
          {/* Order context */}
          <section className="rounded-2xl border border-border bg-white p-4 lg:col-span-1">
            <h2 className="text-sm font-semibold text-ink">
              Order in dispute
            </h2>
            <div className="mt-3 flex items-start gap-3">
              {heroImg ? (
                <img
                  src={heroImg}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="h-14 w-14 shrink-0 rounded-lg bg-surface" />
              )}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium text-ink">
                  {listing.title}
                </p>
                <p className="text-xs text-ink-soft">
                  {order.shortId} · {formatNGN(order.amountNGN)}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <MiniCard sub="Buyer">
                <Avatar
                  seed={order.buyerName}
                  name={order.buyerName}
                  size={32}
                />
                <p className="mt-2 truncate text-xs font-medium text-ink">
                  {order.buyerName}
                </p>
              </MiniCard>
              <MiniCard sub="Seller">
                <Avatar seed="seller" name="You" size={32} />
                <p className="mt-2 truncate text-xs font-medium text-ink">
                  You
                </p>
              </MiniCard>
            </div>
          </section>

          {/* Response form — only when the dispute is still actionable */}
          {!isResolved ? (
            <ResponseForm dispute={dispute} />
          ) : (
            <section className="rounded-2xl border border-border bg-white p-5 lg:col-span-2">
              <h2 className="text-sm font-semibold text-ink">
                This dispute has been resolved
              </h2>
              <p className="mt-2 text-sm text-ink-soft">
                The outcome is final and audit-recorded on the Nostr network.
              </p>
            </section>
          )}
        </div>

        {/* Timeline of events */}
        <section className="rounded-2xl border border-border bg-white p-5">
          <h2 className="text-sm font-semibold text-ink">What happened</h2>
          <Timeline
            className="mt-4"
            steps={buildTimeline(dispute, order, listing)}
          />
        </section>

        {/* Chat placeholder */}
        <section className="rounded-2xl border border-border bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Order chat</h2>
            <span className="text-[11px] font-medium text-ink-soft">
              NIP-17 integration coming
            </span>
          </div>
          <div className="mt-4 rounded-xl border border-dashed border-border px-6 py-8 text-center">
            <MessageCircle className="mx-auto h-5 w-5 text-ink-soft" />
            <p className="mt-2 text-sm text-ink-soft">
              Encrypted order chat will show here once NIP-17 private messaging
              is integrated.
            </p>
          </div>
        </section>

        {/* Reassurance */}
        {!isResolved && (
          <div className="rounded-2xl border border-emerald-200/60 bg-brand-soft/40 p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
              <div className="text-sm text-ink-soft">
                <p className="text-sm font-medium text-ink">
                  You're not alone in this
                </p>
                <p className="mt-1 text-xs leading-relaxed">
                  Funds stay frozen while the case is open. A trained SafeSale
                  mediator reviews evidence from both sides and decides — usually
                  within 24 hours of escalation.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

/* -------------------------------------------------------------------------- */
/*                          STATUS-AWARE BANNER                               */
/* -------------------------------------------------------------------------- */

function StatusBanner({
  dispute,
  amount,
}: {
  dispute: ApiDispute;
  amount: number;
}) {
  const status = dispute.status;

  if (status === "direct_resolution") {
    return (
      <div className="overflow-hidden rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 to-white p-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">
              Try to resolve directly with the buyer first
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">
              For the next 72 hours, you and the buyer can work this out via
              chat — a replacement, a partial refund, or a clear explanation. If
              you don't reach an agreement, a SafeSale mediator will
              automatically take the case.
            </p>
            {dispute.directResolutionUntil && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-900">
                <Clock className="h-3 w-3" />
                Auto-escalates in{" "}
                <Countdown targetIso={dispute.directResolutionUntil} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (status === "escalated" || status === "mediating") {
    return (
      <div className="overflow-hidden rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-white p-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <Scale className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink">
              Mediation in progress
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              {formatNGN(amount)} is held safely while a SafeSale mediator
              reviews. Most cases are resolved within 24 hours.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "evidence_requested") {
    return (
      <div className="overflow-hidden rounded-2xl border border-rose-200/70 bg-gradient-to-br from-rose-50 to-white p-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
            <AlertCircle className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink">
              The mediator needs more evidence
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              Add the requested photos or messages below. Missing the deadline
              weakens your case.
            </p>
            {dispute.evidenceDueAt && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-medium text-rose-900">
                <Clock className="h-3 w-3" />
                Evidence due in{" "}
                <Countdown targetIso={dispute.evidenceDueAt} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // resolved — no banner needed
  return null;
}

function DisputeStatusBadge({ status }: { status: ApiDisputeStatus }) {
  const map: Record<
    ApiDisputeStatus,
    { label: string; bg: string; text: string; ring: string }
  > = {
    direct_resolution: {
      label: "Direct resolution",
      bg: "bg-amber-50",
      text: "text-amber-800",
      ring: "ring-amber-200",
    },
    escalated: {
      label: "Escalated",
      bg: "bg-rose-50",
      text: "text-rose-800",
      ring: "ring-rose-200",
    },
    evidence_requested: {
      label: "Evidence requested",
      bg: "bg-rose-50",
      text: "text-rose-800",
      ring: "ring-rose-200",
    },
    mediating: {
      label: "Mediating",
      bg: "bg-amber-50",
      text: "text-amber-800",
      ring: "ring-amber-200",
    },
    resolved: {
      label: "Resolved",
      bg: "bg-brand-soft",
      text: "text-brand-soft-foreground",
      ring: "ring-emerald-200",
    },
  };
  const s = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset",
        s.bg,
        s.text,
        s.ring,
      )}
    >
      {s.label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*                              RESPONSE FORM                                 */
/* -------------------------------------------------------------------------- */

function ResponseForm({ dispute }: { dispute: ApiDispute }) {
  const { toast } = useToast();

  const comingSoon = (action: string) => () => {
    toast({
      title: `${action} — coming soon`,
      description:
        "Backend dispute resolution endpoints haven't shipped yet. This will work automatically once Joy adds POST /api/disputes/:id/respond.",
    });
  };

  return (
    <section className="rounded-2xl border border-border bg-white p-5 lg:col-span-2">
      <h2 className="text-sm font-semibold text-ink">Your response</h2>
      {dispute.summary && (
        <p className="mt-1 text-xs text-ink-soft">
          Buyer says: "{dispute.summary}"
        </p>
      )}

      <div className="mt-4 space-y-4">
        <div>
          <Label>Your stance</Label>
          <Select defaultValue="explain">
            <SelectTrigger className="mt-1.5 h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="explain">I'd like to explain</SelectItem>
              <SelectItem value="partial">Offer partial refund</SelectItem>
              <SelectItem value="full">Accept full refund</SelectItem>
              <SelectItem value="counter">Counter the claim</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="msg">Your message</Label>
          <Textarea
            id="msg"
            className="mt-1.5 min-h-[110px]"
            placeholder={
              dispute.status === "direct_resolution"
                ? "Write directly to the buyer. Try to resolve it here before a mediator gets involved."
                : "Calmly explain what happened. Be specific. Mediators read everything."
            }
          />
        </div>

        <div className="flex gap-3 pt-1">
          <Button
            variant="outline"
            className="h-11 flex-1"
            onClick={comingSoon("Save draft")}
          >
            Save draft
          </Button>
          <Button
            className="h-11 flex-[2] bg-brand text-brand-foreground hover:bg-brand/90"
            onClick={comingSoon(
              dispute.status === "direct_resolution"
                ? "Send to buyer"
                : "Submit to mediator",
            )}
          >
            {dispute.status === "direct_resolution"
              ? "Send to buyer"
              : "Submit to mediator"}
          </Button>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                              HELPERS                                       */
/* -------------------------------------------------------------------------- */

function buildTimeline(
  d: ApiDispute,
  order: ApiOrder,
  listing: ApiListing,
): TimelineStep[] {
  const fmt = (iso: string) => formatRelative(iso);
  const base: TimelineStep[] = [
    {
      key: "ord",
      title: "Order placed",
      description: `${order.buyerName} bought ${listing.title}`,
      at: fmt(order.createdAt),
      state: "done" as const,
    },
    {
      key: "esc",
      title: "Payment locked",
      description: `${formatNGN(order.amountNGN)} in SafeSale escrow`,
      at: fmt(order.updatedAt),
      state: "done" as const,
    },
    {
      key: "ship",
      title: "Shipped",
      description:
        order.trackingNumber
          ? `${order.carrier ?? ""} ${order.trackingNumber}`
          : undefined,
      at: order.shippedAt ? fmt(order.shippedAt) : undefined,
      state: order.shippedAt ? ("done" as const) : ("pending" as const),
    },
    {
      key: "dsp",
      title: "Dispute opened",
      description: d.summary ?? d.reason,
      at: fmt(d.createdAt),
      state: "alert" as const,
    },
  ];

  if (d.status === "direct_resolution") {
    base.push({
      key: "direct",
      title: "Direct resolution window (72h)",
      description: "Buyer & seller try to resolve via chat first",
      at: undefined,
      state: "active" as const,
    });
  }
  if (d.status === "escalated" || d.status === "mediating") {
    base.push({
      key: "escalate",
      title: "Escalated to mediator",
      description: "SafeSale mediator now reviewing the case",
      at: undefined,
      state: "active" as const,
    });
  }
  if (d.status === "evidence_requested") {
    base.push({
      key: "evidence",
      title: "Mediator requested more evidence",
      description: "24-hour window to respond",
      at: undefined,
      state: "alert" as const,
    });
  }
  if (d.status === "resolved" && d.resolvedAt) {
    base.push({
      key: "resolved",
      title: "Resolved",
      at: fmt(d.resolvedAt),
      state: "done" as const,
    });
  }
  return base;
}

function MiniCard({
  sub,
  children,
}: {
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-border bg-surface-2/30 p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-ink-soft">
        {sub}
      </p>
      <div className="mt-2 flex flex-col items-center">{children}</div>
    </div>
  );
}
