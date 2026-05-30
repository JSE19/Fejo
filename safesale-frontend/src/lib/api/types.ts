export type ApiOrderStatus =
  | "pending_payment"
  | "paid"
  | "shipped"
  | "completed"
  | "disputed"
  | "refunded";

export type ApiDisputeStatus =
  | "direct_resolution"
  | "escalated"
  | "evidence_requested"
  | "mediating"
  | "resolved";

export interface ApiListingImage {
  url?: string;
  seed?: string;
  alt?: string;
}

export interface ApiSeller {
  id: string;
  npub: string;
  pubkey: string;
  handle: string;
  name: string;
  location: string;
  category: string;
  bio?: string | null;
  verified: boolean;
  bankName?: string | null;
  bankAccount?: string | null;
  bankHolder?: string | null;
  bankCode?: string | null;
  bankVerifiedName?: string | null;
  lnAddress?: string | null;
  createdAt: string;
}

export interface ApiListing {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  priceNGN: number;
  images: ApiListingImage[];
  category: string;
  variants?: string[] | null;
  inStock: number;
  delivery?: string | null;
  active: boolean;
  nostrEventId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiOrder {
  id: string;
  shortId: string;
  orderToken: string;

  listingId: string;
  sellerId: string;

  buyerNpub: string;
  buyerPubkey: string;

  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string | null;
  buyerCity: string;
  buyerAddress?: string | null;
  contactMethod?: "phone" | "email" | null;

  variant?: string | null;

  amountNGN: number;

  status: ApiOrderStatus;

  mavapayPaymentRef?: string | null;

  trackingNumber?: string | null;
  carrier?: string | null;

  shippedAt?: string | null;
  releasedAt?: string | null;
  refundedAt?: string | null;

  autoReleaseAt?: string | null;

  notes?: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface ApiDispute {
  id: string;
  orderId: string;
  reason: string;
  summary?: string | null;
  openedBy: "buyer" | "seller";
  priority: "low" | "medium" | "high";
  status: ApiDisputeStatus;
  directResolutionUntil?: string | null;
  evidenceDueAt?: string | null;
  isReturn: boolean;
  returnEvidence?: unknown;
  resolution?: unknown;
  createdAt: string;
  resolvedAt?: string | null;
}

export interface MockListingHint {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  priceNGN: number;
  images: ApiListingImage[];
  category: string;
  variants?: string[] | null;
  inStock?: number;
  delivery?: string | null;
  seller?: {
    name?: string;
    handle?: string;
    location?: string;
    verified?: boolean;
  };
}

export interface CreateOrderRequest {
  listingId: string;
  buyerNpub: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string;
  buyerCity: string;
  buyerAddress?: string;
  contactMethod?: "phone" | "email";
  variant?: string;

  _listingHint?: MockListingHint;
}

export interface PayInDetails {
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  totalAmountKobo: number;
  expiresAt: string;
}

export interface CreateOrderResponse {
  orderToken: string;
  shortId: string;
  amountNGN: number;
  payIn: PayInDetails | null;
  payInError?: string | null;
}

export interface GetOrderResponse {
  order: ApiOrder;
  listing: ApiListing;
  seller: ApiSeller;
  dispute: ApiDispute | null;
}

export interface ReleaseOrderResponse {
  order: ApiOrder;
  txRef: string;
}

export interface ShipOrderRequest {
  trackingNumber?: string;
  carrier?: string;
}

export interface ShipOrderResponse {
  order: ApiOrder;
}

export interface OpenDisputeRequest {
  reason: string;
  summary?: string;
  openedBy: "buyer" | "seller";
}

export interface OpenDisputeResponse {
  order: ApiOrder;
  dispute: ApiDispute;
}

export interface CreateSellerRequest {
  npub: string;
  handle: string;
  name: string;
  location: string;
  phone: string;
  category: string;
  bio?: string;
  bankName?: string;
  bankAccount?: string;
  bankHolder?: string;
  lnAddress?: string;
}

export interface CreateSellerResponse {
  seller: ApiSeller;
}

export interface CreateListingRequest {
  sellerNpub: string;
  title: string;
  description: string;
  priceNGN: number;
  images: ApiListingImage[];
  category: string;
  variants?: string[];
  inStock?: number;
  delivery?: string;
}

export interface CreateListingResponse {
  listing: ApiListing;
}

export interface GetSellerOrdersResponse {
  orders: SellerOrderRow[];
}

export interface SellerOrderRow extends ApiOrder {
  listing: ApiListing;
  dispute: ApiDispute | null;
}

export interface UpdatePayoutRequest {
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  bankCode: string;
}

export interface UpdatePayoutResponse {
  seller: ApiSeller;
}

export interface GetSellerResponse {
  seller: ApiSeller & { bankName: string; bankAccount: string; bankHolder: string; bankCode: string; bankVerifiedName: string | null; bankVerifiedAt: string | null };
  listings: ApiListing[];
  reputation: { completedTrades: number; rating: number | null };
}
