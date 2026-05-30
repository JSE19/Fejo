# SafeSale — Product Requirements Document

> **This document is the source of truth for SafeSale.** Any disagreement between code and this PRD must be resolved by updating one or the other through a PR. The README and BACKEND.md derive their authority from this file.

> **Positioning note:** SafeSale is for **social-commerce sellers on any platform** — Instagram, WhatsApp, TikTok, X (Twitter), Telegram, Threads, Facebook Marketplace, Snapchat, Linktree bios, or anywhere a seller can paste a link. The PRD calls out Instagram and WhatsApp as examples because they are the largest in our launch markets (Nigeria, Ghana, Kenya), but the product is **not** limited to those platforms.

---

## Problem

Two people are both scared of each other and both have legitimate reasons to be:

| Who | Their fear | Current outcome |
|---|---|---|
| Seller (e.g. a woman running a social-media boutique) | "Buyer will receive goods and refuse to pay / do a chargeback" | Demands payment upfront, loses buyers |
| Buyer | "I'll pay and seller will ghost me / send the wrong item" | Either doesn't buy, or gets scammed |

No existing tool built on Bitcoin rails has solved this for informal social-commerce in Africa. Paystack and Flutterwave have escrow products but require bank accounts, charge fees, are region-limited, and leave a financial trail.

### Market signal (verified)

- On Jumia, just over a third of businesses in Côte d'Ivoire and over half of businesses in Kenya and Nigeria are owned by women. — IFC
- Social commerce is projected to drive 30% of online sales; Instagram, WhatsApp, and TikTok are the dominant storefronts. — Netcash
- In South Africa, women account for 56.6% of Instagram users. — Statista
- Social-vendor fraud is among the most frequently cited fraud categories by Nigerian consumers. — NCC / Business Elites Africa

The two-sided fear has a name in the community: **the trust gap in social commerce.**

---

## Solution

A seller generates a SafeSale link from their Nostr identity — one link per product listing. The buyer clicks it, sees the seller's Nostr reputation score (built from past completed trades), and locks payment as a **Cashu eCash escrow token**. The token is mathematically locked: it cannot be redeemed by the seller until the buyer releases it, and cannot be stolen by anyone in between.

The seller receives a notification via Nostr DM that payment is locked, and ships the item. The buyer taps "confirm receipt" → token releases → seller receives sats via Lightning. If there is a dispute, the token remains frozen until resolved. Completed trades publish signed Nostr events that build a **portable, uncensorable reputation** that follows the seller across every Nostr app forever.

### Why each technology is in the stack

| Technology | Role |
|---|---|
| **Bitcoin** | Underlying money — seller's earnings are real value, not platform credits |
| **eCash (Cashu)** | The escrow vault — token cryptographically locked until buyer confirms |
| **Lightning** | Instant payout to seller the moment buyer confirms receipt |
| **Nostr** | Seller identity + portable reputation + buyer-seller encrypted messaging |
| **Bitnob** | Regulated NGN ↔ sats on/off-ramp (custodian of fiat, not of escrow) |

---

## The three dashboards

### Dashboard 1 — Seller Dashboard

The main interface the seller logs into. Five sections:

#### A. Profile & Identity

When a seller first visits SafeSale, the app generates a Nostr keypair in the browser. The private key (`nsec`) is stored in the browser's `localStorage` and never leaves the device. The seller sees their public identity (`npub`), a display name field, and a profile link they can share. This is their permanent identity — if they clear their browser or switch devices, they restore it with their `nsec`.

#### B. Listings Panel

Where the seller creates products. Each listing has a title, description, photos (uploaded to a decentralised file host like nostr.build or Blossom), price in naira, and stock status. On "Create Listing", the app publishes a Nostr event (kind `30018`, NIP-15) signed with the seller's private key and constructs a permanent URL:

```
safesale.app/buy/[listing-id]
```

That link is what the seller copies and pastes into any social-media bio, story, DM, or status. It is **static and permanent** — never changes for that listing. Multiple buyers can use the same listing link; each purchase creates an independent order.

#### C. Orders Panel

The most important section. Every buyer purchase creates a new order row showing:

- Order ID
- Buyer's delivery contact (phone or address, entered at checkout)
- Amount in naira and equivalent sats
- Escrow status: **Pending Payment → Payment Locked → Shipped → Delivered → Completed / Disputed**
- A "Mark as Shipped" button (appears only when escrow is `Payment Locked`)
- A tracking number field
- Timestamp of each status change

**The seller cannot touch the funds from this dashboard.** They can only see status and mark shipment. The money is held in the Cashu token until the buyer releases it.

#### D. Earnings Panel

Shows completed trades, total sats earned, and a "Cash Out to Naira" button linked to **Bitnob**. The seller enters their Nigerian bank account once and can withdraw at any time. They can also choose to hold as sats.

#### E. Reputation Panel

All signed Nostr reviews received, the aggregated score, and a shareable reputation link (the seller's `npub`) that works on any Nostr client outside SafeSale.

---

### Dashboard 2 — Buyer's Order Page

**The buyer does not have a full dashboard or an account.** This is intentional: forcing buyers to create accounts is the biggest drop-off point in social commerce. Instead, every order generates a unique secret URL:

```
safesale.app/order/[unique-order-token]
```

Generated the moment the buyer initiates checkout. Sent to them by email or SMS (their choice). Also displayed on screen immediately after payment with a clear instruction to bookmark or screenshot it.

The page shows:

- Product name, photo, price
- Current order status with a visual timeline
- Seller's name and reputation score
- Delivery details they entered
- Escrow status — how much is locked and what condition releases or refunds it

When the order reaches **"Seller has shipped"**, two buttons appear:

1. **"I received my item and it matches — Release Payment"**
2. **"There is a problem — Open a Dispute"**

If the buyer does nothing for **7 days** after the seller marks "Shipped", the locktime in the Cashu token triggers and the escrow auto-releases to the seller. This protects sellers from buyers who go silent after receiving goods.

---

### Dashboard 3 — Admin / Mediator Dashboard

Internal tool, accessible only by the SafeSale team.

#### A. Dispute Queue

Every open dispute, priority-flagged by time elapsed and amount. Each row shows:

- Order ID, seller name, buyer contact
- Amount in escrow
- Dispute reason
- Evidence uploaded by both parties
- Full Nostr DM history between buyer and seller
- Days since dispute was opened
- Status: **Open → Under Review → Awaiting Evidence → Resolved**

#### B. Dispute Detail View

Split screen — seller's evidence and timeline on the left, buyer's on the right. Resolution panel offers four options:

1. **Full Release to Seller** — buyer's claim is rejected
2. **Full Refund to Buyer** — seller misrepresented the item
3. **Partial Split** — slider sets the percentage (e.g. 70/30)
4. **Extended Review** — admin requests more evidence via Nostr DM

On "Issue Resolution", the admin signs the decision with the **SafeSale mediator Nostr key**. The signature is published as a public Nostr event — permanent and auditable. The Cashu token is split or released accordingly.

---

## Link generation — step by step

1. Seller fills in the listing form and clicks "Generate Listing"
2. Backend assigns a UUID to the listing (e.g. `7f3a9c`)
3. Listing data is published as a Nostr event (kind `30018`) signed with the seller's key
4. App constructs the URL: `safesale.app/buy/7f3a9c`
5. Seller sees the URL with one-click copy button and a QR code
6. The URL is **static and permanent** — never changes

When a buyer opens that URL and initiates purchase:

1. New order is created with a unique order token (e.g. `ord_xk29mp`)
2. Bitnob virtual bank account is generated for this specific order with a 24-hour expiry
3. Buyer's order page URL is constructed: `safesale.app/order/ord_xk29mp`
4. URL is shown on screen and emailed/SMS'd to the buyer

**Two different links.** Listing link = public and reusable. Order link = private and unique to one transaction.

---

## Full end-to-end flow

### Phase 1 — Seller sets up

1. Seller visits `safesale.app` on their phone
2. App silently generates a Nostr keypair in the browser
3. Seller enters business name, phone, email, bank account number; saves to create profile
4. Seller taps "Create New Listing"
5. Enters item name, description, NGN price, uploads 1–4 photos
6. Taps "Generate Link"
7. App publishes Nostr event, creates listing record, constructs URL
8. Seller sees `safesale.app/buy/7f3a9c` with copy + QR buttons
9. Seller pastes the link into Instagram bio, WhatsApp DM, TikTok caption, X profile, Telegram channel, or any other social-media surface

### Phase 2 — Buyer initiates purchase

1. Buyer taps the link from wherever they saw it (any social-media surface)
2. SafeSale listing page opens — product photos, description, NGN price, seller name + reputation
3. Buyer taps "Buy Safely"
4. Checkout form: delivery address or phone, and either email or phone for the order link
5. Buyer submits
6. Backend creates an order record
7. Backend calls Bitnob API → dedicated virtual bank account, 24-hour expiry
8. Buyer sees: "Send ₦8,500 to Access Bank — 0123456789 — SafeSale Escrow"
9. Buyer opens their banking app, makes a normal transfer
10. Bitnob detects the transfer, fires a webhook to the SafeSale backend
11. Backend confirms amount matches
12. Backend instructs **Nutshell mint** to mint a Cashu token of the equivalent sats
13. Cashu NUT-11 P2PK locks the token to the buyer's one-time Nostr public key
14. Token is stored in the database tied to the order
15. Order URL is sent via email or SMS
16. Buyer is redirected to their order page: "✅ Payment locked in escrow — your funds are safe"
17. Seller dashboard updates: new order row, status **Payment Locked**
18. Seller receives Nostr DM: "New order from [buyer info]. ₦8,500 locked in escrow. Ship when ready."

### Phase 3 — Seller ships

1. Seller sees the order under **Payment Locked**
2. Seller packs and ships via courier
3. Seller opens the order, taps "Mark as Shipped"
4. Field appears: "Enter tracking number (optional but recommended)"
5. Seller enters tracking number, confirms
6. Status → **Shipped**
7. Buyer receives Nostr DM or SMS: "Your order has been shipped. Tracking: [number]. When you receive it, return to your order page to confirm."
8. Buyer's order page shows shipment status; the two action buttons are visible but greyed out with a note: "These activate when you are ready after receiving your item"
9. A 7-day countdown timer starts silently

### Phase 4A — Buyer receives and is happy

1. Package arrives, buyer opens it
2. Buyer returns to the order page (email, SMS, or bookmark)
3. The two buttons are now active
4. Buyer taps "I received my item and it matches — Release Payment"
5. Confirmation modal: "This will release ₦8,500 to the seller. Cannot be undone. Confirm?"
6. Buyer confirms
7. Buyer's Nostr private key (stored in browser since checkout) signs the Cashu token release
8. Signed token sent to Nutshell mint
9. Mint verifies signature matches the P2PK lock
10. Mint redeems the token and sends a Lightning payment to the seller's Lightning address
11. Seller's wallet receives sats instantly
12. If seller has auto-convert enabled, Bitnob converts sats → naira → bank account
13. Both parties prompted to leave a review — published as a signed Nostr event
14. Order status → **Completed**

### Phase 4B — Buyer is not happy (dispute)

1. Buyer returns to their order page
2. Taps "There is a problem — Open a Dispute"
3. Form opens:
   - **What is the problem?** (dropdown: Wrong item / Damaged / Not as described / Not received)
   - **Describe what you expected vs. what you received** (text)
   - **Upload photos** (up to 5)
4. Buyer submits
5. Cashu escrow token enters a **frozen state** — neither party can touch it
6. Seller dashboard: status → **⚠️ Disputed**
7. Seller receives Nostr DM: "A dispute has been opened on order [ID]. Please respond within 72 hours."
8. Dispute appears in the Admin Dashboard queue
9. A **72-hour direct resolution window** opens — both parties can message each other via Nostr encrypted DMs on the order page

### Phase 4C — Direct resolution (within 72h)

If buyer and seller agree:

- **Replacement** → buyer closes dispute, token releases to seller (replacement acts as fulfilment)
- **Partial refund agreed** → buyer releases token, seller sends agreed NGN amount via bank transfer (MVP limitation — automated partial refund is post-MVP)

If they cannot agree after 72 hours, the system automatically **escalates to admin mediation**. Both parties notified: "Your dispute has been escalated. A decision will be made within 48 hours."

### Phase 5 — Admin mediation

1. Admin opens the dashboard, sees the escalated dispute
2. Reviews the full case: original listing photos, buyer's dispute photos, seller's response, the full Nostr DM log, tracking info
3. Optionally requests more evidence via Nostr DM — opens a 24-hour evidence window
4. Determines an outcome:
   - **Full Release to Seller** — used when the buyer's complaint has no basis or is fraudulent. Mediator key co-signs the release; mint redeems the token to the seller's Lightning wallet.
   - **Full Refund to Buyer** — used when the seller clearly misrepresented or didn't ship. Mint destroys the locked token and issues a new one redeemable by the buyer. Buyer redeems → Bitnob → bank account.
   - **Partial Split** — used when both parties have valid claims. Admin sets a percentage with a slider. Token is split — one portion to the seller's Lightning, one portion refunded to the buyer.
5. Admin taps "Issue and Sign Resolution"
6. Decision is published as a signed Nostr event — permanent, public, auditable
7. Both parties receive the decision via Nostr DM with full reasoning

---

## Edge case — damaged return

The hardest scenario: buyer says item didn't match description, returns it, and the returned item arrives in damaged or worse condition. Both parties have legitimate grievance.

The flow:

1. Buyer opens a dispute and selects "Item not as described — I want to return it"
2. Admin is **immediately involved** as a required mediator — returns are never handled peer-to-peer
3. Admin reviews the buyer's photos of the item *on receipt* — this is the timestamped evidence of condition when buyer received it
4. Admin instructs the buyer to ship the return. Buyer must upload a photo of the item packed for return AND the courier receipt
5. When the seller receives the return, they have 48 hours to inspect and upload photos of its condition
6. Admin compares **three sets of photos**: item as listed by seller, item as received by buyer, item as returned to seller
7. Outcomes:
   - Returned in same condition as received by buyer → **full refund to buyer**
   - Returned in worse condition than received by buyer → **admin splits proportionally** (seller compensated for damage, buyer gets partial refund)
   - No buyer-side return photos → buyer's claim is weaker, admin notes this in the decision

**Key principle:** evidence must be timestamped and uploaded at each stage. A buyer who skips "photo before returning" loses the ability to dispute the return condition. This is communicated on the dispute form before the buyer proceeds.

---

## Who sees what

| Dashboard | Who | Key actions |
|---|---|---|
| Seller Dashboard | Seller only | Create listings, generate links, view orders, mark shipped, cash out |
| Buyer Order Page | Buyer only (via unique link) | View status, confirm receipt, open dispute, chat with seller |
| Admin Dashboard | SafeSale team only | Review disputes, request evidence, issue resolutions, sign decisions |

The buyer never needs an account. The seller's identity is their Nostr key. The admin's authority is the mediator Nostr key — every decision they make is signed and publicly auditable, which prevents admin corruption or arbitrary action.

---

## 2-week MVP scope

Seller creates Nostr profile → generates escrow link → buyer locks eCash → seller ships → buyer confirms → Lightning payout → reputation event published.

- ✅ Seller onboarding (single screen, Nostr key generation in browser)
- ✅ Listing creation + link generation
- ✅ Buyer checkout with Bitnob virtual account
- ✅ Cashu mint integration (Nutshell) for token issuance
- ✅ NUT-11 P2PK locking
- ✅ Buyer order page with release / dispute buttons
- ✅ Seller order management with "Mark Shipped"
- ✅ Cashu token release → Lightning payout
- ✅ Reputation event (signed Nostr event) on completion
- ✅ Admin dispute queue (minimal — full release / full refund only; partial split post-MVP)
- ⛔ Out of MVP: automated partial refunds, Pro tier features, multi-currency, mobile app
