import { useQuery } from '@tanstack/react-query';

import {
  getAdminFinancialDiscountExceptions,
  getAdminFinancialDiscountOrderDetail,
  getAdminFinancialDiscountProjects,
  getAdminFinancialDiscountSummary,
  getAdminFinancialDiscountTrend,
  type AdminFinancialDiscountExceptionsParams,
  type AdminFinancialDiscountProjectsParams,
  type AdminFinancialDiscountSummaryParams,
  type AdminFinancialDiscountTrendParams,
} from '@/services/api/adminFinancialDiscount';

export const adminFinancialDiscountQueryKeys = {
  all: ['admin-financial-discount'] as const,
  summary: (params: AdminFinancialDiscountSummaryParams) =>
    ['admin-financial-discount', 'summary', params] as const,
  projects: (params: AdminFinancialDiscountProjectsParams) =>
    ['admin-financial-discount', 'projects', params] as const,
  orderDetail: (orderId: string) => ['admin-financial-discount', 'order', orderId] as const,
  trend: (params: AdminFinancialDiscountTrendParams) => ['admin-financial-discount', 'trend', params] as const,
  exceptions: (params: AdminFinancialDiscountExceptionsParams) =>
    ['admin-financial-discount', 'exceptions', params] as const,
};

export function useAdminFinancialDiscountSummary(
  params: AdminFinancialDiscountSummaryParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: adminFinancialDiscountQueryKeys.summary(params),
    queryFn: () => getAdminFinancialDiscountSummary(params),
    enabled: (options?.enabled ?? true) && Boolean(params.from && params.to),
  });
}

export function useAdminFinancialDiscountProjects(
  params: AdminFinancialDiscountProjectsParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: adminFinancialDiscountQueryKeys.projects(params),
    queryFn: () => getAdminFinancialDiscountProjects(params),
    enabled: (options?.enabled ?? true) && Boolean(params.from && params.to),
  });
}

export function useAdminFinancialDiscountOrderDetail(orderId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: adminFinancialDiscountQueryKeys.orderDetail(orderId),
    queryFn: () => getAdminFinancialDiscountOrderDetail(orderId),
    enabled: (options?.enabled ?? true) && Boolean(orderId),
  });
}

export function useAdminFinancialDiscountTrend(
  params: AdminFinancialDiscountTrendParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: adminFinancialDiscountQueryKeys.trend(params),
    queryFn: () => getAdminFinancialDiscountTrend(params),
    enabled: (options?.enabled ?? true) && Boolean(params.from && params.to),
  });
}

export function useAdminFinancialDiscountExceptions(
  params: AdminFinancialDiscountExceptionsParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: adminFinancialDiscountQueryKeys.exceptions(params),
    queryFn: () => getAdminFinancialDiscountExceptions(params),
    enabled: (options?.enabled ?? true) && Boolean(params.from && params.to),
  });
}
