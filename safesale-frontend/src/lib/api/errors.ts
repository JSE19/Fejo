/**
 * SafeSale API — error type.
 *
 * Every method on `apiClient` rejects with an `ApiError` on failure. The
 * UI can render `err.message` directly; `err.code` is stable and meant
 * for branching ("ORDER_NOT_FOUND" → 404 page, etc.). The shape mirrors
 * the JSON envelope defined in BACKEND.md §HTTP API:
 *
 *   { "error": { "code": "...", "message": "..." } }
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status?: number;

  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

/** Known error codes the buyer slice may surface. Extend as needed. */
export type ApiErrorCode =
  | "ORDER_NOT_FOUND"
  | "LISTING_NOT_FOUND"
  | "ORDER_ALREADY_RELEASED"
  | "ORDER_NOT_RELEASABLE"
  | "DISPUTE_ALREADY_OPEN"
  | "INVALID_REQUEST"
  | "BACKEND_UNREACHABLE"
  | "UNKNOWN";
