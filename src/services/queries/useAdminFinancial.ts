import { useQuery } from '@tanstack/react-query';

import {
  getAdminFinancialCollectionTrend,
  getAdminFinancialExceptions,
  getAdminFinancialPaymentBreakdown,
  getAdminFinancialPayments,
  getAdminFinancialProject,
  getAdminFinancialProjects,
  getAdminFinancialReceivableItems,
  getAdminFinancialReceivables,
  getAdminFinancialSummary,
  type AdminFinancialCollectionTrendParams,
  type AdminFinancialDateRangeParams,
  type AdminFinancialExceptionsParams,
  type AdminFinancialPaymentsParams,
  type AdminFinancialProjectsParams,
  type AdminFinancialReceivablesParams,
  type AdminFinancialSummaryParams,
} from '@/services/api/adminFinancial';

export const adminFinancialQueryKeys = {
  all: ['admin-financial'] as const,
  summary: (params?: AdminFinancialSummaryParams) => ['admin-financial', 'summary', params] as const,
  receivables: (params?: AdminFinancialReceivablesParams) => ['admin-financial', 'receivables', params] as const,
  receivableItems: (params?: AdminFinancialReceivablesParams) =>
    ['admin-financial', 'receivable-items', params] as const,
  paymentBreakdown: (params?: AdminFinancialDateRangeParams) =>
    ['admin-financial', 'payment-breakdown', params] as const,
  collectionTrend: (params?: AdminFinancialCollectionTrendParams) =>
    ['admin-financial', 'collection-trend', params] as const,
  projects: (params?: AdminFinancialProjectsParams) => ['admin-financial', 'projects', params] as const,
  project: (projectId: string) => ['admin-financial', 'project', projectId] as const,
  payments: (params?: AdminFinancialPaymentsParams) => ['admin-financial', 'payments', params] as const,
  exceptions: (params?: AdminFinancialExceptionsParams) => ['admin-financial', 'exceptions', params] as const,
};

export function useAdminFinancialSummary(params?: AdminFinancialSummaryParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: adminFinancialQueryKeys.summary(params),
    queryFn: () => getAdminFinancialSummary(params),
    enabled: options?.enabled ?? true,
  });
}

export function useAdminFinancialReceivables(
  params?: AdminFinancialReceivablesParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: adminFinancialQueryKeys.receivables(params),
    queryFn: () => getAdminFinancialReceivables(params),
    enabled: options?.enabled ?? true,
  });
}

export function useAdminFinancialReceivableItems(
  params?: AdminFinancialReceivablesParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: adminFinancialQueryKeys.receivableItems(params),
    queryFn: () => getAdminFinancialReceivableItems(params),
    enabled: options?.enabled ?? true,
  });
}

export function useAdminFinancialPaymentBreakdown(
  params: AdminFinancialDateRangeParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: adminFinancialQueryKeys.paymentBreakdown(params),
    queryFn: () => getAdminFinancialPaymentBreakdown(params),
    enabled: (options?.enabled ?? true) && Boolean(params.from && params.to),
  });
}

export function useAdminFinancialCollectionTrend(
  params: AdminFinancialCollectionTrendParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: adminFinancialQueryKeys.collectionTrend(params),
    queryFn: () => getAdminFinancialCollectionTrend(params),
    enabled: (options?.enabled ?? true) && Boolean(params.from && params.to),
  });
}

export function useAdminFinancialProjects(params?: AdminFinancialProjectsParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: adminFinancialQueryKeys.projects(params),
    queryFn: () => getAdminFinancialProjects(params),
    enabled: options?.enabled ?? true,
  });
}

export function useAdminFinancialProject(projectId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: adminFinancialQueryKeys.project(projectId),
    queryFn: () => getAdminFinancialProject(projectId),
    enabled: (options?.enabled ?? true) && Boolean(projectId),
  });
}

export function useAdminFinancialPayments(params?: AdminFinancialPaymentsParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: adminFinancialQueryKeys.payments(params),
    queryFn: () => getAdminFinancialPayments(params),
    enabled: options?.enabled ?? true,
  });
}

export function useAdminFinancialExceptions(
  params?: AdminFinancialExceptionsParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: adminFinancialQueryKeys.exceptions(params),
    queryFn: () => getAdminFinancialExceptions(params),
    enabled: options?.enabled ?? true,
  });
}
