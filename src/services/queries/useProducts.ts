import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createProduct,
  createProductVersion,
  getProductById,
  getProducts,
  setDefaultProductVersion,
  type CreateProductInput,
  type CreateProductVersionInput,
  type ProductListParams,
} from '@/services/api/products';

export const productQueryKeys = {
  all: ['products'] as const,
  list: (params?: ProductListParams) => ['products', 'list', params] as const,
  detail: (productId: string) => ['products', 'detail', productId] as const,
};

export function useProductList(params?: ProductListParams) {
  return useQuery({
    queryKey: productQueryKeys.list(params),
    queryFn: () => getProducts(params),
  });
}

export function useProductDetail(productId?: string) {
  return useQuery({
    queryKey: productQueryKeys.detail(productId ?? ''),
    queryFn: () => getProductById(productId ?? ''),
    enabled: Boolean(productId),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProductInput) => createProduct(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.all });
    },
  });
}

export function useCreateProductVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProductVersionInput) => createProductVersion(input),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.detail(data.productId) });
    },
  });
}

export function useSetDefaultProductVersion(productId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productVersionId: string) => setDefaultProductVersion(productVersionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.all });

      if (productId) {
        void queryClient.invalidateQueries({ queryKey: productQueryKeys.detail(productId) });
      }
    },
  });
}
