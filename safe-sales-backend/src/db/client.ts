import { PrismaClient } from '@prisma/client';

/**
 * Singleton Prisma client.
 *
 * In dev (with tsx watch) modules can be re-evaluated on file changes, which
 * would leak connections. We attach the client to globalThis so a single
 * instance is reused across reloads.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Pino captures these via stdout; no need for event handlers
    log:
      process.env.NODE_ENV === 'production'
        ? ['warn', 'error']
        : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
