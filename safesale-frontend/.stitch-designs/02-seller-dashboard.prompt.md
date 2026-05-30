# Stitch prompt — Screen #2: Seller Dashboard Home (`/app`)

> Paste this verbatim into Stitch. Output goes to `.stitch-designs/02-seller-dashboard.html`, then converted to `src/pages/app/DashboardHome.tsx`.

---

Design a single, production-grade page called **Seller Dashboard Home** for a Nigerian peer-to-peer marketplace named **SafeSale**. This is the first thing a seller sees after signing up — a small-business owner running an Instagram boutique or WhatsApp store. They will be on this page for ~20 seconds at a time, multiple times a day, to answer one question: *"Is there anything I need to do right now?"*

The page must do three things, in this order:

1. **Tell them at a glance** how their business is doing today — money locked, money paid out, orders waiting.
2. **Surface anything that needs them** — orders awaiting shipment, disputes, payment-locked orders to acknowledge — as a single prioritised list.
3. **Get them to the next action in one tap** — create a new listing, view orders, copy their shop link to send to a new buyer.

This is **not** a marketing page, **not** a settings page, and **not** a tutorial. It's a working surface that respects the seller's time. Information density is high but not noisy. Every number is real (when wired) and links somewhere useful.

The seller's identity is their Nostr keypair (generated in the browser at onboarding); their npub is their shareable profile, their handle is their shop URL. They reach this page after signing up; before that, marketing pages live elsewhere.

---

## Visual direction (NON-NEGOTIABLE)

- Inspired by **Stripe Dashboard + Paystack Dashboard + Shopify Home**. Calm, dense-but-readable, business-grade. Light mode only.
- **No** glassmorphism, neon, gradients-as-decoration, or cyberpunk-crypto aesthetic.
- Typography: **Inter**. Body ≥ 14px, KPI numbers ≥ 28px `tabular-nums font-semibold`, page heading ≥ 24px, section labels ≥ 11px uppercase tracking-wide.
- Soft shadows. `rounded-2xl` for major cards, `rounded-xl` for inner tiles, `rounded-lg` for inputs/buttons, `rounded-full` for pills/avatars.
- Generous whitespace; 8px grid. No `p-[13px]` one-offs.
- Color palette — semantic tokens only, do not invent new colors:
  - `bg-surface` — page background (warm off-white)
  - `bg-background` — elevated cards
  - `text-ink` — primary text
  - `text-ink-soft` — secondary text
  - `bg-brand` / `text-brand-foreground` — primary CTA (warm emerald-green)
  - `bg-brand-soft` / `text-brand-soft-foreground` — soft brand accent (verified pills, escrow)
  - `bg-warning-soft` / `text-warning` — amber for "needs your attention" rows (awaiting ship, dispute)
  - `bg-danger-soft` / `text-danger` — red for refunds and destructive states
  - `border-border` — neutral border
- Icons: **lucide-react only**. Never Material Symbols, never Font Awesome.
- Mobile-first. Must look correct from **360px → 1440px**.
- WCAG 2.1 AA. Every interactive element has a visible `focus-visible:ring-2 ring-brand` state.

---

## Page chrome — the persistent app shell (already exists, just reference)

This page renders **inside** an existing AppShell component that provides:
- A left sidebar (desktop) / top tab bar (mobile) with 5 nav items: Home, Listings, Orders, Earnings, Settings.
- A top-right user menu (avatar + handle + logout) that's already styled.

You do **not** need to design the shell. Design only the **content area** that fills the AppShell. Assume `max-w-6xl` horizontal padding `px-4 sm:px-6 lg:px-8`, vertical `py-6 sm:py-8`, and `space-y-6` between sections. Start your output with the welcome banner.

---

## Page sections (in order, top → bottom)

### 1. Welcome banner — **THE 5-SECOND ANSWER**

A single horizontal card, `rounded-2xl border border-border bg-background p-5 sm:p-6`, two columns on `sm+`, stacked on mobile:

**Left column** (flexible width):
- Greeting line in `text-sm text-ink-soft`: *"Welcome back,"*.
- Name line in `text-2xl sm:text-3xl font-semibold text-ink leading-tight`: **"Amaka 👋"** (use the seller's first name; emoji optional, but include in the placeholder).
- Sub-line in `text-sm text-ink-soft mt-1`: *"You have **3 orders waiting to ship**. The oldest is from 6 hours ago."* — bold the number. The whole phrase is dynamic based on the prioritised work list (see section 3); if there's nothing waiting, fall back to: *"You're all caught up. Time to share your shop link?"*.

**Right column** (auto width, right-aligned on `sm+`, full-width below on mobile):
- A pair of buttons side by side:
  - Primary brand button — `h-11 rounded-lg bg-brand text-brand-foreground font-semibold text-sm px-4`, with `Plus` lucide icon: **"New listing"** → routes to `/app/listings/new`.
  - Outline button — `h-11 rounded-lg border border-border bg-background text-ink font-medium text-sm px-4`, with `Copy` lucide icon: **"Copy shop link"** → copies `safesale.app/<handle>` and shows a toast.

### 2. KPI tiles — **the at-a-glance row**

A grid of **4 cards**: `grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4`. Each card is `rounded-2xl border border-border bg-background p-5`.

Inside each card, top-to-bottom:
- A tiny label row: a `text-[11px] font-medium uppercase tracking-wide text-ink-soft` label on the left with a small (16px) lucide icon. e.g. `Wallet` icon + "LOCKED IN ESCROW".
- A big number on its own line: `text-3xl font-semibold text-ink tabular-nums leading-none mt-3`. Format NGN as `₦185,000` (no decimals); counts as plain integers.
- A tiny sub-line below: `text-xs text-ink-soft mt-1.5` with a small trend chip when applicable (a small `bg-brand-soft text-brand-soft-foreground rounded-full px-1.5 py-0.5 text-[10px] font-semibold` showing e.g. `+12%`).

The 4 KPIs, in order:
1. **LOCKED IN ESCROW** — `Lock` icon — sum of `amountNGN` across orders with status `payment_locked`, `shipped`, `delivered`, `disputed`. Sub: *"Across 7 active orders"*.
2. **PAID OUT THIS WEEK** — `Wallet` icon — sum of `amountNGN` across orders with status `completed` from the last 7 days. Sub: green trend chip `+12% vs last week`.
3. **ORDERS TO SHIP** — `Truck` icon — count of orders with status `payment_locked`. Sub: *"Oldest 6h ago"* — coloured `text-warning` if > 0, plain `text-ink-soft` if 0.
4. **ACTIVE LISTINGS** — `Tag` icon — count from `useMyListings()`. Sub: a small link `View all →` in `text-brand`.

When any KPI is zero, render the big number as a plain `0` (still `text-3xl`, no special muting), and the sub-line as a friendly nudge: e.g. for ORDERS TO SHIP at 0 → *"All caught up 🎉"*.

### 3. Needs your attention — **the prioritised work list**

A single card, `rounded-2xl border border-border bg-background overflow-hidden`. Header row inside the card, padding `p-5`, flex justify-between:
- Left: small heading `text-sm font-semibold text-ink`: **"Needs your attention"** with a tiny lucide `AlertCircle` icon (warning color) when the list is non-empty.
- Right: tiny ghost link `text-xs font-medium text-brand` saying **"View all orders →"** linking to `/app/orders`.

Below the header, a divided list (use `divide-y divide-border`), max **5 rows visible**, scroll within after that on mobile. Each row is `flex items-center gap-4 px-5 py-4`, with:
- **Left: tiny avatar** — 36px round, deterministic gradient placeholder (seller side — the buyer's name initial in a coloured circle).
- **Middle: stacked text**:
  - Top line: `text-sm font-medium text-ink` — buyer first name + product title abbreviated to 30 chars, e.g. *"Tunde — iPhone 13 Pro Max 256GB"*.
  - Sub line: `text-xs text-ink-soft` — combine: amount in NGN + small dot separator + relative time, e.g. *"₦185,000 · 6h ago"*.
- **Right: action button** — sized `h-9 px-3 rounded-lg text-xs font-semibold`. Color depends on row type:
  - `payment_locked` (needs shipping) → primary brand: **"Mark shipped →"** → routes to `/app/orders/<id>`.
  - `disputed` → amber outline (`border-warning text-warning bg-warning-soft`): **"Respond →"** → routes to `/app/orders/<id>`.
  - `shipped` waiting on buyer release → ghost: **"Nudge buyer"** (disabled if not yet eligible; we'll wire this later).

**Empty state** (no rows): replace the list with a `py-12 px-6 text-center` block — a small `Sparkles` lucide icon centered, a `text-sm font-medium text-ink` line **"You're all caught up"**, a `text-xs text-ink-soft` sub *"New orders will show up here as soon as buyers pay."*, and a small ghost button **"Copy shop link to share"** with a `Copy` icon.

### 4. Two-up: Recent orders + Listings preview

Below the "needs your attention" card, a 2-column grid on `lg+`, stacked on smaller. `grid gap-6 lg:grid-cols-2`.

#### 4a. Recent orders card (left column)

`rounded-2xl border border-border bg-background overflow-hidden`. Header `p-5` with heading **"Recent orders"** and small "View all" link to `/app/orders` (same style as section 3 header). Body: a tight table-like list (use `divide-y divide-border`), **5 rows max**, each row is `flex items-center justify-between gap-3 px-5 py-3 text-sm`:
- Left: stacked — first line `text-sm font-medium text-ink truncate` (product title), second line `text-xs text-ink-soft` (buyer name + " · " + relative time, e.g. *"Tunde Adebayo · 2h ago"*).
- Right: amount `text-sm font-semibold tabular-nums text-ink` (e.g. `₦185,000`), then a small status pill below it (right-aligned, `text-[10px] font-semibold uppercase tracking-tight px-2 py-0.5 rounded-full`):
  - `payment_locked` → `bg-brand-soft text-brand-soft-foreground` "LOCKED"
  - `shipped` → `bg-brand-soft text-brand-soft-foreground` "SHIPPED"
  - `delivered` → `bg-brand-soft text-brand-soft-foreground` "DELIVERED"
  - `completed` → `bg-secondary text-ink-soft` "COMPLETED"
  - `disputed` → `bg-warning-soft text-warning` "DISPUTED"
  - `refunded` → `bg-danger-soft text-danger` "REFUNDED"

Whole row is a `<Link>` to `/app/orders/<id>` with `hover:bg-surface` on the row.

#### 4b. Listings preview card (right column)

`rounded-2xl border border-border bg-background overflow-hidden`. Header `p-5` with heading **"Your listings"** and link **"Manage →"** to `/app/listings`. Body: a 2-column grid `grid grid-cols-2 gap-3 p-4`, showing **up to 4 listings** as compact tiles. Each tile:
- `rounded-xl border border-border overflow-hidden bg-background hover:border-brand transition-colors`
- A square image area on top (`aspect-square w-full object-cover`) — first listing image.
- A `p-3` info block below — listing title in `text-sm font-medium text-ink line-clamp-2` and price in `text-sm font-semibold text-ink tabular-nums mt-1`.

If the seller has fewer than 4 listings, fill the remaining tile with an **empty-creator tile**: same dimensions, dashed border (`border-dashed`), centered `Plus` icon + `text-xs font-medium text-ink-soft` label **"New listing"** + linked to `/app/listings/new`. This is the only non-image tile.

If the seller has zero listings, replace the whole card body with a centered empty state matching section 3's empty state pattern, but with copy: heading *"No listings yet"*, sub *"Your first listing takes about 2 minutes — title, price, photo, done."*, and a primary brand button **"Create your first listing"** routing to `/app/listings/new`.

### 5. Reputation strip — **the only proactive nudge**

A subtle horizontal card, `rounded-2xl border border-border bg-brand-soft/40 p-5 sm:p-6` with a left-stacked layout on mobile, two-column on `sm+`:

- Left:
  - Tiny label `text-[11px] font-semibold uppercase tracking-wide text-brand-soft-foreground`: **"YOUR REPUTATION"**.
  - Two-up stat row, `flex items-baseline gap-4 mt-2`:
    - 5 `Star` icons (filled brand color), then in `text-xl font-semibold text-ink tabular-nums`: **"4.9"**, then `text-xs text-ink-soft` *"average rating"*.
    - A faint vertical separator (a `w-px h-5 bg-border`), then `text-xl font-semibold text-ink tabular-nums`: **"312"**, then `text-xs text-ink-soft` *"reviews"*.
  - Sub-line in `text-xs text-ink-soft mt-2`: *"Your reputation lives on Nostr — buyers can verify it from any client."*.

- Right: a single ghost button **"Share my reputation link"** with a `Share2` icon, copies the seller's `npub` (URL form) and shows a toast.

If the seller is brand new (0 reviews), replace the stat row with: `Sparkles` icon + `text-sm font-medium text-ink` *"Your reputation will appear here after your first completed sale."* and hide the share button.

---

## Layout grid

- Outer wrapper handled by AppShell. Use `space-y-6` between top-level sections.
- KPI grid: `grid grid-cols-2 lg:grid-cols-4 gap-4`.
- Two-up section: `grid gap-6 lg:grid-cols-2`.
- All cards use the same rounding (`rounded-2xl`), the same hairline border, the same elevated bg.
- The page should comfortably fill a 14" laptop without feeling stretched, and read top-to-bottom on a phone in a single column with no horizontal scroll.

---

## Microcopy reference (use these exact placeholders in the default rendered state)

- Seller name placeholder: **Amaka Okafor** (greeting shows "Amaka 👋")
- Shop handle: **amaka.thrift** → URL `safesale.app/amaka.thrift`
- KPIs:
  - Locked in escrow: **₦1,287,500** · "Across 7 active orders"
  - Paid out this week: **₦742,300** · trend chip *"+12% vs last week"*
  - Orders to ship: **3** · *"Oldest 6h ago"*
  - Active listings: **12** · link *"View all →"*
- "Needs your attention" rows (3 visible):
  1. Tunde · *iPhone 13 Pro Max — 256GB* · ₦450,000 · 6h ago · `payment_locked` → "Mark shipped"
  2. Chidinma · *Vintage Denim Jacket* · ₦28,500 · 1d ago · `payment_locked` → "Mark shipped"
  3. Bayo · *Air Force 1 White Size 9* · ₦42,000 · 3d ago · `disputed` → "Respond"
- Recent orders (5 visible, mix of statuses).
- Listings preview: 4 placeholder products (Jacket, AF1, iPhone case, Skincare set). The 4th tile may be the empty-creator tile.
- Reputation: 4.9 ★ · 312 reviews.

---

## What to leave out

- No marketing language, no "how SafeSale works" embedded explainer, no testimonials. The seller has already signed up.
- No revenue charts or sparklines — out of MVP scope, and they'd compete with the KPI tiles for attention.
- No "upgrade to Pro" cards, no tier indicators, no quotas.
- No notifications bell, no in-app inbox surface — the "Needs your attention" list IS the inbox.
- No live chat widget.

---

## Deliverable

A single self-contained HTML file (`index.html`) using Tailwind via CDN, Inter font via Google Fonts, **and lucide icons via the lucide CDN** (`<script src="https://unpkg.com/lucide@latest"></script>` + `lucide.createIcons()`). Use **only** Tailwind utility classes — no inline styles, no custom CSS blocks beyond the font import. The HTML will be hand-converted to a React + TypeScript component, so:

- Structure semantically: `<header>` for the welcome banner, `<section>` for each block.
- Render the **populated** state (KPIs filled, attention list with 3 rows, 4 listing tiles, reputation populated) — not the empty state.
- At the bottom of the `<body>`, include commented-out HTML fragments for: empty "Needs your attention" state, empty listings state, and zero-reputation state, each labeled `<!-- STATE: empty-<name> -->`.
- Do NOT design the left sidebar / AppShell — only the content area. Start your output with the welcome banner.
- Keep classes readable; avoid deeply nested clever utility chains.
