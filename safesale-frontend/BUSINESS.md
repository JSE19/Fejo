# BUSINESS.md — SafeSale Monetization

> This document defines how SafeSale earns money. It is the basis for the pitch deck, the financial model, and any future investor or partnership conversation.

## Principles

1. **Free on the happy path.** Every successful trade where buyer and seller agree costs nothing. This is the foundation of adoption.
2. **Earn only when we add value.** Revenue should be tied to a service the user actually consumes — mediation, premium features — not a tax on every transaction.
3. **No hidden fees in the FX spread.** If we ever earn from on/off-ramps, the spread is disclosed at the point of conversion. Trust is the product.

## Revenue streams (in priority order)

### 1. Dispute mediation fee — primary launch revenue

When a dispute escalates to SafeSale mediation and the mediator issues a resolution, SafeSale takes **5% of the disputed amount**, deducted from the side that loses (or split proportionally if the resolution is a split).

- Free happy path → no friction for trust-building trades
- Only kicks in when the mediator does work the parties couldn't do themselves
- Aligns incentives: SafeSale earns by being trustworthy and decisive
- Caps abuse: bad actors who weaponize disputes pay the fee themselves when they lose

### 2. Pro tier subscription — recurring revenue (Q3 launch)

**₦2,000 / month** or **₦20,000 / year** for sellers who want:

- Verified Shop badge (issued as a NIP-58 badge from a SafeSale-controlled key)
- Custom subdomain (`amaka.safesale.app`) instead of `/@amaka`
- Inventory analytics — views, conversion, abandoned checkouts
- Bulk listing import (CSV → 30018 events)
- Priority customer support
- Higher Blossom upload limits

### 3. Reputation portability fee — long-term (Year 2+)

Once SafeSale's signed-review attestations have ecosystem value, other Nostr marketplaces can query the SafeSale reputation index via a paid API. Free for individual users; commercial integrations pay per-query.

### 4. Bitnob spread — explicitly declined for now

We will **not** earn from the NGN ↔ sats spread via Bitnob. Bitnob is the regulated rail; we pass through their pricing transparently. If we ever change this, it must be disclosed at the point of conversion.

## Unit economics (back-of-envelope)

Assumptions for a launch market (Lagos + Accra + Nairobi):

| Metric | Value |
|---|---|
| Average order value | ₦8,500 (~$5.50) |
| Dispute rate | 5% (conservative; social commerce industry sits at 3-8%) |
| Mediated resolution rate (of disputes) | 60% (rest resolved direct) |
| Mediation fee | 5% of order value |
| Pro tier penetration | 8% of active sellers |

**Per 1,000 monthly orders:**

- Dispute mediation revenue: 1,000 × 5% × 60% × 5% × ₦8,500 = **₦12,750**
- Pro tier revenue from 50 active sellers × 8% × ₦2,000 = **₦8,000**
- **Total: ~₦20,750/month per 1,000 orders**

Scales linearly. At 100,000 monthly orders we're at ~₦2M/month; at 1M orders, ₦20M/month.

## Pitch positioning

> SafeSale is **free for the trade itself**. We earn money only when we add value — by mediating disputes and offering premium tools for serious sellers. We don't tax happy customers; we charge people who need our help. That's why sellers trust us with their reputation and why buyers trust us with their money.

## Regulatory note

SafeSale never holds NGN. Fiat custody, on-ramping, and off-ramping all flow through **Bitnob**, which is a CBN-registered payment service provider. SafeSale's role is limited to:

1. Cryptographic escrow over Cashu ecash (no fiat custody)
2. Mediation of disputed escrow releases (a service, not a financial product)
3. Software that helps sellers and buyers transact

This is a defensible posture for hackathon judges and future regulatory conversations. The on-chain / off-chain split is intentional.
