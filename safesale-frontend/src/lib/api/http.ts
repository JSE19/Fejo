import type {
  CreateListingRequest,
  CreateListingResponse,
  CreateOrderRequest,
  CreateOrderResponse,
  CreateSellerRequest,
  CreateSellerResponse,
  GetOrderResponse,
  GetSellerOrdersResponse,
  GetSellerResponse,
  OpenDisputeRequest,
  OpenDisputeResponse,
  ReleaseOrderResponse,
  ShipOrderRequest,
  ShipOrderResponse,
  UpdatePayoutRequest,
  UpdatePayoutResponse,
} from "./types";
import { ApiError } from "./errors";

function getBaseUrl(): string {
  const url = import.meta.env.VITE_API_URL;
  if (!url || typeof url !== "string") {
    return ""; // Same-origin — Vite proxy handles /api/ → backend
  }
  return url.replace(/\/$/, "");
}

async function request<T>(
  method: "GET" | "POST" | "PATCH",
  path: string,
  body?: unknown,
): Promise<T> {
  const url = getBaseUrl() + path;
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (cause) {
    throw new ApiError(
      "BACKEND_UNREACHABLE",
      cause instanceof Error
        ? `Could not reach the SafeSale backend: ${cause.message}`
        : "Could not reach the SafeSale backend.",
    );
  }

  let payload: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new ApiError(
        "UNKNOWN",
        `Backend returned non-JSON response (HTTP ${res.status}).`,
        res.status,
      );
    }
  }

  if (!res.ok) {
    const flat = payload as { message?: string; code?: string } | null;
    const nested = payload as { error?: { code?: string; message?: string } } | null;
    const code = flat?.code ?? nested?.error?.code ?? "UNKNOWN";
    const message =
      flat?.message ??
      nested?.error?.message ??
      `Request failed (HTTP ${res.status}).`;
    throw new ApiError(code, message, res.status);
  }

  return payload as T;
}

export const httpApi = {
  createSeller(req: CreateSellerRequest): Promise<CreateSellerResponse> {
    return request<CreateSellerResponse>("POST", "/api/sellers", req);
  },
  createListing(req: CreateListingRequest): Promise<CreateListingResponse> {
    return request<CreateListingResponse>("POST", "/api/listings", req);
  },
  getSellerOrders(npub: string): Promise<GetSellerOrdersResponse> {
    return request<GetSellerOrdersResponse>(
      "GET",
      `/api/orders/seller/${encodeURIComponent(npub)}`,
    );
  },
  createOrder(req: CreateOrderRequest): Promise<CreateOrderResponse> {
    const { _listingHint: _hint, ...body } = req;
    return request<CreateOrderResponse>("POST", "/api/orders", body);
  },
  getOrder(token: string): Promise<GetOrderResponse> {
    return request<GetOrderResponse>(
      "GET",
      `/api/orders/${encodeURIComponent(token)}`,
    );
  },
  releaseOrder(token: string): Promise<ReleaseOrderResponse> {
    return request<ReleaseOrderResponse>(
      "POST",
      `/api/orders/${encodeURIComponent(token)}/release`,
    );
  },
  openDispute(
    token: string,
    req: OpenDisputeRequest,
  ): Promise<OpenDisputeResponse> {
    return request<OpenDisputeResponse>(
      "POST",
      `/api/orders/${encodeURIComponent(token)}/dispute`,
      req,
    );
  },
  shipOrder(
    token: string,
    req: ShipOrderRequest,
  ): Promise<ShipOrderResponse> {
    return request<ShipOrderResponse>(
      "POST",
      `/api/orders/${encodeURIComponent(token)}/ship`,
      req,
    );
  },
  getSeller(handle: string): Promise<GetSellerResponse> {
    return request<GetSellerResponse>(
      "GET",
      `/api/sellers/${encodeURIComponent(handle)}`,
    );
  },
  updateSellerPayout(
    sellerId: string,
    req: UpdatePayoutRequest,
  ): Promise<UpdatePayoutResponse> {
    return request<UpdatePayoutResponse>(
      "PATCH",
      `/api/sellers/${encodeURIComponent(sellerId)}/payout`,
      req,
    );
  },
};
