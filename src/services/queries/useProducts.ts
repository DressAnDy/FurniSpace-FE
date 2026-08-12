import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  activateProduct,
  activateProductVersion,
  archiveProduct,
  archiveProductVersion,
  archiveFile,
  createProduct,
  createProductVersion,
  deactivateProduct,
  deactivateProductVersion,
  deleteFile,
  deleteProductPreviewImage,
  getAdminCatalogProducts,
  getFilesByReference,
  getProductById,
  getProductPreviewImages,
  getProductVersionsByProduct,
  getProjectCatalogProduct,
  getProjectCatalogProducts,
  getProjectCatalogProductVersion,
  getProducts,
  reorderProductPreviewImages,
  restoreProduct,
  restoreProductVersion,
  setDefaultProductVersion,
  updateProduct,
  updateProductVersion,
  uploadProductPreviewFile,
  uploadProductVersionFile,
  type AdminCatalogQueryDto,
  type CreateProductInput,
  type CreateProductVersionInput,
  type FileReferenceListParams,
  type ProductListParams,
  type ProductVersionListQueryDto,
  type ProjectCatalogQueryDto,
  type ProductVersionFileType,
  type UpdateProductInput,
  type UpdateProductVersionInput,
} from '@/services/api/products';

export const productQueryKeys = {
  all: ['products'] as const,
  list: (params?: ProductListParams) => ['products', 'list', params] as const,
  infiniteList: (params?: ProductListParams) => ['products', 'infinite-list', params] as const,
  detail: (productId: string) => ['products', 'detail', productId] as const,
  adminCatalog: (params?: AdminCatalogQueryDto) => ['products', 'admin-catalog', params] as const,
  projectCatalog: (projectId: string, params?: ProjectCatalogQueryDto) => ['products', 'project-catalog', projectId, params] as const,
  projectCatalogProduct: (projectId: string, productId: string) => ['products', 'project-catalog', projectId, 'product', productId] as const,
  projectCatalogVersion: (projectId: string, productVersionId: string) => ['products', 'project-catalog', projectId, 'version', productVersionId] as const,
  versionsByProduct: (productId: string, params?: ProductVersionListQueryDto) => ['products', 'versions', productId, params] as const,
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

export function useInfiniteProductList(params?: ProductListParams, enabled = true) {
  const limit = params?.limit ?? 12;

  return useInfiniteQuery({
    queryKey: productQueryKeys.infiniteList({ ...params, limit }),
    queryFn: ({ pageParam }) => getProducts({ ...params, page: pageParam, limit }),
    initialPageParam: params?.page ?? 1,
    enabled,
    getNextPageParam: (lastPage) => {
      const loadedCount = lastPage.page * lastPage.limit;

      return loadedCount < lastPage.total ? lastPage.page + 1 : undefined;
    },
  });
}

export function useProductDetail(productId?: string, enabled = true) {
  return useQuery({
    queryKey: productQueryKeys.detail(productId ?? ''),
    queryFn: () => getProductById(productId ?? ''),
    enabled: Boolean(productId) && enabled,
  });
}

export function useProjectCatalogProducts(projectId?: string, params?: ProjectCatalogQueryDto, enabled = true) {
  return useQuery({
    queryKey: productQueryKeys.projectCatalog(projectId ?? '', params),
    queryFn: () => getProjectCatalogProducts({ projectId: projectId ?? '', params }),
    enabled: Boolean(projectId) && enabled,
  });
}

export function useProjectCatalogProduct(projectId?: string, productId?: string, enabled = true) {
  return useQuery({
    queryKey: productQueryKeys.projectCatalogProduct(projectId ?? '', productId ?? ''),
    queryFn: () => getProjectCatalogProduct(productId ?? '', projectId ?? ''),
    enabled: Boolean(projectId && productId) && enabled,
  });
}

export function useProjectCatalogProductVersion(projectId?: string, productVersionId?: string, enabled = true) {
  return useQuery({
    queryKey: productQueryKeys.projectCatalogVersion(projectId ?? '', productVersionId ?? ''),
    queryFn: () => getProjectCatalogProductVersion({ projectId: projectId ?? '', productVersionId: productVersionId ?? '' }),
    enabled: Boolean(projectId && productVersionId) && enabled,
  });
}

export function useAdminCatalogProducts(params?: AdminCatalogQueryDto, enabled = true) {
  return useQuery({
    queryKey: productQueryKeys.adminCatalog(params),
    queryFn: () => getAdminCatalogProducts(params),
    enabled,
  });
}

export function useProductVersionsByProduct(productId?: string, params?: ProductVersionListQueryDto, enabled = true) {
  return useQuery({
    queryKey: productQueryKeys.versionsByProduct(productId ?? '', params),
    queryFn: () => getProductVersionsByProduct({ productId: productId ?? '', params }),
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

export function useUpdateProductLifecycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { action: 'activate' | 'deactivate' | 'archive' | 'restore'; productId: string }) => {
      if (input.action === 'activate') return activateProduct(input.productId);
      if (input.action === 'deactivate') return deactivateProduct(input.productId);
      if (input.action === 'archive') return archiveProduct(input.productId);
      return restoreProduct(input.productId);
    },
    onSuccess: (product) => {
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.detail(product.productId) });
    },
  });
}

export function useUpdateProductVersionLifecycle(productId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { action: 'activate' | 'deactivate' | 'archive' | 'restore'; productVersionId: string }) => {
      if (input.action === 'activate') return activateProductVersion(input.productVersionId);
      if (input.action === 'deactivate') return deactivateProductVersion(input.productVersionId);
      if (input.action === 'archive') return archiveProductVersion(input.productVersionId);
      return restoreProductVersion(input.productVersionId);
    },
    onSuccess: (version) => {
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.versionsByProduct(version.productId) });
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.detail(productId ?? version.productId) });
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
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.all });
      void queryClient.invalidateQueries({
        queryKey: productQueryKeys.filesByReference({
          referenceId: input.productVersionId,
          referenceType: 'PRODUCT_VERSION',
        }),
      });

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
