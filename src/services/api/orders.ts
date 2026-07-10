import axios, { AxiosError } from 'axios';

import { shouldRedirectUnauthorized } from '@/shared/config/authPreview';

import { getStoredAccessToken } from './tokenStore';
import type { PaymentDetailDto } from './payments';

const orderApiClient = axios.create({
  baseURL: getOrderApiBaseUrl(),
  withCredentials: true,
});

orderApiClient.interceptors.request.use((config) => {
  const token = getStoredAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

orderApiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && shouldRedirectUnauthorized()) {
      window.location.assign('/login');
    }

    return Promise.reject(error);
  },
);

export type ServiceResult<T> = {
  status: number;
  message?: string;
  data: T;
  errors?: string[];
  errorCode?: string;
};

export type OrderStatus =
  | 'CREATED'
  | 'DEPOSIT_PENDING'
  | 'DEPOSIT_PAID'
  | 'IN_PRODUCTION'
  | 'PRODUCTION_PARTIALLY_FAILED'
  | 'PRODUCTION_COMPLETED'
  | 'READY_FOR_DELIVERY'
  | 'DELIVERY_SCHEDULED'
  | 'DELIVERING'
  | 'DELIVERED'
  | 'FINAL_PAYMENT_PENDING'
  | 'COMPLETED'
  | 'CANCELLED';

export type OrderQuotationItemType = 'PRODUCT_ITEM' | 'MANUAL_ITEM';

export type OrderListItemDto = {
  orderId: string;
  projectId: string;
  quotationId: string;
  orderCode: string;
  originalTotalAmount: number;
  depositAmount?: number | null;
  paidAmount?: number | null;
  remainingAmount?: number | null;
  status?: OrderStatus | null;
  createdAt?: string | null;
};

export type OrderItemDto = {
  orderItemId: string;
  itemType?: OrderQuotationItemType | null;
  productNameSnapshot?: string | null;
  itemName?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  customizationAdditionalCost?: number | null;
  discountAmount?: number | null;
  subtotalAmount?: number | null;
  isCustomized?: boolean | null;
};

export type OrderDetailDto = {
  orderId: string;
  projectId: string;
  proposalId?: string | null;
  quotationId: string;
  orderCode: string;
  customerId: string;
  salesId?: string | null;
  originalTotalAmount: number;
  itemAdjustmentAmount?: number | null;
  additionalDiscountAmount?: number | null;
  finalTotalAmount: number;
  depositAmount?: number | null;
  paidAmount?: number | null;
  remainingAmount?: number | null;
  status?: OrderStatus | null;
  items: OrderItemDto[];
};

export type OrderListResponseDto = {
  items: OrderListItemDto[];
};

export type CreateOrderPaymentInput = {
  orderId: string;
  expiredAt?: string | null;
  note?: string | null;
};

export function getOrderServiceResultMessage(error: unknown) {
  const result = getOrderServiceResultFromError(error);

  if (!result) {
    return 'Cannot connect to order API. Please check backend and VITE_API_URL.';
  }

  if (result.errors?.length) {
    return result.errors.join('\n');
  }

  return result.message || 'Request failed. Please try again.';
}

export function getOrderServiceResultFromError(error: unknown) {
  if (!(error instanceof AxiosError)) {
    return null;
  }

  const data = error.response?.data;

  if (data && typeof data === 'object' && 'status' in data) {
    return data as ServiceResult<unknown>;
  }

  return null;
}

export async function getProjectOrders(projectId: string) {
  const response = await orderApiClient.get<ServiceResult<OrderListResponseDto>>(`/projects/${projectId}/orders`);

  return response.data.data;
}

export async function getOrderById(orderId: string) {
  const response = await orderApiClient.get<ServiceResult<OrderDetailDto>>(`/orders/${orderId}`);

  return response.data.data;
}

export async function createOrderDepositPayment(input: CreateOrderPaymentInput) {
  const response = await orderApiClient.post<ServiceResult<PaymentDetailDto>>(`/orders/${input.orderId}/payments/deposit`, {
    expiredAt: input.expiredAt || null,
    note: input.note?.trim() || null,
  });

  return response.data.data;
}

export async function createOrderRemainingPayment(input: CreateOrderPaymentInput) {
  const response = await orderApiClient.post<ServiceResult<PaymentDetailDto>>(`/orders/${input.orderId}/payments/remaining`, {
    expiredAt: input.expiredAt || null,
    note: input.note?.trim() || null,
  });

  return response.data.data;
}

function getOrderApiBaseUrl() {
  const configuredApiUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;

  return configuredApiUrl?.replace(/\/api\/?$/, '');
}
