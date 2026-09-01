import axios, { AxiosError } from 'axios';

import { shouldRedirectUnauthorized } from '@/shared/config/authPreview';

import { getStoredAccessToken } from './tokenStore';

const paymentApiClient = axios.create({
  baseURL: getPaymentApiBaseUrl(),
  withCredentials: true,
});

paymentApiClient.interceptors.request.use((config) => {
  const token = getStoredAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

paymentApiClient.interceptors.response.use(
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

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PAID'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REFUNDED';

export type PaymentType =
  | 'PROJECT_START_FEE'
  | 'DEPOSIT'
  | 'REMAINING_PAYMENT';

export type PaymentProvider = 'PAYOS' | 'SEPAY' | 'CASH' | 'MANUAL_BANK_TRANSFER' | 'OTHER';
export type PaymentMethod = 'PAYMENT_LINK' | 'QR_CODE' | 'BANK_TRANSFER' | 'CASH' | 'OTHER';
export type PaymentTransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
export type PaymentTransactionType = 'CHARGE' | 'REFUND' | 'ADJUSTMENT';

export type PaymentDto = {
  paymentId: string;
  projectId: string;
  projectName?: string | null;
  projectCode?: string | null;
  orderId?: string | null;
  orderCode?: string | null;
  quotationId?: string | null;
  quotationCode?: string | null;
  paymentCode: string;
  paidBy?: string | null;
  paymentType?: PaymentType | null;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: string;
  status?: PaymentStatus | null;
  expiredAt?: string | null;
  paidAt?: string | null;
  cancelledAt?: string | null;
  note?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type PaymentDetailDto = PaymentDto;

export type PaymentTransactionDto = {
  paymentTransactionId: string;
  paymentId: string;
  transactionCode: string;
  transactionType?: PaymentTransactionType | null;
  amount: number;
  currency: string;
  paymentProvider?: PaymentProvider | null;
  paymentMethod?: PaymentMethod | null;
  providerTransactionId?: string | null;
  providerReferenceCode?: string | null;
  status?: PaymentTransactionStatus | null;
  transactionTime?: string | null;
  createdAt?: string | null;
};

export type PaymentListParams = {
  projectId?: string | null;
  orderId?: string | null;
  status?: PaymentStatus | null;
  paymentType?: PaymentType | null;
  from?: string | null;
  to?: string | null;
  page?: number;
  limit?: number;
};

export type PaymentListResponseDto = {
  items: PaymentDto[];
  page?: number;
  limit?: number;
  pageSize?: number;
  total?: number;
  totalCount?: number;
  totalPages?: number;
};

export type PaymentTransactionListResponseDto = {
  items: PaymentTransactionDto[];
};

export type PaymentStatusByCodeDto = {
  paymentId: string;
  paymentCode: string;
  status?: PaymentStatus | null;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  paidAt?: string | null;
};

export type SePayVietQrResponseDto = {
  paymentId: string;
  paymentCode: string;
  provider: 'SEPAY';
  method: 'QR_CODE';
  amount: number;
  bankCode: string;
  accountNo: string;
  accountName: string;
  transferContent: string;
  vietQrUrl: string;
  status?: PaymentStatus | null;
};

export type CreatePayOsPaymentLinkInput = {
  paymentId: string;
  amount?: number | null;
  returnUrl?: string | null;
  cancelUrl?: string | null;
};

export type PayOsPaymentLinkResponseDto = {
  paymentId: string;
  paymentTransactionId: string;
  paymentCode: string;
  provider: 'PAYOS';
  method: 'PAYMENT_LINK';
  orderCode: number;
  amount: number;
  status?: PaymentTransactionStatus | null;
  checkoutUrl: string;
  qrCode?: string | null;
  paymentStatus?: PaymentStatus | null;
};

export type CreateProjectStartFeePaymentInput = {
  projectId: string;
  amount?: number | null;
  expiredAt?: string | null;
  note?: string | null;
};

export type ProjectStartFeeStatusDto = {
  projectId: string;
  requiresProjectStartFee: boolean;
  projectStartFeeStatus?: PaymentStatus | null;
  isEligibleForDesignerAssignment: boolean;
  paymentId?: string | null;
};

export type PaymentUpdatedRealtimeDto = {
  paymentId: string;
  projectId: string;
  paymentCode: string;
  status?: PaymentStatus | null;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentTransactionId: string;
  transactionAmount: number;
  appliedAmount: number;
  paidAt: string | null;
  occurredAt: string;
};

export function getPaymentServiceResultMessage(error: unknown) {
  const result = getPaymentServiceResultFromError(error);

  if (!result) {
    return 'Cannot connect to payment API. Please check backend and VITE_API_URL.';
  }

  if (result.errors?.length) {
    return result.errors.join('\n');
  }

  return result.message || 'Request failed. Please try again.';
}

export function getPaymentServiceResultFromError(error: unknown) {
  if (!(error instanceof AxiosError)) {
    return null;
  }

  const data = error.response?.data;

  if (data && typeof data === 'object' && 'status' in data) {
    return data as ServiceResult<unknown>;
  }

  return null;
}

export async function getPaymentById(paymentId: string) {
  const response = await paymentApiClient.get<ServiceResult<PaymentDetailDto>>(`/api/payments/${paymentId}`);

  return response.data.data;
}

export async function getPayments(params: PaymentListParams = {}) {
  const response = await paymentApiClient.get<ServiceResult<PaymentListResponseDto>>('/api/payments', {
    params: {
      projectId: params.projectId ?? undefined,
      orderId: params.orderId ?? undefined,
      status: params.status ?? undefined,
      paymentType: params.paymentType ?? undefined,
      from: params.from || undefined,
      to: params.to || undefined,
      page: params.page ?? undefined,
      limit: params.limit ?? undefined,
    },
  });

  return response.data.data;
}

export async function getPaymentTransactions(paymentId: string) {
  const response = await paymentApiClient.get<ServiceResult<PaymentTransactionListResponseDto>>(`/api/payments/${paymentId}/transactions`);

  return response.data.data;
}

export async function getPaymentStatusByCode(paymentCode: string) {
  const response = await paymentApiClient.get<ServiceResult<PaymentStatusByCodeDto>>(`/api/payments/code/${paymentCode}/status`);

  return response.data.data;
}

export async function generateSePayVietQr(paymentId: string) {
  const response = await paymentApiClient.post<ServiceResult<SePayVietQrResponseDto>>(`/api/payments/${paymentId}/sepay/vietqr`);

  return response.data.data;
}

export async function createPayOsPaymentLink(input: CreatePayOsPaymentLinkInput) {
  const returnUrl = input.returnUrl?.trim();
  const cancelUrl = input.cancelUrl?.trim();
  const payload: { amount?: number | null; returnUrl?: string; cancelUrl?: string } = {};

  if (typeof input.amount === 'number') {
    payload.amount = input.amount;
  }

  if (returnUrl) {
    payload.returnUrl = returnUrl;
  }

  if (cancelUrl) {
    payload.cancelUrl = cancelUrl;
  }

  const response = await paymentApiClient.post<ServiceResult<PayOsPaymentLinkResponseDto>>(
    `/api/payments/${input.paymentId}/payos/payment-link`,
    payload,
  );

  return response.data.data;
}

export async function createProjectStartFeePayment(input: CreateProjectStartFeePaymentInput) {
  const response = await paymentApiClient.post<ServiceResult<PaymentDetailDto>>(
    `/api/projects/${input.projectId}/payments/project-start-fee`,
    {
      amount: input.amount ?? null,
      expiredAt: input.expiredAt || null,
      note: input.note?.trim() || null,
    },
  );

  return response.data.data;
}

export async function getProjectStartFeeStatus(projectId: string) {
  const response = await paymentApiClient.get<ServiceResult<ProjectStartFeeStatusDto>>(
    `/api/projects/${projectId}/payments/project-start-fee/status`,
  );

  return response.data.data;
}

export function getPaymentHubUrl() {
  const configuredApiUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;
  const baseUrl = configuredApiUrl?.replace(/\/api\/?$/, '') ?? '';

  return `${baseUrl}/hubs/payments`;
}

function getPaymentApiBaseUrl() {
  const configuredApiUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;

  return configuredApiUrl?.replace(/\/api\/?$/, '');
}
