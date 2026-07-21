import axios, { AxiosError } from 'axios';

import { getStoredAccessToken } from './tokenStore';

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipAuth?: boolean;
    skipAuthRedirect?: boolean;
  }
}

const productApiClient = axios.create({
  baseURL: getProductApiBaseUrl(),
  withCredentials: true,
});

productApiClient.interceptors.request.use((config) => {
  const token = getStoredAccessToken();
  const shouldSkipAuth = Boolean((config as { skipAuth?: boolean }).skipAuth);

  if (token && !shouldSkipAuth) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.data instanceof FormData) {
    clearMultipartContentType(config.headers);
  }

  return config;
});

productApiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const shouldSkipAuthRedirect = Boolean(
      (error.config as { skipAuthRedirect?: boolean } | undefined)?.skipAuthRedirect,
    );

    if (error.response?.status === 401 && !shouldSkipAuthRedirect && window.location.pathname !== '/login') {
      window.location.assign('/login');
    }

    return Promise.reject(error);
  },
);

export type ServiceResult<T> = {
  status: number;
  message?: string;
  data: T;
  errors?: string[];
  errorCode?: string;
};

export type ProductPreviewImageDto = {
  fileId: string;
  url: string;
  displayOrder: number;
  fileType: 'PRODUCT_PREVIEW';
  description: string | null;
  mimeType: string;
  fileSizeBytes: number;
  isCover: boolean;
  createdAt: string;
};

export type ProductPreviewImagesListData = {
  productId: string;
  items: ProductPreviewImageDto[];
};

export type ProductPreviewImageUploadDto = {
  fileId: string;
  url: string;
  displayOrder: number;
  fileType: 'PRODUCT_PREVIEW';
  description: string | null;
  createdAt: string;
};

export type DeleteProductPreviewImageData = {
  fileId: string;
  productId: string;
  deletedAt: string;
};

export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type ProductVersionType = 'STANDARD' | 'CUSTOM' | 'PROJECT_SPECIFIC';
export type FileReferenceType =
  | 'PROJECT'
  | 'PROJECT_SCHEDULE'
  | 'PROPOSAL'
  | 'QUOTATION'
  | 'ORDER'
  | 'PRODUCT'
  | 'PRODUCT_VERSION';
export type ProductFileType = 'PRODUCT_PREVIEW';
export type ProductVersionFileType = 'PRODUCT_PREVIEW' | 'MODEL_3D' | 'TEXTURE';
export type FileType =
  | ProductFileType
  | ProductVersionFileType
  | 'SPACE_IMAGE'
  | 'FLOOR_PLAN'
  | 'REFERENCE_IMAGE'
  | 'BRAND_ASSET'
  | 'CAD_FILE'
  | 'PDF_DRAWING'
  | 'MEASUREMENT_REPORT'
  | 'LIDAR_SCAN'
  | 'PROPOSAL_PREVIEW'
  | 'PROPOSAL_FILE'
  | 'QUOTATION_FILE'
  | 'ORDER_DOCUMENT'
  | 'PRODUCTION_FILE'
  | 'DELIVERY_PHOTO'
  | 'DELIVERY_NOTE'
  | 'REVIEW_IMAGE'
  | 'OTHER';
export type FileVisibility = 'CUSTOMER_VISIBLE' | 'STAFF_ONLY' | 'PRIVATE';
export type FileStatus = 'ACTIVE' | 'ARCHIVED';

export type CatalogFileDto = {
  fileId: string;
  fileLinkId: string;
  fileType: FileType;
  originalFileName: string;
  fileUrl: string;
  mimeType: string;
  fileSizeBytes: number;
};

export type CatalogFileUploadResponseDto = {
  fileId: string;
  fileLinkId: string;
  referenceType: FileReferenceType;
  referenceId: string;
  originalFileName: string;
  fileType: FileType;
  fileUrl: string;
  mimeType: string;
  fileSizeBytes: number;
  visibility: FileVisibility;
  uploadedBy: string;
  uploadedAt: string;
};

export type FileListItemDto = {
  fileId: string;
  fileLinkId: string;
  originalFileName: string;
  fileType: FileType;
  mimeType: string;
  fileSize: number;
  publicUrl: string;
  visibility: FileVisibility;
  uploadedBy: string;
  uploadedAt: string;
};

export type FileDetailDto = {
  fileId: string;
  originalFileName: string;
  fileName: string;
  fileType: FileType;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  publicUrl: string;
  uploadedBy: string;
  uploadedAt: string;
  status: FileStatus;
};

export type FileReferenceListData = {
  referenceType: FileReferenceType;
  referenceId: string;
  items: FileListItemDto[];
  page: number;
  limit: number;
  total: number;
};

export type FileReferenceListParams = {
  referenceType: FileReferenceType;
  referenceId: string;
  fileType?: FileType | null;
  visibility?: FileVisibility | null;
  page?: number;
  limit?: number;
};

export type ArchiveFileData = {
  fileId: string;
  status: FileStatus;
  archivedAt: string;
};

export type DeleteFileData = {
  fileId: string;
  deletedAt: string;
};

export type ProductVersionDto = {
  productVersionId: string;
  productId: string;
  versionCode: string;
  versionName: string;
  versionType: ProductVersionType;
  material: string | null;
  color: string | null;
  width: number | null;
  height: number | null;
  depth: number | null;
  estimatedPrice: number | null;
  isDefault: boolean;
  isPublic: boolean;
  isProjectSpecific: boolean;
  status: ProductStatus;
  thumbnail: CatalogFileDto | null;
  files: CatalogFileDto[];
};

export type ProductListItemDto = {
  productId: string;
  categoryId: string;
  categoryName: string;
  productCode: string | null;
  productName: string;
  description: string | null;
  status: ProductStatus;
  thumbnail: CatalogFileDto | null;
  defaultVersion: ProductVersionDto | null;
};

export type ProductDetailDto = ProductListItemDto & {
  files: CatalogFileDto[];
  versions: ProductVersionDto[];
};

export type ProductDto = {
  productId: string;
  categoryId: string;
  productCode: string | null;
  productName: string;
  description: string | null;
  status: ProductStatus;
};

export type ProductListData = {
  items: ProductListItemDto[];
  page: number;
  limit: number;
  total: number;
};

export type ProductListParams = {
  page?: number;
  limit?: number;
};

export type RequestBehaviorOptions = {
  skipAuth?: boolean;
  skipAuthRedirect?: boolean;
};

export type CreateProductInput = {
  categoryId: string;
  productCode?: string | null;
  productName: string;
  description?: string | null;
};

export type UpdateProductInput = {
  productId: string;
  categoryId: string;
  productName: string;
  description?: string | null;
};

export type CreateProductVersionInput = {
  productId: string;
  versionCode: string;
  versionName: string;
  versionType?: ProductVersionType;
  material?: string | null;
  color?: string | null;
  width?: number | null;
  height?: number | null;
  depth?: number | null;
  estimatedPrice?: number | null;
  isDefault?: boolean;
  isPublic?: boolean;
  isProjectSpecific?: boolean;
};

export type UpdateProductVersionInput = Omit<CreateProductVersionInput, 'productId' | 'versionCode'> & {
  productVersionId: string;
};

export type SetDefaultProductVersionData = {
  productVersionId: string;
  productId: string;
  isDefault: boolean;
};

const PRODUCT_PREVIEW_ERROR_MESSAGES: Record<string, string> = {
  MAX_FILES_EXCEEDED: 'A product can have at most 5 preview images.',
  INVALID_FILE_TYPE: 'Invalid image type. Supported: JPEG, PNG, WebP, GIF, SVG.',
  FILE_TOO_LARGE: 'Image exceeds the maximum size of 5MB.',
  INVALID_REORDER_PAYLOAD: 'Could not reorder preview images. Please refresh and try again.',
  PREVIEW_FILE_NOT_FOUND: 'Preview image not found.',
  USE_PREVIEW_FILES_ENDPOINT: 'Preview images must use the dedicated preview-files endpoint.',
};

export function getProductServiceResultMessage(error: unknown) {
  const result = getProductServiceResultFromError(error);

  if (!result) {
    return 'Cannot connect to product API. Please check backend and VITE_API_URL.';
  }

  if (result.errorCode && PRODUCT_PREVIEW_ERROR_MESSAGES[result.errorCode]) {
    return PRODUCT_PREVIEW_ERROR_MESSAGES[result.errorCode];
  }

  if (result.errors?.length) {
    return result.errors.join('\n');
  }

  return result.message || 'Request failed. Please try again.';
}

export function getProductServiceResultFromError(error: unknown) {
  if (!(error instanceof AxiosError)) {
    return null;
  }

  const data = error.response?.data;

  if (data && typeof data === 'object' && 'status' in data) {
    const result = data as ServiceResult<unknown> & {
      correlationId?: string;
      detail?: string;
      title?: string;
    };

    return {
      ...result,
      message: formatProblemDetailsMessage(result),
    };
  }

  if (data && typeof data === 'object') {
    const fallback = data as {
      correlationId?: string;
      detail?: string;
      errorCode?: string;
      errors?: string[] | Record<string, string[]>;
      message?: string;
      title?: string;
    };

    return {
      status: error.response?.status ?? 500,
      message: formatProblemDetailsMessage(fallback),
      errorCode: fallback.errorCode,
      errors: Array.isArray(fallback.errors)
        ? fallback.errors
        : fallback.errors
          ? Object.values(fallback.errors).flat()
          : undefined,
      data: null as unknown,
    };
  }

  if (error.message) {
    return {
      status: error.response?.status ?? 500,
      message: error.message,
      data: null as unknown,
    };
  }

  return null;
}

function formatProblemDetailsMessage(problem: { correlationId?: string; detail?: string; message?: string; title?: string }) {
  return [
    problem.message ?? problem.title,
    problem.detail,
    problem.correlationId ? `Correlation ID: ${problem.correlationId}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export function normalizeOptionalText(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeRequiredText(value: FormDataEntryValue | string | null | undefined) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeOptionalNumber(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

export function generateProductVersionCode(productCode: string | null | undefined) {
  const baseCode = productCode?.trim() || 'PRODUCT';
  const suffix = Date.now().toString(36).toUpperCase();

  return `${baseCode}-V-${suffix}`.slice(0, 50);
}

export async function getProducts(params: ProductListParams = {}) {
  const response = await productApiClient.get<ServiceResult<ProductListData>>('/products', {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
    skipAuth: true,
    skipAuthRedirect: true,
    withCredentials: false,
  });

  return response.data.data;
}

export async function getProductById(productId: string) {
  const response = await productApiClient.get<ServiceResult<ProductDetailDto>>(`/products/${productId}`, {
    skipAuth: true,
    skipAuthRedirect: true,
    withCredentials: false,
  });

  return response.data.data;
}

export async function createProduct(input: CreateProductInput) {
  const response = await productApiClient.post<ServiceResult<ProductDto>>('/products', {
    categoryId: input.categoryId,
    productCode: input.productCode?.trim() || null,
    productName: input.productName.trim(),
    description: input.description?.trim() || null,
  });

  return response.data.data;
}

export async function updateProduct(input: UpdateProductInput) {
  const response = await productApiClient.patch<ServiceResult<ProductDto>>(`/products/${input.productId}`, {
    categoryId: input.categoryId,
    productName: input.productName.trim(),
    description: input.description?.trim() || null,
  });

  return response.data.data;
}

export async function createProductVersion(input: CreateProductVersionInput) {
  const response = await productApiClient.post<ServiceResult<ProductVersionDto>>(`/api/ProductVersions/products/${input.productId}/versions`, {
    versionCode: input.versionCode.trim(),
    versionName: input.versionName.trim(),
    versionType: input.versionType ?? 'STANDARD',
    material: input.material?.trim() || null,
    color: input.color?.trim() || null,
    width: input.width ?? null,
    height: input.height ?? null,
    depth: input.depth ?? null,
    estimatedPrice: input.estimatedPrice ?? null,
    isDefault: input.isDefault ?? false,
    isPublic: input.isPublic ?? true,
    isProjectSpecific: input.isProjectSpecific ?? false,
  });

  return response.data.data;
}

export async function updateProductVersion(input: UpdateProductVersionInput) {
  const response = await productApiClient.patch<ServiceResult<ProductVersionDto>>(`/api/ProductVersions/product-versions/${input.productVersionId}`, {
    versionName: input.versionName.trim(),
    versionType: input.versionType ?? 'STANDARD',
    material: input.material?.trim() || null,
    color: input.color?.trim() || null,
    width: input.width ?? null,
    height: input.height ?? null,
    depth: input.depth ?? null,
    estimatedPrice: input.estimatedPrice ?? null,
    isDefault: input.isDefault ?? false,
    isPublic: input.isPublic ?? true,
    isProjectSpecific: input.isProjectSpecific ?? false,
  });

  return response.data.data;
}

export async function setDefaultProductVersion(productVersionId: string) {
  const response = await productApiClient.patch<ServiceResult<SetDefaultProductVersionData>>(`/api/ProductVersions/product-versions/${productVersionId}/set-default`);

  return response.data.data;
}

export async function getProductPreviewImages(productId: string) {
  const response = await productApiClient.get<ServiceResult<ProductPreviewImagesListData>>(`/products/${productId}/preview-files`);

  return response.data.data;
}

export async function uploadProductPreviewFile(
  productId: string,
  file: File,
  options?: {
    description?: string | null;
    displayOrder?: number;
    onUploadProgress?: (progressPercent: number) => void;
  },
) {
  const formData = new FormData();
  formData.append('file', file);

  if (options?.description?.trim()) {
    formData.append('description', options.description.trim());
  }

  if (options?.displayOrder != null) {
    formData.append('displayOrder', String(options.displayOrder));
  }

  const response = await productApiClient.post<ServiceResult<ProductPreviewImageUploadDto>>(`/products/${productId}/preview-files`, formData, {
    onUploadProgress: (event) => {
      if (!options?.onUploadProgress || !event.total) {
        return;
      }

      const progressPercent = Math.min(100, Math.round((event.loaded / event.total) * 100));
      options.onUploadProgress(progressPercent);
    },
  });

  return response.data.data;
}

export async function reorderProductPreviewImages(productId: string, fileIds: string[]) {
  const response = await productApiClient.patch<ServiceResult<ProductPreviewImagesListData>>(`/products/${productId}/preview-files/reorder`, {
    fileIds,
  });

  return response.data.data;
}

export async function deleteProductPreviewImage(productId: string, fileId: string) {
  const response = await productApiClient.delete<ServiceResult<DeleteProductPreviewImageData>>(`/products/${productId}/preview-files/${fileId}`);

  return response.data.data;
}

export async function uploadProductVersionFile(
  productVersionId: string,
  file: File,
  fileType: ProductVersionFileType = 'PRODUCT_PREVIEW',
  description?: string | null,
  options: RequestBehaviorOptions = {},
) {
  const formData = new FormData();
  const uploadFile = normalizeProductVersionUploadFile(file, fileType);

  formData.append('file', uploadFile);
  formData.append('fileType', fileType);
  formData.append('visibility', 'CUSTOMER_VISIBLE');

  if (description?.trim()) {
    formData.append('description', description.trim());
  }

  const response = await productApiClient.post<ServiceResult<CatalogFileUploadResponseDto>>(
    `/api/ProductVersions/product-versions/${productVersionId}/files`,
    formData,
    {
      skipAuthRedirect: options.skipAuthRedirect,
    },
  );

  return response.data.data;
}

function normalizeProductVersionUploadFile(file: File, fileType: ProductVersionFileType) {
  const normalizedMimeType = getProductVersionUploadMimeType(file, fileType);

  if (!normalizedMimeType || file.type === normalizedMimeType) {
    return file;
  }

  return new File([file], file.name, { lastModified: file.lastModified, type: normalizedMimeType });
}

function getProductVersionUploadMimeType(file: File, fileType: ProductVersionFileType) {
  const currentType = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (fileType === 'MODEL_3D') {
    return currentType || (extension === 'gltf' ? 'model/gltf+json' : extension === 'glb' ? 'model/gltf-binary' : '');
  }

  if (fileType === 'PRODUCT_PREVIEW') {
    const fallbackTypes: Record<string, string> = {
      gif: 'image/gif',
      jpeg: 'image/jpeg',
      jpg: 'image/jpeg',
      png: 'image/png',
      svg: 'image/svg+xml',
      webp: 'image/webp',
    };

    return currentType || fallbackTypes[extension ?? ''] || '';
  }

  return currentType;
}

export async function getFilesByReference(params: FileReferenceListParams) {
  const response = await productApiClient.get<ServiceResult<FileReferenceListData>>('/files/by-reference', {
    params: {
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      fileType: params.fileType ?? undefined,
      visibility: params.visibility ?? undefined,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
  });

  return response.data.data;
}

export async function getFileDetail(fileId: string) {
  const response = await productApiClient.get<ServiceResult<FileDetailDto>>(`/files/${fileId}`);

  return response.data.data;
}

export async function archiveFile(fileId: string) {
  const response = await productApiClient.patch<ServiceResult<ArchiveFileData>>(`/files/${fileId}/archive`);

  return response.data.data;
}

export async function deleteFile(fileId: string) {
  const response = await productApiClient.delete<ServiceResult<DeleteFileData>>(`/files/${fileId}`);

  return response.data.data;
}

function getProductApiBaseUrl() {
  const configuredApiUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;

  return configuredApiUrl?.replace(/\/api\/?$/, '');
}

function clearMultipartContentType(headers: unknown) {
  const headerBag = headers as {
    delete?: (name: string) => boolean;
    set?: (name: string, value?: string | false) => void;
    [key: string]: unknown;
  };

  if (typeof headerBag.delete === 'function') {
    headerBag.delete('Content-Type');
    headerBag.delete('content-type');
    return;
  }

  if (typeof headerBag.set === 'function') {
    headerBag.set('Content-Type', false);
    return;
  }

  delete headerBag['Content-Type'];
  delete headerBag['content-type'];
}
