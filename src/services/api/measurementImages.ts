import axios, { AxiosError } from 'axios';

import { shouldRedirectUnauthorized } from '@/shared/config/authPreview';
import { getStoredAccessToken } from './tokenStore';

const measurementImageApiClient = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
});

measurementImageApiClient.interceptors.request.use((config) => {
  const token = getStoredAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

measurementImageApiClient.interceptors.response.use(
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

export type MeasurementImageScheduleDto = {
  scheduleId?: string | null;
  projectScheduleId?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  status?: string | null;
};

export type MeasurementImageAreaDto = {
  projectAreaId: string;
  areaName?: string | null;
};

export type MeasurementImageDto = {
  fileId: string;
  url?: string | null;
  publicUrl?: string | null;
  storagePath?: string | null;
  originalFileName?: string | null;
  uploadedAt?: string | null;
  measurementSchedule?: MeasurementImageScheduleDto | null;
  areas?: MeasurementImageAreaDto[];
};

export type MeasurementImageListData = {
  items: MeasurementImageDto[];
  page?: number;
  limit?: number;
  total?: number;
};

export type RegisterMeasurementImageInput = {
  contentType?: string | null;
  fileSizeBytes?: number | null;
  scheduleId: string;
  storagePath: string;
  publicUrl: string;
  originalFileName: string;
  mimeType?: string | null;
  fileSize?: number | null;
  visibility?: 'PRIVATE' | 'PROJECT' | 'PUBLIC' | string | null;
  note?: string | null;
};

export type MeasurementImageGalleryQuery = {
  assigned?: boolean | null;
  limit?: number;
  page?: number;
  projectAreaId?: string | null;
};

const MEASUREMENT_IMAGE_ERROR_MESSAGES: Record<string, string> = {
  MEASUREMENT_IMAGE_SCHEDULE_NOT_ELIGIBLE: 'This measurement schedule is not eligible for image registration.',
  MEASUREMENT_IMAGE_CAPTURE_BEFORE_START: 'Measurement images can only be registered after the schedule starts.',
  MEASUREMENT_IMAGE_INVALID_FILE_METADATA: 'Measurement image metadata is invalid.',
  MEASUREMENT_IMAGE_STORAGE_PATH_INVALID: 'Measurement image storage path is invalid.',
  MEASUREMENT_IMAGE_STORAGE_PATH_DUPLICATE: 'This measurement image has already been registered.',
  MEASUREMENT_IMAGE_NOT_FOUND: 'Measurement image was not found.',
  MEASUREMENT_IMAGE_AREA_LINK_EXISTS: 'This image is already linked to the selected area.',
  MEASUREMENT_IMAGE_AREA_LINK_NOT_FOUND: 'This image is not linked to the selected area.',
  MEASUREMENT_IMAGE_SCHEDULE_PROJECT_MISMATCH: 'This measurement image does not belong to the selected project area.',
};

export function getMeasurementImageServiceResultMessage(error: unknown) {
  const result = getMeasurementImageServiceResultFromError(error);

  if (!result) {
    return 'Cannot connect to measurement image API. Please check backend and VITE_API_URL.';
  }

  const errorCode = getFirstMeasurementImageErrorCode(result);

  if (errorCode && MEASUREMENT_IMAGE_ERROR_MESSAGES[errorCode]) {
    return MEASUREMENT_IMAGE_ERROR_MESSAGES[errorCode];
  }

  const errorMessages = getMeasurementImageErrorMessages(result);

  if (errorMessages.length) {
    return errorMessages.join('\n');
  }

  if (result.errorCode && MEASUREMENT_IMAGE_ERROR_MESSAGES[result.errorCode]) {
    return MEASUREMENT_IMAGE_ERROR_MESSAGES[result.errorCode];
  }

  return result.message || 'Request failed. Please try again.';
}

export function getMeasurementImageServiceResultFromError(error: unknown) {
  if (!(error instanceof AxiosError)) {
    return null;
  }

  const data = error.response?.data;

  if (data && typeof data === 'object') {
    const fallback = data as {
      detail?: string;
      errorCode?: string;
      errors?: ServiceResult<unknown>['errors'] | Record<string, string[]>;
      message?: string;
      title?: string;
    };

    return {
      status: error.response?.status ?? 500,
      message: fallback.message ?? fallback.detail ?? fallback.title,
      errorCode: fallback.errorCode,
      errors: Array.isArray(fallback.errors) ? fallback.errors : fallback.errors ? Object.values(fallback.errors).flat() : undefined,
      data: null as unknown,
    };
  }

  return null;
}

export async function registerMeasurementImage(input: RegisterMeasurementImageInput) {
  const response = await measurementImageApiClient.post<ServiceResult<MeasurementImageDto>>(
    `/project-schedules/${input.scheduleId}/measurement-images`,
    {
      storagePath: input.storagePath,
      publicUrl: input.publicUrl,
      originalFileName: input.originalFileName,
      contentType: input.contentType ?? input.mimeType ?? null,
      fileSizeBytes: input.fileSizeBytes ?? input.fileSize ?? null,
      mimeType: input.mimeType ?? null,
      fileSize: input.fileSize ?? null,
      visibility: input.visibility ?? null,
      note: input.note?.trim() || null,
    },
  );

  return response.data.data;
}

export async function getScheduleMeasurementImages(scheduleId: string, query: MeasurementImageGalleryQuery = {}) {
  const response = await measurementImageApiClient.get<ServiceResult<MeasurementImageListData>>(
    `/project-schedules/${scheduleId}/measurement-images`,
    { params: getGalleryParams(query) },
  );

  return response.data.data;
}

export async function getProjectMeasurementImages(projectId: string, query: MeasurementImageGalleryQuery = {}) {
  const response = await measurementImageApiClient.get<ServiceResult<MeasurementImageListData>>(
    `/projects/${projectId}/measurement-images`,
    { params: getGalleryParams(query) },
  );

  return response.data.data;
}

export async function getProjectAreaMeasurementImages(projectAreaId: string, query: MeasurementImageGalleryQuery = {}) {
  const response = await measurementImageApiClient.get<ServiceResult<MeasurementImageListData>>(
    `/project-areas/${projectAreaId}/measurement-images`,
    { params: getGalleryParams(query) },
  );

  return response.data.data;
}

export async function linkMeasurementImageToArea(projectAreaId: string, fileId: string) {
  const response = await measurementImageApiClient.post<ServiceResult<MeasurementImageDto>>(
    `/project-areas/${projectAreaId}/measurement-images/${fileId}/link`,
  );

  return response.data.data;
}

export async function unlinkMeasurementImageFromArea(projectAreaId: string, fileId: string) {
  const response = await measurementImageApiClient.delete<ServiceResult<MeasurementImageDto>>(
    `/project-areas/${projectAreaId}/measurement-images/${fileId}/link`,
  );

  return response.data.data;
}

function getApiBaseUrl() {
  const configuredApiUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;

  return configuredApiUrl?.replace(/\/api\/?$/, '');
}

function getGalleryParams(query: MeasurementImageGalleryQuery) {
  return {
    assigned: query.assigned ?? undefined,
    limit: query.limit ?? undefined,
    page: query.page ?? undefined,
    projectAreaId: query.projectAreaId ?? undefined,
  };
}

function getFirstMeasurementImageErrorCode(result: ServiceResult<unknown>) {
  const objectError = result.errors?.find((item): item is { code?: string } => typeof item === 'object' && item !== null && Boolean(item.code));

  return objectError?.code ?? result.errorCode;
}

function getMeasurementImageErrorMessages(result: ServiceResult<unknown>) {
  return (result.errors ?? [])
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item.code && MEASUREMENT_IMAGE_ERROR_MESSAGES[item.code]) return MEASUREMENT_IMAGE_ERROR_MESSAGES[item.code];
      return item.message ?? item.code ?? null;
    })
    .filter((message): message is string => Boolean(message));
}
