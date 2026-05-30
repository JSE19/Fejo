import type {
  ApiDispute,
  ApiListing,
  ApiOrder,
  ApiOrderStatus,
  ApiSeller,
  CreateListingRequest,
  CreateListingResponse,
  CreateOrderRequest,
  CreateOrderResponse,
  CreateSellerRequest,
  CreateSellerResponse,
  GetOrderResponse,
  GetSellerOrdersResponse,
  MockListingHint,
  OpenDisputeRequest,
  OpenDisputeResponse,
  ReleaseOrderResponse,
  SellerOrderRow,
  ShipOrderRequest,
  ShipOrderResponse,
} from "./types";
import { ApiError } from "./errors";
import {
  currentSeller,
  generateOrderToken,
  getDisputeForOrder,
  getListing,
  getOrderByToken,
  getSeller,
  orders as fixtureOrdersArray,
} from "@/lib/mock";
import type { EscrowStatus } from "@/lib/types";

interface MockEnvelope {
  order: ApiOrder;
  listing: ApiListing;
  seller: ApiSeller;
  dispute: ApiDispute | null;
}

const memoryOrders = new Map<string, MockEnvelope>();
const sessionListings = new Map<string, ApiListing>();
const sessionSellers = new Map<string, ApiSeller>();
const registeredSellersByNpub = new Map<string, ApiSeller>();
const createdListings = new Map<string, ApiListing>();

function nowIso(): string {
  return new Date().toISOString();
}

function isoIn(ms: number): string {
  return new Date(Date.now() + ms).toISOString();
}

function normalizeStatus(status: EscrowStatus): ApiOrderStatus {
  switch (status) {
    case "completed":
      return "completed";
    case "resolved":
    case "disputed":
      return "disputed";
    default:
      return status as ApiOrderStatus;
  }
}

function transitionAfter(token: string, ms: number, next: ApiOrderStatus) {
  setTimeout(() => {
    const env = memoryOrders.get(token);
    if (!env) return;
    if (env.order.status === "pending_payment" && next === "paid") {
      memoryOrders.set(token, {
        ...env,
        order: {
          ...env.order,
          status: next,
          updatedAt: nowIso(),
        },
      });
    }
  }, ms);
}

function fixtureSellerToApi(sellerId: string): ApiSeller {
  const sessionMatch = sessionSellers.get(sellerId);
  if (sessionMatch) return sessionMatch;

  const s = getSeller(sellerId) ?? currentSeller;
  return {
    id: s.id,
    npub: `npub1mockseller${s.id.replace(/[^a-z0-9]/gi, "").slice(0, 16)}`,
    pubkey: `mock-seller-pubkey-${s.id}`,
    handle: s.handle,
    name: s.name,
    location: s.location,
    category: s.category,
    bio: s.bio ?? null,
    verified: s.verified,
    lnAddress: null,
    createdAt: s.joinedAt,
  };
}

function fixtureListingToApi(listingId: string): ApiListing | null {
  const sessionMatch = sessionListings.get(listingId);
  if (sessionMatch) return sessionMatch;

  const createdMatch = createdListings.get(listingId);
  if (createdMatch) return createdMatch;

  const l = getListing(listingId);
  if (!l) return null;
  return {
    id: l.id,
    sellerId: l.sellerId,
    title: l.title,
    description: l.description,
    priceNGN: l.priceNGN,
    images: l.images.map((img) => ({ seed: img.seed, alt: img.label })),
    category: l.category,
    variants: l.variants ?? null,
    inStock: l.inStock,
    delivery: l.delivery,
    active: l.active,
    nostrEventId: null,
    createdAt: l.createdAt,
    updatedAt: l.createdAt,
  };
}

function registerSessionListing(hint: MockListingHint): ApiListing {
  const nowIsoStr = nowIso();
  const listing: ApiListing = {
    id: hint.id,
    sellerId: hint.sellerId,
    title: hint.title,
    description: hint.description,
    priceNGN: hint.priceNGN,
    images: hint.images,
    category: hint.category,
    variants: hint.variants ?? null,
    inStock: hint.inStock ?? 1,
    delivery: hint.delivery ?? null,
    active: true,
    nostrEventId: null,
    createdAt: nowIsoStr,
    updatedAt: nowIsoStr,
  };
  sessionListings.set(hint.id, listing);

  if (!getSeller(hint.sellerId) && hint.seller) {
    sessionSellers.set(hint.sellerId, {
      id: hint.sellerId,
      npub: hint.sellerId.startsWith("npub")
        ? hint.sellerId
        : `npub1mockseller${hint.sellerId.replace(/[^a-z0-9]/gi, "").slice(0, 16)}`,
      pubkey: hint.sellerId,
      handle: hint.seller.handle ?? hint.sellerId.slice(0, 12),
      name: hint.seller.name ?? "Seller",
      location: hint.seller.location ?? "Nigeria",
      category: hint.category,
      bio: null,
      verified: hint.seller.verified ?? false,
      lnAddress: null,
      createdAt: nowIsoStr,
    });
  }

  return listing;
}

function fixtureDisputeToApi(orderId: string): ApiDispute | null {
  const d = getDisputeForOrder(orderId);
  if (!d) return null;
  return {
    id: d.id,
    orderId: d.orderId,
    reason: d.reason,
    summary: d.summary,
    openedBy: d.openedBy,
    priority: d.priority,
    status: d.status,
    directResolutionUntil: d.directResolutionUntil ?? null,
    evidenceDueAt: d.evidenceDueAt ?? null,
    isReturn: !!d.isReturn,
    returnEvidence: d.returnEvidence ?? null,
    resolution: d.resolution ?? null,
    createdAt: d.openedAt,
    resolvedAt: d.resolution?.resolvedAt ?? null,
  };
}

function fixtureEnvelope(token: string): MockEnvelope | null {
  const seed = getOrderByToken(token);
  if (!seed) return null;
  const listing = fixtureListingToApi(seed.listingId);
  if (!listing) return null;
  const seller = fixtureSellerToApi(seed.sellerId);

  const order: ApiOrder = {
    id: seed.id,
    shortId: seed.shortId,
    orderToken: seed.orderToken,
    listingId: seed.listingId,
    sellerId: seed.sellerId,
    buyerNpub: `npub1mockbuyer${seed.id.replace(/[^a-z0-9]/gi, "").slice(0, 16)}`,
    buyerPubkey: `mock-buyer-pk-${seed.id}`,
    buyerName: seed.buyerName,
    buyerPhone: seed.buyerPhone,
    buyerEmail: seed.buyerEmail ?? null,
    buyerCity: seed.buyerCity,
    buyerAddress: null,
    contactMethod: seed.contactMethod ?? "phone",
    variant: seed.variant ?? null,
    amountNGN: seed.amountNGN,
    status: normalizeStatus(seed.status),
    mavapayPaymentRef: null,
    trackingNumber: seed.trackingNumber ?? null,
    carrier: seed.carrier ?? null,
    shippedAt: seed.shippedAt ?? null,
    releasedAt: null,
    refundedAt: null,
    autoReleaseAt: seed.autoReleaseAt ?? null,
    notes: seed.notes ?? null,
    createdAt: seed.createdAt,
    updatedAt: seed.updatedAt,
  };

  return {
    order,
    listing,
    seller,
    dispute: fixtureDisputeToApi(seed.id),
  };
}

export const mockApi = {
  async createSeller(req: CreateSellerRequest): Promise<CreateSellerResponse> {
    if (registeredSellersByNpub.has(req.npub)) {
      throw new ApiError(
        "SELLER_ALREADY_EXISTS",
        "A seller with this Nostr identity already exists.",
        409,
      );
    }
    const seller: ApiSeller = {
      id: `mock-seller-${req.npub.slice(5, 21)}`,
      npub: req.npub,
      pubkey: `mock-pk-${req.npub.slice(5, 21)}`,
      handle: req.handle.toLowerCase(),
      name: req.name,
      location: req.location,
      category: req.category,
      bio: req.bio ?? null,
      verified: false,
      lnAddress: req.lnAddress ?? null,
      createdAt: nowIso(),
    };
    registeredSellersByNpub.set(req.npub, seller);
    return { seller };
  },

  async createListing(req: CreateListingRequest): Promise<CreateListingResponse> {
    const seller = registeredSellersByNpub.get(req.sellerNpub);
    if (!seller) {
      throw new ApiError(
        "SELLER_NOT_FOUND",
        "Seller npub does not match any registered seller.",
        400,
      );
    }
    const id = `mock-listing-${Math.random().toString(36).slice(2, 14)}`;
    const created = nowIso();
    const listing: ApiListing = {
      id,
      sellerId: seller.id,
      title: req.title,
      description: req.description,
      priceNGN: req.priceNGN,
      images: req.images,
      category: req.category,
      variants: req.variants ?? null,
      inStock: req.inStock ?? 1,
      delivery: req.delivery ?? null,
      active: true,
      nostrEventId: null,
      createdAt: created,
      updatedAt: created,
    };
    createdListings.set(id, listing);
    return { listing };
  },

  async getSellerOrders(npub: string): Promise<GetSellerOrdersResponse> {
    const seller = registeredSellersByNpub.get(npub);
    const sellerId = seller?.id ?? currentSeller.id;

    const rows: SellerOrderRow[] = [];

    for (const env of memoryOrders.values()) {
      if (env.order.sellerId !== sellerId) continue;
      rows.push({
        ...env.order,
        listing: env.listing,
        dispute: env.dispute,
      });
    }

    for (const seedOrder of fixtureOrdersArray) {
      if (seedOrder.sellerId !== sellerId) continue;
      if (rows.some((r) => r.orderToken === seedOrder.orderToken)) continue;
      const env = fixtureEnvelope(seedOrder.orderToken);
      if (!env) continue;
      rows.push({
        ...env.order,
        listing: env.listing,
        dispute: env.dispute,
      });
    }

    rows.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return { orders: rows };
  },

  async createOrder(req: CreateOrderRequest): Promise<CreateOrderResponse> {
    if (req._listingHint && req._listingHint.id === req.listingId) {
      registerSessionListing(req._listingHint);
    }

    const listing = fixtureListingToApi(req.listingId);
    if (!listing) {
      throw new ApiError(
        "LISTING_NOT_FOUND",
        `No listing with id "${req.listingId}".`,
        404,
      );
    }

    const token = generateOrderToken();
    const shortId = "SS-" + Math.floor(Math.random() * 9000 + 1000).toString();

    const seller = fixtureSellerToApi(listing.sellerId);

    const order: ApiOrder = {
      id: "mock_" + token.slice(0, 10),
      shortId,
      orderToken: token,
      listingId: listing.id,
      sellerId: listing.sellerId,
      buyerNpub: req.buyerNpub,
      buyerPubkey: `mock-buyer-pk-${token.slice(0, 8)}`,
      buyerName: req.buyerName,
      buyerPhone: req.buyerPhone,
      buyerEmail: req.buyerEmail ?? null,
      buyerCity: req.buyerCity,
      buyerAddress: req.buyerAddress ?? null,
      contactMethod: req.contactMethod ?? "phone",
      variant: req.variant ?? null,
      amountNGN: listing.priceNGN,
      status: "pending_payment",
      mavapayPaymentRef: null,
      trackingNumber: null,
      carrier: null,
      shippedAt: null,
      releasedAt: null,
      refundedAt: null,
      autoReleaseAt: null,
      notes: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    memoryOrders.set(token, {
      order,
      listing,
      seller,
      dispute: null,
    });

    transitionAfter(token, 2000, "paid");

    return {
      orderToken: token,
      shortId,
      amountNGN: order.amountNGN,
      payIn: {
        bankName: "GLOBUS BANK",
        bankAccountNumber: "3242273802",
        bankAccountName: "Mava Digital Solutions Limited",
        totalAmountKobo: order.amountNGN * 100,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      },
      payInError: null,
    };
  },

  async getOrder(token: string): Promise<GetOrderResponse> {
    const live = memoryOrders.get(token);
    if (live) return live;

    const fixture = fixtureEnvelope(token);
    if (fixture) {
      memoryOrders.set(token, fixture);
      return fixture;
    }

    throw new ApiError(
      "ORDER_NOT_FOUND",
      `We couldn't find that order link.`,
      404,
    );
  },

  async releaseOrder(token: string): Promise<ReleaseOrderResponse> {
    const env = memoryOrders.get(token) ?? fixtureEnvelope(token);
    if (!env) {
      throw new ApiError("ORDER_NOT_FOUND", "Order not found.", 404);
    }
    const { order } = env;
    if (order.status === "completed") {
      throw new ApiError(
        "ORDER_ALREADY_RELEASED",
        "This order has already been released.",
        409,
      );
    }
    if (
      order.status !== "shipped" &&
      order.status !== "paid"
    ) {
      throw new ApiError(
        "ORDER_NOT_RELEASABLE",
        `Cannot release an order in status "${order.status}".`,
        409,
      );
    }
    const updated: ApiOrder = {
      ...order,
      status: "completed",
      releasedAt: nowIso(),
      updatedAt: nowIso(),
    };
    memoryOrders.set(token, { ...env, order: updated });
    return {
      order: updated,
      txRef: `mavapay_${updated.shortId}`,
    };
  },

  async openDispute(
    token: string,
    req: OpenDisputeRequest,
  ): Promise<OpenDisputeResponse> {
    const env = memoryOrders.get(token) ?? fixtureEnvelope(token);
    if (!env) {
      throw new ApiError("ORDER_NOT_FOUND", "Order not found.", 404);
    }
    if (env.dispute) {
      throw new ApiError(
        "DISPUTE_ALREADY_OPEN",
        "A dispute is already open for this order.",
        409,
      );
    }
    const updatedOrder: ApiOrder = {
      ...env.order,
      status: "disputed",
      updatedAt: nowIso(),
    };
    const dispute: ApiDispute = {
      id: "dsp_mock_" + token.slice(0, 6),
      orderId: env.order.id,
      reason: req.reason,
      summary: req.summary ?? null,
      openedBy: req.openedBy,
      priority: "medium",
      status: "direct_resolution",
      directResolutionUntil: isoIn(72 * 60 * 60 * 1000),
      evidenceDueAt: null,
      isReturn: false,
      returnEvidence: null,
      resolution: null,
      createdAt: nowIso(),
    };
    memoryOrders.set(token, {
      ...env,
      order: updatedOrder,
      dispute,
    });
    return { order: updatedOrder, dispute };
  },

  async shipOrder(
    token: string,
    req: ShipOrderRequest,
  ): Promise<ShipOrderResponse> {
    const env = memoryOrders.get(token) ?? fixtureEnvelope(token);
    if (!env) {
      throw new ApiError("ORDER_NOT_FOUND", "Order not found.", 404);
    }
    if (env.order.status !== "paid") {
      throw new ApiError(
        "INVALID_REQUEST",
        `Cannot ship an order in status "${env.order.status}".`,
        409,
      );
    }
    const shippedAt = nowIso();
    const updated: ApiOrder = {
      ...env.order,
      status: "shipped",
      shippedAt,
      autoReleaseAt: isoIn(7 * 24 * 60 * 60 * 1000),
      trackingNumber: req.trackingNumber ?? null,
      carrier: req.carrier ?? null,
      updatedAt: shippedAt,
    };
    memoryOrders.set(token, { ...env, order: updated });
    return { order: updated };
  },
};
