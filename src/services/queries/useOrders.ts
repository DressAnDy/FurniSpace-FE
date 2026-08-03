import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addOrderAdjustmentItem,
  completeOrder,
  confirmOrderAdjustment,
  confirmOrderItemDelivery,
  createOrderAdjustment,
  createOrderDepositPayment,
  createOrderRemainingPayment,
  deleteOrderAdjustmentItem,
  getOrderById,
  getProjectOrders,
  prepareOrderFinalPayment,
  startOrderDelivery,
  updateOrderFinancialAdjustment,
  updateOrderAdjustmentItem,
  updateOrderItemDeliveredQuantity,
  type CreateOrderAdjustmentInput,
  type CreateOrderPaymentInput,
  type OrderDetailDto,
  type OrderListItemDto,
  type UpdateDeliveredQuantityInput,
  type UpdateOrderFinancialAdjustmentInput,
  type UpsertOrderAdjustmentItemInput,
} from '@/services/api/orders';
import { paymentQueryKeys } from './usePayments';

export const orderQueryKeys = {
  all: ['orders'] as const,
  byProject: (projectId: string) => ['orders', 'project', projectId] as const,
  detail: (orderId: string) => ['orders', 'detail', orderId] as const,
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

export function useUpdateOrderFinancialAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateOrderFinancialAdjustmentInput) => updateOrderFinancialAdjustment(input),
    onSuccess: (order) => {
      void queryClient.invalidateQueries({ queryKey: orderQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: orderQueryKeys.detail(order.orderId) });
      void queryClient.invalidateQueries({ queryKey: orderQueryKeys.byProject(order.projectId) });
      void queryClient.invalidateQueries({ queryKey: ['projects', 'detail', order.projectId] });
    },
  });
}

export function useCreateOrderAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateOrderAdjustmentInput) => createOrderAdjustment(input),
    onSuccess: (adjustment) => {
      invalidateOrderPaymentCaches(queryClient, adjustment.orderId);
    },
  });
}

export function useAddOrderAdjustmentItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpsertOrderAdjustmentItemInput) => addOrderAdjustmentItem(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderQueryKeys.all });
    },
  });
}

export function useUpdateOrderAdjustmentItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpsertOrderAdjustmentItemInput) => updateOrderAdjustmentItem(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderQueryKeys.all });
    },
  });
}

export function useDeleteOrderAdjustmentItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderAdjustmentItemId: string) => deleteOrderAdjustmentItem(orderAdjustmentItemId),
    onSuccess: (adjustment) => {
      invalidateOrderPaymentCaches(queryClient, adjustment.orderId);
    },
  });
}

export function useConfirmOrderAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderAdjustmentId: string) => confirmOrderAdjustment(orderAdjustmentId),
    onSuccess: (adjustment) => {
      invalidateOrderPaymentCaches(queryClient, adjustment.orderId);
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

export function useUpdateOrderItemDeliveredQuantity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateDeliveredQuantityInput) => updateOrderItemDeliveredQuantity(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderQueryKeys.all });
    },
  });
}

export function useConfirmOrderItemDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderItemId: string) => confirmOrderItemDelivery(orderItemId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
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
