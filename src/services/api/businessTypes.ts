import axios, { AxiosError } from 'axios';

import { shouldRedirectUnauthorized } from '@/shared/config/authPreview';
import { getStoredAccessToken } from './tokenStore';

const businessTypeApiClient = axios.create({
  baseURL: getBusinessTypeApiBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

businessTypeApiClient.interceptors.request.use((config) => {
  const token = getStoredAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

businessTypeApiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && shouldRedirectUnauthorized()) {
      window.location.assign('/login');
    }

    return Promise.reject(error);
  },
);

type ServiceResult<T> = {
  status: number;
  message?: string;
  data: T;
  errors?: string[];
};

export type BusinessTypeDto = {
  id: number;
  code: string;
  name: string;
  status: boolean;
};

export type BusinessTypeListData = {
  items: BusinessTypeDto[];
  page?: number;
  limit?: number;
  total?: number;
};

export type BusinessTypeListParams = {
  page?: number;
  limit?: number;
  includeInactive?: boolean;
};

export type CreateBusinessTypeInput = {
  code: string;
  name: string;
  status?: boolean;
};

export type UpdateBusinessTypeInput = Partial<CreateBusinessTypeInput> & {
  id: number;
};

export function getBusinessTypeServiceResultMessage(error: unknown) {
  const result = getBusinessTypeServiceResultFromError(error);

  if (!result) {
    return 'Cannot connect to business type API. Please check backend and VITE_API_URL.';
  }

  if (result.errors?.length) {
    return result.errors.join('\n');
  }

  return result.message || 'Request failed. Please try again.';
}

export function getBusinessTypeServiceResultFromError(error: unknown) {
  if (!(error instanceof AxiosError)) {
    return null;
  }

  const data = error.response?.data;

  if (data && typeof data === 'object' && 'status' in data) {
    return data as ServiceResult<unknown>;
  }

  return null;
}

export async function getBusinessTypes(params: BusinessTypeListParams = {}) {
  const response = await businessTypeApiClient.get<ServiceResult<BusinessTypeListData | BusinessTypeDto[]>>('/business-types', {
    params: {
      includeInactive: params.includeInactive ?? undefined,
      limit: params.limit ?? 100,
      page: params.page ?? 1,
    },
  });

  const data = response.data.data;

  if (Array.isArray(data)) {
    return {
      items: data,
      limit: params.limit ?? data.length,
      page: params.page ?? 1,
      total: data.length,
    };
  }

  return data;
}

export async function getBusinessTypeById(id: number) {
  const response = await businessTypeApiClient.get<ServiceResult<BusinessTypeDto>>(`/business-types/${id}`);

  return response.data.data;
}

export async function createBusinessType(input: CreateBusinessTypeInput) {
  const response = await businessTypeApiClient.post<ServiceResult<BusinessTypeDto>>('/business-types', {
    code: input.code.trim(),
    name: input.name.trim(),
    status: input.status ?? true,
  });

  return response.data.data;
}

export async function updateBusinessType(input: UpdateBusinessTypeInput) {
  const response = await businessTypeApiClient.patch<ServiceResult<BusinessTypeDto>>(`/business-types/${input.id}`, {
    code: input.code?.trim(),
    name: input.name?.trim(),
    status: input.status,
  });

  return response.data.data;
}

export async function updateBusinessTypeStatus(id: number, status: boolean) {
  const response = await businessTypeApiClient.patch<ServiceResult<BusinessTypeDto>>(`/business-types/${id}/status`, {
    status,
  });

  return response.data.data;
}

function getBusinessTypeApiBaseUrl() {
  const configuredApiUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;

  return configuredApiUrl?.replace(/\/api\/?$/, '');
}
