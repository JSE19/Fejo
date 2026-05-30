Stack Decision Record
Component	plan.md said	Final decision	Why
Nostr library	NDK	Nostrify (frontend) + nostr-tools (backend)	Nostrify already works for query, publish, keygen, login, profile fetch. nostr-tools handles backend publishing. No reason to swap.
State management	Zustand	TanStack Query	Already wired into 18 hooks and all pages. Handles polling, caching, mutations. Works.
Relay	strfry (self-hosted)	Deferred	Public relays work for MVP. strfry is infra overhead.
PWA	PWA delivery	Keep existing	Already has manifest.webmanifest. Add vite-plugin-pwa post-MVP.
Name	SafeSwap	SafeSale	Brand name unchanged.
NIP-17 DMs	Vendor notifications	Deferred	In-app notifications + Resend email for MVP.
Cashu mint	Remove	Remove	No more cryptographic escrow.
Bitnob	Remove	Remove	Replaced by MavaPay.
Phase 1 — Backend: MavaPay Service + Prisma Schema + Cron
1a. Prisma Schema Changes
prisma/schema.prisma
EscrowStatus enum:
pending_payment  // unchanged
paid             // was: payment_locked
shipped          // unchanged
delivered        // unchanged
completed        // was: released
disputed         // unchanged
refunded         // unchanged
Seller model — add:
bankVerifiedName String?   // returned by MavaPay Name Enquiry
bankVerifiedAt   DateTime? // when Name Enquiry was last verified
Order model — remove:
- cashuToken (no longer needed)
- bitnobAccount (removed)
- bitnobBank (removed)
- amountSats (optional — only relevant if sats payout is chosen)
- expiresAt (Bitnob virtual account expiry — replace with MavaPay link expiry if MavaPay supports it)
Order model — add:
mavapayPaymentLinkId String?  // MavaPay payment link reference
mavapayPaymentRef    String?  // MavaPay transaction reference from webhook
New model — WebhookEvent (idempotency):
model WebhookEvent {
  id          String   @id @default(cuid())
  provider    String   // "mavapay"
  externalId  String   @unique // dedupe key from MavaPay
  payload     Json
  status      String   // "received" | "processed" | "failed"
  attempts    Int      @default(0)
  receivedAt  DateTime @default(now())
}
1b. New File: services/mavapay.ts
Three exported functions:
// Create a one-time payment link for buyer checkout
// Returns checkout URL to redirect the buyer to
async function createPaymentLink(params: {
  amountNGN: number;       // in naira (converted to kobo internally)
  orderToken: string;      // for callbackUrl
  callbackUrl: string;     // https://api.safesale.app/api/webhooks/mavapay
  redirectUrl: string;     // https://safesale.app/order/:token/paid
  customerEmail?: string;  // buyer's email for MavaPay receipt
}): Promise<{
  checkoutUrl: string;
  paymentLinkId: string;
  expiresAt: string;
}>

// Verify a bank account before saving vendor payout details
// Called during vendor onboarding + payout preference update
async function nameEnquiry(params: {
  bankCode: string;
  accountNumber: string;
}): Promise<{
  accountName: string;       // verified account holder name
  bankName: string;
}>

// Withdraw funds from SafeSale's MavaPay wallet
// Called on buyer release or dispute resolution
async function withdraw(params: {
  amount: number;            // in kobo
  currency: 'NGN' | 'BTC';
  // For NGN bank transfer:
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
  // For sats Lightning:
  lnInvoice?: string;
  reference: string;         // unique idempotency key
}): Promise<{
  status: string;
  transactionRef: string;
}>
Env vars (in env.ts):
MAVAPAY_API_KEY=pk_...
MAVAPAY_SECRET_KEY=sk_...     // for HMAC webhook verification
MAVAPAY_BASE_URL=https://api.mavapay.co
MAVAPAY_BANK_CODE=000001       // SafeSale's settlement bank code
1c. New File: services/scheduler.ts
// Auto-release shipped orders after 7 days of buyer silence
// Runs every 5 minutes via setInterval

export function startAutoReleaseCron(): NodeJS.Timeout;
export function stopAutoReleaseCron(handle: NodeJS.Timeout): void;
Cron batch logic:
1. prisma.order.findMany({ where: { status: 'shipped', autoReleaseAt: { lte: new Date() } } })
2. For each order: call mavapay.withdraw() with vendor's pre-verified bank details
3. Update order to completed
4. Send Resend email to buyer
5. Publish NIP-32 reputation event via services/nostr.ts
1d. Modify src/index.ts
Remove:
- Line 7: import { verifyMintCapabilities } from './services/cashu.js'
- Lines 148-153: background Cashu mint check
- Line 12: import escrowRoute from './routes/escrow.js'
- Line 117: await app.register(escrowRoute)
Add:
- import { startAutoReleaseCron, stopAutoReleaseCron } from './services/scheduler.js'
- import mavapayRoute from './routes/mavapay.js'
- await app.register(mavapayRoute)
- After app.listen(...): const cronHandle = startAutoReleaseCron()
- In shutdown(): stopAutoReleaseCron(cronHandle)
1e. Modify routes/sellers.ts
POST /api/sellers — add Name Enquiry step:
- If bankName && bankAccount provided:
1. Call mavapay.nameEnquiry({ bankCode: env.MAVAPAY_BANK_CODE, accountNumber: body.bankAccount })
2. Compare returned accountName with body.bankHolder
3. If match → store bankVerifiedName = accountName, bankVerifiedAt = now()
4. If mismatch → return 400 { error: "Account name mismatch: expected 'X', MavaPay returned 'Y'" }
New: PATCH /api/sellers/:id/payout — update payout preference:
- Same Name Enquiry verification for bank details
- Also accepts lnAddress for sats payout
- Returns updated seller
1f. Modify routes/orders.ts
POST /api/orders — create order with MavaPay link:
- Create Order row with status: pending_payment
- Call mavapay.createPaymentLink(...) with amountNGN, orderToken, callbackUrl, redirectUrl
- Store mavapayPaymentLinkId on Order
- Return { checkoutUrl, orderToken } (frontend redirects browser to checkoutUrl)
POST /api/orders/:token/release — release payment:
- Verify order status is shipped or delivered
- Call mavapay.withdraw() with vendor's pre-verified bank/LN details
- Update status to completed, set releasedAt = now()
- Send Resend email, publish NIP-32 label event
POST /api/orders/:token/dispute — open dispute:
- Update order to disputed
- No MavaPay call needed — funds stay in SafeSale's wallet
- Set directResolutionUntil = now + 72h
- Notify seller via in-app notification
1g. Modify routes/webhooks.ts → routes/mavapay.ts
New route file: POST /api/webhooks/mavapay:
- Verify HMAC-SHA256 signature using MAVAPAY_SECRET_KEY
- Dedupe: check WebhookEvent by externalId
- Handle payment_link.settled event:
1. Match to Order by paymentLinkId
2. Verify amount >= order.amountNGN * 100 (in kobo)
3. Update order: status = paid, store mavapayPaymentRef
4. Send Resend email to buyer with tracking link
5. Send in-app notification to seller ("New order — ship now")
- Handle payment_link.failed event (optional):
1. Update order: status = expired
1h. Delete or Repurpose routes/escrow.ts
Cashu escrow routes are no longer needed. Delete the file and remove from index.ts.
1i. Update env.ts
// Remove:
BITNOB_API_KEY
BITNOB_WEBHOOK_SECRET
BITNOB_BASE_URL
CASHU_MINT_URL
SAFESALE_NSEC       // rename to keep? Actually still needed for Nostr

// Add:
MAVAPAY_API_KEY
MAVAPAY_SECRET_KEY
MAVAPAY_BASE_URL
MAVAPAY_BANK_CODE
MAVAPAY_WEBHOOK_BASE_URL=   

// Keep:
SAFESALE_NSEC       // still needed for Nostr brand identity
MEDIATOR_NSEC       // still needed for dispute resolution
1j. Update .env.example
Mirror all env var changes.
1k. package.json — remove dependency
Remove: "@cashu/cashu-ts": "^2.9.0"
This is the only dep change. MavaPay is a REST API — no SDK needed unless they have one (if they do, add it).
Phase 2 — Frontend: Cashu Cleanup + Pay Flow
2a. Delete Files
File
src/lib/cashu/wallet.ts
src/lib/cashu/types.ts
src/lib/cashu/index.ts
src/lib/cashu/cashu.test.ts
src/hooks/useCashuWallet.ts
src/hooks/useEscrowToken.ts
2b. Update src/lib/api/types.ts
Remove from Order type:
cashuToken?: string
cashuTokenHash?: string
p2pkPubkey?: string
mintUrl?: string
bitnobAccount?: string
bitnobBank?: string
Remove from CreateOrderResponse:
bitnob: { accountNumber, bankName, accountName, expiresAt }
buyerKeypair: { nsec, npub }
Add to Order type:
mavapayPaymentLinkId?: string
mavapayPaymentRef?: string
Change CreateOrderResponse:
{
  orderToken: string;
  checkoutUrl: string;
}
Status enum: payment_locked → paid
2c. Update src/lib/api/client.ts
- createOrder() → calls POST /api/orders, returns { orderToken, checkoutUrl }
- Remove Bitnob-related method signatures
- Type return values match new MavaPay shapes
2d. Update src/lib/api/mocks.ts
- Replace Bitnob mock data with MavaPay-shaped mocks
- Mock checkoutUrl → https://checkout.mavapay.co/...
2e. Update src/lib/mock.ts
- Remove Cashu/Bitnob fixture data
- Remove seeded listing references that pointed at Cashu mint
2f. Update src/pages/Checkout.tsx
Current flow: Submit order → show Bitnob virtual account number + bank details
New flow:
1. Collect delivery address + email
2. apiClient.createOrder(...) → returns { checkoutUrl, orderToken }
3. window.location.href = checkoutUrl — redirect to MavaPay hosted checkout
4. After payment, MavaPay redirects to /order/:orderToken/paid
2g. Update src/pages/BuyerOrder.tsx
Remove:
- P2PK/Cashu release signing (useEscrowToken, useCashuWallet)
- "Cryptographically locked" language
- Cashu token hash display
- P2PK signature UI
Keep:
- Order status display (updated: payment_locked → paid)
- Timeline (simplified: no more "Cryptographic lock" step)
- "Release Payment" button → calls POST /api/orders/:token/release
- "Open Dispute" button → calls POST /api/orders/:token/dispute
- Seller info, product info, tracking
Polling: Still uses TanStack Query with 8s interval via useSellerOrders / apiClient.getOrder.
2h. Update src/lib/buyerKey.ts
Remove Cashu P2PK key derivation code. Keep the one-time Nostr keypair generation for buyer identity (still needed for order association).
2i. New or Update: /order/:token/paid landing page
Add a confirmation page at /order/:token/paid that:
- Shows "Payment received — your funds are secure"
- Links to the main order page /order/:token
- This is the MavaPay redirectUrl destination
Phase 3 — Frontend: Copy Updates
3a. Landing.tsx
Hero section:
- "Built on Cashu + Nostr" → "Powered by MavaPay + Nostr"
- Remove P2PK/ cryptographic lock language
FAQ changes:
- Q: "Who holds the money?" → A: "Held in a regulated MavaPay wallet. SafeSale can't touch your funds without your confirmation. MavaPay is a licensed payment processor."
- Q: "What if SafeSale disappears?" → A: "Funds are held by MavaPay, a regulated fintech. If SafeSale goes down, MavaPay has a process to return funds. Unlike Cashu ecash which is bearer money, your money is in a regulated wallet."
- Q: "How does escrow work without crypto?" → A: "MavaPay holds the funds in a dedicated wallet. When you confirm receipt, we instruct MavaPay to release to the seller. If there's a dispute, funds stay frozen until resolved."
- Remove: "Nobody — not even SafeSale — can move your money" (this was true for Cashu P2PK, not for MavaPay custodial)
3b. HowItWorks.tsx
- Update step 3: "Buyer pays via bank transfer through MavaPay's secure checkout" (instead of "Buyer sends to Bitnob virtual account")
- Update step 5: "Funds held by MavaPay until buyer confirms" (instead of "Cryptographically locked to buyer's key")
- Update step 6: "MavaPay sends sats or naira to seller" (instead of "Lightning payout from Cashu mint")
3c. ForSellers.tsx
- Replace "Bitnob" references with "MavaPay"
- Explain payout: "Choose bank transfer or Lightning. Your bank account is verified via MavaPay Name Enquiry before the first payout."
3d. components/safesale/EscrowShield.tsx
- Update copy: "Funds secured by MavaPay" instead of "Cryptographically locked in Cashu escrow"
- Keep the shield icon — it still represents escrow
3e. components/safesale/EscrowStatus.tsx
- payment_locked → paid label
- Remove Cashu-specific details from tooltip/description
3f. components/safesale/Timeline.tsx
- Remove "Cryptographically locked" step label
- Simplify to: Paid → Shipped → Delivered → Released
- Remove P2PK/token language from tooltips
3g. app/DashboardHome.tsx
- Update "Locked in escrow" KPI → "Pending payout" (funds are in MavaPay wallet awaiting release)
- Update "Paid out" KPI to reflect MavaPay withdrawals
3h. components/safesale/MarketingLayout.tsx
- Remove "Cashu + Nostr" tagline
Phase 4 — Prisma Migration
cd safe-sale-backend/safe-sales-backend
npm run db:migrate -- --name replace-bitnob-with-mavapay
Generate migration. Verify it applies cleanly against local Postgres.
Phase 5 — Documentation Updates
File	Changes
PRD.md	Update "Why each technology" table: Bitnob → MavaPay, remove Cashu row. Update escrow description to custodial model. Update FAQ/copy references.
BACKEND.md	Update env vars, API contract (no more Cashu/Bitnob), webhook section (MavaPay instead of Bitnob). Update data model table.
NIP.md	Remove Cashu token/hash references from kind 33888 tags. Mention that reputation uses NIP-32 label format.
STATE.md (backend)	Update architecture description. Remove Cashu/Bitnob mentions.
plan.md	Replace with this plan or archive it.
Files to Delete
Path
safe-sales-backend/src/services/cashu.ts
safe-sales-backend/src/routes/escrow.ts
safe-sales-backend/src/services/lightning.ts (if exists)
safesale-frontend/src/lib/cashu/ (folder)
safesale-frontend/src/hooks/useCashuWallet.ts
safesale-frontend/src/hooks/useEscrowToken.ts
Files to Create
Path	Content
safe-sales-backend/src/services/mavapay.ts	MavaPay API client: createPaymentLink, nameEnquiry, withdraw
safe-sales-backend/src/services/scheduler.ts	Cron job: startAutoReleaseCron, stopAutoReleaseCron
safe-sales-backend/src/routes/mavapay.ts	Webhook handler: POST /api/webhooks/mavapay
safesale-frontend/src/pages/OrderPaid.tsx	Post-payment confirmation page for MavaPay redirect
What Does NOT Change
Layer	Status	Why
Nostrify (frontend)	✅ Untouched	All hooks, providers, auth components stay
nostr-tools (backend)	✅ Untouched	services/nostr.ts stays — still publishes brand events
TanStack Query	✅ Untouched	All 18 hooks, API client, caching, polling stay
React Router	✅ Untouched	All routes stay (one optional new: /order/:token/paid)
shadcn/ui components	✅ Untouched	56 primitives stay
Login/Auth flow	✅ Untouched	Nostrify login, nsec localStorage
9 page structure	✅ Untouched	All pages survive with minor copy edits
Name	✅ Still SafeSale	No rebranding
Resend email	✅ Untouched	Already wired, just update email content
React 19	✅ Untouched	No framework change
Vite + Tailwind 4	✅ Untouched	No build tool change
Fastify backend	✅ Untouched	Framework stays, routes update
Prisma + PostgreSQL	✅ Untouched	Still the data layer, schema updates only
Summary of Effort
Category	Files modified
Backend services	2 (nostr.ts, env.ts)
Backend routes	3 (sellers.ts, orders.ts)
Backend infra	1 (index.ts)
Backend schema	1 (schema.prisma)
Backend config	2 (package.json, .env.example)
Frontend lib	4 (types.ts, client.ts, mocks.ts, buyerKey.ts)
Frontend hooks	0
Frontend pages	3 (Checkout, BuyerOrder, OrderPaid*)
Frontend copy	8 (Landing, HowItWorks, ForSellers, EscrowShield, etc.)
Docs	4 (PRD, BACKEND, NIP, STATE)
Total	~28
One migration to run (db:migrate). One dependency removed (@cashu/cashu-ts). Zero new npm dependencies (MavaPay is REST).

callbackUrl: `${env.MAVAPAY_WEBHOOK_BASE_URL}/api/webhooks/mavapay`



Thought: 2.5s
Good catches on all 4. Let me fold them into the plan cleanly.
Gap 1 — MAVAPAY_WEBHOOK_BASE_URL
Agreed. Added to env vars and createPaymentLink uses it:
callbackUrl: `${env.MAVAPAY_WEBHOOK_BASE_URL}/api/webhooks/mavapay`
Gap 2 — Deduplicate secret key name
MAVAPAY_WEBHOOK_SECRET is the keeper. Drop MAVAPAY_SECRET_KEY.
Gap 3 — MAVAPAY_BANK_CODE removed
The vendor's bank code comes from the request body on Name Enquiry and from the Seller model at withdrawal time. No env var needed.
Gap 4 — 1% fee collection
Option A is correct for hackathon. One line in the release/dispute resolution flow:
const vendorAmount = Math.floor(order.amountKobo * 0.99)
Let me update the composite plan with these fixes, then ask what you want to do next.
← Write plan.md
+ Thought: 409ms
Right — plan mode, no file writes. Here's the corrected composite plan inline.
SafeSale v2 Implementation Plan (Corrected)
Stack Decision Record
Component	plan.md said	Final
Nostr	NDK	Nostrify (frontend) + nostr-tools (backend) — both work, no swap
State	Zustand	TanStack Query — already wired, works
Relay	strfry	Deferred
Name	SafeSwap	SafeSale — unchanged
NIP-17	Vendor DMs	Deferred — in-app + Resend for MVP
Cashu	Remove	Remove
Bitnob	Remove	Remove → MavaPay
Phase 1 — Backend: MavaPay + Schema + Cron
1a. Prisma Schema
EscrowStatus: payment_locked → paid
Seller — add:
bankVerifiedName String?
bankVerifiedAt DateTime?
Order — remove:
cashuToken, bitnobAccount, bitnobBank, amountSats, expiresAt
Order — add:
mavapayPaymentLinkId String?
mavapayPaymentRef String?
New model WebhookEvent:
id, provider ("mavapay"), externalId (unique, for dedupe), payload (Json), status, attempts, receivedAt
1b. New: services/mavapay.ts
createPaymentLink({ amountNGN, orderToken, callbackUrl, redirectUrl, customerEmail? })
  → { checkoutUrl, paymentLinkId, expiresAt }

nameEnquiry({ bankCode, accountNumber })
  → { accountName, bankName }

withdraw({ amountKobo, currency, bankCode?, accountNumber?, accountName?, lnInvoice?, reference })
  → { status, transactionRef, vendorAmount }  // vendorAmount = Math.floor(amountKobo * 0.99)
Fee: One line in release flow — const vendorAmount = Math.floor(order.amountKobo * 0.99). 1% retained in SafeSale's MavaPay wallet. Option A — simplest for hackathon.
callbackUrl built as:  `${env.MAVAPAY_WEBHOOK_BASE_URL}/api/webhooks/mavapay` 
1c. New: services/scheduler.ts
startAutoReleaseCron() — setInterval every 5 min:
1. Query shipped orders where autoReleaseAt <= now
2. Call mavapay.withdraw() for each
3. Update to completed, send Resend email, publish NIP-32 event
stopAutoReleaseCron(handle) — clearInterval on shutdown
1d. Modify src/index.ts
Remove: import { verifyMintCapabilities } from './services/cashu.js', background mint check (lines 148-153), escrowRoute import + register
Add: scheduler import, mavapayRoute import + register, startAutoReleaseCron() after listen, stopAutoReleaseCron() in shutdown
1e. Modify routes/sellers.ts
POST /api/sellers — Name Enquiry on bank details:
If bankCode + bankAccount provided → call mavapay.nameEnquiry({ bankCode, accountNumber })
Compare returned accountName with body.bankHolder
Match → store bankVerifiedName, bankVerifiedAt
Mismatch → 400 { error: "Account name mismatch: expected X, MavaPay returned Y" }
New: PATCH /api/sellers/:id/payout — update bank/LN preference with Name Enquiry verification
1f. Modify routes/orders.ts
POST /api/orders — create order → call mavapay.createPaymentLink({ callbackUrl }) → return { checkoutUrl, orderToken }
POST /api/orders/:token/release — verify shipped/delivered → call mavapay.withdraw() (deducts 1%) → status completed
POST /api/orders/:token/dispute — status disputed, no withdrawal, set directResolutionUntil = now + 72h
1g. New: routes/mavapay.ts
POST /api/webhooks/mavapay:
1. Verify HMAC-SHA256 via MAVAPAY_WEBHOOK_SECRET
2. Dedupe via WebhookEvent.externalId
3. On payment_link.settled: match to order by mavapayPaymentLinkId, verify amount, update to paid, send Resend email + in-app notification
1h. Delete routes/escrow.ts
Cashu escrow routes gone.
1i. Env Vars
Remove:
BITNOB_API_KEY
BITNOB_WEBHOOK_SECRET
BITNOB_BASE_URL
CASHU_MINT_URL
Add:
MAVAPAY_API_KEY=
MAVAPAY_WEBHOOK_SECRET=     # single name for HMAC verification
MAVAPAY_BASE_URL=            # sandbox/prod API URL
MAVAPAY_WEBHOOK_BASE_URL=    # ngrok in dev, Railway URL in prod
Keep:
SAFESALE_NSEC, SAFESALE_NPUB, MEDIATOR_NSEC, MEDIATOR_NPUB
NOSTR_RELAYS, DATABASE_URL
FRONTEND_ORIGINS, FRONTEND_ORIGIN_REGEXES, FRONTEND_APP_URL
PORT, NODE_ENV
RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_TEST_TO_EMAIL
SAFESALE_FEE_LN_ADDRESS
1j. Deps
Remove: @cashu/cashu-ts from package.json. MavaPay is REST — no SDK needed.
Phase 2 — Frontend: Cashu Cleanup + Pay Flow
2a. Delete
src/lib/cashu/ (folder — 4 files)
src/hooks/useCashuWallet.ts
src/hooks/useEscrowToken.ts
2b–2e. Types + Client + Mocks
Remove cashuToken, cashuTokenHash, p2pkPubkey, mintUrl, bitnobAccount, bitnobBank from Order types
CreateOrderResponse → { orderToken: string; checkoutUrl: string }
payment_locked → paid in status enum
Replace Bitnob mock shapes with MavaPay mock shapes
2f. Checkout.tsx
After order creation: window.location.href = checkoutUrl — redirect to MavaPay hosted checkout. No more Bitnob virtual account display.
2g. BuyerOrder.tsx
Remove P2PK signing, cashu token references. "Release Payment" → simple POST /api/orders/:token/release call. No cryptographic lock UI.
2h. lib/buyerKey.ts
Remove Cashu P2PK derivation. Keep one-time Nostr keypair generation for buyer identity.
2i. New page OrderPaid.tsx
Route /order/:token/paid — post-payment confirmation. Shows "Payment received" + link to /order/:token.
Phase 3 — Frontend: Copy Updates
File	Key change
Landing.tsx	"Built on Cashu + Nostr" → "Powered by MavaPay + Nostr". Rewrite FAQ for custodial model.
HowItWorks.tsx	Steps reference MavaPay checkout + wallet.
ForSellers.tsx	Replace Bitnob → MavaPay. Mention Name Enquiry.
EscrowShield.tsx	"Funds secured by MavaPay"
EscrowStatus.tsx	payment_locked → paid
Timeline.tsx	Remove "Cryptographically locked" step
DashboardHome.tsx	"Locked in escrow" → "Pending payout"
MarketingLayout.tsx	Remove "Cashu + Nostr" tagline
Phase 4 — Migration
npm run db:migrate -- --name replace-bitnob-with-mavapay
Files: Delete vs Create
Delete (5-6):
services/cashu.ts
routes/escrow.ts
src/lib/cashu/ (folder)
useCashuWallet.ts, useEscrowToken.ts
Create (4):
services/mavapay.ts
services/scheduler.ts
routes/mavapay.ts
src/pages/OrderPaid.tsx
What's Untouched
Nostrify, nostr-tools, TanStack Query, React Router, all 56 shadcn/ui components, login/auth flow, 9 page layouts, name (SafeSale), Resend email config, React 19, Vite, Tailwind 4, Fastify, Prisma, PostgreSQL.
Summary
~28 files modified, 4 created, 5-6 deleted
1 dependency removed (@cashu/cashu-ts)
0 new npm deps added
1 migration to run