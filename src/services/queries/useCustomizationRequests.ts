import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  cancelCustomizationRequest,
  customerDecisionCustomizationRequest,
  designerReviewCustomizationRequest,
  getCustomizationRequestById,
  getProductionCustomizationRequests,
  getProjectCustomizationRequests,
  productionReviewCustomizationRequest,
  submitCustomizationRequest,
  type CancelCustomizationRequestInput,
  type CustomerDecisionCustomizationRequestInput,
  type CustomizationRequestListParams,
  type DesignerReviewCustomizationRequestInput,
  type ProductionCustomizationRequestListParams,
  type ProductionReviewCustomizationRequestInput,
  type SubmitCustomizationRequestInput,
} from '@/services/api/customizationRequests';

export const customizationRequestQueryKeys = {
  all: ['customization-requests'] as const,
  byProject: (params: CustomizationRequestListParams) => ['customization-requests', 'project', params] as const,
  detail: (customizationRequestId: string) => ['customization-requests', 'detail', customizationRequestId] as const,
  productionQueue: (params: ProductionCustomizationRequestListParams) => ['customization-requests', 'production-queue', params] as const,
};

export function useProjectCustomizationRequests(params?: CustomizationRequestListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: customizationRequestQueryKeys.byProject(params ?? { projectId: '' }),
    queryFn: () => getProjectCustomizationRequests(params as CustomizationRequestListParams),
    enabled: Boolean(params?.projectId) && (options?.enabled ?? true),
  });
}

export function useCustomizationRequestDetail(customizationRequestId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: customizationRequestQueryKeys.detail(customizationRequestId ?? ''),
    queryFn: () => getCustomizationRequestById(customizationRequestId ?? ''),
    enabled: Boolean(customizationRequestId) && (options?.enabled ?? true),
  });
}

export function useProductionCustomizationRequests(params?: ProductionCustomizationRequestListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: customizationRequestQueryKeys.productionQueue(params ?? {}),
    queryFn: () => getProductionCustomizationRequests(params),
    enabled: options?.enabled ?? true,
  });
}

export function useSubmitCustomizationRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SubmitCustomizationRequestInput) => submitCustomizationRequest(input),
    onSuccess: (request) => {
      invalidateCustomizationCaches(queryClient, request);
    },
  });
}

export function useDesignerReviewCustomizationRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DesignerReviewCustomizationRequestInput) => designerReviewCustomizationRequest(input),
    onSuccess: (request) => {
      invalidateCustomizationCaches(queryClient, request);
    },
  });
}

export function useProductionReviewCustomizationRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProductionReviewCustomizationRequestInput) => productionReviewCustomizationRequest(input),
    onSuccess: (request) => {
      invalidateCustomizationCaches(queryClient, request);
    },
  });
}

export function useCustomerDecisionCustomizationRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CustomerDecisionCustomizationRequestInput) => customerDecisionCustomizationRequest(input),
    onSuccess: (request) => {
      invalidateCustomizationCaches(queryClient, request);
      void queryClient.invalidateQueries({ queryKey: ['proposals', request.proposalId, 'items'] });
      void queryClient.invalidateQueries({ queryKey: ['proposals', 'detail', request.proposalId] });
    },
  });
}

export function useCancelCustomizationRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CancelCustomizationRequestInput) => cancelCustomizationRequest(input),
    onSuccess: (request) => {
      invalidateCustomizationCaches(queryClient, request);
    },
  });
}

function invalidateCustomizationCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  request: { customizationRequestId: string; projectId: string; proposalId: string },
) {
  void queryClient.invalidateQueries({ queryKey: customizationRequestQueryKeys.all });
  void queryClient.invalidateQueries({ queryKey: customizationRequestQueryKeys.detail(request.customizationRequestId) });
  void queryClient.invalidateQueries({ queryKey: ['customization-requests', 'project'] });
  void queryClient.invalidateQueries({ queryKey: ['projects', 'detail', request.projectId] });
  void queryClient.invalidateQueries({ queryKey: ['proposals', 'detail', request.proposalId] });
  void queryClient.invalidateQueries({ queryKey: ['notifications'] });
}
