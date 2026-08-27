import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createProjectArea,
  getProjectAreaFiles,
  getProjectAreas,
  updateProjectArea,
  uploadProjectAreaFile,
  type ProjectAreaFileListParams,
  type ProjectAreaListParams,
  type ProjectAreaWriteInput,
  type UpdateProjectAreaInput,
  type UploadProjectAreaFileInput,
} from '@/services/api/projectAreas';

export const projectAreaQueryKeys = {
  all: ['project-areas'] as const,
  byProject: (params: ProjectAreaListParams) => ['project-areas', 'project', params] as const,
  files: (params: ProjectAreaFileListParams) => ['project-areas', 'files', params] as const,
  filesRoot: ['project-areas', 'files'] as const,
};

export function useProjectAreas(params?: ProjectAreaListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: projectAreaQueryKeys.byProject(params ?? { projectId: '' }),
    queryFn: () => getProjectAreas(params as ProjectAreaListParams),
    enabled: Boolean(params?.projectId) && (options?.enabled ?? true),
  });
}

export function useProjectAreaFiles(params?: ProjectAreaFileListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: projectAreaQueryKeys.files(params ?? { projectAreaId: '' }),
    queryFn: () => getProjectAreaFiles(params as ProjectAreaFileListParams),
    enabled: Boolean(params?.projectAreaId) && (options?.enabled ?? true),
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

export function useUpdateProjectArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProjectAreaInput) => updateProjectArea(input),
    onSuccess: (area) => {
      void queryClient.invalidateQueries({ queryKey: projectAreaQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['project-areas', 'project'] });
      void queryClient.invalidateQueries({ queryKey: ['projects', 'detail', area.projectId] });
    },
  });
}

export function useUploadProjectAreaFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UploadProjectAreaFileInput) => uploadProjectAreaFile(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectAreaQueryKeys.filesRoot });
      void queryClient.invalidateQueries({ queryKey: ['proposal-scenes'] });
      void queryClient.invalidateQueries({ queryKey: ['room-planner-scenes'] });
    },
  });
}
