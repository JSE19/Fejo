import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useSeoMeta } from "@unhead/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  HeadphonesIcon,
  Loader2,
  Lock,
  MessageCircle,
  PackageCheck,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Truck,
  Undo2,
  Wallet,
  XCircle,
} from "lucide-react";

import { Logo } from "@/components/safesale/Logo";
import { Avatar } from "@/components/safesale/Avatar";
import { ListingThumb } from "@/components/safesale/ListingThumb";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/useToast";

import {
  apiClient,
  ApiError,
  type ApiDispute,
  type ApiListing,
  type ApiOrder,
  type ApiOrderStatus,
  type ApiSeller,
  type GetOrderResponse,
} from "@/lib/api";
import { formatCountdownLong, formatDate, formatNGN } from "@/lib/format";
import { cn } from "@/lib/utils";

const TERMINAL_STATUSES: ApiOrderStatus[] = ["completed", "refunded"];

const ACTIONABLE_STATUSES: ApiOrderStatus[] = ["shipped"];

const DISPUTE_REASONS = [
  { value: "not_received", label: "Item didn't arrive" },
  { value: "damaged", label: "Item is damaged" },
  { value: "not_as_described", label: "Item is not as described" },
  { value: "wrong_item", label: "Wrong item received" },
] as const;

type DisputeReason = (typeof DISPUTE_REASONS)[number]["value"];

export default function BuyerOrder() {
  const { token = "" } = useParams<{ token: string }>();
  const qc = useQueryClient();
  const { toast } = useToast();

  const query = useQuery<GetOrderResponse>({
    queryKey: ["safesale", "order", token],
    enabled: token.length > 0,
    queryFn: () => apiClient.getOrder(token),
    refetchInterval: (q) => {
      const data = q.state.data;
      if (!data) return 8_000;
      return TERMINAL_STATUSES.includes(data.order.status) ? false : 8_000;
    },
    retry: (failureCount, err) => {
      if (err instanceof ApiError && err.code === "ORDER_NOT_FOUND") return false;
      return failureCount < 2;
    },
  });

  const [releaseOpen, setReleaseOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState<DisputeReason>("not_as_described");
  const [disputeDescription, setDisputeDescription] = useState("");

  const releaseMutation = useMutation({
    mutationFn: async () => {
      return apiClient.releaseOrder(token);
    },
    onSuccess: (res) => {
      qc.setQueryData<GetOrderResponse>(
        ["safesale", "order", token],
        (prev) => (prev ? { ...prev, order: res.order } : prev),
      );
      setReleaseOpen(false);
      toast({
        title: "Payment released",
        description: `${formatNGN(res.order.amountNGN)} on its way to the seller.`,
      });
    },
    onError: (err: unknown) => {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Couldn't release the payment. Try again in a moment.";
      toast({
        title: "Couldn't release payment",
        description: message,
        variant: "destructive",
      });
    },
  });

  const disputeMutation = useMutation({
    mutationFn: async () => {
      const reasonLabel = DISPUTE_REASONS.find((r) => r.value === disputeReason)?.label ?? disputeReason;
      return apiClient.openDispute(token, {
        reason: reasonLabel,
        summary: disputeDescription.trim() || undefined,
        openedBy: "buyer",
      });
    },
    onSuccess: (res) => {
      qc.setQueryData<GetOrderResponse>(
        ["safesale", "order", token],
        (prev) =>
          prev
            ? { ...prev, order: res.order, dispute: res.dispute }
            : prev,
      );
      setDisputeOpen(false);
      setDisputeDescription("");
      toast({
        title: "Dispute opened",
        description: "A mediator will respond within 48 hours.",
      });
    },
    onError: (err: unknown) => {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Couldn't open the dispute. Try again in a moment.";
      toast({
        title: "Couldn't open dispute",
        description: message,
        variant: "destructive",
      });
    },
  });

  useSeoMeta({
    title: query.data
      ? `Order ${query.data.order.shortId} — SafeSale`
      : "Your order — SafeSale",
  });

  if (query.isLoading) {
    return <BuyerOrderSkeleton />;
  }

  if (
    query.error instanceof ApiError &&
    query.error.code === "ORDER_NOT_FOUND"
  ) {
    return <InvalidOrderToken token={token} />;
  }

  if (!query.data) {
    return (
      <ErrorScreen
        title="Something went wrong"
        description={
          query.error instanceof Error
            ? query.error.message
            : "We couldn't load your order right now. Try again in a moment."
        }
      />
    );
  }

  const { order, listing, seller, dispute } = query.data;
  const status = order.status;
  const releasing = releaseMutation.isPending;
  const disputing = disputeMutation.isPending;

  return (
    <div className="min-h-screen bg-surface">
      <HeaderBar />
      <main className="container mx-auto max-w-3xl space-y-6 px-4 pb-32 pt-6 sm:px-6 lg:pb-12">
        <OrderIdStrip order={order} />

        <HeroStatusBlock order={order} dispute={dispute} />

        <TimelineCard order={order} dispute={dispute} />

        <div className="grid gap-6 md:grid-cols-2">
          <OrderSummaryCard order={order} listing={listing} />
          <DeliveryDetailsCard order={order} />
        </div>

        <SellerMiniCard seller={seller} />

        <ActionPanel
          status={status}
          order={order}
          dispute={dispute}
          onRelease={() => setReleaseOpen(true)}
          onDispute={() => setDisputeOpen(true)}
        />

        <EscrowTrustFooter />
      </main>

      {ACTIONABLE_STATUSES.includes(status) && (
        <MobileActionBar
          onRelease={() => setReleaseOpen(true)}
          onDispute={() => setDisputeOpen(true)}
        />
      )}
      {status === "pending_payment" && <MobileWaitingBar />}

      <Dialog open={releaseOpen} onOpenChange={(o) => !releasing && setReleaseOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand text-brand-foreground">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <DialogTitle className="leading-tight">
                Release {formatNGN(order.amountNGN)} to {seller.name}?
              </DialogTitle>
            </div>
            <DialogDescription className="pt-3 text-sm leading-relaxed">
              This is final. The seller will receive payment instantly and the
              order will be marked complete. Only confirm if you have received
              your item and you're satisfied with it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              disabled={releasing}
              onClick={() => setReleaseOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={releasing}
              onClick={() => releaseMutation.mutate()}
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              {releasing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Releasing…
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Yes, release payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={disputeOpen}
        onOpenChange={(o) => !disputing && setDisputeOpen(o)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <DialogTitle className="leading-tight">Open a dispute</DialogTitle>
            </div>
            <DialogDescription className="pt-3 text-sm leading-relaxed">
              Your funds will be frozen and a mediator will be involved. Be
              specific — both the seller and a SafeSale mediator will read this.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-ink">
                What's the problem?
              </Label>
              <RadioGroup
                value={disputeReason}
                onValueChange={(v) => setDisputeReason(v as DisputeReason)}
                className="gap-2"
              >
                {DISPUTE_REASONS.map((r) => (
                  <Label
                    key={r.value}
                    htmlFor={`reason-${r.value}`}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background px-3 py-3 text-sm font-medium text-ink transition-colors hover:bg-secondary/40 has-[[data-state=checked]]:border-brand has-[[data-state=checked]]:bg-brand-soft/40"
                  >
                    <RadioGroupItem id={`reason-${r.value}`} value={r.value} />
                    {r.label}
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="dispute-description"
                className="text-sm font-semibold text-ink"
              >
                Describe what happened
              </Label>
              <Textarea
                id="dispute-description"
                value={disputeDescription}
                onChange={(e) => setDisputeDescription(e.target.value)}
                placeholder="What did you expect vs. what you received? Be as specific as you can."
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-ink">
                Add photos (optional)
              </Label>
              <div
                className="grid grid-cols-3 gap-2"
                aria-label="Photo upload placeholders"
              >
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-border bg-surface text-ink-soft"
                  >
                    <span className="text-xl leading-none">+</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-ink-soft">
                Coming soon — photo uploads will work in the next update.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              disabled={disputing}
              onClick={() => setDisputeOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={disputing || disputeDescription.trim().length < 5}
              onClick={() => disputeMutation.mutate()}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {disputing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <Scale className="mr-2 h-4 w-4" />
                  Submit dispute
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================ sub-components ========================= */

function HeaderBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="container mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-ink-soft hover:text-ink"
        >
          <a href="#help">
            <HeadphonesIcon className="mr-1.5 h-4 w-4" />
            <span className="text-xs font-medium">Help</span>
          </a>
        </Button>
      </div>
    </header>
  );
}

function OrderIdStrip({ order }: { order: ApiOrder }) {
  const { toast } = useToast();
  const url =
    typeof window !== "undefined" ? window.location.href : `/order/${order.orderToken}`;
  const copy = () => {
    navigator.clipboard?.writeText(url);
    toast({ title: "Order link copied" });
  };
  return (
    <section className="flex items-center justify-between rounded-2xl border border-border/60 bg-background px-4 py-3">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
          Order ID
        </p>
        <p className="font-mono text-sm font-semibold text-ink">
          {order.shortId}
        </p>
        <p className="mt-0.5 text-xs text-ink-soft">
          Placed {formatDate(order.createdAt)}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={copy}
        className="shrink-0"
        aria-label="Copy order link"
      >
        <Copy className="mr-1.5 h-3.5 w-3.5" />
        <span className="text-xs font-medium">Copy link</span>
      </Button>
    </section>
  );
}

/* ----------------------- hero status block --------------------------- */

interface HeroProps {
  order: ApiOrder;
  dispute: ApiDispute | null;
}

function HeroStatusBlock({ order, dispute }: HeroProps) {
  const config = getHeroConfig(order, dispute);
  return (
    <section
      className={cn(
        "rounded-2xl border p-6 sm:p-8",
        config.bg,
        config.border,
      )}
    >
      <div className="flex items-start gap-4 sm:items-center">
        <span
          className={cn(
            "inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white shadow-md",
            config.iconBg,
          )}
        >
          <config.Icon className="h-7 w-7" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold leading-tight text-ink sm:text-2xl">
            {config.headline}
          </h1>
          {config.subline && (
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft sm:text-base">
              {config.subline}
            </p>
          )}
          {config.countdownIso && (
            <CountdownChip targetIso={config.countdownIso} />
          )}
        </div>
      </div>
    </section>
  );
}

function CountdownChip({ targetIso }: { targetIso: string }) {
  const [, setTick] = useState(0);
  useTicker(() => setTick((t) => t + 1), 60_000);
  const remaining = formatCountdownLong(targetIso);
  return (
    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-background/70 px-3 py-1 text-xs font-medium text-ink">
      <Clock className="h-3.5 w-3.5" />
      <span className="tabular-nums">{remaining}</span>
      <span className="text-ink-soft">until auto-release</span>
    </span>
  );
}

interface HeroConfig {
  bg: string;
  border: string;
  iconBg: string;
  Icon: typeof Truck;
  headline: string;
  subline: string;
  countdownIso?: string;
}

function getHeroConfig(order: ApiOrder, dispute: ApiDispute | null): HeroConfig {
  const amount = formatNGN(order.amountNGN);
  switch (order.status) {
    case "pending_payment":
      return {
        bg: "bg-brand-soft",
        border: "border-brand-soft/40",
        iconBg: "bg-brand",
        Icon: Wallet,
        headline: "Awaiting your payment",
        subline: `Your payment of ${amount} is being processed. This page will update automatically once confirmed.`,
      };
    case "paid":
      return {
        bg: "bg-brand-soft",
        border: "border-brand-soft/40",
        iconBg: "bg-brand",
        Icon: ShieldCheck,
        headline: "Your payment is locked in escrow",
        subline: `${amount} is held safely. The seller has been notified and will ship soon.`,
      };
    case "shipped":
      return {
        bg: "bg-brand-soft",
        border: "border-brand-soft/40",
        iconBg: "bg-brand",
        Icon: Truck,
        headline: "Your order has been shipped",
        subline: order.trackingNumber
          ? `Tracking: ${order.trackingNumber}${order.carrier ? ` via ${order.carrier}` : ""}. Funds release automatically if you take no action.`
          : "The seller has marked your order as shipped. Funds release automatically if you take no action.",
        countdownIso: order.autoReleaseAt ?? undefined,
      };
    case "completed":
      return {
        bg: "bg-brand-soft",
        border: "border-brand-soft/40",
        iconBg: "bg-brand",
        Icon: CheckCircle2,
        headline: "Payment released — order complete",
        subline: `Thank you. ${amount} has been sent to the seller. A receipt is in your email.`,
      };
    case "disputed":
      return {
        bg: "bg-amber-50",
        border: "border-amber-200/60",
        iconBg: "bg-amber-500",
        Icon: Scale,
        headline: "Dispute opened — under review",
        subline:
          dispute?.status === "resolved"
            ? "A mediator has resolved your dispute. See details below."
            : "Your funds are frozen. A SafeSale mediator will respond within 48 hours.",
      };
    case "refunded":
      return {
        bg: "bg-rose-50",
        border: "border-rose-200/60",
        iconBg: "bg-rose-600",
        Icon: Undo2,
        headline: "Refund issued",
        subline: `${amount} has been returned to your bank account. Allow 1–2 business days.`,
      };
  }
}

/* ----------------------- timeline card ------------------------------- */

interface TimelineProps {
  order: ApiOrder;
  dispute: ApiDispute | null;
}

function TimelineCard({ order, dispute }: TimelineProps) {
  const steps = getTimelineState(order.status);
  const disputedBranch = order.status === "disputed";
  const doneCount = steps.filter((s) => s.state !== "pending").length;
  const progressPct = ((doneCount - 0.5) / (steps.length - 1)) * 100;

  return (
    <section className="rounded-2xl border border-border bg-background p-5 sm:p-6">
      <div className="relative">
        <div className="absolute left-4 right-4 top-4 h-[2px] bg-border" />
        <div
          className="absolute left-4 top-4 h-[2px] bg-brand transition-all duration-500"
          style={{ width: `calc((100% - 32px) * ${Math.max(0, Math.min(1, progressPct / 100))})` }}
        />
        <ol className="relative z-10 grid grid-cols-4 gap-2">
          {steps.map((step) => (
            <li key={step.key} className="flex flex-col items-center text-center">
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-background",
                  step.state === "done" && "bg-brand text-brand-foreground",
                  step.state === "active" &&
                    "border-2 border-brand bg-background text-brand",
                  step.state === "pending" && "border border-border bg-background text-ink-soft",
                )}
              >
                {step.state === "done" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <step.Icon className="h-4 w-4" />
                )}
              </span>
              <span
                className={cn(
                  "mt-2 text-xs font-medium",
                  step.state === "pending" ? "text-ink-soft" : "text-ink",
                )}
              >
                {step.label}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {disputedBranch && (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 text-amber-900">
          <Scale className="h-4 w-4 shrink-0" />
          <p className="text-xs font-medium">
            Branched to dispute on {dispute ? formatDate(dispute.createdAt) : "unknown date"}.
          </p>
        </div>
      )}
    </section>
  );
}

type TimelineStepState = "done" | "active" | "pending";
interface TimelineStep {
  key: string;
  label: string;
  Icon: typeof Truck;
  state: TimelineStepState;
}

function getTimelineState(status: ApiOrderStatus): TimelineStep[] {
  const base: Omit<TimelineStep, "state">[] = [
    { key: "paid", label: "Paid", Icon: Wallet },
    { key: "locked", label: "Locked", Icon: Lock },
    { key: "shipped", label: "Shipped", Icon: Truck },
    { key: "released", label: "Released", Icon: CheckCircle2 },
  ];
  const stateByStep: Record<ApiOrderStatus, TimelineStepState[]> = {
    pending_payment: ["active", "pending", "pending", "pending"],
    paid: ["done", "active", "pending", "pending"],
    shipped: ["done", "done", "active", "pending"],
    completed: ["done", "done", "done", "done"],
    disputed: ["done", "done", "done", "pending"],
    refunded: ["done", "done", "pending", "pending"],
  };
  const states = stateByStep[status];
  return base.map((b, i) => ({ ...b, state: states[i] }));
}

/* ----------------------- order summary card ------------------------- */

function OrderSummaryCard({
  order,
  listing,
}: {
  order: ApiOrder;
  listing: ApiListing;
}) {
  const firstImage = listing.images[0];
  return (
    <section className="rounded-2xl border border-border bg-background p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <ListingThumb image={firstImage} alt={listing.title} size={80} iconScale={0.35} />
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 text-sm font-semibold text-ink">
            {listing.title}
          </h2>
          {order.variant && (
            <p className="mt-0.5 text-xs text-ink-soft">{order.variant}</p>
          )}
          <p className="mt-2 text-xl font-semibold tabular-nums text-ink">
            {formatNGN(order.amountNGN)}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-1.5 border-t border-border pt-4 text-sm">
        <PriceRow label="Item" value={formatNGN(order.amountNGN)} />
        <PriceRow label="Delivery" value="Pay seller on agreement" muted />
        <PriceRow label="SafeSale fee" value="Free during launch" muted />
        <div className="mt-2 flex items-baseline justify-between border-t border-border pt-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Total
          </span>
          <span className="text-base font-semibold tabular-nums text-ink">
            {formatNGN(order.amountNGN)}
          </span>
        </div>
      </div>
    </section>
  );
}

function PriceRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span className={cn("text-sm", muted ? "text-ink-soft" : "text-ink-soft")}>
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums",
          muted ? "text-xs text-ink-soft" : "text-sm font-medium text-ink",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/* ----------------------- delivery details ---------------------------- */

function DeliveryDetailsCard({ order }: { order: ApiOrder }) {
  return (
    <section className="rounded-2xl border border-border bg-background p-5 sm:p-6">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Truck className="h-4 w-4 text-brand" />
        Shipping to
      </h3>
      <div className="mt-3 space-y-0.5 text-sm">
        <p className="font-semibold text-ink">{order.buyerName}</p>
        <p className="text-ink-soft">{order.buyerPhone}</p>
        <p className="leading-relaxed text-ink-soft">
          {order.buyerAddress ? (
            <>
              {order.buyerAddress}
              <br />
              {order.buyerCity}
            </>
          ) : (
            order.buyerCity
          )}
        </p>
      </div>

      {order.trackingNumber && (
        <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
          <Truck className="h-4 w-4 shrink-0 text-brand" />
          <p className="min-w-0 text-sm">
            <span className="font-mono font-medium text-ink">
              {order.trackingNumber}
            </span>
            {order.carrier && (
              <span className="text-ink-soft"> · {order.carrier}</span>
            )}
          </p>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-border pt-4 text-brand">
        <ShieldCheck className="h-4 w-4" />
        <span className="text-xs font-medium">Escrow protection active</span>
      </div>
    </section>
  );
}

/* ----------------------- seller mini-card ---------------------------- */

function SellerMiniCard({ seller }: { seller: ApiSeller }) {
  return (
    <section className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background p-4">
      <Link
        to={`/${seller.handle}`}
        className="group flex min-w-0 flex-1 items-center gap-3"
      >
        <div className="relative">
          <Avatar seed={seller.handle} name={seller.name} size={44} />
          {seller.verified && (
            <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-brand text-brand-foreground ring-2 ring-background">
              <Check className="h-2.5 w-2.5" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-ink group-hover:underline">
              {seller.name}
            </p>
            {seller.verified && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-tight text-brand-soft-foreground">
                <ShieldCheck className="h-2.5 w-2.5" /> Verified
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-ink-soft">
            {seller.location}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft" />
      </Link>

      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 text-ink-soft hover:bg-secondary/60 hover:text-ink"
        aria-label="Message seller"
      >
        <MessageCircle className="h-4 w-4" />
      </Button>
    </section>
  );
}

/* ----------------------- action panel -------------------------------- */

interface ActionPanelProps {
  status: ApiOrderStatus;
  order: ApiOrder;
  dispute: ApiDispute | null;
  onRelease: () => void;
  onDispute: () => void;
}

function ActionPanel({
  status,
  order,
  dispute,
  onRelease,
  onDispute,
}: ActionPanelProps) {
  switch (status) {
    case "pending_payment":
      return <WaitingPaymentCard />;
    case "paid":
      return (
        <DecisionCard
          locked
          onRelease={onRelease}
          onDispute={onDispute}
          countdownIso={null}
        />
      );
    case "shipped":
      return (
        <DecisionCard
          locked={false}
          onRelease={onRelease}
          onDispute={onDispute}
          countdownIso={order.autoReleaseAt ?? null}
        />
      );
    case "completed":
      return <CompletedReviewPlaceholder />;
    case "disputed":
      return <DisputeSummaryCard dispute={dispute} />;
    case "refunded":
      return null;
  }
}

/* --- pending_payment: waiting for payment confirmation */

function WaitingPaymentCard() {
  return (
    <section className="rounded-2xl border border-brand-soft/60 bg-brand-soft/60 p-5 sm:p-6">
      <div className="flex flex-col items-center text-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
        <h3 className="mt-3 text-sm font-semibold text-ink">
          Waiting for payment confirmation
        </h3>
        <p className="mt-1 text-sm text-ink-soft">
          Your payment is being processed. This page will update automatically
          once confirmed — no need to refresh.
        </p>
      </div>
    </section>
  );
}

/* --- paid / shipped: the two-button decision panel */

function DecisionCard({
  locked,
  onRelease,
  onDispute,
  countdownIso,
}: {
  locked: boolean;
  onRelease: () => void;
  onDispute: () => void;
  countdownIso: string | null;
}) {
  return (
    <section className="rounded-2xl border border-border bg-background p-5 sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
        Your decision
      </p>
      {locked && (
        <p className="mt-2 text-sm text-ink-soft">
          These activate once the seller marks your order as shipped. You'll
          receive an email and an in-page update.
        </p>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-[1.4fr,1fr]">
        <Button
          onClick={onRelease}
          disabled={locked}
          size="lg"
          className="h-12 w-full rounded-lg bg-brand text-base font-semibold text-brand-foreground shadow-sm hover:bg-brand/90 disabled:opacity-50"
        >
          <ShieldCheck className="mr-2 h-4 w-4" />
          Release payment
        </Button>
        <Button
          onClick={onDispute}
          disabled={locked}
          variant="outline"
          size="lg"
          className="h-12 w-full rounded-lg border-border text-ink hover:border-rose-300 hover:text-rose-700 disabled:opacity-50"
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          Open dispute
        </Button>
      </div>
      {!locked && countdownIso && (
        <p className="mt-3 text-xs leading-relaxed text-ink-soft">
          Releasing payment is final. Funds go to the seller and the
          transaction completes. Auto-release in{" "}
          <span className="font-semibold tabular-nums">
            {formatCountdownLong(countdownIso)}
          </span>{" "}
          if you take no action.
        </p>
      )}
    </section>
  );
}

/* --- completed: review placeholder */

function CompletedReviewPlaceholder() {
  return (
    <section className="rounded-2xl border border-border bg-background p-5 text-center sm:p-6">
      <CheckCircle2 className="mx-auto h-7 w-7 text-brand" />
      <p className="mt-3 text-base font-semibold text-ink">Thanks for confirming!</p>
      <p className="mt-1 text-sm text-ink-soft">
        Your seller has been paid. You'll be able to leave a public review in
        the next update.
      </p>
    </section>
  );
}

/* --- disputed: summary card */

function DisputeSummaryCard({ dispute }: { dispute: ApiDispute | null }) {
  if (!dispute) {
    return (
      <section className="rounded-2xl border border-amber-200/60 bg-amber-50/40 p-5 sm:p-6">
        <p className="text-sm text-amber-900">Dispute is being prepared…</p>
      </section>
    );
  }
  const statusLabel: Record<ApiDispute["status"], string> = {
    direct_resolution: "Direct resolution",
    escalated: "Escalated to mediator",
    evidence_requested: "Awaiting evidence",
    mediating: "Under mediation",
    resolved: "Resolved",
  };
  const isResolved = dispute.status === "resolved";
  return (
    <section className="rounded-2xl border border-amber-200/60 bg-amber-50/40 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Scale className="h-4 w-4 text-amber-700" />
          Dispute opened {formatDate(dispute.createdAt)}
        </h3>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            isResolved
              ? "bg-brand text-brand-foreground"
              : "bg-amber-500 text-white",
          )}
        >
          {statusLabel[dispute.status]}
        </span>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-[120px,1fr]">
        <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
          Reason
        </dt>
        <dd className="text-ink">{dispute.reason}</dd>
        {dispute.summary && (
          <>
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
              Your description
            </dt>
            <dd className="leading-relaxed text-ink-soft">{dispute.summary}</dd>
          </>
        )}
      </dl>
      <p className="mt-4 text-xs leading-relaxed text-ink-soft">
        {isResolved
          ? "Check your email for the mediator's full reasoning."
          : "A mediator will respond within 48 hours. You'll be notified by email and on this page."}
      </p>
    </section>
  );
}

/* ----------------------- mobile sticky bars -------------------------- */

function MobileActionBar({
  onRelease,
  onDispute,
}: {
  onRelease: () => void;
  onDispute: () => void;
}) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur lg:hidden"
      role="region"
      aria-label="Order actions"
    >
      <div className="container mx-auto max-w-3xl space-y-2">
        <Button
          onClick={onRelease}
          size="lg"
          className="h-12 w-full rounded-lg bg-brand text-base font-semibold text-brand-foreground shadow-sm hover:bg-brand/90"
        >
          <ShieldCheck className="mr-2 h-4 w-4" />
          Release payment
        </Button>
        <Button
          onClick={onDispute}
          variant="outline"
          size="lg"
          className="h-11 w-full rounded-lg border-border text-ink hover:border-rose-300 hover:text-rose-700"
        >
          Open dispute
        </Button>
      </div>
    </div>
  );
}

function MobileWaitingBar() {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur lg:hidden"
      role="region"
      aria-label="Waiting for payment"
    >
      <div className="container mx-auto max-w-3xl">
        <Button
          size="lg"
          disabled
          className="h-12 w-full rounded-lg bg-ink-soft/20 text-base font-semibold text-ink-soft"
        >
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Waiting for your payment…
        </Button>
      </div>
    </div>
  );
}

/* ----------------------- escrow footer ------------------------------- */

function EscrowTrustFooter() {
  return (
    <div className="flex items-center justify-center gap-2 px-4 py-6 text-center">
      <ShieldCheck className="h-4 w-4 shrink-0 text-brand" />
      <p className="text-xs leading-relaxed text-ink-soft">
        Your payment is held by SafeSale's escrow — neither party can withdraw
        without the other's consent or a mediator's decision.{" "}
        <a
          href="#how-escrow-works"
          className="font-medium text-brand hover:underline"
        >
          How escrow works →
        </a>
      </p>
    </div>
  );
}

/* ----------------------- error / loading states --------------------- */

function BuyerOrderSkeleton() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="container mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <Skeleton className="h-7 w-16 rounded-lg" />
        </div>
      </header>
      <main className="container mx-auto max-w-3xl space-y-6 px-4 pb-12 pt-6 sm:px-6">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </main>
    </div>
  );
}

function InvalidOrderToken({ token }: { token: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-surface px-6 text-center">
      <div className="max-w-md">
        <Logo />
        <ShieldAlert className="mx-auto mt-8 h-10 w-10 text-amber-500" />
        <p className="mt-4 text-xl font-semibold tracking-tight text-ink">
          We couldn't find that order link
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          {token
            ? "The link may be old, mistyped, or never existed."
            : "No order token was provided."}{" "}
          Order links are private and only valid for the buyer they were sent to.
        </p>
        <Button
          asChild
          className="mt-5 bg-brand text-brand-foreground hover:bg-brand/90"
        >
          <Link to="/">Back home</Link>
        </Button>
        <p className="mt-4 text-[11px] text-ink-soft">
          Lost your order link? Check the email or SMS we sent you when you paid.
        </p>
      </div>
    </div>
  );
}

function ErrorScreen({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="grid min-h-screen place-items-center bg-surface px-6 text-center">
      <div className="max-w-md">
        <Logo />
        <XCircle className="mx-auto mt-8 h-10 w-10 text-rose-500" />
        <p className="mt-4 text-xl font-semibold tracking-tight text-ink">
          {title}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{description}</p>
        <Button
          onClick={() => window.location.reload()}
          className="mt-5 bg-brand text-brand-foreground hover:bg-brand/90"
        >
          Try again
        </Button>
      </div>
    </div>
  );
}

/* ----------------------- utilities ---------------------------------- */

function useTicker(fn: () => void, ms: number) {
  useEffect(() => {
    const id = setInterval(fn, ms);
    return () => clearInterval(id);
  }, [fn, ms]);
}
