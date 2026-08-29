import { useQuery } from '@tanstack/react-query';

import {
  getDashboardServiceResultMessage,
  getDesignerDashboardKpis,
  getDesignerWorkQueue,
  getProductionDashboardKpis,
  getProductionQueue,
  getProjectPhaseDeadlineRisks,
  getSalesActionQueue,
  getSalesDashboardKpis,
  type DashboardKpiQueryDto,
  type DashboardQueueQueryDto,
  type ProjectPhaseDeadlineRiskParams,
} from '@/services/api/dashboard';

export { getDashboardServiceResultMessage };

export const dashboardQueryKeys = {
  all: ['dashboard'] as const,
  salesQueue: (params?: DashboardQueueQueryDto) => ['dashboard', 'sales', 'action-queue', params] as const,
  salesKpis: (params?: DashboardKpiQueryDto) => ['dashboard', 'sales', 'kpis', params] as const,
  designerQueue: (params?: DashboardQueueQueryDto) => ['dashboard', 'designer', 'work-queue', params] as const,
  designerKpis: (params?: DashboardKpiQueryDto) => ['dashboard', 'designer', 'kpis', params] as const,
  productionQueue: (params?: DashboardQueueQueryDto) => ['dashboard', 'production', 'queue', params] as const,
  productionKpis: (params?: DashboardKpiQueryDto) => ['dashboard', 'production', 'kpis', params] as const,
  phaseDeadlineRisks: (params?: ProjectPhaseDeadlineRiskParams) =>
    ['dashboard', 'project-phase-deadlines', params] as const,
};

export function useSalesActionQueue(params?: DashboardQueueQueryDto, enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.salesQueue(params),
    queryFn: () => getSalesActionQueue(params),
    enabled,
  });
}

export function useSalesDashboardKpis(params?: DashboardKpiQueryDto, enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.salesKpis(params),
    queryFn: () => getSalesDashboardKpis(params),
    enabled,
  });
}

export function useDesignerWorkQueue(params?: DashboardQueueQueryDto, enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.designerQueue(params),
    queryFn: () => getDesignerWorkQueue(params),
    enabled,
  });
}

export function useDesignerDashboardKpis(params?: DashboardKpiQueryDto, enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.designerKpis(params),
    queryFn: () => getDesignerDashboardKpis(params),
    enabled,
  });
}

export function useProductionQueue(params?: DashboardQueueQueryDto, enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.productionQueue(params),
    queryFn: () => getProductionQueue(params),
    enabled,
  });
}

export function useProductionDashboardKpis(params?: DashboardKpiQueryDto, enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.productionKpis(params),
    queryFn: () => getProductionDashboardKpis(params),
    enabled,
  });
}

export function useProjectPhaseDeadlineRisks(params?: ProjectPhaseDeadlineRiskParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: dashboardQueryKeys.phaseDeadlineRisks(params),
    queryFn: () => getProjectPhaseDeadlineRisks(params),
    enabled: options?.enabled ?? true,
  });
}
