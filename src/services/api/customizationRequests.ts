import axios, { AxiosError } from 'axios';

import { shouldRedirectUnauthorized } from '@/shared/config/authPreview';

import { getStoredAccessToken } from './tokenStore';

const customizationRequestApiClient = axios.create({
  baseURL: getCustomizationRequestApiBaseUrl(),
  withCredentials: true,
});

customizationRequestApiClient.interceptors.request.use((config) => {
  const token = getStoredAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

customizationRequestApiClient.interceptors.response.use(
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

export type CustomizationStatus = 'SUBMITTED' | 'REVIEWING' | 'ACCEPTED' | 'CANCELLED';
export type CustomizationVersionStatus = 'DRAFT' | 'REVIEWING' | 'PRODUCTION_REJECTED' | 'ACCEPTED' | 'WITHDRAWN';
export type ProductionFeasibilityStatus = 'PENDING' | 'FEASIBLE' | 'NOT_FEASIBLE';
export type ProductionReviewResult = 'FEASIBLE' | 'NOT_FEASIBLE';

export type ApprovedProductVersionSummaryDto = {
  productVersionId: string;
  productId?: string | null;
  productName?: string | null;
  versionName?: string | null;
  versionCode?: string | null;
  material?: string | null;
  color?: string | null;
  width?: number | null;
  height?: number | null;
  depth?: number | null;
  dimensionUnit?: string | null;
  estimatedPrice?: number | null;
  price?: number | null;
  thumbnailUrl?: string | null;
  modelFileUrl?: string | null;
};

export type CustomizationProductVersionFileDto = {
  fileId: string;
  fileUrl?: string | null;
  fileType?: string | null;
};

export type CustomizationProductVersionDto = {
  productVersionId?: string | null;
  productId?: string | null;
  versionName?: string | null;
  versionCode?: string | null;
  material?: string | null;
  color?: string | null;
  width?: number | null;
  height?: number | null;
  depth?: number | null;
  dimensionUnit?: string | null;
  estimatedPrice?: number | null;
  price?: number | null;
  modelFileId?: string | null;
  modelFileUrl?: string | null;
  previewFiles?: CustomizationProductVersionFileDto[] | null;
};

export type CustomizationRequestVersionDto = {
  customizationRequestVersionId: string;
  customizationRequestId: string;
  versionNo: number;
  createdByDesignerId: string;
  versionTitle?: string | null;
  designerNote?: string | null;
  status: CustomizationVersionStatus;
  feasibilityStatus: ProductionFeasibilityStatus;
  feasibilityNote?: string | null;
  estimatedProductionDays?: number | null;
  estimatedAdditionalCost?: number | null;
  additionalCostReason?: string | null;
  materialAvailable?: boolean | null;
  productionRiskNote?: string | null;
  alternativeMaterialNote?: string | null;
  submittedForReviewAt?: string | null;
  productionReviewedAt?: string | null;
  productionRejectedAt?: string | null;
  acceptedAt?: string | null;
  withdrawnAt?: string | null;
  createdAt: string;
  updatedAt: string;
  isAccepted: boolean;
  productVersion: CustomizationProductVersionDto;
};

export type CustomizationRequestDto = {
  customizationRequestId: string;
  projectId: string;
  proposalId: string;
  sourceProductVersionId: string;
  requestedByCustomerId?: string | null;
  requestTitle: string;
  requestDescription?: string | null;
  requestedWidth?: number | null;
  requestedHeight?: number | null;
  requestedDepth?: number | null;
  requestedMaterial?: string | null;
  requestedColor?: string | null;
  requestedChangeNote?: string | null;
  acceptedRequestVersionId?: string | null;
  status?: CustomizationStatus | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  sourceProductVersion?: ApprovedProductVersionSummaryDto | null;
  acceptedVersion?: CustomizationRequestVersionDto | null;
  versions?: CustomizationRequestVersionDto[] | null;
};

export type CustomizationRequestDetailDto = CustomizationRequestDto;

export type CustomizationRequestListData = {
  items: CustomizationRequestDto[];
};

export type ProductionCustomizationProjectSummaryDto = {
  projectId: string;
  projectName: string;
  customerId: string;
  assignedSalesId?: string | null;
  assignedDesignerId?: string | null;
};

export type ProductionCustomizationProposalSummaryDto = {
  proposalId: string;
  proposalName: string;
  status?: string | null;
};

export type ProductionCustomizationVersionQueueItemDto = {
  version: CustomizationRequestVersionDto;
  request: CustomizationRequestDto;
  project: ProductionCustomizationProjectSummaryDto;
  proposal: ProductionCustomizationProposalSummaryDto;
  sourceProductVersion: ApprovedProductVersionSummaryDto;
};

export type ProductionCustomizationVersionListData = {
  items: ProductionCustomizationVersionQueueItemDto[];
  page: number;
  pageSize: number;
  total: number;
};

export type CustomizationRequestListParams = {
  projectId: string;
  proposalId?: string | null;
  sourceProductVersionId?: string | null;
  status?: CustomizationStatus | null;
};

export type ProductionCustomizationVersionListParams = {
  status?: CustomizationVersionStatus | null;
  feasibilityStatus?: ProductionFeasibilityStatus | null;
  projectId?: string | null;
  proposalId?: string | null;
  materialAvailable?: boolean | null;
  fromDate?: string | null;
  toDate?: string | null;
  page?: number;
  pageSize?: number;
};

export type SubmitCustomizationRequestInput = {
  proposalItemId: string;
  requestTitle: string;
  requestDescription?: string | null;
  requestedWidth?: number | null;
  requestedHeight?: number | null;
  requestedDepth?: number | null;
  requestedMaterial?: string | null;
  requestedColor?: string | null;
  requestedChangeNote?: string | null;
};

export type CreateCustomizationRequestVersionDto = {
  versionTitle?: string | null;
  designerNote?: string | null;
  versionName?: string | null;
  versionCode?: string | null;
  material?: string | null;
  color?: string | null;
  width?: number | null;
  height?: number | null;
  depth?: number | null;
  dimensionUnit?: 'cm' | 'm' | 'mm' | null;
  estimatedPrice?: number | null;
  modelFileId?: string | null;
  previewFileIds: string[];
};

export type UpdateCustomizationRequestVersionDto = Omit<CreateCustomizationRequestVersionDto, 'previewFileIds'> & {
  previewFileIds?: string[] | null;
};

export type CreateCustomizationRequestVersionInput = {
  customizationRequestId: string;
  body: CreateCustomizationRequestVersionDto;
};

export type UpdateCustomizationRequestVersionInput = {
  customizationRequestId: string;
  customizationRequestVersionId: string;
  body: UpdateCustomizationRequestVersionDto;
};

export type SubmitCustomizationRequestVersionForReviewInput = {
  customizationRequestId: string;
  customizationRequestVersionId: string;
};

export type WithdrawCustomizationRequestVersionInput = {
  customizationRequestId: string;
  customizationRequestVersionId: string;
};

export type ProductionReviewCustomizationVersionInput = {
  customizationRequestVersionId: string;
  result: ProductionReviewResult;
  materialAvailable?: boolean | null;
  estimatedProductionDays?: number | null;
  estimatedAdditionalCost?: number | null;
  additionalCostReason?: string | null;
  feasibilityNote?: string | null;
  productionRiskNote?: string | null;
  alternativeMaterialNote?: string | null;
};

export type AcceptCustomizationRequestVersionInput = {
  customizationRequestId: string;
  customizationRequestVersionId: string;
};

export type CancelCustomizationRequestInput = {
  customizationRequestId: string;
  cancelReason: string;
};

export function getCustomizationRequestServiceResultMessage(error: unknown) {
  const result = getCustomizationRequestServiceResultFromError(error);

  if (!result) {
    return 'Cannot connect to customization request API. Please check backend and VITE_API_URL.';
  }

  if (result.errors?.length) {
    return result.errors.join('\n');
  }

  if (result.errorCode && result.errorCode in customizationRequestErrorMessages) {
    return customizationRequestErrorMessages[result.errorCode];
  }

  return result.message || 'Request failed. Please try again.';
}

const customizationRequestErrorMessages: Record<string, string> = {
  VERSION_CODE_ALREADY_EXISTS: 'This customization version code already exists.',
  CUSTOMIZATION_VERSION_NUMBER_CONFLICT: 'This customization version number conflicts with another version. Please reload and try again.',
  PRODUCT_VERSION_FILE_LINK_CONFLICT: 'One or more selected files are already linked in a conflicting way.',
  SOURCE_PRODUCT_VERSION_NOT_FOUND: 'The source product version for this customization could not be found.',
  SOURCE_PRODUCT_VERSION_PRICE_REQUIRED: 'The source product version needs an estimated price before this version can be accepted.',
  APPROVED_PRODUCT_VERSION_NOT_FOUND: 'The approved custom product version could not be found.',
  APPROVED_PRODUCT_VERSION_INVALID_TYPE: 'The approved version is not a valid project-specific customization version.',
  ESTIMATED_ADDITIONAL_COST_REQUIRED: 'Production must provide an estimated additional cost before the customer can accept.',
  CUSTOMIZATION_VERSION_NOT_REVIEWING: 'Only customization versions in review can be accepted.',
  CUSTOMIZATION_VERSION_NOT_FEASIBLE: 'Only feasible customization versions can be accepted.',
  CUSTOMIZATION_NOT_IN_REVIEWING: 'Only customization requests in reviewing status can be accepted.',
};

export function getCustomizationRequestServiceResultFromError(error: unknown) {
  if (!(error instanceof AxiosError)) {
    return null;
  }

  const data = error.response?.data;

  if (data && typeof data === 'object' && 'status' in data) {
    return data as ServiceResult<unknown>;
  }

  return null;
}

export async function getProjectCustomizationRequests(params: CustomizationRequestListParams) {
  const response = await customizationRequestApiClient.get<ServiceResult<CustomizationRequestListData>>(
    `/projects/${params.projectId}/customization-requests`,
    {
      params: {
        proposalId: params.proposalId ?? undefined,
        sourceProductVersionId: params.sourceProductVersionId ?? undefined,
        status: params.status ?? undefined,
      },
    },
  );

  return response.data.data;
}

export async function getProductionCustomizationVersions(params: ProductionCustomizationVersionListParams = {}) {
  const response = await customizationRequestApiClient.get<ServiceResult<ProductionCustomizationVersionListData>>(
    '/api/production/customization-versions',
    {
      params: {
        Status: params.status ?? undefined,
        FeasibilityStatus: params.feasibilityStatus ?? undefined,
        ProjectId: params.projectId ?? undefined,
        ProposalId: params.proposalId ?? undefined,
        MaterialAvailable: params.materialAvailable ?? undefined,
        FromDate: params.fromDate ?? undefined,
        ToDate: params.toDate ?? undefined,
        Page: params.page ?? 1,
        PageSize: params.pageSize ?? 20,
      },
    },
  );

  return response.data.data;
}

export async function getCustomizationRequestById(customizationRequestId: string) {
  const response = await customizationRequestApiClient.get<ServiceResult<CustomizationRequestDetailDto>>(
    `/customization-requests/${customizationRequestId}`,
  );

  return response.data.data;
}

export async function submitCustomizationRequest(input: SubmitCustomizationRequestInput) {
  const response = await customizationRequestApiClient.post<ServiceResult<CustomizationRequestDto>>(
    `/proposal-items/${input.proposalItemId}/customization-requests`,
    {
      requestTitle: input.requestTitle.trim(),
      requestDescription: input.requestDescription?.trim() || null,
      requestedWidth: input.requestedWidth ?? null,
      requestedHeight: input.requestedHeight ?? null,
      requestedDepth: input.requestedDepth ?? null,
      requestedMaterial: input.requestedMaterial?.trim() || null,
      requestedColor: input.requestedColor?.trim() || null,
      requestedChangeNote: input.requestedChangeNote?.trim() || null,
    },
  );

  return response.data.data;
}

export async function createCustomizationRequestVersion(input: CreateCustomizationRequestVersionInput) {
  const response = await customizationRequestApiClient.post<ServiceResult<{ customizationRequestId: string; customizationRequestVersionId: string; version: CustomizationRequestVersionDto }>>(
    `/customization-requests/${input.customizationRequestId}/versions`,
    normalizeVersionBody(input.body),
  );

  return response.data.data;
}

export async function updateCustomizationRequestVersion(input: UpdateCustomizationRequestVersionInput) {
  const response = await customizationRequestApiClient.patch<ServiceResult<CustomizationRequestVersionDto>>(
    `/customization-requests/${input.customizationRequestId}/versions/${input.customizationRequestVersionId}`,
    normalizeVersionBody(input.body),
  );

  return response.data.data;
}

export async function submitCustomizationRequestVersionForReview(input: SubmitCustomizationRequestVersionForReviewInput) {
  const response = await customizationRequestApiClient.post<ServiceResult<CustomizationRequestVersionDto>>(
    `/customization-requests/${input.customizationRequestId}/versions/${input.customizationRequestVersionId}/submit-for-review`,
  );

  return response.data.data;
}

export async function withdrawCustomizationRequestVersion(input: WithdrawCustomizationRequestVersionInput) {
  const response = await customizationRequestApiClient.post<ServiceResult<CustomizationRequestVersionDto>>(
    `/customization-requests/${input.customizationRequestId}/versions/${input.customizationRequestVersionId}/withdraw`,
  );

  return response.data.data;
}

export async function productionReviewCustomizationVersion(input: ProductionReviewCustomizationVersionInput) {
  const response = await customizationRequestApiClient.patch<ServiceResult<CustomizationRequestVersionDto>>(
    `/api/production/customization-versions/${input.customizationRequestVersionId}/review`,
    {
      result: input.result,
      materialAvailable: input.materialAvailable ?? null,
      estimatedProductionDays: input.estimatedProductionDays ?? null,
      estimatedAdditionalCost: input.estimatedAdditionalCost ?? null,
      additionalCostReason: input.additionalCostReason?.trim() || null,
      feasibilityNote: input.feasibilityNote?.trim() || null,
      productionRiskNote: input.productionRiskNote?.trim() || null,
      alternativeMaterialNote: input.alternativeMaterialNote?.trim() || null,
    },
  );

  return response.data.data;
}

export async function acceptCustomizationRequestVersion(input: AcceptCustomizationRequestVersionInput) {
  const response = await customizationRequestApiClient.post<ServiceResult<CustomizationRequestDto>>(
    `/customization-requests/${input.customizationRequestId}/accept`,
    {
      customizationRequestVersionId: input.customizationRequestVersionId,
    },
  );

  return response.data.data;
}

export async function cancelCustomizationRequest(input: CancelCustomizationRequestInput) {
  const response = await customizationRequestApiClient.patch<ServiceResult<CustomizationRequestDto>>(
    `/customization-requests/${input.customizationRequestId}/cancel`,
    {
      cancelReason: input.cancelReason.trim(),
    },
  );

  return response.data.data;
}

function normalizeVersionBody(body: CreateCustomizationRequestVersionDto | UpdateCustomizationRequestVersionDto) {
  return {
    versionTitle: body.versionTitle?.trim() || null,
    designerNote: body.designerNote?.trim() || null,
    versionName: body.versionName?.trim() || null,
    versionCode: body.versionCode?.trim() || null,
    material: body.material?.trim() || null,
    color: body.color?.trim() || null,
    width: body.width ?? null,
    height: body.height ?? null,
    depth: body.depth ?? null,
    dimensionUnit: body.dimensionUnit ?? null,
    estimatedPrice: body.estimatedPrice ?? null,
    modelFileId: body.modelFileId?.trim() || null,
    ...('previewFileIds' in body ? { previewFileIds: body.previewFileIds ?? [] } : {}),
  };
}

function getCustomizationRequestApiBaseUrl() {
  const configuredApiUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;

  return configuredApiUrl?.replace(/\/api\/?$/, '');
}
