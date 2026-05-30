Here is the complete MVP flow, every tool justified, nothing speculative.

SafeSwap MVP — Complete Flow & Stack

Tools & Why
ToolRoleWhyReact + ViteFrontend frameworkFastest setup, hot reload, everyone knows itTailwind CSSStylingNo custom CSS needed in a 2-week sprintPWAApp deliveryNo app store install — works on any Nigerian Android browserZustandFrontend stateLightweight, manages order status and wallet state cleanlyNDK (Nostr Dev Kit)Nostr identity + messagingHandles keypairs, relay connections, NIP-17 DMs, event signing out of the boxstrfry relayYour own Nostr relaySelf-hosted on a $5 Hetzner VPS — guarantees your listings and reputation events are always upNode.js + FastifyBackend APITypeScript-native, handles Mavapay webhooks, order state, payout logicPostgreSQL on RailwayDatabaseStores orders, escrow state, vendor payout preference — not funds, funds live in MavapayRailway.appHostingOne-click deploy, free tier, auto-SSL, built-in environment variablesMavapayAll money movementNGN bank transfer in → NGN wallet held by you → NGN bank transfer out OR sats via Lightning invoice out. Single API. Has webhooks.ResendTransactional emailAlready set up — sends tracking link, shipping alert, payout confirmation
No Cashu mint. No Bitnob. Those are gone.

The Complete Flow

PHASE 1 — Vendor Onboarding

Vendor visits SafeSwap (PWA, no install).
Clicks "I am a seller".
NDK generates a Nostr keypair locally in the browser. The nsec (private key) is stored only in localStorage — it never touches your server.
Vendor enters display name and product category.
Vendor creates their first listing: title, description, price in naira, photos.
Your backend publishes the listing as a NIP-15 Nostr event to your strfry relay.
A shareable SafeSwap listing URL is generated: safeswap.app/l/abc123
Vendor copies this and pastes it into their Instagram bio or WhatsApp status.
Vendor sets their payout preference: naira (bank details) or sats (Lightning address).


Why NIP-15? It's an existing Nostr standard for marketplace listings — means a vendor's listings are portable and viewable on any Nostr marketplace client in the future, not just SafeSwap.


PHASE 2 — Buyer Clicks the Link

Buyer sees the link on Instagram or WhatsApp, clicks it — opens in their phone browser.
They see the product photo, description, price in naira, and seller's reputation score.
Buyer clicks "Buy Safely".
A short form collects: shipping address + email address (for tracking link delivery).
Your backend generates a Nostr one-time keypair for this buyer (stored in localStorage). This is their identity for this transaction — they don't need to know it exists.
Your backend creates an order record in PostgreSQL: status PENDING_PAYMENT, links buyer Nostr key, vendor Nostr key, listing ID, shipping address.
Your backend calls Mavapay API to create a One_Time payment link:

paymentCurrency: NGN
paymentMethods: [BANKTRANSFER]
settlementCurrency: NGN ← funds land in your SafeSwap Mavapay NGN wallet, not auto-forwarded to vendor
settlementMethod: not applicable (NGN to NGN)
addFeeToTotalCost: true ← Mavapay's fee goes on top of the item price, so vendor always receives the exact item price
amount: item price in kobo
callbackUrl: your backend webhook endpoint


Buyer is redirected to Mavapay's hosted checkout page.
Buyer pays ₦8,500 (or whatever the price is) via normal bank transfer on their banking app — GTBank, Kuda, USSD, anything.


PHASE 3 — Payment Confirmed (Webhook)

Mavapay fires payment_link.settled webhook to your backend.
Your backend verifies the webhook signature using HMAC-SHA256.
Order status updated in PostgreSQL: PAID. Funds now sit in your SafeSwap Mavapay NGN wallet — this is the escrow.
Your backend generates a unique order tracking token (UUID).
Resend sends the buyer an email:

"Your payment of ₦8,500 is secured with SafeSwap. The vendor cannot access it until you confirm receipt. Track your order here: [link]"


Your backend sends the vendor a Nostr NIP-17 encrypted DM via NDK:

"New order! ₦8,500 is locked. Ship to: [address]. Order ID: [id]. Once buyer confirms receipt, funds release to you."


The tracking link page (safeswap.app/order/[token]) shows real-time order status to the buyer.


Why NIP-17 and not email for vendor? Because vendors are onboarded with a Nostr keypair. NIP-17 DMs are encrypted end-to-end, delivered via your relay, and don't require the vendor to share a phone number or email. Email is used for buyers because buyers are anonymous — they only gave an email address.


PHASE 4 — Vendor Ships

Vendor logs into SafeSwap with their Nostr key (NIP-07 browser extension on desktop, or nsec from localStorage on mobile).
Vendor sees the pending order in their dashboard.
Vendor marks it as "Shipped" and optionally enters a courier tracking number.
Order status updated: SHIPPED.
Resend emails the buyer:

"Your item is on the way. [Tracking number if provided]. Once it arrives, return here to release payment to the seller."


Nostr NIP-17 DM also sent to buyer's keypair (in case they are using a Nostr client).


PHASE 5 — Buyer Confirms Receipt

Buyer receives item, returns to their tracking link.
They click "I received my item — release payment".
Order status updated: COMPLETED.
Your backend calls Mavapay withdraw API based on vendor's saved preference:

Naira: POST /withdraw with vendor's bank account details (account number, bank code, account name — pre-verified via Mavapay Name Enquiry when vendor onboarded).
Sats: POST /withdraw/btc with the vendor's Lightning invoice (vendor generates this from their wallet — Phoenix, Wallet of Satoshi, Alby, etc. — and submits it).


Mavapay processes the payout.
Resend emails both parties: transaction complete, with a summary.
Your backend publishes a NIP-32 label/review event on your Nostr relay — this is the vendor's reputation record. In MVP, it's signed by your relay key. Post-MVP, the buyer signs it directly with their keypair.


PHASE 6 — Dispute (If Buyer Has a Problem)

Buyer clicks "There is a problem with my order" instead of releasing.
Order status: DISPUTED. No withdraw call is made — funds stay frozen in your Mavapay NGN wallet.
Nostr NIP-17 DMs sent to both vendor and buyer notifying them of the dispute.
Both parties can now message each other directly using Nostr NIP-17 DMs — encrypted, no chat server needed, no third-party messaging app.
If they resolve it themselves: either party signals resolution through their SafeSwap dashboard. Funds release in the agreed direction.
If unresolved after 72 hours: you (SafeSwap mediator) review the case, manually decide, and call the Mavapay withdraw API in the appropriate direction. You publish the decision as a signed Nostr event — permanently auditable.


Why NIP-17 for dispute comms and not WhatsApp? Because it keeps the conversation on record and linked to the transaction by Nostr keypair. It's also the technology your hackathon is built around. Practically, most disputes will just be people messaging each other and reaching a quick resolution.


PHASE 7 — Auto-Release (Silent Buyer Protection)

A cron job runs daily on your backend.
It queries PostgreSQL for any orders in SHIPPED status older than 7 days with no buyer action.
For each one, it automatically calls Mavapay withdraw to pay the vendor.
Resend emails the buyer: "Your order was automatically completed after 7 days. Funds have been released to the seller."
NIP-32 reputation event published.

This protects vendors from buyers who receive goods and go silent.

What the Complete Data Flow Looks Like
Buyer pays NGN (bank transfer)
        ↓
Mavapay hosted checkout
        ↓
payment_link.settled webhook → Your backend
        ↓
Funds held in YOUR Mavapay NGN wallet (the escrow)
        ↓
Buyer confirms receipt
        ↓
Your backend calls Mavapay /withdraw
        ↓
Vendor receives NGN to bank account  ←→  OR  ←→  Sats via Lightning invoice

What Each Technology Is Actually Doing

Mavapay — the entire money layer. In, hold, out. That's it.
Nostr — vendor identity (keypair), listings (NIP-15), encrypted notifications (NIP-17), reputation history (NIP-32). The thing that makes SafeSwap different from a basic escrow site.
PostgreSQL — order state machine. Every status change is a row update.
Resend — buyer communications, because buyers are anonymous and don't have Nostr keys set up.
Fastify backend — listens to Mavapay webhooks, drives the state machine, calls withdraw at the right moment, publishes Nostr events.
strfry relay — your own Nostr relay so your events are always reachable and not at the mercy of public relays going down during your demo.
PWA — means your demo works on any phone in the room without anyone downloading an app.