import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createAccount,
  deleteAccount,
  getAccountById,
  getAccounts,
  getAdminAccountDetail,
  updateAccount,
  type AccountListParams,
  type CreateAccountInput,
  type UpdateAccountInput,
} from '@/services/api/accounts';

export const accountQueryKeys = {
  all: ['accounts'] as const,
  list: (params?: AccountListParams) => ['accounts', 'list', params] as const,
  detail: (accountId: string) => ['accounts', 'detail', accountId] as const,
  adminDetail: (accountId: string) => ['accounts', 'admin-detail', accountId] as const,
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
