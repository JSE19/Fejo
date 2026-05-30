/**
 * Lightning address → bolt11 invoice resolver (LNURL-pay).
 *
 * A Lightning address like `name@coinos.io` is just a thin wrapper around
 * LNURL-pay. To get an invoice for amount N msats:
 *
 *   1. GET https://<domain>/.well-known/lnurlp/<name>
 *      → returns { callback, minSendable, maxSendable, ... }
 *   2. GET <callback>?amount=<msats>
 *      → returns { pr: "lnbc..." }  (the bolt11 invoice)
 *
 * Spec: LUD-16 (Lightning address) + LUD-06 (LNURL-pay)
 *
 * Used when the seller chooses Lightning payout and we need to resolve
 * their LN address to a bolt11 invoice for the MavaPay withdraw call.
 */

import { logger } from '../lib/logger.js';
import { BadRequest } from '../lib/errors.js';

const LNURLP_TIMEOUT_MS = 8_000;

export interface LnurlPayParams {
  callback: string;
  minSendable: number; // msats
  maxSendable: number; // msats
  metadata: string;
  tag: 'payRequest';
}

/**
 * Fetch the LNURL-pay metadata for a Lightning address.
 * Throws BadRequest if the address is malformed or unreachable.
 */
export async function resolveLnAddress(lnAddress: string): Promise<LnurlPayParams> {
  const [name, domain] = lnAddress.split('@');
  if (!name || !domain) {
    throw new BadRequest(`Invalid Lightning address: ${lnAddress}`);
  }

  const url = `https://${domain}/.well-known/lnurlp/${name}`;

  let res: Response;
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(LNURLP_TIMEOUT_MS),
      headers: { Accept: 'application/json' },
    });
  } catch (err) {
    logger.error({ lnAddress, url, err }, 'LNURL-pay fetch failed');
    throw new BadRequest(`Could not reach LNURL-pay endpoint for ${lnAddress}`);
  }

  if (!res.ok) {
    throw new BadRequest(`LNURL-pay returned HTTP ${res.status} for ${lnAddress}`);
  }

  const data = (await res.json()) as Partial<LnurlPayParams> & { status?: string; reason?: string };
  if (data.status === 'ERROR') {
    throw new BadRequest(`LNURL-pay error for ${lnAddress}: ${data.reason ?? 'unknown'}`);
  }
  if (data.tag !== 'payRequest' || !data.callback) {
    throw new BadRequest(`${lnAddress} does not look like a Lightning address`);
  }
  if (typeof data.minSendable !== 'number' || typeof data.maxSendable !== 'number') {
    throw new BadRequest(`Malformed LNURL-pay response for ${lnAddress}`);
  }

  return {
    callback: data.callback,
    minSendable: data.minSendable,
    maxSendable: data.maxSendable,
    metadata: data.metadata ?? '',
    tag: 'payRequest',
  };
}

/**
 * Ask a previously-resolved LNURL-pay callback for a bolt11 invoice.
 * `amountSats` is in satoshis; we convert to msats internally.
 *
 * Returns the raw bolt11 string ready to be paid by a Lightning wallet
 * (or melted by a Cashu mint).
 */
export async function fetchInvoice(
  params: LnurlPayParams,
  amountSats: number,
): Promise<string> {
  const amountMsats = amountSats * 1000;

  if (amountMsats < params.minSendable) {
    throw new BadRequest(
      `Amount ${amountSats} sat is below minimum ${Math.ceil(params.minSendable / 1000)} sat`,
    );
  }
  if (amountMsats > params.maxSendable) {
    throw new BadRequest(
      `Amount ${amountSats} sat exceeds maximum ${Math.floor(params.maxSendable / 1000)} sat`,
    );
  }

  const url = new URL(params.callback);
  url.searchParams.set('amount', String(amountMsats));

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(LNURLP_TIMEOUT_MS),
      headers: { Accept: 'application/json' },
    });
  } catch (err) {
    logger.error({ callback: params.callback, err }, 'LNURL-pay callback failed');
    throw new BadRequest('Could not reach LNURL-pay invoice callback');
  }

  if (!res.ok) {
    throw new BadRequest(`LNURL-pay callback returned HTTP ${res.status}`);
  }

  const data = (await res.json()) as { pr?: string; status?: string; reason?: string };
  if (data.status === 'ERROR') {
    throw new BadRequest(`LNURL-pay callback error: ${data.reason ?? 'unknown'}`);
  }
  if (!data.pr || !data.pr.toLowerCase().startsWith('ln')) {
    throw new BadRequest('LNURL-pay callback did not return a bolt11 invoice');
  }

  return data.pr;
}

/**
 * Convenience: end-to-end resolve a Lightning address to a bolt11 invoice
 * for a specific sat amount. Used by fee-split and seller payouts.
 */
export async function invoiceForLnAddress(
  lnAddress: string,
  amountSats: number,
): Promise<string> {
  const params = await resolveLnAddress(lnAddress);
  return fetchInvoice(params, amountSats);
}
