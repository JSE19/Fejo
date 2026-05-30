# Stitch prompt — Screen #8: Buyer Order Page (`/order/:token`)

> Paste this verbatim into Stitch. Output goes to `.stitch-designs/08-buyer-order.html`, then converted to `src/pages/BuyerOrder.tsx`.

---

Design a single, production-grade page called **Buyer Order Page** for a Nigerian peer-to-peer marketplace named **SafeSale**. This is the buyer's **only surface** — they have no account, no dashboard, no app login. Every order they ever place generates a unique secret URL of the shape `safesale.app/order/[token]`, which is emailed/SMS'd to them and displayed on screen after payment. This page is what they bookmark, what they reopen days later when their package arrives, and what they return to if something goes wrong.

The page must do three things, in this order:

1. **Reassure** the buyer that their money is locked safely in escrow and nothing happens to it without their say-so.
2. **Inform** them clearly of where their order is right now — paid, shipped, delivered, completed, disputed, refunded — and what (if anything) is expected of them next.
3. **Empower** them with the two and only two actions they ever take here: *release the payment to the seller* once they're happy, or *open a dispute* if something is wrong. These appear only when the order is in a state that allows them.

The page is **state-driven** — it renders one of six visual states depending on the order's status. The same skeleton (header, hero status block, timeline, order summary, seller card, actions panel, escrow footer) is used for every state; what changes is the headline copy, the icon/color of the hero block, the active timeline step, and whether the action buttons are shown / disabled / replaced.

---

## Visual direction (NON-NEGOTIABLE)

- Inspired by **Stripe receipts + Airbnb reservation pages + Paystack transaction pages**. Warm, modern, trustworthy. Light mode only.
- **No** glassmorphism, neon, gradients-as-decoration, or cyberpunk-crypto aesthetic.
- Typography: **Inter**. Body ≥ 14px, page title ≥ 26px mobile / 30px desktop, status headline ≥ 22px, amounts ≥ 22px `tabular-nums font-semibold`.
- Soft shadows. `rounded-2xl` for major cards, `rounded-xl` for inner tiles, `rounded-lg` for inputs/buttons, `rounded-full` for pills/avatars.
- Generous whitespace; 8px grid. No `p-[13px]` one-offs.
- Color palette — semantic tokens only, do not invent new colors:
  - `bg-surface` — page background (warm off-white)
  - `bg-background` — elevated cards
  - `text-ink` — primary text
  - `text-ink-soft` — secondary text
  - `bg-brand` / `text-brand-foreground` — primary CTA (warm emerald-green)
  - `bg-brand-soft` / `text-brand-soft-foreground` — soft brand accent (verified pills, escrow trust)
  - `bg-warning-soft` / `text-warning` — disputed / awaiting-action accents (warm amber)
  - `bg-danger-soft` / `text-danger` — destructive action labels (refunded, dispute CTA secondary text)
  - `border-border` — neutral border
- Icons: **lucide-react only**. Never Material Symbols, never Font Awesome.
- Mobile-first. Must look correct from **360px → 1440px**. Below `lg`, the action buttons are pinned to a sticky bottom bar.
- WCAG 2.1 AA. Every interactive element has a visible `focus-visible:ring-2 ring-brand` state.

---

## The 6 visual states

The page accepts an `order.status` value from this state machine. Design for each:

| # | `status` | Hero icon | Hero color | Headline | Sub | Timeline active step | Action panel |
|---|---|---|---|---|---|---|---|
| 1 | `pending_payment` | `Wallet` | brand | "Awaiting your bank transfer" | "Send **₦{amount}** to the account below within 24 hours. We'll confirm automatically." | Step 1 of 4 (Paid) — pending | **Bank-transfer instruction card** (Account name "SafeSale Escrow", Bank name, 10-digit account number with one-click copy, amount, expiry countdown). No release/dispute buttons. |
| 2 | `payment_locked` | `ShieldCheck` | brand | "Your payment is locked in escrow" | "₦{amount} is held safely. The seller has been notified and will ship soon." | Step 2 of 4 (Locked) — active | Two greyed-out action buttons with a note above them: *"These activate once the seller marks your order as shipped."* |
| 3 | `shipped` | `Truck` | brand | "Your order has been shipped" | "Tracking: **{trackingNumber}** via **{carrier}**. Funds release automatically in **{X} days** if you take no action." | Step 3 of 4 (Shipped) — active | **Two active buttons** side by side: primary **"Release payment — I received my item"** (brand) and secondary **"Something's wrong — Open dispute"** (outline, danger text on hover). A tiny countdown line below: *"Auto-release in 6 days, 14 hours"*. |
| 4 | `delivered` | `PackageCheck` | brand | "Marked as delivered" | "Confirm you received your order, or let us know if there's a problem." | Step 3 of 4 (Shipped) — done, Step 4 (Released) — pending | Same two buttons as state 3. |
| 5 | `completed` | `CheckCircle2` | brand | "Payment released — order complete" | "Thank you. ₦{amount} has been sent to the seller. A receipt is in your email." | All 4 steps done; final step lit | **No action buttons.** Instead, a small "Leave a review" mini-prompt with 5 outline-star buttons and a brand "Submit review" CTA. (For now, submit is a `// TODO` — wires to kind 1985 later.) |
| 6 | `disputed` | `Scale` | warning | "Dispute opened — under review" | "Your funds are frozen. A SafeSale mediator will respond within 48 hours. You can message the seller directly below." | Step 3 of 4 (Shipped) — done, branch to **Disputed** | **Dispute summary card** — reason, your description, photos (placeholder grid), opened-on date, current dispute status pill (`direct_resolution` / `escalated` / `mediating` / `resolved`). A muted secondary CTA "Cancel dispute" (only if status is `direct_resolution`). |
| 7 | `refunded` | `Undo2` | danger | "Refund issued" | "₦{amount} has been returned to your bank account. Allow 1–2 business days." | Final state | No actions. |

Use the **same hero block, same timeline structure, same overall layout** for all 7 — only the visible content swaps. This is critical: the buyer learns the layout once and feels at home in every revisit.

In the Stitch deliverable, **render state #3 (`shipped`)** as the default visible state, since it's the most representative (both action buttons visible, timeline mid-progress, sticky CTA on mobile). Place small comment markers like `<!-- STATE: pending_payment -->`, `<!-- STATE: payment_locked -->`, etc., next to commented-out HTML fragments at the bottom of the file showing the hero+actions variant for each other state, so the React conversion has all of them.

---

## Page sections (in order, top → bottom)

### 1. Compact public header (sticky)

- Left: SafeSale wordmark logo (small).
- Right: a tiny `Headphones` icon button labeled "Help" → links to `/help` (placeholder href "#"). Ghost style.
- Height ~56px. Subtle bottom border, slightly translucent background with backdrop blur.
- **No** back arrow (this is a destination URL, not part of a flow), **no** account menu (buyer has no account).

### 2. Order ID strip

Just below the header, full-width band with `bg-background border-b border-border py-2`:
- Left: tiny `text-xs text-ink-soft`: "Order **SS-7421**" (the `shortId`, monospaced) · "Placed Mar 14, 2:42 PM"
- Right: a small ghost button **"Copy order link"** with a `Copy` icon.

### 3. Hero status block — **THE LANDING MOMENT**

A single large card, `rounded-2xl`, padding `p-6 sm:p-8`, with:
- Background: `bg-brand-soft` for brand states; `bg-warning-soft` for disputed; `bg-danger-soft` for refunded.
- Hairline border in the matching token color.
- Left: a **56×56 brand-filled circle** holding the state icon from the table above (`bg-brand text-brand-foreground` for brand states; `bg-warning text-warning-foreground` for disputed; `bg-danger text-danger-foreground` for refunded).
- Right of the icon: stacked headline + sub. Headline `text-xl sm:text-2xl font-semibold text-ink`. Sub `text-sm sm:text-base text-ink-soft leading-relaxed` with **bolded** key tokens (amount, tracking number, countdown).
- Below the headline row (only for `shipped`/`delivered`): a tiny brand-tinted countdown chip — `Clock` icon + monospace "**6d 14h 22m** until auto-release" — `bg-background/70 text-xs px-3 py-1 rounded-full inline-flex items-center gap-1.5`.

### 4. Visual status timeline

A horizontal 4-step timeline below the hero (centered on mobile, full-width on desktop). Each step:
- A 28px circle: filled brand for done steps, outlined brand for active, plain `border-border bg-background` for pending. Done circles contain a `Check` icon; active contains the step number; pending contains the step number in muted ink.
- Below the circle: tiny label in `text-xs font-medium`, `text-ink` if done/active, `text-ink-soft` otherwise.
- Steps in order: **1. Paid** · **2. Locked** · **3. Shipped** · **4. Released**.
- Connector lines between circles: 2px tall, brand-colored for completed segments, `border-border` (dashed allowed) for pending.
- For the **disputed** branch: the line after step 3 splits into a small downward branch to a 5th amber-tinted node labeled **"Disputed"**. This branch is only rendered when `status === 'disputed'`.

### 5. Order summary card

`rounded-2xl border border-border bg-background p-5 sm:p-6 space-y-5`. Inside:

- **Top row:** product thumbnail on the left (`aspect-square w-20 rounded-xl object-cover`), product title + variant + price stacked on the right. Price `text-xl font-semibold tabular-nums`.
- Hairline divider.
- **Pricing rows** (two-column, `tabular-nums`, `text-sm`):
  - Item: ₦185,000
  - Delivery: ₦0 *(or actual fee)*
  - SafeSale fee: ₦0 *("Free during launch")*
  - Total (in `text-ink font-semibold`): ₦185,000
- Hairline divider.
- **Delivery details** block — `text-sm`:
  - "Shipping to" label in `text-ink-soft`, then on the next line in `text-ink`: the buyer's name, phone, city, and address (multi-line, if address provided).
  - For `shipped`/`delivered`/`completed`/`disputed` states, an additional row below: a small `Truck` icon, `Tracking: <number>` (monospaced), then in `text-ink-soft`: `· <carrier>`. If `trackingNumber` is missing, omit this row.

### 6. Seller mini-card

A horizontal card, `rounded-2xl border border-border bg-background p-4`, with:
- Round avatar (44px) on the left.
- Seller name in `font-semibold`. Next to the name, a tiny pill **"Verified"** with a `ShieldCheck` 12px icon, `bg-brand-soft text-brand-soft-foreground`.
- Sub-row: "Lagos, NG · 4.9 ★ (137 reviews) · 213 orders completed" in `text-xs text-ink-soft`.
- Right side: a tiny ghost icon button `MessageCircle` labeled "Message" — opens a placeholder modal (or routes to `/chat/{order.shortId}`, href "#" for now).
- The whole card (except the message button) is a link to the seller's storefront `/<seller-handle>`.

### 7. Action panel — **THE BUYER'S TWO MOMENTS**

For **state #3 (`shipped`)** (the default we're rendering):

Wrap in a `rounded-2xl border border-border bg-background p-5 sm:p-6 space-y-4`. Inside:
- A small caption in `text-xs uppercase tracking-wide text-ink-soft`: "Your decision".
- **Primary button (full width on mobile, auto on desktop):** `h-12 rounded-lg bg-brand text-brand-foreground font-semibold text-base`, content: small `ShieldCheck` icon + label **"Release payment — I received my item"**. Soft brand-tinted shadow.
- **Secondary button:** `h-12 rounded-lg bg-background border border-border text-ink font-medium text-base hover:border-danger hover:text-danger transition-colors`, content: small `AlertTriangle` icon + label **"Something's wrong — Open dispute"**.
- Layout: stacked full-width on mobile; on `sm+`, two-column 70/30 with primary on the left.
- Below the buttons, a tiny note in `text-xs text-ink-soft leading-relaxed`: *"Releasing payment is final. Funds go to the seller's Lightning wallet and the transaction completes. Auto-release in **6d 14h 22m** if you take no action."*

For **state #2 (`payment_locked`)**: same panel, both buttons present but `disabled` (opacity-60, no hover effect), with a note **above** them in `text-sm text-ink-soft`: *"These activate once the seller marks your order as shipped. You'll receive an email and an in-page update."*

For **state #1 (`pending_payment`)**: replace the panel with the **Bank-transfer instruction card** (see below).

For **state #5 (`completed`)**: replace the panel with the **Leave a review prompt** (see below).

For **state #6 (`disputed`)**: replace the panel with the **Dispute summary card** (see below).

For **state #7 (`refunded`)**: no panel.

### 7a. Bank-transfer instruction card (state #1)

`rounded-2xl bg-brand-soft border border-brand-soft-foreground/15 p-5 sm:p-6 space-y-4`:
- Heading row: `Wallet` icon (brand) + `text-sm font-semibold text-ink`: "Send your payment to this account".
- Three-row mini-table, each row a flex with label on the left (`text-xs text-ink-soft uppercase tracking-wide`) and value on the right (`text-base font-semibold text-ink tabular-nums`):
  - BANK · "Access Bank"
  - ACCOUNT NUMBER · "0123456789" + a `Copy` icon button
  - AMOUNT · "₦185,000" + a `Copy` icon button
- A subtle countdown line below: `Clock` icon + `text-xs text-ink-soft`: *"Account expires in **23h 12m**. Use your normal banking app — no special instructions needed."*
- A subtle note at the bottom in `text-xs text-ink-soft leading-relaxed`: *"Once your transfer is confirmed (usually under 60 seconds), this page will update automatically and your payment will be locked in escrow."*

### 7b. Leave-a-review prompt (state #5)

`rounded-2xl border border-border bg-background p-5 sm:p-6 space-y-4`:
- Heading: `text-sm font-semibold text-ink`: "How was your experience with **{seller.name}**?"
- 5 outline `Star` icons in a row, large (32×32), spaced `gap-2`, each a button that fills brand color when hovered/clicked.
- A `Textarea` (3 rows) with placeholder: *"What stood out? (Optional)"*.
- A primary brand button **"Submit review"** (full width on mobile, auto right-aligned on desktop). `// TODO: wire to publish kind 1985 Nostr event`.

### 7c. Dispute summary card (state #6)

`rounded-2xl border border-warning-soft bg-warning-soft/40 p-5 sm:p-6 space-y-4`:
- Heading row: `Scale` icon (warning color) + `text-sm font-semibold text-ink`: "Dispute opened **Mar 16, 9:14 AM**" + small pill on the right with the dispute status (`bg-warning text-warning-foreground` for `direct_resolution` / `escalated` / `mediating`, `bg-brand text-brand-foreground` for `resolved`).
- A two-column readout (stacks on mobile):
  - **Reason** · "Item not as described"
  - **Your description** · multi-line quote
- A "Photos you submitted" grid — 3 placeholder thumbnails (`aspect-square rounded-lg border border-border bg-surface`).
- A subtle line: *"A mediator will respond within 48 hours. You'll be notified by email and on this page."*
- Below the card, **outside it**, a single muted ghost button **"Cancel dispute"** — small, `text-ink-soft hover:text-danger`. Conditionally shown only when dispute status is `direct_resolution`.

### 8. Escrow trust footer

A subtle, non-card horizontal strip at the bottom of the main content (above the sticky bar on mobile), padded `py-6`. Inside, centered, `text-xs text-ink-soft` with a small `ShieldCheck` icon:

*"Your payment is held by SafeSale's escrow — neither party can withdraw without the other's consent or a mediator's decision. **How escrow works →**"*

### 9. Sticky mobile bottom action bar (visible only on screens `< lg`, only for states with active actions)

Fixed to bottom, full width, `border-t border-border bg-background/95 backdrop-blur`, padding `px-4 pt-3 pb-safe`. Inside, for `shipped` / `delivered`:
- Two stacked buttons (full width each, `gap-2`): primary brand **"Release payment"** on top, outline **"Open dispute"** below it.

For `pending_payment`: a single full-width disabled button reading **"Waiting for your transfer…"** with a small spinner icon.

For all other states: bar is omitted entirely (no sticky bar).

### 10. Release confirmation modal (Dialog, hidden by default — render the markup at the bottom of the file with a `<!-- DIALOG: release-confirm -->` marker)

A centered modal, `rounded-2xl bg-background p-6 sm:p-7 max-w-md`. Inside, stacked:
- Top: a 48×48 brand-filled circle with `ShieldCheck`.
- Heading: `text-lg font-semibold`: "Release **₦185,000** to **Adaeze Stores**?"
- Body in `text-sm text-ink-soft leading-relaxed`: *"This is final. The seller will receive payment instantly and the order will be marked complete. Only confirm if you have received your item and you're satisfied with it."*
- Two stacked-then-side-by-side buttons: ghost **"Cancel"** + brand **"Yes, release payment"**.

### 11. Open-dispute modal (Dialog, hidden by default — render at the bottom with `<!-- DIALOG: open-dispute -->`)

A centered modal, `rounded-2xl bg-background p-6 sm:p-7 max-w-lg`. Inside:
- Top: a 48×48 warning-filled circle with `AlertTriangle`.
- Heading: `text-lg font-semibold`: "Open a dispute".
- Sub: `text-sm text-ink-soft`: *"Your funds will be frozen and a mediator will be involved. Be specific — both the seller and a SafeSale mediator will read this."*
- A **RadioGroup** labeled "What's the problem?" with options:
  - "Item didn't arrive"
  - "Item is damaged"
  - "Item is not as described"
  - "Wrong item received"
- A `Textarea` (4 rows) labeled "Describe what happened" with placeholder *"What did you expect vs. what you received? Be as specific as you can."*
- A small file-drop zone labeled "Add photos (optional, up to 5)" — show 3 placeholder `+` tiles. (`// TODO: wire to useUploadFile` later.)
- Two buttons at the bottom: ghost **"Cancel"** + warning-colored **"Submit dispute"** (a warm amber, not red — disputes aren't punishment).

---

## Layout grid

- Outer container `max-w-3xl mx-auto`, horizontal padding `px-4 sm:px-6`.
- Below the header strip: `pt-6 pb-32 lg:pb-12 space-y-6` (extra bottom padding on mobile to clear the sticky bar).
- **Single column.** This page is intentionally narrow and linear — no sidebars, no two-up grids. The buyer reads top to bottom.

---

## Microcopy reference (use these exact placeholder values in the rendered state #3)

- Order short ID: **SS-7421**
- Placed: **March 14, 2026 · 2:42 PM**
- Product title: **iPhone 13 Pro Max — 256GB · Sierra Blue**
- Variant: **256GB · Sierra Blue**
- Price: **₦185,000**
- Seller: **Adaeze Stores** (Verified, Lagos NG, 4.9 ★ · 137 reviews · 213 orders)
- Buyer shipping: **Tunde Adebayo · 0809 421 7783 · Lekki Phase 1, Lagos · House 14B, Admiralty Way**
- Tracking: **GIG23981726NG** via **GIG Logistics**
- Countdown: **6d 14h 22m**
- Bank (for state #1): **Access Bank · 0123456789 · SafeSale Escrow**
- Account expiry (state #1): **23h 12m**
- Dispute opened (state #6): **March 16, 2026 · 9:14 AM**, reason "Item not as described"

---

## What to leave out

- No related/recommended products.
- No upsells, no "Buy again", no "Browse SafeSale" CTAs.
- No social-share buttons.
- No live chat widget (the seller-message button is a placeholder).
- No marketing footer — the page ends after the escrow trust strip on mobile, with the sticky bar covering it.
- No login button, no account menu, no "Sign up to save your orders" prompts. The buyer **does not** and **will not** have an account.

---

## Deliverable

A single self-contained HTML file (`index.html`) using Tailwind via CDN, Inter font via Google Fonts, **and lucide icons via the lucide CDN** (`<script src="https://unpkg.com/lucide@latest"></script>` + `lucide.createIcons()`). Use **only** Tailwind utility classes — no inline styles, no custom CSS blocks beyond the font import. The HTML will be hand-converted to a React + TypeScript component, so:

- Structure semantically: `<header>`, `<main>`, `<section>`, `<article>`.
- Render **state #3 (`shipped`)** as the default visible state.
- At the bottom of the `<body>`, include commented-out HTML fragments for the hero + actions panel of each other state (`pending_payment`, `payment_locked`, `delivered`, `completed`, `disputed`, `refunded`), each labeled with `<!-- STATE: <name> -->`.
- At the bottom of the `<body>`, also include both modals as commented-out HTML, labeled `<!-- DIALOG: release-confirm -->` and `<!-- DIALOG: open-dispute -->`.
- Keep classes readable; avoid deeply nested clever utility chains.
