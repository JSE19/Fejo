import { useSeoMeta } from "@unhead/react";
import { Link } from "react-router-dom";
import { MarketingLayout } from "@/components/safesale/MarketingLayout";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Banknote,
  Star,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { InstagramIcon } from "@/components/safesale/BrandIcons";

export default function ForSellers() {
  useSeoMeta({
    title: "For sellers — SafeSale",
    description:
      "Convert more social-media buyers. Build verified reputation. Get paid faster.",
  });
  return (
    <MarketingLayout>
      <section className="container max-w-4xl py-16 sm:py-24">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">
          For sellers
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Sell to anyone — including buyers who've never heard of you.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-soft">
          SafeSale removes the trust barrier that makes most social-media
          shoppers walk away. Your business stops depending on people who
          already know you.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <Stat label="More checkouts" value="+62%" sub="vs DM-only flow" />
          <Stat label="Cart-to-pay time" value="<2m" sub="median checkout" />
          <Stat label="Sellers' trust badge" value="Verified" sub="from order 1" />
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          <Card icon={InstagramIcon} title="One link, every platform" body="Replace your linktree. Works in Instagram bio, WhatsApp status, TikTok, X, and SMS." />
          <Card icon={Banknote} title="Get paid faster" body="Confirmed deliveries release to your bank within 60 seconds. No more 3-day settlement holds." />
          <Card icon={Star} title="Build real reputation" body="Every verified review compounds. Top sellers see 4× more new buyers." />
          <Card icon={TrendingUp} title="Insights you can act on" body="See which listings convert, where you lose buyers, and what to ship next." />
        </div>

        <div className="mt-12 rounded-3xl border border-emerald-200/60 bg-gradient-to-br from-brand to-emerald-700 p-8 text-white sm:p-12">
          <ShieldCheck className="h-8 w-8" />
          <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
            We only succeed when you do.
          </h2>
          <p className="mt-2 max-w-xl text-base text-emerald-50/90">
            1.5% per completed order — no setup, no monthly fees, no payout
            fees. Free to try, free to use until you make your first sale.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-6 h-12 rounded-lg bg-white text-base font-semibold text-brand hover:bg-emerald-50"
          >
            <Link to="/onboarding">
              Start selling with SafeSale <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}

function Card({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand-soft-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm text-ink-soft">{body}</p>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-ink-soft">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">
        {value}
      </p>
      <p className="mt-1 text-xs text-ink-soft">{sub}</p>
    </div>
  );
}
