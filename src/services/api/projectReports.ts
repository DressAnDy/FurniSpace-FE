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

export type ProjectReportLinkType =
  | 'QUOTATION'
  | 'ORDER'
  | 'PAYMENT'
  | 'PRODUCTION_REQUEST'
  | 'SCHEDULE'
  | 'WORKFLOW';

export type ProjectReportListItemDto = {
  projectId: string;
  projectCode: string;
  projectName: string;
  projectStatus: string;
  stage: ProjectReportStageKey | null;
  customerId: string;
  customerName: string;
  assignedSalesId: string | null;
  assignedSalesName: string | null;
  assignedDesignerId: string | null;
  assignedDesignerName: string | null;
  ageDays: number;
  ageInStatusDays: number;
  attentionReason: ProjectReportAttentionReason | null;
  suggestedAction: string | null;
  ownerRole: ProjectReportOwnerRole | null;
  severity: ProjectReportSeverity | null;
  submittedAt: string;
};

export type ProjectReportAttentionDto = {
  reason: ProjectReportAttentionReason;
  severity: ProjectReportSeverity;
  ownerRole: ProjectReportOwnerRole;
  suggestedAction: string;
};

export type ProjectReportHeaderDto = {
  projectId: string;
  projectCode: string;
  projectName: string;
  projectStatus: string;
  stage: ProjectReportStageKey | null;
  isRejected: boolean;
  rejectionReason: string | null;
  businessType: string | null;
  projectAddress: string | null;
  customerId: string;
  customerName: string;
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
  allAttentionReasons: ProjectReportAttentionReason[];
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
  stage: ProjectReportStageKey;
  state: 'ACTIVE' | 'BLOCKED';
  statusInStage: string;
  title: string;
  summary: string;
  ageInStageDays: number;
  blockers: ProjectReportBlockerDto[];
  nextAction: {
    ownerRole: ProjectReportOwnerRole;
    suggestedAction: string;
  };
  links: ProjectReportLinkDto[];
};

export type ProjectReportFlowStageDto = {
  key: ProjectReportStageKey;
  label: string;
  state: ProjectReportStageState;
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
  totalProjectCashCollected: number | null;
  lastPaidAt: string | null;
};

export type ProjectReportTerminalSummaryDto = {
  outcome: 'COMPLETED' | 'REJECTED';
  completedAt: string | null;
  durationDays: number | null;
  note: string | null;
  rejectionReason?: string | null;
};

export type ProjectReportDetailDto = {
  header: ProjectReportHeaderDto;
  currentStageHealth: ProjectReportStageHealthDto | null;
  flowProgress: ProjectReportFlowProgressDto;
  commercialSnapshot: ProjectReportCommercialSnapshotDto | null;
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
  return response.data.data;
}

export async function getProjectReportDetail(projectId: string) {
  const response = await projectReportApiClient.get<ServiceResult<ProjectReportDetailDto>>(
    `/admin/project-reports/${projectId}`,
  );
  return response.data.data;
}

export function getProjectReportServiceResultMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as ServiceResult<unknown> | undefined;
    if (payload?.message) return payload.message;
    if (payload?.errors?.length) return payload.errors.join(', ');
    if (error.response?.status === 404) return 'Không tìm thấy báo cáo dự án này.';
    if (error.message) return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Không tải được báo cáo dự án.';
}

function cleanListParams(params?: ProjectReportListParams) {
  if (!params) return undefined;

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
    sortBy: params.sortBy ?? 'severityDesc',
    sortDirection: params.sortDirection ?? 'desc',
  };
}

function getProjectReportApiBaseUrl() {
  const configuredApiUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;
  return configuredApiUrl?.replace(/\/api\/?$/, '');
}
