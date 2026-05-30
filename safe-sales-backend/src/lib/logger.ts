import pino from 'pino';

/**
 * Project-wide structured logger.
 *
 * In development we pretty-print to the console; in production we emit
 * line-delimited JSON so Railway / log aggregators can index it.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss.l',
        ignore: 'pid,hostname',
      },
    },
  }),
});
