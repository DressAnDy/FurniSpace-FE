import axios, { AxiosError } from 'axios';

import { getStoredAccessToken } from './tokenStore';

const productApiClient = axios.create({
  baseURL: getProductApiBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

productApiClient.interceptors.request.use((config) => {
  const token = getStoredAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

productApiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
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
};

export type ProductListItemDto = {
  productId: string;
  categoryId: string;
  categoryName: string;
  productCode: string | null;
  productName: string;
  description: string | null;
  status: ProductStatus;
  defaultVersion: ProductVersionDto | null;
};

export type ProductDetailDto = ProductListItemDto & {
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

export async function setDefaultProductVersion(productVersionId: string) {
  const response = await productApiClient.patch<ServiceResult<SetDefaultProductVersionData>>(`/api/ProductVersions/product-versions/${productVersionId}/set-default`);

  return response.data.data;
}

function getProductApiBaseUrl() {
  const configuredApiUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;

  return configuredApiUrl?.replace(/\/api\/?$/, '');
}
