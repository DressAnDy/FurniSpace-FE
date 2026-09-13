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
  errors?: Array<string | { code?: string; message?: string; field?: string }>;
  errorCode?: string;
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
  | 'READY_FOR_DELIVERY'
  | 'DELIVERING'
  | 'AWAITING_CUSTOMER_CONFIRMATION'
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
  deliverySummary?: ProjectDeliverySummaryDto | null;
  phaseDeadlines?: ProjectPhaseDeadlineItemDto[];
};

export type ProjectDeliverySummaryDto = {
  status?: string | null;
  deliveredQuantity: number;
  totalQuantity: number;
  remainingQuantity: number;
  deliveryProgressPercent: number;
  nextDeliveryAt?: string | null;
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
  | 'PREVIEW'
  | 'LAYOUT_ASSET'
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

export type ProjectFileUploadOptions = {
  fileType?: FileType;
  visibility?: FileVisibility;
  note?: string | null;
  onUploadProgress?: (progressPercent: number) => void;
};

/** JSON body for POST /projects/{projectId}/files/upload-url */
export type ProjectFileUploadUrlRequest = {
  originalFileName: string;
  contentType: string;
  fileSizeBytes: number;
  fileType: FileType;
  visibility?: FileVisibility;
  note?: string;
};

export type ProjectFileUploadUrlResponse = {
  fileId: string;
  projectId: string;
  uploadUrl: string;
  contentType: string;
  expiresAt: string;
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
  proposalDeadline: string;
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
  proposalDeadline?: string | null;
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

export type ProjectCompletionDto = {
  projectId: string;
  projectStatus: Extract<ProjectStatus, 'COMPLETED'>;
  completedAt?: string | null;
};

export type ReopenProposalData = {
  projectId: string;
  status: ProjectStatus;
  proposalStatus?: string | null;
  cancelledQuotationId?: string | null;
  cancelledOrderId?: string | null;
  reopenedAt?: string | null;
};

export type ProjectWorkflowStageKey =
  | 'INTAKE'
  | 'DESIGNER_ASSIGNMENT'
  | 'DESIGN_REVIEW'
  | 'QUOTATION_ORDER'
  | 'PRODUCTION'
  | 'DELIVERY';

export type ProjectWorkflowStageState = 'NOT_STARTED' | 'ACTIVE' | 'BLOCKED' | 'COMPLETED';

export type ProjectWorkflowLinkType =
  | 'SALES'
  | 'DESIGNER'
  | 'PROPOSAL'
  | 'QUOTATION'
  | 'ORDER'
  | 'PRODUCTION_REQUEST'
  | 'SCHEDULE'
  | 'PAYMENT';

export type ProjectWorkflowMetricUnit = 'days' | 'count' | 'money' | 'percent' | null;

export type ProjectWorkflowMetricDto = {
  key: string;
  label: string;
  value: number | string | null;
  unit: ProjectWorkflowMetricUnit;
};

export type ProjectWorkflowLinkDto = {
  type: ProjectWorkflowLinkType;
  id: string;
  label: string;
};

export type ProjectWorkflowStageDto = {
  key: ProjectWorkflowStageKey;
  label: string;
  state: ProjectWorkflowStageState;
  statusInStage: string | null;
  summary: {
    title: string;
    description: string;
    blockerCount: number;
    primaryOwnerName: string | null;
  };
  metrics: ProjectWorkflowMetricDto[];
  links: ProjectWorkflowLinkDto[];
  facts: Record<string, string | number | null>;
};

export type ProjectWorkflowDto = {
  projectId: string;
  projectCode: string | null;
  projectName: string;
  currentStatus: string | null;
  currentStage: ProjectWorkflowStageKey | null;
  isRejected: boolean;
  owners: {
    customerId: string | null;
    customerName: string | null;
    assignedSalesId: string | null;
    salesName: string | null;
    assignedDesignerId: string | null;
    designerName: string | null;
  };
  stages: ProjectWorkflowStageDto[];
};

export type ProjectPhaseDeadlinePhase = 'REQUEST' | 'DESIGN' | 'QUOTATION' | 'PRODUCTION' | 'DELIVERY' | 'PROPOSAL' | string;

export type ProjectPhaseDeadlineStatus =
  | 'NOT_STARTED'
  | 'PLANNED'
  | 'ON_TRACK'
  | 'OVERDUE'
  | 'COMPLETED_ON_TIME'
  | 'COMPLETED_LATE';

export type ProjectPhaseDeadlineItemDto = {
  phase: ProjectPhaseDeadlinePhase;
  startedAt?: string | null;
  deadlineAt?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  status?: ProjectPhaseDeadlineStatus | null;
  overdueDays?: number | null;
};

export type ProjectPhaseDeadlinesDto = {
  projectId: string;
  targetCompletionDate?: string | null;
  deadlines: ProjectPhaseDeadlineItemDto[];
};

export type UpdateProjectPhaseDeadlinesInput = {
  projectId: string;
  proposalDueDate?: string | null;
  productionDueDate?: string | null;
};

export type UpdateProductionDeadlineInput = {
  projectId: string;
  productionDeadline: string;
};

export class ProjectFileStorageUploadError extends Error {
  constructor(message = 'Cannot upload file to storage. Please try again.') {
    super(message);
    this.name = 'ProjectFileStorageUploadError';
  }
}

export function getProjectServiceResultMessage(error: unknown) {
  if (error instanceof ProjectFileStorageUploadError) {
    return error.message;
  }

  const result = getProjectServiceResultFromError(error);

  if (!result) {
    return 'Cannot connect to project API. Please check backend and VITE_API_URL.';
  }

  const errorCode = getFirstProjectErrorCode(result);

  if (errorCode) {
    return getProjectErrorCodeMessage(errorCode);
  }

  const errorMessages = getProjectErrorMessages(result);

  if (errorMessages.length) {
    return errorMessages.join('\n');
  }

  if (result.errorCode) {
    return getProjectErrorCodeMessage(result.errorCode);
  }

  return result.message || 'Request failed. Please try again.';
}

export function getProjectServiceResultFromError(error: unknown) {
  if (!(error instanceof AxiosError)) {
    return null;
  }

  const data = error.response?.data;

  if (data && typeof data === 'object' && 'status' in data) {
    const result = data as ServiceResult<unknown> & {
      detail?: string;
      title?: string;
    };

    return {
      ...result,
      status: error.response?.status ?? result.status ?? 500,
      message: result.message ?? result.detail ?? result.title,
    };
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

export async function getAdminProjectWorkflow(projectId: string) {
  const response = await projectApiClient.get<ServiceResult<ProjectWorkflowDto>>(
    `/admin/projects/${projectId}/workflow`,
  );

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
    proposalDeadline: input.proposalDeadline,
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

export async function getProjectPhaseDeadlines(projectId: string) {
  const response = await projectApiClient.get<ServiceResult<ProjectPhaseDeadlinesDto>>(
    `/projects/${projectId}/phase-deadlines`,
  );

  return normalizeProjectPhaseDeadlines(response.data.data);
}

/** @deprecated Always fails on BE — use assign designer (proposal) or updateProductionDeadline. */
export async function updateProjectPhaseDeadlines(input: UpdateProjectPhaseDeadlinesInput) {
  const response = await projectApiClient.put<ServiceResult<ProjectPhaseDeadlinesDto>>(
    `/projects/${input.projectId}/phase-deadlines`,
    {
      proposalDueDate: input.proposalDueDate || null,
      productionDueDate: input.productionDueDate || null,
    },
  );

  return normalizeProjectPhaseDeadlines(response.data.data);
}

export async function updateProductionDeadline(input: UpdateProductionDeadlineInput) {
  const response = await projectApiClient.put<
    ServiceResult<ProjectPhaseDeadlineItemDto & { projectId?: string; orderId?: string | null }>
  >(`/projects/${input.projectId}/phase-deadlines/production`, {
    productionDeadline: input.productionDeadline,
  });

  return normalizeProjectPhaseDeadline(response.data.data);
}

export async function completeProject(projectId: string) {
  const response = await projectApiClient.patch<ServiceResult<ProjectCompletionDto>>(`/projects/${projectId}/complete`);

  return response.data.data;
}

export async function reopenProjectProposal(projectId: string) {
  const response = await projectApiClient.post<ServiceResult<ReopenProposalData>>(`/projects/${projectId}/reopen-proposal`);

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

const PROJECT_FILE_UPLOAD_RETRY_CODES = new Set([
  'PROJECT_FILE_UPLOAD_OBJECT_MISSING',
  'PROJECT_FILE_UPLOAD_SIZE_MISMATCH',
  'PROJECT_FILE_UPLOAD_CONTENT_TYPE_MISMATCH',
]);

const PROJECT_FILE_UPLOAD_TERMINAL_CODES = new Set([
  'PROJECT_FILE_UPLOAD_NOT_PENDING',
  'PROJECT_FILE_UPLOAD_FORBIDDEN',
  'PROJECT_FILE_UPLOAD_NOT_FOUND',
]);

const PROJECT_FILE_EXTENSION_CONTENT_TYPES: Record<string, string> = {
  bmp: 'image/bmp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  pdf: 'application/pdf',
  zip: 'application/zip',
  glb: 'model/gltf-binary',
  gltf: 'model/gltf+json',
};

export function resolveProjectFileContentType(file: Pick<File, 'name' | 'type'>) {
  const pickedContentType = file.type.trim();

  if (pickedContentType) {
    return pickedContentType;
  }

  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

  return PROJECT_FILE_EXTENSION_CONTENT_TYPES[extension] ?? 'application/octet-stream';
}

export function buildProjectFileUploadUrlBody(file: File, options: ProjectFileUploadOptions = {}): ProjectFileUploadUrlRequest {
  const contentType = resolveProjectFileContentType(file);
  const body: ProjectFileUploadUrlRequest = {
    originalFileName: file.name,
    contentType,
    fileSizeBytes: file.size,
    fileType: options.fileType ?? inferProjectFileType(file, contentType),
  };

  if (options.visibility) {
    body.visibility = options.visibility;
  }

  const note = options.note?.trim();

  if (note) {
    body.note = note;
  }

  return body;
}

export function createProjectFileUploadProgressReporter(fileCount: number, onChange: (progressPercent: number) => void) {
  const progress = Array.from({ length: Math.max(fileCount, 1) }, () => 0);

  return (fileIndex: number, progressPercent: number) => {
    if (fileIndex < 0 || fileIndex >= progress.length) {
      return;
    }

    progress[fileIndex] = Math.min(100, Math.max(0, progressPercent));
    const average = progress.reduce((sum, value) => sum + value, 0) / progress.length;
    onChange(Math.round(average));
  };
}

export async function uploadProjectFile(projectId: string, file: File, options: ProjectFileUploadOptions = {}) {
  let prepared: ProjectFileUploadUrlResponse;

  try {
    prepared = await prepareProjectFileUpload(projectId, file, options);
  } catch (error) {
    if (!isLegacyProjectFileUploadFallback(error)) {
      throw error;
    }

    return uploadProjectFileMultipart(projectId, file, options);
  }

  return finalizePreparedProjectFileUpload(projectId, file, prepared, options);
}

async function prepareProjectFileUpload(projectId: string, file: File, options: ProjectFileUploadOptions) {
  const response = await projectApiClient.post<ServiceResult<ProjectFileUploadUrlResponse>>(
    `/projects/${projectId}/files/upload-url`,
    buildProjectFileUploadUrlBody(file, options),
  );

  return response.data.data;
}

async function completeProjectFileUpload(projectId: string, fileId: string) {
  const response = await projectApiClient.post<ServiceResult<ProjectFileUploadResponseDto>>(`/projects/${projectId}/files/complete`, {
    fileId,
  });

  return response.data.data;
}

async function finalizePreparedProjectFileUpload(
  projectId: string,
  file: File,
  prepared: ProjectFileUploadUrlResponse,
  options: ProjectFileUploadOptions,
  canRestart = true,
): Promise<ProjectFileUploadResponseDto> {
  try {
    return await uploadPreparedProjectFile(projectId, file, prepared, options);
  } catch (error) {
    if (!canRestart || !isRetryableProjectFileUploadConflict(error)) {
      throw error;
    }
  }

  // Ignore the stale pending fileId. Orphan cleanup is a backend concern.
  const restarted = await prepareProjectFileUpload(projectId, file, options);

  return finalizePreparedProjectFileUpload(projectId, file, restarted, options, false);
}

async function uploadPreparedProjectFile(
  projectId: string,
  file: File,
  prepared: ProjectFileUploadUrlResponse,
  options: ProjectFileUploadOptions,
) {
  const contentType = prepared.contentType || resolveProjectFileContentType(file);

  await putProjectFileToSignedUrl(prepared.uploadUrl, file, contentType, options.onUploadProgress);

  try {
    return await finishProjectFileUpload(projectId, prepared.fileId, options);
  } catch (error) {
    if (!isRetryableProjectFileUploadConflict(error)) {
      throw error;
    }
  }

  await putProjectFileToSignedUrl(prepared.uploadUrl, file, contentType, options.onUploadProgress);

  return finishProjectFileUpload(projectId, prepared.fileId, options);
}

async function finishProjectFileUpload(projectId: string, fileId: string, options: ProjectFileUploadOptions) {
  const completed = await completeProjectFileUpload(projectId, fileId);
  options.onUploadProgress?.(100);

  return completed;
}

function putProjectFileToSignedUrl(
  uploadUrl: string,
  file: File,
  contentType: string,
  onUploadProgress?: (progressPercent: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('PUT', uploadUrl);
    request.setRequestHeader('Content-Type', contentType);

    request.upload.onprogress = (event) => {
      if (!onUploadProgress || !event.lengthComputable || event.total <= 0) {
        return;
      }

      onUploadProgress(Math.min(95, Math.round((event.loaded / event.total) * 95)));
    };

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
        return;
      }

      reject(new ProjectFileStorageUploadError(`Storage upload failed (${request.status}).`));
    };

    request.onerror = () => {
      reject(new ProjectFileStorageUploadError());
    };

    request.send(file);
  });
}

async function uploadProjectFileMultipart(projectId: string, file: File, options: ProjectFileUploadOptions) {
  const contentType = resolveProjectFileContentType(file);
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileType', options.fileType ?? inferProjectFileType(file, contentType));

  if (options.visibility) {
    formData.append('visibility', options.visibility);
  }

  if (options.note?.trim()) {
    formData.append('note', options.note.trim());
  }

  const response = await projectApiClient.post<ServiceResult<ProjectFileUploadResponseDto>>(`/projects/${projectId}/files`, formData, {
    onUploadProgress: (event) => {
      if (!options.onUploadProgress || !event.total) {
        return;
      }

      options.onUploadProgress(Math.min(95, Math.round((event.loaded / event.total) * 95)));
    },
  });

  options.onUploadProgress?.(100);

  return response.data.data;
}

function isLegacyProjectFileUploadFallback(error: unknown) {
  if (!(error instanceof AxiosError)) {
    return false;
  }

  const status = error.response?.status;

  return status === 404 || status === 405;
}

function isRetryableProjectFileUploadConflict(error: unknown) {
  if (!(error instanceof AxiosError)) {
    return false;
  }

  const result = getProjectServiceResultFromError(error);
  const errorCode = result ? getFirstProjectErrorCode(result) : undefined;

  if (errorCode && PROJECT_FILE_UPLOAD_TERMINAL_CODES.has(errorCode)) {
    return false;
  }

  if (errorCode && PROJECT_FILE_UPLOAD_RETRY_CODES.has(errorCode)) {
    return true;
  }

  return error.response?.status === 409;
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

function inferProjectFileType(file: File, contentType = resolveProjectFileContentType(file)): FileType {
  if (contentType === 'application/pdf') {
    return 'FLOOR_PLAN';
  }

  if (contentType.startsWith('image/')) {
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

function normalizeProjectPhaseDeadlines(data: ProjectPhaseDeadlinesDto): ProjectPhaseDeadlinesDto {
  return {
    ...data,
    deadlines: data.deadlines.map(normalizeProjectPhaseDeadline),
  };
}

function normalizeProjectPhaseDeadline(deadline: ProjectPhaseDeadlineItemDto): ProjectPhaseDeadlineItemDto {
  return {
    ...deadline,
    deadlineAt: deadline.deadlineAt ?? deadline.dueDate ?? null,
    dueDate: deadline.dueDate ?? deadline.deadlineAt ?? null,
  };
}

function getFirstProjectErrorCode(result: ServiceResult<unknown>) {
  const objectError = result.errors?.find((item): item is { code?: string } => typeof item === 'object' && item !== null && Boolean(item.code));

  return objectError?.code ?? result.errorCode;
}

function getProjectErrorMessages(result: ServiceResult<unknown>) {
  return (result.errors ?? [])
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item.code) return getProjectErrorCodeMessage(item.code);
      return item.message ?? null;
    })
    .filter((message): message is string => Boolean(message));
}

function getProjectErrorCodeMessage(errorCode: string) {
  const messages: Record<string, string> = {
    PROPOSAL_DEADLINE_REQUIRED: 'Please select a proposal deadline before assigning the designer.',
    PROPOSAL_DEADLINE_INVALID: 'Proposal deadline is invalid. Please choose another date.',
    PRODUCTION_DEADLINE_REQUIRED: 'Please set the production deadline before creating a production request.',
    PRODUCTION_DEADLINE_INVALID: 'Production deadline is invalid. Please choose another date.',
    INVALID_PROJECT_STATUS: 'This project status cannot update the requested deadline yet.',
    MEASUREMENT_NOT_COMPLETED: 'Measurement must be completed before the project can proceed to proposal consulting.',
    MEASUREMENT_FILE_REQUIRED: 'Please upload measurement evidence before moving this project to proposal consulting.',
    DESIGNER_NOT_ASSIGNED: 'A designer must be assigned before this status update.',
    ORDER_REQUIRED: 'An order is required before setting the production deadline.',
    PHASE_DEADLINE_UPSERT_DEPRECATED: 'This deadline endpoint is deprecated. Please use the current deadline flow.',
    PROJECT_NOT_DELIVERED: 'Dự án chưa ở trạng thái đã giao hàng.',
    RELATED_ORDER_NOT_COMPLETED: 'Đơn hàng liên quan chưa hoàn tất. Vui lòng chờ thanh toán cuối được xác nhận hoặc hoàn tất đơn hàng zero-remaining.',
    RELATED_ORDER_NOT_FOUND: 'Không tìm thấy đơn hàng liên quan đến dự án.',
    DELIVERY_NOT_CONFIRMED: 'Khách hàng chưa xác nhận nhận hàng hoặc vẫn còn hạng mục chưa giao.',
    PROJECT_FILE_UPLOAD_OBJECT_MISSING: 'The file was not found in storage. Please retry the upload.',
    PROJECT_FILE_UPLOAD_SIZE_MISMATCH: 'Uploaded file size does not match the selected file. Please retry the upload.',
    PROJECT_FILE_UPLOAD_CONTENT_TYPE_MISMATCH: 'Uploaded file type does not match the selected file. Please retry the upload.',
    PROJECT_FILE_UPLOAD_NOT_PENDING: 'This file upload can no longer be completed. Please start the upload again.',
    PROJECT_FILE_UPLOAD_FORBIDDEN: 'You do not have permission to complete this file upload.',
    PROJECT_FILE_UPLOAD_NOT_FOUND: 'This file upload was not found for the project.',
  };

  return messages[errorCode] ?? 'Request failed. Please try again.';
}
