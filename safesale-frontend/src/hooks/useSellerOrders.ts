/**
 * `useSellerOrders` — the logged-in seller's order feed.
 *
 * Backed by `GET /api/orders/seller/:npub` (see `apiClient.getSellerOrders`).
 * Returns a TanStack Query result whose `data` is the array of
 * `SellerOrderRow` (each row already joined with its listing + dispute,
 * matching the backend's `include: { listing: true, dispute: true }`).
 *
 * Identity: pulled from `useCurrentSeller()`. If the seller hasn't
 * completed onboarding the query is disabled and returns `data:
 * undefined`. The dashboard handles that as the "not signed up yet"
 * state — same surface as an empty seller.
 *
 * Polling: 15s. The dashboard is the seller's main monitoring surface;
 * they should see new payment-locked orders appear without refreshing.
 * Stops polling on tab hidden via TanStack's default
 * `refetchIntervalInBackground: false`.
 */

import { useQuery } from "@tanstack/react-query";

import { useCurrentSeller } from "@/hooks/useCurrentSeller";
import { apiClient, type SellerOrderRow } from "@/lib/api";

export interface UseSellerOrdersResult {
  /** All orders for this seller, newest first. Empty array when none. */
  orders: SellerOrderRow[];
  /** True while the first fetch is in flight (no data yet). */
  isLoading: boolean;
  /** True if a follow-up fetch is in flight (background refresh). */
  isFetching: boolean;
  /** Last error (if any). */
  error: unknown;
  /** Manual refresh trigger — e.g. after `shipOrder`. */
  refetch: () => void;
}

export function useSellerOrders(): UseSellerOrdersResult {
  const [seller] = useCurrentSeller();
  const npub = seller?.npub;

  const query = useQuery<{ orders: SellerOrderRow[] }>({
    queryKey: ["safesale", "seller-orders", npub ?? ""],
    enabled: !!npub,
    queryFn: () => apiClient.getSellerOrders(npub as string),
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  return {
    orders: query.data?.orders ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
  };
}
