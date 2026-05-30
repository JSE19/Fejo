/**
 * `useMyListings()` — fetch all listings published by the currently
 * logged-in seller.
 *
 * Queries kind 30018 with `authors: [me]`. Validates each event the
 * same way `useListing` does and skips invalid ones. Returns the most
 * recent version of each listing (deduped by `d` tag, since kind 30018
 * is addressable).
 *
 * When no user is logged in, returns an empty array — components
 * branch on `useCurrentUser` to render an appropriate signed-out UI.
 *
 * Unlike `useListing` this does NOT fall back to fixtures. If the
 * seller has published nothing, the seller should see an empty state,
 * not someone else's demo data.
 */

import type { NostrEvent } from "@nostrify/nostrify";
import { useNostr } from "@nostrify/react";
import { useQuery } from "@tanstack/react-query";

import { useCurrentUser } from "@/hooks/useCurrentUser";

export interface MyListing {
  /** UUID from the `d` tag. */
  id: string;
  title: string;
  summary?: string;
  description: string;
  priceNGN: number;
  /** Image URLs from `image` tags. */
  images: string[];
  category?: string;
  inStock: number;
  delivery?: string;
  /** Unix seconds. */
  publishedAt: number;
  /** The raw event for advanced consumers (signing tag-edits, etc.). */
  event: NostrEvent;
}

function getTag(event: NostrEvent, name: string): string | undefined {
  return event.tags.find(([n]) => n === name)?.[1];
}

function getTagValues(event: NostrEvent, name: string): string[] {
  return event.tags
    .filter(([n]) => n === name)
    .map(([, v]) => v)
    .filter(Boolean);
}

function parseStock(raw: string | undefined): number {
  if (!raw) return 1;
  if (raw === "out") return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 1;
}

function parseMyListing(event: NostrEvent): MyListing | null {
  const id = getTag(event, "d");
  const title = getTag(event, "title");
  const images = getTagValues(event, "image");
  const priceTag = event.tags.find(([n]) => n === "price");
  if (!id || !title || images.length === 0 || !priceTag) return null;

  const priceNGN = Number.parseInt(priceTag[1], 10);
  if (!Number.isFinite(priceNGN) || priceNGN <= 0) return null;

  const publishedAtRaw = getTag(event, "published_at");
  const publishedAt = publishedAtRaw
    ? Number.parseInt(publishedAtRaw, 10)
    : event.created_at;

  const deliveryTag = event.tags.find(([n]) => n === "delivery");
  const delivery = deliveryTag
    ? deliveryTag.slice(1).filter(Boolean).join(" · ")
    : undefined;

  return {
    id,
    title,
    summary: getTag(event, "summary"),
    description: event.content,
    priceNGN,
    images,
    category: getTag(event, "category"),
    inStock: parseStock(getTag(event, "stock")),
    delivery,
    publishedAt,
    event,
  };
}

export function useMyListings() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const pubkey = user?.pubkey;

  return useQuery<MyListing[]>({
    queryKey: ["safesale", "my-listings", pubkey ?? ""],
    queryFn: async () => {
      if (!pubkey) return [];

      const events = await nostr.query(
        [{ kinds: [30018], authors: [pubkey], limit: 100 }],
        { signal: AbortSignal.timeout(2500) },
      );

      // Dedupe by `d` tag, keeping the most recent (kind 30018 is
      // addressable; older versions are superseded).
      const newestByD = new Map<string, NostrEvent>();
      for (const ev of events) {
        const d = getTag(ev, "d");
        if (!d) continue;
        const prev = newestByD.get(d);
        if (!prev || ev.created_at > prev.created_at) {
          newestByD.set(d, ev);
        }
      }

      const listings: MyListing[] = [];
      for (const ev of newestByD.values()) {
        const parsed = parseMyListing(ev);
        if (parsed) listings.push(parsed);
      }
      // Newest first
      listings.sort((a, b) => b.publishedAt - a.publishedAt);
      return listings;
    },
    // Listings refresh quickly after a publish; short stale window
    staleTime: 15 * 1000,
    retry: 1,
  });
}
