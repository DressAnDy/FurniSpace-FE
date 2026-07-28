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
export type OrderItemStatus =
  | 'PENDING'
  | 'IN_PRODUCTION'
  | 'READY'
  | 'COMPLETED'
  | 'UNAVAILABLE'
  | 'DELIVERING'
  | 'DELIVERED'
  | 'CANCELLED';
export type OrderAdjustmentStatus = 'DRAFT' | 'CONFIRMED' | 'APPLIED' | 'CANCELLED';
export type OrderAdjustmentItemType = 'UNAVAILABLE_ITEM' | 'ADDITIONAL_DISCOUNT';

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
  status?: OrderItemStatus | null;
  deliveredQuantity?: number | null;
  deliveryNote?: string | null;
  lastDeliveredAt?: string | null;
  lastDeliveredBy?: string | null;
  customerConfirmedAt?: string | null;
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

export type UpdateOrderFinancialAdjustmentInput = {
  orderId: string;
  additionalDiscountAmount: number;
  depositAmount: number;
  adjustmentNote?: string | null;
};

export type CreateOrderAdjustmentInput = {
  orderId: string;
  reason: string;
  internalNote?: string | null;
};

export type OrderAdjustmentDto = {
  orderAdjustmentId: string;
  orderId: string;
  status: OrderAdjustmentStatus;
  reason?: string | null;
  internalNote?: string | null;
  itemAdjustmentAmount: number;
  additionalDiscountAmount: number;
  totalAdjustmentAmount: number;
  confirmedBy?: string | null;
  confirmedAt?: string | null;
  items?: OrderAdjustmentItemDto[] | null;
};

export type OrderAdjustmentItemDto = {
  orderAdjustmentItemId: string;
  orderAdjustmentId: string;
  orderItemId?: string | null;
  adjustmentType: OrderAdjustmentItemType;
  previousItemAmount: number;
  adjustmentAmount: number;
  reason: string;
};

export type UpsertOrderAdjustmentItemInput = {
  orderAdjustmentId?: string;
  orderAdjustmentItemId?: string;
  adjustmentType: OrderAdjustmentItemType;
  orderItemId?: string | null;
  adjustmentAmount: number;
  reason: string;
};

export type PrepareFinalPaymentResultDto = {
  orderId: string;
  status: OrderStatus;
  finalTotalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  requiresRemainingPayment: boolean;
};

export type OrderDeliveryTransitionResultDto = {
  orderId: string;
  projectId: string;
  orderStatus: OrderStatus;
  projectStatus: string;
  updatedAt: string;
};

export type UpdateDeliveredQuantityInput = {
  orderItemId: string;
  deliveredQuantityIncrement: number;
  deliveryNote?: string | null;
};

export type DeliveredQuantityResultDto = {
  orderItemId: string;
  quantity: number;
  deliveredQuantity: number;
  lastDeliveredAt?: string | null;
  lastDeliveredBy?: string | null;
};

export type ConfirmDeliveryResultDto = {
  orderItemId: string;
  status: OrderItemStatus;
  customerConfirmedAt?: string | null;
  orderStatus: OrderStatus;
};

export type CompleteOrderResultDto = {
  orderId: string;
  orderStatus: OrderStatus;
  projectId: string;
  projectStatus: string;
  completedAt?: string | null;
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

export async function updateOrderFinancialAdjustment(input: UpdateOrderFinancialAdjustmentInput) {
  const response = await orderApiClient.patch<ServiceResult<OrderDetailDto>>(`/orders/${input.orderId}/financial-adjustment`, {
    additionalDiscountAmount: input.additionalDiscountAmount,
    depositAmount: input.depositAmount,
    adjustmentNote: input.adjustmentNote?.trim() || null,
  });

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

export async function createOrderAdjustment(input: CreateOrderAdjustmentInput) {
  const response = await orderApiClient.post<ServiceResult<OrderAdjustmentDto>>(`/orders/${input.orderId}/adjustments`, {
    reason: input.reason.trim(),
    internalNote: input.internalNote?.trim() || null,
  });

  return response.data.data;
}

export async function addOrderAdjustmentItem(input: UpsertOrderAdjustmentItemInput) {
  const response = await orderApiClient.post<ServiceResult<OrderAdjustmentItemDto>>(
    `/order-adjustments/${input.orderAdjustmentId}/items`,
    getOrderAdjustmentItemPayload(input),
  );

  return response.data.data;
}

export async function updateOrderAdjustmentItem(input: UpsertOrderAdjustmentItemInput) {
  const response = await orderApiClient.patch<ServiceResult<OrderAdjustmentItemDto>>(
    `/order-adjustment-items/${input.orderAdjustmentItemId}`,
    getOrderAdjustmentItemPayload(input),
  );

  return response.data.data;
}

export async function deleteOrderAdjustmentItem(orderAdjustmentItemId: string) {
  const response = await orderApiClient.delete<ServiceResult<OrderAdjustmentDto>>(`/order-adjustment-items/${orderAdjustmentItemId}`);

  return response.data.data;
}

export async function confirmOrderAdjustment(orderAdjustmentId: string) {
  const response = await orderApiClient.patch<ServiceResult<OrderAdjustmentDto>>(`/order-adjustments/${orderAdjustmentId}/confirm`);

  return response.data.data;
}

export async function startOrderDelivery(orderId: string) {
  const response = await orderApiClient.patch<ServiceResult<OrderDeliveryTransitionResultDto>>(`/orders/${orderId}/start-delivery`);

  return response.data.data;
}

export async function updateOrderItemDeliveredQuantity(input: UpdateDeliveredQuantityInput) {
  const response = await orderApiClient.patch<ServiceResult<DeliveredQuantityResultDto>>(
    `/order-items/${input.orderItemId}/delivered-quantity`,
    {
      deliveredQuantityIncrement: input.deliveredQuantityIncrement,
      deliveryNote: input.deliveryNote?.trim() || null,
    },
  );

  return response.data.data;
}

export async function confirmOrderItemDelivery(orderItemId: string) {
  const response = await orderApiClient.patch<ServiceResult<ConfirmDeliveryResultDto>>(`/order-items/${orderItemId}/confirm-delivery`);

  return response.data.data;
}

export async function prepareOrderFinalPayment(orderId: string) {
  const response = await orderApiClient.patch<ServiceResult<PrepareFinalPaymentResultDto>>(`/orders/${orderId}/prepare-final-payment`);

  return response.data.data;
}

export async function completeOrder(orderId: string) {
  const response = await orderApiClient.patch<ServiceResult<CompleteOrderResultDto>>(`/orders/${orderId}/complete`);

  return response.data.data;
}

function getOrderAdjustmentItemPayload(input: UpsertOrderAdjustmentItemInput) {
  return {
    adjustmentType: input.adjustmentType,
    orderItemId: input.orderItemId || null,
    adjustmentAmount: input.adjustmentAmount,
    reason: input.reason.trim(),
  };
}

function getOrderApiBaseUrl() {
  const configuredApiUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;

  return configuredApiUrl?.replace(/\/api\/?$/, '');
}
