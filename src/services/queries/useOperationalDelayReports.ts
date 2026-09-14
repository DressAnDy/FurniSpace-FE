import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createDeliveryDelayReport,
  createProductionDelayReport,
  getOperationalDelayReport,
  getProjectOperationalDelayReports,
  resolveOperationalDelayReport,
  type CreateDeliveryDelayReportInput,
  type CreateProductionDelayReportInput,
  type OperationalDelayPhase,
  type ResolveOperationalDelayReportInput,
} from '@/services/api/operationalDelayReports';

export const operationalDelayQueryKeys = {
  all: ['operational-delay-reports'] as const,
  project: (projectId: string, phase: OperationalDelayPhase) =>
    ['operational-delay-reports', 'project', projectId, phase] as const,
  detail: (reportId: string) => ['operational-delay-reports', 'detail', reportId] as const,
};

export function useProjectOperationalDelayReports(
  projectId: string | undefined,
  phase: OperationalDelayPhase,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: operationalDelayQueryKeys.project(projectId ?? '', phase),
    queryFn: () => getProjectOperationalDelayReports(projectId ?? '', phase),
    enabled: Boolean(projectId) && (options?.enabled ?? true),
  });
}

export function useOperationalDelayReport(reportId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: operationalDelayQueryKeys.detail(reportId ?? ''),
    queryFn: () => getOperationalDelayReport(reportId ?? ''),
    enabled: Boolean(reportId) && (options?.enabled ?? true),
  });
}

export function useCreateProductionDelayReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProductionDelayReportInput) => createProductionDelayReport(input),
    onSuccess: (_report, input) => {
      void queryClient.invalidateQueries({
        queryKey: ['operational-delay-reports', 'project', input.projectId],
      });
    },
  });
}

export function useCreateDeliveryDelayReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDeliveryDelayReportInput) => createDeliveryDelayReport(input),
    onSuccess: (_report, input) => {
      void queryClient.invalidateQueries({
        queryKey: ['operational-delay-reports', 'project', input.projectId],
      });
    },
  });
}

export function useResolveOperationalDelayReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ResolveOperationalDelayReportInput) => resolveOperationalDelayReport(input),
    onSuccess: (report) => {
      void queryClient.invalidateQueries({ queryKey: operationalDelayQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: operationalDelayQueryKeys.detail(report.operationalDelayReportId) });
      void queryClient.invalidateQueries({
        queryKey: operationalDelayQueryKeys.project(report.projectId, report.reportPhase),
      });
    },
  });
}
