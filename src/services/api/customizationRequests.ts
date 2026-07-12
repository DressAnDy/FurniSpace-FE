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

export type CustomizationStatus =
  | 'SUBMITTED'
  | 'DESIGN_REVIEWING'
  | 'PRODUCTION_REVIEWING'
  | 'WAITING_FOR_CUSTOMER_FINAL_APPROVAL'
  | 'NOT_FEASIBLE'
  | 'ACCEPTED'
  | 'REJECTED_BY_CUSTOMER'
  | 'CANCELLED';

export type ProductionReviewResult = 'FEASIBLE' | 'NOT_FEASIBLE';
export type CustomerCustomizationDecision = 'ACCEPT' | 'REJECT';

export type CustomizationRequestDto = {
  customizationRequestId: string;
  projectId: string;
  proposalId: string;
  proposalItemId: string;
  requestedByCustomerId?: string | null;
  requestTitle: string;
  requestDescription?: string | null;
  requestedWidth?: number | null;
  requestedHeight?: number | null;
  requestedDepth?: number | null;
  requestedMaterial?: string | null;
  requestedColor?: string | null;
  requestedChangeNote?: string | null;
  designerId?: string | null;
  designerSpecNote?: string | null;
  productionReviewBy?: string | null;
  feasibilityNote?: string | null;
  estimatedProductionDays?: number | null;
  estimatedAdditionalCost?: number | null;
  additionalCostReason?: string | null;
  materialAvailable?: boolean | null;
  productionRiskNote?: string | null;
  salesReviewBy?: string | null;
  approvedProductVersionId?: string | null;
  status?: CustomizationStatus | null;
  customerAcceptedAt?: string | null;
  customerRejectedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CustomizationRequestItemSnapshotDto = {
  proposalItemId: string;
  proposalId: string;
  productVersionId?: string | null;
  itemName: string;
  itemType?: string | null;
  quantity?: number | null;
  width?: number | null;
  height?: number | null;
  depth?: number | null;
  material?: string | null;
  color?: string | null;
  unitPriceSnapshot?: number | null;
  totalPriceSnapshot?: number | null;
  note?: string | null;
};

export type CustomizationRequestDetailDto = CustomizationRequestDto & {
  proposalItem: CustomizationRequestItemSnapshotDto;
};

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

export type ProductionCustomizationRequestQueueItemDto = CustomizationRequestDto & {
  project: ProductionCustomizationProjectSummaryDto;
  proposal: ProductionCustomizationProposalSummaryDto;
  proposalItem: CustomizationRequestItemSnapshotDto;
};

export type ProductionCustomizationRequestListData = {
  items: ProductionCustomizationRequestQueueItemDto[];
  page: number;
  pageSize: number;
  total: number;
};

export type CustomizationRequestListParams = {
  projectId: string;
  proposalId?: string | null;
  proposalItemId?: string | null;
  status?: CustomizationStatus | null;
};

export type ProductionCustomizationRequestListParams = {
  status?: CustomizationStatus | null;
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

export type DesignerReviewCustomizationRequestInput = {
  customizationRequestId: string;
  designerSpecNote: string;
};

export type ProductionReviewCustomizationRequestInput = {
  customizationRequestId: string;
  result: ProductionReviewResult;
  materialAvailable?: boolean | null;
  estimatedProductionDays?: number | null;
  estimatedAdditionalCost?: number | null;
  additionalCostReason?: string | null;
  feasibilityNote?: string | null;
  productionRiskNote?: string | null;
};

export type CustomerDecisionCustomizationRequestInput = {
  customizationRequestId: string;
  decision: CustomerCustomizationDecision;
  rejectReason?: string | null;
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

  return result.message || 'Request failed. Please try again.';
}

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
        proposalItemId: params.proposalItemId ?? undefined,
        status: params.status ?? undefined,
      },
    },
  );

  return response.data.data;
}

export async function getProductionCustomizationRequests(params: ProductionCustomizationRequestListParams = {}) {
  const response = await customizationRequestApiClient.get<ServiceResult<ProductionCustomizationRequestListData>>(
    '/api/production/customization-requests',
    {
    params: {
      Status: params.status ?? undefined,
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

export async function designerReviewCustomizationRequest(input: DesignerReviewCustomizationRequestInput) {
  const response = await customizationRequestApiClient.patch<ServiceResult<CustomizationRequestDto>>(
    `/customization-requests/${input.customizationRequestId}/designer-review`,
    {
      designerSpecNote: input.designerSpecNote.trim(),
    },
  );

  return response.data.data;
}

export async function productionReviewCustomizationRequest(input: ProductionReviewCustomizationRequestInput) {
  const response = await customizationRequestApiClient.patch<ServiceResult<CustomizationRequestDto>>(
    `/customization-requests/${input.customizationRequestId}/production-review`,
    {
      result: input.result,
      materialAvailable: input.materialAvailable ?? null,
      estimatedProductionDays: input.estimatedProductionDays ?? null,
      estimatedAdditionalCost: input.estimatedAdditionalCost ?? null,
      additionalCostReason: input.additionalCostReason?.trim() || null,
      feasibilityNote: input.feasibilityNote?.trim() || null,
      productionRiskNote: input.productionRiskNote?.trim() || null,
    },
  );

  return response.data.data;
}

export async function customerDecisionCustomizationRequest(input: CustomerDecisionCustomizationRequestInput) {
  const response = await customizationRequestApiClient.patch<ServiceResult<CustomizationRequestDto>>(
    `/customization-requests/${input.customizationRequestId}/customer-decision`,
    {
      decision: input.decision,
      rejectReason: input.rejectReason?.trim() || null,
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

function getCustomizationRequestApiBaseUrl() {
  const configuredApiUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;

  return configuredApiUrl?.replace(/\/api\/?$/, '');
}
