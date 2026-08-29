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
  errors?: Array<string | { code?: string; message?: string; field?: string }>;
  errorCode?: string;
};

const ORDER_ERROR_MESSAGES: Record<string, string> = {
  ORDER_DELIVERY_DETAILS_REQUIRED: 'Please complete delivery address and receiver information before creating the deposit payment.',
  ORDER_DELIVERY_DETAILS_INVALID: 'Please complete delivery address, receiver name, and receiver phone before continuing.',
  ORDER_DELIVERY_DETAILS_LOCKED: 'Delivery details are locked after deposit payment is confirmed.',
  DELIVERY_DETAILS_REQUIRED: 'Please complete delivery address and receiver information before creating the deposit payment.',
  DELIVERY_DETAILS_INCOMPLETE: 'Please complete delivery address, receiver name, and receiver phone before continuing.',
  DELIVERY_DETAILS_LOCKED: 'Delivery details are locked after deposit payment is confirmed.',
  PRODUCTION_NOT_COMPLETED: 'Production must be completed before delivery can continue.',
  PROJECT_SCHEDULE_ID_REQUIRED: 'Please select a confirmed delivery schedule before creating a delivery batch.',
  DELIVERY_BATCH_EMPTY: 'Please select at least one product to deliver.',
  DELIVERY_SCHEDULE_INVALID: 'This delivery schedule cannot be used for this order.',
  DELIVERY_SCHEDULE_NOT_CONFIRMED: 'The customer must confirm this delivery schedule first.',
  DELIVERY_SCHEDULE_ALREADY_USED: 'This delivery schedule already has a delivery batch.',
  DUPLICATE_ORDER_ITEM_IN_BATCH: 'Each product can only appear once in the same delivery batch.',
  ORDER_ITEM_NOT_DELIVERABLE: 'One or more selected products cannot be delivered yet.',
  ORDER_NOT_DELIVERING: 'This order is not currently delivering.',
  DELIVERY_NOT_FOUND: 'Delivery batch was not found.',
  DELIVERY_NOT_IN_PROGRESS: 'This delivery batch is no longer in progress.',
  DELIVERY_BATCH_IN_PROGRESS: 'A delivery batch is still in progress.',
  UNRESOLVED_DELIVERY_SCHEDULE: 'There is still a confirmed delivery schedule that has not been delivered.',
  INVALID_DELIVERY_QUANTITY: 'Delivery quantity cannot exceed the remaining quantity.',
  ORDER_NOT_AWAITING_CUSTOMER_CONFIRMATION: 'This order is not ready for final customer delivery confirmation yet.',
  DELIVERABLE_ITEMS_NOT_PHYSICALLY_DELIVERED: 'All deliverable items must be physically delivered before final confirmation.',
  DELIVERABLE_ITEMS_NOT_DELIVERED: 'All deliverable items must be physically delivered before final confirmation.',
  REMAINING_PAYMENT_NOT_PAID: 'Remaining payment must be paid before the order can be completed.',
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
  | 'AWAITING_CUSTOMER_CONFIRMATION'
  | 'DELIVERED'
  | 'FINAL_PAYMENT_PENDING'
  | 'COMPLETED'
  | 'CANCELLED';

export type OrderItemStatus =
  | 'PENDING'
  | 'IN_PRODUCTION'
  | 'READY'
  | 'COMPLETED'
  | 'PARTIALLY_DELIVERED'
  | 'PHYSICALLY_DELIVERED'
  | 'UNAVAILABLE'
  | 'DELIVERING'
  | 'DELIVERED'
  | 'CANCELLED';

export type DeliveryStatus = 'IN_PROGRESS' | 'COMPLETED';
export type DeliveryTrackingItemStatus = 'READY' | 'PENDING' | 'PARTIALLY_DELIVERED' | 'PHYSICALLY_DELIVERED' | 'DELIVERED' | 'CANCELLED' | 'UNAVAILABLE';
export type DeliveryScheduleStatus = 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

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
  deliveryAddress?: string | null;
  receiverName?: string | null;
  receiverPhone?: string | null;
  deliveryNote?: string | null;
  deliveryDetails?: OrderDeliveryDetailsDto | null;
  createdAt?: string | null;
};

export type OrderDeliveryDetailsDto = {
  deliveryAddress?: string | null;
  receiverName?: string | null;
  receiverPhone?: string | null;
  deliveryNote?: string | null;
};

export type OrderItemDto = {
  orderItemId: string;
  orderId?: string | null;
  quotationItemId?: string | null;
  productVersionId?: string | null;
  productNameSnapshot?: string | null;
  productVersionNameSnapshot?: string | null;
  productVersionCodeSnapshot?: string | null;
  itemName?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  discountAmount?: number | null;
  subtotalAmount?: number | null;
  adjustmentAmount?: number | null;
  unavailableReason?: string | null;
  isCustomized?: boolean | null;
  status?: OrderItemStatus | null;
  deliveredAt?: string | null;
  deliveredBy?: string | null;
  deliveredQuantity?: number | null;
  remainingDeliveryQuantity?: number | null;
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
  vatRate?: number | null;
  vatAmount?: number | null;
  itemAdjustmentAmount?: number | null;
  additionalDiscountAmount?: number | null;
  finalTotalAmount: number;
  depositAmount?: number | null;
  paidAmount?: number | null;
  remainingAmount?: number | null;
  status?: OrderStatus | null;
  customerConfirmedDeliveryAt?: string | null;
  deliveryAddress?: string | null;
  receiverName?: string | null;
  receiverPhone?: string | null;
  deliveryNote?: string | null;
  deliveryDetails?: OrderDeliveryDetailsDto | null;
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

export type UpdateOrderDeliveryDetailsInput = {
  orderId: string;
  deliveryAddress: string;
  receiverName: string;
  receiverPhone: string;
  deliveryNote?: string | null;
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

export type OrderDeliveryCompletionDto = {
  orderId: string;
  projectId: string;
  orderStatus: OrderStatus;
  deliveredItemCount: number;
  updatedAt?: string | null;
};

export type OrderDeliveryConfirmationDto = {
  orderId: string;
  projectId: string;
  orderStatus: OrderStatus;
  projectStatus: string;
  customerConfirmedDeliveryAt?: string | null;
};

export type CompleteOrderResultDto = {
  orderId: string;
  orderStatus: OrderStatus;
  projectId: string;
  projectStatus: string;
  completedAt?: string | null;
};

export type DeliveryBatchScheduleDto = {
  projectScheduleId: string;
  scheduledStart: string;
  scheduledEnd?: string | null;
  completedAt?: string | null;
  status: DeliveryScheduleStatus;
  assignedStaffId?: string | null;
};

export type DeliveryBatchItemDto = {
  deliveryItemId?: string | null;
  deliveryId?: string | null;
  orderItemId: string;
  productName?: string | null;
  productNameSnapshot?: string | null;
  itemName?: string | null;
  deliveredQuantity?: number | null;
  quantity?: number | null;
  note?: string | null;
};

export type DeliveryBatchDto = {
  deliveryId: string;
  orderId: string;
  projectScheduleId?: string | null;
  schedule?: DeliveryBatchScheduleDto | null;
  status: DeliveryStatus;
  createdBy?: string | null;
  completedBy?: string | null;
  note?: string | null;
  itemCount?: number | null;
  items: DeliveryBatchItemDto[];
  createdAt?: string | null;
  completedAt?: string | null;
};

export type DeliveryBatchListData = {
  items: DeliveryBatchDto[];
};

export type CreateDeliveryBatchInput = {
  orderId: string;
  projectScheduleId: string;
  note?: string | null;
  items: {
    orderItemId: string;
    quantity: number;
    note?: string | null;
  }[];
};

export type DeliveryTrackingSummaryDto = {
  totalOrderedQuantity: number;
  totalDeliveredQuantity: number;
  remainingQuantity: number;
  deliveryProgressPercent: number;
  completedDeliveryCount: number;
  upcomingDeliveryCount: number;
  nextDeliveryAt?: string | null;
};

export type DeliveryTrackingItemDto = {
  orderItemId: string;
  productName?: string | null;
  orderedQuantity: number;
  deliveredQuantity: number;
  remainingQuantity: number;
  status?: DeliveryTrackingItemStatus | null;
};

export type DeliveryTrackingTimelineItemDto = {
  projectScheduleId?: string | null;
  deliveryId?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  scheduleStatus?: DeliveryScheduleStatus | null;
  deliveryStatus?: DeliveryStatus | null;
  completedAt?: string | null;
  cancelReason?: string | null;
  location?: string | null;
  assignedStaffId?: string | null;
  customerNote?: string | null;
  items?: DeliveryBatchItemDto[];
};

export type DeliveryTrackingDto = {
  orderId: string;
  orderStatus?: OrderStatus | null;
  projectStatus?: string | null;
  customerConfirmedDeliveryAt?: string | null;
  deliveryDetails?: OrderDeliveryDetailsDto | null;
  summary: DeliveryTrackingSummaryDto;
  items: DeliveryTrackingItemDto[];
  timeline: DeliveryTrackingTimelineItemDto[];
};

export function getOrderServiceResultMessage(error: unknown) {
  const result = getOrderServiceResultFromError(error);

  if (!result) {
    return 'Cannot connect to order API. Please check backend and VITE_API_URL.';
  }

  const errorCode = getFirstServiceErrorCode(result);

  if (errorCode && ORDER_ERROR_MESSAGES[errorCode]) {
    return ORDER_ERROR_MESSAGES[errorCode];
  }

  const errorMessages = getServiceErrorMessages(result);

  if (errorMessages.length) {
    return errorMessages.join('\n');
  }

  if (result.errorCode && ORDER_ERROR_MESSAGES[result.errorCode]) {
    return ORDER_ERROR_MESSAGES[result.errorCode];
  }

  return result.message || 'Request failed. Please try again.';
}

export function getOrderServiceResultFromError(error: unknown) {
  if (!(error instanceof AxiosError)) {
    return null;
  }

  const data = error.response?.data;

  if (data && typeof data === 'object' && 'status' in data) {
    const result = data as ServiceResult<unknown> & {
      detail?: string;
      title?: string;
    };

    return {
      ...result,
      status: error.response?.status ?? result.status ?? 500,
      message: result.message ?? result.detail ?? result.title,
    };
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

/** @deprecated Legacy admin recovery endpoint. Normal FE delivery flow must use schedule-based delivery batches. */
export async function startOrderDelivery(orderId: string) {
  const response = await orderApiClient.patch<ServiceResult<OrderDeliveryTransitionResultDto>>(`/orders/${orderId}/start-delivery`);

  return response.data.data;
}

/** @deprecated Legacy admin recovery endpoint. Normal FE delivery flow must complete individual delivery batches. */
export async function completeOrderDelivery(orderId: string) {
  const response = await orderApiClient.patch<ServiceResult<OrderDeliveryCompletionDto>>(`/orders/${orderId}/complete-delivery`);

  return response.data.data;
}

function getFirstServiceErrorCode(result: ServiceResult<unknown>) {
  const objectError = result.errors?.find((item): item is { code?: string } => typeof item === 'object' && item !== null && Boolean(item.code));

  return objectError?.code ?? result.errorCode;
}

function getServiceErrorMessages(result: ServiceResult<unknown>) {
  return (result.errors ?? [])
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item.code && ORDER_ERROR_MESSAGES[item.code]) return ORDER_ERROR_MESSAGES[item.code];
      return item.message ?? item.code ?? null;
    })
    .filter((message): message is string => Boolean(message));
}

export async function confirmOrderDelivery(orderId: string) {
  const response = await orderApiClient.patch<ServiceResult<OrderDeliveryConfirmationDto>>(`/orders/${orderId}/confirm-delivery`);

  return response.data.data;
}

export async function getOrderDeliveryTracking(orderId: string) {
  const response = await orderApiClient.get<ServiceResult<DeliveryTrackingDto>>(`/orders/${orderId}/delivery-tracking`);

  return response.data.data;
}

export async function updateOrderDeliveryDetails(input: UpdateOrderDeliveryDetailsInput) {
  const response = await orderApiClient.patch<ServiceResult<OrderDetailDto>>(`/orders/${input.orderId}/delivery-details`, {
    deliveryAddress: input.deliveryAddress.trim(),
    receiverName: input.receiverName.trim(),
    receiverPhone: input.receiverPhone.trim(),
    deliveryNote: input.deliveryNote?.trim() || null,
  });

  return response.data.data;
}

export async function getOrderDeliveries(orderId: string) {
  const response = await orderApiClient.get<ServiceResult<DeliveryBatchListData>>(`/orders/${orderId}/deliveries`);

  return response.data.data;
}

export async function getOrderDeliveryById(orderId: string, deliveryId: string) {
  const response = await orderApiClient.get<ServiceResult<DeliveryBatchDto>>(`/orders/${orderId}/deliveries/${deliveryId}`);

  return response.data.data;
}

export async function createOrderDeliveryBatch(input: CreateDeliveryBatchInput) {
  const response = await orderApiClient.post<ServiceResult<DeliveryBatchDto>>(`/orders/${input.orderId}/deliveries`, {
    projectScheduleId: input.projectScheduleId,
    note: input.note?.trim() || null,
    items: input.items.map((item) => ({
      orderItemId: item.orderItemId,
      quantity: item.quantity,
      note: item.note?.trim() || null,
    })),
  });

  return response.data.data;
}

export async function completeOrderDeliveryBatch(input: { deliveryId: string; orderId: string }) {
  const response = await orderApiClient.patch<ServiceResult<DeliveryBatchDto>>(`/orders/${input.orderId}/deliveries/${input.deliveryId}/complete`);

  return response.data.data;
}

/** @deprecated Legacy admin recovery endpoint. Customer final delivery confirmation now prepares remaining payment when needed. */
export async function prepareOrderFinalPayment(orderId: string) {
  const response = await orderApiClient.patch<ServiceResult<PrepareFinalPaymentResultDto>>(`/orders/${orderId}/prepare-final-payment`);

  return response.data.data;
}

export async function completeOrder(orderId: string) {
  const response = await orderApiClient.patch<ServiceResult<CompleteOrderResultDto>>(`/orders/${orderId}/complete`);

  return response.data.data;
}

function getOrderApiBaseUrl() {
  const configuredApiUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;

  return configuredApiUrl?.replace(/\/api\/?$/, '');
}
