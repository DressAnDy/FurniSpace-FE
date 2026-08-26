import axios, { AxiosError } from 'axios';

import { shouldRedirectUnauthorized } from '@/shared/config/authPreview';
import { SCHEDULE_OUTSIDE_BUSINESS_HOURS_MESSAGE, SCHEDULE_TIME_INVALID_MESSAGE } from '@/shared/utils/dateValidation';
import { getStoredAccessToken } from './tokenStore';

const scheduleApiClient = axios.create({
  baseURL: getScheduleApiBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

scheduleApiClient.interceptors.request.use((config) => {
  const token = getStoredAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

scheduleApiClient.interceptors.response.use(
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
  errors?: Array<string | { code?: string; message?: string; field?: string }>;
  errorCode?: string;
};

const SCHEDULE_ERROR_MESSAGES: Record<string, string> = {
  SCHEDULE_TIME_INVALID: SCHEDULE_TIME_INVALID_MESSAGE,
  SCHEDULE_OUTSIDE_BUSINESS_HOURS: SCHEDULE_OUTSIDE_BUSINESS_HOURS_MESSAGE,
  SCHEDULE_OVERLAP: 'Trùng lịch với appointment khác',
  SCHEDULE_MINIMUM_GAP_NOT_MET: 'Nhân viên phải cách lịch trước ít nhất 2 giờ',
  SCHEDULE_COMPLETE_BEFORE_START: 'This schedule cannot be completed before its start time.',
  SALES_CANNOT_CREATE_DELIVERY_SCHEDULE: 'Sales cannot create delivery schedules in the current delivery workflow.',
  ORDER_NOT_READY_FOR_DELIVERY: 'This order is not ready for delivery scheduling yet.',
  STAFF_SCHEDULE_OVERLAP: 'The assigned staff already has a schedule during this time.',
  SCHEDULE_DATE_EXCEEDS_TARGET: 'Schedule date cannot be after the project target completion date.',
  SCHEDULE_CHANGE_NOTE_REQUIRED: 'Please add a note for the schedule change request.',
  INVALID_SCHEDULE_TYPE: 'This action is not available for this schedule type.',
  INVALID_SCHEDULE_STATUS_TRANSITION: 'This schedule cannot move to the requested status.',
  INVALID_DELIVERY_SCHEDULE: 'Delivery schedules require start time, end time, assigned staff, and location.',
  DELIVERY_SCHEDULE_NOT_ALLOWED_AFTER_COMPLETION: 'Delivery has already been fully confirmed for this order.',
  PRODUCTION_NOT_COMPLETED_FOR_DELIVERY_SCHEDULE: 'Production must be completed before planning delivery.',
  NO_REMAINING_DELIVERY_QUANTITY: 'There is no remaining quantity to deliver.',
  DELIVERY_SCHEDULE_REQUIRES_COMPLETED_BATCH: 'Delivery schedules are completed automatically after their linked batch is completed.',
  DELIVERY_IN_PROGRESS_BLOCKS_SCHEDULE_CANCEL: 'This delivery schedule cannot be cancelled while its batch is in progress.',
  DELIVERY_SCHEDULE_LOCATION_FROZEN: 'Delivery location cannot be changed after a batch has been created for this schedule.',
};

export type ProjectScheduleType = 'MEASUREMENT' | 'CONSULTATION' | 'DESIGN_REVIEW' | 'DELIVERY' | 'HANDOVER' | 'OTHER';

export type ProjectScheduleStatus = 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export type ProjectScheduleDto = {
  scheduleId: string;
  projectScheduleId?: string;
  projectId: string;
  projectAreaId: string | null;
  createdBy: string;
  assignedStaffId: string | null;
  scheduleType: ProjectScheduleType;
  title: string | null;
  description: string | null;
  scheduledStart: string;
  scheduledEnd: string | null;
  location: string | null;
  status: ProjectScheduleStatus;
  customerNote: string | null;
  internalNote: string | null;
  createdAt: string;
  updatedAt: string | null;
  completedAt?: string | null;
  canMoveToProposalConsulting?: boolean | null;
  cancelledAt: string | null;
};

export type ProjectScheduleListData = {
  items: ProjectScheduleDto[];
  total: number;
  page: number;
  limit: number;
};

export type ProjectScheduleListParams = {
  projectId: string;
  scheduleType?: ProjectScheduleType | null;
  status?: ProjectScheduleStatus | null;
  from?: string | null;
  to?: string | null;
  page?: number;
  limit?: number;
};

export type MyAssignedScheduleListParams = Omit<ProjectScheduleListParams, 'projectId'>;

export type CreateProjectScheduleInput = {
  projectId: string;
  scheduleType?: ProjectScheduleType | null;
  title?: string | null;
  description?: string | null;
  assignedStaffId?: string | null;
  scheduledStart: string;
  scheduledEnd?: string | null;
  location?: string | null;
  customerNote?: string | null;
  internalNote?: string | null;
};

export type UpdateProjectScheduleInput = {
  scheduleId: string;
  title?: string | null;
  description?: string | null;
  assignedStaffId?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  location?: string | null;
  customerNote?: string | null;
  internalNote?: string | null;
};

export type UpdateProjectScheduleStatusInput = {
  scheduleId: string;
  status: Extract<ProjectScheduleStatus, 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'>;
  note?: string | null;
};

export type RequestProjectScheduleChangeInput = {
  scheduleId: string;
  note: string;
};

export type DeleteProjectScheduleData = {
  scheduleId: string;
};

export function getProjectScheduleServiceResultMessage(error: unknown) {
  const result = getProjectScheduleServiceResultFromError(error);

  if (!result) {
    return 'Cannot connect to project schedule API. Please check backend and VITE_API_URL.';
  }

  const errorCode = getFirstScheduleErrorCode(result);

  if (errorCode && SCHEDULE_ERROR_MESSAGES[errorCode]) {
    return SCHEDULE_ERROR_MESSAGES[errorCode];
  }

  const errorMessages = getScheduleErrorMessages(result);

  if (errorMessages.length) {
    return errorMessages.join('\n');
  }

  if (result.errorCode && SCHEDULE_ERROR_MESSAGES[result.errorCode]) {
    return SCHEDULE_ERROR_MESSAGES[result.errorCode];
  }

  return result.message || 'Request failed. Please try again.';
}

export function getProjectScheduleServiceResultFromError(error: unknown) {
  if (!(error instanceof AxiosError)) {
    return null;
  }

  const data = error.response?.data;

  if (data && typeof data === 'object' && 'status' in data) {
    const fallback = data as {
      detail?: string;
      errors?: string[] | Record<string, string[]>;
      message?: string;
      title?: string;
    };

    return {
      status: error.response?.status ?? 500,
      message: fallback.message ?? fallback.detail ?? fallback.title,
      errorCode: (fallback as { errorCode?: string }).errorCode,
      errors: normalizeScheduleErrors(fallback.errors),
      data: null as unknown,
    };
  }

  return null;
}

export async function createProjectSchedule(input: CreateProjectScheduleInput) {
  const response = await scheduleApiClient.post<ServiceResult<ProjectScheduleDto>>(`/projects/${input.projectId}/schedules`, {
    scheduleType: input.scheduleType ?? undefined,
    title: normalizeScheduleOptionalText(input.title),
    description: normalizeScheduleOptionalText(input.description),
    assignedStaffId: normalizeScheduleOptionalText(input.assignedStaffId),
    scheduledStart: input.scheduledStart,
    scheduledEnd: input.scheduledEnd ?? null,
    location: normalizeScheduleOptionalText(input.location),
    customerNote: normalizeScheduleOptionalText(input.customerNote),
    internalNote: normalizeScheduleOptionalText(input.internalNote),
  });

  return response.data.data;
}

export async function createProjectScheduleAlias(input: CreateProjectScheduleInput) {
  const response = await scheduleApiClient.post<ServiceResult<ProjectScheduleDto>>(`/project-schedules/${input.projectId}`, {
    scheduleType: input.scheduleType ?? undefined,
    title: normalizeScheduleOptionalText(input.title),
    description: normalizeScheduleOptionalText(input.description),
    assignedStaffId: normalizeScheduleOptionalText(input.assignedStaffId),
    scheduledStart: input.scheduledStart,
    scheduledEnd: input.scheduledEnd ?? null,
    location: normalizeScheduleOptionalText(input.location),
    customerNote: normalizeScheduleOptionalText(input.customerNote),
    internalNote: normalizeScheduleOptionalText(input.internalNote),
  });

  return response.data.data;
}

export async function getProjectSchedules(params: ProjectScheduleListParams) {
  const response = await scheduleApiClient.get<ServiceResult<ProjectScheduleListData>>('/project-schedules', {
    params: getProjectScheduleListQueryParams(params),
  });

  return response.data.data;
}

/** Fetches every page for one project so calendar views are not truncated by the list limit. */
export async function getAllProjectSchedules(params: ProjectScheduleListParams) {
  const limit = normalizeScheduleListLimit(params.limit);
  const firstPage = await getProjectSchedules({ ...params, page: 1, limit });
  const items = [...firstPage.items];
  const totalPages = Math.max(1, Math.ceil((firstPage.total || 0) / limit));

  for (let page = 2; page <= totalPages; page += 1) {
    const nextPage = await getProjectSchedules({ ...params, page, limit });
    items.push(...nextPage.items);
  }

  return {
    items,
    total: firstPage.total,
    page: 1,
    limit,
  } satisfies ProjectScheduleListData;
}

export async function getMyAssignedProjectSchedules(params: MyAssignedScheduleListParams = {}) {
  const response = await scheduleApiClient.get<ServiceResult<ProjectScheduleListData>>('/project-schedules/my-assigned', {
    params: getAssignedScheduleListQueryParams(params),
  });

  return response.data.data;
}

/** Fetches every page of schedules assigned to the current user. */
export async function getAllMyAssignedProjectSchedules(params: MyAssignedScheduleListParams = {}) {
  const limit = normalizeScheduleListLimit(params.limit);
  const firstPage = await getMyAssignedProjectSchedules({ ...params, page: 1, limit });
  const items = [...firstPage.items];
  const totalPages = Math.max(1, Math.ceil((firstPage.total || 0) / limit));

  for (let page = 2; page <= totalPages; page += 1) {
    const nextPage = await getMyAssignedProjectSchedules({ ...params, page, limit });
    items.push(...nextPage.items);
  }

  return {
    items,
    total: firstPage.total,
    page: 1,
    limit,
  } satisfies ProjectScheduleListData;
}

/** Aggregates schedules across many projects in bounded concurrency (avoids N separate React Query entries). */
export async function getSchedulesForProjects(
  projectIds: string[],
  params: Omit<ProjectScheduleListParams, 'projectId'> = {},
) {
  const uniqueProjectIds = Array.from(new Set(projectIds.map((id) => id.trim()).filter(Boolean)));
  const results = await mapWithConcurrency(uniqueProjectIds, SCHEDULE_PROJECT_FETCH_CONCURRENCY, (projectId) =>
    getAllProjectSchedules({ ...params, projectId }),
  );

  return results.flatMap((result) => result.items);
}

export async function getProjectScheduleById(scheduleId: string) {
  const response = await scheduleApiClient.get<ServiceResult<ProjectScheduleDto>>(`/project-schedules/${scheduleId}`);

  return response.data.data;
}

export async function updateProjectSchedule(input: UpdateProjectScheduleInput) {
  const response = await scheduleApiClient.patch<ServiceResult<ProjectScheduleDto>>(`/project-schedules/${input.scheduleId}`, {
    title: normalizeScheduleOptionalText(input.title),
    description: normalizeScheduleOptionalText(input.description),
    assignedStaffId: normalizeScheduleOptionalText(input.assignedStaffId),
    scheduledStart: input.scheduledStart ?? undefined,
    scheduledEnd: input.scheduledEnd ?? undefined,
    location: normalizeScheduleOptionalText(input.location),
    customerNote: normalizeScheduleOptionalText(input.customerNote),
    internalNote: normalizeScheduleOptionalText(input.internalNote),
  });

  return response.data.data;
}

export async function updateProjectScheduleStatus(input: UpdateProjectScheduleStatusInput) {
  const response = await scheduleApiClient.patch<ServiceResult<ProjectScheduleDto>>(`/project-schedules/${input.scheduleId}/status`, {
    status: input.status,
    note: normalizeScheduleOptionalText(input.note),
  });

  return response.data.data;
}

export async function requestProjectScheduleChange(input: RequestProjectScheduleChangeInput) {
  const response = await scheduleApiClient.post<ServiceResult<ProjectScheduleDto>>(`/project-schedules/${input.scheduleId}/request-change`, {
    note: input.note.trim(),
  });

  return response.data.data;
}

export async function deleteProjectSchedule(scheduleId: string) {
  const response = await scheduleApiClient.delete<ServiceResult<DeleteProjectScheduleData>>(`/project-schedules/${scheduleId}`);

  return response.data.data;
}

function getProjectScheduleListQueryParams(params: ProjectScheduleListParams) {
  return {
    projectId: params.projectId.trim(),
    ...getScheduleFilterQueryParams(params),
  };
}

function getAssignedScheduleListQueryParams(params: MyAssignedScheduleListParams) {
  return getScheduleFilterQueryParams(params);
}

function getScheduleFilterQueryParams(params: MyAssignedScheduleListParams) {
  return {
    scheduleType: params.scheduleType ?? undefined,
    status: params.status ?? undefined,
    from: params.from ?? undefined,
    to: params.to ?? undefined,
    page: params.page ?? 1,
    limit: normalizeScheduleListLimit(params.limit),
  };
}

const SCHEDULE_LIST_MAX_LIMIT = 100;
const SCHEDULE_PROJECT_FETCH_CONCURRENCY = 5;

function normalizeScheduleListLimit(limit: number | null | undefined) {
  if (!Number.isFinite(limit ?? NaN)) {
    return 20;
  }

  return Math.min(Math.max(Math.trunc(limit as number), 1), SCHEDULE_LIST_MAX_LIMIT);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
) {
  if (items.length === 0) {
    return [] as R[];
  }

  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  const workerCount = Math.min(Math.max(concurrency, 1), items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
  }

function normalizeScheduleOptionalText(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function normalizeScheduleErrors(errors: unknown) {
  if (Array.isArray(errors)) {
    return errors as ServiceResult<unknown>['errors'];
  }

  if (errors && typeof errors === 'object') {
    return Object.values(errors as Record<string, string[]>).flat();
  }

  return undefined;
}

function getFirstScheduleErrorCode(result: ServiceResult<unknown>) {
  const objectError = result.errors?.find((item): item is { code?: string } => typeof item === 'object' && item !== null && Boolean(item.code));

  return objectError?.code ?? result.errorCode;
}

function getScheduleErrorMessages(result: ServiceResult<unknown>) {
  return (result.errors ?? [])
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item.code && SCHEDULE_ERROR_MESSAGES[item.code]) return SCHEDULE_ERROR_MESSAGES[item.code];
      return item.message ?? item.code ?? null;
    })
    .filter((message): message is string => Boolean(message));
}

function getScheduleApiBaseUrl() {
  const configuredApiUrl = import.meta.env.VITE_SCHEDULE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;

  return configuredApiUrl?.replace(/\/api\/?$/, '');
}
