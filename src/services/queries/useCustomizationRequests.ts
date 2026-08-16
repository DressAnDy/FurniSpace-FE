import { useMutation, useQueries, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';

import {
  acceptCustomizationRequestVersion,
  cancelCustomizationRequest,
  createCustomizationRequestVersion,
  getCustomizationRequestById,
  getProductionCustomizationVersions,
  getProjectCustomizationRequests,
  productionReviewCustomizationVersion,
  submitCustomizationRequest,
  submitCustomizationRequestVersionForReview,
  updateCustomizationRequestVersion,
  withdrawCustomizationRequestVersion,
  type AcceptCustomizationRequestVersionInput,
  type CancelCustomizationRequestInput,
  type CreateCustomizationRequestVersionInput,
  type CustomizationRequestListParams,
  type CustomizationVersionStatus,
  type ProductionCustomizationVersionListData,
  type ProductionCustomizationVersionListParams,
  type ProductionCustomizationVersionQueueItemDto,
  type ProductionFeasibilityStatus,
  type ProductionReviewCustomizationVersionInput,
  type SubmitCustomizationRequestInput,
  type SubmitCustomizationRequestVersionForReviewInput,
  type UpdateCustomizationRequestVersionInput,
  type WithdrawCustomizationRequestVersionInput,
} from '@/services/api/customizationRequests';

const PRODUCTION_QUEUE_PAGE_SIZE = 50;

const productionQueueStatuses: CustomizationVersionStatus[] = ['REVIEWING', 'PRODUCTION_REJECTED', 'ACCEPTED'];
const productionQueueFeasibilityStatuses: ProductionFeasibilityStatus[] = ['PENDING', 'FEASIBLE', 'NOT_FEASIBLE'];

// The queue endpoint does not treat an omitted Status/FeasibilityStatus as "any",
// so every supported combination has to be requested explicitly and merged here.
const productionQueueParams: ProductionCustomizationVersionListParams[] = productionQueueStatuses.flatMap((status) =>
  productionQueueFeasibilityStatuses.map((feasibilityStatus) => ({
    status,
    feasibilityStatus,
    page: 1,
    pageSize: PRODUCTION_QUEUE_PAGE_SIZE,
  })),
);

function combineProductionQueueResults(results: Array<UseQueryResult<ProductionCustomizationVersionListData>>) {
  const itemsByVersionId = new Map<string, ProductionCustomizationVersionQueueItemDto>();

  for (const result of results) {
    for (const item of result.data?.items ?? []) {
      itemsByVersionId.set(item.version.customizationRequestVersionId, item);
    }
  }

  return {
    error: results.find((result) => result.isError)?.error ?? null,
    isError: results.some((result) => result.isError),
    isFetching: results.some((result) => result.isFetching),
    isLoading: results.some((result) => result.isLoading),
    items: Array.from(itemsByVersionId.values()),
  };
}

export const customizationRequestQueryKeys = {
  all: ['customization-requests'] as const,
  byProject: (params: CustomizationRequestListParams) => ['customization-requests', 'project', params] as const,
  detail: (customizationRequestId: string) => ['customization-requests', 'detail', customizationRequestId] as const,
  productionVersions: (params: ProductionCustomizationVersionListParams) => ['customization-versions', 'production-queue', params] as const,
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

export function useProductionCustomizationVersions(params?: ProductionCustomizationVersionListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: customizationRequestQueryKeys.productionVersions(params ?? {}),
    queryFn: () => getProductionCustomizationVersions(params),
    enabled: options?.enabled ?? true,
  });
}

export function useProductionCustomizationVersionQueue() {
  return useQueries({
    queries: productionQueueParams.map((params) => ({
      queryKey: customizationRequestQueryKeys.productionVersions(params),
      queryFn: () => getProductionCustomizationVersions(params),
    })),
    combine: combineProductionQueueResults,
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

export function useCreateCustomizationRequestVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCustomizationRequestVersionInput) => createCustomizationRequestVersion(input),
    onSuccess: (result) => {
      invalidateCustomizationCaches(queryClient, { customizationRequestId: result.customizationRequestId });
    },
  });
}

export function useUpdateCustomizationRequestVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateCustomizationRequestVersionInput) => updateCustomizationRequestVersion(input),
    onSuccess: (version) => {
      invalidateCustomizationCaches(queryClient, { customizationRequestId: version.customizationRequestId });
    },
  });
}

export function useSubmitCustomizationRequestVersionForReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SubmitCustomizationRequestVersionForReviewInput) => submitCustomizationRequestVersionForReview(input),
    onSuccess: (version) => {
      invalidateCustomizationCaches(queryClient, { customizationRequestId: version.customizationRequestId });
    },
  });
}

export function useWithdrawCustomizationRequestVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: WithdrawCustomizationRequestVersionInput) => withdrawCustomizationRequestVersion(input),
    onSuccess: (version) => {
      invalidateCustomizationCaches(queryClient, { customizationRequestId: version.customizationRequestId });
    },
  });
}

export function useProductionReviewCustomizationVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProductionReviewCustomizationVersionInput) => productionReviewCustomizationVersion(input),
    onSuccess: (version) => {
      invalidateCustomizationCaches(queryClient, { customizationRequestId: version.customizationRequestId });
    },
  });
}

export function useAcceptCustomizationRequestVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AcceptCustomizationRequestVersionInput) => acceptCustomizationRequestVersion(input),
    onSuccess: (request) => {
      invalidateCustomizationCaches(queryClient, request);
      void queryClient.invalidateQueries({ queryKey: ['proposals', request.proposalId, 'items'] });
      void queryClient.invalidateQueries({ queryKey: ['proposals', 'detail', request.proposalId] });
      void queryClient.invalidateQueries({ queryKey: ['quotations'] });
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
  request: { customizationRequestId?: string; projectId?: string; proposalId?: string },
) {
  void queryClient.invalidateQueries({ queryKey: customizationRequestQueryKeys.all });
  void queryClient.invalidateQueries({ queryKey: ['customization-versions'] });
  void queryClient.invalidateQueries({ queryKey: ['customization-requests', 'project'] });
  void queryClient.invalidateQueries({ queryKey: ['notifications'] });

  if (request.customizationRequestId) {
    void queryClient.invalidateQueries({ queryKey: customizationRequestQueryKeys.detail(request.customizationRequestId) });
  }

  if (request.projectId) {
    void queryClient.invalidateQueries({ queryKey: ['projects', 'detail', request.projectId] });
    void queryClient.invalidateQueries({ queryKey: ['projects'] });
  }

  if (request.proposalId) {
    void queryClient.invalidateQueries({ queryKey: ['proposals', 'detail', request.proposalId] });
  }
}
