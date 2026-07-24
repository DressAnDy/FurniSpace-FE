import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createProjectArea,
  getProjectAreas,
  type ProjectAreaListParams,
  type ProjectAreaWriteInput,
} from '@/services/api/projectAreas';

export const projectAreaQueryKeys = {
  all: ['project-areas'] as const,
  byProject: (params: ProjectAreaListParams) => ['project-areas', 'project', params] as const,
};

export function useProjectAreas(params?: ProjectAreaListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: projectAreaQueryKeys.byProject(params ?? { projectId: '' }),
    queryFn: () => getProjectAreas(params as ProjectAreaListParams),
    enabled: Boolean(params?.projectId) && (options?.enabled ?? true),
  });
}

export function useCreateProjectArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProjectAreaWriteInput) => createProjectArea(input),
    onSuccess: (area) => {
      void queryClient.invalidateQueries({ queryKey: projectAreaQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['project-areas', 'project'] });
      void queryClient.invalidateQueries({ queryKey: ['projects', 'detail', area.projectId] });
    },
  });
}
