import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  assignProductionRequest,
  completeProductionRequest,
  createProductionRequest,
  getAvailableProductionStaff,
  getProductionRequestById,
  getProductionRequests,
  markProductionRequestFeasible,
  startProductionRequest,
  updateProductionItemStatus,
  type AssignProductionRequestInput,
  type AvailableProductionStaffParams,
  type CreateProductionRequestInput,
  type ProductionRequestListParams,
  type UpdateProductionItemStatusInput,
} from '@/services/api/production';
import { orderQueryKeys } from './useOrders';

export const productionQueryKeys = {
  all: ['production'] as const,
  requests: (params?: ProductionRequestListParams) => ['production', 'requests', params] as const,
  detail: (productionRequestId: string) => ['production', 'requests', 'detail', productionRequestId] as const,
  staff: (params?: AvailableProductionStaffParams) => ['production', 'staff', params] as const,
};

export function useProductionRequests(params?: ProductionRequestListParams) {
  return useQuery({
    queryKey: productionQueryKeys.requests(params),
    queryFn: () => getProductionRequests(params),
  });
}

export function useProductionRequestDetail(productionRequestId?: string) {
  return useQuery({
    queryKey: productionQueryKeys.detail(productionRequestId ?? ''),
    queryFn: () => getProductionRequestById(productionRequestId ?? ''),
    enabled: Boolean(productionRequestId),
  });
}

export function useAvailableProductionStaff(params?: AvailableProductionStaffParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: productionQueryKeys.staff(params),
    queryFn: () => getAvailableProductionStaff(params),
    enabled: options?.enabled ?? true,
  });
}

export function useCreateProductionRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProductionRequestInput) => createProductionRequest(input),
    onSuccess: (request, input) => {
      invalidateProductionCaches(queryClient, request.productionRequestId, input.orderId, request.projectId);
    },
  });
}

export function useAssignProductionRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AssignProductionRequestInput) => assignProductionRequest(input),
    onSuccess: (result) => {
      invalidateProductionCaches(queryClient, result.productionRequestId);
    },
  });
}

export function useMarkProductionRequestFeasible() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { productionRequestId: string; note?: string | null }) =>
      markProductionRequestFeasible(input.productionRequestId, input.note),
    onSuccess: (result) => {
      invalidateProductionCaches(queryClient, result.productionRequestId);
    },
  });
}

export function useStartProductionRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { productionRequestId: string; actualStartDate?: string | null }) =>
      startProductionRequest(input.productionRequestId, input.actualStartDate),
    onSuccess: (result) => {
      invalidateProductionCaches(queryClient, result.productionRequestId);
    },
  });
}

export function useCompleteProductionRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productionRequestId: string) => completeProductionRequest(productionRequestId),
    onSuccess: (result) => {
      invalidateProductionCaches(queryClient, result.productionRequestId);
    },
  });
}

export function useUpdateProductionItemStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProductionItemStatusInput) => updateProductionItemStatus(input),
    onSuccess: (item) => {
      invalidateProductionCaches(queryClient, item.productionRequestId);
    },
  });
}

function invalidateProductionCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  productionRequestId?: string | null,
  orderId?: string | null,
  projectId?: string | null,
) {
  void queryClient.invalidateQueries({ queryKey: productionQueryKeys.all });

  if (productionRequestId) {
    void queryClient.invalidateQueries({ queryKey: productionQueryKeys.detail(productionRequestId) });
  }

  if (orderId) {
    void queryClient.invalidateQueries({ queryKey: orderQueryKeys.detail(orderId) });
  }

  if (projectId) {
    void queryClient.invalidateQueries({ queryKey: orderQueryKeys.byProject(projectId) });
    void queryClient.invalidateQueries({ queryKey: ['projects', 'detail', projectId] });
  }
}
