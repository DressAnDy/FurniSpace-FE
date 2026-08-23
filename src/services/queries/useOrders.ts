import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  completeOrder,
  completeOrderDeliveryBatch,
  completeOrderDelivery,
  confirmOrderDelivery,
  createOrderDeliveryBatch,
  createOrderDepositPayment,
  createOrderRemainingPayment,
  getOrderDeliveries,
  getOrderDeliveryById,
  getOrderDeliveryTracking,
  getOrderById,
  getProjectOrders,
  prepareOrderFinalPayment,
  startOrderDelivery,
  type CreateDeliveryBatchInput,
  type CreateOrderPaymentInput,
  type OrderDetailDto,
  type OrderListItemDto,
} from '@/services/api/orders';
import { paymentQueryKeys } from './usePayments';

export const orderQueryKeys = {
  all: ['orders'] as const,
  byProject: (projectId: string) => ['orders', 'project', projectId] as const,
  detail: (orderId: string) => ['orders', 'detail', orderId] as const,
  deliveries: (orderId: string) => ['orders', 'deliveries', orderId] as const,
  delivery: (orderId: string, deliveryId: string) => ['orders', 'deliveries', orderId, deliveryId] as const,
  deliveryTracking: (orderId: string) => ['orders', 'delivery-tracking', orderId] as const,
};

export function useProjectOrders(projectId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: orderQueryKeys.byProject(projectId ?? ''),
    queryFn: () => getProjectOrders(projectId ?? ''),
    enabled: Boolean(projectId) && (options?.enabled ?? true),
  });
}

export function useOrderDetail(orderId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: orderQueryKeys.detail(orderId ?? ''),
    queryFn: () => getOrderById(orderId ?? ''),
    enabled: Boolean(orderId) && (options?.enabled ?? true),
  });
}

export function useOrderDeliveryTracking(orderId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: orderQueryKeys.deliveryTracking(orderId ?? ''),
    queryFn: () => getOrderDeliveryTracking(orderId ?? ''),
    enabled: Boolean(orderId) && (options?.enabled ?? true),
  });
}

export function useOrderDeliveries(orderId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: orderQueryKeys.deliveries(orderId ?? ''),
    queryFn: () => getOrderDeliveries(orderId ?? ''),
    enabled: Boolean(orderId) && (options?.enabled ?? true),
  });
}

export function useOrderDeliveryDetail(orderId?: string, deliveryId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: orderQueryKeys.delivery(orderId ?? '', deliveryId ?? ''),
    queryFn: () => getOrderDeliveryById(orderId ?? '', deliveryId ?? ''),
    enabled: Boolean(orderId && deliveryId) && (options?.enabled ?? true),
  });
}

export function useCreateOrderDepositPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateOrderPaymentInput) => createOrderDepositPayment(input),
    onSuccess: (payment, input) => {
      invalidateOrderPaymentCaches(queryClient, input.orderId, payment.projectId);
      void queryClient.invalidateQueries({ queryKey: paymentQueryKeys.detail(payment.paymentId) });
    },
  });
}

export function useCreateOrderRemainingPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateOrderPaymentInput) => createOrderRemainingPayment(input),
    onSuccess: (payment, input) => {
      invalidateOrderPaymentCaches(queryClient, input.orderId, payment.projectId);
      void queryClient.invalidateQueries({ queryKey: paymentQueryKeys.detail(payment.paymentId) });
    },
  });
}

export function useStartOrderDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => startOrderDelivery(orderId),
    onSuccess: (result) => {
      invalidateOrderPaymentCaches(queryClient, result.orderId, result.projectId);
    },
  });
}

export function useCompleteOrderDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => completeOrderDelivery(orderId),
    onSuccess: (result) => invalidateOrderPaymentCaches(queryClient, result.orderId, result.projectId),
  });
}

export function useConfirmOrderDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => confirmOrderDelivery(orderId),
    onSuccess: (result) => {
      invalidateOrderPaymentCaches(queryClient, result.orderId, result.projectId);
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useCreateOrderDeliveryBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDeliveryBatchInput) => createOrderDeliveryBatch(input),
    onSuccess: (delivery, input) => {
      invalidateOrderDeliveryCaches(queryClient, input.orderId, delivery.projectScheduleId);
    },
  });
}

export function useCompleteOrderDeliveryBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { deliveryId: string; orderId: string }) => completeOrderDeliveryBatch(input),
    onSuccess: (delivery, input) => {
      invalidateOrderDeliveryCaches(queryClient, input.orderId, delivery.projectScheduleId);
    },
  });
}

export function usePrepareOrderFinalPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => prepareOrderFinalPayment(orderId),
    onSuccess: (result) => {
      invalidateOrderPaymentCaches(queryClient, result.orderId);
    },
  });
}

export function useCompleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => completeOrder(orderId),
    onSuccess: (result) => {
      invalidateOrderPaymentCaches(queryClient, result.orderId, result.projectId);
    },
  });
}

export function upsertOrderListItem(
  current: { items: OrderListItemDto[] } | undefined,
  order: OrderDetailDto,
): { items: OrderListItemDto[] } | undefined {
  if (!current) return current;

  return {
    ...current,
    items: current.items.map((item) =>
      item.orderId === order.orderId
        ? {
            ...item,
            originalTotalAmount: order.originalTotalAmount,
            depositAmount: order.depositAmount,
            paidAmount: order.paidAmount,
            remainingAmount: order.remainingAmount,
            status: order.status,
          }
        : item,
    ),
  };
}

function invalidateOrderPaymentCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  orderId: string,
  projectId?: string | null,
) {
  void queryClient.invalidateQueries({ queryKey: orderQueryKeys.all });
  void queryClient.invalidateQueries({ queryKey: orderQueryKeys.detail(orderId) });
  void queryClient.invalidateQueries({ queryKey: paymentQueryKeys.all });

  if (projectId) {
    void queryClient.invalidateQueries({ queryKey: orderQueryKeys.byProject(projectId) });
    void queryClient.invalidateQueries({ queryKey: ['projects', 'detail', projectId] });
  }
}

function invalidateOrderDeliveryCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  orderId: string,
  projectScheduleId?: string | null,
) {
  void queryClient.invalidateQueries({ queryKey: orderQueryKeys.all });
  void queryClient.invalidateQueries({ queryKey: orderQueryKeys.detail(orderId) });
  void queryClient.invalidateQueries({ queryKey: orderQueryKeys.deliveries(orderId) });
  void queryClient.invalidateQueries({ queryKey: orderQueryKeys.deliveryTracking(orderId) });
  void queryClient.invalidateQueries({ queryKey: ['project-schedules'] });
  void queryClient.invalidateQueries({ queryKey: ['projects'] });

  if (projectScheduleId) {
    void queryClient.invalidateQueries({ queryKey: ['project-schedules', 'detail', projectScheduleId] });
  }
}
