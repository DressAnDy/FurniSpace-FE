import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createAccount,
  deleteAccount,
  getAccountById,
  getAccounts,
  getAdminAccountDetail,
  getAvailableDesigners,
  getDesignerAssignedProjects,
  getDesignerWorkload,
  getDesignerWorkloadSummary,
  getSalesAssignedProjects,
  getSalesWorkload,
  getSalesWorkloadSummary,
  getUnassignedIntakeProjects,
  updateAccount,
  type AccountListParams,
  type AvailableDesignerListParams,
  type CreateAccountInput,
  type DesignerAssignedProjectListParams,
  type DesignerWorkloadListParams,
  type SalesAssignedProjectListParams,
  type SalesWorkloadListParams,
  type UnassignedIntakeListParams,
  type UpdateAccountInput,
} from '@/services/api/accounts';

export const accountQueryKeys = {
  all: ['accounts'] as const,
  list: (params?: AccountListParams) => ['accounts', 'list', params] as const,
  detail: (accountId: string) => ['accounts', 'detail', accountId] as const,
  adminDetail: (accountId: string) => ['accounts', 'admin-detail', accountId] as const,
  availableDesigners: (params?: AvailableDesignerListParams) => ['accounts', 'available-designers', params] as const,
  designerWorkload: (params?: DesignerWorkloadListParams) => ['accounts', 'designer-workload', params] as const,
  designerWorkloadSummary: ['accounts', 'designer-workload-summary'] as const,
  designerProjects: (params: DesignerAssignedProjectListParams) => ['accounts', 'designer-projects', params] as const,
  salesWorkload: (params?: SalesWorkloadListParams) => ['accounts', 'sales-workload', params] as const,
  salesWorkloadSummary: ['accounts', 'sales-workload-summary'] as const,
  salesProjects: (params: SalesAssignedProjectListParams) => ['accounts', 'sales-projects', params] as const,
  unassignedIntake: (params?: UnassignedIntakeListParams) => ['accounts', 'unassigned-intake', params] as const,
};

export function useAccountList(params?: AccountListParams) {
  return useQuery({
    queryKey: accountQueryKeys.list(params),
    queryFn: () => getAccounts(params),
  });
}

export function useAccountDetail(accountId?: string) {
  return useQuery({
    queryKey: accountQueryKeys.detail(accountId ?? ''),
    queryFn: () => getAccountById(accountId ?? ''),
    enabled: Boolean(accountId),
  });
}

export function useAdminAccountDetail(accountId?: string) {
  return useQuery({
    queryKey: accountQueryKeys.adminDetail(accountId ?? ''),
    queryFn: () => getAdminAccountDetail(accountId ?? ''),
    enabled: Boolean(accountId),
  });
}

export function useAvailableDesigners(params?: AvailableDesignerListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: accountQueryKeys.availableDesigners(params),
    queryFn: () => getAvailableDesigners(params),
    enabled: options?.enabled ?? true,
  });
}

export function useDesignerWorkload(params?: DesignerWorkloadListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: accountQueryKeys.designerWorkload(params),
    queryFn: () => getDesignerWorkload(params),
    enabled: options?.enabled ?? true,
  });
}

export function useDesignerWorkloadSummary(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: accountQueryKeys.designerWorkloadSummary,
    queryFn: () => getDesignerWorkloadSummary(),
    enabled: options?.enabled ?? true,
  });
}

export function useDesignerAssignedProjects(params: DesignerAssignedProjectListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: accountQueryKeys.designerProjects(params),
    queryFn: () => getDesignerAssignedProjects(params),
    enabled: (options?.enabled ?? true) && Boolean(params.designerId),
  });
}

export function useSalesWorkload(params?: SalesWorkloadListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: accountQueryKeys.salesWorkload(params),
    queryFn: () => getSalesWorkload(params),
    enabled: options?.enabled ?? true,
  });
}

export function useSalesWorkloadSummary(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: accountQueryKeys.salesWorkloadSummary,
    queryFn: () => getSalesWorkloadSummary(),
    enabled: options?.enabled ?? true,
  });
}

export function useSalesAssignedProjects(params: SalesAssignedProjectListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: accountQueryKeys.salesProjects(params),
    queryFn: () => getSalesAssignedProjects(params),
    enabled: (options?.enabled ?? true) && Boolean(params.salesId),
  });
}

export function useUnassignedIntakeProjects(params?: UnassignedIntakeListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: accountQueryKeys.unassignedIntake(params),
    queryFn: () => getUnassignedIntakeProjects(params),
    enabled: options?.enabled ?? true,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAccountInput) => createAccount(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountQueryKeys.all });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateAccountInput) => updateAccount(input),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: accountQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: accountQueryKeys.detail(data.accountId) });
      void queryClient.invalidateQueries({ queryKey: accountQueryKeys.adminDetail(data.accountId) });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (accountId: string) => deleteAccount(accountId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountQueryKeys.all });
    },
  });
}
