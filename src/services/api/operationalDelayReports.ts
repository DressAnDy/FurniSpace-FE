import axios, { AxiosError } from 'axios';

import { shouldRedirectUnauthorized } from '@/shared/config/authPreview';

import { getStoredAccessToken } from './tokenStore';

const operationalDelayApiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL,
  withCredentials: true,
});

operationalDelayApiClient.interceptors.request.use((config) => {
  const token = getStoredAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

operationalDelayApiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && shouldRedirectUnauthorized()) {
      window.location.assign('/login');
    }

    return Promise.reject(error);
  },
);

export type OperationalDelayPhase = 'PRODUCTION' | 'DELIVERY';
export type OperationalDelayState = 'AT_RISK' | 'OVERDUE';

export type OperationalDelayReportDto = {
  operationalDelayReportId: string;
  projectId: string;
  projectName: string | null;
  reportPhase: OperationalDelayPhase;
  productionRequestId: string | null;
  orderId: string | null;
  deliveryId: string | null;
  deadlineSnapshot: string;
  delayState: OperationalDelayState;
  reasonCode: string | null;
  reasonDetail: string;
  reportedBy: string;
  reporterName: string | null;
  reportedAt: string;
  createdAt: string;
};

export type OperationalDelayReportListDto = {
  items: OperationalDelayReportDto[];
};

export type CreateProductionDelayReportInput = {
  projectId: string;
  productionRequestId: string;
  reasonCode?: string | null;
  reasonDetail: string;
};

export type CreateDeliveryDelayReportInput = {
  projectId: string;
  orderId?: string | null;
  deliveryId?: string | null;
  reasonCode?: string | null;
  reasonDetail: string;
};

type ServiceResult<T> = {
  status: number;
  message?: string | null;
  data: T;
  errors?: string[] | null;
  errorCode?: string | null;
};

export async function getProjectOperationalDelayReports(projectId: string, phase?: OperationalDelayPhase) {
  const response = await operationalDelayApiClient.get<ServiceResult<OperationalDelayReportListDto>>(
    `/projects/${projectId}/delay-reports`,
    { params: { phase } },
  );

  return response.data.data;
}

export async function getOperationalDelayReport(reportId: string) {
  const response = await operationalDelayApiClient.get<ServiceResult<OperationalDelayReportDto>>(
    `/delay-reports/${reportId}`,
  );

  return response.data.data;
}

export async function createProductionDelayReport(input: CreateProductionDelayReportInput) {
  const { projectId, ...payload } = input;
  const response = await operationalDelayApiClient.post<ServiceResult<OperationalDelayReportDto>>(
    `/projects/${projectId}/delay-reports/production`,
    compactPayload(payload),
  );

  return response.data.data;
}

export async function createDeliveryDelayReport(input: CreateDeliveryDelayReportInput) {
  const { projectId, ...payload } = input;
  const response = await operationalDelayApiClient.post<ServiceResult<OperationalDelayReportDto>>(
    `/projects/${projectId}/delay-reports/delivery`,
    compactPayload(payload),
  );

  return response.data.data;
}

export function getOperationalDelayErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) return 'Unable to save the delay report.';

  const payload = error.response?.data as
    | { errorCode?: string | null; message?: string | null; errors?: string[] | null }
    | undefined;
  const messages: Record<string, string> = {
    OPERATIONAL_DELAY_PRODUCTION_DEADLINE_MISSING:
      'Set the production deadline before recording this report.',
    OPERATIONAL_DELAY_TARGET_COMPLETION_DATE_MISSING:
      'Set the project target completion date before recording this report.',
    OPERATIONAL_DELAY_PRODUCTION_REQUEST_PROJECT_MISMATCH:
      'The production request does not belong to this project.',
    OPERATIONAL_DELAY_ORDER_PROJECT_MISMATCH: 'The order does not belong to this project.',
    OPERATIONAL_DELAY_DELIVERY_PROJECT_MISMATCH:
      'The delivery batch does not belong to this project.',
    OPERATIONAL_DELAY_FORBIDDEN: 'You do not have permission to access delay reports for this project.',
  };

  return (
    (payload?.errorCode ? messages[payload.errorCode] : undefined) ??
    payload?.message ??
    payload?.errors?.[0] ??
    'Unable to save the delay report.'
  );
}

function compactPayload<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );
}
