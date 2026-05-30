import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { env } from '../env.js';
import type { Prisma } from '@prisma/client';
import { handlePaymentReceived } from './mavapay.js';
import { createPayInQuote, simulatePayIn, getBtcWalletBalance } from '../services/mavapay.js';
import { logger } from '../lib/logger.js';
import { NotFound } from '../lib/errors.js';

const SimulatePaymentSchema = z.object({
  orderToken: z.string().min(8).max(64),
  amountNGN: z.number().int().positive().optional(),
});

const devRoute: FastifyPluginAsync = async (app) => {
  // Guard the entire plugin in production.
  app.addHook('onRequest', async (_request, reply) => {
    if (env.NODE_ENV === 'production') {
      reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Not found' } });
    }
  });

  // POST /api/dev/simulate-payment — simulate a MavaPay payment.received
  // webhook so the demo flow can be tested end-to-end without real payment.
  app.post('/api/dev/simulate-payment', async (request) => {
    const body = SimulatePaymentSchema.parse(request.body);

    const { prisma } = await import('../db/client.js');
    const order = await prisma.order.findUnique({ where: { orderToken: body.orderToken } });
    if (!order) throw new NotFound('Order not found');
    const amount = body.amountNGN ?? order.amountNGN;

    // Record BTC balance before simulation
    const beforeBalance = await getBtcWalletBalance().catch(() => 0);
    logger.info({ beforeBalance }, 'BTC wallet balance before simulation');

    // Create a fresh pay-in quote (the stored one may be expired)
    let mavapayQuoteId: string | undefined;
    try {
      const freshQuote = await createPayInQuote(amount * 100, `${body.orderToken}_sim`);
      mavapayQuoteId = freshQuote.quoteId;

      // Update stored quote data so the UI details stay valid
      const newQuoteData: Record<string, unknown> = {
        quoteId: freshQuote.quoteId,
        orderId: freshQuote.orderId,
        bankName: freshQuote.bankName,
        bankAccountNumber: freshQuote.bankAccountNumber,
        bankAccountName: freshQuote.bankAccountName,
        bankCode: freshQuote.bankCode,
        totalAmountKobo: freshQuote.totalAmountKobo,
        expiresAt: freshQuote.expiresAt,
      };
      await prisma.order.update({
        where: { id: order.id },
        data: {
          mavapayPaymentLinkId: freshQuote.orderId,
          mavapayQuoteData: newQuoteData as Prisma.InputJsonValue,
        },
      });
      logger.info({ quoteId: freshQuote.quoteId }, 'Fresh pay-in quote created for simulation');
    } catch (err) {
      logger.warn(
        { err: err instanceof Error ? err.message : err },
        'Failed to create fresh quote — falling back to stored quote data',
      );
      // Fall back to stored quote data
      const quoteData = order.mavapayQuoteData as Record<string, unknown> | null;
      mavapayQuoteId = typeof quoteData?.quoteId === 'string' ? quoteData.quoteId : undefined;
    }

    // Credit BTC wallet via MavaPay simulation (quoteId only — avoids conflicts on staging)
    await simulatePayIn(amount * 100, { quoteId: mavapayQuoteId }).catch((err) => {
      logger.warn(
        { err: err instanceof Error ? err.message : err },
        'MavaPay simulatePayIn failed — wallet may not be credited',
      );
    });

    // Poll every 3s until balance increases or 30s timeout
    let afterBalance = beforeBalance;
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      afterBalance = await getBtcWalletBalance().catch(() => 0);
      if (afterBalance > beforeBalance) {
        logger.info(
          { beforeBalance, afterBalance, increase: afterBalance - beforeBalance },
          'BTC wallet credited via simulation',
        );
        break;
      }
    }

    if (afterBalance <= beforeBalance) {
      logger.warn({ beforeBalance, afterBalance }, 'BTC wallet not credited after 30s');
    }

    const result = await handlePaymentReceived(
      `sim_${Date.now()}`,
      amount * 100,
      'BTC',
      body.orderToken,
    );

    return { ok: result.handled, simulatedAmountKobo: amount * 100, btcWalletSats: afterBalance };
  });
};

export default devRoute;
