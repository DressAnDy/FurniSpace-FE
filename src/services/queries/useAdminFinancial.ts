import { useQuery } from '@tanstack/react-query';

import {
  getAdminFinancialCollectionTrend,
  getAdminFinancialExceptions,
  getAdminFinancialPaymentBreakdown,
  getAdminFinancialPayments,
  getAdminFinancialProject,
  getAdminFinancialProjectStatement,
  getAdminFinancialProjects,
  getAdminFinancialReceivableOrderDetail,
  getAdminFinancialReceivableItems,
  getAdminFinancialReceivables,
  getAdminFinancialSummary,
  getAdminFinancialSummaryDrilldown,
  type AdminFinancialCollectionTrendParams,
  type AdminFinancialDateRangeParams,
  type AdminFinancialExceptionsParams,
  type AdminFinancialPaymentsParams,
  type AdminFinancialProjectsParams,
  type AdminFinancialProjectStatementParams,
  type AdminFinancialReceivablesParams,
  type AdminFinancialSummaryParams,
  type AdminFinancialDrilldownMetric,
  type AdminFinancialSummaryDrilldownParams,
} from '@/services/api/adminFinancial';

export const adminFinancialQueryKeys = {
  all: ['admin-financial'] as const,
  summary: (params?: AdminFinancialSummaryParams) => ['admin-financial', 'summary', params] as const,
  summaryDrilldown: (metric: AdminFinancialDrilldownMetric, params: AdminFinancialSummaryDrilldownParams) =>
    ['admin-financial', 'summary-drilldown', metric, params] as const,
  receivables: (params?: AdminFinancialReceivablesParams) => ['admin-financial', 'receivables', params] as const,
  receivableItems: (params?: AdminFinancialReceivablesParams) =>
    ['admin-financial', 'receivable-items', params] as const,
  paymentBreakdown: (params?: AdminFinancialDateRangeParams) =>
    ['admin-financial', 'payment-breakdown', params] as const,
  collectionTrend: (params?: AdminFinancialCollectionTrendParams) =>
    ['admin-financial', 'collection-trend', params] as const,
  projects: (params?: AdminFinancialProjectsParams) => ['admin-financial', 'projects', params] as const,
  project: (projectId: string) => ['admin-financial', 'project', projectId] as const,
  projectStatement: (projectId: string, params?: AdminFinancialProjectStatementParams) =>
    ['admin-financial', 'project-statement', projectId, params] as const,
  receivableOrderDetail: (orderId: string) => ['admin-financial', 'receivable-order-detail', orderId] as const,
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

export function useAdminFinancialSummaryDrilldown(
  metric: AdminFinancialDrilldownMetric,
  params: AdminFinancialSummaryDrilldownParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: adminFinancialQueryKeys.summaryDrilldown(metric, params),
    queryFn: () => getAdminFinancialSummaryDrilldown(metric, params),
    enabled: (options?.enabled ?? true) && Boolean(params.from && params.to),
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

export function useAdminFinancialProjectStatement(
  projectId: string,
  params?: AdminFinancialProjectStatementParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: adminFinancialQueryKeys.projectStatement(projectId, params),
    queryFn: () => getAdminFinancialProjectStatement(projectId, params),
    enabled: (options?.enabled ?? true) && Boolean(projectId),
  });
}

export function useAdminFinancialReceivableOrderDetail(orderId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: adminFinancialQueryKeys.receivableOrderDetail(orderId),
    queryFn: () => getAdminFinancialReceivableOrderDetail(orderId),
    enabled: (options?.enabled ?? true) && Boolean(orderId),
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
