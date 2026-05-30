# Stitch prompt — Screen #3: Seller Listings

Design a single, production-grade page called **Seller Listings — Manage** for a Nigerian peer-to-peer marketplace named **SafeSale**. This is where a seller goes when they want to **add a new product, edit an existing one, or grab the shareable link for a listing they already published.** The same screen also serves as their inventory glance — at any moment they can see what's live, what's sold out, and what they've taken down.

The seller is a small-business owner — Instagram boutique, WhatsApp store, weekend hustle. They visit this page **2–8 times a week** to put up new stock and edit prices. Sessions are 30–90 seconds. They are on a phone 80% of the time. Information density is medium; clarity beats cleverness.

The page must do three things, in this order:

1. **Get a new listing into the world in under 90 seconds** — title, price, one or more photos, one tap to publish. A clear primary "New listing" call to action sits at the top of the page **and** as a floating sticky on mobile.
2. **Show every listing the seller owns** in a scannable grid — image, title, price, stock status, last-updated relative time — sorted newest first.
3. **Give one-tap access to the three actions the seller actually performs on each listing**: copy buyer link, edit, mark out-of-stock / un-publish.

This is **not** a public storefront page — buyers don't see it. It's not a marketing page. It's a working surface. Every number is real once wired (no fake "1,284 views").

---

## Visual direction (NON-NEGOTIABLE — same contract as screens 1, 2, 6, 7, 8)

- Inspired by **Stripe Dashboard + Shopify Products page + Paystack Inventory**. Calm, dense-but-readable, business-grade. Light mode only.
- **No** glassmorphism, neon, gradients-as-decoration, cyberpunk-crypto aesthetic. **No** Material Symbols (use lucide). **No** custom sidebar — the AppShell already provides one. **No** fake stats.
- Typography: **Inter**. Body ≥ 14px, page heading ≥ 24px, section labels ≥ 11px uppercase tracking-wide, prices ≥ 16px `tabular-nums font-semibold`.
- Soft shadows. `rounded-2xl` for major cards, `rounded-xl` for inner tiles / images, `rounded-lg` for inputs/buttons, `rounded-full` for pills.
- Generous whitespace; 8px grid. No `p-[13px]` one-offs.
- Color palette — semantic tokens ONLY, do not invent new colors:
  - `bg-surface` — page background (warm off-white)
  - `bg-background` / `bg-white` — elevated cards
  - `text-ink` — primary text
  - `text-ink-soft` — secondary text
  - `bg-brand` / `text-brand-foreground` — primary CTA (warm emerald-green)
  - `bg-brand-soft` / `text-brand-soft-foreground` — soft brand accent (active pills, "live" status)
  - `bg-amber-100` / `text-amber-800` — out-of-stock state
  - `bg-surface` / `text-ink-soft` — paused / unpublished state
  - `border-border` — neutral border
- Icons: **lucide-react only**. Suggested: `Plus`, `Copy`, `Pencil`, `MoreHorizontal`, `Search`, `PackageX`, `Eye`, `EyeOff`, `Trash2`, `Image`, `Upload`.
- Mobile-first. Must look correct from **360px → 1440px**.
- WCAG 2.1 AA. Every interactive element has a visible `focus-visible:ring-2 ring-brand` state.

---

## Page chrome — the persistent app shell (already exists, just reference)

This page renders **inside** an existing AppShell that provides:

- A left sidebar (desktop) / top tab bar (mobile) with 5 nav items: Home, Listings, Orders, Earnings, Settings.
- A top header with the page title ("Listings"), a small subtitle slot, and a right-aligned action slot.
- A top-right user menu.

You do **not** need to design the shell. Design only the **content area** that fills the AppShell, plus the **header action slot** (the right-aligned primary button at the top of the header). Assume `max-w-6xl` horizontal padding `px-4 sm:px-6 lg:px-8`, vertical `py-6 sm:py-8`, and `space-y-6` between sections. Start your output with the header-action row, then the page body.

---

## Data shape this page reads

This is non-negotiable: design only fields the React component will actually have. Inventing extra fields (views count, conversion rate, watcher count, etc.) is forbidden — they will be deleted at port time and waste your work.

Each listing on this page has exactly these fields (from `MyListing` in `src/hooks/useMyListings.ts`):

```ts
interface MyListing {
  id: string;            // Backend cuid, also Nostr 'd' tag
  title: string;
  description: string;   // Free-form, can be long
  priceNGN: number;      // Integer naira, format as ₦28,500
  images: string[];      // Real HTTPS URLs from Blossom uploads; first is the lead
  inStock: number;       // 0 = sold out / "out", positive = available
  delivery?: string;     // Optional free-form delivery line ("Lagos same-day · Nationwide 2–4 days")
  category?: string;     // Optional, e.g. "Fashion"
  publishedAt: number;   // Unix seconds — use to render "2h ago", "3 days ago", "Oct 5"
}
```

There is **no** "draft" state, **no** scheduled-publish, **no** variants list (variants exist on the backend but aren't yet rendered), **no** view counts, **no** favourites, **no** offer / discount system. If a field isn't above, don't show it.

The buyer link for any listing is **`safesale.app/buy/<listing.id>`** (the same id from the data; do NOT invent a separate slug).

---

## Page sections (in order, top → bottom)

### 0. Header action slot (lives in the AppShell header, top right)

A single primary button: **`+ New listing`** — `h-9 bg-brand text-brand-foreground rounded-lg px-3 text-sm font-semibold` with a small `Plus` icon. On mobile (`< sm`) the button stays in place; an additional **floating sticky action button** appears at the bottom of the screen — see section 5.

### 1. Subtle inventory snapshot strip (top of content area)

A single horizontal card, `rounded-2xl border border-border bg-white p-4 sm:p-5`, displaying **three small inline stats**, separated by thin vertical dividers (`w-px h-6 bg-border`). Each stat is a label-over-number pair:

- Label `text-[11px] font-medium uppercase tracking-wider text-ink-soft` on top.
- Number `text-lg font-semibold tabular-nums text-ink leading-none mt-1`.

The three stats:

1. **TOTAL LISTINGS** — count of `listings`.
2. **AVAILABLE** — count where `inStock > 0`.
3. **OUT OF STOCK** — count where `inStock === 0`. When non-zero, render the number in `text-amber-700`.

On mobile, the stats wrap to a 3-column row, still on the same card. **Do not** add a 7-day chart, recent-views graph, or any other secondary metric — this is a glance, not a dashboard.

### 2. Filter + search bar

A second card `rounded-2xl border border-border bg-white p-4`, with:

- **Left side** — a search input (`h-10 rounded-lg pl-10 pr-3 border border-border bg-surface text-sm placeholder:text-ink-soft`) with a `Search` lucide icon absolutely positioned at left-3. Placeholder: *"Search your listings"*. Filters the grid by title substring (live, no submit needed).
- **Right side** — three filter chips in a horizontal row: **All**, **Available**, **Out of stock**. Each is a `h-9 rounded-full px-3 text-xs font-medium border border-border` button; the active one is `bg-brand-soft text-brand-soft-foreground border-brand-soft`.

On mobile (`< sm`), the search input takes the full width of the card on one line, the chips wrap to a second line below it.

### 3. Listing grid — **the main surface**

A grid of listing cards. `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`. Each card is a single tile:

`rounded-2xl border border-border bg-white overflow-hidden hover:border-brand transition-colors focus-within:ring-2 focus-within:ring-brand`.

Tile anatomy, top to bottom:

- **Image area** — square `aspect-square w-full object-cover` showing `listing.images[0]`. If the seller has multiple images, render a tiny `text-[10px] font-semibold bg-black/55 text-white rounded-full px-2 py-0.5` chip in the **top-right** of the image saying e.g. `+3` (= `images.length - 1`). If `inStock === 0`, overlay a semi-opaque amber ribbon across the top-left corner: `bg-amber-100/95 text-amber-900 text-[10px] font-bold uppercase tracking-wide px-2 py-1`, reading **"OUT OF STOCK"**.

- **Body** — `p-4 space-y-1.5`:
  - **Title** — `text-sm font-medium text-ink line-clamp-2`.
  - **Price** — `text-base font-semibold text-ink tabular-nums`, formatted `₦28,500` (no decimals).
  - **Meta line** — `text-xs text-ink-soft`, combining stock status + relative published time: e.g. *"In stock · 2 days ago"* or *"Out of stock · 5 days ago"*. Use a tiny dot `·` separator. When in stock and `inStock > 1`, show *"In stock (N) · 2 days ago"* so the seller knows how many units they listed.

- **Footer row** — a slim `border-t border-border` bar with **three icon-only actions** evenly spaced, each `h-10 flex-1 inline-flex items-center justify-center text-ink-soft hover:text-ink hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand`, with a tooltip on hover. Order:
  1. `Copy` icon → "Copy buyer link" → copies `safesale.app/buy/<id>` to clipboard + shows toast.
  2. `Pencil` icon → "Edit" → opens the edit sheet (same fields as create; pre-filled).
  3. `MoreHorizontal` icon → opens a small dropdown menu with two items:
     - `Eye` + label **"View as buyer"** → navigates to `/buy/<id>` in a new tab.
     - `PackageX` if currently in stock, or `Upload` if out — **"Mark out of stock"** / **"Mark back in stock"** (toggle the `stock` tag to `out` / `1` and republish kind 30018).

These three actions are sized for thumbs; the full footer row is `h-10`, the touch targets are at least 44×44 effective. Do not nest the edit + more-menu inside a single button — three discrete tap targets.

### 4. Empty state (when the seller has no listings)

Replace the grid with a single centered block, `rounded-2xl border border-dashed border-border bg-white p-10 sm:p-14 text-center`:

- A medium `Image` lucide icon (h-8 w-8) centered in a `h-14 w-14 rounded-full bg-surface text-ink-soft` circle.
- Heading `text-base font-semibold text-ink mt-4`: **"Add your first listing"**.
- Sub `text-sm text-ink-soft mt-2 max-w-sm mx-auto`: *"Photos, price, and a title — about 90 seconds. You can edit anything later."*.
- Primary brand button `mt-5 h-11 bg-brand text-brand-foreground rounded-lg px-4 text-sm font-semibold inline-flex items-center` with a `Plus` icon: **"Create a listing"**.

When the search box has a query but produces zero matches, replace the grid with a smaller variant of this empty state: dashed border, centered text *"No listings match \"<query>\"."*, a ghost button **"Clear search"**. No icon — keep it light.

### 5. Mobile floating action button

On `< sm` only, render a `fixed bottom-6 right-6 z-30 h-14 w-14 rounded-full bg-brand text-brand-foreground shadow-lg flex items-center justify-center focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand` button with a `Plus` lucide icon. Tapping opens the same create sheet as section 0. Hide on `sm+` (the header action button is enough). Add `aria-label="New listing"`.

### 6. Create / Edit listing — sheet (sub-component, render alongside the page)

Both **+ New listing** (header button + FAB) and the per-card **Pencil** edit button open the same UI: a right-side `Sheet` on `sm+` (`sm:max-w-xl`), a bottom drawer on mobile (full width, `rounded-t-2xl`, max height 90vh, scrollable inside).

Header of the sheet:
- Title `text-base font-semibold text-ink`: **"New listing"** (create) or **"Edit listing"** (edit).
- Tiny ghost `X` close button top-right.

Body of the sheet, top to bottom, with `space-y-5 px-5 py-5`:

#### 6a. Photos uploader

Top of the body. A grid of square `aspect-square rounded-xl overflow-hidden` slots, max **4** slots, `grid grid-cols-2 sm:grid-cols-4 gap-3`:

- Each filled slot shows the photo, with a small top-right `h-7 w-7 rounded-full bg-white/85 text-ink-soft border border-border` close button (`X` icon) to remove.
- The first unfilled slot is the picker — `border border-dashed border-border bg-surface text-ink-soft hover:border-brand hover:text-ink flex flex-col items-center justify-center gap-1`, with a `Upload` lucide icon and a tiny label *"Add photo"*. Tapping opens the system file picker (multi-select).
- While a photo is uploading to Blossom, show a `Loader2 animate-spin` overlay on its tile + an opacity-60 image; while errored, replace with a small destructive state (red border, retry icon).

Below the slots, a single line of help: `text-xs text-ink-soft` — *"JPG / PNG / WebP, up to 4 photos. The first photo is the cover."*.

#### 6b. Core fields

- **Title** input (`h-11 rounded-lg`), label *"Title"*. Required. Max 80 chars. `text-sm font-medium`.
- **Price** input — number, naira. Visually: an inline `₦` glyph inside the input on the left (absolutely positioned at `left-3`), `pl-7`. Label *"Price (NGN)"*. Required. Show the computed approximate sats below in `text-[11px] text-ink-soft tabular-nums`: e.g. *"≈ 31,667 sats"* (just a hint; live conversion is not in scope of this prompt — placeholder is fine).
- **Description** textarea (`min-h-[140px] rounded-lg`), label *"Description"*, placeholder *"Condition, size, what's included, pickup or delivery details — keep it real."*. Required. Max 2000 chars; show `<chars>/2000` counter at the bottom-right of the textarea in `text-[10px] text-ink-soft` when > 1500.

#### 6c. Secondary fields (collapsed by default, behind a small disclosure)

A tiny `text-xs font-medium text-brand` button **"Optional details"** (with a small `ChevronDown` icon, rotating to `ChevronUp` when open). When expanded reveals:

- **Stock** — a small input + label "How many units do you have?" (default 1, min 0). Layout: a 3-column `grid` of buttons — `1`, `2-9` (number input appears), `Many (10+)`. Keep it simple: most sellers list one-off pieces.
- **Delivery line** — input (`h-11`), label *"Delivery"*, placeholder *"Lagos same-day · Nationwide 2–4 days"*. Optional.
- **Category** — input (free-text, `h-11`), label *"Category"*, placeholder *"Fashion, Beauty, Electronics…"*. Optional. (Single text input — no dropdown — for MVP.)

#### 6d. Footer (sticky to the bottom of the sheet)

Two buttons in a `flex justify-end gap-2 border-t border-border px-5 py-4 bg-white`. The footer stays visible while the body scrolls.

- **Cancel** — `h-11 rounded-lg border border-border bg-white text-ink hover:bg-surface px-4 text-sm font-medium`.
- **Publish** — `h-11 rounded-lg bg-brand text-brand-foreground hover:bg-brand/90 px-4 text-sm font-semibold` with a small `Send` icon. Disabled when title is empty, price ≤ 0, or no photos have finished uploading.
  - While saving to backend: text becomes *"Saving…"* with `Loader2 animate-spin`.
  - While publishing to Nostr (next step): text becomes *"Publishing…"*.
  - On error: footer shows a small `text-xs text-rose-700` line just above the buttons explaining what went wrong; buttons re-enable.

When the publish succeeds, the sheet closes, the listings grid optimistically prepends the new card, and a separate **Share listing** dialog opens (designed in section 7).

### 7. "Share your listing" dialog — appears after publish

A small modal, `max-w-md rounded-2xl bg-white p-6`, centered. Used both after a fresh publish and when the seller taps Copy from a card footer.

Contents, top to bottom:

- A small `Check` icon in a `h-9 w-9 rounded-full bg-brand-soft text-brand-soft-foreground` circle.
- Heading `text-base font-semibold text-ink mt-3`: **"Your listing is live."**.
- Sub `text-sm text-ink-soft mt-1`: *"Paste this link in your Instagram bio, WhatsApp About, TikTok — anywhere you sell."*.
- A read-only input row `mt-4`: text input filled with the URL `https://safesale.app/buy/<id>`, `pr-12`, with a `Copy` icon button absolutely positioned at `right-2`. Tapping copies + toasts *"Link copied"*.
- A row of three small **share-target buttons** below the input, each `h-10 rounded-lg border border-border bg-white hover:bg-surface px-3 inline-flex items-center gap-2 text-sm font-medium`:
  - WhatsApp (use a generic chat-bubble icon like `MessageCircle` — DO NOT use a WhatsApp brand logo, lucide doesn't ship it). Label *"Share on WhatsApp"*. Opens `https://wa.me/?text=<encoded url>` in a new tab.
  - X / Twitter (`Twitter` icon if available, else `Share2`). Label *"Share on X"*. Opens `https://twitter.com/intent/tweet?url=<encoded url>`.
  - System share (`Share2` icon). Label *"More…"*. Calls `navigator.share()` when supported, else copies to clipboard.
- A footer ghost button **"Done"** centered below, `text-sm text-ink-soft hover:text-ink`.

---

## Microcopy reference (use these exact placeholders in the default rendered state)

- Seller name (in greeting on AppShell — not on this page): **Amaka Okafor** (handle: `amaka.thrift`).
- 4 example listings in the grid (in this order so reviewers see variety):
  1. **Vintage Denim Jacket — Ralph Lauren** · ₦28,500 · In stock · 2h ago. Lead image: a folded denim jacket on a wooden surface. `+2` chip in the corner (3 images total).
  2. **Nike Air Force 1 '07 — White, UK 9** · ₦42,000 · In stock · 1 day ago. Single image.
  3. **Coach Leather Crossbody — Tan** · ₦67,500 · **Out of stock** · 4 days ago. Amber "OUT OF STOCK" ribbon on the image.
  4. **Silk Wrap Midi Dress — Emerald** · ₦35,000 · In stock · 6 days ago. Single image.
- Snapshot strip values: TOTAL 4 · AVAILABLE 3 · OUT OF STOCK 1.

---

## What to leave out

- No charts, sparklines, revenue trends. Earnings live on screen #5.
- No "promote / boost / feature" listing options. Out of MVP.
- No tagging system beyond a single free-text category input. No multi-tag picker.
- No variants UI (size matrix, colour swatches). Backend supports variants but this page doesn't surface them in MVP.
- No "duplicate listing" button. Edit covers the use case for now.
- No published-to-Nostr explainer card on this page — the seller doesn't need to be reminded what Nostr is every time they visit.
- No bulk-edit, no multi-select. One listing at a time.
- No reviews per-listing here — reviews are aggregated at the seller level (handled on dashboard).
- No `<select>`-based filters beyond the three chips. No date-range picker.

---

## Deliverable

A single self-contained HTML file (`index.html`) using Tailwind via CDN, Inter font via Google Fonts, **and lucide icons via the lucide CDN** (`<script src="https://unpkg.com/lucide@latest"></script>` + `lucide.createIcons()`). Use **only** Tailwind utility classes — no inline styles, no custom CSS blocks beyond the font import. The HTML will be hand-converted to a React + TypeScript component, so:

- Structure semantically: `<header>` for the action bar, `<section>` for each block.
- Render the **populated** state (4 listings, 1 out of stock, snapshot strip filled) — not the empty state, and not the create-sheet open. The create sheet, the share dialog, and the empty state go below the populated body as separately-labeled commented fragments:
  - `<!-- STATE: empty (no listings) -->`
  - `<!-- STATE: search-no-matches -->`
  - `<!-- COMPONENT: create-sheet (open, new) -->`
  - `<!-- COMPONENT: edit-sheet (open, pre-filled) -->`
  - `<!-- COMPONENT: share-dialog (open) -->`
  - `<!-- COMPONENT: mobile-FAB-only (sm-hidden in main render) -->`
- Do NOT design the left sidebar / AppShell — only the content area + the header action button. Start your output with the header action button row, then the page body.
- Keep classes readable; avoid deeply nested clever utility chains.

Generate the HTML now.
