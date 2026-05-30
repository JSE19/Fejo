/**
 * Nostr integration for SafeSale.
 *
 * The backend acts as a Nostr publisher on two distinct identities:
 *
 *   1. The SAFESALE BRAND identity (SAFESALE_NSEC) — used to send
 *      system DMs to sellers ("Payment locked, ship now") and sign
 *      mediator decisions on disputes.
 *
 *   2. The SELLER's identity — the seller's pubkey is known to us
 *      (it's their `npub` at signup), but we never hold their nsec.
 *      To publish a kind-0 profile or kind-30018 listing as the
 *      seller, the frontend (which holds the seller's nsec in the
 *      browser) must sign. The backend just provides the helpers and
 *      relay URLs.
 *
 * This module handles the brand side. Frontend handles seller-signed
 * events. For MVP we use the public relay pool configured in env.NOSTR_RELAYS.
 */

import { SimplePool, finalizeEvent, getPublicKey, nip04, nip19 } from 'nostr-tools';
import type { Event, EventTemplate, UnsignedEvent } from 'nostr-tools';
import { env } from '../env.js';
import { logger } from '../lib/logger.js';

let _pool: SimplePool | null = null;
let _brandSecretKey: Uint8Array | null = null;
let _brandPubkey: string | null = null;

function getPool(): SimplePool {
  if (!_pool) _pool = new SimplePool();
  return _pool;
}

/**
 * Decode the brand nsec from env. Cached. Throws if SAFESALE_NSEC is missing
 * or malformed — without the brand identity, no system DMs can be sent.
 */
function getBrandKey(): { sk: Uint8Array; pk: string } {
  if (_brandSecretKey && _brandPubkey) {
    return { sk: _brandSecretKey, pk: _brandPubkey };
  }
  if (!env.SAFESALE_NSEC) {
    throw new Error('SAFESALE_NSEC not set — cannot use Nostr brand identity');
  }
  const decoded = nip19.decode(env.SAFESALE_NSEC);
  if (decoded.type !== 'nsec') {
    throw new Error(`SAFESALE_NSEC is not a valid nsec (got ${decoded.type})`);
  }
  _brandSecretKey = decoded.data;
  _brandPubkey = getPublicKey(_brandSecretKey);
  return { sk: _brandSecretKey, pk: _brandPubkey };
}

/**
 * Publish an event to all configured relays. Returns the published event
 * (with id and sig). Doesn't fail on per-relay errors — Nostr is best-effort
 * by design; if at least one relay accepts the event, it's findable.
 */
async function publishToRelays(event: Event): Promise<Event> {
  const pool = getPool();
  const relays = env.NOSTR_RELAYS;
  try {
    await Promise.any(pool.publish(relays, event));
    logger.info(
      { id: event.id.substring(0, 16) + '…', kind: event.kind, relays: relays.length },
      'Nostr event published',
    );
  } catch (err) {
    // Promise.any throws AggregateError if ALL relays rejected
    const msg = err instanceof Error ? err.message : 'unknown';
    logger.warn({ kind: event.kind, err: msg }, 'Nostr publish failed on all relays');
    throw new Error(`Nostr publish failed: ${msg}`);
  }
  return event;
}

/**
 * Sign and publish an event as the SafeSale brand identity.
 */
async function publishAsBrand(template: EventTemplate): Promise<Event> {
  const { sk } = getBrandKey();
  const event = finalizeEvent(template, sk);
  return publishToRelays(event);
}

/**
 * Publish the SafeSale brand kind-0 profile. Useful to call once at boot
 * so the brand has a visible presence on Nostr.
 */
export async function publishBrandProfile(): Promise<Event> {
  const profile = {
    name: 'safesale',
    display_name: 'SafeSale',
    about:
      'Trustless escrow for Instagram & WhatsApp commerce. Bitcoin · Lightning · Nostr · Cashu. Hack4Freedom 2026.',
    nip05: 'safesale@safesale.app',
  };
  return publishAsBrand({
    kind: 0,
    content: JSON.stringify(profile),
    tags: [],
    created_at: Math.floor(Date.now() / 1000),
  });
}

/**
 * Send an encrypted (NIP-04) DM from the SafeSale brand to a recipient.
 * Used for: "Payment locked — ship now" notifications to sellers.
 *
 * NOTE: NIP-04 is the older, less-secure DM standard. NIP-17 (gift-wrapped)
 * is preferred for new apps. For MVP we use NIP-04 because it's universally
 * supported and the message contents are operational, not sensitive.
 */
export async function sendBrandDM(
  recipientPubkeyHex: string,
  plaintext: string,
): Promise<Event> {
  const { sk } = getBrandKey();
  const ciphertext = await nip04.encrypt(sk, recipientPubkeyHex, plaintext);
  return publishAsBrand({
    kind: 4,
    content: ciphertext,
    tags: [['p', recipientPubkeyHex]],
    created_at: Math.floor(Date.now() / 1000),
  });
}

/**
 * Build (but DO NOT sign) a NIP-15 listing event (kind 30018) for a seller.
 * The frontend signs and publishes — the backend never holds seller nsecs.
 *
 * Returns the unsigned event template. The frontend can finalize() with the
 * seller's signer and publish to relays itself.
 */
export function buildListingEvent(
  sellerPubkeyHex: string,
  listing: {
    id: string;
    title: string;
    description: string;
    priceNGN: number;
    category: string;
    images: { url?: string; seed?: string; alt?: string }[];
  },
): UnsignedEvent {
  return {
    pubkey: sellerPubkeyHex,
    kind: 30018,
    content: JSON.stringify({
      id: listing.id,
      stall_id: 'safesale',
      name: listing.title,
      description: listing.description,
      images: listing.images.map((i) => i.url).filter(Boolean),
      currency: 'NGN',
      price: listing.priceNGN,
      quantity: 1,
    }),
    tags: [
      ['d', listing.id], // addressable-event identifier
      ['t', listing.category.toLowerCase().replace(/\s+/g, '-')],
      ['alt', `SafeSale listing: ${listing.title}`],
    ],
    created_at: Math.floor(Date.now() / 1000),
  };
}

/**
 * Build (but DO NOT sign) a NIP-32 labelling event (kind 1985) recording
 * a completed trade — the cryptographic basis for portable reputation.
 *
 * The buyer (or the seller-on-buyer) signs this from the frontend after
 * confirming a successful trade.
 */
export function buildReviewEvent(
  reviewerPubkeyHex: string,
  subjectPubkeyHex: string,
  rating: number, // 1-5
  comment?: string,
): UnsignedEvent {
  return {
    pubkey: reviewerPubkeyHex,
    kind: 1985,
    content: comment ?? '',
    tags: [
      ['L', 'safesale.trade'],
      ['l', 'completed', 'safesale.trade'],
      ['p', subjectPubkeyHex],
      ['rating', String(rating)],
      ['alt', `SafeSale trade review: ${rating}/5`],
    ],
    created_at: Math.floor(Date.now() / 1000),
  };
}

/**
 * Brand pubkey getter — useful for the frontend to verify our identity.
 */
export function getBrandPubkey(): string {
  return getBrandKey().pk;
}
