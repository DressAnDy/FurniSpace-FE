import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  archiveFile,
  createProduct,
  createProductVersion,
  deleteFile,
  deleteProductPreviewImage,
  getFilesByReference,
  getProductById,
  getProductPreviewImages,
  getProducts,
  reorderProductPreviewImages,
  setDefaultProductVersion,
  updateProduct,
  updateProductVersion,
  uploadProductPreviewFile,
  uploadProductVersionFile,
  type CreateProductInput,
  type CreateProductVersionInput,
  type FileReferenceListParams,
  type ProductListParams,
  type ProductVersionFileType,
  type UpdateProductInput,
  type UpdateProductVersionInput,
} from '@/services/api/products';

export const productQueryKeys = {
  all: ['products'] as const,
  list: (params?: ProductListParams) => ['products', 'list', params] as const,
  detail: (productId: string) => ['products', 'detail', productId] as const,
  previewImages: (productId: string) => ['products', 'preview-images', productId] as const,
  filesByReference: (params: FileReferenceListParams) => ['products', 'files-by-reference', params] as const,
};

export function useProductList(params?: ProductListParams, enabled = true) {
  return useQuery({
    queryKey: productQueryKeys.list(params),
    queryFn: () => getProducts(params),
    enabled,
  });
}

export function useProductDetail(productId?: string, enabled = true) {
  return useQuery({
    queryKey: productQueryKeys.detail(productId ?? ''),
    queryFn: () => getProductById(productId ?? ''),
    enabled: Boolean(productId) && enabled,
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

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProductInput) => updateProduct(input),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.detail(data.productId) });
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

export function useUpdateProductVersion(productId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProductVersionInput) => updateProductVersion(input),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.detail(productId ?? data.productId) });
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

export function useFilesByReference(params?: FileReferenceListParams, enabled = true) {
  return useQuery({
    queryKey: productQueryKeys.filesByReference(
      params ?? {
        referenceType: 'PRODUCT',
        referenceId: '',
      },
    ),
    queryFn: () => getFilesByReference(params as FileReferenceListParams),
    enabled: Boolean(params?.referenceId) && enabled,
  });
}

export function useProductPreviewImages(productId?: string) {
  return useQuery({
    queryKey: productQueryKeys.previewImages(productId ?? ''),
    queryFn: () => getProductPreviewImages(productId ?? ''),
    enabled: Boolean(productId),
  });
}

export function useUploadProductPreviewFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      productId: string;
      file: File;
      description?: string | null;
      displayOrder?: number;
      onUploadProgress?: (progressPercent: number) => void;
    }) =>
      uploadProductPreviewFile(input.productId, input.file, {
        description: input.description,
        displayOrder: input.displayOrder,
        onUploadProgress: input.onUploadProgress,
      }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.detail(variables.productId) });
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.previewImages(variables.productId) });
    },
  });
}

export function useReorderProductPreviewImages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { productId: string; fileIds: string[] }) => reorderProductPreviewImages(input.productId, input.fileIds),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.detail(data.productId) });
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.previewImages(data.productId) });
    },
  });
}

export function useDeleteProductPreviewImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { productId: string; fileId: string }) => deleteProductPreviewImage(input.productId, input.fileId),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.detail(data.productId) });
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.previewImages(data.productId) });
    },
  });
}

export function useUploadProductVersionFile(productId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      description?: string | null;
      file: File;
      fileType?: ProductVersionFileType;
      productVersionId: string;
      skipAuthRedirect?: boolean;
    }) =>
      uploadProductVersionFile(
        input.productVersionId,
        input.file,
        input.fileType,
        input.description,
        { skipAuthRedirect: input.skipAuthRedirect },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.all });

      if (productId) {
        void queryClient.invalidateQueries({ queryKey: productQueryKeys.detail(productId) });
      }
    },
  });
}

export function useArchiveFile(productId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileId: string) => archiveFile(fileId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.all });

      if (productId) {
        void queryClient.invalidateQueries({ queryKey: productQueryKeys.detail(productId) });
      }
    },
  });
}

export function useDeleteFile(productId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileId: string) => deleteFile(fileId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.all });

      if (productId) {
        void queryClient.invalidateQueries({ queryKey: productQueryKeys.detail(productId) });
      }
    },
  });
}
