import type {
  ChatMessage,
  Dispute,
  Listing,
  Order,
  PayoutEntry,
  Review,
  Seller,
} from "./types";

const NOW = Date.now();
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const iso = (offsetMs: number) => new Date(NOW + offsetMs).toISOString();

export const currentSeller: Seller = {
  id: "seller_amaka",
  handle: "amaka.thrift",
  name: "Amaka Okafor",
  avatarSeed: "amaka-okafor",
  location: "Lagos, Nigeria",
  joinedAt: iso(-180 * DAY),
  rating: 4.9,
  reviews: 312,
  completedOrders: 487,
  responseTimeMins: 12,
  verified: true,
  bio: "Curated thrift & second-hand fashion. Hand-picked, hand-cleaned, shipped nationwide.",
  category: "Fashion & Thrift",
  instagram: "@amaka.thrift",
  whatsapp: "+234 803 555 0142",
};

export const sellers: Seller[] = [
  currentSeller,
  {
    id: "seller_ade",
    handle: "ade.tech",
    name: "Adebayo Ogunleye",
    avatarSeed: "adebayo",
    location: "Ibadan, Nigeria",
    joinedAt: iso(-300 * DAY),
    rating: 4.8,
    reviews: 198,
    completedOrders: 241,
    responseTimeMins: 18,
    verified: true,
    bio: "Imported phone accessories, audio gear and small electronics.",
    category: "Electronics",
  },
  {
    id: "seller_zee",
    handle: "zeebeauty",
    name: "Zainab Bello",
    avatarSeed: "zainab",
    location: "Abuja, Nigeria",
    joinedAt: iso(-90 * DAY),
    rating: 4.95,
    reviews: 144,
    completedOrders: 180,
    responseTimeMins: 8,
    verified: true,
    bio: "Skincare and natural beauty essentials. Cruelty-free, locally made.",
    category: "Beauty",
  },
];

export const listings: Listing[] = [
  {
    id: "cmph7pvyr0002lk1cgz14mckh",
    sellerId: "seller_amaka",
    title: "Vintage Denim Jacket (demo seed)",
    description:
      "Lightly worn vintage Levi denim jacket, size M. Perfect condition, no rips.",
    priceNGN: 28500,
    images: [
      { seed: "demo-denim-jacket", hueA: 210, hueB: 220, label: "Front" },
    ],
    inStock: 1,
    category: "Fashion",
    variants: ["One size — M"],
    delivery: "Lagos pickup or GIG nationwide",
    views: 0,
    saves: 0,
    createdAt: iso(0),
    active: true,
  },
  {
    id: "lst_jacket01",
    sellerId: "seller_amaka",
    title: "Vintage Denim Jacket — Ralph Lauren",
    description:
      "Hand-picked vintage Ralph Lauren denim jacket. Medium-wash, beautifully broken-in, no rips or stains. Fits men's M / women's L oversized. Photos are of the exact item.",
    priceNGN: 28500,
    images: [
      { seed: "jacket-front", hueA: 210, hueB: 220, label: "Front" },
      { seed: "jacket-back", hueA: 215, hueB: 225, label: "Back" },
      { seed: "jacket-detail", hueA: 200, hueB: 215, label: "Detail" },
    ],
    inStock: 1,
    category: "Fashion",
    variants: ["One size — M/L"],
    delivery: "Lagos same-day · Nationwide 2–4 days",
    views: 1284,
    saves: 96,
    createdAt: iso(-6 * DAY),
    active: true,
  },
  {
    id: "lst_sneakers02",
    sellerId: "seller_amaka",
    title: "Nike Air Force 1 '07 — White",
    description:
      "Lightly used, cleaned and deodorised. Size UK 9 / EU 43. Comes in original box.",
    priceNGN: 42000,
    images: [
      { seed: "af1-side", hueA: 30, hueB: 40, label: "Side" },
      { seed: "af1-top", hueA: 35, hueB: 45, label: "Top" },
    ],
    inStock: 1,
    category: "Footwear",
    variants: ["UK 9"],
    delivery: "Nationwide 2–4 days",
    views: 842,
    saves: 71,
    createdAt: iso(-2 * DAY),
    active: true,
  },
  {
    id: "lst_bag03",
    sellerId: "seller_amaka",
    title: "Coach Leather Crossbody",
    description:
      "Genuine pre-owned Coach crossbody bag. Soft pebbled leather, minor wear on corners.",
    priceNGN: 67500,
    images: [
      { seed: "bag-front", hueA: 20, hueB: 30, label: "Front" },
      { seed: "bag-interior", hueA: 18, hueB: 28, label: "Interior" },
    ],
    inStock: 1,
    category: "Bags",
    delivery: "Nationwide 2–4 days",
    views: 2103,
    saves: 184,
    createdAt: iso(-12 * DAY),
    active: true,
  },
  {
    id: "lst_dress04",
    sellerId: "seller_amaka",
    title: "Silk Wrap Midi Dress",
    description: "Beautiful silk wrap dress in deep emerald. Worn twice, dry-cleaned.",
    priceNGN: 35000,
    images: [{ seed: "dress-1", hueA: 150, hueB: 165, label: "Front" }],
    inStock: 1,
    category: "Fashion",
    variants: ["UK 10"],
    delivery: "Nationwide 2–4 days",
    views: 421,
    saves: 38,
    createdAt: iso(-1 * DAY),
    active: true,
  },
  {
    id: "lst_watch05",
    sellerId: "seller_ade",
    title: "Casio G-Shock GA-2100 — Black",
    description: "Brand new G-Shock, sealed box. 2-year warranty card included.",
    priceNGN: 58000,
    images: [{ seed: "watch", hueA: 220, hueB: 240, label: "Watch" }],
    inStock: 4,
    category: "Watches",
    delivery: "Nationwide 2–4 days",
    views: 612,
    saves: 44,
    createdAt: iso(-5 * DAY),
    active: true,
  },
  {
    id: "lst_serum06",
    sellerId: "seller_zee",
    title: "Vitamin C + Hyaluronic Serum 30ml",
    description: "Locally produced, gentle on all skin types. Batch tested.",
    priceNGN: 12000,
    images: [{ seed: "serum", hueA: 38, hueB: 50, label: "Bottle" }],
    inStock: 28,
    category: "Beauty",
    delivery: "Lagos same-day · Nationwide 2–4 days",
    views: 980,
    saves: 211,
    createdAt: iso(-3 * DAY),
    active: true,
  },
];

export const orders: Order[] = [
  {
    id: "ord_01",
    shortId: "SS-7421",
    orderToken: "k7xq2m9a4npb3hv8yw5jc6",
    listingId: "lst_jacket01",
    sellerId: "seller_amaka",
    buyerName: "Chinedu A.",
    buyerPhone: "+234 802 555 0193",
    buyerEmail: "chinedu.a@example.com",
    contactMethod: "email",
    buyerCity: "Abuja",
    amountNGN: 28500,
    status: "paid",
    createdAt: iso(-3 * HOUR),
    updatedAt: iso(-2 * HOUR),
    variant: "One size — M/L",
    protectedUntil: iso(7 * DAY),
  },
  {
    id: "ord_02",
    shortId: "SS-7418",
    orderToken: "v3pk8nh2rt6mqd4zs9wybc",
    listingId: "lst_sneakers02",
    sellerId: "seller_amaka",
    buyerName: "Tomiwa S.",
    buyerPhone: "+234 815 555 0021",
    contactMethod: "phone",
    buyerCity: "Ibadan",
    amountNGN: 42000,
    status: "shipped",
    createdAt: iso(-30 * HOUR),
    updatedAt: iso(-4 * HOUR),
    shippedAt: iso(-4 * HOUR),
    trackingNumber: "GIG-9871-2210",
    carrier: "GIG Logistics",
    variant: "UK 9",
    autoReleaseAt: iso(7 * DAY - 4 * HOUR),
    protectedUntil: iso(7 * DAY),
  },
  {
    id: "ord_03",
    shortId: "SS-7409",
    orderToken: "g4mxr7tnpa9kqv2hb5wcdy",
    listingId: "lst_bag03",
    sellerId: "seller_amaka",
    buyerName: "Funke O.",
    buyerPhone: "+234 803 555 0099",
    buyerEmail: "funke.o@example.com",
    contactMethod: "email",
    buyerCity: "Lagos",
    amountNGN: 67500,
    status: "paid",
    createdAt: iso(-3 * DAY),
    updatedAt: iso(-6 * HOUR),
    shippedAt: iso(-2 * DAY),
    deliveredAt: iso(-6 * HOUR),
    trackingNumber: "GIG-9764-1118",
    carrier: "GIG Logistics",
    autoReleaseAt: iso(5 * DAY),
    protectedUntil: iso(2 * DAY),
  },
  {
    id: "ord_04",
    shortId: "SS-7402",
    orderToken: "j8wt5nb2qkx9mra3hsy7cv",
    listingId: "lst_dress04",
    sellerId: "seller_amaka",
    buyerName: "Ifeoma N.",
    buyerPhone: "+234 807 555 0444",
    contactMethod: "phone",
    buyerCity: "Enugu",
    amountNGN: 35000,
    status: "completed",
    createdAt: iso(-9 * DAY),
    updatedAt: iso(-2 * DAY),
    shippedAt: iso(-7 * DAY),
    deliveredAt: iso(-3 * DAY),
    trackingNumber: "GIG-9612-0918",
    carrier: "GIG Logistics",
    protectedUntil: iso(-2 * DAY),
  },
  {
    id: "ord_05",
    shortId: "SS-7395",
    orderToken: "f9zh3kqrx8m2nbvc5wpyt7",
    listingId: "lst_watch05",
    sellerId: "seller_amaka",
    buyerName: "Bukola E.",
    buyerPhone: "+234 809 555 0712",
    buyerEmail: "bukola.e@example.com",
    contactMethod: "email",
    buyerCity: "Port Harcourt",
    amountNGN: 58000,
    status: "disputed",
    createdAt: iso(-5 * DAY),
    updatedAt: iso(-12 * HOUR),
    shippedAt: iso(-4 * DAY),
    deliveredAt: iso(-1 * DAY),
    trackingNumber: "GIG-9588-0710",
    carrier: "GIG Logistics",
    protectedUntil: iso(5 * DAY),
    notes: "Buyer reports wrong colour received.",
  },
  {
    id: "ord_06",
    shortId: "SS-7430",
    orderToken: "n2bxhpa9tkmr8qvs5wy3cd",
    listingId: "lst_serum06",
    sellerId: "seller_amaka",
    buyerName: "Hassan I.",
    buyerPhone: "+234 810 555 0203",
    contactMethod: "phone",
    buyerCity: "Kano",
    amountNGN: 12000,
    status: "pending_payment",
    createdAt: iso(-20 * 60 * 1000),
    updatedAt: iso(-20 * 60 * 1000),
    protectedUntil: iso(7 * DAY),
  },
  {
    id: "ord_10",
    shortId: "SS-7372",
    orderToken: "m7nxkqp2vbtryhc8sw95zj",
    listingId: "lst_dress04",
    sellerId: "seller_amaka",
    buyerName: "Nene C.",
    buyerPhone: "+234 808 555 0327",
    buyerEmail: "nene.c@example.com",
    contactMethod: "email",
    buyerCity: "Lagos",
    amountNGN: 32000,
    status: "disputed",
    createdAt: iso(-3 * DAY),
    updatedAt: iso(-8 * HOUR),
    shippedAt: iso(-2.5 * DAY),
    deliveredAt: iso(-30 * HOUR),
    trackingNumber: "GIG-9821-1402",
    carrier: "GIG Logistics",
    protectedUntil: iso(4 * DAY),
    notes: "Buyer initiated return — item being shipped back.",
  },
  {
    id: "ord_09",
    shortId: "SS-7388",
    orderToken: "p5wrkx2hnb8tqmv9czd4ys",
    listingId: "lst_sneakers02",
    sellerId: "seller_amaka",
    buyerName: "Kemi A.",
    buyerPhone: "+234 802 555 0808",
    buyerEmail: "kemi.a@example.com",
    contactMethod: "email",
    buyerCity: "Lagos",
    amountNGN: 18000,
    status: "completed",
    createdAt: iso(-6 * DAY),
    updatedAt: iso(-1 * DAY),
    shippedAt: iso(-5 * DAY),
    deliveredAt: iso(-3 * DAY),
    trackingNumber: "GIG-9544-0608",
    carrier: "GIG Logistics",
    notes: "Resolved by mediator with partial refund.",
    protectedUntil: iso(-1 * DAY),
  },
];

export const reviews: Review[] = [
  {
    id: "rev_1",
    sellerId: "seller_amaka",
    buyerName: "Funke O.",
    buyerInitial: "F",
    rating: 5,
    text: "The bag arrived exactly as described. Amaka was patient with all my questions and SafeSale made it stress-free.",
    product: "Coach Leather Crossbody",
    createdAt: iso(-2 * DAY),
    verified: true,
  },
  {
    id: "rev_2",
    sellerId: "seller_amaka",
    buyerName: "Tomiwa S.",
    buyerInitial: "T",
    rating: 5,
    text: "Sneakers were spotless, packaging was neat. First time using escrow — I'd never go back to direct transfers.",
    product: "Nike Air Force 1",
    createdAt: iso(-6 * DAY),
    verified: true,
  },
  {
    id: "rev_3",
    sellerId: "seller_amaka",
    buyerName: "Ifeoma N.",
    buyerInitial: "I",
    rating: 5,
    text: "Beautiful dress, fits perfectly. Will definitely buy from her again.",
    product: "Silk Wrap Dress",
    createdAt: iso(-3 * DAY),
    verified: true,
  },
  {
    id: "rev_4",
    sellerId: "seller_amaka",
    buyerName: "Kemi A.",
    buyerInitial: "K",
    rating: 4,
    text: "Item was great but shipping took a day longer than expected. Still very happy.",
    product: "Levi's 501 Jeans",
    createdAt: iso(-12 * DAY),
    verified: true,
  },
  {
    id: "rev_5",
    sellerId: "seller_amaka",
    buyerName: "Chukwudi M.",
    buyerInitial: "C",
    rating: 5,
    text: "Smooth from start to finish. Escrow released the moment I confirmed delivery.",
    product: "Polo Shirt",
    createdAt: iso(-18 * DAY),
    verified: true,
  },
];

export const disputes: Dispute[] = [
  {
    id: "dsp_1",
    orderId: "ord_05",
    reason: "Item not as described",
    openedBy: "buyer",
    openedAt: iso(-12 * HOUR),
    status: "mediating",
    priority: "high",
    amountNGN: 58000,
    summary: "Buyer received black watch but says photo on listing showed grey.",
    buyerEvidence: 3,
    sellerEvidence: 2,
  },
  {
    id: "dsp_2",
    orderId: "ord_07",
    reason: "Item not received",
    openedBy: "buyer",
    openedAt: iso(-30 * HOUR),
    status: "evidence_requested",
    priority: "medium",
    amountNGN: 24500,
    summary: "Tracking shows delivered but buyer says nothing arrived at address.",
    buyerEvidence: 2,
    sellerEvidence: 1,
    evidenceDueAt: iso(18 * HOUR),
  },
  {
    id: "dsp_3",
    orderId: "ord_08",
    reason: "Damaged on arrival",
    openedBy: "buyer",
    openedAt: iso(-4 * HOUR),
    status: "direct_resolution",
    priority: "high",
    amountNGN: 96000,
    summary: "Phone screen has a crack visible in unboxing photos shared by buyer.",
    buyerEvidence: 4,
    sellerEvidence: 0,
    directResolutionUntil: iso(68 * HOUR),
  },
  {
    id: "dsp_4",
    orderId: "ord_09",
    reason: "Wrong size sent",
    openedBy: "buyer",
    openedAt: iso(-2 * DAY),
    status: "resolved",
    priority: "low",
    amountNGN: 18000,
    summary: "Buyer ordered UK 9 but received UK 10.",
    buyerEvidence: 2,
    sellerEvidence: 2,
    resolution: {
      outcome: "split",
      buyerRefundNGN: 6000,
      sellerReleaseNGN: 12000,
      reasoning:
        "Photos confirm wrong size shipped. Seller offered a partial refund the buyer accepted in chat. Mediator approved the split.",
      mediator: "Niyi A. (SafeSale mediator)",
      resolvedAt: iso(-1 * DAY),
    },
  },
  {
    id: "dsp_5",
    orderId: "ord_10",
    reason: "Item not as described — returning",
    openedBy: "buyer",
    openedAt: iso(-26 * HOUR),
    status: "mediating",
    priority: "medium",
    amountNGN: 32000,
    summary: "Buyer says fabric quality far below listing description. Returning the item.",
    buyerEvidence: 3,
    sellerEvidence: 0,
    isReturn: true,
    returnEvidence: {
      receivedByBuyer: { count: 4, at: iso(-26 * HOUR) },
      packedForReturn: {
        count: 2,
        at: iso(-8 * HOUR),
        trackingNumber: "GIG-9904-1602",
      },
    },
  },
];

export function getDisputeForOrder(orderId: string): Dispute | undefined {
  return disputes.find((d) => d.orderId === orderId);
}

export const chat: ChatMessage[] = [
  {
    id: "m1",
    from: "system",
    text: "Payment of ₦58,000 secured in escrow.",
    at: iso(-5 * DAY),
  },
  {
    id: "m2",
    from: "buyer",
    text: "Hi, just paid! Please confirm the colour is the dark grey one I asked about?",
    at: iso(-5 * DAY + 5 * 60_000),
  },
  {
    id: "m3",
    from: "seller",
    text: "Yes, dark grey GA-2100. Shipping today via GIG.",
    at: iso(-5 * DAY + 30 * 60_000),
  },
  {
    id: "m4",
    from: "system",
    text: "Tracking added: GIG-9588-0710. Order marked as shipped.",
    at: iso(-4 * DAY),
  },
  {
    id: "m5",
    from: "system",
    text: "Order marked as delivered.",
    at: iso(-1 * DAY),
  },
  {
    id: "m6",
    from: "buyer",
    text: "Watch arrived but it's matte black, not the grey one shown in your listing. I'd like to return.",
    at: iso(-22 * HOUR),
    attachment: { label: "received-watch.jpg", seed: "watch-evidence" },
  },
  {
    id: "m7",
    from: "seller",
    text: "Sorry about that — the listing picture might have looked grey under bright light. I can offer a partial refund of ₦8,000 or full return.",
    at: iso(-18 * HOUR),
  },
  {
    id: "m8",
    from: "system",
    text: "Dispute opened by buyer. SafeSale mediator joining the chat.",
    at: iso(-12 * HOUR),
  },
];

export const payouts: PayoutEntry[] = [
  { id: "p1", amountNGN: 124500, status: "completed", bankRef: "GTB ****2841", at: iso(-2 * DAY) },
  { id: "p2", amountNGN: 87200, status: "completed", bankRef: "GTB ****2841", at: iso(-9 * DAY) },
  { id: "p3", amountNGN: 240000, status: "completed", bankRef: "GTB ****2841", at: iso(-16 * DAY) },
  { id: "p4", amountNGN: 67500, status: "processing", bankRef: "GTB ****2841", at: iso(-2 * HOUR) },
  { id: "p5", amountNGN: 42000, status: "scheduled", bankRef: "GTB ****2841", at: iso(2 * DAY) },
];

export const earnings = {
  thisMonthNGN: 458_400,
  pendingNGN: 109_500,
  availableNGN: 67_500,
  satsBalance: 504_120,
  totalLifetimeNGN: 4_120_500,
  weekly: [
    { day: "Mon", value: 28500 },
    { day: "Tue", value: 65000 },
    { day: "Wed", value: 42000 },
    { day: "Thu", value: 88000 },
    { day: "Fri", value: 120000 },
    { day: "Sat", value: 95400 },
    { day: "Sun", value: 19500 },
  ],
};

const RESERVED_HANDLES = new Set([
  "admin", "support", "help", "app", "pay", "p", "api", "www",
  "settings", "login", "signup", "signin", "onboarding", "checkout",
  "order", "orders", "listing", "listings", "earnings", "reputation",
  "chat", "dispute", "disputes", "mediator", "how-it-works",
  "for-sellers", "safesale",
]);

const TAKEN_HANDLES = new Set([
  "amaka.thrift", "ade.tech", "zeebeauty",
  "lagos.kicks", "tee.shop", "naija.thrift", "abuja.beauty",
  "kemi", "tunde", "jane",
]);

export type HandleCheck =
  | { ok: true }
  | { ok: false; reason: "too-short" | "too-long" | "invalid-chars" | "reserved" | "taken"; suggestions?: string[] };

export function checkHandle(raw: string): HandleCheck {
  const handle = raw.trim().toLowerCase();
  if (handle.length < 3) return { ok: false, reason: "too-short" };
  if (handle.length > 24) return { ok: false, reason: "too-long" };
  if (!/^[a-z0-9][a-z0-9._-]*[a-z0-9]$/.test(handle)) {
    return { ok: false, reason: "invalid-chars" };
  }
  if (RESERVED_HANDLES.has(handle)) {
    return { ok: false, reason: "reserved", suggestions: suggestionsFor(handle) };
  }
  if (TAKEN_HANDLES.has(handle)) {
    return { ok: false, reason: "taken", suggestions: suggestionsFor(handle) };
  }
  return { ok: true };
}

function suggestionsFor(base: string): string[] {
  const stem = base.replace(/[._-]/g, "");
  return [
    `${stem}.shop`,
    `${stem}.ng`,
    `${stem}_official`,
  ].filter((s) => !TAKEN_HANDLES.has(s) && !RESERVED_HANDLES.has(s)).slice(0, 3);
}

export function suggestHandle(displayName: string): string {
  const base = displayName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, ".")
    .slice(0, 20);
  if (!base) return "";
  if (TAKEN_HANDLES.has(base) || RESERVED_HANDLES.has(base)) {
    const stem = base.replace(/[._-]/g, "");
    return `${stem}.shop`;
  }
  return base;
}

export function getListing(id: string): Listing | undefined {
  return listings.find((l) => l.id === id);
}
export function getSeller(id: string): Seller | undefined {
  return sellers.find((s) => s.id === id);
}
export function getSellerByHandle(handle: string): Seller | undefined {
  return sellers.find((s) => s.handle.toLowerCase() === handle.toLowerCase());
}
export function getOrder(id: string): Order | undefined {
  return orders.find((o) => o.id === id || o.shortId === id);
}
export function getOrderByToken(token: string): Order | undefined {
  return orders.find((o) => o.orderToken === token);
}

export function generateOrderToken(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 22; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return s;
}
export function getReviewsForSeller(id: string): Review[] {
  return reviews.filter((r) => r.sellerId === id);
}
export function getListingsForSeller(id: string): Listing[] {
  return listings.filter((l) => l.sellerId === id && l.active);
}
