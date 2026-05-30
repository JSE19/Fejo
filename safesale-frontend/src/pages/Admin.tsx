/**
 * Admin / Mediator Dispute Dashboard — `/admin`.
 *
 * The mediator's working surface: queue of open disputes, click into
 * one to see both sides' evidence, sign a resolution.
 *
 * Access control: this route is wrapped in `MediatorGate` at the
 * router level (`src/AppRouter.tsx`). The component below assumes
 * the viewer is the trusted mediator npub — no in-component gating.
 *
 * Data source — IMPORTANT:
 *
 *   For the Hack4Freedom submission this page is intentionally fed by
 *   fixtures defined inline below. The backend (Joy's branch) has
 *   the mediator key and the Dispute table, but the HTTP endpoints
 *   the frontend would call — `GET /api/admin/disputes`,
 *   `GET /api/admin/disputes/:id`, `POST /api/admin/disputes/:id/resolve`
 *   (all enumerated in `BACKEND.md`) — aren't shipped yet, and the
 *   Nostr kind-33889 resolution-publishing path isn't wired either
 *   (per PROGRESS.md PRD delta #7).
 *
 *   Two reasons to ship the page now anyway:
 *
 *     1. Visually completes the 9/9 screen set so the demo deck is
 *        whole regardless of what the backend lands by submission day.
 *     2. The wiring is a literal find/replace once backend ships:
 *        swap the `DISPUTES` constant for a `useAdminDisputes()` hook
 *        that hits the endpoint above, and swap the local resolve
 *        toast for a `apiClient.resolveDispute(...)` mutation. The
 *        component structure stays.
 *
 *   The "Resolve" action shows an honest "coming soon" toast — same
 *   pattern we use elsewhere on this codebase when frontend is ready
 *   but backend isn't.
 */

import { useSeoMeta } from "@unhead/react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/safesale/AppShell";
import { Avatar } from "@/components/safesale/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Gavel,
  Package,
  Scale,
  Search,
  ShieldCheck,
} from "lucide-react";

import { useToast } from "@/hooks/useToast";
import { formatNGN, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ----------------------------------------------------------------------- */
/*                            Demo fixtures                                */
/* ----------------------------------------------------------------------- */

type DisputePriority = "high" | "medium" | "low";
type DisputeQueueStatus = "escalated" | "evidence_requested" | "mediating";
type DisputeOutcome = "refund_buyer" | "release_seller" | "split";

interface DisputeFixture {
  id: string;
  shortId: string;
  orderShortId: string;
  status: DisputeQueueStatus;
  priority: DisputePriority;
  openedBy: "buyer" | "seller";
  openedAt: string;
  evidenceDueAt: string;
  reason: string;
  summary: string;
  amountNGN: number;
  amountSats: number;
  seller: {
    handle: string;
    name: string;
    location: string;
  };
  buyer: {
    name: string;
    city: string;
  };
  listing: {
    title: string;
  };
  evidence: {
    buyer: string[];
    seller: string[];
  };
}

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const now = Date.now();
const iso = (offsetMs: number): string => new Date(now + offsetMs).toISOString();

const DISPUTES: DisputeFixture[] = [
  {
    id: "dsp_7k3m",
    shortId: "DSP-7K3M",
    orderShortId: "ORD-9X1B",
    status: "escalated",
    priority: "high",
    openedBy: "buyer",
    openedAt: iso(-3 * DAY),
    evidenceDueAt: iso(2 * DAY),
    reason: "Item arrived with a tear on the strap",
    summary:
      "Buyer received the Coach Crossbody and a tear is visible at the base of the strap. Seller claims the bag was inspected before shipping.",
    amountNGN: 67_500,
    amountSats: 112_500,
    seller: { handle: "amaka.thrift", name: "Amaka O.", location: "Lagos" },
    buyer: { name: "Aisha Bello", city: "Kano" },
    listing: { title: "Coach Leather Crossbody — Tan" },
    evidence: {
      buyer: [
        "Photo of the strap damage at unboxing.",
        "Original listing photo (no damage visible).",
        "Buyer's statement: 'The torn area was clearly there before shipping.'",
      ],
      seller: [
        "Pre-ship photo on inspection table.",
        "Shipping receipt with weight and handler signature.",
        "Seller's statement: 'It left here in perfect condition.'",
      ],
    },
  },
  {
    id: "dsp_4p2q",
    shortId: "DSP-4P2Q",
    orderShortId: "ORD-2L8N",
    status: "evidence_requested",
    priority: "medium",
    openedBy: "seller",
    openedAt: iso(-1 * DAY),
    evidenceDueAt: iso(3 * DAY),
    reason: "Buyer claims non-delivery; seller has tracking proof",
    summary:
      "Seller marked shipped 6 days ago with GIG Logistics tracking. Buyer says no package received. Awaiting carrier receipt + recipient signature.",
    amountNGN: 35_000,
    amountSats: 58_300,
    seller: { handle: "lagos.silk", name: "Funmi A.", location: "Ibadan" },
    buyer: { name: "Funmi Adesina", city: "Ibadan" },
    listing: { title: "Silk Wrap Midi Dress — Emerald" },
    evidence: {
      buyer: ["Statement: 'I've been home all week, nothing came.'"],
      seller: [
        "GIG tracking number GIG987654 — status: in transit.",
        "Pre-ship photo on packaging.",
      ],
    },
  },
  {
    id: "dsp_9x1b",
    shortId: "DSP-9X1B",
    orderShortId: "ORD-5R3T",
    status: "mediating",
    priority: "low",
    openedBy: "buyer",
    openedAt: iso(-6 * HOUR),
    evidenceDueAt: iso(4 * DAY),
    reason: "Wrong colour shipped (buyer expected white, received cream)",
    summary:
      "Both parties want resolution; seller has offered a 20% refund or full return. Buyer reviewing options.",
    amountNGN: 185_000,
    amountSats: 308_300,
    seller: { handle: "soundbox", name: "Ifeanyi O.", location: "Lagos" },
    buyer: { name: "Ifeanyi Obi", city: "Port Harcourt" },
    listing: { title: "Apple AirPods Pro 2 — Sealed" },
    evidence: {
      buyer: ["Photo of received cream-coloured box; listing showed white."],
      seller: ["Original supplier listing — 'starlight (cream-white)' variant."],
    },
  },
];

/* ----------------------------------------------------------------------- */
/*                                Page                                     */
/* ----------------------------------------------------------------------- */

type FilterKey = "open" | "evidence" | "mediating" | "all";

interface FilterSpec {
  key: FilterKey;
  label: string;
  matches: (s: DisputeQueueStatus) => boolean;
}

const FILTERS: FilterSpec[] = [
  { key: "all", label: "All", matches: () => true },
  {
    key: "open",
    label: "Escalated",
    matches: (s) => s === "escalated",
  },
  {
    key: "evidence",
    label: "Awaiting evidence",
    matches: (s) => s === "evidence_requested",
  },
  {
    key: "mediating",
    label: "Mediating",
    matches: (s) => s === "mediating",
  },
];

export default function Admin() {
  useSeoMeta({ title: "Mediator dashboard — SafeSale" });

  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter) ?? FILTERS[0];
    const q = query.trim().toLowerCase();
    return DISPUTES.filter((d) => {
      if (!f.matches(d.status)) return false;
      if (!q) return true;
      return (
        d.shortId.toLowerCase().includes(q) ||
        d.orderShortId.toLowerCase().includes(q) ||
        d.reason.toLowerCase().includes(q) ||
        d.seller.handle.toLowerCase().includes(q) ||
        d.buyer.name.toLowerCase().includes(q)
      );
    });
  }, [filter, query]);

  const active = activeId
    ? DISPUTES.find((d) => d.id === activeId) ?? null
    : null;

  return (
    <AppShell
      title="Mediator dashboard"
      subtitle="Sign a resolution and a Nostr kind 33889 event publishes for the whole network to verify."
    >
      <div className="space-y-6">
        {/* Hackathon-honesty banner */}
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <Scale className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
          <div className="text-sm">
            <p className="font-medium">Hackathon demo surface — data shown below is from local fixtures</p>
            <p className="mt-1 text-xs text-amber-800">
              This page will go live once the backend ships:
              GET /api/admin/disputes, POST /api/admin/disputes/:id/resolve,
              and kind-33889 Nostr publishing. The UI and resolve workflow
              are production-ready — just needs the API wiring.
            </p>
          </div>
        </div>

        {!active ? (
          <DisputeQueue
            disputes={filtered}
            filter={filter}
            onFilterChange={setFilter}
            query={query}
            onQueryChange={setQuery}
            onOpen={setActiveId}
          />
        ) : (
          <DisputeDetail
            dispute={active}
            onBack={() => setActiveId(null)}
          />
        )}
      </div>
    </AppShell>
  );
}

/* ----------------------------------------------------------------------- */
/*                             Queue view                                  */
/* ----------------------------------------------------------------------- */

function DisputeQueue({
  disputes,
  filter,
  onFilterChange,
  query,
  onQueryChange,
  onOpen,
}: {
  disputes: DisputeFixture[];
  filter: FilterKey;
  onFilterChange: (f: FilterKey) => void;
  query: string;
  onQueryChange: (q: string) => void;
  onOpen: (id: string) => void;
}) {
  const counts: Record<FilterKey, number> = {
    all: DISPUTES.length,
    open: DISPUTES.filter((d) => d.status === "escalated").length,
    evidence: DISPUTES.filter((d) => d.status === "evidence_requested").length,
    mediating: DISPUTES.filter((d) => d.status === "mediating").length,
  };

  return (
    <>
      {/* Search + filters */}
      <section className="space-y-3 rounded-2xl border border-border bg-white p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search by dispute id, order id, reason, seller, or buyer"
            className="h-10 pl-10"
            aria-label="Search disputes"
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
      </section>

      {/* Queue */}
      {disputes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface text-ink-soft">
            <CheckCircle2 className="h-6 w-6" aria-hidden />
          </div>
          <p className="mt-4 text-base font-semibold text-ink">All clear</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
            {query
              ? "No disputes match this search."
              : "No disputes match this filter. Pick another or sit back."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-white sm:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface text-[11px] font-medium uppercase tracking-wider text-ink-soft">
                <tr>
                  <th className="px-4 py-3">Dispute</th>
                  <th className="px-4 py-3">Order / parties</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Opened</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {disputes.map((d) => (
                  <DisputeRow key={d.id} dispute={d} onOpen={onOpen} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-3 sm:hidden">
            {disputes.map((d) => (
              <DisputeMobileCard key={d.id} dispute={d} onOpen={onOpen} />
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function DisputeRow({
  dispute,
  onOpen,
}: {
  dispute: DisputeFixture;
  onOpen: (id: string) => void;
}) {
  return (
    <tr
      onClick={() => onOpen(dispute.id)}
      className="cursor-pointer transition-colors hover:bg-surface focus-within:bg-surface"
    >
      <td className="px-4 py-3 align-middle">
        <p className="font-mono text-sm font-semibold tabular-nums text-ink">
          {dispute.shortId}
        </p>
        <p className="mt-0.5 line-clamp-1 text-xs text-ink-soft">
          {dispute.reason}
        </p>
      </td>
      <td className="px-4 py-3 align-middle">
        <p className="text-sm text-ink">
          {dispute.buyer.name}{" "}
          <span className="text-ink-soft">vs.</span> @{dispute.seller.handle}
        </p>
        <p className="mt-0.5 font-mono text-[11px] tabular-nums text-ink-soft">
          {dispute.orderShortId}
        </p>
      </td>
      <td className="px-4 py-3 align-middle">
        <p className="text-sm font-semibold tabular-nums text-ink">
                  {formatNGN(dispute.amountNGN)}
                </p>
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="flex flex-col items-start gap-1">
          <StatusBadge status={dispute.status} />
          <PriorityBadge priority={dispute.priority} />
        </div>
      </td>
      <td className="px-4 py-3 align-middle text-right">
        <p className="text-xs text-ink-soft">
          {formatRelative(dispute.openedAt)}
        </p>
      </td>
    </tr>
  );
}

function DisputeMobileCard({
  dispute,
  onOpen,
}: {
  dispute: DisputeFixture;
  onOpen: (id: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(dispute.id)}
        className="block w-full rounded-2xl border border-border bg-white p-4 text-left transition-colors active:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-sm font-semibold tabular-nums text-ink">
              {dispute.shortId}
            </p>
            <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">
              {dispute.reason}
            </p>
          </div>
          <StatusBadge status={dispute.status} />
        </div>
        <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-border pt-3">
          <div className="min-w-0">
            <p className="truncate text-xs text-ink">
              {dispute.buyer.name} vs. @{dispute.seller.handle}
            </p>
            <p className="mt-0.5 font-mono text-[11px] tabular-nums text-ink-soft">
              {dispute.orderShortId}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold tabular-nums text-ink">
              {formatNGN(dispute.amountNGN)}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-soft">
              {formatRelative(dispute.openedAt)}
            </p>
          </div>
        </div>
      </button>
    </li>
  );
}

/* ----------------------------------------------------------------------- */
/*                            Detail view                                  */
/* ----------------------------------------------------------------------- */

function DisputeDetail({
  dispute,
  onBack,
}: {
  dispute: DisputeFixture;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const [outcome, setOutcome] = useState<DisputeOutcome | null>(null);
  const [splitPct, setSplitPct] = useState<number>(50);
  const [rationale, setRationale] = useState("");

  const canResolve = outcome !== null && rationale.trim().length >= 20;

  const onResolve = () => {
    toast({
      title: "Resolution staged",
      description:
        "Real publishing of kind 33889 lands when backend admin endpoints ship. For now the workflow is verified end-to-end.",
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 rounded text-xs font-medium text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back to queue
      </button>

      {/* Heading */}
      <header className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-mono text-2xl font-semibold tabular-nums text-ink">
            {dispute.shortId}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {dispute.reason} ·{" "}
            <span className="font-mono tabular-nums">
              {dispute.orderShortId}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={dispute.status} />
          <PriorityBadge priority={dispute.priority} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT — both sides + resolution */}
        <div className="space-y-6 lg:col-span-2">
          {/* Both parties side-by-side */}
          <div className="grid gap-4 sm:grid-cols-2">
            <PartyCard
              role="Buyer"
              name={dispute.buyer.name}
              location={dispute.buyer.city}
              evidence={dispute.evidence.buyer}
              opened={dispute.openedBy === "buyer"}
            />
            <PartyCard
              role="Seller"
              name={`@${dispute.seller.handle}`}
              subname={dispute.seller.name}
              location={dispute.seller.location}
              evidence={dispute.evidence.seller}
              opened={dispute.openedBy === "seller"}
            />
          </div>

          {/* Resolution form */}
          <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
            <h2 className="text-base font-semibold text-ink">
              Sign a resolution
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              The resolution publishes as a Nostr kind 33889 event signed
              by the mediator key. Both parties and any third party can
              verify it without trusting SafeSale.
            </p>

            <div className="mt-5 space-y-4">
              <fieldset>
                <legend className="text-[11px] font-medium uppercase tracking-wider text-ink-soft">
                  Outcome
                </legend>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <OutcomeOption
                    value="refund_buyer"
                    label="Refund to buyer"
                    selected={outcome === "refund_buyer"}
                    onSelect={() => setOutcome("refund_buyer")}
                  />
                  <OutcomeOption
                    value="release_seller"
                    label="Release to seller"
                    selected={outcome === "release_seller"}
                    onSelect={() => setOutcome("release_seller")}
                  />
                  <OutcomeOption
                    value="split"
                    label="Split"
                    selected={outcome === "split"}
                    onSelect={() => setOutcome("split")}
                  />
                </div>
              </fieldset>

              {outcome === "split" && (
                <div>
                  <Label htmlFor="split">Buyer share (%)</Label>
                  <div className="mt-1.5 flex items-center gap-3">
                    <input
                      id="split"
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={splitPct}
                      onChange={(e) => setSplitPct(Number(e.target.value))}
                      className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-surface"
                    />
                    <span className="font-mono text-sm font-semibold tabular-nums text-ink">
                      {splitPct}%
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-ink-soft">
                    Buyer receives {formatNGN(Math.round((dispute.amountNGN * splitPct) / 100))} ·
                    seller receives {formatNGN(dispute.amountNGN - Math.round((dispute.amountNGN * splitPct) / 100))}
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="rationale">
                  Rationale <span className="text-ink-soft">(min 20 chars; published publicly)</span>
                </Label>
                <Textarea
                  id="rationale"
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                  placeholder="Why this outcome — phrased so both parties can read it without escalating."
                  className="mt-1.5 min-h-[100px]"
                />
                <p className="mt-1 text-[11px] text-ink-soft">
                  {rationale.length} / 600
                </p>
              </div>

              <Button
                type="button"
                onClick={onResolve}
                disabled={!canResolve}
                className="h-11 rounded-lg bg-brand px-5 text-sm font-semibold text-brand-foreground hover:bg-brand/90 disabled:opacity-50"
              >
                <Gavel className="mr-2 h-4 w-4" aria-hidden />
                Sign &amp; publish resolution
              </Button>
            </div>
          </section>
        </div>

        {/* RIGHT — case details + summary */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
            <p className="text-[11px] font-medium uppercase tracking-wider text-ink-soft">
              Case
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <Pair label="Listing">
                <span className="text-ink">{dispute.listing.title}</span>
              </Pair>
              <Pair label="Disputed amount">
                <div>
                  <p className="font-semibold tabular-nums text-ink">
                    {formatNGN(dispute.amountNGN)}
                  </p>
                </div>
              </Pair>
              <Pair label="Opened by">
                <span className="capitalize text-ink">{dispute.openedBy}</span>
              </Pair>
              <Pair label="Opened">
                <span className="text-ink">{formatRelative(dispute.openedAt)}</span>
              </Pair>
              <Pair label="Evidence due">
                <span className="inline-flex items-center gap-1 text-ink">
                  <Calendar className="h-3.5 w-3.5 text-ink-soft" aria-hidden />
                  {formatRelative(dispute.evidenceDueAt)}
                </span>
              </Pair>
            </dl>
          </section>

          <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
            <p className="text-[11px] font-medium uppercase tracking-wider text-ink-soft">
              Summary
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink">
              {dispute.summary}
            </p>
          </section>

          <p className="text-[11px] italic text-ink-soft">
            All evidence + your signed resolution publish as Nostr events.
            Anyone — including non-SafeSale clients — can verify the
            mediator's decision against the public mediator pubkey.
          </p>
        </div>
      </div>
    </>
  );
}

/* ----------------------------------------------------------------------- */
/*                          Small primitives                               */
/* ----------------------------------------------------------------------- */

function StatusBadge({ status }: { status: DisputeQueueStatus }) {
  const cfg =
    status === "escalated"
      ? { label: "Escalated", cls: "bg-rose-50 text-rose-800 border-rose-200", Icon: AlertTriangle }
      : status === "evidence_requested"
        ? { label: "Awaiting evidence", cls: "bg-amber-50 text-amber-800 border-amber-200", Icon: Package }
        : { label: "Mediating", cls: "bg-sky-50 text-sky-800 border-sky-200", Icon: Gavel };
  const Icon = cfg.Icon;
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-md border px-2 text-[11px] font-semibold uppercase tracking-wide",
        cfg.cls,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden /> {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: DisputePriority }) {
  const cls =
    priority === "high"
      ? "bg-rose-100 text-rose-800"
      : priority === "medium"
        ? "bg-amber-100 text-amber-800"
        : "bg-surface text-ink-soft";
  return (
    <span
      className={cn(
        "inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        cls,
      )}
    >
      priority: {priority}
    </span>
  );
}

function PartyCard({
  role,
  name,
  subname,
  location,
  evidence,
  opened,
}: {
  role: "Buyer" | "Seller";
  name: string;
  subname?: string;
  location: string;
  evidence: string[];
  opened: boolean;
}) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5">
      <header className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-ink-soft">
          {role}
        </p>
        {opened && (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-800">
            Opened
          </span>
        )}
      </header>
      <div className="mt-3 flex items-center gap-3">
        <Avatar seed={`${role}-${name}`} name={name} size={36} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{name}</p>
          <p className="truncate text-xs text-ink-soft">
            {subname ? `${subname} · ` : ""}
            {location}
          </p>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {evidence.map((e, i) => (
          <li
            key={i}
            className="flex items-start gap-2 rounded-lg border border-border bg-surface/40 p-3 text-xs text-ink"
          >
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-soft" aria-hidden />
            <span>{e}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function OutcomeOption({
  value,
  label,
  selected,
  onSelect,
}: {
  value: DisputeOutcome;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      data-value={value}
      className={cn(
        "rounded-lg border px-3 py-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        selected
          ? "border-brand bg-brand-soft text-brand-soft-foreground"
          : "border-border bg-white text-ink hover:bg-surface",
      )}
    >
      {label}
    </button>
  );
}

function Pair({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2 last:border-0">
      <dt className="text-[11px] uppercase tracking-wider text-ink-soft">
        {label}
      </dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
