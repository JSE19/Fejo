import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db/client.js';
import { BadRequest } from '../lib/errors.js';
import { sendBuyerOrderLinkEmail } from '../services/email.js';
import { sendBrandDM } from '../services/nostr.js';
import { logger } from '../lib/logger.js';
import { env } from '../env.js';

// Flexible schema — handles both BTC and NGN webhook payloads
const MavaPayWebhookSchema = z.object({
  event: z.string(),
  data: z.object({
    id: z.string(),
    amount: z.number(),
    fees: z.number().optional(),
    currency: z.string(),
    type: z.string().optional(),
    status: z.string().optional(),
    btcUsdMetadata: z
      .object({
        customerReference: z.string().optional(),
        orderId: z.string().optional(),
      })
      .optional(),
    transactionMetadata: z
      .object({
        customerReference: z.string().optional(),
        orderId: z.string().optional(),
      })
      .optional(),
  }),
});

function verifySignature(payload: string, signature: string): boolean {
  if (!env.MAVAPAY_WEBHOOK_SECRET) return true;
  const expected = crypto
    .createHmac('sha256', env.MAVAPAY_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

async function lookupOrder(
  customerReference?: string,
  orderId?: string,
) {
  if (customerReference) {
    const order = await prisma.order.findUnique({
      where: { orderToken: customerReference },
      include: { seller: true, listing: true },
    });
    if (order) return order;
  }
  if (orderId) {
    const order = await prisma.order.findFirst({
      where: { mavapayPaymentLinkId: orderId },
      include: { seller: true, listing: true },
    });
    if (order) return order;
  }
  return null;
}

export async function handlePaymentReceived(
  transactionId: string,
  amount: number,
  currency: string,
  customerReference?: string,
  orderId?: string,
): Promise<{ handled: boolean; reason?: string }> {
  const order = await lookupOrder(customerReference, orderId);
  if (!order) {
    logger.warn(
      { transactionId, customerReference, orderId },
      'payment.received webhook: no matching order found',
    );
    return { handled: false, reason: 'order_not_found' };
  }

  if (order.status === 'paid') {
    logger.info(
      { orderId: order.id, transactionId },
      'Order already paid — idempotent skip',
    );
    return { handled: true };
  }
  if (order.status !== 'pending_payment') {
    logger.warn(
      { orderId: order.id, status: order.status, transactionId },
      'Cannot mark paid — order not in pending_payment',
    );
    return { handled: false, reason: 'wrong_status' };
  }

  // Convert amount based on currency
  const amountKobo =
    currency === 'BTC'
      ? order.amountNGN * 100 // use order amount for BTC (amount is in sats)
      : amount; // use webhook amount for NGN

  const expectedKobo = order.amountNGN * 100;
  if (amountKobo < expectedKobo) {
    logger.warn(
      { orderId: order.id, amountKobo, expectedKobo, transactionId },
      'Payment amount below order amount',
    );
    return { handled: false, reason: 'underpaid' };
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: 'paid',
      mavapayPaymentRef: transactionId,
    },
  });

  try {
    const message =
      `New order on SafeSale: "${order.listing.title}" - ` +
      `NGN ${order.amountNGN.toLocaleString('en-NG')} paid. ` +
      `Buyer: ${order.buyerName} (${order.buyerCity}). ` +
      `Ship and mark as shipped to start the buyer's confirmation window.`;
    await sendBrandDM(order.seller.pubkey, message);
  } catch (err) {
    logger.warn(
      { orderId: order.id, err: err instanceof Error ? err.message : err },
      'Nostr DM to seller failed (non-fatal)',
    );
  }

  try {
    await sendBuyerOrderLinkEmail({ order, listing: order.listing });
  } catch (err) {
    logger.warn(
      { orderId: order.id, err: err instanceof Error ? err.message : err },
      'Buyer order link email failed (non-fatal)',
    );
  }

  logger.info(
    { orderId: order.id, transactionId, amount, currency },
    'Order marked paid via webhook',
  );
  return { handled: true };
}

const mavapayRoute: FastifyPluginAsync = async (app) => {
  app.post('/api/webhooks/mavapay', async (request) => {
    const rawPayload = JSON.stringify(request.body);
    const payload = MavaPayWebhookSchema.parse(request.body);

    const signature = request.headers['x-mavapay-signature'] as string | undefined;
    if (signature && !verifySignature(rawPayload, signature)) {
      logger.warn({}, 'MavaPay webhook signature verification failed');
      throw new BadRequest('Invalid webhook signature');
    }

    const externalId = payload.data.id;
    const existing = await prisma.webhookEvent.findUnique({
      where: { externalId },
    });
    if (existing) {
      logger.info(
        { externalId, event: payload.event, status: existing.status },
        'Duplicate webhook — skipping',
      );
      return { ok: true, event: 'duplicate' };
    }

    await prisma.webhookEvent.create({
      data: {
        provider: 'mavapay',
        externalId,
        payload: payload as unknown as Prisma.InputJsonValue,
        status: 'received',
      },
    });

    if (
      payload.event === 'payment.received' ||
      payload.event === 'payment_link.settled'
    ) {
      const meta =
        payload.data.btcUsdMetadata ?? payload.data.transactionMetadata;
      const result = await handlePaymentReceived(
        payload.data.id,
        payload.data.amount,
        payload.data.currency,
        meta?.customerReference,
        meta?.orderId,
      );

      await prisma.webhookEvent.update({
        where: { externalId },
        data: {
          status: result.handled ? 'processed' : 'failed',
          attempts: { increment: 1 },
        },
      });

      return { ok: true, event: result.handled ? 'processed' : 'ignored' };
    }

    logger.info({ event: payload.event }, 'Unhandled MavaPay webhook event');
    return { ok: true, event: 'unhandled' };
  });
};

export default mavapayRoute;
