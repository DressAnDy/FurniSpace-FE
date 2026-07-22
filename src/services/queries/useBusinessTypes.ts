import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createBusinessType,
  getBusinessTypeById,
  getBusinessTypes,
  updateBusinessType,
  updateBusinessTypeStatus,
  type BusinessTypeListParams,
  type CreateBusinessTypeInput,
  type UpdateBusinessTypeInput,
} from '@/services/api/businessTypes';

export const businessTypeQueryKeys = {
  all: ['business-types'] as const,
  detail: (id: number) => ['business-types', 'detail', id] as const,
  list: (params?: BusinessTypeListParams) => ['business-types', 'list', params] as const,
};

export function useBusinessTypeList(params?: BusinessTypeListParams, enabled = true) {
  return useQuery({
    queryKey: businessTypeQueryKeys.list(params),
    queryFn: () => getBusinessTypes(params),
    enabled,
  });
}

export function useBusinessTypeDetail(id?: number, enabled = true) {
  return useQuery({
    queryKey: businessTypeQueryKeys.detail(id ?? 0),
    queryFn: () => getBusinessTypeById(id ?? 0),
    enabled: Boolean(id) && enabled,
  });
}

export function useCreateBusinessType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateBusinessTypeInput) => createBusinessType(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: businessTypeQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateBusinessType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateBusinessTypeInput) => updateBusinessType(input),
    onSuccess: (businessType) => {
      void queryClient.invalidateQueries({ queryKey: businessTypeQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: businessTypeQueryKeys.detail(businessType.id) });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateBusinessTypeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: number; status: boolean }) => updateBusinessTypeStatus(input.id, input.status),
    onSuccess: (businessType) => {
      void queryClient.invalidateQueries({ queryKey: businessTypeQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: businessTypeQueryKeys.detail(businessType.id) });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
