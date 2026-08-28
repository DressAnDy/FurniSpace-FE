import axios, { AxiosError } from 'axios';

import { shouldRedirectUnauthorized } from '@/shared/config/authPreview';
import { getStoredAccessToken } from './tokenStore';

const discountApiClient = axios.create({
  baseURL: getDiscountApiBaseUrl(),
  withCredentials: true,
});

discountApiClient.interceptors.request.use((config) => {
  const token = getStoredAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

discountApiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && shouldRedirectUnauthorized()) {
      window.location.assign('/login');
    }
    return Promise.reject(error);
  },
);

const DISCOUNT_BASE = '/admin/financial/discounts';

export type ServiceResult<T> = {
  status: number;
  message?: string | null;
  data: T;
  errors?: string[] | null;
  errorCode?: string | null;
};

export type AdminFinancialDiscountSummaryDto = {
  grossOrderValue: number;
  itemDiscountAmount: number;
  orderAdditionalDiscountAmount: number;
  totalDiscountAmount: number;
  netOrderValueBeforeVat: number;
  vatAmount: number;
  finalOrderValue: number;
  averageDiscountRate: number;
  discountedOrderCount: number;
  totalOrderCount: number;
  periodFrom: string;
  periodTo: string;
  currency: string;
};

export type AdminFinancialDiscountSummaryParams = {
  from: string;
  to: string;
  currency?: string | null;
  projectStatus?: string | null;
  salesId?: string | null;
  customerId?: string | null;
};

export type AdminFinancialDiscountProjectRowDto = {
  projectId: string;
  projectCode: string | null;
  projectName: string;
  projectStatus: string | null;
  customerId: string;
  customerName: string | null;
  salesId: string | null;
  salesName: string | null;
  orderId: string;
  orderCode: string;
  orderStatus: string | null;
  confirmedAt: string;
  grossOrderValue: number;
  itemDiscountAmount: number;
  orderAdditionalDiscountAmount: number;
  totalDiscountAmount: number;
  netOrderValueBeforeVat: number;
  vatAmount: number;
  finalOrderValue: number;
  discountRate: number;
};

export type AdminFinancialDiscountProjectsDto = {
  items: AdminFinancialDiscountProjectRowDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type AdminFinancialDiscountProjectsParams = {
  from: string;
  to: string;
  projectId?: string | null;
  customerId?: string | null;
  salesId?: string | null;
  hasDiscount?: boolean | null;
  minDiscountRate?: number | null;
  page?: number;
  pageSize?: number;
  sortBy?: 'confirmedAt' | 'totalDiscountAmount' | 'discountRate' | 'finalOrderValue' | null;
  sortDirection?: 'asc' | 'desc' | null;
};

export type AdminFinancialDiscountOrderItemDto = {
  orderItemId: string;
  productName: string | null;
  productVersionName: string | null;
  quantity: number;
  unitPrice: number;
  lineGrossAmount: number;
  discountAmount: number;
  subtotalAmount: number;
};

export type AdminFinancialDiscountOrderDetailDto = {
  orderId: string;
  orderCode: string;
  orderStatus: string | null;
  confirmedAt: string;
  projectId: string;
  projectCode: string | null;
  projectName: string;
  customerId: string;
  customerName: string | null;
  grossOrderValue: number;
  itemDiscountAmount: number;
  orderAdditionalDiscountAmount: number;
  totalDiscountAmount: number;
  netOrderValueBeforeVat: number;
  vatRate: number;
  vatAmount: number;
  finalOrderValue: number;
  discountRate: number;
  items: AdminFinancialDiscountOrderItemDto[];
};

export type AdminFinancialDiscountTrendBucketDto = {
  period: string;
  periodStart: string;
  grossOrderValue: number;
  totalDiscountAmount: number;
  discountRate: number;
  discountedOrderCount: number;
  totalOrderCount: number;
};

export type AdminFinancialDiscountTrendDto = {
  granularity: 'MONTH' | string;
  timezone: 'Asia/Ho_Chi_Minh' | string;
  currency: string;
  series: AdminFinancialDiscountTrendBucketDto[];
};

export type AdminFinancialDiscountTrendParams = {
  from: string;
  to: string;
  granularity?: 'MONTH' | null;
  currency?: string | null;
  salesId?: string | null;
};

export type AdminFinancialDiscountExceptionType = 'HIGH_DISCOUNT_RATE' | 'HIGH_DISCOUNT_AMOUNT';

export type AdminFinancialDiscountExceptionDto = {
  exceptionType: AdminFinancialDiscountExceptionType;
  orderId: string;
  orderCode: string;
  projectId: string;
  projectCode: string | null;
  projectName: string;
  salesId: string | null;
  salesName: string | null;
  confirmedAt: string;
  grossOrderValue: number;
  totalDiscountAmount: number;
  discountRate: number;
  finalOrderValue: number;
  thresholdRate: number;
  thresholdAmount: number;
};

export type AdminFinancialDiscountExceptionsDto = {
  items: AdminFinancialDiscountExceptionDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type AdminFinancialDiscountExceptionsParams = {
  from: string;
  to: string;
  thresholdRate?: number | null;
  thresholdAmount?: number | null;
  salesId?: string | null;
  page?: number;
  pageSize?: number;
};

export function getAdminFinancialDiscountServiceResultMessage(error: unknown) {
  const result = getAdminFinancialDiscountServiceResultFromError(error);
  if (!result) return 'Cannot connect to financial discount API.';
  if (result.errors?.length) return result.errors.join('\n');
  return result.message || 'Request failed.';
}

export function getAdminFinancialDiscountServiceResultFromError(error: unknown) {
  if (!(error instanceof AxiosError)) return null;
  const data = error.response?.data;
  if (data && typeof data === 'object' && 'status' in data) {
    return data as ServiceResult<unknown>;
  }
  return null;
}

export async function getAdminFinancialDiscountSummary(params: AdminFinancialDiscountSummaryParams) {
  const response = await discountApiClient.get<ServiceResult<AdminFinancialDiscountSummaryDto>>(
    `${DISCOUNT_BASE}/summary`,
    { params: cleanParams(params) },
  );
  return response.data.data;
}

export async function getAdminFinancialDiscountProjects(params: AdminFinancialDiscountProjectsParams) {
  const response = await discountApiClient.get<ServiceResult<AdminFinancialDiscountProjectsDto>>(
    `${DISCOUNT_BASE}/projects`,
    { params: cleanParams(params) },
  );
  return response.data.data;
}

export async function getAdminFinancialDiscountOrderDetail(orderId: string) {
  const response = await discountApiClient.get<ServiceResult<AdminFinancialDiscountOrderDetailDto>>(
    `${DISCOUNT_BASE}/orders/${orderId}`,
  );
  return response.data.data;
}

export async function getAdminFinancialDiscountTrend(params: AdminFinancialDiscountTrendParams) {
  const response = await discountApiClient.get<ServiceResult<AdminFinancialDiscountTrendDto>>(
    `${DISCOUNT_BASE}/trend`,
    { params: cleanParams(params) },
  );
  return response.data.data;
}

export async function getAdminFinancialDiscountExceptions(params: AdminFinancialDiscountExceptionsParams) {
  const response = await discountApiClient.get<ServiceResult<AdminFinancialDiscountExceptionsDto>>(
    `${DISCOUNT_BASE}/exceptions`,
    { params: cleanParams(params) },
  );
  return response.data.data;
}

function cleanParams(params: Record<string, unknown>) {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    next[key] = value;
  }
  return next;
}

function getDiscountApiBaseUrl() {
  const configuredApiUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;
  return configuredApiUrl?.replace(/\/api\/?$/, '');
}
