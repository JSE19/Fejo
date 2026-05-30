import { prisma } from '../db/client.js';
import { logger } from '../lib/logger.js';
import { releaseToVendor } from './mavapay.js';

const AUTO_RELEASE_CHECK_INTERVAL_MS = 5 * 60 * 1000;

async function releaseExpiredOrders(): Promise<void> {
  const now = new Date();

  const orders = await prisma.order.findMany({
    where: {
      status: 'shipped',
      autoReleaseAt: { lte: now },
    },
    include: { seller: true },
  });

  if (orders.length === 0) return;

  logger.info({ count: orders.length }, 'Auto-release cron: processing expired orders');

  for (const order of orders) {
    try {
      const amountKobo = order.amountNGN * 100;

      if (
        order.seller.bankAccount &&
        order.seller.bankCode &&
        order.seller.bankVerifiedName
      ) {
        await releaseToVendor(
          amountKobo,
          {
            bankAccountNumber: order.seller.bankAccount,
            bankAccountName: order.seller.bankVerifiedName,
            bankCode: order.seller.bankCode,
            bankName: order.seller.bankName ?? '',
          },
          `auto-release-${order.id}`,
        );
      } else {
        logger.warn(
          { orderId: order.id },
          'Auto-release skipped: seller has no payout details',
        );
        continue;
      }

      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'completed',
          releasedAt: new Date(),
        },
      });

      logger.info({ orderId: order.id }, 'Auto-release completed');
    } catch (err) {
      logger.error(
        { orderId: order.id, err: err instanceof Error ? err.message : err },
        'Auto-release failed for order',
      );
    }
  }
}

export function startAutoReleaseCron(): NodeJS.Timeout {
  logger.info({ intervalMs: AUTO_RELEASE_CHECK_INTERVAL_MS }, 'Auto-release cron started');
  const handle = setInterval(releaseExpiredOrders, AUTO_RELEASE_CHECK_INTERVAL_MS);
  releaseExpiredOrders();
  return handle;
}

export function stopAutoReleaseCron(handle: NodeJS.Timeout): void {
  clearInterval(handle);
  logger.info('Auto-release cron stopped');
}
