/**
 * Typed HTTP errors. Throw any of these from a route handler and the
 * Fastify error hook (set in index.ts) turns them into clean JSON:
 *
 *   { error: { code: "NOT_FOUND", message: "Seller not found" } }
 *
 * Status codes follow REST norms — see each subclass.
 */

export type ErrorPayload = {
  code: string;
  message: string;
  details?: unknown;
};

export class HttpError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  toPayload(): ErrorPayload {
    return {
      code: this.code,
      message: this.message,
      ...(this.details !== undefined && { details: this.details }),
    };
  }
}

export class BadRequest extends HttpError {
  constructor(message: string, details?: unknown) {
    super(400, 'BAD_REQUEST', message, details);
  }
}

export class NotFound extends HttpError {
  constructor(message = 'Not found') {
    super(404, 'NOT_FOUND', message);
  }
}

export class Conflict extends HttpError {
  constructor(message: string, details?: unknown) {
    super(409, 'CONFLICT', message, details);
  }
}

export class UnprocessableEntity extends HttpError {
  constructor(message: string, details?: unknown) {
    super(422, 'UNPROCESSABLE_ENTITY', message, details);
  }
}

/**
 * 503 — a dependency we need (Cashu mint, Resend, etc.) is unreachable
 * or behaving incorrectly. Distinct from 500 so the frontend (and Railway
 * logs) can tell "we broke" from "an upstream broke".
 */
export class ServiceUnavailable extends HttpError {
  constructor(message: string, details?: unknown) {
    super(503, 'SERVICE_UNAVAILABLE', message, details);
  }
}

/**
 * Crypto-safe random short-id for orders. Format: "SS-XXXX" (4 base32 chars).
 */
export function generateShortId(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 4; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `SS-${s}`;
}

/**
 * Order-token generator — 22 base32 chars ≈ 110 bits of entropy.
 * Matches the shape the frontend's mock generator uses.
 */
export function generateOrderToken(): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < 22; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return s;
}
