import { keepPreviousData, useQuery } from '@tanstack/react-query';

import {
  getDashboardServiceResultMessage,
  getDesignerConfirmedMeasurementsList,
  getDesignerDashboardKpis,
  getDesignerProposalConsultingList,
  getDesignerRevisionRequestedList,
  getDesignerWorkQueue,
  getProductionDashboardKpis,
  getProductionQueue,
  getProjectPhaseDeadlineRisks,
  getSalesActionQueue,
  getSalesDashboardKpis,
  getSalesOverdueTasksList,
  getSalesUnpaidRemainingList,
  type DashboardKpiQueryDto,
  type DashboardQueueQueryDto,
  type DesignerKpiListQueryDto,
  type ProjectPhaseDeadlineRiskParams,
  type SalesKpiListQueryDto,
} from '@/services/api/dashboard';

export { getDashboardServiceResultMessage };

export const dashboardQueryKeys = {
  all: ['dashboard'] as const,
  salesQueue: (params?: DashboardQueueQueryDto) => ['dashboard', 'sales', 'action-queue', params] as const,
  salesKpis: (params?: DashboardKpiQueryDto) => ['dashboard', 'sales', 'kpis', params] as const,
  salesUnpaidRemaining: (params?: SalesKpiListQueryDto) =>
    ['dashboard', 'sales', 'kpis', 'unpaid-remaining', params] as const,
  salesOverdueTasks: (params?: SalesKpiListQueryDto) =>
    ['dashboard', 'sales', 'kpis', 'overdue-tasks', params] as const,
  designerQueue: (params?: DashboardQueueQueryDto) => ['dashboard', 'designer', 'work-queue', params] as const,
  designerKpis: (params?: DashboardKpiQueryDto) => ['dashboard', 'designer', 'kpis', params] as const,
  designerConfirmedMeasurements: (params?: DesignerKpiListQueryDto) =>
    ['dashboard', 'designer', 'kpis', 'confirmed-measurements', params] as const,
  designerProposalConsulting: (params?: DesignerKpiListQueryDto) =>
    ['dashboard', 'designer', 'kpis', 'proposal-consulting', params] as const,
  designerRevisionRequested: (params?: DesignerKpiListQueryDto) =>
    ['dashboard', 'designer', 'kpis', 'revision-requested', params] as const,
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
    placeholderData: keepPreviousData,
  });
}

export function useSalesDashboardKpis(params?: DashboardKpiQueryDto, enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.salesKpis(params),
    queryFn: () => getSalesDashboardKpis(params),
    enabled,
  });
}

export function useSalesUnpaidRemainingList(params?: SalesKpiListQueryDto, enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.salesUnpaidRemaining(params),
    queryFn: () => getSalesUnpaidRemainingList(params),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useSalesOverdueTasksList(params?: SalesKpiListQueryDto, enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.salesOverdueTasks(params),
    queryFn: () => getSalesOverdueTasksList(params),
    enabled,
    placeholderData: keepPreviousData,
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

export function useDesignerConfirmedMeasurementsList(params?: DesignerKpiListQueryDto, enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.designerConfirmedMeasurements(params),
    queryFn: () => getDesignerConfirmedMeasurementsList(params),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useDesignerProposalConsultingList(params?: DesignerKpiListQueryDto, enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.designerProposalConsulting(params),
    queryFn: () => getDesignerProposalConsultingList(params),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useDesignerRevisionRequestedList(params?: DesignerKpiListQueryDto, enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.designerRevisionRequested(params),
    queryFn: () => getDesignerRevisionRequestedList(params),
    enabled,
    placeholderData: keepPreviousData,
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
