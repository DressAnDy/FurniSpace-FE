import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  assignDesignerToProject,
  assignSalesToProject,
  createProject,
  getAdminProjectWorkflow,
  getProjectById,
  getProjectFiles,
  getProjects,
  requestProjectInformation,
  updateProjectStatus,
  updateProjectBasicInformation,
  uploadProjectFile,
  type CreateProjectInput,
  type AssignDesignerInput,
  type ProjectInformationRequestInput,
  type ProjectListParams,
  type ProjectListItemDto,
  type ProjectFileListParams,
  type FileType,
  type FileVisibility,
  type UpdateProjectBasicInformationInput,
  type UpdateProjectStatusInput,
} from '@/services/api/projects';
import { projectChatQueryKeys } from './useProjectChats';

export const projectQueryKeys = {
  all: ['projects'] as const,
  list: (params?: ProjectListParams) => ['projects', 'list', params] as const,
  detail: (projectId: string) => ['projects', 'detail', projectId] as const,
  workflow: (projectId: string) => ['projects', 'workflow', projectId] as const,
  files: (params: ProjectFileListParams) => ['projects', 'files', params] as const,
  staffQueue: (params?: Pick<ProjectListParams, 'search' | 'page' | 'limit'>) => ['projects', 'staff-queue', params] as const,
};

export function useProjectList(params?: ProjectListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: projectQueryKeys.list(params),
    queryFn: () => getProjects(params),
    enabled: options?.enabled ?? true,
  });
}

export function useProjectDetail(projectId?: string) {
  return useQuery({
    queryKey: projectQueryKeys.detail(projectId ?? ''),
    queryFn: () => getProjectById(projectId ?? ''),
    enabled: Boolean(projectId),
  });
}

export function useAdminProjectWorkflow(projectId?: string) {
  return useQuery({
    queryKey: projectQueryKeys.workflow(projectId ?? ''),
    queryFn: () => getAdminProjectWorkflow(projectId ?? ''),
    enabled: Boolean(projectId),
  });
}

export function useProjectFiles(params?: ProjectFileListParams) {
  return useQuery({
    queryKey: projectQueryKeys.files(
      params ?? {
        projectId: '',
      },
    ),
    queryFn: () => getProjectFiles(params as ProjectFileListParams),
    enabled: Boolean(params?.projectId),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProjectInput) => createProject(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
    },
  });
}

export function useUploadProjectFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      projectId: string;
      file: File;
      fileType?: FileType;
      visibility?: FileVisibility;
      note?: string | null;
    }) =>
      uploadProjectFile(input.projectId, input.file, {
        fileType: input.fileType,
        visibility: input.visibility,
        note: input.note,
      }),
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'projects' &&
          query.queryKey[1] === 'files' &&
          typeof query.queryKey[2] === 'object' &&
          query.queryKey[2] !== null &&
          'projectId' in query.queryKey[2] &&
          query.queryKey[2].projectId === input.projectId,
      });
    },
  });
}

export function useUpdateProjectBasicInformation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProjectBasicInformationInput) => updateProjectBasicInformation(input),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.detail(data.projectId) });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useRequestProjectInformation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProjectInformationRequestInput) => requestProjectInformation(input),
    onSuccess: (data, input) => {
      const projectId = data?.projectId ?? input.projectId;

      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.detail(projectId) });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useAssignSalesToProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { projectId: string; note?: string | null }) => assignSalesToProject(input.projectId, input.note),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.detail(data.projectId) });
      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.workflow(data.projectId) });
      void queryClient.invalidateQueries({ queryKey: projectChatQueryKeys.all });
    },
  });
}

export function useAssignDesignerToProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AssignDesignerInput) => assignDesignerToProject(input),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.detail(data.projectId) });
      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.workflow(data.projectId) });
      void queryClient.invalidateQueries({ queryKey: projectChatQueryKeys.all });
    },
  });
}

export function useUpdateProjectStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProjectStatusInput) => updateProjectStatus(input),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.detail(data.projectId) });
      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.workflow(data.projectId) });
      void queryClient.invalidateQueries({ queryKey: projectChatQueryKeys.all });
    },
  });
}

export function useStaffProjectQueue(params?: Pick<ProjectListParams, 'search' | 'page' | 'limit'>) {
  return useQuery({
    queryKey: projectQueryKeys.staffQueue(params),
    queryFn: async () => {
      const result = await getProjects({
        status: 'SUBMITTED',
        search: params?.search,
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
      });

      return {
        items: sortProjectsBySubmittedDate(result.items),
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        total: result.total,
      };
    },
  });
}

function sortProjectsBySubmittedDate(items: ProjectListItemDto[]) {
  return [...items].sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime());
}
