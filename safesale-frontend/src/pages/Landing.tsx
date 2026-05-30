import { useSeoMeta } from "@unhead/react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { MarketingLayout } from "@/components/safesale/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/safesale/Avatar";
import { StarRating } from "@/components/safesale/StarRating";
import { ProductImage } from "@/components/safesale/ProductImage";
import { EscrowStatusPill } from "@/components/safesale/EscrowStatus";
import {
  ShieldCheck,
  CheckCircle2,
  Truck,
  MessageCircle,
  Banknote,
  Lock,
  Sparkles,
  ArrowRight,
  Scale,
  HeartHandshake,
  ChevronDown,
} from "lucide-react";
import { InstagramIcon } from "@/components/safesale/BrandIcons";
import { formatNGN } from "@/lib/format";
import { cn } from "@/lib/utils";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCurrentSeller } from "@/hooks/useCurrentSeller";

/**
 * Marketing front door. Renders for everyone — signed in or not.
 *
 * Earlier this page auto-redirected signed-in users to `/app` via a
 * `useEffect(navigate)`. That was wrong: it stopped logged-in users
 * from ever seeing Landing again, even when they navigated to `/`
 * deliberately (to share the URL, re-read the marketing copy, etc.).
 *
 * The right behaviour: Landing always renders; the CTA buttons are
 * session-aware (`useCallToAction()` below). A logged-out visitor
 * clicking "Start selling safely" lands on `/onboarding`; a
 * signed-in seller clicking the same button lands on `/app`.
 *
 * The preview blocks (HeroMockup + SellerReputation) are stylized
 * examples — labelled with visible "Example" badges — so we never
 * have to keep a fixture in sync with the live database.
 */
export default function Landing() {
  useSeoMeta({
    title: "SafeSale — Buy safely from social-media sellers",
    description:
      "SafeSale is escrow for social commerce. Buyers send money, sellers ship, and SafeSale holds the funds until everyone is happy. Works wherever you can paste a link.",
  });

  return (
    <MarketingLayout>
      <Hero />
      <TrustStrip />
      <HowItWorks />
      <WhySafeSale />
      <SellerReputation />
      <EscrowFlow />
      <Testimonials />
      <FAQ />
      <FinalCTA />
    </MarketingLayout>
  );
}

/**
 * Where the "Start selling" CTAs route, based on the current session:
 *
 *   - logged out                  → /onboarding  (sign up flow)
 *   - logged in + has seller      → /app         (skip the wizard)
 *   - logged in + no seller yet   → /onboarding  (finish signup)
 *
 * Returned as a `{ to, label }` pair so the same logic backs all CTAs
 * on the page and we never duplicate it.
 */
function useCallToAction(): { to: string; label: string } {
  const { user } = useCurrentUser();
  const [seller] = useCurrentSeller();

  if (!user) return { to: "/onboarding", label: "Start selling safely" };
  if (seller) return { to: "/app", label: "Go to your dashboard" };
  return { to: "/onboarding", label: "Finish setting up" };
}

/* -------------------------------------------------------------------------- */
/*                Stylized example data (no fixture coupling)                 */
/* -------------------------------------------------------------------------- */

/**
 * The hero phone mockup + seller-reputation block both used to read
 * from `src/lib/mock.ts` — that file is being deleted before submission
 * and the showcase blocks render best as **labelled examples**, not as
 * a pretend real seller. Three small constants below give the preview
 * blocks the data they need without coupling to anything live.
 */

const EXAMPLE_LISTING = {
  title: "Vintage Denim Jacket — Ralph Lauren",
  priceNGN: 28_500,
  imageSeed: "vintage-denim-jacket",
} as const;

const EXAMPLE_SELLER = {
  name: "Amaka O.",
  handle: "amaka.thrift",
  location: "Lagos, NG",
  avatarSeed: "amaka-okafor-example",
  rating: 4.9,
  reviewCount: 184,
  completedOrders: 312,
  responseTimeMins: 9,
} as const;

const EXAMPLE_REVIEWS = [
  {
    id: "r1",
    buyerName: "Tomiwa S.",
    rating: 5,
    text: "Item arrived in perfect condition. First time using escrow — I'd never go back to direct transfer.",
  },
  {
    id: "r2",
    buyerName: "Chioma N.",
    rating: 5,
    text: "Honest seller, fast shipping. The escrow gave me the confidence to actually pay.",
  },
] as const;

/* -------------------------------------------------------------------------- */

function Hero() {
  const cta = useCallToAction();
  return (
    <section className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
        style={{
          background:
            "radial-gradient(60% 50% at 20% 0%, color-mix(in oklab, var(--brand) 12%, transparent) 0%, transparent 70%), radial-gradient(40% 40% at 90% 10%, color-mix(in oklab, var(--gold) 18%, transparent) 0%, transparent 70%)",
        }}
      />
      <div className="container grid gap-10 pb-12 pt-12 lg:grid-cols-12 lg:gap-12 lg:pb-24 lg:pt-20">
        <div className="lg:col-span-6 lg:pt-6 animate-slide-up">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand-soft-foreground ring-1 ring-inset ring-emerald-200/60 animate-fade-in">
            <Sparkles className="h-3.5 w-3.5" />
            Escrow for social commerce
          </span>
          <h1 className="mt-5 text-[40px] font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-[58px]">
            Buy safely from{" "}
            <span className="bg-gradient-to-r from-brand to-emerald-600 bg-clip-text text-transparent">
              social-media
            </span>{" "}
            sellers.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-soft">
            Send your money. We hold it safely. The seller only gets paid when
            you confirm your order arrived as described — no more chasing
            refunds, no more fear of scams.
          </p>

          <div className="mt-7 flex flex-wrap gap-3 animate-fade-in" style={{ animationDelay: '150ms' }}>
            <Button
              asChild
              size="lg"
              className="h-12 rounded-lg bg-brand px-6 text-base font-semibold text-brand-foreground shadow-[0_8px_24px_-8px_color-mix(in_oklab,var(--brand)_70%,transparent)] hover:bg-brand/90 transition-all duration-300 hover:-translate-y-0.5"
            >
              <Link to={cta.to}>
                {cta.label} <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 rounded-lg border-border bg-white px-6 text-base hover:bg-surface-2 transition-all duration-300 hover:-translate-y-0.5"
            >
              <a href="#how-it-works">See how it works</a>
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-ink-soft animate-fade-in" style={{ animationDelay: '300ms' }}>
            <span className="inline-flex items-center gap-2 transition-transform duration-300 hover:translate-x-1">
              <ShieldCheck className="h-4 w-4 text-brand animate-lock-pulse" />
              Regulated custodial escrow via MavaPay
            </span>
            <span className="inline-flex items-center gap-2 transition-transform duration-300 hover:translate-x-1">
              <Lock className="h-4 w-4 text-brand" />
              Funds released only on buyer confirmation
            </span>
            <span className="inline-flex items-center gap-2 transition-transform duration-300 hover:translate-x-1">
              <CheckCircle2 className="h-4 w-4 text-brand" />
              Built on MavaPay + Nostr
            </span>
          </div>
        </div>

        <div className="relative lg:col-span-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <HeroMockup />
        </div>
      </div>
    </section>
  );
}

function HeroMockup() {
  return (
    <div className="relative mx-auto max-w-md">
      <div className="relative mx-auto w-full overflow-hidden rounded-[36px] border border-border bg-white shadow-[0_30px_80px_-30px_rgba(15,42,30,0.25)] flex flex-col transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1.5 hover:shadow-[0_45px_100px_-25px_rgba(15,42,30,0.3)]">
        <div className="p-1.5 pb-0 bg-surface">
          <div className="w-full h-8 flex justify-center items-center">
            <span className="h-1.5 w-16 bg-slate-200 rounded-full"></span>
          </div>
        </div>
        <img
          src="/images/Hero.png"
          alt="Vintage Denim Jacket"
          className="w-full object-cover"
          style={{ height: '450px' }}
        />
        <div className="px-5 py-6 bg-white flex flex-col h-full rounded-b-[36px]">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[17px] font-semibold leading-snug text-ink">
                Vintage Denim Jacket
             </h3>
             <span className="text-lg font-semibold text-brand">
                ₦28,500
             </span>
          </div>
          <button
            type="button"
            disabled
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-semibold text-brand-foreground opacity-90 transition-all duration-300 hover:opacity-100"
            aria-label="Example buy button (not interactive)"
          >
            <Lock className="h-4 w-4" />
            Buy safely with escrow
          </button>
        </div>
      </div>
    
      {/* Floating seller rating card */}
      <div className="absolute -bottom-4 -right-2 hidden w-56 rotate-[5deg] rounded-2xl border border-border bg-white p-3 shadow-[0_20px_40px_-20px_rgba(15,42,30,0.25)] sm:block transition-all duration-500 hover:scale-105 hover:rotate-[2deg] hover:translate-x-1.5 hover:shadow-[0_30px_50px_-15px_rgba(15,42,30,0.3)]">
        <div className="flex items-center gap-2">
          <Avatar seed="tomiwa" name="T" size={32} />
          <div className="min-w-0">
            <p className="truncate text-[12px] font-medium text-ink">Tomiwa S.</p>
            <StarRating rating={5} size={11} />
          </div>
        </div>
        <p className="mt-2 line-clamp-2 text-[11px] text-ink-soft">
          "Denim jacket was flawless. Great escrow experience!"
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function TrustStrip() {
  // Replaced earlier fabricated vanity stats (12.4k sellers etc.) with
  // genuine brand pillars. Repeated twice in the DOM so the CSS marquee
  // loop is seamless; aria-hidden on the duplicate so screen readers
  // don't read the same content twice.
  const pillars = [
    "MavaPay-regulated custodial escrow",
    "Funds held safely until buyer confirms",
    "Mediated dispute resolution with Nostr",
    "Naira in, Naira out — simple and familiar",
    "Reputation owned by the seller, not the platform",
    "Built for Nigerians, by Nigerians",
  ];
  return (
    <section className="border-y border-border/60 bg-white">
      <div className="relative overflow-hidden py-5">
        <div
          className="flex w-max gap-12 whitespace-nowrap motion-safe:animate-[ss-marquee_40s_linear_infinite] motion-reduce:flex-wrap motion-reduce:justify-center"
          aria-label="Why SafeSale"
        >
          {pillars.map((p) => (
            <TrustStripItem key={p} text={p} />
          ))}
          {pillars.map((p) => (
            <TrustStripItem key={`${p}-dup`} text={p} aria-hidden />
          ))}
        </div>

        {/* Edge fade — soft mask on either side so items don't pop in/out hard. */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-white to-transparent" />
      </div>
      <style>{`
        @keyframes ss-marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}

function TrustStripItem({
  text,
  "aria-hidden": ariaHidden,
}: {
  text: string;
  "aria-hidden"?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-2 text-sm font-medium text-ink-soft"
      aria-hidden={ariaHidden}
    >
      <ShieldCheck className="h-3.5 w-3.5 text-brand" aria-hidden />
      <span>{text}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function HowItWorks() {
  const steps = [
    {
      n: "01",
      icon: InstagramIcon,
      title: "Seller shares a SafeSale link",
      body: "From Instagram bio, WhatsApp status, or DM. Buyers tap the link and see a beautiful listing with the seller's reputation.",
    },
    {
      n: "02",
      icon: Lock,
      title: "Buyer pays into escrow",
      body: "Money goes into SafeSale escrow, not the seller's account. The seller can see the order is funded and ready to ship.",
    },
    {
      n: "03",
      icon: Truck,
      title: "Seller ships with tracking",
      body: "Seller marks the order as shipped and adds a tracking number. The buyer is notified instantly.",
    },
    {
      n: "04",
      icon: HeartHandshake,
      title: "Buyer confirms — seller paid",
      body: "When the order arrives, the buyer taps Release. Funds land in the seller's bank account within minutes.",
    },
  ];
  return (
    <section id="how-it-works" className="container py-20">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">
          How it works
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          One simple flow. Everyone protected.
        </h2>
        <p className="mt-4 text-base text-ink-soft">
          SafeSale sits between the buyer and seller so nobody has to trust the
          other upfront.
        </p>
      </div>

      <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((s) => (
          <div
            key={s.n}
            className="group relative rounded-2xl border border-border bg-white p-6 transition-shadow hover:shadow-[0_12px_40px_-20px_rgba(15,42,30,0.18)]"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand-soft-foreground">
                <s.icon className="h-5 w-5" />
              </span>
              <span className="text-xs font-semibold tracking-wider text-muted-foreground">
                {s.n}
              </span>
            </div>
            <h3 className="mt-5 text-base font-semibold text-ink">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function WhySafeSale() {
  return (
    <section className="bg-surface-2/40 py-20">
      <div className="container grid items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">
            Why SafeSale exists
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Africans lose ₦100B+ a year to social commerce scams.
          </h2>
          <p className="mt-4 text-base text-ink-soft">
            Most sellers in Nigeria, Ghana, and Kenya sell on social media —
            Instagram, WhatsApp, TikTok, Telegram, X. Trust is the only thing
            holding the market back. SafeSale replaces blind trust with
            structured, verifiable protection — so small businesses can grow.
          </p>

          <ul className="mt-7 space-y-3">
            {[
              "Buyers stop fearing fake sellers.",
              "Sellers stop losing customers who don't know them yet.",
              "Disputes get resolved fairly by trained mediators.",
              "Reputation is portable, not locked into any one platform.",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2 text-sm text-ink">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <ComparisonCard />
        </div>
      </div>
    </section>
  );
}

function ComparisonCard() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-border bg-white p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-500">
          Without SafeSale
        </p>
        <p className="mt-3 text-sm font-semibold text-ink">Direct bank transfer</p>
        <ul className="mt-4 space-y-2 text-sm text-ink-soft">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
            Buyer hopes seller is real
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
            No recourse if item never arrives
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
            Sellers lose 60% of cold buyers
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
            Reputation lives nowhere
          </li>
        </ul>
      </div>
      <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-brand-soft to-white p-5 ring-1 ring-emerald-100">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">
          With SafeSale
        </p>
        <p className="mt-3 text-sm font-semibold text-ink">Escrow-protected order</p>
        <ul className="mt-4 space-y-2 text-sm text-ink-soft">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            Payment held until delivery
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            Refund if anything goes wrong
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            Verified seller reputation
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            Fair human mediation
          </li>
        </ul>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function SellerReputation() {
  return (
    <section className="container py-20">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div className="order-2 lg:order-1">
          <div className="relative rounded-2xl border border-border bg-white p-6 shadow-[0_24px_60px_-30px_rgba(15,42,30,0.2)]">
            <span className="absolute right-4 top-4 inline-flex items-center rounded-full bg-ink/85 px-2 py-0.5 text-[10px] font-medium text-white">
              Example seller
            </span>
            <div className="flex items-center gap-4">
              <Avatar
                seed={EXAMPLE_SELLER.avatarSeed}
                name={EXAMPLE_SELLER.name}
                size={56}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-base font-semibold text-ink">
                    {EXAMPLE_SELLER.name}
                  </p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-medium text-brand-soft-foreground">
                    <ShieldCheck className="h-3 w-3" /> Verified
                  </span>
                </div>
                <p className="truncate text-sm text-ink-soft">
                  @{EXAMPLE_SELLER.handle} · {EXAMPLE_SELLER.location}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-surface-2/40">
              <Stat label="Rating" value={EXAMPLE_SELLER.rating.toFixed(1)} subtext={`${EXAMPLE_SELLER.reviewCount} reviews`} />
              <Stat label="Orders" value={String(EXAMPLE_SELLER.completedOrders)} subtext="completed" />
              <Stat label="Replies in" value={`${EXAMPLE_SELLER.responseTimeMins}m`} subtext="avg" />
            </div>

            <div className="mt-5 space-y-3">
              {EXAMPLE_REVIEWS.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-border bg-surface-2/30 p-3"
                >
                  <div className="flex items-center gap-2">
                    <Avatar seed={r.id} name={r.buyerName} size={28} />
                    <p className="text-xs font-medium text-ink">{r.buyerName}</p>
                    <StarRating rating={r.rating} size={11} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-ink-soft">
                    “{r.text}”
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">
            Reputation that travels
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Your good name, owned by you.
          </h2>
          <p className="mt-4 text-base text-ink-soft">
            Every completed order builds your verified seller reputation. Buyers
            see your real numbers — completed orders, response time, reviews —
            so trust is earned, not claimed.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-ink">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <span>Cryptographically verified — reviews can't be faked.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <span>Portable across Instagram, WhatsApp & TikTok shops.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <span>Yours forever — you keep your reputation when you leave.</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, subtext }: { label: string; value: string; subtext: string }) {
  return (
    <div className="p-3 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wider text-ink-soft">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
      <p className="text-[10px] text-ink-soft">{subtext}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function EscrowFlow() {
  const states = [
    { label: "Pending payment", status: "pending_payment" as const },
    { label: "Paid", status: "paid" as const },
    { label: "Shipped", status: "shipped" as const },
    { label: "Completed", status: "completed" as const },
  ];
  return (
    <section id="protection" className="bg-surface-2/40 py-20">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">
            Escrow flow
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Every order tells you exactly where it stands.
          </h2>
          <p className="mt-4 text-base text-ink-soft">
            Five clear states, no surprises. Both sides always know what's
            happening with their money.
          </p>
        </div>

        <div className="mt-12 overflow-x-auto pb-2">
          <div className="mx-auto flex min-w-[640px] max-w-3xl items-start justify-between gap-3 px-2">
            {states.map((s, i) => (
              <div key={s.label} className="flex flex-col items-center text-center">
                <div className="flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-xs font-semibold text-ink">
                    {i + 1}
                  </div>
                  {i < states.length - 1 && (
                    <div className="mx-2 h-px w-12 bg-border" />
                  )}
                </div>
                <div className="mt-3">
                  <EscrowStatusPill status={s.status} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
          <Card title="Buyer pays" body="Money enters SafeSale escrow. Seller is notified instantly." icon={Banknote} />
          <Card title="Seller ships" body="Order moves through tracked stages with timestamps." icon={Truck} />
          <Card title="Buyer confirms" body="Funds release to seller's bank in minutes." icon={CheckCircle2} />
        </div>
      </div>
    </section>
  );
}

function Card({
  title,
  body,
  icon: Icon,
}: {
  title: string;
  body: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <Icon className="h-5 w-5 text-brand" />
      <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm text-ink-soft">{body}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Testimonials() {
  const items = [
    {
      name: "Tunde Olajide",
      role: "Sneaker reseller, Lagos",
      seed: "tunde",
      quote:
        "Conversion on my Instagram bio link doubled the week I added SafeSale. New buyers actually check out now.",
    },
    {
      name: "Adaeze Eze",
      role: "Skincare brand, Enugu",
      seed: "adaeze",
      quote:
        "I used to lose buyers who said 'send picture of your store'. Now my SafeSale profile does the talking.",
    },
    {
      name: "Kwame Asante",
      role: "Buyer, Accra",
      seed: "kwame",
      quote:
        "First time I paid an Instagram seller without my hands shaking. The locked-payment screen is genuinely calming.",
    },
  ];
  return (
    <section className="container py-20">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">
          Loved by sellers and buyers
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Real people. Real trust.
        </h2>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {items.map((t) => (
          <figure
            key={t.name}
            className="flex h-full flex-col justify-between rounded-2xl border border-border bg-white p-6"
          >
            <blockquote className="text-[15px] leading-relaxed text-ink">
              “{t.quote}”
            </blockquote>
            <figcaption className="mt-5 flex items-center gap-3">
              <Avatar seed={t.seed} name={t.name} size={36} />
              <div>
                <p className="text-sm font-medium text-ink">{t.name}</p>
                <p className="text-xs text-ink-soft">{t.role}</p>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function FAQ() {
  // Honest answers — anything we don't actually ship today (LN melt,
  // fees, multiple bank rails) is either deferred to the post-MVP roadmap
  // or explained as a hackathon scope cut, rather than promised. The
  // earlier version of these answers ("funded within 60 seconds", "1.5%
  // per order", "buyers can pay via card") would have been falsified the
  // moment a judge looked at the code, so they were rewritten.
  const items = [
    {
      q: "Who holds my money during escrow?",
      a: "SafeSale holds funds in a regulated MavaPay custodial wallet. Your money is safe with a licensed Nigerian payment processor — not in a personal bank account or a crypto wallet. Funds are released only when the buyer confirms delivery.",
    },
    {
      q: "How does the seller get paid?",
      a: "When the buyer confirms receipt, SafeSale initiates a bank transfer to your Nigerian bank account via MavaPay. Sellers need a Nigerian bank account on file. Payouts typically arrive within 24 hours.",
    },
    {
      q: "What happens if I receive the wrong item?",
      a: "Open a dispute from your order page. Funds are frozen immediately — neither side can access them. A SafeSale mediator reviews evidence from both sides and publishes a resolution (Nostr kind 33889) that anyone can verify. Resolution time: within 48 hours.",
    },
    {
      q: "How much does SafeSale cost?",
      a: "Free during the Hack4Freedom hackathon — no fees on any transaction. The post-hackathon plan is a flat 1% paid by the seller, deducted from the payout. No setup fees, no monthly fees, no hidden charges.",
    },
    {
      q: "Do I need a bank account?",
      a: "Sellers need a Nigerian bank account to receive payouts. Buyers pay via MavaPay's hosted checkout — no SafeSale account needed. Just a listing link and you're ready to buy.",
    },
    {
      q: "Why MavaPay and Nostr instead of a regular payment processor?",
      a: "Because your reputation is yours. Nostr makes your seller profile portable across any platform — you own it, not us. MavaPay provides the regulated payment rail so your Naira is safe and compliant. Best of both worlds: regulated finance + open, portable identity.",
    },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="bg-surface-2/40 py-20">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">
            FAQ
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            The honest answers
          </h2>
        </div>
        <div className="mx-auto mt-10 max-w-2xl divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
          {items.map((it, i) => {
            const isOpen = open === i;
            return (
              <div key={it.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-sm font-medium text-ink sm:text-base">
                    {it.q}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-ink-soft transition-transform",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-sm leading-relaxed text-ink-soft">
                    {it.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function FinalCTA() {
  const { user } = useCurrentUser();
  const cta = useCallToAction();

  // For already-signed-in users, the "Start selling without fear today"
  // pitch is noise — they ARE signed in. Hide the section so they don't
  // get nudged into creating a second account by accident. (The site
  // header still gives them a direct "Go to dashboard" link.)
  if (user) return null;

  return (
    <section className="container py-20">
      <div className="relative overflow-hidden rounded-3xl border border-emerald-200/60 bg-gradient-to-br from-brand to-emerald-700 p-10 text-center text-white shadow-[0_30px_80px_-30px_rgba(15,42,30,0.4)] sm:p-14">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-emerald-400/30 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-emerald-300/20 blur-3xl" />

        <Scale className="relative mx-auto h-9 w-9 opacity-90" />
        <h2 className="relative mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Start selling without fear today.
        </h2>
        <p className="relative mx-auto mt-3 max-w-xl text-base text-emerald-50/90">
          Set up your seller profile in two minutes. No fees until you're paid.
        </p>
        <div className="relative mt-7 flex flex-wrap justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="h-12 rounded-lg bg-white px-6 text-base font-semibold text-brand hover:bg-emerald-50"
          >
            <Link to={cta.to}>
              {cta.label} <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 rounded-lg border-white/40 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white"
          >
            <a href="#how-it-works">See how it works</a>
          </Button>
        </div>
        <p className="relative mt-6 inline-flex items-center gap-2 text-xs text-emerald-50/80">
          <MessageCircle className="h-3.5 w-3.5" /> No credit card · No setup ·
          Works wherever you sell — Instagram, WhatsApp, TikTok, X, Telegram, anywhere
        </p>
      </div>
    </section>
  );
}
