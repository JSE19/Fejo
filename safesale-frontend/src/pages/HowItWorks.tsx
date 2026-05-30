import { useSeoMeta } from "@unhead/react";
import { Link } from "react-router-dom";
import { MarketingLayout } from "@/components/safesale/MarketingLayout";
import { Button } from "@/components/ui/button";
import { EscrowStatusPill } from "@/components/safesale/EscrowStatus";
import { Timeline } from "@/components/safesale/Timeline";
import {
  ShieldCheck,
  Lock,
  Truck,
  CheckCircle2,
  Scale,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function HowItWorks() {
  useSeoMeta({
    title: "How SafeSale works",
    description:
      "How SafeSale escrow protects buyers and sellers, end to end.",
  });
  return (
    <MarketingLayout>
      <section className="container max-w-3xl py-16 sm:py-24">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">
          How it works
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          The mechanics of trust.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-soft">
          SafeSale holds money safely between the moment a buyer pays and the
          moment they confirm their order arrived. Everything else flows from
          that one idea.
        </p>

        <div id="protection" className="mt-12 grid gap-4 sm:grid-cols-2">
          {[
            { i: Lock, t: "Funds are sealed", b: "The seller never touches your money. SafeSale holds it until release conditions are met." },
            { i: Truck, t: "Tracked shipment", b: "Sellers add real tracking numbers. Buyers see live updates from major carriers." },
            { i: CheckCircle2, t: "Confirm to release", b: "One tap releases the seller's payment. Auto-releases after 7 days of confirmed delivery." },
            { i: Scale, t: "Fair mediation", b: "If something goes wrong, trained mediators review evidence and decide within 24 hours." },
          ].map((p) => (
            <div key={p.t} className="rounded-2xl border border-border bg-white p-5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand-soft-foreground">
                <p.i className="h-5 w-5" />
              </span>
              <p className="mt-4 text-sm font-semibold text-ink">{p.t}</p>
              <p className="mt-1 text-sm text-ink-soft">{p.b}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="dispute" className="bg-surface-2/40 py-16">
        <div className="container max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            What happens during a dispute?
          </h2>
          <p className="mt-3 max-w-xl text-base text-ink-soft">
            About 1 in 60 orders enters a dispute. Most are resolved with a
            quick chat. The rest go through a structured, calm process.
          </p>

          <div className="mt-8 rounded-2xl border border-border bg-white p-6">
            <Timeline
              steps={[
                {
                  key: "open",
                  title: "Either side opens the dispute",
                  description:
                    "Funds freeze. A SafeSale mediator joins the chat.",
                  state: "done",
                },
                {
                  key: "evidence",
                  title: "Both sides share evidence",
                  description:
                    "Photos, screenshots, tracking proof — usually within 24 hours.",
                  state: "done",
                },
                {
                  key: "review",
                  title: "Mediator reviews privately",
                  description: "Checks logs, photos, chat tone, history.",
                  state: "active",
                },
                {
                  key: "decision",
                  title: "Decision and release",
                  description: "Funds release accordingly: full, refund or split.",
                  state: "pending",
                },
              ]}
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-ink-soft">
            <span className="text-xs font-medium uppercase tracking-wider text-ink-soft">
              Possible outcomes
            </span>
            <EscrowStatusPill status="completed" size="sm" />
            <EscrowStatusPill status="refunded" size="sm" />
            <EscrowStatusPill status="disputed" size="sm" />
          </div>
        </div>
      </section>

      <section id="fees" className="container max-w-3xl py-16">
        <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Fees
        </h2>
        <p className="mt-3 text-base text-ink-soft">
          We only get paid when sellers get paid.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <FeeCard label="Per-order fee" value="1.5%" sub="paid by the seller" highlight />
          <FeeCard label="Setup fee" value="₦0" sub="no onboarding cost" />
          <FeeCard label="Withdrawal fee" value="₦0" sub="bank payouts are free" />
        </div>
      </section>

      <section className="container max-w-3xl pb-20">
        <div className="rounded-3xl border border-emerald-200/60 bg-gradient-to-br from-brand to-emerald-700 p-10 text-center text-white">
          <Sparkles className="mx-auto h-8 w-8" />
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">
            Ready to sell with trust?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-base text-emerald-50/90">
            Two minutes to set up. Free until you're paid.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-6 h-12 rounded-lg bg-white px-6 text-base font-semibold text-brand hover:bg-emerald-50"
          >
            <Link to="/onboarding">
              Get started <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}

function FeeCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "rounded-2xl border bg-white p-5 " +
        (highlight ? "border-emerald-200/70 bg-brand-soft/50" : "border-border")
      }
    >
      <p className="text-xs font-medium uppercase tracking-wider text-ink-soft">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">
        {value}
      </p>
      <p className="mt-1 text-xs text-ink-soft">{sub}</p>
      {highlight && (
        <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-medium text-brand-soft-foreground">
          <ShieldCheck className="h-3 w-3" /> Includes mediation & protection
        </span>
      )}
    </div>
  );
}
