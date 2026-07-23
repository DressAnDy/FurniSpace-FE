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

export type QuotationItemType = 'PRODUCT_ITEM' | 'MANUAL_ITEM';

export type QuotationDto = {
  quotationId: string;
  projectId: string;
  proposalId: string;
  quotationCode: string;
  versionNo?: number | null;
  subtotalAmount?: number | null;
  discountAmount?: number | null;
  taxAmount?: number | null;
  totalAmount?: number | null;
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
  itemType?: QuotationItemType | null;
  proposalItemId?: string | null;
  productVersionId?: string | null;
  productNameSnapshot?: string | null;
  productVersionNameSnapshot?: string | null;
  productVersionCodeSnapshot?: string | null;
  itemName?: string | null;
  description?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  customizationAdditionalCost?: number | null;
  discountAmount?: number | null;
  subtotalAmount?: number | null;
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
  discountAmount?: number | null;
  taxAmount?: number | null;
  customerNote?: string | null;
  salesNote?: string | null;
  revisionReason?: string | null;
};

export type CreateManualQuotationItemInput = {
  quotationId: string;
  itemName?: string | null;
  description?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  discountAmount?: number | null;
  note?: string | null;
};

export type UpdateManualQuotationItemInput = CreateManualQuotationItemInput & {
  quotationItemId: string;
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
    discountAmount: input.discountAmount ?? null,
    taxAmount: input.taxAmount ?? null,
    customerNote: input.customerNote?.trim() || null,
    salesNote: input.salesNote?.trim() || null,
    revisionReason: input.revisionReason?.trim() || null,
  });

  return response.data.data;
}

export async function createManualQuotationItem(input: CreateManualQuotationItemInput) {
  const response = await quotationApiClient.post<ServiceResult<QuotationItemDto>>(`/quotations/${input.quotationId}/items`, {
    itemName: input.itemName?.trim() || null,
    description: input.description?.trim() || null,
    quantity: input.quantity ?? null,
    unitPrice: input.unitPrice ?? null,
    discountAmount: input.discountAmount ?? null,
    note: input.note?.trim() || null,
  });

  return response.data.data;
}

export async function updateManualQuotationItem(input: UpdateManualQuotationItemInput) {
  const response = await quotationApiClient.patch<ServiceResult<QuotationItemDto>>(
    `/quotations/${input.quotationId}/items/${input.quotationItemId}`,
    {
      itemName: input.itemName?.trim() || undefined,
      description: input.description?.trim() || undefined,
      quantity: input.quantity ?? undefined,
      unitPrice: input.unitPrice ?? undefined,
      discountAmount: input.discountAmount ?? undefined,
      note: input.note?.trim() || undefined,
    },
  );

  return response.data.data;
}

export async function deleteManualQuotationItem(quotationId: string, quotationItemId: string) {
  await quotationApiClient.delete<ServiceResult<null>>(`/quotations/${quotationId}/items/${quotationItemId}`);
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
