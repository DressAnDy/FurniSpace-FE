import axios, { AxiosError } from 'axios';

import { shouldRedirectUnauthorized } from '@/shared/config/authPreview';

const scheduleApiClient = axios.create({
  baseURL: getScheduleApiBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
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
  errors?: string[];
};

export type ProjectScheduleType = 'MEASUREMENT' | 'CONSULTATION' | 'DESIGN_REVIEW' | 'DELIVERY' | 'HANDOVER' | 'OTHER';

export type ProjectScheduleStatus = 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export type ProjectScheduleDto = {
  scheduleId: string;
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

export function getProjectScheduleServiceResultMessage(error: unknown) {
  const result = getProjectScheduleServiceResultFromError(error);

  if (!result) {
    return 'Cannot connect to project schedule API. Please check backend and VITE_API_URL.';
  }

  if (result.errors?.length) {
    return result.errors.join('\n');
  }

  return result.message || 'Request failed. Please try again.';
}

export function getProjectScheduleServiceResultFromError(error: unknown) {
  if (!(error instanceof AxiosError)) {
    return null;
  }

  const data = error.response?.data;

  if (data && typeof data === 'object' && 'status' in data) {
    return data as ServiceResult<unknown>;
  }

  return null;
}

export async function createProjectSchedule(input: CreateProjectScheduleInput) {
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
    params: getScheduleListQueryParams(params),
  });

  return response.data.data;
}

export async function getMyAssignedProjectSchedules(params: MyAssignedScheduleListParams = {}) {
  const response = await scheduleApiClient.get<ServiceResult<ProjectScheduleListData>>('/project-schedules/my-assigned', {
    params: getScheduleListQueryParams(params),
  });

  return response.data.data;
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

function getScheduleListQueryParams(params: Partial<ProjectScheduleListParams>) {
  return {
    projectId: params.projectId,
    scheduleType: params.scheduleType ?? undefined,
    status: params.status ?? undefined,
    from: params.from ?? undefined,
    to: params.to ?? undefined,
    page: params.page ?? 1,
    limit: params.limit ?? 20,
  };
}

function normalizeScheduleOptionalText(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function getScheduleApiBaseUrl() {
  const configuredApiUrl = import.meta.env.VITE_SCHEDULE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;

  return configuredApiUrl?.replace(/\/api\/?$/, '');
}
