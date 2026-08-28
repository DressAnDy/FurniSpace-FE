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
  errors?: Array<string | { code?: string; message?: string; field?: string }> | Record<string, string[]>;
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
  isAvailable: boolean;
};

export type AvailableProductionStaffParams = {
  search?: string | null;
  projectId?: string | null;
  productionRequestId?: string | null;
};

export type ProductionCapacityState = 'AVAILABLE' | 'FULL' | 'OVER';

export type ProductionWorkloadDto = {
  accountId: string;
  fullName: string;
  email: string;
  openRequestCount: number;
  /** Open requests past committed production deadline for this staff member. */
  overdueCount: number;
  maxActiveRequests: number;
  availableSlot: number;
  capacityState: ProductionCapacityState;
};

export type ProductionWorkloadListData = {
  items: ProductionWorkloadDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type ProductionWorkloadListParams = {
  page?: number;
  pageSize?: number;
  search?: string | null;
  capacityState?: ProductionCapacityState | null;
  sortBy?: 'OpenRequestCountDesc' | 'AvailableSlotDesc' | null;
};

export type ProductionWorkloadSummaryDto = {
  totalActiveStaff: number;
  availableCount: number;
  fullCount: number;
  overCount: number;
  totalOpenRequests: number;
  /** Open requests past committed production deadline across active staff. */
  overdueCount: number;
  maxActiveRequests: number;
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
  actualStartDate?: string | null;
  actualCompletionDate?: string | null;
  readyOrderItemCount: number;
  unavailableOrderItemCount: number;
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

export type UnavailableProductionItemDto = {
  productionItemId: string;
  productionRequestId: string;
  productionCode: string | null;
  projectId: string;
  projectCode: string | null;
  projectName: string;
  orderId: string;
  orderCode: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  orderItemId: string;
  productNameSnapshot: string | null;
  productVersionNameSnapshot: string | null;
  quantity: number;
  status: ProductionItemStatus;
  cancellationReason: string | null;
  completedAt: string | null;
};

export type UnavailableProductionItemsDto = {
  items: UnavailableProductionItemDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type UnavailableProductionItemsParams = {
  keyword?: string | null;
  assignedTo?: string | null;
  page?: number;
  pageSize?: number;
};

export function getProductionServiceResultMessage(error: unknown) {
  const result = getProductionServiceResultFromError(error);

  if (!result) {
    return 'Cannot connect to production API. Please check backend and VITE_API_URL.';
  }

  if (Array.isArray(result.errors) && result.errors.length) {
    return result.errors
      .map((item) => {
        if (typeof item === 'string') return getProductionErrorCodeMessage(item);
        if (item && typeof item === 'object' && 'code' in item && typeof item.code === 'string') {
          return getProductionErrorCodeMessage(item.code);
        }
        if (item && typeof item === 'object' && 'message' in item && typeof item.message === 'string') {
          return item.message;
        }

        return String(item);
      })
      .join('\n');
  }

  if (result.errors && typeof result.errors === 'object') {
    return Object.values(result.errors).flat().join('\n');
  }

  return result.message || (result.errorCode ? getProductionErrorCodeMessage(result.errorCode) : null) || 'Request failed. Please try again.';
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

function getProductionErrorCodeMessage(errorCode: string) {
  const messages: Record<string, string> = {
    PRODUCTION_DEADLINE_REQUIRED: 'Vui lòng set Production Deadline trước khi tạo yêu cầu sản xuất.',
  };

  return messages[errorCode] ?? errorCode;
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

export async function getProductionWorkload(params: ProductionWorkloadListParams = {}) {
  const response = await productionApiClient.get<ServiceResult<ProductionWorkloadListData>>('/admin/production/workload', {
    params: {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
      search: params.search?.trim() || undefined,
      capacityState: params.capacityState ?? undefined,
      sortBy: params.sortBy ?? undefined,
    },
  });

  return response.data.data;
}

export async function getProductionWorkloadSummary() {
  const response = await productionApiClient.get<ServiceResult<ProductionWorkloadSummaryDto>>(
    '/admin/production/workload/summary',
  );

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

export async function startProductionRequest(productionRequestId: string) {
  const response = await productionApiClient.patch<ServiceResult<ProductionRequestTransitionResultDto>>(
    `/production-requests/${productionRequestId}/start`,
    {},
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

export async function getUnavailableProductionItems(params: UnavailableProductionItemsParams = {}) {
  const response = await productionApiClient.get<ServiceResult<UnavailableProductionItemsDto>>(
    '/production-items/unavailable',
    {
      params: {
        keyword: params.keyword ?? undefined,
        assignedTo: params.assignedTo ?? undefined,
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
      },
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
