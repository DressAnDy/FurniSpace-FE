import axios, { AxiosError } from 'axios';

import { shouldRedirectUnauthorized } from '@/shared/config/authPreview';
import { getStoredAccessToken } from './tokenStore';

const layoutAssetApiClient = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
});

layoutAssetApiClient.interceptors.request.use((config) => {
  const token = getStoredAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.data instanceof FormData) {
    clearMultipartContentType(config.headers);
  }

  return config;
});

layoutAssetApiClient.interceptors.response.use(
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
  errors?: Array<string | { code?: string; message?: string; field?: string }>;
  errorCode?: string;
};

export type LayoutAssetType =
  | 'WALL_MATERIAL'
  | 'FLOOR_MATERIAL'
  | 'STAIR'
  | 'DOOR'
  | 'WINDOW'
  | 'COLUMN'
  | 'BEAM'
  | 'DECORATIVE_WALL'
  | 'DECORATIVE_FLOOR'
  | 'DECORATIVE_OBJECT'
  | 'OTHER';

export type LayoutAssetStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type LayoutAssetFileType = 'MODEL_3D' | 'TEXTURE' | 'PREVIEW';

export type LayoutAssetFileDto = {
  fileId: string;
  displayOrder?: number | null;
  fileName?: string | null;
  fileType: LayoutAssetFileType | string;
  isPrimary?: boolean;
  mimeType?: string | null;
  originalFileName?: string | null;
  status?: string | null;
  url?: string | null;
  publicUrl?: string | null;
  fileUrl?: string | null;
  uploadedAt?: string | null;
};

export type LayoutAssetPrimaryFileDto = {
  fileId: string;
  url: string;
};

export type LayoutAssetDto = {
  layoutAssetId: string;
  assetCode?: string | null;
  assetName?: string | null;
  assetType?: LayoutAssetType;
  code?: string | null;
  name: string;
  description?: string | null;
  layoutAssetType: LayoutAssetType;
  status: LayoutAssetStatus;
  primaryModel?: LayoutAssetPrimaryFileDto | null;
  primaryPreview?: LayoutAssetPrimaryFileDto | null;
  primaryTexture?: LayoutAssetPrimaryFileDto | null;
  previewUrl?: string | null;
  files?: LayoutAssetFileDto[];
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type LayoutAssetListData = {
  items: LayoutAssetDto[];
  page: number;
  pageSize?: number;
  limit?: number;
  total?: number;
  totalCount?: number;
};

export type LayoutAssetListParams = {
  assetType?: LayoutAssetType | null;
  keyword?: string | null;
  layoutAssetType?: LayoutAssetType | null;
  search?: string | null;
  status?: LayoutAssetStatus | null;
  page?: number;
  pageSize?: number;
};

export type CreateLayoutAssetInput = {
  assetCode?: string | null;
  assetName?: string | null;
  assetType?: LayoutAssetType;
  code?: string | null;
  name: string;
  description?: string | null;
  layoutAssetType: LayoutAssetType;
  status?: LayoutAssetStatus;
};

export type UpdateLayoutAssetInput = Partial<CreateLayoutAssetInput> & {
  layoutAssetId: string;
};

export type LayoutAssetFileListData = {
  items: LayoutAssetFileDto[];
};

const LAYOUT_ASSET_ERROR_MESSAGES: Record<string, string> = {
  LAYOUT_ASSET_NOT_FOUND: 'Layout asset was not found.',
  LAYOUT_ASSET_INACTIVE: 'This layout asset is inactive.',
  LAYOUT_ASSET_CODE_DUPLICATE: 'This layout asset code already exists.',
};

export function getLayoutAssetServiceResultMessage(error: unknown) {
  const result = getLayoutAssetServiceResultFromError(error);

  if (!result) {
    return 'Cannot connect to layout asset API. Please check backend and VITE_API_URL.';
  }

  const errorCode = getFirstLayoutAssetErrorCode(result);

  if (errorCode && LAYOUT_ASSET_ERROR_MESSAGES[errorCode]) {
    return LAYOUT_ASSET_ERROR_MESSAGES[errorCode];
  }

  const errorMessages = getLayoutAssetErrorMessages(result);

  if (errorMessages.length) {
    return errorMessages.join('\n');
  }

  return result.message || 'Request failed. Please try again.';
}

export function getLayoutAssetServiceResultFromError(error: unknown) {
  if (!(error instanceof AxiosError)) {
    return null;
  }

  const data = error.response?.data;

  if (data && typeof data === 'object') {
    const result = data as ServiceResult<unknown> & {
      detail?: string;
      title?: string;
    };

    return {
      ...result,
      status: error.response?.status ?? result.status ?? 500,
      message: result.message ?? result.detail ?? result.title,
    };
  }

  return null;
}

export async function getLayoutAssets(params: LayoutAssetListParams = {}) {
  const response = await layoutAssetApiClient.get<ServiceResult<LayoutAssetListData>>('/layout-assets', {
    params: getSearchParams(params),
  });

  return normalizeLayoutAssetList(response.data.data);
}

export async function getLayoutAssetById(layoutAssetId: string) {
  const response = await layoutAssetApiClient.get<ServiceResult<LayoutAssetDto>>(`/layout-assets/${layoutAssetId}`);

  return normalizeLayoutAsset(response.data.data);
}

export async function getRoomPlannerLayoutAssets(params: Pick<LayoutAssetListParams, 'keyword' | 'layoutAssetType' | 'page' | 'pageSize'> = {}) {
  const response = await layoutAssetApiClient.get<ServiceResult<LayoutAssetListData>>('/room-planner/layout-assets', {
    params: getSearchParams(params),
  });

  return normalizeLayoutAssetList(response.data.data);
}

export async function createLayoutAsset(input: CreateLayoutAssetInput) {
  const response = await layoutAssetApiClient.post<ServiceResult<LayoutAssetDto>>('/layout-assets', {
    assetCode: (input.assetCode ?? input.code)?.trim() || null,
    assetName: (input.assetName ?? input.name).trim(),
    assetType: input.assetType ?? input.layoutAssetType,
    code: (input.assetCode ?? input.code)?.trim() || null,
    name: (input.assetName ?? input.name).trim(),
    description: input.description?.trim() || null,
    layoutAssetType: input.layoutAssetType,
    status: input.status ?? 'ACTIVE',
  });

  return normalizeLayoutAsset(response.data.data);
}

export async function updateLayoutAsset(input: UpdateLayoutAssetInput) {
  const response = await layoutAssetApiClient.patch<ServiceResult<LayoutAssetDto>>(`/layout-assets/${input.layoutAssetId}`, {
    assetCode: (input.assetCode ?? input.code)?.trim() || undefined,
    assetName: (input.assetName ?? input.name)?.trim(),
    assetType: input.assetType ?? input.layoutAssetType,
    code: (input.assetCode ?? input.code)?.trim() || undefined,
    name: (input.assetName ?? input.name)?.trim(),
    description: input.description?.trim() || null,
    layoutAssetType: input.layoutAssetType ?? input.assetType,
  });

  return normalizeLayoutAsset(response.data.data);
}

export async function updateLayoutAssetStatus(layoutAssetId: string, status: LayoutAssetStatus) {
  const response = await layoutAssetApiClient.patch<ServiceResult<LayoutAssetDto>>(`/layout-assets/${layoutAssetId}/status`, {
    status,
  });

  return normalizeLayoutAsset(response.data.data);
}

export async function uploadLayoutAssetFile(input: {
  file: File;
  fileType: LayoutAssetFileType;
  layoutAssetId: string;
}) {
  const formData = new FormData();
  formData.append('file', input.file);
  formData.append('fileType', input.fileType);

  const response = await layoutAssetApiClient.post<ServiceResult<LayoutAssetFileDto>>(
    `/layout-assets/${input.layoutAssetId}/files`,
    formData,
  );

  return response.data.data;
}

export async function getLayoutAssetFiles(layoutAssetId: string) {
  const response = await layoutAssetApiClient.get<ServiceResult<LayoutAssetFileListData>>(`/layout-assets/${layoutAssetId}/files`);

  return normalizeLayoutAssetFiles(response.data.data);
}

export async function setLayoutAssetPrimaryFile(input: {
  fileId: string;
  layoutAssetId: string;
}) {
  const response = await layoutAssetApiClient.patch<ServiceResult<LayoutAssetDto>>(
    `/layout-assets/${input.layoutAssetId}/files/${input.fileId}/primary`,
  );

  return normalizeLayoutAsset(response.data.data);
}

export async function deleteLayoutAssetFile(input: {
  fileId: string;
  layoutAssetId: string;
}) {
  const response = await layoutAssetApiClient.delete<ServiceResult<{ fileId: string }>>(
    `/layout-assets/${input.layoutAssetId}/files/${input.fileId}`,
  );

  return response.data.data;
}

function getSearchParams(params: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries({
      ...params,
      assetType: params.assetType ?? params.layoutAssetType,
      search: params.search ?? params.keyword,
    }).filter(([, value]) => value !== null && value !== undefined && value !== ''),
  );
}

export function normalizeLayoutAsset(asset: LayoutAssetDto): LayoutAssetDto {
  const assetName = asset.assetName ?? asset.name;
  const assetType = asset.assetType ?? asset.layoutAssetType;
  const primaryPreviewFile = asset.files?.find((file) => file.fileType === 'PREVIEW' && file.isPrimary)
    ?? asset.files?.find((file) => file.fileType === 'PREVIEW');

  return {
    ...asset,
    assetCode: asset.assetCode ?? asset.code,
    assetName,
    assetType,
    code: asset.code ?? asset.assetCode,
    layoutAssetType: assetType,
    name: assetName,
    previewUrl: asset.previewUrl
      ?? asset.primaryPreview?.url
      ?? primaryPreviewFile?.url
      ?? primaryPreviewFile?.fileUrl
      ?? primaryPreviewFile?.publicUrl
      ?? null,
  };
}

function normalizeLayoutAssetList(data: LayoutAssetListData): LayoutAssetListData {
  return {
    ...data,
    items: data.items.map(normalizeLayoutAsset),
  };
}

function normalizeLayoutAssetFiles(data: LayoutAssetFileListData | LayoutAssetFileDto[]): LayoutAssetFileListData {
  if (Array.isArray(data)) {
    return { items: data };
  }

  return {
    ...data,
    items: Array.isArray(data.items) ? data.items : [],
  };
}

function getFirstLayoutAssetErrorCode(result: ServiceResult<unknown>) {
  const objectError = result.errors?.find((item): item is { code?: string } => typeof item === 'object' && item !== null && Boolean(item.code));

  return objectError?.code ?? result.errorCode;
}

function getLayoutAssetErrorMessages(result: ServiceResult<unknown>) {
  return (result.errors ?? [])
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item.code && LAYOUT_ASSET_ERROR_MESSAGES[item.code]) return LAYOUT_ASSET_ERROR_MESSAGES[item.code];
      return item.message ?? item.code ?? null;
    })
    .filter((message): message is string => Boolean(message));
}

function getApiBaseUrl() {
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
