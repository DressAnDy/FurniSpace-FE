import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createProductIssue,
  getOrderProductIssues,
  getProductIssue,
  getProjectProductIssues,
  resolveProductIssue,
  type CreateProductIssueInput,
  type ResolveProductIssueInput,
} from '@/services/api/productIssues';

export const productIssueQueryKeys = {
  all: ['product-issues'] as const,
  order: (orderId: string) => ['product-issues', 'order', orderId] as const,
  project: (projectId: string) => ['product-issues', 'project', projectId] as const,
  detail: (issueId: string) => ['product-issues', 'detail', issueId] as const,
};

export function useOrderProductIssues(orderId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: productIssueQueryKeys.order(orderId ?? ''),
    queryFn: () => getOrderProductIssues(orderId ?? ''),
    enabled: Boolean(orderId) && (options?.enabled ?? true),
  });
}

export function useProjectProductIssues(projectId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: productIssueQueryKeys.project(projectId ?? ''),
    queryFn: () => getProjectProductIssues(projectId ?? ''),
    enabled: Boolean(projectId) && (options?.enabled ?? true),
  });
}

export function useProductIssue(issueId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: productIssueQueryKeys.detail(issueId ?? ''),
    queryFn: () => getProductIssue(issueId ?? ''),
    enabled: Boolean(issueId) && (options?.enabled ?? true),
  });
}

export function useCreateProductIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProductIssueInput) => createProductIssue(input),
    onSuccess: (issue, input) => {
      void queryClient.invalidateQueries({ queryKey: productIssueQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: productIssueQueryKeys.order(input.orderId) });
      void queryClient.invalidateQueries({ queryKey: productIssueQueryKeys.project(issue.projectId) });
      void queryClient.invalidateQueries({
        queryKey: productIssueQueryKeys.detail(issue.deliveryProductIssueReportId),
      });
    },
  });
}

export function useResolveProductIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ResolveProductIssueInput) => resolveProductIssue(input),
    onSuccess: (issue) => {
      const resolvedIssue = {
        ...issue,
        status: issue.status ?? 'RESOLVED',
        resolvedAt: issue.resolvedAt ?? new Date().toISOString(),
      };

      queryClient.setQueriesData<{ items: typeof issue[] }>(
        { queryKey: productIssueQueryKeys.all },
        (current) => {
          if (!current?.items) {
            return current;
          }

          return {
            ...current,
            items: current.items.map((item) =>
              item.deliveryProductIssueReportId === resolvedIssue.deliveryProductIssueReportId
                ? { ...item, ...resolvedIssue }
                : item,
            ),
          };
        },
      );
      queryClient.setQueryData(
        productIssueQueryKeys.detail(resolvedIssue.deliveryProductIssueReportId),
        resolvedIssue,
      );

      void queryClient.invalidateQueries({ queryKey: productIssueQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: productIssueQueryKeys.order(issue.orderId) });
      void queryClient.invalidateQueries({ queryKey: productIssueQueryKeys.project(issue.projectId) });
      void queryClient.invalidateQueries({
        queryKey: productIssueQueryKeys.detail(issue.deliveryProductIssueReportId),
      });
    },
  });
}
