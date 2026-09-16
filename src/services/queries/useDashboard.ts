import { keepPreviousData, useQuery } from '@tanstack/react-query';

import {
  getDashboardServiceResultMessage,
  getDesignerConfirmedMeasurementsList,
  getDesignerDashboardKpis,
  getDesignerAssignedProjectsList,
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
import { useCurrentUser } from './useAuth';

export { getDashboardServiceResultMessage };

export const dashboardQueryKeys = {
  all: ['dashboard'] as const,
  salesQueue: (params?: DashboardQueueQueryDto) => ['dashboard', 'sales', 'action-queue', params] as const,
  salesKpis: (params?: DashboardKpiQueryDto) => ['dashboard', 'sales', 'kpis', params] as const,
  salesUnpaidRemaining: (params?: SalesKpiListQueryDto) =>
    ['dashboard', 'sales', 'kpis', 'unpaid-remaining', params] as const,
  salesOverdueTasks: (params?: SalesKpiListQueryDto) =>
    ['dashboard', 'sales', 'kpis', 'overdue-tasks', params] as const,
  designerQueue: (params?: DashboardQueueQueryDto, viewerId?: string | null) =>
    ['dashboard', 'designer', 'work-queue', viewerId ?? null, params] as const,
  designerKpis: (params?: DashboardKpiQueryDto, viewerId?: string | null) =>
    ['dashboard', 'designer', 'kpis', viewerId ?? null, params] as const,
  designerConfirmedMeasurements: (params?: DesignerKpiListQueryDto, viewerId?: string | null) =>
    ['dashboard', 'designer', 'kpis', 'confirmed-measurements', viewerId ?? null, params] as const,
  designerProposalConsulting: (params?: DesignerKpiListQueryDto, viewerId?: string | null) =>
    ['dashboard', 'designer', 'kpis', 'proposal-consulting', viewerId ?? null, params] as const,
  designerRevisionRequested: (params?: DesignerKpiListQueryDto, viewerId?: string | null) =>
    ['dashboard', 'designer', 'kpis', 'revision-requested', viewerId ?? null, params] as const,
  designerAssignedProjects: (params?: DesignerKpiListQueryDto, viewerId?: string | null) =>
    ['dashboard', 'designer', 'kpis', 'assigned-projects', viewerId ?? null, params] as const,
  productionQueue: (params?: DashboardQueueQueryDto) => ['dashboard', 'production', 'queue', params] as const,
  productionKpis: (params?: DashboardKpiQueryDto) => ['dashboard', 'production', 'kpis', params] as const,
  phaseDeadlineRisks: (params?: ProjectPhaseDeadlineRiskParams) =>
    ['dashboard', 'project-phase-deadlines', params] as const,
};

function useDashboardViewerId() {
  return useCurrentUser().data?.accountId ?? null;
}

/** Keep prior page data only when the same viewer still owns the cache. */
function keepPreviousDataForSameViewer<T>(viewerId: string | null) {
  return (previousData: T | undefined, previousQuery: { queryKey: readonly unknown[] } | undefined): T | undefined => {
    if (!previousQuery || !previousQuery.queryKey.includes(viewerId)) {
      return undefined;
    }

    return previousData;
  };
}

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
  const viewerId = useDashboardViewerId();

  return useQuery({
    queryKey: dashboardQueryKeys.designerQueue(params, viewerId),
    queryFn: () => getDesignerWorkQueue(params),
    enabled,
  });
}

export function useDesignerDashboardKpis(params?: DashboardKpiQueryDto, enabled = true) {
  const viewerId = useDashboardViewerId();

  return useQuery({
    queryKey: dashboardQueryKeys.designerKpis(params, viewerId),
    queryFn: () => getDesignerDashboardKpis(params),
    enabled,
  });
}

export function useDesignerConfirmedMeasurementsList(params?: DesignerKpiListQueryDto, enabled = true) {
  const viewerId = useDashboardViewerId();

  return useQuery({
    queryKey: dashboardQueryKeys.designerConfirmedMeasurements(params, viewerId),
    queryFn: () => getDesignerConfirmedMeasurementsList(params),
    enabled,
    placeholderData: keepPreviousDataForSameViewer(viewerId),
  });
}

export function useDesignerProposalConsultingList(params?: DesignerKpiListQueryDto, enabled = true) {
  const viewerId = useDashboardViewerId();

  return useQuery({
    queryKey: dashboardQueryKeys.designerProposalConsulting(params, viewerId),
    queryFn: () => getDesignerProposalConsultingList(params),
    enabled,
    placeholderData: keepPreviousDataForSameViewer(viewerId),
  });
}

export function useDesignerRevisionRequestedList(params?: DesignerKpiListQueryDto, enabled = true) {
  const viewerId = useDashboardViewerId();

  return useQuery({
    queryKey: dashboardQueryKeys.designerRevisionRequested(params, viewerId),
    queryFn: () => getDesignerRevisionRequestedList(params),
    enabled,
    placeholderData: keepPreviousDataForSameViewer(viewerId),
  });
}

export function useDesignerAssignedProjectsList(params?: DesignerKpiListQueryDto, enabled = true) {
  const viewerId = useDashboardViewerId();

  return useQuery({
    queryKey: dashboardQueryKeys.designerAssignedProjects(params, viewerId),
    queryFn: () => getDesignerAssignedProjectsList(params),
    enabled,
    placeholderData: keepPreviousDataForSameViewer(viewerId),
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
