import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { shouldRedirectUnauthorized } from '@/shared/config/authPreview';

import { getStoredAccessToken } from './tokenStore';

const productIssueApiClient = axios.create({
  baseURL: getProductIssueApiBaseUrl(),
  withCredentials: true,
});

productIssueApiClient.interceptors.request.use((config) => {
  const token = getStoredAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.data instanceof FormData) {
    clearJsonContentType(config);
  }

  return config;
});

productIssueApiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && shouldRedirectUnauthorized()) {
      window.location.assign('/login');
    }

    return Promise.reject(error);
  },
);

export type DeliveryProductIssueType =
  | 'DAMAGED'
  | 'WRONG_ITEM'
  | 'WRONG_SPECIFICATION'
  | 'MISSING_PART'
  | 'QUALITY_DEFECT'
  | 'INSTALLATION_ISSUE'
  | 'QUANTITY_MISMATCH'
  | 'OTHER';

export type ProductIssueEvidenceFileDto = {
  fileId: string;
  fileLinkId: string;
  originalFileName: string;
  fileUrl: string;
  mimeType: string | null;
  fileSizeBytes: number | null;
};

export type ProductIssueReportDto = {
  deliveryProductIssueReportId: string;
  projectId: string;
  projectName: string | null;
  orderId: string;
  orderItemId: string;
  productNameSnapshot: string | null;
  deliveryItemId: string | null;
  issueType: DeliveryProductIssueType;
  description: string;
  affectedQuantity: number | null;
  reportedBy: string;
  reporterName: string | null;
  reportedAt: string;
  createdAt: string;
  evidenceFiles?: ProductIssueEvidenceFileDto[];
};

export type ProductIssueReportListDto = {
  items: ProductIssueReportDto[];
};

export type CreateProductIssueInput = {
  orderId: string;
  orderItemId: string;
  deliveryItemId?: string | null;
  issueType: DeliveryProductIssueType;
  description: string;
  affectedQuantity?: number | null;
  files?: File[];
};

type ServiceResult<T> = {
  status: number;
  message?: string | null;
  data: T;
  errors?: string[] | null;
  errorCode?: string | null;
};

export async function getOrderProductIssues(orderId: string) {
  const response = await productIssueApiClient.get<ServiceResult<ProductIssueReportListDto>>(
    `/orders/${orderId}/product-issues`,
  );

  return response.data.data;
}

export async function getProjectProductIssues(projectId: string) {
  const response = await productIssueApiClient.get<ServiceResult<ProductIssueReportListDto>>(
    `/projects/${projectId}/product-issues`,
  );

  return response.data.data;
}

export async function getProductIssue(issueId: string) {
  const response = await productIssueApiClient.get<ServiceResult<ProductIssueReportDto>>(
    `/product-issues/${issueId}`,
  );

  return response.data.data;
}

export async function createProductIssue(input: CreateProductIssueInput) {
  const formData = new FormData();
  formData.append('orderItemId', input.orderItemId);
  formData.append('issueType', input.issueType);
  formData.append('description', input.description);

  if (input.deliveryItemId) formData.append('deliveryItemId', input.deliveryItemId);
  if (input.affectedQuantity != null) {
    formData.append('affectedQuantity', String(input.affectedQuantity));
  }
  input.files?.forEach((file) => formData.append('files', file));

  const response = await productIssueApiClient.post<ServiceResult<ProductIssueReportDto>>(
    `/orders/${input.orderId}/product-issues`,
    formData,
  );

  return response.data.data;
}

export function getProductIssueErrorMessage(error: unknown, fallback = 'Unable to load product issues.') {
  if (!axios.isAxiosError(error)) return fallback;

  if (error.response?.status === 413) return 'One or more evidence files are too large.';
  if (error.response?.status === 415) return 'One or more evidence files use an unsupported format.';
  if (error.response?.status === 403) {
    return 'You do not have permission to access product issues for this order.';
  }
  if (error.response?.status === 404) {
    return 'Product issues endpoint was not found for this order.';
  }

  const payload = error.response?.data as
    | { errorCode?: string | null; message?: string | null; errors?: string[] | null }
    | undefined;
  const messages: Record<string, string> = {
    PRODUCT_ISSUE_NOT_DELIVERED: 'This product has not been delivered yet.',
    PRODUCT_ISSUE_INVALID_AFFECTED_QUANTITY:
      'Affected quantity must be within the delivered quantity.',
    PRODUCT_ISSUE_DELIVERY_ITEM_ORDER_ITEM_MISMATCH:
      'The selected delivery item does not match this order item.',
    PRODUCT_ISSUE_FORBIDDEN: 'You do not have permission to report an issue for this order.',
  };

  return (
    (payload?.errorCode ? messages[payload.errorCode] : undefined) ??
    payload?.message ??
    payload?.errors?.[0] ??
    fallback
  );
}

function clearJsonContentType(config: InternalAxiosRequestConfig) {
  const headerBag = config.headers as { set?: (name: string, value: unknown) => void } | undefined;
  if (typeof headerBag?.set === 'function') {
    headerBag.set('Content-Type', false);
  }
}

function getProductIssueApiBaseUrl() {
  const configuredApiUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;

  return configuredApiUrl?.replace(/\/api\/?$/, '');
}
