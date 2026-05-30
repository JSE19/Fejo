import { httpApi } from "./http";
import { mockApi } from "./mocks";
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

export interface ApiClient {
  createSeller(req: CreateSellerRequest): Promise<CreateSellerResponse>;
  createListing(req: CreateListingRequest): Promise<CreateListingResponse>;
  getSellerOrders(npub: string): Promise<GetSellerOrdersResponse>;
  createOrder(req: CreateOrderRequest): Promise<CreateOrderResponse>;
  getOrder(token: string): Promise<GetOrderResponse>;
  releaseOrder(token: string): Promise<ReleaseOrderResponse>;
  openDispute(
    token: string,
    req: OpenDisputeRequest,
  ): Promise<OpenDisputeResponse>;
  shipOrder(token: string, req: ShipOrderRequest): Promise<ShipOrderResponse>;
  getSeller(handle: string): Promise<GetSellerResponse>;
  updateSellerPayout(
    sellerId: string,
    req: UpdatePayoutRequest,
  ): Promise<UpdatePayoutResponse>;
}

export const API_BACKEND_CONFIGURED: boolean = true;

export const apiClient: ApiClient = httpApi;
