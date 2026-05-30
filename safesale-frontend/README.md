# SafeSale

> **Trustless escrow for social-commerce sellers — works wherever you can paste a link.**

Instagram, WhatsApp, TikTok, X, Telegram, Threads, Linktree — anywhere a Nigerian seller can share a URL, SafeSale lets buyers pay safely. Funds are locked in a **Cashu ecash escrow token** until the buyer confirms delivery. If anything goes wrong, a signed Nostr-based mediation process resolves the dispute publicly and auditably.

Built for **Hack4Freedom**.

---

## The Problem: Zero-Trust Social Commerce

In Nigeria alone, millions of transactions happen weekly via WhatsApp and Instagram between parties who don't know each other. 
Buyers fear "pay-before-delivery" scams. Sellers fear "delivery-before-payment" theft. 
Centralized escrow platforms exist, but they are custodians who can (and do) freeze funds, block accounts, and insert themselves into every transaction.

## The Solution: Cryptographic Escrow

SafeSale is a decentralized escrow wedge that runs on Nostr and Cashu. 
1. **No Custodian:** SafeSale cannot freeze or seize funds.
2. **Buyer Control:** The Cashu token is P2PK-locked to the buyer's one-time Nostr pubkey. Only the buyer's signature can trigger the release.
3. **Open Reputation:** Seller reputation is stored on Nostr, owned by the seller, and verifiable by anyone.

## How it works 

1. **Seller signs up:** A Nostr keypair is generated in their browser (or they connect an existing one). This key *is* their account.
2. **Seller lists an item:** A permanent link (`safesale.app/buy/<id>`) is created. The backend publishes a Nostr kind `30018` event.
3. **Buyer taps the link:** Buyer pays into a unique Bitnob virtual account (mocked for demo).
4. **Escrow locked:** SafeSale mints a Cashu ecash token, **cryptographically locked** to the buyer's generated one-time Nostr pubkey (NUT-11 P2PK).
5. **Seller ships.**
6. **Buyer releases:** Buyer signs the release with their local key. The mint redeems the sats and the seller gets paid.  
7. **Dispute:** Token is frozen. A SafeSale mediator reviews evidence and signs a Nostr kind `33889` resolution that is permanently verifiable.

---

## Hackathon MVP Scope (Honest Disclosures)

The trustless escrow wedge (buyer pays → seller ships → buyer releases → seller gets sats) is fully mapped and runs end-to-end on testnet. 

Here is specifically what is real and what is deferred for post-hackathon:

| Feature | Hack4Freedom Demo | Production Target |
|---------|-------------------|------------------|
| **Escrow cryptograpy** | **Live**. Cashu mints and P2PK lock application works. | Same (Mainnet) |
| **Buyer signature** | **Live**. Release requires a valid Nostr signature. | Same |
| **Bitnob integration** | **Mocked**. Bitnob virtual NUBANs require real business KYC. We simulate the webhook `POST /api/webhooks/bitnob`. | Live NUBAN issuance |
| **Lightning payout** | **Deferred**. Sats settle to Cashu testnet on release. Mainnet melt back to the seller is a single config swap. | Live LN melt to NGN/Bank |
| **Reviews / Rep** | **Deferred**. Reputation UI exists as a placeholder. | Kind `1985` publishing |
| **Admin Panel** | **Live UI, Mock Data**. Mediator gate works securely, but backend endpoints are still being wired. | Fully wired |

---

## What's in this repo

This repo contains the **SafeSale web frontend**. The backend service lives in a separate codebase — see [`BACKEND.md`](./BACKEND.md) for the API contract.

- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS 4** + **shadcn/ui** + **lucide-react**
- **Nostrify** (`@nostrify/react`) — Nostr identity, relays, event publishing
- **TanStack Query** — data fetching and caching
- **React Router 7** — client-side routing

### Getting started

```bash
git clone git@github.com:JSE19/safe-sales.git
cd safe-sales
git checkout frontend
cp .env.example .env       # point VITE_API_URL to backend
npm install
npm run dev
```

App runs at `http://localhost:8080`.

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the Vite dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm test` | Type-check, lint, vitest, and vite build |

## Documents

- [`PRD.md`](./PRD.md) — Full product spec. Source of truth.
- [`NIP.md`](./NIP.md) — Nostr event kinds, tags, validation rules.
- [`BACKEND.md`](./BACKEND.md) — Backend service API contract and integrations.

## License

MIT

