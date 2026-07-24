import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createCategory,
  getCategories,
  updateCategory,
  type CategoryListParams,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from '@/services/api/categories';

export const categoryQueryKeys = {
  all: ['categories'] as const,
  list: (params?: CategoryListParams) => ['categories', 'list', params] as const,
};

export function useCategoryList(params?: CategoryListParams) {
  return useQuery({
    queryKey: categoryQueryKeys.list(params),
    queryFn: () => getCategories(params),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCategoryInput) => createCategory(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateCategoryInput) => updateCategory(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
