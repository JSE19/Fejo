# SafeSale — Redesign Progress Checkpoint

> **Purpose:** track the page-by-page UI/UX redesign of SafeSale. Each page goes through:
> **(a)** detailed Stitch design prompt → **(b)** Stitch generates HTML → **(c)** convert to a React + TypeScript + Tailwind + shadcn/ui component wired to existing hooks.
>
> Update this file whenever a page moves status. Commit immediately after a status change.

---

## 🚨 4-day demo countdown — Hack4Freedom plan (added Day 1)

Submission deadline: **4 days from 2026-05-23**. Realistic working window ≈ 50–60 hours. Plan is aggressively scoped to prefer reliability + a clean pitch over feature breadth.

### Daily plan

**Day 1 (today) — verify + design #5 in parallel**

- [x] **Round 1 demo-blocking bug fixes** (commit `ccf70d9`): AppShell sidebar real seller; honest Bitnob disclaimer on Checkout; PublicListing fixture fallback killed; Landing previews labelled "Example."
- [x] **Round 2 Landing fix** (commit `a89ce1c`): removed the over-aggressive auto-redirect; CTA buttons are now session-aware via `useCallToAction`.
- [x] **Round 3 demo-blocking bug fixes** (this commit):
  - **Multi-account contamination** (the critical one). Onboarding's both submit paths (open new shop + sign in with existing nsec) now clear every existing Nostrify login + the previous `currentSeller` + the relevant TanStack caches (`my-listings`, `seller-orders`) before adding the new login. Previously, creating a second shop on the same browser left the old login as `users[0]` (Nostrify treats logins as an array; `useCurrentUser` returns the first), so the sidebar showed the new shop name while the listings query ran against the old key and surfaced the old shop's products — genuine trust bug across accounts.
  - **AppShell trust check.** Renders the seller record only when its stored npub matches the active login's pubkey. A stale `currentSeller` from a previous session no longer paints the wrong name in the sidebar.
  - **MarketingLayout header is session-aware.** Logged out → "Sign in" + "Start selling." Logged in → avatar + "Go to dashboard." The "Sign in" button no longer appears after login. Mobile menu mirrors the same logic.
  - **Mediator removed from public nav + footer.** Was leaking an "internal admin tools visible to anyone" impression at exactly the wrong moment.
  - **`/admin` route gated by `MediatorGate`** (new component at `src/components/safesale/MediatorGate.tsx`). Reads `VITE_MEDIATOR_NPUB` (already in `.env.example`), compares against the active user's pubkey. Three branches: signed-out → "sign in as mediator" message; wrong-account → "switch accounts" message; mediator → renders children. Misconfiguration denies — never opens by default.
  - **AppShell Logo + "Home" sub-link.** Logo links to `/app` (unchanged); a small `← Home` link to its right in the sidebar header gives sellers a one-click path back to Landing.
  - **FinalCTA hidden when signed in.** "Start selling without fear today" is noise to existing sellers; hiding prevents accidental second-account creation.
  - **TrustStrip rewritten as honest marquee.** Replaced fabricated vanity stats (`12.4k sellers`, `₦2.4B protected`, etc.) with genuine brand-pillar messages that don't pretend to be live metrics. Continuous CSS marquee, `motion-safe` only (respects `prefers-reduced-motion`). Hero's matching fake-stats line replaced with truthful value props.
  - **FAQ rewritten honestly.** Previous answers promised LN payout in 60s (not wired), 1.5% fees (not implemented), card payments (not supported). New answers explicitly say what's deferred to post-hackathon, what's mocked, and what's cryptographically real today. Added a "why Nostr + Cashu" answer that's basically the pitch.
- [ ] **Integration smoke test against live Railway.** Re-test the seller flow against `https://safe-sales-backend-production.up.railway.app` after this round.
- [ ] **Coordinate with Joy on three decisions:** demo-mode payment trigger; Lightning payout scope; reviews (kind 1985) scope.
- [ ] **Draft screen #5 (Earnings) port spec.**

### Mediator access — the answer to "who can see the admin panel"

A common question that came up during testing: *who is the "Mediator" / can I see the admin dashboard?*

Three classes of user in SafeSale:

| Role | How they sign up | Where they live in the app |
|---|---|---|
| Seller | `/onboarding` — generates a Nostr keypair, registers with backend `POST /api/sellers`, stores nsec in localStorage | `/app/*` (dashboard, listings, orders, earnings) |
| Buyer | **No signup.** Frontend generates a one-time keypair on first checkout; nsec stored in localStorage under the order token | `/order/:token` only — the URL IS the credential |
| Mediator | Holds the `MEDIATOR_NSEC`. For the hackathon, per Joy's `STATE.md`, `MEDIATOR_NSEC = SAFESALE_NSEC` (single brand key the team holds). In production this would split into separate per-mediator keys. | `/admin` only |

**For the hackathon:** the mediator is **us** — you and Joy hold the key on the backend, and we'd manually resolve any disputes that came in. The `/admin` route is now gated by `VITE_MEDIATOR_NPUB`: anyone without that key sees "Access restricted" instead of the admin panel.

This is also a real production-safety fix: previously `/admin` rendered for anyone who typed the URL.

### Git sync plan

GitHub reports `frontend` as "1 ahead, 6 behind" because every PR merge (`#1`…`#6`) creates a merge commit on `main` that isn't replayed back onto `frontend`. The 6 behind commits are all merges of our own frontend work (no foreign code from `backend` ever lands on `main` because Joy's work is in `safe-sales-backend/` — a different folder). It is safe to fast-rewind / merge `origin/main` into `frontend`.

The simplest sync (recommended): after pushing today's commits to `frontend`, run `git merge origin/main` on `frontend` to absorb the PR-merge commits. This makes `frontend` strictly newer than `main` so subsequent PRs are clean fast-forwards.



**Day 2 — screens #5 + #9 ported (with mocks where backend missing)**

- [x] **Port screen #5 (Earnings)** — read `useSellerOrders`, sum sats across `completed` orders for the monthly total; list completed orders as payout history. "Cash out to Naira" = honest "coming soon" toast. Flip to ✅ with note "wired to seller-orders aggregation; awaiting `/api/earnings` for real payout history."
- [x] **Port screen #9 (Admin Dispute Dashboard)** — static fixture of 3–4 example disputes, "Resolve" action toasts. Flip to ✅ with note "static demo surface; awaiting backend admin endpoints."
- [x] **All 9 screens design-complete by Day 2 evening.**

**Day 3 — polish, deploy, dry-run**

- [x] **Morning polish pass (~2 hrs total):** consolidated the 4 inlined `ListingThumb` helpers into one shared component (PROGRESS.md "Refactor pass before launch" line 92); added a global TanStack Query error boundary; audited every mutation button for visible `Loader2` state; removed stray `console.log`.
- [ ] **Deploy to Vercel** with `VITE_API_URL` pointing at Railway. Tell Joy to append the Vercel URL to her `FRONTEND_ORIGINS` env var (one Railway env change on her side; per her STATE.md).
- [ ] **Full dry-run with Joy on video call** — run + record the demo end-to-end on the deployed URL. Time it. Anything >5 min, cut. Identify any remaining UX issue, fix that evening.
- [ ] **Evening: open + merge `frontend → main` and `backend → main` PRs together.** Tag `hack4freedom-submission-v1` on `main`.

**Day 4 — submission + rehearsal + contingency**

- [ ] **Write submission README** with project description, the Nigerian seller market story leading, screenshots, then technical detail. Include a "Hackathon MVP scope" section documenting the PRD deltas explicitly (own them, don't hide them).
- [ ] **Delete `.md` files we won't ship** as part of the final pre-submission commit: `PROGRESS.md`, `AGENTS.md`, `BUSINESS.md`, all `.stitch-designs/`. Keep: `README.md`, `NIP.md`, possibly trimmed `PRD.md`.
- [ ] **Rehearse the pitch 5+ times.** Most teams lose points on muddled narration — product can be 7/10 + pitch 9/10 beats 9/10 + 7/10.
- [ ] **Backup plan:** 90-second screen recording of the working flow saved locally, ready to play if Railway or wifi fails on stage.
- [ ] **Rest before demo day.**

### The Lightning payout gap — pitch line (instead of wiring mainnet)

The single biggest hole in the freedom-tech story. Resolution: **don't try to fix in 4 days; own it in the pitch.**

> *"For the hackathon we're running on Cashu testnut, which can mint and verify P2PK locks but can't melt to a mainnet Lightning wallet. The seller release fully completes the cryptographic guarantee — buyer's signature proves consent, the mint enforces it. Mainnet swap is a config change for post-hackathon, not a re-architecture."*

Plus: surface `redeemedSats` (returned by `apiClient.releaseOrder`) on the completed-order UI as a "Settled · {N} sats" line so the demo visibly shows the settlement number even though no LN melt happens. ~30 min of work; already partially in `BuyerOrder.tsx`; verify on the seller side too.

### Coordination touchpoints with Joy (the only 3)

| When | What |
|---|---|
| **Day 1** | 3 decisions: payment trigger, LN scope, reviews scope |
| **Day 2 evening** | Confirm 9/9 frontend + admin/earnings backend status |
| **Day 3 afternoon** | Full live demo together, recorded |

Nothing more. Anything else is process-for-process's-sake.

### Win odds — honest

Top 3: ~30–40%. Outright win: ~10–15%. The cryptographic trust story is real, the market is specific and underserved, and 8/9 (soon 9/9) screens are polished. The three things that move odds up: (1) closing or cleanly explaining the LN gap, (2) rehearsing pitch 5+ times, (3) leading with the Nigerian seller market story before any technical content.

---

## Design system contract (applies to every prompt)

- React + TypeScript single component, no `any` types.
- Tailwind CSS 4 + shadcn/ui primitives only (Button, Card, Input, Label, Tabs, Dialog, Select, Textarea, etc.).
- `lucide-react` icons only — never Material Symbols or other icon sets.
- Semantic color tokens only: `bg-surface`, `bg-background`, `text-ink`, `text-ink-soft`, `bg-brand`, `text-brand-foreground`, `border-border`. **Do not invent new colors.**
- Mobile-first, responsive down to 360px.
- Soft shadows, `rounded-2xl` cards, `rounded-lg` inputs/buttons.
- WCAG 2.1 AA. `focus-visible:ring-2 ring-brand` on every interactive element.
- Visual direction: Stripe + Airbnb + Paystack — warm, modern, trustworthy, light mode only.
- No glassmorphism, no neon, no cyberpunk-crypto aesthetic.
- Include `// TODO:` comments where hooks should later be wired.

---

## The 9 core screens

Legend: ✅ done (designed + wired to live backend) · 🟡 in-progress · ⏭ next · ⬜ pending

| # | Screen | Route | Audience | Status | Notes |
|---|---|---|---|---|---|
| 1 | Seller Onboarding | `/onboarding` | New seller | ✅ | Stitch HTML in `.stitch-designs/01-onboarding.html` → React in `src/pages/Onboarding.tsx`; wired to `apiClient.createSeller` (POST /api/sellers) before the Nostr login is persisted, so duplicate-handle 409s surface cleanly. Stores the returned seller record via `useCurrentSeller`. Phone field is required (backend Zod minimum). |
| 2 | Seller Dashboard Home | `/app` | Seller | ✅ | Stitch HTML in `.stitch-designs/02-seller-dashboard.html` → React in `src/pages/app/DashboardHome.tsx`; KPIs (locked in escrow / paid out 7d / orders to ship / active listings) computed off `useSellerOrders` (GET /api/orders/seller/:npub, 15s poll) + `useMyListings`. "Needs your attention" surfaces payment_locked + disputed rows oldest-first. Reputation strip is placeholder until kind 1985 review feed is wired. |
| 3 | Seller Listings (list + create) | `/app/listings` | Seller | ✅ | Stitch HTML in `.stitch-designs/03-seller-listings.html` → React in `src/pages/app/ListingsPage.tsx`. Snapshot strip + search/filter chips + 3-col card grid + mobile FAB. Create-listing wired to `apiClient.createListing` (POST /api/listings) since Phase 8 step B — backend cuid round-trips as the Nostr kind 30018 `d` tag. Edit + Mark out-of-stock surfaced as friendly "coming soon" toasts (backend has no PATCH /api/listings/:id yet — wires the moment that route ships). |
| 4 | Seller Orders (list + detail) | `/app/orders` & `/app/orders/:token` | Seller | ✅ | Stitch HTML in `.stitch-designs/04-seller-orders.html` → React in `src/pages/app/OrdersPage.tsx` + `src/pages/app/OrderDetailPage.tsx`; both pages already wired (list = `useSellerOrders` 15s poll, detail = `apiClient.getOrder` 8s poll + `apiClient.shipOrder`). List view: amber "Needs your attention" strip (sum of payment_locked + disputed, omitted when zero), search + 6 filter chips with live counts (pending_payment shows only under All), desktop table / mobile cards, 3 empty states + skeleton. Detail view: 2-col on lg+, status-aware hero card (Mark Shipped form inline only when payment_locked — replaces the previous dialog), ship-to panel with copy buttons, order summary with sats subtotal, 4-step activity timeline with alert variant on dispute/refund, mobile sticky action bar that scrolls to the inline ship form. |
| 5 | Seller Earnings (Bitnob cash-out) | `/app/earnings` | Seller | ✅ | Direct React port (no Stitch) in `src/pages/app/EarningsPage.tsx`. All numbers aggregated client-side off `useSellerOrders` — released-lifetime, locked-in-escrow, this-month, completed count — so the page never lies about live data. Payout history = `completed` orders newest first (table on `sm+`, stacked cards on mobile). "Cash out to Naira" surfaces an honest "coming soon" toast (PRD delta #2 + #8: backend `/api/earnings` and Bitnob payout integration both planned post-hackathon). Bank-on-file panel is a dashed empty state, not a hardcoded "GTB ****2841" lie. |
| 6 | Public Listing | `/buy/:id` | Buyer | ✅ | Stitch HTML in `.stitch-designs/06-public-listing.html` → React in `src/pages/PublicListing.tsx`; wired to `useListing` (Nostr kind 30018 → fixture fallback for cold demos). |
| 7 | Buyer Checkout | `/checkout/:id` | Buyer | ✅ | Stitch HTML in `.stitch-designs/07-buyer-checkout.html` → React in `src/pages/Checkout.tsx`; wired to `apiClient.createOrder` + polling. |
| 8 | Buyer Order Page (release / dispute) | `/order/:token` | Buyer | ✅ | Stitch HTML in `.stitch-designs/08-buyer-order.html` → React in `src/pages/BuyerOrder.tsx`; wired to `apiClient.getOrder` (8s poll), `apiClient.releaseOrder` (signs with nsec from localStorage), `apiClient.openDispute`. 7-state hero, 4-step timeline, mobile sticky action bar. |
| 9 | Admin Dispute Dashboard | `/admin` | Mediator | ✅ | Direct React port (no Stitch) in `src/pages/Admin.tsx`. Route gated by `MediatorGate` (only `VITE_MEDIATOR_NPUB` holder gets in). Queue view: search + 4 status chips (All / Escalated / Awaiting evidence / Mediating), desktop table + mobile cards. Detail view: side-by-side buyer + seller evidence cards, case-summary panel, signed-resolution form (3-way outcome — refund-buyer / release-seller / split with % slider — plus 20-char-minimum rationale). "Sign &amp; publish resolution" toasts "coming soon" until Joy's backend ships admin endpoints (`GET /api/admin/disputes`, `POST /api/admin/disputes/:id/resolve`) + kind-33889 publishing. Honest amber banner at the top labels the page as the hackathon-mock surface so the seam is visible. |

**Status: 9 / 9 screens design-complete. 7 / 9 wired against the live backend; 2 / 9 (Earnings, Admin) wired against client-side aggregation + fixtures respectively, with backend-wire planned post-hackathon (PRD deltas #2, #7, #8).**

The escrow wedge — onboard → list → buy → pay → ship → release — runs end-to-end on Railway today.

### Deferred (not part of the 9 — polish or build later)

- Marketing pages: `/`, `/how-it-works`, `/for-sellers`
- Seller Reputation Panel — folded into the seller dashboard for MVP (per PRD §A); standalone `/app/reputation` route deleted
- Seller Settings / Profile (`/app/settings`) — not in code yet; add post-MVP
- Storefront `/:handle`, PayLink `/pay/:code`, Chat-as-page, Payment Requests — **deleted** (out of MVP per PRD)
- Return-flow sub-page (lives inside Buyer Order Page dispute flow)
- Admin Dispute Detail split-screen — design as part of #9 or as a follow-up

---

## Wiring track — backend integration status

The buyer slice is fully wired against the live Railway backend
(`https://safe-sales-backend-production.up.railway.app`). Seller wires
landed during Phase 8 step A–D. Switching modes between mock and real
is still a one-line env-var flip via `VITE_API_URL`.

### What's wired (verified against Railway)

| Frontend call | Backend route | Where wired | Commit |
|---|---|---|---|
| `apiClient.createSeller` | POST /api/sellers | `src/pages/Onboarding.tsx` | `b4a252a` |
| `apiClient.createListing` | POST /api/listings | `src/pages/app/ListingsPage.tsx` (`CreateListingSheet.onPublish`) | `f36719f` |
| `apiClient.shipOrder` | POST /api/orders/:token/ship | `src/pages/app/OrderDetailPage.tsx` (`shipMutation`) | `5403562` |
| `apiClient.getSellerOrders` | GET /api/orders/seller/:npub | `src/hooks/useSellerOrders.ts` → `DashboardHome` | `071d25e` |
| `apiClient.createOrder` | POST /api/orders | `src/pages/Checkout.tsx` | (pre Phase 8) |
| `apiClient.getOrder` | GET /api/orders/:token | `src/pages/BuyerOrder.tsx`, `OrderDetailPage` | (pre Phase 8) |
| `apiClient.releaseOrder` | POST /api/orders/:token/release | `BuyerOrder.tsx` (`releaseMutation`) | (pre Phase 8) |
| `apiClient.openDispute` | POST /api/orders/:token/dispute | `BuyerOrder.tsx` (`disputeMutation`) | (pre Phase 8) |

### Still on mock data (won't break demos — they're read paths only)

| Frontend call | Backend route to add | Where used | Notes |
|---|---|---|---|
| `getOrdersForSeller` etc. on `OrdersPage` | GET /api/orders/seller/:npub | `src/pages/app/OrdersPage.tsx` | ✅ Wired in commit `c8a8394`. Same `useSellerOrders` query as the dashboard — both surfaces refresh together. |
| Edit listing + mark-out-of-stock toggle | PATCH /api/listings/:id (NEW route — not on backend yet) | `src/pages/app/ListingsPage.tsx` ListingCard More menu | Frontend surfaces both as friendly "coming soon" toasts so the seller knows they're real-but-not-yet-wired. One-line `apiClient.updateListing` mutation + Nostr republish (same `d` tag) when the backend route lands. |
| `payouts` / `earnings` from `lib/mock.ts` | (not designed yet) | `src/pages/app/EarningsPage.tsx` | Blocked on backend endpoints — no /api/earnings yet. |
| Dispute / return / review cards | kinds 33889, 1985 (Nostr) | `OrderDetailPage`, `BuyerOrder` (review prompt) | Removed from seller order detail in commit `5403562`; will return when 33889 + 1985 are live. |
| `currentSeller` fixture default | n/a | `lib/api/mocks.ts` cold-demo fallback | Only used when `VITE_API_URL` is unset. Safe. |

### Refactor pass before launch

Once every screen is wired, do one cleanup commit:
- Delete every `import { ... } from "@/lib/mock"` outside `src/lib/api/mocks.ts`.
- Delete the entire `currentSeller` / `orders` / `listings` exports from `lib/mock.ts` once nothing references them.
- Remove the seeded fixture in `lib/mock.ts` (commit `fd6ff2d`) that points at the manually-curl'd Railway listing — the create-listing flow now produces real listings.
- [x] Refactor / consolidate the `ListingThumb` helper duplicated in `BuyerOrder.tsx` and `OrderDetailPage.tsx`.
- Drop `lib/buyerKey` exports that aren't called anywhere.
- Audit `PROGRESS.md` itself — when 9/9 are done, this file should compress to a single "ship state" paragraph, not a sprawling tracker.

---

## PRD deltas — what we ship vs. what the PRD specifies

The PRD describes the full SafeSale product end state. The hackathon
MVP makes eight conscious scope cuts so the **trustless-escrow wedge**
(buyer pays → seller ships → buyer releases → seller gets sats)
runs end-to-end on testnet within the 2-week build window. Track them
here so demo prep isn't blindsided.

| # | PRD says | We ship | Why deferred | Unblocks when |
|---|---|---|---|---|
| 1 | Buyer order link emailed / SMS'd at checkout | Shown on screen + bookmark prompt only | No transactional-email service wired (Resend/Postmark TBD) | Backend `/api/orders` adds an outbound mail hook |
| 2 | Buyer release triggers Lightning payout to seller's Lightning wallet | Backend marks order `completed` after Cashu redeem; **no actual LN melt to seller** | Backend STATE.md: "testnet mint can't melt mainnet invoices; skipped until mainnet ship" | Backend Phase 9 wires the fee melt + payout |
| 3 | Bitnob webhook detects bank transfer automatically | Bitnob fully mocked; we curl `POST /api/webhooks/bitnob` to advance state | Bitnob sandbox approval is slower than the 2-week clock | Bitnob sandbox key arrives |
| 4 | Completed trades published as signed Nostr reviews (kind 1985); seller dashboard shows aggregated reputation | Reputation strip on dashboard is placeholder copy for new sellers | Release endpoint on backend does not publish kind 1985 | Backend adds review-publishing on release |
| 5 | 72h direct buyer↔seller chat on order page (Phase 4C) | Not built — `OrderDetailPage` has no chat surface | Needs NIP-17 / kind 1059 gift-wrap DM UX, encryption keys, mailbox relay choice | Post-MVP design pass |
| 6 | Three-checkpoint photo evidence return flow (the damaged-return edge case) | Removed from `OrderDetailPage` in commit `5403562`; backend has no return-evidence model | Hardest flow in the spec; depends on real dispute kind 33889 + per-step photo uploads | Screen #9 (Admin Dispute Dashboard) + backend kind 33889 publishing |
| 7 | Admin Dispute Dashboard (Dashboard 3 — queue, detail, split-percentage slider, signed resolution) | Backend has mediator key + dispute records; UI is unbuilt (screen #9) | Pending Stitch prompt + design pass | Screen #9 lands |
| 8 | Seller Earnings: bank account on file, "Cash Out to Naira" via Bitnob, total sats earned | Page exists but reads `lib/mock.ts` payouts/earnings | No `/api/earnings` endpoint; no real Bitnob payout integration (see #2, #3) | Backend adds earnings + Bitnob payout |

### What we DO ship from the PRD (the trustless-escrow core)

All of these are live on Railway and verifiable end-to-end **today**:

- Browser-generated Nostr keypair, nsec in localStorage (Phase 1 step 1–2)
- Listing publish to Nostr kind 30018 + Postgres (Phase 1 step 5–8)
- Buyer checkout → backend creates order + (mock) Bitnob virtual account (Phase 2 step 1–8)
- Bitnob webhook → Cashu mint + NUT-11 P2PK lock to buyer's one-time pubkey (Phase 2 step 9–14)
- Seller receives Nostr DM on payment-locked (Phase 2 step 17)
- Seller "Mark Shipped" → `POST /api/orders/:token/ship` → status flip + buyer notification (Phase 3)
- Buyer "Release Payment" → mint verifies P2PK sig → order completes (Phase 4A step 5–9, minus the LN payout from delta #2)
- Buyer "Open Dispute" → token frozen, status flip, admin queue entry (Phase 4B step 1–7)

The escrow wedge — the actual hackathon submission — is real.

---

## Saved Stitch outputs

Raw HTML from Stitch is committed to `.stitch-designs/` so we never lose a design to a crash again. After conversion to `.tsx`, the file stays as historical reference. Prompts sent to Stitch are committed as `NN-<slug>.prompt.md` next to their eventual HTML.

| Screen | Prompt | HTML output |
|---|---|---|
| 1 — Seller Onboarding | _(prompt not archived; predates convention)_ | `.stitch-designs/01-onboarding.html` |
| 2 — Seller Dashboard Home | `.stitch-designs/02-seller-dashboard.prompt.md` | `.stitch-designs/02-seller-dashboard.html` |
| 6 — Public Listing | `.stitch-designs/06-public-listing.prompt.md` | `.stitch-designs/06-public-listing.html` |
| 7 — Buyer Checkout | _(prompt not archived; predates convention)_ | `.stitch-designs/07-buyer-checkout.html` (renamed from `03-checkout.html` once canonical numbering stabilised) |
| 3 — Seller Listings | `.stitch-designs/03-seller-listings.prompt.md` | `.stitch-designs/03-seller-listings.html` |
| 4 — Seller Orders (list + detail) | `.stitch-designs/04-seller-orders.prompt.md` | `.stitch-designs/04-seller-orders.html` |
| 5 — Seller Earnings | _(awaiting prompt)_ | _(awaiting Stitch)_ |
| 9 — Admin Dispute Dashboard | _(awaiting prompt)_ | _(awaiting Stitch)_ |

---

## Existing code map

### Pages (`src/pages/`)
- `Landing.tsx`, `HowItWorks.tsx`, `ForSellers.tsx` — marketing surface (deferred)
- `Onboarding.tsx` — single-screen Nostr signup (screen 1)
- `PublicListing.tsx`, `Checkout.tsx`, `BuyerOrder.tsx`, `PayLink.tsx` — buyer flow
- `Storefront.tsx` — public seller page `/:handle` (deferred)
- `Admin.tsx` — admin/mediator
- `NIP19Page.tsx`, `NotFound.tsx`

### Seller dashboard (`src/pages/app/`)
- `DashboardHome.tsx`, `ListingsPage.tsx`, `OrdersPage.tsx`, `OrderDetailPage.tsx`
- `EarningsPage.tsx`, `ReputationPage.tsx`
- `DisputePage.tsx`, `ChatPage.tsx`, `PaymentRequestsPage.tsx`

### Hooks (`src/hooks/`)
Standard mkstack hooks plus:
- `useCashuWallet` — mint connection (loading state)
- `useEscrowToken` — buyer escrow lifecycle

### Cashu (`src/lib/cashu/`)
- `types.ts` — SafeSale escrow token types + supported mints
- `wallet.ts` — create / preview / encode / receive helpers

### Nostr event spec
- `NIP.md` defines kinds `30018` (listings), `33888` (orders), `33889` (dispute resolutions), `1985` (reviews), `1059` (DMs)

---

## How to use this file

1. When we start a new screen, change its row to 🟡 with the prompt date.
2. When Stitch HTML is received, save it to `.stitch-designs/NN-<slug>.html` and keep status 🟡 until converted to `.tsx`.
3. When the React component is committed, flip to ✅ and add the commit hash.
4. Commit `PROGRESS.md` at the same time as any change so git history mirrors the checklist.
