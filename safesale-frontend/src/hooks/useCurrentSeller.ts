/**
 * `useCurrentSeller` — the logged-in seller's SafeSale profile.
 *
 * Stored separately from the Nostr session (`useCurrentUser`) because
 * it carries SafeSale-specific data the backend gave us at signup:
 *
 *   - `id` — the Prisma cuid the backend uses as `sellerId`
 *   - `npub` — the seller's bech32 public key (also stored by Nostrify)
 *   - `handle` — the URL-safe SafeSale handle
 *   - `name` — display name
 *
 * Persisted to `localStorage` under `safesale:seller` so the dashboard
 * works across reloads without an extra `GET /api/sellers/:handle`
 * round-trip. Cleared on logout (see `clearSeller`).
 *
 * Why this and not `useAuthor()`? `useAuthor` queries Nostr for kind 0
 * profile metadata. SafeSale's seller record is on a Postgres DB,
 * keyed by npub; the two will rhyme but the SafeSale handle isn't a
 * Nostr concept and shouldn't be tied to relay availability.
 *
 * Set by `Onboarding.tsx` after a successful `apiClient.createSeller`.
 * Reset to `null` when the user logs out.
 */

import { useLocalStorage } from "@/hooks/useLocalStorage";

export interface CurrentSeller {
  /** Backend-assigned cuid; matches `Order.sellerId`. */
  id: string;
  /** Bech32 npub — `useCurrentUser().pubkey`'s npub form. */
  npub: string;
  /** SafeSale handle (lowercased, no `@`). */
  handle: string;
  /** Display name as registered. */
  name: string;
  /** ISO timestamp of when this seller record was created on the backend. */
  createdAt: string;
}

const STORAGE_KEY = "safesale:seller";

export function useCurrentSeller(): [
  CurrentSeller | null,
  (next: CurrentSeller | null) => void,
] {
  const [seller, setSeller] = useLocalStorage<CurrentSeller | null>(
    STORAGE_KEY,
    null,
  );
  return [seller, setSeller];
}

/**
 * Imperative clear — call this from logout flows that don't have a
 * `setSeller` setter in scope.
 */
export function clearCurrentSeller(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore — likely SSR or storage disabled */
  }
}
