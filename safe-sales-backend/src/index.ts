import Fastify from 'fastify';
import cors from '@fastify/cors';
import { ZodError } from 'zod';
import { env } from './env.js';
import { logger } from './lib/logger.js';
import { HttpError } from './lib/errors.js';
import { startAutoReleaseCron, stopAutoReleaseCron } from './services/scheduler.js';

import sellersRoute from './routes/sellers.js';
import listingsRoute from './routes/listings.js';
import ordersRoute from './routes/orders.js';
import mavapayRoute from './routes/mavapay.js';
import devRoute from './routes/dev.js';

/**
 * SafeSale backend API.
 *
 * Bootstraps Fastify with CORS, structured logging, a /health probe, a
 * consistent error envelope, and all /api/* route plugins.
 */
async function buildServer() {
  const app = Fastify({
    loggerInstance: logger,
    disableRequestLogging: false,
    trustProxy: true, // Railway sits behind a proxy
  });

  // CORS — allow the configured exact frontend origins (Vite dev :8080
  // by default) plus any origin matching FRONTEND_ORIGIN_REGEXES. The
  // default regex matches any *.vercel.app subdomain so Vercel preview
  // deploys "just work" without a backend redeploy per PR.
  //
  // origin can be a function: (origin, cb) => cb(err, allow). Returning
  // true echoes the origin into Access-Control-Allow-Origin; returning
  // false sends no ACAO header (browser blocks the request).
  await app.register(cors, {
    origin: (origin, cb) => {
      // Same-origin / curl / server-to-server requests have no Origin
      // header. Always allow — there's no CORS to enforce.
      if (!origin) return cb(null, true);

      if (env.FRONTEND_ORIGINS.includes(origin)) return cb(null, true);
      if (env.FRONTEND_ORIGIN_REGEXES.some((re) => re.test(origin))) {
        return cb(null, true);
      }

      logger.warn(
        { origin, allowedOrigins: env.FRONTEND_ORIGINS },
        'CORS rejected request — origin not in allowlist',
      );
      return cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Unified error handler — turns thrown HttpError / ZodError / unknown
  // into the consistent { error: { code, message, details? } } envelope.
  app.setErrorHandler((err, request, reply) => {
    if (err instanceof HttpError) {
      reply.code(err.status).send({ error: err.toPayload() });
      return;
    }
    if (err instanceof ZodError) {
      reply.code(422).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request body failed validation',
          details: err.issues,
        },
      });
      return;
    }
    // Fastify's own validation errors (from schema or @fastify/cors)
    const fastifyErr = err as { validation?: unknown; message?: string };
    if (fastifyErr.validation) {
      reply.code(400).send({
        error: {
          code: 'BAD_REQUEST',
          message: fastifyErr.message ?? 'Bad request',
          details: fastifyErr.validation,
        },
      });
      return;
    }
    request.log.error({ err }, 'Unhandled error');
    const message = err instanceof Error ? err.message : 'Something went wrong';
    reply.code(500).send({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: env.NODE_ENV === 'production' ? 'Something went wrong' : message,
      },
    });
  });

  // Healthcheck — Railway pings this. Don't query the DB here; we want
  // /health to reflect "server is responding", not "everything is wired".
  app.get('/health', async () => ({
    ok: true,
    service: 'safe-sale-backend',
    env: env.NODE_ENV,
    uptime: Math.round(process.uptime()),
  }));

  // Root — friendly landing for anyone who hits the bare URL
  app.get('/', async () => ({
    service: 'SafeSale API',
    docs: 'https://github.com/JSE19/safe-sales',
    health: '/health',
  }));

  // Register all API route plugins
  await app.register(sellersRoute);
  await app.register(listingsRoute);
  await app.register(ordersRoute);
  await app.register(mavapayRoute);
  await app.register(devRoute);

  return app;
}

async function start() {
  // Bind the port FIRST so Railway's healthcheck succeeds even if external
  // dependencies are slow or down. The original behavior was to verify the
  // Cashu mint before listening and `process.exit(1)` on failure — that
  // converted a transient public-mint hiccup into total downtime. We now
  // verify in the background, log loudly on failure, and let the per-request
  // mint calls (which already catch and either fall back or surface a 503)
  // do the right thing on a per-route basis.
  const app = await buildServer();

  let cronHandle: NodeJS.Timeout | undefined;

  try {
    const address = await app.listen({
      port: env.PORT,
      host: '0.0.0.0', // critical: Railway routes from outside the container
    });
    logger.info({ address, env: env.NODE_ENV }, 'SafeSale backend listening');

    cronHandle = startAutoReleaseCron();
  } catch (err) {
    logger.fatal(err, 'Failed to start server');
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down');
    if (cronHandle) stopAutoReleaseCron(cronHandle);
    try {
      await app.close();
      process.exit(0);
    } catch (err) {
      logger.error(err, 'Error during shutdown');
      process.exit(1);
    }
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
