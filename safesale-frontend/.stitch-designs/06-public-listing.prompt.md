# Stitch prompt — Screen #6: Public Listing (`/buy/:id`)

> Paste this verbatim into Stitch. Output goes to `.stitch-designs/06-public-listing.html`, then converted to `src/pages/PublicListing.tsx`.

---

Design a single, production-grade product detail page called **Public Listing** for a Nigerian peer-to-peer marketplace named **SafeSale**. This is the page a buyer lands on first — usually via a WhatsApp link, Instagram bio, or shared URL from the seller. They have **never used SafeSale before**, may have been scammed on social commerce in the past, and need to feel safe enough in 5 seconds to tap **Buy safely**.

The page must convince the buyer of two things, in this order:

1. **The item is real and the seller is credible.**
2. **Their money is protected by escrow — no money moves to the seller until they confirm delivery.**

The single primary action on the page is **Buy safely** → routes to `/checkout/:id`.

---

## Visual direction (NON-NEGOTIABLE)

- Inspired by **Stripe + Airbnb + Paystack**. Warm, modern, trustworthy. Light mode only.
- **No** glassmorphism, neon, gradients-as-decoration, or cyberpunk-crypto aesthetic.
- Typography: **Inter**. Tight, confident, readable. Body ≥ 14px, product title ≥ 28px mobile / 32px desktop, price ≥ 32px.
- Soft shadows. `rounded-2xl` for cards, `rounded-lg` for inputs/buttons, `rounded-xl` for image thumbnails.
- Generous whitespace; 8px grid. No `p-[13px]` one-offs.
- Color palette — semantic tokens only, do not invent new colors:
  - `bg-surface` — page background (warm off-white)
  - `bg-background` — elevated cards
  - `text-ink` — primary text
  - `text-ink-soft` — secondary text
  - `bg-brand` / `text-brand-foreground` — primary CTA (warm emerald-green)
  - `bg-brand-soft` / `text-brand-soft-foreground` — soft brand accent (used for verified pills and trust panel)
  - `border-border` — neutral border
- Icons: **lucide-react only**. Never Material Symbols, never Font Awesome.
- Mobile-first. Must look correct from **360px → 1440px**. Sticky bottom CTA on mobile.
- WCAG 2.1 AA. Every interactive element has a visible `focus-visible:ring-2 ring-brand` state.

---

## Page sections (in order, top → bottom)

### 1. Compact public header (sticky)
- Left: a tiny "← Back" link (de-emphasized, `text-ink-soft`).
- Center: the SafeSale wordmark logo (small).
- Right: two icon buttons — Heart (save) and Share2 (share). Ghost style, hover background.
- Height ~56px. Subtle bottom border, slightly translucent background with backdrop blur.

### 2. Gallery (full-width on mobile, left column on desktop ≥ 1024px)
- Primary image: square on mobile, **4:5 portrait** on desktop. `rounded-2xl`. Soft outer shadow.
- Up to 5 thumbnail tiles below the primary image in a horizontal row, each `aspect-square rounded-lg`. Active thumbnail has a 2px brand-colored border; inactive thumbnails have a transparent border that turns subtle on hover.
- Top-left of the primary image: a small floating pill showing the category (e.g., "Electronics") with `bg-brand-soft text-brand-soft-foreground`, lowercase letter-spacing, tiny shadow.

### 3. Info rail (right column on desktop, stacked below gallery on mobile)
Stack vertically with `space-y-6`:

#### 3a. Title block
- Tiny uppercase category label in brand color (e.g., "ELECTRONICS").
- Product title — 2 lines max, tight tracking, `font-semibold`.
- Price — extra large, `font-semibold`, `tabular-nums`. Format: `₦185,000`.
- One short subtle line below the price: a delivery note in `text-ink-soft text-xs`, e.g., "Ships from Lagos · 2–4 days nationwide".

#### 3b. Seller mini-card (the credibility moment)
A horizontal card, `rounded-2xl border border-border bg-background p-4`, with:
- Round avatar (48px) on the left.
- Seller name in `font-semibold`.
- Next to the name: a tiny pill **"Verified"** with a small ShieldCheck icon, `bg-brand-soft text-brand-soft-foreground`.
- Sub-row: a 5-star rating component (small, ~11px stars), the numeric rating with one decimal, "·", review count, "·", completed-orders count. All in `text-xs text-ink-soft`.
- Hover state: card background nudges to a slightly warmer tint.
- The whole card is a link to the seller's storefront `/:handle`.

#### 3c. Escrow trust panel — **THE HERO ELEMENT** of this page
A larger card, `rounded-2xl`, with a soft brand-tinted background (`bg-brand-soft`) and a hairline brand-tinted border. Padding `p-5 sm:p-6`.

Top row:
- A 40×40 brand-filled circle (`bg-brand text-brand-foreground rounded-full`) holding a `ShieldCheck` lucide icon.
- To its right: a one-line headline **"You're protected by SafeSale"** in `font-semibold text-ink`.
- Below the headline: one tight sentence in `text-sm text-ink-soft leading-relaxed`: *"Your payment is held safely until you confirm you've received your order. Full refund if anything goes wrong."*

Three-up grid below, equal columns, each a `bg-background` mini-tile with `rounded-xl px-3 py-3 flex flex-col items-center gap-1.5 text-center`:
- `Lock` icon (brand color) + label **"Held in escrow"**
- `Truck` icon (brand color) + label **"Tracked delivery"**
- `Scale` icon (brand color) + label **"Fair dispute resolution"**
Labels are `text-xs font-medium text-ink`. Tiles have a subtle 1px border.

Below the tiles, one tiny link in `text-xs text-brand font-medium`: **"How SafeSale escrow works →"** (no underline, hover underline).

#### 3d. Primary CTA (desktop only — hidden on mobile, handled by sticky bar)
A single full-width button, `h-14 rounded-lg bg-brand text-brand-foreground text-base font-semibold`. Inside: a small `Lock` icon and the label **"Buy safely"**. Soft brand-tinted shadow underneath the button. No secondary "Add to cart" — there is intentionally only one action.

#### 3e. Description
- Section heading `About this item` in `text-sm font-semibold text-ink`.
- Body paragraph in `text-sm leading-relaxed text-ink-soft`, preserving line breaks.
- Specs table below, hairline-divided two-column grid on desktop, single-column with dotted dividers on mobile. Rows:
  - **Size / variant** → "M, L, XL"
  - **In stock** → "3 available"
  - **Delivery** → "GIG Logistics · 2–4 days"
  - **Posted** → "2 days ago"

#### 3f. Reviews preview
Heading: `What buyers say about <SellerFirstName>` in `text-sm font-semibold text-ink`, with a small "See all" link at the right.

Show **2 review cards**. Each card: `rounded-xl border border-border bg-background p-4`. Inside each card:
- Header row: 28px avatar, buyer name `font-medium text-sm text-ink`, mini star rating, a small "Verified purchase" pill on the right (`bg-brand-soft/60 text-brand-soft-foreground`, ShieldCheck 12px).
- Quote: `text-sm text-ink-soft leading-relaxed` opened with a typographic curly quote.

### 4. Sticky mobile bottom CTA (visible only on screens < lg)
- Fixed to bottom, full width, `border-t border-border bg-background/95 backdrop-blur`, padding `px-4 pt-3 pb-safe`.
- Inside, two-column: small label "Price" stacked above the price (left, ~30% width), and the main **Buy safely** button filling the remaining width. Button height 48px, same brand color and Lock icon as desktop CTA.

---

## Layout grid

- Outer container max width: `max-w-5xl mx-auto`, horizontal padding `px-4 sm:px-6`.
- Below the header: `pt-4 pb-32 lg:pb-12` (extra bottom padding on mobile to clear the sticky CTA).
- Two-column grid on `lg` and up: `grid lg:grid-cols-[1.1fr,1fr] gap-10`. Stacked single column under that breakpoint with `gap-6`.

---

## Microcopy

- Title placeholder: **"iPhone 13 Pro Max — 256GB · Sierra Blue"**
- Price placeholder: **₦650,000**
- Category: **Electronics**
- Description placeholder (3 short paragraphs, plain language, no marketing fluff).
- Seller: **"Adaeze Stores"**, 4.9 ★ · 137 reviews · 213 completed orders, Verified.
- Reviews: two short authentic-sounding buyer quotes from Nigerian first names (e.g., Tunde, Chidinma).

---

## What to leave out

- No related/recommended products carousel.
- No "Add to cart" or quantity selector — buy is one item at a time for MVP.
- No live chat widget.
- No marketing footer — the page ends after reviews on mobile, with the sticky CTA covering it.

---

## Deliverable

A single self-contained HTML file (`index.html`) using Tailwind via CDN, Inter font via Google Fonts, **and lucide icons via the lucide CDN** (`<script src="https://unpkg.com/lucide@latest"></script>` + `lucide.createIcons()`). Use **only** Tailwind utility classes — no inline styles, no custom CSS blocks beyond the font import. The HTML will be hand-converted to a React + TypeScript component, so structure semantically (`<header>`, `<main>`, `<section>`, `<aside>`), keep classes readable, and avoid clever nesting tricks.
