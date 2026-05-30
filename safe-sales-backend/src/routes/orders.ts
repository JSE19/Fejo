import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { nip19 } from 'nostr-tools';
import { prisma } from '../db/client.js';
import { BadRequest, Conflict, NotFound } from '../lib/errors.js';
import { generateOrderToken, generateShortId } from '../lib/errors.js';
import { createPayInQuote, releaseToVendor } from '../services/mavapay.js';
import type { Prisma } from '@prisma/client';
import { sendBrandDM } from '../services/nostr.js';
import { logger } from '../lib/logger.js';

const CreateOrderSchema = z.object({
  listingId: z.string().min(1),
  buyerNpub: z.string().regex(/^npub1[0-9a-z]+$/, 'Must be a bech32 npub'),
  buyerName: z.string().min(2).max(80),
  buyerPhone: z.string().min(7).max(20),
  buyerEmail: z.string().email().optional(),
  buyerCity: z.string().min(2).max(80),
  buyerAddress: z.string().max(280).optional(),
  contactMethod: z.enum(['phone', 'email']).default('phone'),
  variant: z.string().max(60).optional(),
});

const ShipSchema = z.object({
  trackingNumber: z.string().max(80).optional(),
  carrier: z.string().max(80).optional(),
});

const ReleaseSchema = z.object({});

const DisputeSchema = z.object({
  reason: z.string().min(3).max(200),
  summary: z.string().max(2000).optional(),
  openedBy: z.enum(['buyer', 'seller']),
});

const AUTO_RELEASE_DAYS = 7;

const ordersRoute: FastifyPluginAsync = async (app) => {
  // POST /api/orders — buyer initiates a purchase
  app.post('/api/orders', async (request, reply) => {
    const body = CreateOrderSchema.parse(request.body);

    const listing = await prisma.listing.findUnique({
      where: { id: body.listingId },
      include: { seller: true },
    });
    if (!listing) throw new BadRequest('Listing not found');
    if (!listing.active) throw new BadRequest('Listing is not active');
    if (listing.inStock <= 0) throw new BadRequest('Listing is out of stock');

    let buyerPubkey: string;
    try {
      const decoded = nip19.decode(body.buyerNpub);
      if (decoded.type !== 'npub') throw new BadRequest('buyerNpub must be an npub');
      buyerPubkey = decoded.data;
    } catch (err) {
      if (err instanceof BadRequest) throw err;
      throw new BadRequest('Invalid buyer npub');
    }

    const amountNGN = listing.priceNGN;
    const amountKobo = amountNGN * 100;
    const orderToken = generateOrderToken();

    let mavapayPaymentLinkId: string | null = null;
    let mavapayQuoteData: Record<string, unknown> | null = null;
    let payInError: string | null = null;

    try {
      const quote = await createPayInQuote(amountKobo, orderToken);
      mavapayPaymentLinkId = quote.orderId;
      mavapayQuoteData = {
        quoteId: quote.quoteId,
        orderId: quote.orderId,
        bankName: quote.bankName,
        bankAccountNumber: quote.bankAccountNumber,
        bankAccountName: quote.bankAccountName,
        bankCode: quote.bankCode,
        totalAmountKobo: quote.totalAmountKobo,
        expiresAt: quote.expiresAt,
      };
    } catch (err) {
      payInError = err instanceof Error ? err.message : 'MavaPay quote failed';
      logger.warn(
        { err: payInError },
        'createPayInQuote failed — order created without payment details',
      );
    }

    const order = await prisma.order.create({
      data: {
        shortId: generateShortId(),
        orderToken,
        listingId: listing.id,
        sellerId: listing.sellerId,
        buyerNpub: body.buyerNpub,
        buyerPubkey,
        buyerName: body.buyerName,
        buyerPhone: body.buyerPhone,
        buyerEmail: body.buyerEmail,
        buyerCity: body.buyerCity,
        buyerAddress: body.buyerAddress,
        contactMethod: body.contactMethod,
        variant: body.variant,
        amountNGN,
        status: 'pending_payment',
        mavapayPaymentLinkId,
        mavapayQuoteData: mavapayQuoteData as Prisma.InputJsonValue,
      },
    });

    reply.code(201);
    return {
      orderToken: order.orderToken,
      shortId: order.shortId,
      amountNGN: order.amountNGN,
      payIn: mavapayQuoteData
        ? {
            bankName: mavapayQuoteData.bankName as string,
            bankAccountNumber: mavapayQuoteData.bankAccountNumber as string,
            bankAccountName: mavapayQuoteData.bankAccountName as string,
            totalAmountKobo: mavapayQuoteData.totalAmountKobo as number,
            expiresAt: mavapayQuoteData.expiresAt as string,
          }
        : null,
      payInError,
    };
  });

  // GET /api/orders/:token — buyer order page data
  app.get<{ Params: { token: string } }>('/api/orders/:token', async (request) => {
    const order = await prisma.order.findUnique({
      where: { orderToken: request.params.token },
      include: {
        listing: true,
        seller: true,
        dispute: true,
      },
    });
    if (!order) throw new NotFound('Order not found — check your link');

    return {
      order,
      listing: order.listing,
      seller: order.seller,
      dispute: order.dispute,
    };
  });

  // GET /api/orders/seller/:npub — seller dashboard order list
  app.get<{ Params: { npub: string } }>('/api/orders/seller/:npub', async (request) => {
    const seller = await prisma.seller.findUnique({ where: { npub: request.params.npub } });
    if (!seller) throw new NotFound('Seller not found');

    const orders = await prisma.order.findMany({
      where: { sellerId: seller.id },
      include: { listing: true, dispute: true },
      orderBy: { createdAt: 'desc' },
    });

    return { orders };
  });

  // POST /api/orders/:token/ship — seller marks shipped
  app.post<{ Params: { token: string } }>(
    '/api/orders/:token/ship',
    async (request) => {
      const body = ShipSchema.parse(request.body ?? {});
      const order = await prisma.order.findUnique({
        where: { orderToken: request.params.token },
        include: { listing: true },
      });
      if (!order) throw new NotFound('Order not found');
      if (order.status !== 'paid') {
        throw new Conflict(`Cannot ship an order in status "${order.status}"`);
      }

      const shippedAt = new Date();
      const autoReleaseAt = new Date(
        shippedAt.getTime() + AUTO_RELEASE_DAYS * 24 * 60 * 60 * 1000,
      );

      const updated = await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'shipped',
          shippedAt,
          autoReleaseAt,
          trackingNumber: body.trackingNumber,
          carrier: body.carrier,
        },
      });

      try {
        const tracking = body.trackingNumber
          ? ` Tracking: ${body.trackingNumber}${body.carrier ? ' via ' + body.carrier : ''}.`
          : '';
        const msg =
          `Your SafeSale order "${order.listing.title}" has been shipped.${tracking} ` +
          `Once you receive it, return to your order page to confirm and release payment.`;
        await sendBrandDM(order.buyerPubkey, msg);
      } catch (err) {
        logger.warn(
          { orderId: order.id, err: err instanceof Error ? err.message : err },
          'Nostr DM to buyer (shipped) failed (non-fatal)',
        );
      }

      return { order: updated };
    },
  );

  // POST /api/orders/:token/release — buyer confirms receipt, seller gets paid
  app.post<{ Params: { token: string } }>(
    '/api/orders/:token/release',
    async (request) => {
      ReleaseSchema.parse(request.body ?? {});

      const order = await prisma.order.findUnique({
        where: { orderToken: request.params.token },
        include: { seller: true },
      });
      if (!order) throw new NotFound('Order not found');
      if (!['shipped', 'delivered', 'paid'].includes(order.status)) {
        throw new Conflict(`Cannot release an order in status "${order.status}"`);
      }

      const amountKobo = order.amountNGN * 100;

      if (
        !order.seller.bankAccount ||
        !order.seller.bankCode ||
        !order.seller.bankVerifiedName
      ) {
        throw new BadRequest(
          'Seller has no payout details configured. Add bank info in settings before releasing.',
        );
      }

      const result = await releaseToVendor(
        amountKobo,
        {
          bankAccountNumber: order.seller.bankAccount,
          bankAccountName: order.seller.bankVerifiedName,
          bankCode: order.seller.bankCode,
          bankName: order.seller.bankName ?? '',
        },
        `release-${order.id}`,
      );
      logger.info(
        { orderId: order.id, vendorAmountKobo: result.vendorAmountKobo, feeKobo: result.feeKobo },
        'Release payout completed',
      );

      const updated = await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'completed',
          releasedAt: new Date(),
        },
      });

      return { order: updated };
    },
  );

  // POST /api/orders/:token/dispute — buyer or seller opens a dispute
  app.post<{ Params: { token: string } }>(
    '/api/orders/:token/dispute',
    async (request, reply) => {
      const body = DisputeSchema.parse(request.body);

      const order = await prisma.order.findUnique({
        where: { orderToken: request.params.token },
        include: { dispute: true },
      });
      if (!order) throw new NotFound('Order not found');
      if (order.dispute) throw new Conflict('A dispute is already open on this order');
      if (!['shipped', 'delivered', 'paid'].includes(order.status)) {
        throw new BadRequest(`Cannot dispute an order in status "${order.status}"`);
      }

      const directResolutionUntil = new Date(Date.now() + 72 * 60 * 60 * 1000);

      const [updatedOrder, dispute] = await prisma.$transaction([
        prisma.order.update({
          where: { id: order.id },
          data: { status: 'disputed' },
        }),
        prisma.dispute.create({
          data: {
            orderId: order.id,
            reason: body.reason,
            summary: body.summary,
            openedBy: body.openedBy,
            status: 'direct_resolution',
            directResolutionUntil,
          },
        }),
      ]);

      reply.code(201);
      return { order: updatedOrder, dispute };
    },
  );
};

export default ordersRoute;
