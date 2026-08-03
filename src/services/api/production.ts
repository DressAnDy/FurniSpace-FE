import axios, { AxiosError } from 'axios';

import type { Priority, ProductionItem, ProductionItemStatus, ProductionRequest, ProductionRequestStatus } from '@/features/ProductionPages/types';
import { shouldRedirectUnauthorized } from '@/shared/config/authPreview';

import { getStoredAccessToken } from './tokenStore';

const productionApiClient = axios.create({
  baseURL: getProductionApiBaseUrl(),
  withCredentials: true,
});

productionApiClient.interceptors.request.use((config) => {
  const token = getStoredAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

productionApiClient.interceptors.response.use(
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
  errors?: string[] | Record<string, string[]>;
  errorCode?: string;
};

export type ProductionRequestListParams = {
  status?: ProductionRequestStatus | null;
  assignedTo?: string | null;
  priority?: Priority | null;
};

export type ProductionRequestQueueItemDto = Omit<ProductionRequest, 'items'> & {
  productionItemCount?: number | null;
};

export type ProductionRequestListResponseDto = {
  items: ProductionRequestQueueItemDto[];
};

export type AvailableProductionStaffDto = {
  accountId: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  accountStatus: string;
  activeRequestCount: number;
  pendingReviewRequestCount: number;
  inProductionRequestCount: number;
  blockedRequestCount: number;
  isAvailable: boolean;
};

export type AvailableProductionStaffParams = {
  search?: string | null;
  projectId?: string | null;
  productionRequestId?: string | null;
};

export type CreateProductionRequestInput = {
  orderId: string;
  assignedTo?: string | null;
  priority: Priority;
  estimatedStartDate?: string | null;
  estimatedCompletionDate?: string | null;
  note?: string | null;
};

export type AssignProductionRequestInput = {
  productionRequestId: string;
  assignedTo: string;
  assignmentNote?: string | null;
};

export type ProductionRequestTransitionResultDto = {
  productionRequestId: string;
  status: ProductionRequestStatus;
  actualStartDate?: string | null;
  updatedAt?: string | null;
};

export type ProductionCompleteResultDto = {
  productionRequestId: string;
  productionStatus: ProductionRequestStatus;
  orderStatus: string;
  projectStatus: string;
  appliedAdjustmentCount: number;
  finalTotalAmount: number;
  paidAmount: number;
  remainingAmount: number;
};

export type UpdateProductionItemStatusInput = {
  productionItemId: string;
  status: ProductionItemStatus;
  productionNote?: string | null;
  cancellationReason?: string | null;
};

export function getProductionServiceResultMessage(error: unknown) {
  const result = getProductionServiceResultFromError(error);

  if (!result) {
    return 'Cannot connect to production API. Please check backend and VITE_API_URL.';
  }

  if (Array.isArray(result.errors) && result.errors.length) {
    return result.errors.join('\n');
  }

  if (result.errors && typeof result.errors === 'object') {
    return Object.values(result.errors).flat().join('\n');
  }

  return result.message || result.errorCode || 'Request failed. Please try again.';
}

export function getProductionServiceResultFromError(error: unknown) {
  if (!(error instanceof AxiosError)) {
    return null;
  }

  const data = error.response?.data;

  if (data && typeof data === 'object') {
    return data as ServiceResult<unknown>;
  }

  return null;
}

export async function createProductionRequest(input: CreateProductionRequestInput) {
  const response = await productionApiClient.post<ServiceResult<ProductionRequestQueueItemDto>>(
    `/orders/${input.orderId}/production-request`,
    {
      assignedTo: normalizeOptionalText(input.assignedTo),
      priority: input.priority,
      estimatedStartDate: input.estimatedStartDate || null,
      estimatedCompletionDate: input.estimatedCompletionDate || null,
      note: normalizeOptionalText(input.note),
    },
  );

  return response.data.data;
}

export async function getAvailableProductionStaff(params: AvailableProductionStaffParams = {}) {
  const response = await productionApiClient.get<ServiceResult<AvailableProductionStaffDto[]>>('/production-staff/available', {
    params: {
      search: normalizeOptionalText(params.search) ?? undefined,
      projectId: normalizeOptionalText(params.projectId) ?? undefined,
      productionRequestId: normalizeOptionalText(params.productionRequestId) ?? undefined,
    },
  });

  return response.data.data;
}

export async function assignProductionRequest(input: AssignProductionRequestInput) {
  const response = await productionApiClient.patch<ServiceResult<ProductionRequestTransitionResultDto>>(
    `/production-requests/${input.productionRequestId}/assign`,
    {
      assignedTo: input.assignedTo,
      assignmentNote: normalizeOptionalText(input.assignmentNote),
    },
  );

  return response.data.data;
}

export async function getProductionRequests(params: ProductionRequestListParams = {}) {
  const response = await productionApiClient.get<ServiceResult<ProductionRequestListResponseDto>>('/production-requests', {
    params: {
      status: params.status ?? undefined,
      assignedTo: normalizeOptionalText(params.assignedTo) ?? undefined,
      priority: params.priority ?? undefined,
    },
  });

  return response.data.data;
}

export async function getProductionRequestById(productionRequestId: string) {
  const response = await productionApiClient.get<ServiceResult<ProductionRequest>>(`/production-requests/${productionRequestId}`);

  return response.data.data;
}

export async function markProductionRequestFeasible(productionRequestId: string, note?: string | null) {
  const response = await productionApiClient.patch<ServiceResult<ProductionRequestTransitionResultDto>>(
    `/production-requests/${productionRequestId}/mark-feasible`,
    { note: normalizeOptionalText(note) },
  );

  return response.data.data;
}

export async function startProductionRequest(productionRequestId: string, actualStartDate?: string | null) {
  const response = await productionApiClient.patch<ServiceResult<ProductionRequestTransitionResultDto>>(
    `/production-requests/${productionRequestId}/start`,
    { actualStartDate: actualStartDate || null },
  );

  return response.data.data;
}

export async function completeProductionRequest(productionRequestId: string) {
  const response = await productionApiClient.patch<ServiceResult<ProductionCompleteResultDto>>(
    `/production-requests/${productionRequestId}/complete`,
  );

  return response.data.data;
}

export async function updateProductionItemStatus(input: UpdateProductionItemStatusInput) {
  const response = await productionApiClient.patch<ServiceResult<ProductionItem>>(
    `/production-items/${input.productionItemId}/status`,
    {
      status: input.status,
      productionNote: normalizeOptionalText(input.productionNote),
      cancellationReason: normalizeOptionalText(input.cancellationReason),
    },
  );

  return response.data.data;
}

function normalizeOptionalText(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function getProductionApiBaseUrl() {
  const configuredApiUrl = import.meta.env.VITE_PRODUCTION_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;

  return configuredApiUrl?.replace(/\/api\/?$/, '');
}
