import axios, { AxiosError } from 'axios';

import { shouldRedirectUnauthorized } from '@/shared/config/authPreview';
import { getStoredAccessToken } from './tokenStore';

const projectApiClient = axios.create({
  baseURL: getProjectApiBaseUrl(),
  withCredentials: true,
});

projectApiClient.interceptors.request.use((config) => {
  const token = getStoredAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.data instanceof FormData) {
    clearMultipartContentType(config.headers);
  }

  return config;
});

projectApiClient.interceptors.response.use(
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

export type ProjectStatus =
  | 'SUBMITTED'
  | 'IN_CONSULTATION'
  | 'NEED_BASIC_INFORMATION'
  | 'WAITING_FOR_DESIGNER_ASSIGNMENT'
  | 'MEASUREMENT_REQUIRED'
  | 'SPACE_VERIFIED'
  | 'PROPOSAL_CONSULTING'
  | 'PROPOSAL_SELECTED'
  | 'QUOTATION_SENT'
  | 'QUOTATION_REVISION_REQUESTED'
  | 'ORDER_CONFIRMED'
  | 'IN_PRODUCTION'
  | 'PRODUCTION_BLOCKED'
  | 'READY_FOR_DELIVERY'
  | 'DELIVERING'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'REJECTED';

export type ProjectListItemDto = {
  projectId: string;
  projectCode: string;
  projectName: string;
  businessType: string;
  status: ProjectStatus;
  customerId: string;
  assignedSalesId: string | null;
  assignedDesignerId: string | null;
  submittedAt: string;
};

export type ProjectDto = ProjectListItemDto & {
  projectAddress: string | null;
  businessPurpose: string | null;
  furnitureRequirement: string;
  description: string | null;
  totalAreaSqm: number | null;
  numberOfFloors: number | null;
  budgetMin: number | null;
  budgetMax: number | null;
  targetCompletionDate: string | null;
};

export type ProjectListData = {
  items: ProjectListItemDto[];
  page: number;
  limit: number;
  total: number;
};

export type ProjectListParams = {
  status?: ProjectStatus | null;
  assignedSalesId?: string | null;
  assignedDesignerId?: string | null;
  search?: string | null;
  page?: number;
  limit?: number;
};

export type CreateProjectInput = {
  projectName: string;
  businessType: string;
  projectAddress?: string | null;
  businessPurpose?: string | null;
  furnitureRequirement: string;
  description?: string | null;
  totalAreaSqm?: number | null;
  numberOfFloors?: number | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  targetCompletionDate?: string | null;
};

export type UpdateProjectBasicInformationInput = Partial<CreateProjectInput> & {
  projectId: string;
};

export type ProjectInformationRequestInput = {
  message: string;
  projectId: string;
};

export type FileType =
  | 'SPACE_IMAGE'
  | 'FLOOR_PLAN'
  | 'REFERENCE_IMAGE'
  | 'BRAND_ASSET'
  | 'CAD_FILE'
  | 'PDF_DRAWING'
  | 'MEASUREMENT_REPORT'
  | 'LIDAR_SCAN'
  | 'MODEL_3D'
  | 'TEXTURE'
  | 'PRODUCT_PREVIEW'
  | 'PROPOSAL_PREVIEW'
  | 'PROPOSAL_FILE'
  | 'QUOTATION_FILE'
  | 'ORDER_DOCUMENT'
  | 'PRODUCTION_FILE'
  | 'DELIVERY_PHOTO'
  | 'DELIVERY_NOTE'
  | 'REVIEW_IMAGE'
  | 'OTHER';

export type FileVisibility = 'CUSTOMER_VISIBLE' | 'STAFF_ONLY' | 'PRIVATE';

export type ProjectFileUploadResponseDto = {
  fileId: string;
  fileLinkId: string;
  projectId: string;
  originalFileName: string;
  fileName: string;
  fileType: FileType;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  publicUrl: string;
  status?: string | null;
  visibility: FileVisibility;
  uploadedBy: string;
  uploadedAt: string;
};

export type ProjectFileListItemDto = {
  fileId: string;
  fileLinkId: string;
  originalFileName: string;
  fileType: FileType;
  mimeType: string;
  fileSize: number;
  publicUrl: string;
  status?: string | null;
  visibility: FileVisibility;
  uploadedBy: string;
  uploadedAt: string;
};

export type ProjectFileListData = {
  items: ProjectFileListItemDto[];
  page: number;
  limit: number;
  total: number;
};

export type ProjectFileListParams = {
  projectId: string;
  fileType?: FileType | null;
  visibility?: FileVisibility | null;
  page?: number;
  limit?: number;
};

export type AssignSalesData = {
  projectId: string;
  assignedSalesId: string;
  status: ProjectStatus;
  salesAssignedAt: string;
};

export type ProjectSpaceDataStatus = 'SUFFICIENT' | 'INSUFFICIENT';

export type AssignDesignerInput = {
  projectId: string;
  designerId: string;
  spaceDataStatus: ProjectSpaceDataStatus;
  note?: string | null;
};

export type AssignDesignerData = {
  projectId: string;
  assignedDesigner: {
    accountId: string;
    fullName: string;
  };
  status: ProjectStatus;
  designerAssignedAt: string;
};

export type UpdateProjectStatusInput = {
  projectId: string;
  status: ProjectStatus;
  note?: string | null;
};

export type UpdateProjectStatusData = {
  projectId: string;
  status: ProjectStatus;
  updatedAt: string;
};

export function getProjectServiceResultMessage(error: unknown) {
  const result = getProjectServiceResultFromError(error);

  if (!result) {
    return 'Cannot connect to project API. Please check backend and VITE_API_URL.';
  }

  if (result.errors?.length) {
    return result.errors.join('\n');
  }

  return result.message || 'Request failed. Please try again.';
}

export function getProjectServiceResultFromError(error: unknown) {
  if (!(error instanceof AxiosError)) {
    return null;
  }

  const data = error.response?.data;

  if (data && typeof data === 'object' && 'status' in data) {
    return data as ServiceResult<unknown>;
  }

  return null;
}

export async function getProjects(params: ProjectListParams = {}) {
  const response = await projectApiClient.get<ServiceResult<ProjectListData>>('/projects', {
    params: {
      status: params.status ?? undefined,
      assignedSalesId: params.assignedSalesId ?? undefined,
      assignedDesignerId: params.assignedDesignerId ?? undefined,
      search: params.search?.trim() || undefined,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
  });

  return response.data.data;
}

export async function getProjectById(projectId: string) {
  const response = await projectApiClient.get<ServiceResult<ProjectDto>>(`/projects/${projectId}`);

  return response.data.data;
}

export async function createProject(input: CreateProjectInput) {
  const response = await projectApiClient.post<ServiceResult<ProjectDto>>('/projects', {
    projectName: input.projectName.trim(),
    businessType: input.businessType.trim(),
    projectAddress: input.projectAddress?.trim() || null,
    businessPurpose: input.businessPurpose?.trim() || null,
    furnitureRequirement: input.furnitureRequirement.trim(),
    description: input.description?.trim() || null,
    totalAreaSqm: input.totalAreaSqm ?? null,
    numberOfFloors: input.numberOfFloors ?? null,
    budgetMin: input.budgetMin ?? null,
    budgetMax: input.budgetMax ?? null,
    targetCompletionDate: input.targetCompletionDate || null,
  });

  return response.data.data;
}

export async function updateProjectBasicInformation(input: UpdateProjectBasicInformationInput) {
  const response = await projectApiClient.patch<ServiceResult<ProjectDto>>(
    `/projects/${input.projectId}/basic-information`,
    {
      projectName: input.projectName?.trim(),
      businessType: input.businessType?.trim(),
      projectAddress: input.projectAddress?.trim() || null,
      businessPurpose: input.businessPurpose?.trim() || null,
      furnitureRequirement: input.furnitureRequirement?.trim(),
      description: input.description?.trim() || null,
      totalAreaSqm: input.totalAreaSqm ?? null,
      numberOfFloors: input.numberOfFloors ?? null,
      budgetMin: input.budgetMin ?? null,
      budgetMax: input.budgetMax ?? null,
      targetCompletionDate: input.targetCompletionDate || null,
    },
  );

  return response.data.data;
}

export async function requestProjectInformation(input: ProjectInformationRequestInput) {
  const response = await projectApiClient.post<ServiceResult<ProjectDto>>(
    `/projects/${input.projectId}/information-requests`,
    {
      message: input.message.trim(),
    },
  );

  return response.data.data;
}

export async function assignDesignerToProject(input: AssignDesignerInput) {
  const response = await projectApiClient.patch<ServiceResult<AssignDesignerData>>(`/projects/${input.projectId}/designer-assignment`, {
    designerId: input.designerId,
    spaceDataStatus: input.spaceDataStatus,
    note: input.note?.trim() || null,
  });

  return response.data.data;
}

export async function updateProjectStatus(input: UpdateProjectStatusInput) {
  const response = await projectApiClient.patch<ServiceResult<UpdateProjectStatusData>>(`/projects/${input.projectId}/status`, {
    status: input.status,
    note: input.note?.trim() || null,
  });

  return response.data.data;
}

export async function getProjectFiles(params: ProjectFileListParams) {
  const response = await projectApiClient.get<ServiceResult<ProjectFileListData>>(`/projects/${params.projectId}/files`, {
    params: {
      fileType: params.fileType ?? undefined,
      visibility: params.visibility ?? undefined,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
  });

  return response.data.data;
}

export async function uploadProjectFile(
  projectId: string,
  file: File,
  options: {
    fileType?: FileType;
    visibility?: FileVisibility;
    note?: string | null;
  } = {},
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileType', options.fileType ?? inferProjectFileType(file));
  formData.append('visibility', options.visibility ?? 'CUSTOMER_VISIBLE');

  if (options.note?.trim()) {
    formData.append('note', options.note.trim());
  }

  const response = await projectApiClient.post<ServiceResult<ProjectFileUploadResponseDto>>(`/projects/${projectId}/files`, formData);

  return response.data.data;
}

export async function assignSalesToProject(projectId: string, note?: string | null) {
  const response = await projectApiClient.patch<ServiceResult<AssignSalesData>>(`/projects/${projectId}/sales-assignment`, {
    note: note?.trim() || 'Accepted for consultation.',
  });

  return response.data.data;
}

export function normalizeOptionalText(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeRequiredText(value: FormDataEntryValue | string | null | undefined) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeOptionalNumber(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function inferProjectFileType(file: File): FileType {
  if (file.type === 'application/pdf') {
    return 'FLOOR_PLAN';
  }

  if (file.type.startsWith('image/')) {
    return 'REFERENCE_IMAGE';
  }

  return 'OTHER';
}

function getProjectApiBaseUrl() {
  const configuredApiUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;

  return configuredApiUrl?.replace(/\/api\/?$/, '');
}

function clearMultipartContentType(headers: unknown) {
  const headerBag = headers as {
    set?: (name: string, value?: string | false) => void;
    [key: string]: unknown;
  };

  if (typeof headerBag.delete === 'function') {
    headerBag.delete('Content-Type');
    headerBag.delete('content-type');
    return;
  }

  if (typeof headerBag.set === 'function') {
    headerBag.set('Content-Type', false);
    return;
  }

  delete headerBag['Content-Type'];
  delete headerBag['content-type'];
}
