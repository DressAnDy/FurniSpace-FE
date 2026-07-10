import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createOrderDepositPayment,
  createOrderRemainingPayment,
  getOrderById,
  getProjectOrders,
  type CreateOrderPaymentInput,
  type OrderDetailDto,
  type OrderListItemDto,
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
