# BACKEND.md — SafeSale Backend Specification

> This document defines what the SafeSale backend service must do, what HTTP endpoints it must expose, what external services it integrates with, and what data it stores. It is the **contract** between the frontend (`src/`) and any backend implementation.
>
> The frontend depends on this contract. Any breaking change must update this file in the same PR.

---

## What the backend is responsible for

The backend is the bridge between three trust-sensitive worlds the frontend cannot reach safely:

1. **Bitnob** — regulated NGN ↔ sats on/off-ramp. Holds a partner API key; receives signed webhooks; never exposed to the browser.
2. **Nutshell mint** — Cashu mint operations (mint, lock with P2PK, redeem, refund). Frontend can talk to the mint *for redemption* using buyer-side keys, but the *mint-on-payment-received* step requires holding NGN/fiat backing that only the backend has.
3. **The SafeSale escrow service Nostr key** — used to publish kind `33888` order events. The mediator key is also held by the backend (or by a hardware signer the backend can reach).

The backend is **not** responsible for:

- Listings — the seller publishes these directly to Nostr relays from the browser (kind `30018`).
- Buyer ↔ seller chat — that's pure NIP-17 between browsers.
- Reviews — buyers publish kind `1985` directly.

The backend is the **escrow custodian** and the **fiat bridge**, not a full app server.

---

## Stack recommendation (final choice is yours)

- **Runtime:** Node.js 22+ or Bun
- **Framework:** Hono (light, edge-ready) or Express (familiar)
- **Database:** PostgreSQL via Prisma (orders need durable state, webhooks need idempotency)
- **Cache / queue:** Redis (for webhook retry queue + rate limiting)
- **Notifications:** Termii (NG SMS) and Resend or Postmark (email)
- **Hosting:** Render, Railway, or Fly.io — anything that gives you a public HTTPS URL for Bitnob webhooks

If you choose a different stack, document the rationale in this file under a new section.

---

## Environment variables

```env
# Server
PORT=3000
NODE_ENV=production
APP_URL=https://app.safesale.app
FRONTEND_URL=https://safesale.app

# Database
DATABASE_URL=postgresql://user:pass@host/safesale
REDIS_URL=redis://host:6379

# Bitnob (NGN ↔ sats on/off-ramp)
BITNOB_API_KEY=
BITNOB_WEBHOOK_SECRET=
BITNOB_BASE_URL=https://api.bitnob.co

# Nutshell mint (Cashu)
MINT_URL=https://mint.nutshell.cash
MINT_API_KEY=                # if required by your mint deployment

# Nostr — escrow service key (publishes kind 33888)
ESCROW_NSEC=                 # bech32 nsec, NEVER commit to git
NOSTR_RELAYS=wss://relay.damus.io,wss://nos.lol,wss://relay.nostr.band,wss://relay.primal.net

# Nostr — mediator key (publishes kind 33889)
MEDIATOR_NSEC=               # bech32 nsec, NEVER commit to git

# Notifications
TERMII_API_KEY=
TERMII_SENDER_ID=SafeSale
RESEND_API_KEY=
NOTIFICATION_FROM_EMAIL=noreply@safesale.app

# Admin
ADMIN_PUBKEYS=npub1...,npub1...   # comma-separated allowlist
JWT_SECRET=                       # for admin session tokens

# Rate limiting
RATE_LIMIT_RPM=60
```

A `.env.example` mirroring this is committed at the repo root.

---

## Data model (Prisma schema sketch)

```prisma
model Order {
  id                String   @id @default(cuid())
  token             String   @unique           // short URL token, e.g. "ord_xk29mp"

  listingCoord      String                     // "30018:<seller-pubkey>:<d-tag>"
  sellerPubkey      String
  buyerPubkey       String                     // one-time, generated at checkout

  amountNGN         Int                        // integer naira
  amountSats        Int

  // Bitnob
  bitnobAccountId   String?                    // virtual account ID
  bitnobAccountNo   String?
  bitnobBankName    String?
  bitnobExpiresAt   DateTime?

  // Cashu
  mintUrl           String
  cashuToken        String?    @db.Text        // sensitive; encrypt at rest if possible
  cashuTokenHash    String?
  p2pkPubkey        String?

  // Delivery
  deliveryAddressEnc String?   @db.Text        // NIP-44 to seller
  buyerContactEnc    String?   @db.Text
  buyerContactHint   String?                   // e.g. "j***@gmail.com" for UI

  // Shipping
  carrier           String?
  trackingNumber    String?

  // Status
  status            OrderStatus                 // see enum
  paidAt            DateTime?
  lockedAt          DateTime?
  shippedAt         DateTime?
  deliveredAt       DateTime?
  releasedAt        DateTime?
  autoReleaseAt     DateTime?

  // Nostr
  orderEventId      String?                    // most recent kind 33888 ID

  dispute           Dispute?

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

enum OrderStatus {
  pending_payment
  payment_locked
  shipped
  delivered
  released
  disputed
  resolved
  refunded
  expired
}

model Dispute {
  id              String   @id @default(cuid())
  orderId         String   @unique
  order           Order    @relation(fields: [orderId], references: [id])
  reason          String                       // wrong_item | damaged | not_as_described | not_received | return_request
  status          DisputeStatus
  openedBy        String                       // pubkey of opener (usually buyer)
  openedAt        DateTime @default(now())
  escalatedAt    DateTime?
  resolvedAt      DateTime?
  resolutionEventId String?                    // kind 33889 ID
  resolutionOutcome String?                    // release_seller | refund_buyer | split
  buyerPct        Int?                         // 0-100 when split
  reasoning       String?  @db.Text
  evidence        Evidence[]
}

enum DisputeStatus {
  open
  direct_resolution
  escalated
  evidence_requested
  resolved
}

model Evidence {
  id        String   @id @default(cuid())
  disputeId String
  dispute   Dispute  @relation(fields: [disputeId], references: [id])
  uploader  String                              // "buyer" | "seller" | "mediator"
  url       String                              // Blossom or nostr.build URL
  uploadedAt DateTime @default(now())
}

model WebhookEvent {
  id          String   @id @default(cuid())
  provider    String                            // "bitnob"
  externalId  String   @unique                  // dedupe key
  payload     Json
  status      String                            // received | processed | failed
  attempts    Int      @default(0)
  receivedAt  DateTime @default(now())
}
```

---

## HTTP API

All endpoints return JSON. Errors use:

```json
{ "error": { "code": "ORDER_NOT_FOUND", "message": "..." } }
```

CORS: allow `FRONTEND_URL` origin only. All POST endpoints require `Content-Type: application/json`.

### Public — buyer-facing

#### `POST /api/orders`

Create a new order. Called when the buyer submits the checkout form.

**Request:**
```json
{
  "listingCoord": "30018:<seller-pubkey>:<d>",
  "deliveryAddress": "<plaintext>",
  "buyerContact": "<email or phone>",
  "contactChannel": "email" | "sms",
  "buyerPubkey": "<hex>"          // optional; if absent, backend generates one-time keypair
}
```

**Response:**
```json
{
  "order": {
    "id": "...",
    "token": "ord_xk29mp",
    "amountNGN": 8500,
    "amountSats": 12500,
    "bitnob": {
      "accountNumber": "0124558947",
      "bankName": "Access Bank",
      "accountName": "SafeSale Escrow",
      "expiresAt": "2026-05-21T15:00:00Z"
    },
    "orderUrl": "https://safesale.app/order/ord_xk29mp"
  },
  "buyerKeypair": {                  // only if backend generated it
    "nsec": "...",                   // returned ONCE; client must store
    "npub": "..."
  }
}
```

Side effects:
- Creates `Order` row with status `pending_payment`
- Calls Bitnob to create a virtual account
- Publishes initial kind `33888` event with `status=pending_payment`
- Schedules a 24h expiry job

#### `GET /api/orders/:token`

Read the current state of an order. Public — token is unguessable.

**Response:** the `Order` object, minus the cashu token (never returned over HTTP).

#### `POST /api/orders/:token/release`

Buyer releases payment.

**Request:**
```json
{
  "p2pkUnlockSig": "<schnorr sig over the cashu spend>"
}
```

Backend forwards the signed token to the mint for redemption → Lightning payment to seller's address. Updates order to `released`. Publishes updated kind 33888.

#### `POST /api/orders/:token/dispute`

Buyer opens a dispute.

**Request:**
```json
{
  "reason": "wrong_item",
  "description": "Item arrived in wrong color and one size smaller",
  "evidence": ["https://nostr.build/i/...", "..."]
}
```

Side effects: freeze the Cashu token (mint API), create `Dispute` row, publish kind 33889 with `status=open`.

---

### Authenticated — seller-facing

Auth: NIP-98 HTTP Auth (signed event in `Authorization` header). Pubkey from the signed event becomes the actor.

#### `POST /api/seller/orders/:token/ship`

Seller marks an order as shipped.

**Request:**
```json
{
  "carrier": "DHL",
  "trackingNumber": "1234567890"
}
```

Requires: order's `sellerPubkey == auth.pubkey`. Updates order to `shipped`, sets `autoReleaseAt = now + 7 days`, publishes updated kind 33888, sends Nostr DM + SMS to buyer.

#### `POST /api/seller/payout`

Cash out sats to NGN via Bitnob.

**Request:**
```json
{
  "amountSats": 50000,
  "bankAccount": { "bank": "GTB", "accountNumber": "0123456789" }
}
```

---

### Authenticated — admin/mediator

Auth: NIP-98 + pubkey must be in `ADMIN_PUBKEYS`.

#### `GET /api/admin/disputes?status=escalated`

List disputes in the queue.

#### `GET /api/admin/disputes/:id`

Full dispute detail with all evidence and chat log references.

#### `POST /api/admin/disputes/:id/request-evidence`

Open a 24h evidence window. Sends NIP-17 DMs to both parties.

#### `POST /api/admin/disputes/:id/resolve`

**Request:**
```json
{
  "outcome": "split",                  // "release_seller" | "refund_buyer" | "split"
  "buyerPct": 60,                      // required when outcome == "split"
  "reasoning": "After reviewing photos…"
}
```

Side effects: split/release the Cashu token, refund the buyer via Bitnob if needed, publish a kind 33889 event signed by the mediator key with `status=resolved`, send NIP-17 DMs to both parties with the reasoning.

---

### Webhooks

#### `POST /api/webhooks/bitnob`

Bitnob calls this when fiat lands in a virtual account.

- Verify signature against `BITNOB_WEBHOOK_SECRET` (HMAC-SHA256).
- Dedupe by `externalId` into `WebhookEvent`.
- Match payment to an order by `bitnobAccountId`.
- If `amount >= order.amountNGN`: call Nutshell mint to mint Cashu tokens locked to `p2pkPubkey`. Update order to `payment_locked`. Publish updated kind 33888. Send Nostr DM to seller + SMS/email to buyer with the order URL.
- If `amount < order.amountNGN`: partial-payment policy (initial MVP: reject, refund via Bitnob).
- Respond `200 OK` only after persistence. Bitnob retries non-2xx.

---

## Background jobs

| Job | Frequency | What it does |
|---|---|---|
| `expirePendingOrders` | every 5 min | Marks orders past `bitnobExpiresAt` as `expired`, closes the Bitnob account |
| `autoReleaseShipped` | every 5 min | For orders with `status=shipped` and `autoReleaseAt < now`, releases the Cashu token to the seller and marks `released` |
| `escalateStaleDirectResolutions` | every 15 min | Disputes in `direct_resolution` for >72h move to `escalated` |
| `retryFailedWebhooks` | every 1 min | Replays `WebhookEvent` rows with `status=failed` and `attempts < 5` |

---

## Notification triggers

| Event | Buyer notified | Seller notified | Channel |
|---|---|---|---|
| Order created | order URL via email/SMS | new order via Nostr DM | SMS/Email + NIP-17 |
| Payment locked | confirmation | "ready to ship" | Email/SMS + NIP-17 |
| Shipped | tracking | — | SMS + NIP-17 |
| Dispute opened | confirmation | "respond within 72h" | Email + NIP-17 |
| Dispute resolved | outcome + reasoning | outcome + reasoning | Email + NIP-17 |
| Released | "thank you, leave a review" | "paid out, leave a review" | Email + NIP-17 |

---

## Security requirements

1. **Never log Cashu tokens.** They are bearer money. Log the hash only.
2. **Encrypt `cashuToken` and `*Enc` columns at rest.** Use Postgres `pgcrypto` or app-layer AES-GCM with a key from a secrets manager (not `.env`).
3. **NIP-98 verification** for all authenticated endpoints. Reject events older than 60s or with non-matching URL.
4. **Webhook signature verification is mandatory** before any state change.
5. **Admin endpoints check `pubkey ∈ ADMIN_PUBKEYS` AND the auth event**. Two checks, not one.
6. **Rate-limit per-IP and per-pubkey** on `/api/orders` and `/api/orders/:token/dispute` (abuse prevention).
7. **CSP-friendly** — no inline scripts in any HTML response.
8. **Mediator key rotation procedure** documented in a runbook (not in this file). At minimum: publish a new kind 30078 event signed by the *old* key declaring the new one.

---

## Local development

```bash
# Backend
cp .env.example .env
docker compose up -d postgres redis
npm install
npm run db:migrate
npm run dev
```

Frontend will look for `VITE_API_URL` (default `http://localhost:3000`). See frontend `.env.example`.

---

## Open questions for the backend implementer

1. **Self-hosted Nutshell or hosted mint?** Self-hosting gives full control and removes a third party from the trust model, but adds operational burden. For MVP, recommend a hosted mint (`mint.minibits.cash` or `mint.nutshell.cash`).
2. **NGN refunds via Bitnob:** what's the latency? Affects buyer-side UX copy ("you'll see your refund in ~5 minutes" vs "1-2 business days").
3. **Should the buyer's one-time nsec be backed up server-side?** Trade-off: backing it up means SafeSale can recover orders for buyers who lose their browser data; not backing it up means stronger sovereignty but more lost orders. Recommend: hashed-and-encrypted server-side backup, decryption requires a buyer-provided secret (email OTP).
