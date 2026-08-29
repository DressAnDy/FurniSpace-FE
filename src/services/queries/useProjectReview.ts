import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createProjectReview,
  getProjectReview,
  type CreateProjectReviewInput,
} from '@/services/api/projectReview';

export const projectReviewQueryKeys = {
  detail: (projectId: string) => ['project-review', projectId] as const,
};

export function useProjectReview(projectId: string | null | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: projectReviewQueryKeys.detail(projectId ?? ''),
    queryFn: () => getProjectReview(projectId!),
    enabled: (options?.enabled ?? true) && Boolean(projectId),
  });
}

export function useCreateProjectReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProjectReviewInput & { projectId: string }) =>
      createProjectReview(input.projectId, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: projectReviewQueryKeys.detail(variables.projectId) });
    },
  });
}
