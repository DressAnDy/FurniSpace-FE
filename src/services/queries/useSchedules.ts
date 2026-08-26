import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createProjectSchedule,
  deleteProjectSchedule,
  getAllMyAssignedProjectSchedules,
  getAllProjectSchedules,
  getMyAssignedProjectSchedules,
  getProjectScheduleById,
  getProjectSchedules,
  getSchedulesForProjects,
  requestProjectScheduleChange,
  updateProjectSchedule,
  updateProjectScheduleStatus,
  type CreateProjectScheduleInput,
  type MyAssignedScheduleListParams,
  type ProjectScheduleDto,
  type ProjectScheduleListParams,
  type RequestProjectScheduleChangeInput,
  type UpdateProjectScheduleInput,
  type UpdateProjectScheduleStatusInput,
} from '@/services/api/schedules';

export const projectScheduleQueryKeys = {
  all: ['project-schedules'] as const,
  list: (params?: ProjectScheduleListParams) => ['project-schedules', 'list', params] as const,
  listAll: (params?: ProjectScheduleListParams) => ['project-schedules', 'list-all', params] as const,
  multiProject: (projectIds: string[]) => ['project-schedules', 'multi-project', projectIds] as const,
  myAssigned: (params?: MyAssignedScheduleListParams) => ['project-schedules', 'my-assigned', params] as const,
  myAssignedAll: (params?: MyAssignedScheduleListParams) => ['project-schedules', 'my-assigned-all', params] as const,
  detail: (scheduleId: string) => ['project-schedules', 'detail', scheduleId] as const,
};

type ScheduleListQueryOptions = {
  enabled?: boolean;
  /** When true, paginates until every item for the project is loaded. */
  fetchAll?: boolean;
  staleTime?: number;
};

function sortProjectIds(projectIds: string[]) {
  return Array.from(new Set(projectIds.map((id) => id.trim()).filter(Boolean))).sort();
}

function invalidateProjectScheduleCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  schedule?: Pick<ProjectScheduleDto, 'scheduleId' | 'projectId'> | null,
) {
  void queryClient.invalidateQueries({ queryKey: projectScheduleQueryKeys.all });

  if (schedule?.scheduleId) {
    void queryClient.invalidateQueries({ queryKey: projectScheduleQueryKeys.detail(schedule.scheduleId) });
  }
}

export function useProjectScheduleList(params?: ProjectScheduleListParams, options?: ScheduleListQueryOptions) {
  const fetchAll = options?.fetchAll ?? false;

  return useQuery({
    queryKey: fetchAll ? projectScheduleQueryKeys.listAll(params) : projectScheduleQueryKeys.list(params),
    queryFn: () =>
      fetchAll
        ? getAllProjectSchedules(params as ProjectScheduleListParams)
        : getProjectSchedules(params as ProjectScheduleListParams),
    enabled: (options?.enabled ?? true) && Boolean(params?.projectId?.trim()),
    staleTime: options?.staleTime,
  });
}

/**
 * One React Query entry for N projects. Filters (type/status) should be applied client-side
 * so changing filters does not re-fan-out HTTP calls.
 */
export function useMultiProjectSchedules(projectIds: string[], options?: { enabled?: boolean }) {
  const sortedProjectIds = sortProjectIds(projectIds);

  return useQuery({
    queryKey: projectScheduleQueryKeys.multiProject(sortedProjectIds),
    queryFn: () =>
      getSchedulesForProjects(sortedProjectIds, {
        page: 1,
        limit: 100,
      }),
    enabled: (options?.enabled ?? true) && sortedProjectIds.length > 0,
    staleTime: 60_000,
  });
}

export function useMyAssignedProjectSchedules(
  params?: MyAssignedScheduleListParams,
  options?: { enabled?: boolean; fetchAll?: boolean; staleTime?: number },
) {
  const fetchAll = options?.fetchAll ?? false;

  return useQuery({
    queryKey: fetchAll ? projectScheduleQueryKeys.myAssignedAll(params) : projectScheduleQueryKeys.myAssigned(params),
    queryFn: () =>
      fetchAll ? getAllMyAssignedProjectSchedules(params) : getMyAssignedProjectSchedules(params),
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime,
  });
}

export function useProjectScheduleDetail(scheduleId?: string) {
  return useQuery({
    queryKey: projectScheduleQueryKeys.detail(scheduleId ?? ''),
    queryFn: () => getProjectScheduleById(scheduleId ?? ''),
    enabled: Boolean(scheduleId),
  });
}

export function useCreateProjectSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProjectScheduleInput) => createProjectSchedule(input),
    onSuccess: (data) => {
      invalidateProjectScheduleCaches(queryClient, data);
    },
  });
}

export function useUpdateProjectSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProjectScheduleInput) => updateProjectSchedule(input),
    onSuccess: (data) => {
      invalidateProjectScheduleCaches(queryClient, data);
    },
  });
}

export function useUpdateProjectScheduleStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProjectScheduleStatusInput) => updateProjectScheduleStatus(input),
    onSuccess: (data) => {
      invalidateProjectScheduleCaches(queryClient, data);
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useRequestProjectScheduleChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RequestProjectScheduleChangeInput) => requestProjectScheduleChange(input),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: projectScheduleQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: projectScheduleQueryKeys.detail(data.scheduleId) });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useDeleteProjectSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scheduleId: string) => deleteProjectSchedule(scheduleId),
    onSuccess: (data) => {
      invalidateProjectScheduleCaches(queryClient, {
        scheduleId: data.scheduleId,
        projectId: '',
      });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
