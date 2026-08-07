import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  acceptQuotation,
  bulkUpdateQuotationItemFinancials,
  cancelQuotation,
  createDraftQuotation,
  createManualQuotationItem,
  deleteManualQuotationItem,
  getProjectQuotations,
  getQuotationById,
  rejectQuotation,
  requestQuotationRevision,
  reviseQuotation,
  sendQuotation,
  updateManualQuotationItem,
  updateQuotation,
  updateQuotationItemFinancials,
  type BulkUpdateQuotationItemFinancialsInput,
  type CreateManualQuotationItemInput,
  type QuotationDto,
  type QuotationListParams,
  type RejectQuotationInput,
  type RequestQuotationRevisionInput,
  type UpdateManualQuotationItemInput,
  type UpdateQuotationInput,
  type UpdateQuotationItemFinancialsInput,
} from '@/services/api/quotations';

export const quotationQueryKeys = {
  all: ['quotations'] as const,
  byProject: (params: QuotationListParams) => ['quotations', 'project', params] as const,
  detail: (quotationId: string) => ['quotations', 'detail', quotationId] as const,
};

export function useProjectQuotations(params?: QuotationListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: quotationQueryKeys.byProject(params ?? { projectId: '' }),
    queryFn: () => getProjectQuotations(params as QuotationListParams),
    enabled: Boolean(params?.projectId) && (options?.enabled ?? true),
  });
}

export function useQuotationDetail(quotationId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: quotationQueryKeys.detail(quotationId ?? ''),
    queryFn: () => getQuotationById(quotationId ?? ''),
    enabled: Boolean(quotationId) && (options?.enabled ?? true),
  });
}

export function useCreateDraftQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => createDraftQuotation(projectId),
    onSuccess: (quotation) => {
      invalidateQuotationCaches(queryClient, quotation);
      void queryClient.invalidateQueries({ queryKey: ['customization-requests', 'project'] });
    },
  });
}

export function useUpdateQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateQuotationInput) => updateQuotation(input),
    onSuccess: (quotation) => {
      invalidateQuotationCaches(queryClient, quotation);
    },
  });
}

export function useCreateManualQuotationItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateManualQuotationItemInput) => createManualQuotationItem(input),
    onSuccess: (item, input) => {
      void queryClient.invalidateQueries({ queryKey: quotationQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: quotationQueryKeys.detail(input.quotationId) });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useUpdateManualQuotationItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateManualQuotationItemInput) => updateManualQuotationItem(input),
    onSuccess: (item, input) => {
      void queryClient.invalidateQueries({ queryKey: quotationQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: quotationQueryKeys.detail(input.quotationId) });
    },
  });
}

export function useUpdateQuotationItemFinancials() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateQuotationItemFinancialsInput) => updateQuotationItemFinancials(input),
    onSuccess: (item, input) => {
      void queryClient.invalidateQueries({ queryKey: quotationQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: quotationQueryKeys.detail(input.quotationId) });
    },
  });
}

export function useBulkUpdateQuotationItemFinancials() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: BulkUpdateQuotationItemFinancialsInput) => bulkUpdateQuotationItemFinancials(input),
    onSuccess: (quotation, input) => {
      void queryClient.invalidateQueries({ queryKey: quotationQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: quotationQueryKeys.detail(input.quotationId) });
      if (quotation?.projectId) {
        void queryClient.invalidateQueries({ queryKey: ['projects', 'detail', quotation.projectId] });
        void queryClient.invalidateQueries({ queryKey: ['projects'] });
      }
    },
  });
}

export function useDeleteManualQuotationItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { quotationId: string; quotationItemId: string }) =>
      deleteManualQuotationItem(input.quotationId, input.quotationItemId),
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({ queryKey: quotationQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: quotationQueryKeys.detail(input.quotationId) });
    },
  });
}

export function useSendQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quotationId: string) => sendQuotation(quotationId),
    onSuccess: (quotation) => {
      invalidateQuotationCaches(queryClient, quotation);
    },
  });
}

export function useAcceptQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quotationId: string) => acceptQuotation(quotationId),
    onSuccess: (quotation) => {
      invalidateQuotationCaches(queryClient, quotation);
    },
  });
}

export function useRequestQuotationRevision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RequestQuotationRevisionInput) => requestQuotationRevision(input),
    onSuccess: (quotation) => {
      invalidateQuotationCaches(queryClient, quotation);
    },
  });
}

export function useReviseQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quotationId: string) => reviseQuotation(quotationId),
    onSuccess: (quotation) => {
      invalidateQuotationCaches(queryClient, quotation);
    },
  });
}

export function useCancelQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quotationId: string) => cancelQuotation(quotationId),
    onSuccess: (quotation) => {
      invalidateQuotationCaches(queryClient, quotation);
    },
  });
}

export function useRejectQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RejectQuotationInput) => rejectQuotation(input),
    onSuccess: (quotation) => {
      invalidateQuotationCaches(queryClient, quotation);
    },
  });
}

function invalidateQuotationCaches(queryClient: ReturnType<typeof useQueryClient>, quotation: QuotationDto) {
  void queryClient.invalidateQueries({ queryKey: quotationQueryKeys.all });
  void queryClient.invalidateQueries({ queryKey: quotationQueryKeys.detail(quotation.quotationId) });
  void queryClient.invalidateQueries({ queryKey: ['quotations', 'project'] });
  void queryClient.invalidateQueries({ queryKey: ['projects', 'detail', quotation.projectId] });
  void queryClient.invalidateQueries({ queryKey: ['projects'] });
  void queryClient.invalidateQueries({ queryKey: ['notifications'] });
}
