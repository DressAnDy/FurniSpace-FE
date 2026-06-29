import axios, { AxiosError } from 'axios';

import { shouldRedirectUnauthorized } from '@/shared/config/authPreview';

const productApiClient = axios.create({
  baseURL: getProductApiBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

productApiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && shouldRedirectUnauthorized()) {
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

export function getProductServiceResultMessage(error: unknown) {
  const result = getProductServiceResultFromError(error);

  if (!result) {
    return 'Cannot connect to product API. Please check backend and VITE_API_URL.';
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
    return data as ServiceResult<unknown>;
  }

  return null;
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
  });

  return response.data.data;
}

export async function getProductById(productId: string) {
  const response = await productApiClient.get<ServiceResult<ProductDetailDto>>(`/products/${productId}`);

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

export async function uploadProductPreviewFile(productId: string, file: File, description?: string | null) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileType', 'PRODUCT_PREVIEW');
  formData.append('visibility', 'CUSTOMER_VISIBLE');

  if (description?.trim()) {
    formData.append('description', description.trim());
  }

  const response = await productApiClient.post<ServiceResult<CatalogFileUploadResponseDto>>(`/products/${productId}/files`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data.data;
}

export async function uploadProductVersionFile(
  productVersionId: string,
  file: File,
  fileType: ProductVersionFileType = 'PRODUCT_PREVIEW',
  description?: string | null,
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileType', fileType);
  formData.append('visibility', 'CUSTOMER_VISIBLE');

  if (description?.trim()) {
    formData.append('description', description.trim());
  }

  const response = await productApiClient.post<ServiceResult<CatalogFileUploadResponseDto>>(
    `/api/ProductVersions/product-versions/${productVersionId}/files`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return response.data.data;
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
