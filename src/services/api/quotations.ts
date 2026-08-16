import axios, { AxiosError } from 'axios';

import { shouldRedirectUnauthorized } from '@/shared/config/authPreview';

import { getStoredAccessToken } from './tokenStore';

const quotationApiClient = axios.create({
  baseURL: getQuotationApiBaseUrl(),
  withCredentials: true,
});

quotationApiClient.interceptors.request.use((config) => {
  const token = getStoredAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

quotationApiClient.interceptors.response.use(
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
  errorCode?: string;
};

export type QuotationStatus =
  | 'DRAFT'
  | 'SENT'
  | 'REVISION_REQUESTED'
  | 'REVISED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

export type QuotationDto = {
  quotationId: string;
  projectId: string;
  proposalId: string;
  quotationCode: string;
  versionNo?: number | null;
  subtotalAmount?: number | null;
  totalDiscountAmount?: number | null;
  preVatAmount?: number | null;
  vatRate?: number | null;
  vatAmount?: number | null;
  totalAmount?: number | null;
  depositAmount?: number | null;
  currency?: string | null;
  status?: QuotationStatus | null;
  validUntil?: string | null;
  customerNote?: string | null;
  salesNote?: string | null;
  revisionReason?: string | null;
  rejectReason?: string | null;
  createdBy?: string | null;
  sentAt?: string | null;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type QuotationItemDto = {
  quotationItemId: string;
  quotationId: string;
  proposalItemId?: string | null;
  productVersionId?: string | null;
  productNameSnapshot?: string | null;
  productVersionNameSnapshot?: string | null;
  productVersionCodeSnapshot?: string | null;
  itemName?: string | null;
  description?: string | null;
  displayOrder?: number | null;
  quantity?: number | null;
  unitPrice?: number | null;
  grossAmount?: number | null;
  discountAmount?: number | null;
  totalAmount?: number | null;
  isCustomized?: boolean | null;
  customizationNote?: string | null;
  note?: string | null;
};

export type QuotationDetailDto = QuotationDto & {
  items: QuotationItemDto[];
};

export type QuotationListData = {
  items: QuotationDto[];
};

export type QuotationListParams = {
  projectId: string;
  status?: QuotationStatus | null;
};

export type UpdateQuotationInput = {
  quotationId: string;
  validUntil?: string | null;
  customerNote?: string | null;
  salesNote?: string | null;
  revisionReason?: string | null;
  depositAmount?: number | null;
};

export type UpdateQuotationItemFinancialsInput = {
  quotationId: string;
  quotationItemId: string;
  quantity?: number | null;
  unitPrice?: number | null;
  discountAmount?: number | null;
};

export type BulkUpdateQuotationItemFinancialsInput = {
  quotationId: string;
  items: Array<Omit<UpdateQuotationItemFinancialsInput, 'quotationId'>>;
};

export type RequestQuotationRevisionInput = {
  quotationId: string;
  revisionReason?: string | null;
};

export type RejectQuotationInput = {
  quotationId: string;
  rejectReason?: string | null;
};

export function getQuotationServiceResultMessage(error: unknown) {
  const result = getQuotationServiceResultFromError(error);

  if (!result) {
    return 'Cannot connect to quotation API. Please check backend and VITE_API_URL.';
  }

  if (result.errors?.length) {
    return result.errors.join('\n');
  }

  return result.message || 'Request failed. Please try again.';
}

export function getQuotationServiceResultFromError(error: unknown) {
  if (!(error instanceof AxiosError)) {
    return null;
  }

  const data = error.response?.data;

  if (data && typeof data === 'object' && 'status' in data) {
    return data as ServiceResult<unknown>;
  }

  return null;
}

export async function getProjectQuotations(params: QuotationListParams) {
  const response = await quotationApiClient.get<ServiceResult<QuotationListData>>(`/projects/${params.projectId}/quotations`, {
    params: {
      status: params.status ?? undefined,
    },
  });

  return response.data.data;
}

export async function getQuotationById(quotationId: string) {
  const response = await quotationApiClient.get<ServiceResult<QuotationDetailDto>>(`/quotations/${quotationId}`);

  return response.data.data;
}

export async function createDraftQuotation(projectId: string) {
  const response = await quotationApiClient.post<ServiceResult<QuotationDto>>(`/projects/${projectId}/quotations`);

  return response.data.data;
}

export async function updateQuotation(input: UpdateQuotationInput) {
  const response = await quotationApiClient.patch<ServiceResult<QuotationDto>>(`/quotations/${input.quotationId}`, {
    validUntil: input.validUntil || null,
    customerNote: input.customerNote?.trim() || null,
    salesNote: input.salesNote?.trim() || null,
    revisionReason: input.revisionReason?.trim() || null,
    depositAmount: input.depositAmount ?? null,
  });

  return response.data.data;
}

export async function updateQuotationItemFinancials(input: UpdateQuotationItemFinancialsInput) {
  const response = await quotationApiClient.patch<ServiceResult<QuotationItemDto>>(
    `/quotations/${input.quotationId}/items/${input.quotationItemId}/financials`,
    getQuotationItemFinancialsPayload(input),
  );

  return response.data.data;
}

export async function bulkUpdateQuotationItemFinancials(input: BulkUpdateQuotationItemFinancialsInput) {
  const response = await quotationApiClient.put<ServiceResult<QuotationDetailDto>>(
    `/quotations/${input.quotationId}/items/financials`,
    {
      items: input.items.map((item) => ({
        quotationItemId: item.quotationItemId,
        ...getQuotationItemFinancialsPayload(item),
      })),
    },
  );

  return response.data.data;
}

export async function sendQuotation(quotationId: string) {
  const response = await quotationApiClient.patch<ServiceResult<QuotationDto>>(`/quotations/${quotationId}/send`);

  return response.data.data;
}

export async function acceptQuotation(quotationId: string) {
  const response = await quotationApiClient.patch<ServiceResult<QuotationDto>>(`/quotations/${quotationId}/accept`);

  return response.data.data;
}

export async function requestQuotationRevision(input: RequestQuotationRevisionInput) {
  const response = await quotationApiClient.patch<ServiceResult<QuotationDto>>(
    `/quotations/${input.quotationId}/request-revision`,
    {
      revisionReason: input.revisionReason?.trim() || null,
    },
  );

  return response.data.data;
}

export async function reviseQuotation(quotationId: string) {
  const response = await quotationApiClient.patch<ServiceResult<QuotationDto>>(`/quotations/${quotationId}/revise`);

  return response.data.data;
}

export async function cancelQuotation(quotationId: string) {
  const response = await quotationApiClient.patch<ServiceResult<QuotationDto>>(`/quotations/${quotationId}/cancel`);

  return response.data.data;
}

export async function rejectQuotation(input: RejectQuotationInput) {
  const response = await quotationApiClient.patch<ServiceResult<QuotationDto>>(`/quotations/${input.quotationId}/reject`, {
    rejectReason: input.rejectReason?.trim() || null,
  });

  return response.data.data;
}

function getQuotationApiBaseUrl() {
  const configuredApiUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;

  return configuredApiUrl?.replace(/\/api\/?$/, '');
}

function getQuotationItemFinancialsPayload(input: Omit<UpdateQuotationItemFinancialsInput, 'quotationId'>) {
  return {
    ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
    ...(input.unitPrice !== undefined ? { unitPrice: input.unitPrice } : {}),
    ...(input.discountAmount !== undefined ? { discountAmount: input.discountAmount } : {}),
  };
}
