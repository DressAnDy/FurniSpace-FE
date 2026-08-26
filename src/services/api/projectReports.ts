import axios, { AxiosError } from 'axios';

import { shouldRedirectUnauthorized } from '@/shared/config/authPreview';
import { getStoredAccessToken } from './tokenStore';

const projectReportApiClient = axios.create({
  baseURL: getProjectReportApiBaseUrl(),
  withCredentials: true,
});

projectReportApiClient.interceptors.request.use((config) => {
  const token = getStoredAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

projectReportApiClient.interceptors.response.use(
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
  message?: string | null;
  data: T;
  errors?: string[] | null;
  errorCode?: string | null;
};

export type PagedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type ProjectReportStageKey =
  | 'INTAKE'
  | 'DESIGNER_ASSIGNMENT'
  | 'DESIGN_REVIEW'
  | 'QUOTATION_ORDER'
  | 'PRODUCTION'
  | 'DELIVERY';

export type ProjectReportStageState = 'NOT_STARTED' | 'ACTIVE' | 'BLOCKED' | 'COMPLETED';

export type ProjectReportSeverity = 'WATCH' | 'ACTION' | 'ESCALATE';

export type ProjectReportOwnerRole = 'SALES' | 'DESIGNER' | 'PRODUCTION' | 'ADMIN';

export type ProjectReportAttentionReason =
  | 'UNASSIGNED_INTAKE'
  | 'WAITING_CUSTOMER_INFO'
  | 'START_FEE_BLOCKING'
  | 'WAITING_DESIGNER'
  | 'MEASUREMENT_OVERDUE'
  | 'PROPOSAL_STALLED'
  | 'QUOTATION_REVISION_LOOP'
  | 'PAYMENT_EXCEPTION'
  | 'PRODUCTION_BLOCKED'
  | 'DELIVERY_OVERDUE'
  | 'FINAL_PAYMENT_PENDING'
  | 'READY_TO_COMPLETE';

export type ProjectReportLinkType = 'WORKFLOW' | 'QUOTATION' | 'ORDER' | 'PRODUCTION_REQUEST';

export type ProjectReportListItemDto = {
  projectId: string;
  projectCode: string | null;
  projectName: string;
  projectStatus: string | null;
  stage: ProjectReportStageKey | string | null;
  customerId: string;
  customerName: string | null;
  assignedSalesId: string | null;
  assignedSalesName: string | null;
  assignedDesignerId: string | null;
  assignedDesignerName: string | null;
  ageDays: number;
  ageInStatusDays: number;
  attentionReason: ProjectReportAttentionReason | string | null;
  suggestedAction: string | null;
  ownerRole: ProjectReportOwnerRole | string | null;
  severity: ProjectReportSeverity | string | null;
  submittedAt: string | null;
};

export type ProjectReportAttentionDto = {
  reason: ProjectReportAttentionReason | string;
  severity: ProjectReportSeverity | string;
  ownerRole: ProjectReportOwnerRole | string;
  suggestedAction: string;
};

export type ProjectReportHeaderDto = {
  projectId: string;
  projectCode: string | null;
  projectName: string;
  projectStatus: string | null;
  stage: ProjectReportStageKey | string | null;
  isRejected: boolean;
  rejectionReason: string | null;
  businessType: string | null;
  projectAddress: string | null;
  customerId: string;
  customerName: string | null;
  assignedSalesId: string | null;
  assignedSalesName: string | null;
  assignedDesignerId: string | null;
  assignedDesignerName: string | null;
  submittedAt: string | null;
  salesAssignedAt: string | null;
  designerAssignedAt: string | null;
  completedAt: string | null;
  rejectedAt: string | null;
  ageDays: number;
  ageInStatusDays: number;
  primaryAttention: ProjectReportAttentionDto | null;
  allAttentionReasons: Array<ProjectReportAttentionReason | string>;
};

export type ProjectReportBlockerDto = {
  code: string;
  message: string;
};

export type ProjectReportLinkDto = {
  type: ProjectReportLinkType | string;
  id: string;
  label: string;
};

export type ProjectReportStageHealthDto = {
  stage: ProjectReportStageKey | string;
  state: ProjectReportStageState | string;
  statusInStage: string | null;
  title: string;
  summary: string;
  ageInStageDays: number;
  blockers: ProjectReportBlockerDto[];
  nextAction: {
    ownerRole: ProjectReportOwnerRole | string;
    suggestedAction: string;
  };
  links: ProjectReportLinkDto[];
};

export type ProjectReportFlowStageDto = {
  key: ProjectReportStageKey | string;
  label: string;
  state: ProjectReportStageState | string;
  completedAt: string | null;
};

export type ProjectReportFlowProgressDto = {
  stages: ProjectReportFlowStageDto[];
};

export type ProjectReportCommercialSnapshotDto = {
  projectStartFeeAmount: number | null;
  projectStartFeeStatus: string | null;
  projectStartFeePaidAt: string | null;
  orderId: string | null;
  orderCode: string | null;
  orderStatus: string | null;
  orderFinalTotal: number | null;
  orderPaidAmount: number | null;
  orderRemainingAmount: number | null;
  activePaymentId: string | null;
  activePaymentType: string | null;
  activePaymentAmount: number | null;
  activePaymentStatus: string | null;
  totalProjectCashCollected: number;
  lastPaidAt: string | null;
};

export type ProjectReportTerminalSummaryDto = {
  outcome: 'COMPLETED' | 'REJECTED' | string;
  completedAt: string | null;
  rejectedAt?: string | null;
  durationDays: number | null;
  note: string | null;
  rejectionReason?: string | null;
};

export type ProjectReportDetailDto = {
  header: ProjectReportHeaderDto;
  currentStageHealth: ProjectReportStageHealthDto | null;
  flowProgress: ProjectReportFlowProgressDto;
  commercialSnapshot: ProjectReportCommercialSnapshotDto;
  terminalSummary: ProjectReportTerminalSummaryDto | null;
};

export type ProjectReportListParams = {
  keyword?: string | null;
  stage?: ProjectReportStageKey | null;
  projectStatus?: string | null;
  attentionReason?: ProjectReportAttentionReason | null;
  severity?: ProjectReportSeverity | null;
  ownerRole?: ProjectReportOwnerRole | null;
  salesId?: string | null;
  designerId?: string | null;
  attentionOnly?: boolean;
  minAgeDays?: number | null;
  from?: string | null;
  to?: string | null;
  page?: number;
  pageSize?: number;
  sortBy?: 'severityDesc' | 'ageDaysDesc' | 'submittedAtAsc' | 'submittedAtDesc';
  sortDirection?: 'asc' | 'desc';
};

export async function getProjectReports(params?: ProjectReportListParams) {
  const response = await projectReportApiClient.get<ServiceResult<PagedResult<ProjectReportListItemDto>>>(
    '/admin/project-reports',
    { params: cleanListParams(params) },
  );
  const payload = response.data?.data;
  const page = payload?.page ?? params?.page ?? 1;
  const totalPages = Math.max(payload?.totalPages ?? 1, 1);

  return {
    items: payload?.items ?? [],
    page,
    pageSize: payload?.pageSize ?? params?.pageSize ?? 20,
    totalItems: payload?.totalItems ?? 0,
    totalPages,
    hasPreviousPage: payload?.hasPreviousPage ?? page > 1,
    hasNextPage: payload?.hasNextPage ?? page < totalPages,
  } satisfies PagedResult<ProjectReportListItemDto>;
}

export async function getProjectReportDetail(projectId: string) {
  const response = await projectReportApiClient.get<ServiceResult<ProjectReportDetailDto>>(
    `/admin/project-reports/${projectId}`,
  );
  const data = response.data?.data;
  if (!data?.header) {
    throw new Error('Admin project report payload is incomplete.');
  }

  return {
    header: {
      ...data.header,
      allAttentionReasons: data.header.allAttentionReasons ?? [],
    },
    currentStageHealth: data.currentStageHealth
      ? {
          ...data.currentStageHealth,
          blockers: data.currentStageHealth.blockers ?? [],
          links: data.currentStageHealth.links ?? [],
          nextAction: data.currentStageHealth.nextAction ?? {
            ownerRole: 'ADMIN',
            suggestedAction: '',
          },
        }
      : null,
    flowProgress: {
      stages: data.flowProgress?.stages ?? [],
    },
    commercialSnapshot: data.commercialSnapshot ?? {
      projectStartFeeAmount: null,
      projectStartFeeStatus: null,
      projectStartFeePaidAt: null,
      orderId: null,
      orderCode: null,
      orderStatus: null,
      orderFinalTotal: null,
      orderPaidAmount: null,
      orderRemainingAmount: null,
      activePaymentId: null,
      activePaymentType: null,
      activePaymentAmount: null,
      activePaymentStatus: null,
      totalProjectCashCollected: 0,
      lastPaidAt: null,
    },
    terminalSummary: data.terminalSummary ?? null,
  } satisfies ProjectReportDetailDto;
}

const PROJECT_REPORT_ERROR_MESSAGES: Record<string, string> = {
  PROJECT_REPORT_FILTER_INVALID: 'Bộ lọc hoặc khoảng ngày không hợp lệ. Kiểm tra lại từ ngày / đến ngày.',
  PROJECT_NOT_FOUND: 'Không tìm thấy báo cáo dự án này.',
};

export function getProjectReportServiceResultMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as ServiceResult<unknown> | undefined;
    const errorCode = payload?.errorCode;
    if (errorCode && PROJECT_REPORT_ERROR_MESSAGES[errorCode]) {
      return PROJECT_REPORT_ERROR_MESSAGES[errorCode];
    }
    if (payload?.message) return payload.message;
    if (payload?.errors?.length) return payload.errors.join(', ');
    if (error.response?.status === 404) return PROJECT_REPORT_ERROR_MESSAGES.PROJECT_NOT_FOUND;
    if (error.response?.status === 400) {
      return PROJECT_REPORT_ERROR_MESSAGES.PROJECT_REPORT_FILTER_INVALID;
    }
    if (error.response?.status === 500) {
      return 'Máy chủ gặp lỗi khi tải báo cáo. Thử bỏ bộ lọc ngày hoặc liên hệ BE nếu lỗi vẫn còn.';
    }
    if (error.message) return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Không tải được báo cáo dự án.';
}

/** Asia/Ho_Chi_Minh boundary for submittedAt filters on attention list. */
export function toProjectReportDateTime(dateInput: string) {
  if (!dateInput) return '';
  return `${dateInput}T00:00:00+07:00`;
}

function cleanListParams(params?: ProjectReportListParams) {
  if (!params) return undefined;

  const sortBy = params.sortBy ?? 'severityDesc';
  const sortHasDirection = /(?:Asc|Desc)$/.test(sortBy);

  return {
    keyword: params.keyword?.trim() || undefined,
    stage: params.stage || undefined,
    projectStatus: params.projectStatus || undefined,
    attentionReason: params.attentionReason || undefined,
    severity: params.severity || undefined,
    ownerRole: params.ownerRole || undefined,
    salesId: params.salesId || undefined,
    designerId: params.designerId || undefined,
    attentionOnly: params.attentionOnly ?? true,
    minAgeDays: params.minAgeDays ?? undefined,
    from: params.from?.trim() || undefined,
    to: params.to?.trim() || undefined,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
    sortBy,
    ...(sortHasDirection ? {} : { sortDirection: params.sortDirection ?? 'desc' }),
  };
}

function getProjectReportApiBaseUrl() {
  const configuredApiUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;
  return configuredApiUrl?.replace(/\/api\/?$/, '');
}
