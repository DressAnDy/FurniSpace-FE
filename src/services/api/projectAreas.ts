import axios, { AxiosError } from 'axios';

import { shouldRedirectUnauthorized } from '@/shared/config/authPreview';
import { getStoredAccessToken } from './tokenStore';

const projectAreaApiClient = axios.create({
  baseURL: getProjectAreaApiBaseUrl(),
  withCredentials: true,
});

projectAreaApiClient.interceptors.request.use((config) => {
  const token = getStoredAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

projectAreaApiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && shouldRedirectUnauthorized()) {
      window.location.assign('/login');
    }

    return Promise.reject(error);
  },
);

export type ProjectAreaType = 'STORE' | 'FLOOR' | 'ROOM' | 'ZONE' | 'OUTDOOR_AREA' | 'OTHER';

export type ProjectAreaStatus = 'DRAFT' | 'NEED_MEASUREMENT' | 'MEASURED' | 'VERIFIED' | 'CANCELLED';

export type ProjectAreaDto = {
  projectAreaId: string;
  projectId: string;
  parentAreaId: string | null;
  areaName: string;
  areaType: ProjectAreaType;
  floorNumber: number | null;
  isSpecialLayout: boolean;
  description: string | null;
  areaSqm: number | null;
  width: number | null;
  length: number | null;
  height: number | null;
  currentCondition: string | null;
  requirementNote: string | null;
  status: ProjectAreaStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectAreaWriteInput = {
  projectId: string;
  parentAreaId?: string | null;
  areaName: string;
  areaType: ProjectAreaType;
  floorNumber?: number | null;
  isSpecialLayout?: boolean | null;
  description?: string | null;
  areaSqm?: number | null;
  width?: number | null;
  length?: number | null;
  height?: number | null;
  currentCondition?: string | null;
  requirementNote?: string | null;
  status?: ProjectAreaStatus | null;
};

export type UpdateProjectAreaInput = ProjectAreaWriteInput & {
  projectAreaId: string;
};

export type ProjectAreaListParams = {
  projectId: string;
  includeCancelled?: boolean;
};

type ServiceResult<T> = {
  status: number;
  message?: string;
  data: T;
  errors?: string[];
  errorCode?: string;
};

const PROJECT_AREA_ERROR_MESSAGES: Record<string, string> = {
  DUPLICATE_FLOOR_NUMBER: 'This floor already exists in the project.',
  INVALID_AREA_DIMENSION: 'Please check the area dimensions. Standard areas require positive width, length, height, and matching area.',
  INVALID_FLOOR_NUMBER: 'Floor number is invalid for this project.',
  INVALID_PARENT_AREA: 'The selected parent area is invalid for this area type.',
  PROJECT_AREA_ALREADY_CANCELLED: 'This project area has already been cancelled.',
  PROJECT_AREA_IN_USE_BY_PROPOSAL_ITEM: 'This area is already used by proposal items, so it cannot be cancelled.',
  PROJECT_AREA_IN_USE_BY_SCENE: 'This area is already used by proposal scenes, so it cannot be cancelled.',
  PROJECT_AREA_NOT_FOUND: 'Project area was not found.',
};

export function getProjectAreaServiceResultMessage(error: unknown) {
  const result = getProjectAreaServiceResultFromError(error);

  if (!result) {
    return 'Cannot connect to project area API. Please check backend and VITE_API_URL.';
  }

  if (result.errors?.length) {
    return result.errors.join('\n');
  }

  const mappedMessage = PROJECT_AREA_ERROR_MESSAGES[result.errorCode ?? ''];
  if (mappedMessage) {
    return mappedMessage;
  }

  if (result.errorCode === 'PROJECT_AREA_IN_USE') {
    return 'This area is already used by proposal scenes or proposal items, so it cannot be cancelled.';
  }

  return result.message || 'Request failed. Please try again.';
}

export function getProjectAreaServiceResultFromError(error: unknown) {
  if (!(error instanceof AxiosError)) {
    return null;
  }

  const data = error.response?.data;

  if (data && typeof data === 'object' && 'status' in data) {
    return data as ServiceResult<unknown>;
  }

  return null;
}

export async function getProjectAreas(params: ProjectAreaListParams) {
  const response = await projectAreaApiClient.get<ServiceResult<ProjectAreaDto[]>>(`/projects/${params.projectId}/areas`, {
    params: {
      includeCancelled: params.includeCancelled ? true : undefined,
    },
  });

  return response.data.data;
}

export async function createProjectArea(input: ProjectAreaWriteInput) {
  const response = await projectAreaApiClient.post<ServiceResult<ProjectAreaDto>>(
    `/projects/${input.projectId}/areas`,
    toProjectAreaPayload(input),
  );

  return response.data.data;
}

export async function updateProjectArea(input: UpdateProjectAreaInput) {
  const response = await projectAreaApiClient.patch<ServiceResult<ProjectAreaDto>>(
    `/project-areas/${input.projectAreaId}`,
    toProjectAreaPayload(input),
  );

  return response.data.data;
}

function toProjectAreaPayload(input: ProjectAreaWriteInput) {
  return {
    parentAreaId: input.parentAreaId ?? null,
    areaName: input.areaName.trim(),
    areaType: input.areaType,
    floorNumber: input.floorNumber ?? null,
    isSpecialLayout: input.isSpecialLayout ?? false,
    description: input.description?.trim() || null,
    areaSqm: input.areaSqm ?? null,
    width: input.width ?? null,
    length: input.length ?? null,
    height: input.height ?? null,
    currentCondition: input.currentCondition?.trim() || null,
    requirementNote: input.requirementNote?.trim() || null,
    status: input.status ?? undefined,
  };
}

function getProjectAreaApiBaseUrl() {
  const configuredApiUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;

  return configuredApiUrl?.replace(/\/api\/?$/, '');
}
