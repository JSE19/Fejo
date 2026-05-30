export type EscrowStatus =
  | "pending_payment"
  | "paid"
  | "shipped"
  | "completed"
  | "disputed"
  | "resolved"
  | "refunded";

export interface Seller {
  id: string;
  handle: string;
  name: string;
  avatarSeed: string;
  location: string;
  joinedAt: string;
  rating: number;
  reviews: number;
  completedOrders: number;
  responseTimeMins: number;
  verified: boolean;
  bio: string;
  category: string;
  instagram?: string;
  whatsapp?: string;
}

export interface Listing {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  priceNGN: number;
  images: ProductImage[];
  inStock: number;
  category: string;
  variants?: string[];
  delivery: string;
  views: number;
  saves: number;
  createdAt: string;
  active: boolean;
}

export interface ProductImage {
  seed: string;
  hueA: number;
  hueB: number;
  label: string;
}

export interface Order {
  id: string;
  shortId: string;
  orderToken: string;
  listingId: string;
  sellerId: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string;
  contactMethod?: "phone" | "email";
  buyerCity: string;
  amountNGN: number;
  status: EscrowStatus;
  createdAt: string;
  updatedAt: string;
  shippedAt?: string;
  deliveredAt?: string;
  trackingNumber?: string;
  carrier?: string;
  variant?: string;
  notes?: string;
  autoReleaseAt?: string;
  protectedUntil: string;
}

export interface Review {
  id: string;
  sellerId: string;
  buyerName: string;
  buyerInitial: string;
  rating: number;
  text: string;
  product: string;
  createdAt: string;
  verified: boolean;
}

export type DisputeStatus =
  | "direct_resolution"
  | "escalated"
  | "evidence_requested"
  | "mediating"
  | "resolved";

export interface Dispute {
  id: string;
  orderId: string;
  reason: string;
  openedBy: "buyer" | "seller";
  openedAt: string;
  status: DisputeStatus;
  priority: "low" | "medium" | "high";
  amountNGN: number;
  summary: string;
  buyerEvidence: number;
  sellerEvidence: number;
  directResolutionUntil?: string;
  evidenceDueAt?: string;
  isReturn?: boolean;
  returnEvidence?: ReturnEvidence;
  resolution?: DisputeResolution;
}

export interface ReturnEvidence {
  receivedByBuyer?: { count: number; at: string };
  packedForReturn?: { count: number; at: string; trackingNumber?: string };
  receivedBackBySeller?: { count: number; at: string };
}

export interface DisputeResolution {
  outcome: "release" | "refund" | "split";
  buyerRefundNGN: number;
  sellerReleaseNGN: number;
  reasoning: string;
  mediator: string;
  resolvedAt: string;
}

export interface ChatMessage {
  id: string;
  from: "buyer" | "seller" | "system";
  text: string;
  at: string;
  attachment?: { label: string; seed: string };
}

export interface PayoutEntry {
  id: string;
  amountNGN: number;
  status: "completed" | "processing" | "scheduled";
  bankRef: string;
  at: string;
}
