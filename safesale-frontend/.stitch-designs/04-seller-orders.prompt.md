# Stitch prompt — Screen #4: Seller Orders (list + detail)

Design **two production-grade pages** for a Nigerian peer-to-peer marketplace named **SafeSale**:

1. **Seller Orders — List** — a scannable feed of every order the seller has, across every state (awaiting payment, paid & ready to ship, shipped, delivered, completed, disputed, refunded). This is the seller's daily "what do I need to do today" surface.
2. **Seller Order Detail** — what the seller sees when they tap one row. Buyer info, what to ship, where, the one action they can take right now (mark shipped → enter tracking number), plus the full lifecycle timeline.

The seller is a small-business owner — Instagram boutique, WhatsApp store, weekend hustle. They open these two pages **after every new-order ping**. List view sessions are 10–30 seconds (scan, prioritise, tap into one). Detail view sessions are 1–3 minutes (read buyer's delivery address, copy phone, dispatch courier, paste tracking number, hit Mark Shipped). They are on a phone 80% of the time.

The two pages must do three things, in this order:

1. **Surface what needs the seller's attention NOW** — paid-but-not-shipped orders + disputed orders. These must be visible without scrolling.
2. **Tell the truth about each order's state** — buyers can see the same status from their order page; the seller's view must agree with what the buyer sees, or trust breaks.
3. **Make Mark Shipped a one-tap action** — the only thing the seller actually does on this surface (everything else is read-only state-tracking). It must be impossible to miss when there's an order in the `payment_locked` state.

This is **not** a public-facing page. It's a working surface. Every status, every timestamp, every kobo amount is real once wired (no fake "12 viewers right now").

---

## Visual direction (NON-NEGOTIABLE — same contract as screens 1, 2, 3, 6, 7, 8)

- Inspired by **Stripe Dashboard payments table + Shopify Orders + Paystack Transactions**. Calm, dense-but-readable, business-grade. Light mode only.
- **No** glassmorphism, neon, gradients-as-decoration, cyberpunk-crypto aesthetic. **No** Material Symbols (use lucide). **No** custom sidebar — the AppShell already provides one. **No** fake stats.
- Typography: **Inter**. Body ≥ 14px, page heading ≥ 24px, section labels ≥ 11px uppercase tracking-wide, amounts ≥ 16px `tabular-nums font-semibold`.
- Soft shadows. `rounded-2xl` for major cards, `rounded-xl` for inner tiles / images, `rounded-lg` for inputs / buttons / status pills, `rounded-full` for filter chips.
- Generous whitespace; 8px grid. No `p-[13px]` one-offs.
- Color palette — semantic tokens ONLY, do not invent new colors:
  - `bg-surface` — page background (warm off-white)
  - `bg-background` / `bg-white` — elevated cards
  - `text-ink` — primary text
  - `text-ink-soft` — secondary text
  - `bg-brand` / `text-brand-foreground` — primary CTA (warm emerald-green)
  - `bg-brand-soft` / `text-brand-soft-foreground` — soft brand accent (active filter chip, "completed" status)
  - `bg-amber-50` / `text-amber-800` / `border-amber-200` — **needs-attention** state (payment_locked, disputed when looked at by seller)
  - `bg-sky-50` / `text-sky-800` / `border-sky-200` — informational state (shipped, delivered)
  - `bg-rose-50` / `text-rose-800` / `border-rose-200` — alert state (disputed, refunded)
  - `bg-surface` / `text-ink-soft` — neutral / pending state (pending_payment, expired)
  - `border-border` — neutral border
- Icons: **lucide-react only**. Suggested: `Package`, `Truck`, `CheckCircle2`, `AlertTriangle`, `Clock`, `MapPin`, `Phone`, `Copy`, `ExternalLink`, `Search`, `Filter`, `ArrowRight`, `Send`, `User`, `MessageSquare`, `RotateCcw`, `Hash`.
- Mobile-first. Must look correct from **360px → 1440px**.
- WCAG 2.1 AA. Every interactive element has a visible `focus-visible:ring-2 ring-brand` state. Status pills must remain ≥ 4.5:1 contrast.

---

## Page chrome — the persistent app shell (already exists, just reference)

Both pages render **inside** an existing AppShell that provides:

- A left sidebar (desktop) / top tab bar (mobile) with 5 nav items: Home, Listings, **Orders** (active), Earnings, Settings.
- A top header with the page title and a small subtitle slot.
- A top-right user menu.

You do **not** need to design the shell. Design only the **content area** that fills the AppShell. Assume `max-w-6xl` horizontal padding `px-4 sm:px-6 lg:px-8`, vertical `py-6 sm:py-8`, and `space-y-6` between sections.

---

## Data shape these pages read

This is non-negotiable: design only fields the React components will actually have. Inventing extra fields (views count, buyer rating, time-to-ship score, etc.) is forbidden — they will be deleted at port time and waste your work.

Each order row on the LIST page is a `SellerOrderRow` (defined in `src/lib/api/types.ts` line 370), which is `ApiOrder` joined with `listing` and optional `dispute`:

```ts
interface SellerOrderRow {
  // From ApiOrder
  id: string;                  // cuid
  shortId: string;             // 6-7 char human-friendly id, e.g. "ORD-7K3M"
  orderToken: string;          // long URL-safe secret, used in routes
  listingId: string;
  sellerId: string;
  buyerNpub: string;           // bech32, for chat reference only
  buyerPubkey: string;         // hex
  buyerName: string;           // e.g. "Tunde Bakare"
  buyerPhone: string;          // e.g. "+234 803 412 5599"
  buyerEmail?: string | null;
  buyerCity: string;           // e.g. "Lagos"
  buyerAddress?: string | null; // free-form, "12 Bode Thomas, Surulere"
  contactMethod?: "phone" | "email" | null;
  variant?: string | null;     // free-text, e.g. "UK 9"
  amountNGN: number;           // integer naira → format ₦42,000
  amountSats: number;          // integer sats → format with thousands separator
  status:
    | "pending_payment"   // buyer hasn't paid yet (Bitnob VA issued, awaiting transfer)
    | "payment_locked"    // money is in the Cashu escrow; ★ ACTION REQUIRED ★
    | "shipped"           // seller marked shipped; waiting on buyer
    | "delivered"         // buyer marked delivered (rare path, not always used)
    | "completed"         // buyer released payment; sats settled
    | "disputed"          // buyer or seller opened a dispute; ★ ATTENTION ★
    | "refunded";         // resolved as refund-to-buyer
  trackingNumber?: string | null;  // present iff shipped
  carrier?: string | null;          // free-text, e.g. "GIG Logistics"
  shippedAt?: string | null;        // ISO
  releasedAt?: string | null;       // ISO
  refundedAt?: string | null;       // ISO
  autoReleaseAt?: string | null;    // ISO — 7d after shippedAt, silent-buyer auto-release
  expiresAt?: string | null;        // ISO — Bitnob VA expiry
  notes?: string | null;
  createdAt: string;                // ISO
  updatedAt: string;                // ISO

  // Joined
  listing: {
    id: string;
    title: string;
    priceNGN: number;
    images: { url?: string; seed?: string; alt?: string }[];  // first is the lead
    delivery?: string | null;
    inStock: number;
  };
  dispute: {
    id: string;
    reason: string;                // free-text
    summary?: string | null;
    openedBy: "buyer" | "seller";
    priority: "low" | "medium" | "high";
    status:
      | "direct_resolution"
      | "escalated"
      | "evidence_requested"
      | "mediating"
      | "resolved";
    createdAt: string;
    resolvedAt?: string | null;
  } | null;
}
```

There is **no** "viewed by buyer" timestamp, **no** "estimated delivery date," **no** seller-side rating of the buyer, **no** chat-message-count badge, **no** read/unread flag on the list. If a field isn't above, don't show it.

The buyer's order page (their view of the same order) lives at `safesale.app/order/<orderToken>`. The seller does **not** need that link in the UI — it's the buyer's secret.

---

# Page A — Seller Orders List

Route: `/app/orders`. Hook: `useSellerOrders()` — same TanStack cache the dashboard reads (15s poll).

## A.0 Page heading row

`<header>` block with:

- Title: **"Orders"** — `text-2xl font-semibold text-ink leading-tight`.
- Subtitle: `text-sm text-ink-soft mt-1` — *"Every sale you've made, newest first."*.
- No right-side button on this page — orders aren't created from the seller side. Skip the action slot.

## A.1 "Needs your attention" strip — TOP OF CONTENT, NON-COLLAPSIBLE

A single `rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5` card, only rendered when at least one order has `status === "payment_locked"` OR `status === "disputed"`.

Layout:

- Left: a `h-9 w-9 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center` icon-circle with an `AlertTriangle` lucide icon (h-5 w-5).
- Center (flex-1): a single line `text-sm font-medium text-amber-900` — *"You have **N orders** that need action."* (N = count of payment_locked + disputed). If only one, *"1 order needs your action."*.
- Right (sm+ only; on mobile drops below to its own line): a short `text-xs text-amber-800` line listing the breakdown — e.g. *"2 to ship · 1 disputed"*. Singular forms when the count is 1.

When zero orders need attention, this card is **omitted entirely**. Do not render a "you're all caught up" placeholder here — the calmness is the reward.

## A.2 Filter + search bar

A `rounded-2xl border border-border bg-white p-4` card with:

- **Left side** — a search input (`h-10 rounded-lg pl-10 pr-3 border border-border bg-surface text-sm placeholder:text-ink-soft`) with a `Search` lucide icon absolutely positioned at left-3. Placeholder: *"Search by buyer, order id, or product"*. Filters live (matches against `buyerName`, `shortId`, and `listing.title`, case-insensitive substring).
- **Right side** — six filter chips in a horizontal scrollable row, in this order: **All · To ship · Shipped · Completed · Disputed · Refunded**. Each is `h-9 rounded-full px-3 text-xs font-medium border border-border whitespace-nowrap`. The active one is `bg-brand-soft text-brand-soft-foreground border-brand-soft`. Each chip carries a small count badge after the label — e.g. *"To ship · 3"* — rendered as `ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full px-1 text-[10px] font-semibold bg-white/60 text-current` (the active chip gets `bg-white/40`; inactive gets `bg-surface`). When a chip's count is zero, render the chip normally but with `opacity-60`.

Mapping chips → status:
- All → no filter
- To ship → `payment_locked`
- Shipped → `shipped`, `delivered`
- Completed → `completed`
- Disputed → `disputed`
- Refunded → `refunded`

Pending-payment (Bitnob virtual account issued but buyer hasn't paid) is **not** a chip — those rows appear under "All" only. They're informational; the seller can't act on them.

Mobile (< sm): search input full width on its own row, chips on a second row, horizontally scrollable with `overflow-x-auto scrollbar-hide`.

## A.3 Orders list — desktop (sm+)

A `rounded-2xl border border-border bg-white overflow-hidden` card containing a true `<table>`. Sticky `<thead>` with `bg-surface text-[11px] font-medium uppercase tracking-wider text-ink-soft`. Column headers:

| Order | Buyer | Amount | Status | Updated | (actions) |
|---|---|---|---|---|---|

Each `<tr>` is `border-t border-border hover:bg-surface focus-within:bg-surface transition-colors`, height ~72px. Cells `px-4 py-3 align-middle`. The entire row is wrapped in a `<Link to={"/app/orders/" + order.orderToken}>` (rendered as a `<tr>` with the link covering the row, OR each cell is a link — designer's call as long as the whole row is one tap target with a single visible focus ring).

Per-row content, column by column:

1. **Order** — flex row with:
   - `h-12 w-12 rounded-xl object-cover` thumbnail showing `listing.images[0]`. If image is missing, show a `h-12 w-12 rounded-xl bg-surface flex items-center justify-center text-ink-soft` placeholder with a `Package` lucide icon.
   - To its right, two stacked lines: `text-sm font-medium text-ink line-clamp-1` (= `listing.title`) and `text-xs text-ink-soft font-mono tabular-nums` (= `shortId`, e.g. *"ORD-7K3M"*). If `variant` is set, append it to line 2 in `text-ink-soft` with a tiny `·` separator: *"ORD-7K3M · UK 9"*.

2. **Buyer** — two stacked lines: `text-sm text-ink line-clamp-1` (= `buyerName`) and `text-xs text-ink-soft` (= `buyerCity`).

3. **Amount** — single line: `text-sm font-semibold tabular-nums text-ink` (= `formatNGN(amountNGN)` → e.g. *"₦42,000"*). Below it, `text-[11px] tabular-nums text-ink-soft` (= `amountSats.toLocaleString() + " sats"`).

4. **Status** — a status pill. Use the StatusPill spec from section A.5.

5. **Updated** — single line: `text-xs text-ink-soft` showing `formatRelative(updatedAt)` (e.g. *"2h ago"*, *"3 days ago"*, *"Oct 5"*).

6. **(actions)** — a single `ChevronRight` icon, `h-4 w-4 text-ink-soft`, right-aligned. Cell width `w-10`. No dropdown menu on the list page — keep it scannable; all actions live on the detail page.

Sort: orders array comes pre-sorted newest-first by the hook. Don't add sort-by-column controls — out of MVP.

## A.4 Orders list — mobile (< sm)

Replace the table with stacked cards. Each card is `rounded-2xl border border-border bg-white p-4 active:bg-surface transition-colors`, wrapped in a single tappable `<Link>`. Layout per card:

- Top row: `flex items-center gap-3`
  - `h-12 w-12 rounded-xl object-cover` thumbnail (same as desktop).
  - Flex-1: two lines — `text-sm font-medium text-ink line-clamp-1` (`listing.title`), then `text-xs text-ink-soft font-mono tabular-nums` (`shortId` + optional `· variant`).
  - Right: the status pill.
- Middle row (mt-3): two halves with a `flex justify-between items-baseline gap-3`
  - Left: stacked `text-xs text-ink-soft` (= `buyerName + ", " + buyerCity`).
  - Right: stacked `text-sm font-semibold tabular-nums text-ink` (= `formatNGN(amountNGN)`) then `text-[11px] tabular-nums text-ink-soft` (= sats).
- Bottom row (mt-2): single line `text-[11px] text-ink-soft` — *"Updated · 2h ago"*.

## A.5 StatusPill — shared visual primitive (used on both pages)

A pill component sized `h-6 inline-flex items-center gap-1.5 rounded-md px-2 text-[11px] font-semibold uppercase tracking-wide`. The lucide icon inside is `h-3 w-3`. Map:

| status            | colors                                              | icon         | label              |
|-------------------|-----------------------------------------------------|--------------|--------------------|
| pending_payment   | `bg-surface text-ink-soft border border-border`    | `Clock`      | "Awaiting payment" |
| payment_locked    | `bg-amber-50 text-amber-800 border border-amber-200` | `Package`  | "To ship"          |
| shipped           | `bg-sky-50 text-sky-800 border border-sky-200`     | `Truck`      | "Shipped"          |
| delivered         | `bg-sky-50 text-sky-800 border border-sky-200`     | `Truck`      | "Delivered"        |
| completed         | `bg-brand-soft text-brand-soft-foreground border border-transparent` | `CheckCircle2` | "Completed" |
| disputed          | `bg-rose-50 text-rose-800 border border-rose-200`  | `AlertTriangle` | "Disputed"     |
| refunded          | `bg-rose-50 text-rose-800 border border-rose-200`  | `RotateCcw`  | "Refunded"         |

## A.6 Empty states

Three variants. Replace the list (NOT the snapshot strip) with the appropriate one:

1. **Not signed up yet** — the seller hasn't completed onboarding. `rounded-2xl border border-dashed border-border bg-white p-10 text-center`. Icon-circle (`h-14 w-14 rounded-full bg-surface text-ink-soft` containing a `User` lucide), heading **"Finish signing up to see your orders"**, sub *"You need a seller profile before orders can land here."*, primary brand button **"Complete signup"** linking to `/onboarding`.
2. **Signed up, zero orders ever** — same dashed card. Icon-circle with `Package`, heading **"No orders yet"**, sub *"When a buyer pays, the order will appear here. Share your listing links and you're in business."*, ghost button **"View my listings"** linking to `/app/listings`.
3. **Filtered to zero matches** — smaller dashed card, no icon. Heading `text-sm font-medium`: *"No orders match this filter."*. Ghost button **"Clear filters"** that resets the search box + sets chip to All.

## A.7 Loading skeleton

Render the table/card shell with the heading row visible, but replace each row with a `<Skeleton>`-based stand-in. On desktop: 5 rows, each with a 48×48 rounded-xl skeleton (thumb), two stacked text skeletons (16px + 12px tall), a 60px amount skeleton, a 80px pill skeleton, a 50px time skeleton. On mobile: 3 card skeletons matching the card layout. Animate-pulse already lives on the Skeleton primitive — no extra animation needed.

---

# Page B — Seller Order Detail

Route: `/app/orders/:token`. Hook: `apiClient.getOrder(token)` polled every 8s (stops on terminal statuses).

## B.0 Back link + heading row

Top of content:

- A small back link: `inline-flex items-center gap-1 text-xs font-medium text-ink-soft hover:text-ink`, with an `ArrowLeft` lucide icon (h-3.5 w-3.5). Label: *"Back to orders"*. Links to `/app/orders`.
- Below, the page heading row: two-column on `sm+`, stacked on mobile.
  - Left column: title `text-2xl font-semibold text-ink tabular-nums` showing the `shortId` (e.g. *"ORD-7K3M"*). Subtitle `text-sm text-ink-soft mt-1` showing *"Placed · 2 days ago · by Tunde Bakare"*.
  - Right column: the StatusPill (same primitive as A.5), but sized up: `h-7 px-2.5 text-xs` instead of the table size.

## B.1 Hero card — what to do right now

A single `rounded-2xl border border-border bg-white p-5 sm:p-6` card. Its **contents change based on order status** — this is the most important section, because it's where the seller takes action (or sees that there's no action to take).

### B.1.a When `status === "payment_locked"` — the seller's main job

This is the only state where the seller has work to do. Render:

- An amber accent strip on top: `-mx-5 -mt-5 px-5 py-2 bg-amber-50 text-amber-900 text-xs font-medium border-b border-amber-200 rounded-t-2xl` containing: *"★ Action required — buyer has paid; ship this item to release your money."*. The ★ is a `Package` lucide icon (h-3.5 w-3.5).
- Heading `text-base font-semibold text-ink`: **"Ship this order"**.
- Sub `text-sm text-ink-soft mt-1`: *"Once you mark this shipped, the buyer gets notified. They have 7 days to confirm — after that the payment auto-releases to you."*.
- A two-column form (single column on mobile), `mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4`:
  - Field 1: **Tracking number** — `<Input>` (h-11 rounded-lg), label *"Tracking number"*, placeholder *"e.g. GIG12345"*, required. Use `font-mono tabular-nums` on the input itself.
  - Field 2: **Carrier** — `<Input>` (h-11 rounded-lg), label *"Carrier"*, placeholder *"GIG, Kwik, DHL, Sendbox…"*, required (free-text, no select).
- Below the form, a single primary button: `h-11 rounded-lg bg-brand text-brand-foreground hover:bg-brand/90 px-5 text-sm font-semibold inline-flex items-center gap-2`, label **"Mark as shipped"**, icon `Send`. Disabled when either input is empty. While the mutation is in flight, button text becomes *"Marking shipped…"* with `Loader2 animate-spin`. On error, a `text-xs text-rose-700 mt-2` line appears above the button with the message.

### B.1.b When `status === "shipped"` or `"delivered"` — waiting on the buyer

- Heading **"Item is on the way"** (shipped) or **"Buyer marked delivered"** (delivered).
- Sub `text-sm text-ink-soft`: *"You've shipped this order. The buyer has until **{formatRelative(autoReleaseAt)}** to release the payment, or it'll release automatically."*. If autoReleaseAt is null, say *"Awaiting buyer release."*.
- A read-only data row, `mt-4 grid grid-cols-2 gap-4 text-sm`, showing:
  - Tracking number: `font-mono tabular-nums text-ink`, with a small `Copy` button (icon-only, `h-7 w-7 rounded-md hover:bg-surface text-ink-soft`) on the right that copies the value + toasts *"Copied"*.
  - Carrier: `text-ink`.
  - Shipped: `formatRelative(shippedAt)` in `text-ink-soft`.

### B.1.c When `status === "completed"`

- Heading **"Payment released — you got paid"**.
- Sub: *"The buyer released the escrow on {formatTime(releasedAt)}. The {amountSats.toLocaleString()} sats are yours."*.
- A small green check chip on the right side of the heading row: `inline-flex items-center gap-1.5 text-brand-soft-foreground bg-brand-soft px-2 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wide` with a `CheckCircle2` icon.
- No action button.

### B.1.d When `status === "disputed"`

- Heading **"This order is in dispute"** in `text-rose-800`.
- Sub: *"A mediator is reviewing. You'll be notified when there's a decision."* — neutral wording, do not take sides in copy.
- Render a sub-card *inside* the hero card (or right below it), `mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-2 text-sm`:
  - Line 1: `text-[11px] font-semibold uppercase tracking-wider text-rose-800` — *"Dispute reason"*.
  - Line 2: `text-rose-900` showing `dispute.reason` (escaped — this is user input).
  - Line 3 (only if `dispute.summary`): `text-rose-800 text-xs`.
  - Bottom row: a small line `text-[11px] text-rose-700` showing *"Opened by buyer · 3 days ago · priority: high"* (mix the three fields).
- No primary action button — the seller can't unilaterally resolve a dispute from this surface in MVP.

### B.1.e When `status === "pending_payment"`

- Heading **"Awaiting buyer payment"**.
- Sub: *"The buyer's virtual account is issued. They have until {formatTime(expiresAt)} to send the transfer. We'll notify you the moment it lands."*.
- No action button.

### B.1.f When `status === "refunded"`

- Heading **"Order was refunded"**.
- Sub: *"Resolved on {formatTime(refundedAt)}. The buyer got their money back."*.
- No action button.

## B.2 Buyer + delivery card

Below the hero card, full width, `rounded-2xl border border-border bg-white p-5 sm:p-6`. Section label at the top: `text-[11px] font-medium uppercase tracking-wider text-ink-soft` — *"Ship to"*.

Two-column grid on `sm+` (`grid grid-cols-2 gap-x-8 gap-y-4`), single column on mobile.

Each field is a vertical pair: a `text-[11px] uppercase tracking-wider text-ink-soft` label above, the value below in `text-sm text-ink`. Fields, in order:

1. **Buyer name** — `buyerName`.
2. **Phone** — `buyerPhone` rendered as a `<a href="tel:...">` link, with a small `Copy` icon button on the right of the value that copies the digits.
3. **City** — `buyerCity`.
4. **Delivery address** — `buyerAddress` if present, else the italic muted line `text-ink-soft italic` saying *"Buyer didn't provide an address — contact them via phone above."*. When present, a small `Copy` icon button copies the whole address.
5. **Contact preference** — *"Phone"* or *"Email"* per `contactMethod`, or *"Either"* if null. Render as a small inline `text-xs rounded-md px-2 py-0.5 bg-surface text-ink-soft border border-border`.
6. **Email** — only if `buyerEmail` present; rendered as a `<a href="mailto:...">` link, plus a `Copy` button.
7. **Variant** — only if `variant` present; e.g. *"UK 9"*.

Below the grid, a thin `border-t border-border mt-5 pt-4` divider with a single line `text-xs text-ink-soft` — *"Delivery preference noted by seller: {listing.delivery || "Not specified"}"*. This is the seller's own delivery line from the listing — useful as a reminder of what they promised.

## B.3 Order summary card

Same card frame. Section label: *"Order summary"*.

A 2-column flat list, label-on-left, value-on-right, each line `flex justify-between items-baseline text-sm py-1.5`, with a thin `border-b border-border last:border-0` on each.

Rows:
- Product: `text-ink` `{listing.title}` (line-clamp-1). Below it in `text-[11px] text-ink-soft font-mono tabular-nums`: the listing id (cuid) for traceability.
- Unit price: `formatNGN(listing.priceNGN)`.
- Variant: only if present.
- **Subtotal (NGN)**: `font-semibold tabular-nums` = `formatNGN(amountNGN)`.
- **Subtotal (sats)**: `font-mono tabular-nums text-ink-soft` = `amountSats.toLocaleString() + " sats"`.

No platform fees row — fees are subsidized by the protocol in MVP; surfacing a "₦0 fees" row invites confusion when fees do show up later.

A small footer line, `text-[11px] text-ink-soft mt-3`, in italics: *"Buyer paid in Naira via Bitnob; escrow held as Cashu sats locked to their one-time key."*. This is the only place we explain the mechanism on this screen — keep it discreet.

## B.4 Activity timeline

Same card frame. Section label: *"Activity"*. A vertical timeline of state transitions, oldest at top, newest at bottom. Each row:

`flex items-start gap-3 py-3 border-b border-border last:border-0`.
- Left column (w-7 shrink-0, centered): a `h-7 w-7 rounded-full flex items-center justify-center` icon-circle. Color tier:
  - Past / completed step: `bg-brand-soft text-brand-soft-foreground` with a `CheckCircle2` icon.
  - Current step: `bg-amber-100 text-amber-800` with the relevant lucide icon (Package / Truck / etc.).
  - Future step: `bg-surface text-ink-soft border border-border` with the relevant icon and `opacity-60`.
  - Alert step (only when status is `disputed` or `refunded` reached): `bg-rose-100 text-rose-800` with `AlertTriangle` or `RotateCcw`.
- Right column: stacked text — `text-sm font-medium text-ink` (the headline) and `text-xs text-ink-soft mt-0.5` (timestamp via `formatTime(...)`, or "—" for future steps).

Steps to render (in order), with headlines and the field they read:

1. **Order placed** — `createdAt`. Always past.
2. **Payment received** — `updatedAt` if status is past `payment_locked`, else future. Headline becomes *"Awaiting payment"* if future.
3. **Shipped** — `shippedAt`. Headline becomes *"Awaiting shipment"* if future. If `trackingNumber` present, append below the timestamp on its own line: `text-[11px] text-ink-soft font-mono tabular-nums` showing *"{carrier} · {trackingNumber}"*.
4. **Payment released** — `releasedAt`. Becomes *"Awaiting buyer release"* if shipped but not released. Becomes *"Dispute opened — {dispute.reason}"* if status is `disputed` (alert variant). Becomes *"Refunded to buyer"* if `refunded` (alert variant).

Do **not** render granular sub-events ("buyer viewed page," "tracking updated by carrier") — backend doesn't emit them.

## B.5 Mobile sticky action bar (only when `status === "payment_locked"`)

On `< sm` only, render a `fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-border px-4 py-3 flex items-center gap-3 shadow-[0_-1px_3px_rgba(0,0,0,0.04)]` bar. Contents:

- A short label on the left, `text-xs text-ink-soft flex-1 leading-tight`: *"Ready to ship?"*.
- The primary brand button on the right, same as the hero CTA but compact: `h-11 rounded-lg bg-brand text-brand-foreground px-4 text-sm font-semibold inline-flex items-center gap-2`, label *"Mark shipped"*, icon `Send`. Tapping scrolls the page to the hero form and focuses the tracking-number input.

When `status !== "payment_locked"`, the bar is omitted entirely. Add `aria-hidden="true"` when omitted.

## B.6 Loading state

On first load (`isLoading && !data`), render a skeleton version: heading row with two skeletons, then the hero / buyer / summary / timeline cards each replaced by a `rounded-2xl border border-border bg-white p-6` block containing 3-4 `<Skeleton>` lines of decreasing widths (100%, 80%, 60%). Do not blank the whole page.

## B.7 Error state

When `error !== null` and we have no cached data, replace the body with a single centered `rounded-2xl border border-dashed border-border bg-white p-10 text-center` card: `AlertTriangle` icon in a `h-12 w-12 rounded-full bg-surface text-ink-soft` circle, heading **"Couldn't load this order"**, sub `text-sm text-ink-soft` *"Check your connection and try again."*, primary brand button **"Try again"** that re-runs the query.

If we have cached data AND a follow-up fetch errors, do nothing visible (don't disturb the seller mid-action) — TanStack handles silent retry.

---

## Microcopy reference (use these exact placeholders in the default rendered state)

For the LIST page, render the following six rows in this exact order so reviewers see every status variant:

1. **ORD-7K3M** · Vintage Denim Jacket — Ralph Lauren · Tunde Bakare, Lagos · ₦28,500 (47,500 sats) · **To ship** · *2h ago*. (status: payment_locked) — lead image: folded denim jacket on wood. ★ Counts for "needs attention."
2. **ORD-4P2Q** · Nike Air Force 1 '07 — White, UK 9 · Chika Eze, Abuja · ₦42,000 (70,000 sats) · **Shipped** · *1 day ago*. (status: shipped, tracking GIG987654)
3. **ORD-9X1B** · Coach Leather Crossbody — Tan · Aisha Bello, Kano · ₦67,500 (112,500 sats) · **Disputed** · *3 days ago*. (status: disputed, dispute.reason: *"Bag arrived with a tear on the strap"*, priority: high). ★ Counts for "needs attention."
4. **ORD-2L8N** · Silk Wrap Midi Dress — Emerald · Funmi Adesina, Ibadan · ₦35,000 (58,300 sats) · **Completed** · *6 days ago*. (status: completed)
5. **ORD-5R3T** · Apple AirPods Pro 2 — Sealed · Ifeanyi Obi, Port Harcourt · ₦185,000 (308,300 sats) · **Awaiting payment** · *just now*. (status: pending_payment, expiresAt: 24h from now)
6. **ORD-3J9V** · Vintage Levi's 501 — Indigo, W32 · Bola Aremu, Lagos · ₦22,000 (36,600 sats) · **Refunded** · *2 weeks ago*. (status: refunded)

Attention strip should read: *"You have **2 orders** that need action."* with breakdown *"1 to ship · 1 disputed"*.

Chip counts: All · 6 · To ship · 1 · Shipped · 1 · Completed · 1 · Disputed · 1 · Refunded · 1.

For the DETAIL page, render the **ORD-7K3M** order in the `payment_locked` state (so the Mark Shipped form is visible). Buyer: **Tunde Bakare**, +234 803 412 5599, Lagos, address *"12 Bode Thomas Street, Surulere, Lagos"*, contact preference: Phone.

---

## What to leave out

- No buyer profile / avatar / rating. The buyer is identified by name + phone + city, nothing more.
- No chat / DM tab. NIP-17 chat is post-MVP (PRD delta #5).
- No "issue refund" button. Refunds happen via dispute flow only in MVP.
- No "cancel order" button. Orders aren't cancellable from the seller side in MVP.
- No "download invoice" button. No receipt PDF system yet.
- No bulk-select, no "mark all shipped." One order at a time.
- No status-history audit log beyond the 4-step Activity timeline. Backend has timestamps but doesn't emit fine-grained events.
- No "auto-print waybill" integration. Seller pastes tracking number manually.
- No on-page chat / message thread with the buyer. The phone number is the entire contact surface in MVP.
- No reviews surfaced here — they live on the dashboard reputation strip (screen #2).
- No revenue-this-month sum at the top. That's the dashboard's job.

---

## Deliverable

A single self-contained HTML file (`index.html`) using Tailwind via CDN, Inter font via Google Fonts, **and lucide icons via the lucide CDN** (`<script src="https://unpkg.com/lucide@latest"></script>` + `lucide.createIcons()`). Use **only** Tailwind utility classes — no inline styles, no custom CSS blocks beyond the font import. The HTML will be hand-converted to two React + TypeScript components, so:

- Structure semantically: `<header>` for headings, `<section>` for each block.
- Render **both pages in the same file**, stacked top-to-bottom, with a clear visual divider between them (a `<hr>` and a centered `text-xs uppercase tracking-wider text-ink-soft py-8` label saying *"⎯ Detail page below ⎯"*). The hand-port will split them into two files.
- For the list page: render the **populated** state (6 orders, attention strip visible) — not empty, not loading.
- For the detail page: render the **ORD-7K3M payment_locked** state — the most action-rich variant.
- Add separately-labeled commented fragments below the two pages:
  - `<!-- STATE A: list — empty (not signed up) -->`
  - `<!-- STATE A: list — empty (zero orders ever) -->`
  - `<!-- STATE A: list — empty (filter matches zero) -->`
  - `<!-- STATE A: list — loading skeleton -->`
  - `<!-- STATE B: detail — status shipped -->`
  - `<!-- STATE B: detail — status completed -->`
  - `<!-- STATE B: detail — status disputed -->`
  - `<!-- STATE B: detail — status pending_payment -->`
  - `<!-- STATE B: detail — status refunded -->`
  - `<!-- STATE B: detail — loading -->`
  - `<!-- STATE B: detail — error -->`
  - `<!-- COMPONENT B: mobile sticky action bar (sm-hidden in main render) -->`
- Do NOT design the left sidebar / AppShell — only the content area.
- Keep classes readable; avoid deeply nested clever utility chains.

Generate the HTML now.
