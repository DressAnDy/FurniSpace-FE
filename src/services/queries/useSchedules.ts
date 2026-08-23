import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createProjectSchedule,
  deleteProjectSchedule,
  getMyAssignedProjectSchedules,
  getProjectScheduleById,
  getProjectSchedules,
  updateProjectSchedule,
  updateProjectScheduleStatus,
  type CreateProjectScheduleInput,
  type MyAssignedScheduleListParams,
  type ProjectScheduleListParams,
  type UpdateProjectScheduleInput,
  type UpdateProjectScheduleStatusInput,
} from '@/services/api/schedules';

export const projectScheduleQueryKeys = {
  all: ['project-schedules'] as const,
  list: (params?: ProjectScheduleListParams) => ['project-schedules', 'list', params] as const,
  myAssigned: (params?: MyAssignedScheduleListParams) => ['project-schedules', 'my-assigned', params] as const,
  detail: (scheduleId: string) => ['project-schedules', 'detail', scheduleId] as const,
};

export function useProjectScheduleList(params?: ProjectScheduleListParams) {
  return useQuery({
    queryKey: projectScheduleQueryKeys.list(params),
    queryFn: () => getProjectSchedules(params as ProjectScheduleListParams),
    enabled: Boolean(params?.projectId?.trim()),
  });
}

export function useMyAssignedProjectSchedules(params?: MyAssignedScheduleListParams) {
  return useQuery({
    queryKey: projectScheduleQueryKeys.myAssigned(params),
    queryFn: () => getMyAssignedProjectSchedules(params),
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
      void queryClient.invalidateQueries({ queryKey: projectScheduleQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: projectScheduleQueryKeys.detail(data.scheduleId) });
    },
  });
}

export function useUpdateProjectSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProjectScheduleInput) => updateProjectSchedule(input),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: projectScheduleQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: projectScheduleQueryKeys.detail(data.scheduleId) });
    },
  });
}

export function useUpdateProjectScheduleStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProjectScheduleStatusInput) => updateProjectScheduleStatus(input),
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
      void queryClient.invalidateQueries({ queryKey: projectScheduleQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: projectScheduleQueryKeys.detail(data.scheduleId) });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
