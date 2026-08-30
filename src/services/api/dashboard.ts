import axios, { AxiosError } from 'axios';

import { shouldRedirectUnauthorized } from '@/shared/config/authPreview';
import { getStoredAccessToken } from './tokenStore';

const dashboardApiClient = axios.create({
  baseURL: getDashboardApiBaseUrl(),
  withCredentials: true,
});

dashboardApiClient.interceptors.request.use((config) => {
  const token = getStoredAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

dashboardApiClient.interceptors.response.use(
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

export type DashboardScope = 'mine' | 'team' | 'all';
export type DashboardDateRange = 'today' | 'thisWeek' | 'thisMonth';
export type DashboardPriority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
export type DashboardDueBucket = 'OVERDUE' | 'TODAY' | 'THIS_WEEK' | 'LATER';
export type ProductionDashboardWorkType = 'CUSTOMIZATION_REVIEW' | 'PRODUCTION_REQUEST' | 'DELIVERY';

export type DashboardQueueGroup =
  | 'Intake'
  | 'Design'
  | 'Proposal and Quotation'
  | 'Order and Payment'
  | 'Delivery'
  | 'Production';

export type ProductionDashboardQueueLinksDto = {
  versionId?: string | null;
  customizationRequestId?: string | null;
  projectId?: string | null;
  productionRequestId?: string | null;
  orderId?: string | null;
};

export type DashboardQueueItemDto = {
  id: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  customerName: string;
  assigneeName: string | null;
  group: DashboardQueueGroup | string;
  phase: string;
  status: string;
  priority: DashboardPriority;
  action: string;
  actionPath: string;
  /** Missing on legacy items → treat as PRODUCTION_REQUEST. */
  workType?: ProductionDashboardWorkType | string | null;
  entityId?: string | null;
  links?: ProductionDashboardQueueLinksDto | null;
  /** Production phase committed deadline (ProjectPhaseTimeline PRODUCTION due date). */
  dueAt: string | null;
  /** Derived from production deadline for queue sort/filter (today / thisWeek / thisMonth). */
  dueBucket: DashboardDueBucket | null;
  warning: string | null;
  lastUpdatedAt: string;
};

export type DashboardQueueResponseDto = {
  items: DashboardQueueItemDto[];
  countsByGroup: Record<string, number>;
  /** Filtered set totals (not current page only). Production queue. */
  countsByWorkType?: Record<string, number>;
  countsByStatus?: Record<string, number>;
  page: number;
  limit: number;
  total: number;
};

export type DashboardQueueQueryDto = {
  scope?: DashboardScope;
  group?: string | null;
  dateRange?: DashboardDateRange | null;
  priority?: DashboardPriority | null;
  search?: string | null;
  workType?: ProductionDashboardWorkType | null;
  status?: string | null;
  dueBucket?: DashboardDueBucket | null;
  page?: number;
  limit?: number;
};

export type SalesDashboardKpisDto = {
  newRequests: number;
  waitingCustomer: number;
  paymentFollowUp: number;
  overdueTasks: number;
  activeProjects: number;
};

export type DesignerDashboardKpisDto = {
  measurementDue: number;
  proposalsInProgress: number;
  revisionRequested: number;
  overdueTasks: number;
};

export type ProductionDashboardKpisDto = {
  pendingCustomizationReview: number;
  pendingStart: number;
  /** @deprecated Alias of pendingStart — keep for older payloads. */
  pendingReview?: number;
  inProduction: number;
  readyToComplete: number;
  /** Active requests past committed production deadline. */
  overdueTasks: number;
  readyForDelivery: number;
  awaitingDeliverySchedule: number;
  completedInRange: number;
};

export type DashboardKpiQueryDto = {
  scope?: DashboardScope;
  dateRange?: DashboardDateRange | null;
  search?: string | null;
};

export type ProjectPhaseDeadlineRiskPhase = 'PROPOSAL' | 'PRODUCTION';
export type ProjectPhaseDeadlineRiskStatus =
  | 'OVERDUE'
  | 'ON_TRACK'
  | 'COMPLETED_ON_TIME'
  | 'COMPLETED_LATE';

export type ProjectPhaseDeadlineRiskItemDto = {
  projectId: string;
  projectCode: string;
  projectName: string;
  phase: ProjectPhaseDeadlineRiskPhase | string;
  dueDate: string;
  completedAt: string | null;
  projectStatus: string;
  assignedSalesId: string | null;
  assignedSalesName: string | null;
  assignedDesignerId: string | null;
  assignedDesignerName: string | null;
  assignedProductionId: string | null;
  assignedProductionName: string | null;
  status: ProjectPhaseDeadlineRiskStatus | string;
  group: string;
  days: number;
};

export type ProjectPhaseDeadlineRiskResponseDto = {
  items: ProjectPhaseDeadlineRiskItemDto[];
  countsByGroup: Record<string, number>;
  page: number;
  limit: number;
  total: number;
};

export type ProjectPhaseDeadlineRiskParams = {
  phase?: ProjectPhaseDeadlineRiskPhase | null;
  status?: ProjectPhaseDeadlineRiskStatus | null;
  salesId?: string | null;
  designerId?: string | null;
  /** Filter by Production request assignee. */
  productionId?: string | null;
  from?: string | null;
  to?: string | null;
  page?: number;
  limit?: number;
};

export async function getSalesActionQueue(params?: DashboardQueueQueryDto) {
  const response = await dashboardApiClient.get<ServiceResult<DashboardQueueResponseDto>>('/api/dashboard/sales/action-queue', {
    params: getDashboardSearchParams(params),
  });

  return response.data.data;
}

export async function getSalesDashboardKpis(params?: DashboardKpiQueryDto) {
  const response = await dashboardApiClient.get<ServiceResult<SalesDashboardKpisDto>>('/api/dashboard/sales/kpis', {
    params: getDashboardSearchParams(params),
  });

  return response.data.data;
}

export async function getDesignerWorkQueue(params?: DashboardQueueQueryDto) {
  const response = await dashboardApiClient.get<ServiceResult<DashboardQueueResponseDto>>('/api/dashboard/designer/work-queue', {
    params: getDashboardSearchParams(params),
  });

  return response.data.data;
}

export async function getDesignerDashboardKpis(params?: DashboardKpiQueryDto) {
  const response = await dashboardApiClient.get<ServiceResult<DesignerDashboardKpisDto>>('/api/dashboard/designer/kpis', {
    params: getDashboardSearchParams(params),
  });

  return response.data.data;
}

export async function getProductionQueue(params?: DashboardQueueQueryDto) {
  const response = await dashboardApiClient.get<ServiceResult<DashboardQueueResponseDto>>('/api/dashboard/production/queue', {
    params: getDashboardSearchParams(params),
  });

  return response.data.data;
}

export async function getProductionDashboardKpis(params?: DashboardKpiQueryDto) {
  const response = await dashboardApiClient.get<ServiceResult<ProductionDashboardKpisDto>>('/api/dashboard/production/kpis', {
    params: getDashboardSearchParams(params),
  });

  return response.data.data;
}

export async function getProjectPhaseDeadlineRisks(params: ProjectPhaseDeadlineRiskParams = {}) {
  const response = await dashboardApiClient.get<ServiceResult<ProjectPhaseDeadlineRiskResponseDto>>(
    '/api/dashboard/project-phase-deadlines',
    {
      params: {
        phase: params.phase ?? undefined,
        status: params.status ?? undefined,
        salesId: params.salesId ?? undefined,
        designerId: params.designerId ?? undefined,
        productionId: params.productionId ?? undefined,
        from: params.from ?? undefined,
        to: params.to ?? undefined,
        page: params.page ?? 1,
        limit: params.limit ?? 20,
      },
    },
  );

  return response.data.data;
}

export function getDashboardServiceResultMessage(error: unknown) {
  const result = getDashboardServiceResultFromError(error);

  if (!result) {
    return 'Cannot connect to dashboard API. Please check backend and VITE_API_URL.';
  }

  if (result.errors?.length) {
    return result.errors.join('\n');
  }

  return result.message || 'Dashboard request failed. Please try again.';
}

function getDashboardSearchParams(params?: DashboardQueueQueryDto | DashboardKpiQueryDto) {
  if (!params) {
    return undefined;
  }

  return {
    scope: params.scope,
    dateRange: params.dateRange ?? undefined,
    ...('search' in params ? { search: params.search?.trim() || undefined } : {}),
    ...('group' in params ? { group: params.group ?? undefined } : {}),
    ...('priority' in params ? { priority: params.priority ?? undefined } : {}),
    ...('workType' in params ? { workType: params.workType ?? undefined } : {}),
    ...('status' in params ? { status: params.status ?? undefined } : {}),
    ...('dueBucket' in params ? { dueBucket: params.dueBucket ?? undefined } : {}),
    ...('page' in params ? { page: params.page } : {}),
    ...('limit' in params ? { limit: params.limit } : {}),
  };
}

function getDashboardServiceResultFromError(error: unknown) {
  if (!(error instanceof AxiosError)) {
    return null;
  }

  const data = error.response?.data;

  if (data && typeof data === 'object' && 'status' in data) {
    return data as ServiceResult<unknown>;
  }

  return null;
}

function getDashboardApiBaseUrl() {
  const configuredApiUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;

  return configuredApiUrl?.replace(/\/api\/?$/, '');
}
