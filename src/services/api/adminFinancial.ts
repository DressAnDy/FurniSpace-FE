import axios, { AxiosError } from 'axios';

import { shouldRedirectUnauthorized } from '@/shared/config/authPreview';
import { getStoredAccessToken } from './tokenStore';

const financialApiClient = axios.create({
  baseURL: getFinancialApiBaseUrl(),
  withCredentials: true,
});

financialApiClient.interceptors.request.use((config) => {
  const token = getStoredAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

financialApiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && shouldRedirectUnauthorized()) {
      window.location.assign('/login');
    }

    return Promise.reject(error);
  },
);

const FINANCIAL_BASE = '/admin/financial';

export type ServiceResult<T> = {
  status: number;
  message?: string | null;
  data: T;
  errors?: string[] | null;
  errorCode?: string | null;
};

export type FinancialPaymentType =
  | 'PROJECT_START_FEE'
  | 'DEPOSIT'
  | 'REMAINING_PAYMENT'
  | 'FULL_PAYMENT'
  | 'REFUND'
  | 'OTHER';

export type FinancialPaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PAID'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REFUNDED';

export type FinancialPaymentProvider = 'PAYOS' | 'SEPAY' | 'CASH' | 'MANUAL_BANK_TRANSFER' | 'OTHER';

export type FinancialPeriodType = 'THIS_MONTH' | 'THIS_YEAR' | 'CUSTOM';

export type AdminFinancialPeriodDto = {
  type: string;
  from: string;
  to: string;
  timezone: 'Asia/Ho_Chi_Minh' | string;
};

export type AdminFinancialSummaryDto = {
  period: AdminFinancialPeriodDto;
  currency: string;
  collectedAmount: number;
  outstandingPaymentAmount: number;
  contractedReceivableAmount: number;
  orderCommercialValue: number;
  failedTransactionCount: number;
  activePaymentCount: number;
};

export type AdminFinancialSummaryParams = {
  period?: FinancialPeriodType;
  from?: string | null;
  to?: string | null;
  currency?: string | null;
};

export type AdminFinancialDrilldownMetric =
  | 'COLLECTED'
  | 'OUTSTANDING'
  | 'CONTRACTED_RECEIVABLE'
  | 'ORDER_VALUE'
  | 'FAILED_TRANSACTIONS'
  | 'ACTIVE_PAYMENTS';

export type AdminFinancialDrilldownBreakdownItemDto = {
  key: string;
  label: string;
  amount: number | null;
  count: number;
  percentage: number;
};

export type AdminFinancialDrilldownBreakdownDto = {
  dimension: string;
  items: AdminFinancialDrilldownBreakdownItemDto[];
};

export type AdminFinancialDrilldownItemDto = {
  resourceType: 'PAYMENT' | 'ORDER' | 'TRANSACTION' | string;
  projectId: string | null;
  projectCode: string | null;
  projectName: string | null;
  orderId: string | null;
  orderCode: string | null;
  orderStatus: string | null;
  paymentId: string | null;
  paymentCode: string | null;
  transactionId: string | null;
  paymentType: FinancialPaymentType | null;
  status: string | null;
  provider: FinancialPaymentProvider | string | null;
  amount: number | null;
  paidAmount: number | null;
  remainingAmount: number | null;
  occurredAt: string | null;
  expiredAt: string | null;
  failureReason: string | null;
  ageDays: number | null;
  projectStartFeeAmount?: number | null;
  depositAmount?: number | null;
  remainingPaymentAmount?: number | null;
  fullPaymentAmount?: number | null;
  totalCollectedAmount?: number | null;
  paymentCount?: number | null;
  lastPaidAt?: string | null;
  customerName?: string | null;
  orderFinalTotal?: number | null;
  orderPaidAmount?: number | null;
  orderRemainingAmount?: number | null;
};

export type AdminFinancialSummaryDrilldownDto = {
  metric: AdminFinancialDrilldownMetric;
  totalAmount: number | null;
  totalCount: number;
  currency: string;
  period: AdminFinancialPeriodDto;
  breakdowns: AdminFinancialDrilldownBreakdownDto[];
  items: AdminFinancialDrilldownItemDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type AdminFinancialSummaryDrilldownParams = {
  from: string;
  to: string;
  currency?: string | null;
  groupBy?: 'PROJECT' | null;
  projectId?: string | null;
  paymentType?: FinancialPaymentType | null;
  status?: string | null;
  provider?: FinancialPaymentProvider | null;
  page?: number;
  pageSize?: number;
  sortBy?:
    | 'amount'
    | 'ageDays'
    | 'projectCode'
    | 'paymentCode'
    | 'orderCode'
    | 'occurredAt'
    | 'totalCollectedAmount'
    | 'lastPaidAt'
    | 'paymentCount'
    | null;
  sortDirection?: 'asc' | 'desc' | null;
};

export type AdminFinancialReceivableItemDto = {
  projectId: string;
  projectCode: string | null;
  projectName: string;
  customerId?: string | null;
  customerName?: string | null;
  orderId: string;
  orderCode: string;
  orderStatus: string | null;
  confirmedAt?: string | null;
  finalTotalAmount: number;
  paidAmount: number | null;
  remainingAmount: number | null;
  paymentProgressPercentage?: number | null;
  collectionState?: AdminFinancialCollectionState | null;
  receivableAgeDays?: number | null;
  lastPaidAt?: string | null;
  activePaymentId: string | null;
  activePaymentType: FinancialPaymentType | null;
  activePaymentAmount: number | null;
  activePaymentStatus: FinancialPaymentStatus | null;
  activePaymentExpiredAt?: string | null;
  lastPaymentFailureReason?: string | null;
  isPaymentCreated: boolean;
};

export type AdminFinancialCollectionState = 'NOT_CREATED' | 'PENDING' | 'PROCESSING' | 'EXPIRED' | 'FAILED';

export type AdminFinancialReceivablesDto = {
  outstandingPaymentAmount: number;
  outstandingPaymentCount: number;
  contractedReceivableAmount: number;
  ordersWithReceivableCount: number;
  withoutPaymentCount?: number;
  activeCollectionCount?: number;
  expiredPaymentCount?: number;
  failedPaymentCount?: number;
  items: AdminFinancialReceivableItemDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type AdminFinancialReceivablesParams = {
  keyword?: string | null;
  projectId?: string | null;
  customerId?: string | null;
  salesId?: string | null;
  paymentType?: FinancialPaymentType | null;
  paymentStatus?: FinancialPaymentStatus | null;
  orderStatus?: string | null;
  collectionState?: AdminFinancialCollectionState | null;
  minAgeDays?: number | null;
  maxAgeDays?: number | null;
  confirmedFrom?: string | null;
  confirmedTo?: string | null;
  from?: string | null;
  to?: string | null;
  page?: number;
  pageSize?: number;
  sortBy?: string | null;
  sortDirection?: 'asc' | 'desc' | null;
};

export type AdminFinancialReceivablePaymentRoundDto = {
  paymentId: string | null;
  paymentCode?: string | null;
  paymentType: 'DEPOSIT' | 'REMAINING_PAYMENT';
  amount: number;
  status: FinancialPaymentStatus | 'NOT_CREATED' | string;
  provider?: FinancialPaymentProvider | string | null;
  createdAt?: string | null;
  paidAt?: string | null;
  expiredAt?: string | null;
  attemptCount?: number;
  failedAttemptCount?: number;
  lastFailureReason?: string | null;
};

export type AdminFinancialReceivableOrderDetailDto = {
  order: {
    orderId: string;
    orderCode: string;
    orderStatus: string | null;
    confirmedAt: string | null;
    finalTotalAmount: number;
  };
  project: {
    projectId: string;
    projectCode: string | null;
    projectName: string;
  };
  customer: {
    customerId: string | null;
    customerName: string | null;
  };
  summary: {
    paidAmount: number;
    remainingAmount: number;
    paymentProgressPercentage: number;
    receivableAgeDays: number;
    collectionState: AdminFinancialCollectionState;
    lastPaidAt: string | null;
    finalTotalAmount?: number;
  };
  paymentRounds: AdminFinancialReceivablePaymentRoundDto[];
  activePayment: AdminFinancialReceivablePaymentRoundDto | null;
  suggestedAction: string | null;
};

export type AdminFinancialPaymentBreakdownItemDto = {
  paymentType: 'PROJECT_START_FEE' | 'DEPOSIT' | 'REMAINING_PAYMENT';
  collectedAmount: number;
  paidCount: number;
  outstandingAmount: number;
  outstandingCount: number;
  expiredCount: number;
};

export type AdminFinancialPaymentBreakdownDto = {
  currency: string;
  items: AdminFinancialPaymentBreakdownItemDto[];
};

export type AdminFinancialDateRangeParams = {
  from: string;
  to: string;
  currency?: string | null;
};

export type AdminFinancialCollectionTrendBucketDto = {
  period: string;
  projectStartFee: number;
  deposit: number;
  remainingPayment: number;
  total: number;
};

export type AdminFinancialCollectionTrendDto = {
  granularity: 'MONTH' | string;
  timezone: 'Asia/Ho_Chi_Minh' | string;
  currency: string;
  series: AdminFinancialCollectionTrendBucketDto[];
};

export type AdminFinancialCollectionTrendParams = AdminFinancialDateRangeParams & {
  granularity?: 'MONTH' | null;
};

export type AdminFinancialProjectRowDto = {
  projectId: string;
  projectCode: string | null;
  projectName: string;
  projectStatus: string | null;
  customerId: string;
  customerName: string | null;
  assignedSalesId: string | null;
  assignedSalesName: string | null;
  projectStartFeeAmount: number | null;
  projectStartFeeStatus: FinancialPaymentStatus | null;
  projectStartFeePaidAt: string | null;
  orderId: string | null;
  orderCode: string | null;
  orderStatus: string | null;
  orderOriginalTotal: number | null;
  orderAdjustmentAmount: number | null;
  orderAdditionalDiscount: number | null;
  orderFinalTotal: number | null;
  orderPaidAmount: number | null;
  orderRemainingAmount: number | null;
  activePaymentId: string | null;
  activePaymentType: FinancialPaymentType | null;
  activePaymentAmount: number | null;
  activePaymentStatus: FinancialPaymentStatus | null;
  totalProjectCashCollected: number;
  lastPaidAt: string | null;
  /** Sum of PAID payments with PaidAt in [from, to] when both query params are sent. */
  collectedInPeriod?: number;
  /** Latest PAID payment PaidAt within [from, to]. */
  lastPaidInPeriod?: string | null;
};

export type AdminFinancialStatementEntryType = 'COLLECTION' | 'REFUND' | 'ADJUSTMENT';
export type AdminFinancialStatementDirection = 'CREDIT' | 'DEBIT';

export type AdminFinancialProjectStatementItemDto = {
  entryId: string;
  occurredAt: string;
  direction: AdminFinancialStatementDirection;
  entryType: AdminFinancialStatementEntryType;
  paymentType: FinancialPaymentType | null;
  description: string;
  referenceCode: string | null;
  orderId: string | null;
  orderCode: string | null;
  paymentId: string | null;
  provider: FinancialPaymentProvider | string | null;
  status: string | null;
  amount: number;
  runningBalance: number;
};

export type AdminFinancialProjectStatementDto = {
  project: {
    projectId: string;
    projectCode: string | null;
    projectName: string;
    customerName: string | null;
  };
  summary: {
    openingBalance: number;
    totalCollected: number;
    totalRefunded: number;
    netCollected: number;
    closingBalance: number;
  };
  items: AdminFinancialProjectStatementItemDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type AdminFinancialProjectStatementParams = {
  from?: string | null;
  to?: string | null;
  entryType?: AdminFinancialStatementEntryType | null;
  paymentType?: FinancialPaymentType | null;
  status?: string | null;
  provider?: FinancialPaymentProvider | null;
  page?: number;
  pageSize?: number;
  sortDirection?: 'asc' | 'desc' | null;
};

export type AdminFinancialProjectsDto = {
  items: AdminFinancialProjectRowDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type AdminFinancialProjectsParams = {
  keyword?: string | null;
  projectStatus?: string | null;
  customerId?: string | null;
  salesId?: string | null;
  paymentStatus?: FinancialPaymentStatus | null;
  paymentType?: FinancialPaymentType | null;
  hasOrder?: boolean | null;
  hasOutstandingPayment?: boolean | null;
  hasReceivable?: boolean | null;
  from?: string | null;
  to?: string | null;
  page?: number;
  pageSize?: number;
  sortBy?: string | null;
  sortDirection?: 'asc' | 'desc' | null;
};

export type AdminFinancialPaymentRowDto = {
  paymentId: string;
  paymentCode: string;
  projectId: string;
  projectCode: string | null;
  orderId: string | null;
  orderCode: string | null;
  customerId: string | null;
  customerName: string | null;
  paymentType: FinancialPaymentType | null;
  amount: number;
  currency: string;
  status: FinancialPaymentStatus | null;
  createdAt: string | null;
  expiredAt: string | null;
  paidAt: string | null;
  lastProvider: FinancialPaymentProvider | string | null;
  attemptCount: number;
  failedAttemptCount: number;
  lastTransactionStatus: string | null;
  lastFailureReason: string | null;
  lastAttemptAt: string | null;
};

export type AdminFinancialPaymentsDto = {
  items: AdminFinancialPaymentRowDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type AdminFinancialPaymentsParams = {
  projectId?: string | null;
  orderId?: string | null;
  customerId?: string | null;
  paymentType?: FinancialPaymentType | null;
  paymentStatus?: FinancialPaymentStatus | null;
  provider?: FinancialPaymentProvider | null;
  currency?: string | null;
  createdFrom?: string | null;
  createdTo?: string | null;
  paidFrom?: string | null;
  paidTo?: string | null;
  expiredFrom?: string | null;
  expiredTo?: string | null;
  hasFailedAttempt?: boolean | null;
  minFailedAttemptCount?: number | null;
  page?: number;
  pageSize?: number;
  sortBy?: string | null;
  sortDirection?: 'asc' | 'desc' | null;
};

export type AdminFinancialExceptionRowDto = {
  exceptionType: string;
  severity: string | null;
  projectId: string | null;
  orderId: string | null;
  paymentId: string | null;
  title: string;
  reason: string;
  amount: number | null;
  age: number | null;
  occurredAt: string | null;
  recommendedAction: string | null;
  targetResourceType: string | null;
  targetResourceId: string | null;
};

export type AdminFinancialExceptionsDto = {
  items: AdminFinancialExceptionRowDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type AdminFinancialExceptionsParams = {
  exceptionType?: string | null;
  severity?: string | null;
  projectId?: string | null;
  paymentType?: FinancialPaymentType | null;
  from?: string | null;
  to?: string | null;
  page?: number;
  pageSize?: number;
};

export function getAdminFinancialServiceResultMessage(error: unknown) {
  const result = getAdminFinancialServiceResultFromError(error);

  if (!result) {
    return 'Cannot connect to financial API. Please check backend and VITE_API_URL.';
  }

  if (Array.isArray(result.errors) && result.errors.length > 0) {
    return result.errors.join('\n');
  }

  return result.message || 'Request failed. Please try again.';
}

export function getAdminFinancialServiceResultFromError(error: unknown) {
  if (!(error instanceof AxiosError)) {
    return null;
  }

  const data = error.response?.data;

  if (data && typeof data === 'object' && 'status' in data) {
    return data as ServiceResult<unknown>;
  }

  return null;
}

export async function getAdminFinancialSummary(params: AdminFinancialSummaryParams = {}) {
  const response = await financialApiClient.get<ServiceResult<AdminFinancialSummaryDto>>(`${FINANCIAL_BASE}/summary`, {
    params: cleanParams({
      period: params.period ?? 'THIS_MONTH',
      from: params.from,
      to: params.to,
      currency: params.currency ?? 'VND',
    }),
  });

  return response.data.data;
}

export async function getAdminFinancialSummaryDrilldown(
  metric: AdminFinancialDrilldownMetric,
  params: AdminFinancialSummaryDrilldownParams,
) {
  const response = await financialApiClient.get<ServiceResult<AdminFinancialSummaryDrilldownDto>>(
    `${FINANCIAL_BASE}/summary/${metric}/drilldown`,
    {
      params: cleanParams({
        ...params,
        currency: params.currency ?? 'VND',
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
        sortBy: params.sortBy ?? 'occurredAt',
        sortDirection: params.sortDirection ?? 'desc',
      }),
    },
  );

  return response.data.data;
}

export async function getAdminFinancialReceivables(params: AdminFinancialReceivablesParams = {}) {
  const response = await financialApiClient.get<ServiceResult<AdminFinancialReceivablesDto>>(`${FINANCIAL_BASE}/receivables`, {
    params: cleanParams(params),
  });

  return response.data.data;
}

export async function getAdminFinancialReceivableItems(params: AdminFinancialReceivablesParams = {}) {
  const response = await financialApiClient.get<ServiceResult<AdminFinancialReceivablesDto>>(
    `${FINANCIAL_BASE}/receivables/items`,
    { params: cleanParams(params) },
  );

  return response.data.data;
}

export async function getAdminFinancialReceivableOrderDetail(orderId: string) {
  const response = await financialApiClient.get<ServiceResult<AdminFinancialReceivableOrderDetailDto>>(
    `${FINANCIAL_BASE}/receivables/orders/${orderId}`,
  );

  return response.data.data;
}

export async function getAdminFinancialPaymentBreakdown(params: AdminFinancialDateRangeParams) {
  const response = await financialApiClient.get<ServiceResult<AdminFinancialPaymentBreakdownDto>>(
    `${FINANCIAL_BASE}/payment-breakdown`,
    {
      params: cleanParams({
        from: params.from,
        to: params.to,
        currency: params.currency ?? 'VND',
      }),
    },
  );

  return response.data.data;
}

export async function getAdminFinancialCollectionTrend(params: AdminFinancialCollectionTrendParams) {
  const response = await financialApiClient.get<ServiceResult<AdminFinancialCollectionTrendDto>>(
    `${FINANCIAL_BASE}/collection-trend`,
    {
      params: cleanParams({
        from: params.from,
        to: params.to,
        granularity: params.granularity ?? 'MONTH',
        currency: params.currency ?? 'VND',
      }),
    },
  );

  return response.data.data;
}

export async function getAdminFinancialProjects(params: AdminFinancialProjectsParams = {}) {
  const response = await financialApiClient.get<ServiceResult<AdminFinancialProjectsDto>>(`${FINANCIAL_BASE}/projects`, {
    params: cleanParams(params),
  });

  return response.data.data;
}

export async function getAdminFinancialProject(projectId: string) {
  const response = await financialApiClient.get<ServiceResult<AdminFinancialProjectRowDto>>(
    `${FINANCIAL_BASE}/projects/${projectId}`,
  );

  return response.data.data;
}

export async function getAdminFinancialProjectStatement(
  projectId: string,
  params: AdminFinancialProjectStatementParams = {},
) {
  const response = await financialApiClient.get<ServiceResult<AdminFinancialProjectStatementDto>>(
    `${FINANCIAL_BASE}/projects/${projectId}/statement`,
    { params: cleanParams(params) },
  );

  return response.data.data;
}

export async function getAdminFinancialPayments(params: AdminFinancialPaymentsParams = {}) {
  const response = await financialApiClient.get<ServiceResult<AdminFinancialPaymentsDto>>(`${FINANCIAL_BASE}/payments`, {
    params: cleanParams(params),
  });

  return response.data.data;
}

export async function getAdminFinancialExceptions(params: AdminFinancialExceptionsParams = {}) {
  const response = await financialApiClient.get<ServiceResult<AdminFinancialExceptionsDto>>(`${FINANCIAL_BASE}/exceptions`, {
    params: cleanParams(params),
  });

  return response.data.data;
}

/** Build Asia/Ho_Chi_Minh midnight boundary for financial date filters. */
export function toFinancialDateTime(dateInput: string, edge: 'start' | 'end' = 'start') {
  if (!dateInput) return '';
  // Backend treats date-only midnight `to` as the full local day.
  if (edge === 'end') {
    return `${dateInput}T00:00:00+07:00`;
  }
  return `${dateInput}T00:00:00+07:00`;
}

export function getFinancialPeriodRange(
  period: FinancialPeriodType,
  customFrom?: string | null,
  customTo?: string | null,
): { from: string; to: string } {
  if (period === 'CUSTOM' && customFrom && customTo) {
    return {
      from: toFinancialDateTime(customFrom, 'start'),
      to: toFinancialDateTime(customTo, 'end'),
    };
  }

  const now = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }),
  );
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const today = `${yyyy}-${mm}-${dd}`;

  if (period === 'THIS_YEAR') {
    return {
      from: toFinancialDateTime(`${yyyy}-01-01`, 'start'),
      to: toFinancialDateTime(today, 'end'),
    };
  }

  return {
    from: toFinancialDateTime(`${yyyy}-${mm}-01`, 'start'),
    to: toFinancialDateTime(today, 'end'),
  };
}

function cleanParams(params: Record<string, unknown>) {
  const next: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    next[key] = value;
  }

  return next;
}

function getFinancialApiBaseUrl() {
  const configuredApiUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;

  return configuredApiUrl?.replace(/\/api\/?$/, '');
}
