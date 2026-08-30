import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  archiveProjectShowcase,
  createProjectShowcase,
  createProjectShowcaseMedia,
  deleteProjectShowcaseMedia,
  getProjectShowcase,
  getPublicShowcase,
  getPublicShowcases,
  publishProjectShowcase,
  reorderProjectShowcaseMedia,
  setProjectShowcaseMediaCover,
  submitProjectShowcase,
  updateProjectReviewPublicConsent,
  updateProjectShowcase,
  uploadProjectShowcaseMedia,
  type CreateProjectShowcaseInput,
  type CreateProjectShowcaseMediaInput,
  type ReorderProjectShowcaseMediaInput,
  type UpdateProjectShowcaseInput,
  type UploadProjectShowcaseMediaInput,
} from '@/services/api/showcases';

export const showcaseQueryKeys = {
  all: ['showcases'] as const,
  project: (projectId: string) => ['showcases', 'project', projectId] as const,
  publicList: (params?: { page?: number; pageSize?: number }) => ['showcases', 'public-list', params] as const,
  publicDetail: (slug: string) => ['showcases', 'public-detail', slug] as const,
};

export function useProjectShowcase(projectId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: showcaseQueryKeys.project(projectId ?? ''),
    queryFn: () => getProjectShowcase(projectId ?? ''),
    enabled: Boolean(projectId) && (options?.enabled ?? true),
    retry: false,
  });
}

export function usePublicShowcases(params?: { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: showcaseQueryKeys.publicList(params),
    queryFn: () => getPublicShowcases(params),
  });
}

export function usePublicShowcase(slug?: string) {
  return useQuery({
    queryKey: showcaseQueryKeys.publicDetail(slug ?? ''),
    queryFn: () => getPublicShowcase(slug ?? ''),
    enabled: Boolean(slug),
  });
}

export function useCreateProjectShowcase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: string | CreateProjectShowcaseInput) => createProjectShowcase(input),
    onSuccess: (showcase) => {
      invalidateShowcaseCaches(queryClient, showcase.projectId);
    },
  });
}

export function useUpdateProjectShowcase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProjectShowcaseInput) => updateProjectShowcase(input),
    onSuccess: (showcase) => {
      invalidateShowcaseCaches(queryClient, showcase.projectId);
    },
  });
}

export function useSubmitProjectShowcase() {
  return useShowcaseAction(submitProjectShowcase);
}

export function usePublishProjectShowcase() {
  return useShowcaseAction(publishProjectShowcase);
}

export function useArchiveProjectShowcase() {
  return useShowcaseAction(archiveProjectShowcase);
}

export function useCreateProjectShowcaseMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProjectShowcaseMediaInput) => createProjectShowcaseMedia(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: showcaseQueryKeys.all });
    },
  });
}

export function useUploadProjectShowcaseMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UploadProjectShowcaseMediaInput) => uploadProjectShowcaseMedia(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: showcaseQueryKeys.all });
    },
  });
}

export function useDeleteProjectShowcaseMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { showcaseId: string; showcaseMediaId: string }) => deleteProjectShowcaseMedia(input.showcaseId, input.showcaseMediaId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: showcaseQueryKeys.all });
    },
  });
}

export function useReorderProjectShowcaseMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReorderProjectShowcaseMediaInput) => reorderProjectShowcaseMedia(input),
    onSuccess: (showcase) => {
      invalidateShowcaseCaches(queryClient, showcase.projectId);
    },
  });
}

export function useSetProjectShowcaseMediaCover() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { showcaseId: string; showcaseMediaId: string }) =>
      setProjectShowcaseMediaCover(input.showcaseId, input.showcaseMediaId),
    onSuccess: (showcase) => {
      invalidateShowcaseCaches(queryClient, showcase.projectId);
    },
  });
}

export function useUpdateProjectReviewPublicConsent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { allowPublicDisplay: boolean; reviewId: string }) =>
      updateProjectReviewPublicConsent(input.reviewId, input.allowPublicDisplay),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: showcaseQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

function useShowcaseAction(action: (showcaseId: string) => Promise<{ projectId?: string | null }>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (showcaseId: string) => action(showcaseId),
    onSuccess: (showcase) => {
      invalidateShowcaseCaches(queryClient, showcase.projectId);
    },
  });
}

function invalidateShowcaseCaches(queryClient: ReturnType<typeof useQueryClient>, projectId?: string | null) {
  void queryClient.invalidateQueries({ queryKey: showcaseQueryKeys.all });
  void queryClient.invalidateQueries({ queryKey: ['projects'] });

  if (projectId) {
    void queryClient.invalidateQueries({ queryKey: showcaseQueryKeys.project(projectId) });
  }
}
