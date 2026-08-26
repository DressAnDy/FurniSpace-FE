import { useQuery } from '@tanstack/react-query';

import {
  getProjectReportDetail,
  getProjectReports,
  type ProjectReportListParams,
} from '@/services/api/projectReports';

export const projectReportQueryKeys = {
  all: ['project-reports'] as const,
  list: (params?: ProjectReportListParams) => ['project-reports', 'list', params] as const,
  detail: (projectId: string) => ['project-reports', 'detail', projectId] as const,
};

export function useProjectReportList(params?: ProjectReportListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: projectReportQueryKeys.list(params),
    queryFn: () => getProjectReports(params),
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
  });
}

export function useProjectReportDetail(projectId: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: projectReportQueryKeys.detail(projectId ?? ''),
    queryFn: () => getProjectReportDetail(projectId!),
    enabled: (options?.enabled ?? true) && Boolean(projectId),
    staleTime: 30_000,
  });
}
