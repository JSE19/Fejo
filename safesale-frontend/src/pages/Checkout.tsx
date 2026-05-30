import { useSeoMeta } from "@unhead/react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Logo } from "@/components/safesale/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/safesale/Avatar";
import { useListing } from "@/hooks/useListing";
import { useAuthor } from "@/hooks/useAuthor";
import { getSeller as getFixtureSeller } from "@/lib/mock";
import { apiClient, ApiError, type ApiOrder } from "@/lib/api";
import { formatNGN } from "@/lib/format";
import { genUserName } from "@/lib/genUserName";
import { useToast } from "@/hooks/useToast";
import { generateBuyerKey, persistBuyerKey } from "@/lib/buyerKey";
import type { PayInDetails } from "@/lib/api/types";
import {
  ShieldCheck,
  ChevronLeft,
  Copy,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Lock,
  ImageDown,
  Link2 as LinkIcon,
  MapPin,
  Phone,
  Bookmark,
  Truck,
  ExternalLink,
  Banknote,
  Clock,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NIGERIAN_STATES } from "@/lib/nigeria";
import { cn, sanitizeUrl } from "@/lib/utils";

type Step = "details" | "paying" | "done";

export default function Checkout() {
  const { id = "" } = useParams<{ id: string }>();
  const { data: listing, isLoading: listingLoading } = useListing(id);
  const sellerPubkey = listing?.sellerPubkey;
  const author = useAuthor(sellerPubkey);
  const fixtureSeller = sellerPubkey ? getFixtureSeller(sellerPubkey) : undefined;
  const sellerName =
    author.data?.metadata?.name ??
    fixtureSeller?.name ??
    (sellerPubkey ? genUserName(sellerPubkey) : "Seller");
  const sellerAvatarSeed = fixtureSeller?.avatarSeed ?? sellerPubkey ?? "seller";
  const sellerRating = fixtureSeller?.rating;
  const sellerReviews = fixtureSeller?.reviews;
  const sellerVerified = fixtureSeller?.verified ?? false;

  const navigate = useNavigate();
  const { toast } = useToast();

  useSeoMeta({
    title: listing ? `Checkout — ${listing.title}` : "Checkout — SafeSale",
  });

  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contactMethod, setContactMethod] = useState<"email" | "phone">("email");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");

  const [createdOrder, setCreatedOrder] = useState<{
    orderToken: string;
    shortId: string;
    amountNGN: number;
    payIn: PayInDetails | null;
  } | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const { data: liveOrder } = useQuery<ApiOrder | null>({
    queryKey: ["safesale", "order-status", createdOrder?.orderToken ?? ""],
    enabled: !!createdOrder?.orderToken,
    queryFn: async () => {
      if (!createdOrder) return null;
      try {
        const env = await apiClient.getOrder(createdOrder.orderToken);
        return env.order;
      } catch (err) {
        if (err instanceof ApiError && err.code === "ORDER_NOT_FOUND") {
          return null;
        }
        throw err;
      }
    },
    refetchInterval: (q) => {
      const data = q.state.data;
      if (!data) return 2000;
      return data.status === "pending_payment" ? 2000 : false;
    },
  });

  const prevStatusRef = useRef<ApiOrder["status"] | undefined>(undefined);
  useEffect(() => {
    const status = liveOrder?.status;
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;
    if (!createdOrder) return;
    if (status === prev) return;
    if (status === "paid" && step === "paying") {
      setStep("done");
    }
  }, [liveOrder?.status, createdOrder, step]);

  const contactValid =
    contactMethod === "email"
      ? /.+@.+\..+/.test(email)
      : phone.trim().length >= 10;

  const valid =
    name.trim().length > 1 &&
    contactValid &&
    address.trim().length > 4 &&
    city.trim().length > 1;

  if (listingLoading) {
    return <CheckoutSkeleton />;
  }

  if (!listing) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface text-center">
        <div>
          <p className="text-lg font-semibold text-ink">Listing not found</p>
          <p className="mt-1 text-sm text-ink-soft">
            The link may be old, mistyped, or never existed.
          </p>
          <Button asChild className="mt-4 bg-brand text-brand-foreground hover:bg-brand/90">
            <Link to="/">Back home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleCreateOrder = async () => {
    if (creating || createdOrder) return;
    setCreating(true);
    setCreateError(null);
    try {
      const tentativeKey = generateBuyerKey("__pending__");
      const res = await apiClient.createOrder({
        listingId: listing.id,
        buyerNpub: tentativeKey.npub,
        buyerName: name.trim(),
        buyerPhone: phone.trim(),
        buyerEmail: email.trim() || undefined,
        buyerCity: city.trim(),
        buyerAddress: address.trim() || undefined,
        contactMethod,
        variant: listing.tags?.[0],
        _listingHint: {
          id: listing.id,
          sellerId: listing.sellerPubkey,
          title: listing.title,
          description: listing.description,
          priceNGN: listing.priceNGN,
          images: listing.images.map((url) => ({ url })),
          category: listing.category ?? "general",
          variants: listing.tags ?? null,
          inStock: listing.inStock,
          delivery: listing.delivery ?? null,
          seller: {
            name: sellerName,
            handle: fixtureSeller?.handle,
            location: fixtureSeller?.location,
            verified: sellerVerified,
          },
        },
      });

      persistBuyerKey(res.orderToken, {
        nsec: tentativeKey.nsec,
        npub: tentativeKey.npub,
      });
      try {
        localStorage.removeItem("safesale:buyer:__pending__");
      } catch {
      }

      setCreatedOrder({
        orderToken: res.orderToken,
        shortId: res.shortId,
        amountNGN: res.amountNGN,
        payIn: res.payIn,
      });

      setStep("paying");
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Couldn't create your order. Try again.";
      setCreateError(msg);
      toast({
        title: "Couldn't create your order",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const heroImage = sanitizeUrl(listing.images[0]);

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <Link
            to={`/buy/${listing.id}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-ink-soft hover:text-ink"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back
          </Link>
          <Logo />
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-soft-foreground">
            <ShieldCheck className="h-3 w-3" />
            Secure
          </span>
        </div>
      </header>

      <main className="container max-w-2xl pb-12 pt-6">
        <StepBar step={step} />

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr,320px]">
          <div className="space-y-5">
            {step === "details" && (
              <DetailsForm
                name={name}
                setName={setName}
                phone={phone}
                setPhone={setPhone}
                email={email}
                setEmail={setEmail}
                contactMethod={contactMethod}
                setContactMethod={setContactMethod}
                city={city}
                setCity={setCity}
                address={address}
                setAddress={setAddress}
                onSubmit={() => valid && setStep("paying")}
                valid={valid}
              />
            )}
            {step === "paying" && createdOrder && (
              <Paying
                amount={createdOrder.amountNGN}
                payIn={createdOrder.payIn}
                orderToken={createdOrder.orderToken}
                creating={creating}
                createError={createError}
              />
            )}
            {step === "paying" && !createdOrder && (
              <PayingSkeleton creating={creating} createError={createError} onCreate={handleCreateOrder} />
            )}
            {step === "done" && createdOrder && (
              <Done
                amount={createdOrder.amountNGN}
                orderToken={createdOrder.orderToken}
                contactMethod={contactMethod}
                contactValue={contactMethod === "email" ? email : phone}
                onContinue={() => navigate(`/order/${createdOrder.orderToken}`)}
              />
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-20 lg:h-min">
            <div className="overflow-hidden rounded-2xl border border-border bg-background p-4">
              <div className="flex items-start gap-3">
                {heroImage ? (
                  <img
                    src={heroImage}
                    alt=""
                    loading="lazy"
                    className="h-16 w-16 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div
                    aria-hidden
                    className="h-16 w-16 shrink-0 rounded-xl bg-secondary"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold text-ink">
                    {listing.title}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-ink">
                    {formatNGN(listing.priceNGN)}
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                <Row k="Item" v={formatNGN(listing.priceNGN)} />
                <Row k="Buyer protection" v="Free" />
                <Row k="Delivery" v="Pay seller on agreement" sub />
              </div>
              <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
                <span className="text-xs font-medium uppercase tracking-wider text-ink-soft">
                  Total
                </span>
                <span className="text-lg font-semibold tabular-nums text-ink">
                  {formatNGN(listing.priceNGN)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3">
              <Avatar seed={sellerAvatarSeed} name={sellerName} size={32} />
              <div className="min-w-0 flex-1 text-xs">
                <p className="truncate font-medium text-ink">{sellerName}</p>
                {sellerRating !== undefined && (
                  <p className="truncate text-ink-soft">
                    {sellerRating.toFixed(1)} ★
                    {sellerReviews !== undefined && (
                      <> · {sellerReviews} reviews</>
                    )}
                  </p>
                )}
              </div>
              {sellerVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-medium text-brand-soft-foreground">
                  <ShieldCheck className="h-3 w-3" /> Verified
                </span>
              )}
            </div>

            <Footnote />
          </aside>
        </div>
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function StepBar({ step }: { step: Step }) {
  const order: Step[] = ["details", "paying", "done"];
  const ix = order.indexOf(step);
  const labels = [
    { key: "details", label: "Details" },
    { key: "paying", label: "Pay" },
    { key: "done", label: "Done" },
  ];
  return (
    <div className="flex items-center gap-3">
      {labels.map((l, i) => {
        const active = ix >= i;
        return (
          <div key={l.key} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold",
                active
                  ? "bg-brand text-brand-foreground"
                  : "bg-secondary text-ink-soft"
              )}
            >
              {i + 1}
            </span>
            <span
              className={cn(
                "text-xs font-medium",
                active ? "text-ink" : "text-ink-soft"
              )}
            >
              {l.label}
            </span>
            {i < labels.length - 1 && (
              <span
                className={cn(
                  "ml-1 h-px flex-1",
                  ix > i ? "bg-brand/40" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function DetailsForm(props: {
  name: string;
  setName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  contactMethod: "email" | "phone";
  setContactMethod: (m: "email" | "phone") => void;
  city: string;
  setCity: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  valid: boolean;
  onSubmit: () => void;
}) {
  return (
    <Card title="Delivery details" subtitle="Where should the seller send your order?">
      <div className="space-y-4">
        <Field
          label="Full name"
          value={props.name}
          onChange={props.setName}
          placeholder="Jane Adekola"
        />

        <div>
          <Label>How should we send your order link?</Label>
          <p className="mt-1 text-xs text-ink-soft">
            Your order link is your only way back to this order. We'll send it
            here so you can return any time.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["email", "phone"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => props.setContactMethod(m)}
                className={cn(
                  "rounded-md border px-3 py-2.5 text-sm font-medium transition-colors",
                  props.contactMethod === m
                    ? "border-brand bg-brand-soft text-brand-soft-foreground"
                    : "border-border bg-white text-ink-soft hover:text-ink"
                )}
              >
                {m === "email" ? "Email" : "SMS to phone"}
              </button>
            ))}
          </div>
          <div className="mt-3">
            {props.contactMethod === "email" ? (
              <Field
                label="Email address"
                value={props.email}
                onChange={props.setEmail}
                placeholder="jane@example.com"
                type="email"
              />
            ) : (
              <Field
                label="WhatsApp number"
                value={props.phone}
                onChange={props.setPhone}
                placeholder="0803 555 0142"
                type="tel"
              />
            )}
          </div>
        </div>

        {props.contactMethod === "email" ? (
          <Field
            label="WhatsApp number (for delivery updates)"
            value={props.phone}
            onChange={props.setPhone}
            placeholder="0803 555 0142"
            type="tel"
          />
        ) : (
          <Field
            label="Email (optional, for backup)"
            value={props.email}
            onChange={props.setEmail}
            placeholder="jane@example.com"
            type="email"
          />
        )}

        <div className="grid gap-4 sm:grid-cols-[1fr,1.5fr]">
          <div className="space-y-1.5">
            <Label htmlFor="checkout-city" className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" /> City (State)
            </Label>
            <Select value={props.city} onValueChange={props.setCity}>
              <SelectTrigger id="checkout-city" className="h-11">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {NIGERIAN_STATES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Field
            label="Delivery address"
            value={props.address}
            onChange={props.setAddress}
            placeholder="House / street / area"
          />
        </div>

        <div className="rounded-lg border border-amber-200/60 bg-amber-50/50 p-3">
          <p className="flex items-center gap-2 text-[11px] font-medium text-amber-800">
            <Phone className="h-3.5 w-3.5" />
            WhatsApp number is mandatory for delivery updates.
          </p>
        </div>
      </div>

      <Button
        size="lg"
        disabled={!props.valid}
        onClick={props.onSubmit}
        className="mt-6 h-12 w-full rounded-lg bg-brand text-base font-semibold text-brand-foreground hover:bg-brand/90"
      >
        Continue to payment <ArrowRight className="ml-1 h-4 w-4" />
      </Button>
    </Card>
  );
}

function PayingSkeleton({
  creating,
  createError,
  onCreate,
}: {
  creating: boolean;
  createError: string | null;
  onCreate: () => void;
}) {
  return (
    <Card
      title="Pay via bank transfer"
      subtitle="Funds are held in escrow — seller can't touch them until you confirm delivery."
    >
      <div className="mt-1 rounded-xl border border-border bg-surface p-4 text-sm text-ink-soft">
        Your money is held in escrow — the seller cannot touch it until
        you confirm delivery.
      </div>
      {createError && (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {createError}
        </div>
      )}
      <Button
        size="lg"
        onClick={onCreate}
        disabled={creating}
        className="mt-5 h-12 w-full rounded-lg bg-brand text-base font-semibold text-brand-foreground hover:bg-brand/90 disabled:opacity-60"
      >
        {creating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating your order…
          </>
        ) : (
          <>
            <ExternalLink className="mr-2 h-4 w-4" />
            Continue to payment
          </>
        )}
      </Button>
    </Card>
  );
}

function Paying({
  amount,
  payIn,
  orderToken,
  creating,
  createError,
}: {
  amount: number;
  payIn: PayInDetails | null;
  orderToken: string;
  creating: boolean;
  createError: string | null;
}) {
  const { toast } = useToast();
  const [simulating, setSimulating] = useState(false);

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      await fetch("/api/dev/simulate-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderToken }),
      });
      toast({ title: "Payment simulated" });
    } catch {
      toast({ title: "Simulation failed", variant: "destructive" });
    } finally {
      setSimulating(false);
    }
  };

  const expiresAt = payIn?.expiresAt ? new Date(payIn.expiresAt) : null;
  const expired = expiresAt && expiresAt < new Date();

  return (
    <Card
      title="Transfer to this bank account"
      subtitle="Make a transfer to the account below to secure your order in escrow."
    >
      {payIn && !expired ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-ink-soft">Bank</p>
                <p className="mt-0.5 text-base font-semibold text-ink">{payIn.bankName}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-ink-soft">Account Number</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <p className="text-lg font-bold tabular-nums text-ink select-all">{payIn.bankAccountNumber}</p>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(payIn.bankAccountNumber);
                      toast({ title: "Account number copied" });
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-ink-soft hover:text-ink transition-colors"
                  >
                    <Copy className="h-3 w-3" /> Copy
                  </button>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-ink-soft">Account Name</p>
                <p className="mt-0.5 text-base font-semibold text-ink">{payIn.bankAccountName}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-ink-soft">Amount to pay</p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-ink">
                  {formatNGN(payIn.totalAmountKobo / 100)}
                </p>
              </div>
            </div>
          </div>

          {expiresAt && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200/60 bg-amber-50/50 p-3 text-xs text-amber-800">
              <Clock className="h-4 w-4 shrink-0" />
              <span>Quote expires at {expiresAt.toLocaleTimeString()}. Transfer before it expires to lock in the rate.</span>
            </div>
          )}
        </div>
      ) : expired ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center text-sm text-rose-800">
          <p className="font-semibold">Payment quote expired</p>
          <p className="mt-1">Please create a new order to get fresh payment details.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-white px-6 py-10 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
          <p className="mt-4 text-sm font-medium text-ink">
            Creating your order…
          </p>
        </div>
      )}

      {createError && (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {createError}
        </div>
      )}

      <div className="mt-5 rounded-xl border border-emerald-200/60 bg-brand-soft/50 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
          <div className="text-xs leading-relaxed text-ink-soft">
            <p className="text-sm font-medium text-ink">
              This is a SafeSale escrow payment
            </p>
            <p className="mt-1">
              The seller cannot access your money. It's released only when you
              confirm delivery — or refunded if anything goes wrong.
            </p>
          </div>
        </div>
      </div>

      <p className="mt-2 text-[11px] italic text-ink-soft">
        Powered by MavaPay — payment in escrow.
      </p>

      {import.meta.env.DEV && payIn && !expired && (
        <div className="mt-4 rounded-lg border border-dashed border-amber-300 bg-amber-50/50 p-3">
          <p className="mb-2 text-xs font-medium text-amber-800">
            Dev: Simulate payment
          </p>
          <button
            onClick={handleSimulate}
            disabled={simulating}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-amber-300 px-3 text-xs font-medium text-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-50"
          >
            {simulating ? "Simulating…" : "Mark as paid (demo)"}
          </button>
        </div>
      )}
    </Card>
  );
}

function Done({
  amount,
  orderToken,
  contactMethod,
  contactValue,
  onContinue,
}: {
  amount: number;
  orderToken: string;
  contactMethod: "email" | "phone";
  contactValue: string;
  onContinue: () => void;
}) {
  const { toast } = useToast();
  const orderLink = `${window.location.origin}/order/${orderToken}`;
  return (
    <div className="space-y-4 animate-slide-up">
      <div className="rounded-2xl border border-emerald-200/60 bg-white p-6 shadow-[0_24px_60px_-30px_rgba(15,42,30,0.15)]">
        <div className="flex flex-col items-center text-center">
          <CheckCircle2 className="h-12 w-12 text-brand" />
          <p className="mt-3 text-lg font-semibold text-ink">
            {formatNGN(amount)} secured in escrow
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Your seller has been notified and is preparing your order.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200/70 bg-amber-50/60 p-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <Bookmark className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">
              Save your order link now
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">
              This is your only way back to this order — you don't have an
              account. <span className="font-medium text-ink">Bookmark it, screenshot it, or copy it to your{" "}
              {contactMethod === "email" ? "email drafts" : "WhatsApp chat"}</span>
              {contactValue && (
                <> ({contactValue})</>
              )}{" "}
              before leaving this page.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center rounded-lg border border-amber-200 bg-white overflow-hidden">
          <div className="flex flex-1 items-center gap-2 px-3 py-2.5 font-mono text-xs text-ink min-w-0 break-all">
            <LinkIcon className="h-3.5 w-3.5 shrink-0 text-ink-soft" />
            <span className="break-all select-all">{orderLink}</span>
          </div>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(orderLink);
              toast({ title: "Order link copied" });
            }}
            className="inline-flex items-center justify-center gap-1 border-t sm:border-t-0 sm:border-l border-amber-200 px-4 py-2.5 sm:py-0 text-xs font-semibold text-amber-800 hover:bg-amber-100/60 transition-colors bg-amber-50/40 sm:bg-transparent shrink-0"
          >
            <Copy className="h-3.5 w-3.5" /> Copy Link
          </button>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <SaveAction icon={Copy} label="Copy the link" />
          <SaveAction icon={Bookmark} label="Bookmark this page" />
          <SaveAction icon={ImageDown} label="Screenshot it" />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white p-5">
        <p className="text-sm font-semibold text-ink">What happens next?</p>
        <ol className="mt-3 space-y-2 text-sm text-ink-soft">
          <li className="flex items-start gap-2">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            <span>Money is held safely — seller can't touch it yet.</span>
          </li>
          <li className="flex items-start gap-2">
            <Truck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            <span>Seller ships your order with a tracking number.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            <span>You confirm delivery — seller gets paid in seconds.</span>
          </li>
        </ol>
      </div>

      <Button
        onClick={onContinue}
        size="lg"
        className="h-12 w-full rounded-lg bg-brand text-base font-semibold text-brand-foreground hover:bg-brand/90"
      >
        Open my order page <ArrowRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );
}

function SaveAction({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-amber-200 bg-white px-2 py-2 text-center">
      <Icon className="h-4 w-4 text-amber-700" />
      <span className="text-[10px] font-medium text-ink">{label}</span>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-[0_8px_24px_-16px_rgba(15,42,30,0.12)] animate-slide-up">
      <h2 className="text-base font-semibold tracking-tight text-ink sm:text-lg">
        {title}
      </h2>
      {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        className="mt-1.5 h-11"
      />
    </div>
  );
}

function Row({ k, v, sub }: { k: string; v: string; sub?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-3",
        sub && "text-xs text-ink-soft"
      )}
    >
      <span className={sub ? "text-xs text-ink-soft" : "text-sm text-ink-soft"}>{k}</span>
      <span className={cn("tabular-nums", sub ? "text-xs text-ink-soft" : "text-sm font-medium text-ink")}>
        {v}
      </span>
    </div>
  );
}

function Footnote() {
  return (
    <p className="px-1 text-[11px] leading-relaxed text-ink-soft">
      Need help? Message{" "}
      <a href="#" className="text-brand hover:underline">
        SafeSale support
      </a>{" "}
      any time. Our team responds within minutes.
    </p>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <Skeleton className="h-4 w-12" />
          <Logo />
          <Skeleton className="h-4 w-14" />
        </div>
      </header>
      <main className="container max-w-2xl pb-12 pt-6">
        <Skeleton className="h-6 w-1/2" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr,320px]">
          <div className="space-y-5">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
          <aside className="space-y-4">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </aside>
        </div>
      </main>
    </div>
  );
}
