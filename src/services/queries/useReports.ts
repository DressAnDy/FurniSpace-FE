import { useMutation, useQuery } from '@tanstack/react-query';

import {
  exportReportCsv,
  getCatalogBestsellers,
  getCommercialTrend,
  getDeliveryReviews,
  getProjectAgingReport,
  getReportBusiness,
  getReportCatalog,
  getReportCommercial,
  getReportDelivery,
  getReportOverview,
  getReportProduction,
  getReportProjects,
  type CatalogBestsellersParams,
  type CommercialTrendParams,
  type DeliveryReviewsParams,
  type ProjectAgingParams,
  type ReportDateRangeParams,
  type ReportExportParams,
} from '@/services/api/reports';
import {
  getProductionWorkload,
  getProductionWorkloadSummary,
  type ProductionWorkloadListParams,
} from '@/services/api/production';

export const reportQueryKeys = {
  all: ['reports'] as const,
  overview: (params?: ReportDateRangeParams) => ['reports', 'overview', params] as const,
  business: ['reports', 'business'] as const,
  projects: (params?: ReportDateRangeParams) => ['reports', 'projects', params] as const,
  commercial: (params?: ReportDateRangeParams) => ['reports', 'commercial', params] as const,
  production: (params?: ReportDateRangeParams) => ['reports', 'production', params] as const,
  delivery: (params?: ReportDateRangeParams) => ['reports', 'delivery', params] as const,
  catalog: ['reports', 'catalog'] as const,
  projectAging: (params?: ProjectAgingParams) => ['reports', 'project-aging', params] as const,
  commercialTrend: (params?: CommercialTrendParams) => ['reports', 'commercial-trend', params] as const,
  deliveryReviews: (params?: DeliveryReviewsParams) => ['reports', 'delivery-reviews', params] as const,
  catalogBestsellers: (params?: CatalogBestsellersParams) => ['reports', 'catalog-bestsellers', params] as const,
  productionWorkload: (params?: ProductionWorkloadListParams) => ['reports', 'production-workload', params] as const,
  productionWorkloadSummary: ['reports', 'production-workload-summary'] as const,
};

export function useReportOverview(params?: ReportDateRangeParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: reportQueryKeys.overview(params),
    queryFn: () => getReportOverview(params),
    enabled: options?.enabled ?? true,
  });
}

export function useReportBusiness(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: reportQueryKeys.business,
    queryFn: () => getReportBusiness(),
    enabled: options?.enabled ?? true,
  });
}

export function useReportProjects(params?: ReportDateRangeParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: reportQueryKeys.projects(params),
    queryFn: () => getReportProjects(params),
    enabled: options?.enabled ?? true,
  });
}

export function useReportCommercial(params?: ReportDateRangeParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: reportQueryKeys.commercial(params),
    queryFn: () => getReportCommercial(params),
    enabled: options?.enabled ?? true,
  });
}

export function useReportProduction(params?: ReportDateRangeParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: reportQueryKeys.production(params),
    queryFn: () => getReportProduction(params),
    enabled: options?.enabled ?? true,
  });
}

export function useReportDelivery(params?: ReportDateRangeParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: reportQueryKeys.delivery(params),
    queryFn: () => getReportDelivery(params),
    enabled: options?.enabled ?? true,
  });
}

export function useReportCatalog(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: reportQueryKeys.catalog,
    queryFn: () => getReportCatalog(),
    enabled: options?.enabled ?? true,
  });
}

export function useProjectAgingReport(params?: ProjectAgingParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: reportQueryKeys.projectAging(params),
    queryFn: () => getProjectAgingReport(params),
    enabled: options?.enabled ?? true,
  });
}

export function useCommercialTrend(params: CommercialTrendParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: reportQueryKeys.commercialTrend(params),
    queryFn: () => getCommercialTrend(params),
    enabled: (options?.enabled ?? true) && Boolean(params.from && params.to),
  });
}

export function useDeliveryReviews(params?: DeliveryReviewsParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: reportQueryKeys.deliveryReviews(params),
    queryFn: () => getDeliveryReviews(params),
    enabled: options?.enabled ?? true,
  });
}

export function useCatalogBestsellers(params: CatalogBestsellersParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: reportQueryKeys.catalogBestsellers(params),
    queryFn: () => getCatalogBestsellers(params),
    enabled: (options?.enabled ?? true) && Boolean(params.from && params.to),
  });
}

export function useProductionWorkloadReport(params?: ProductionWorkloadListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: reportQueryKeys.productionWorkload(params),
    queryFn: () => getProductionWorkload(params),
    enabled: options?.enabled ?? true,
  });
}

export function useProductionWorkloadSummaryReport(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: reportQueryKeys.productionWorkloadSummary,
    queryFn: () => getProductionWorkloadSummary(),
    enabled: options?.enabled ?? true,
  });
}

export function useExportReportCsv() {
  return useMutation({
    mutationFn: (params: ReportExportParams) => exportReportCsv(params),
  });
}
