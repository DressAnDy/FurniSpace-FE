import axios, { AxiosError } from 'axios';

import type { RoomPlannerScenePayload } from '@/features/ThreeD/types/roomPlannerScene.types';
import { normalizeLayoutAsset, type LayoutAssetDto } from './layoutAssets';
import type { CatalogFileDto } from './products';

import { getStoredAccessToken } from './tokenStore';

const proposalApiClient = axios.create({
  baseURL: getProposalApiBaseUrl(),
  withCredentials: true,
});

proposalApiClient.interceptors.request.use((config) => {
  const token = getStoredAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

proposalApiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      window.location.assign('/login');
    }

    return Promise.reject(error);
  },
);

export type ProposalStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'SELECTED'
  | 'REVISION_REQUESTED'
  | 'REJECTED'
  | 'ARCHIVED';

export type ProposalSceneType = 'TWO_D' | 'THREE_D' | 'ROOM_PLANNER';

export type ServiceResult<T> = {
  status: number;
  message?: string;
  data: T;
  errors?: string[];
  errorCode?: string;
};

export type ProposalDto = {
  proposalId: string;
  projectId: string;
  parentProposalId: string | null;
  proposalName: string;
  description: string | null;
  versionNo: number;
  status: ProposalStatus;
  revisionNote?: string | null;
  publishedAt: string | null;
  selectedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProposalListData = {
  items: ProposalDto[];
  page: number;
  limit: number;
  total: number;
};

export type ProposalDetailDto = ProposalDto & {
  scenes?: ProposalSceneDto[];
  items?: ProposalItemDto[];
};

export type ProposalListParams = {
  projectId: string;
  status?: ProposalStatus | null;
  page?: number;
  limit?: number;
};

export type ProposalSceneDto = {
  sceneId: string;
  proposalId: string;
  projectAreaId?: string | null;
  areas?: ProposalSceneAreaDto[];
  sceneName: string | null;
  sceneType: ProposalSceneType | null;
  mongoSceneId: string | null;
  previewFileId: string | null;
  previewFileUrl: string | null;
  versionNo: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProposalSceneAreaDto = {
  projectAreaId: string;
  areaName: string;
  areaType?: string | null;
  floorNumber?: number | null;
  height?: number | null;
  isSpecialLayout?: boolean | null;
  length?: number | null;
  sortOrder: number;
  status?: string | null;
  width?: number | null;
};

export type ProposalSceneListData = {
  items: ProposalSceneDto[];
  page: number;
  limit: number;
  total: number;
};

export type ProposalSceneListParams = {
  proposalId: string;
  sceneType?: ProposalSceneType | null;
  isActive?: boolean | null;
  page?: number;
  limit?: number;
};

export type ProposalItemListParams = {
  proposalId: string;
  sceneId?: string | null;
  page?: number;
  limit?: number;
};

export type ProposalItemListData = {
  items: ProposalItemDto[];
  page: number;
  limit: number;
  total: number;
};

export type PublishProposalData = {
  proposalId: string;
  projectId: string;
  proposalStatus: ProposalStatus;
  projectStatus: string;
  publishedAt: string;
};

export type SelectFinalProposalData = {
  proposalId: string;
  projectId: string;
  quotationId?: string | null;
  proposalStatus: ProposalStatus;
  projectStatus?: string | null;
  selectedAt?: string | null;
};

export type ReopenProposalForEditingData = {
  proposalId: string;
  projectId: string;
  proposalStatus: ProposalStatus;
  projectStatus: string;
  updatedAt: string;
};

export type CreateProposalInput = {
  projectId: string;
  proposalName: string;
  description?: string | null;
};

export type UpdateProposalInput = {
  proposalId: string;
  proposalName: string;
  description?: string | null;
};

export type ProposalDecisionInput = {
  note?: string | null;
  proposalId: string;
};

export type RequestProposalRevisionInput = {
  proposalId: string;
  revisionNote: string;
};

export type CreateProposalSceneInput = {
  proposalId: string;
  sceneName: string;
  sceneType: ProposalSceneType;
  projectAreaIds?: string[];
  projectAreaId?: string | null;
  mongoSceneId?: string | null;
  previewFileId?: string | null;
};

export type UpdateProposalSceneInput = {
  sceneId: string;
  sceneName?: string | null;
  projectAreaIds?: string[] | null;
  projectAreaId?: string | null;
  mongoSceneId?: string | null;
  previewFileId?: string | null;
  isActive?: boolean | null;
};

export type SaveRoomPlannerSceneInput = {
  sceneId: string;
  payload: RoomPlannerScenePayload;
};

export type SyncProposalItemsFromSceneInput = {
  proposalId: string;
  sceneId: string;
  items?: Array<{
    customizationNote?: string | null;
    productVersionId: string;
    quantity: number;
    sceneObjectId: string;
  }>;
};

export type RoomPlannerSceneData = RoomPlannerScenePayload & {
  sceneId: string;
  proposalId?: string | null;
  projectId?: string | null;
  projectAreaId?: string | null;
  projectAreaIds?: string[];
  areas?: ProposalSceneAreaDto[];
  mongoSceneId: string | null;
  lastSavedAt?: string | null;
};

export type SaveRoomPlannerSceneData = {
  sceneId: string;
  mongoSceneId: string;
  lastSavedAt: string;
};

export type RoomPlannerResolvedProductDto = {
  productVersionId: string;
  productId: string;
  productName?: string | null;
  versionCode?: string | null;
  versionName?: string | null;
  versionType?: string | null;
  material?: string | null;
  color?: string | null;
  width?: number | null;
  height?: number | null;
  depth?: number | null;
  dimensionUnit?: string | null;
  estimatedPrice?: number | null;
  isProjectSpecific?: boolean | null;
  files?: CatalogFileDto[] | null;
};

export type RoomPlannerResolvedProductsData = {
  sceneId: string;
  projectId?: string | null;
  items: RoomPlannerResolvedProductDto[];
};

export type RoomPlannerResolvedLayoutAssetsData = {
  sceneId: string;
  projectId?: string | null;
  items: LayoutAssetDto[];
};

export type ProposalItemDto = {
  proposalItemId: string;
  proposalId: string;
  sceneId: string;
  sceneObjectId: string | null;
  productVersionId: string;
  productNameSnapshot: string;
  versionNameSnapshot: string;
  materialSnapshot: string | null;
  colorSnapshot: string | null;
  widthSnapshot: number | null;
  heightSnapshot: number | null;
  depthSnapshot: number | null;
  dimensionUnit: string | null;
  projectAreaId?: string | null;
  projectAreaName?: string | null;
  floorNumber?: number | null;
  floorId?: string | null;
  quantity: number;
  unitPriceSnapshot: number | null;
  totalPriceSnapshot?: number | null;
  subtotalAmount: number | null;
  customizationNote: string | null;
};

export type SyncProposalItemsFromSceneData = {
  proposalId: string;
  sceneId: string;
  items: ProposalItemDto[];
};

export function getProposalServiceResultMessage(error: unknown) {
  const result = getProposalServiceResultFromError(error);

  if (!result) {
    return 'Cannot connect to proposal API. Please check backend and VITE_API_URL.';
  }

  if (result.errors?.length) {
    return result.errors.join('\n');
  }

  return result.message || 'Request failed. Please try again.';
}

export function getProposalServiceResultFromError(error: unknown) {
  if (!(error instanceof AxiosError)) {
    return null;
  }

  const data = error.response?.data;

  if (data && typeof data === 'object' && 'status' in data) {
    return data as ServiceResult<unknown>;
  }

  return null;
}

export async function createProposal(input: CreateProposalInput) {
  const response = await proposalApiClient.post<ServiceResult<ProposalDto>>(`/projects/${input.projectId}/proposals`, {
    proposalName: input.proposalName.trim(),
    description: input.description?.trim() || null,
  });

  return response.data.data;
}

export async function getProjectProposals(params: ProposalListParams) {
  const response = await proposalApiClient.get<ServiceResult<ProposalListData>>(`/projects/${params.projectId}/proposals`, {
    params: {
      status: params.status ?? undefined,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
  });

  return response.data.data;
}

export async function getProposalById(proposalId: string) {
  const response = await proposalApiClient.get<ServiceResult<ProposalDetailDto>>(`/proposals/${proposalId}`);

  return response.data.data;
}

export async function updateProposal(input: UpdateProposalInput) {
  const response = await proposalApiClient.patch<ServiceResult<ProposalDto>>(`/proposals/${input.proposalId}`, {
    proposalName: input.proposalName.trim(),
    description: input.description?.trim() || null,
  });

  return response.data.data;
}

export async function publishProposal(proposalId: string, note?: string | null) {
  const response = await proposalApiClient.patch<ServiceResult<PublishProposalData>>(`/proposals/${proposalId}/publish`, {
    note: note?.trim() || null,
  });

  return response.data.data;
}

export async function selectFinalProposal(input: ProposalDecisionInput) {
  const response = await proposalApiClient.patch<ServiceResult<SelectFinalProposalData>>(`/proposals/${input.proposalId}/select-final`, {
    note: input.note?.trim() || null,
  });

  return response.data.data;
}

export async function requestProposalRevision(input: RequestProposalRevisionInput) {
  const response = await proposalApiClient.patch<ServiceResult<ProposalDto>>(`/proposals/${input.proposalId}/request-revision`, {
    revisionNote: input.revisionNote.trim(),
  });

  return response.data.data;
}

export async function reopenProposalForEditing(proposalId: string) {
  const response = await proposalApiClient.post<ServiceResult<ReopenProposalForEditingData>>(`/proposals/${proposalId}/reopen-for-editing`);

  return response.data.data;
}

export async function createProposalScene(input: CreateProposalSceneInput) {
  const hasMultiAreaContract = Array.isArray(input.projectAreaIds);
  const response = await proposalApiClient.post<ServiceResult<ProposalSceneDto>>(`/proposals/${input.proposalId}/scenes`, {
    sceneName: input.sceneName.trim(),
    sceneType: input.sceneType,
    projectAreaIds: hasMultiAreaContract ? input.projectAreaIds : undefined,
    projectAreaId: hasMultiAreaContract ? undefined : input.projectAreaId ?? null,
    mongoSceneId: hasMultiAreaContract ? undefined : input.mongoSceneId ?? null,
    previewFileId: input.previewFileId ?? null,
  });

  return response.data.data;
}

export async function updateProposalScene(input: UpdateProposalSceneInput) {
  const hasMultiAreaContract = Array.isArray(input.projectAreaIds) || input.projectAreaIds === null;
  const response = await proposalApiClient.patch<ServiceResult<ProposalSceneDto>>(`/proposal-scenes/${input.sceneId}`, {
    sceneName: input.sceneName?.trim() || undefined,
    projectAreaIds: hasMultiAreaContract ? input.projectAreaIds : undefined,
    projectAreaId: hasMultiAreaContract ? undefined : input.projectAreaId ?? undefined,
    mongoSceneId: hasMultiAreaContract ? undefined : input.mongoSceneId ?? undefined,
    previewFileId: input.previewFileId ?? undefined,
    isActive: input.isActive ?? undefined,
  });

  return response.data.data;
}

export async function getProposalScenes(params: ProposalSceneListParams) {
  const response = await proposalApiClient.get<ServiceResult<ProposalSceneListData>>(`/proposals/${params.proposalId}/scenes`, {
    params: {
      sceneType: params.sceneType ?? undefined,
      isActive: params.isActive ?? undefined,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
  });

  return response.data.data;
}

export async function getRoomPlannerScene(sceneId: string) {
  const response = await proposalApiClient.get<ServiceResult<RoomPlannerSceneData>>(`/proposal-scenes/${sceneId}/room-planner`);

  return response.data.data;
}

export async function saveRoomPlannerScene(input: SaveRoomPlannerSceneInput) {
  const response = await proposalApiClient.put<ServiceResult<SaveRoomPlannerSceneData>>(
    `/proposal-scenes/${input.sceneId}/room-planner`,
    input.payload,
  );

  return response.data.data;
}

export async function resolveRoomPlannerSceneProducts(input: { sceneId: string; productVersionIds: string[] }) {
  const response = await proposalApiClient.post<ServiceResult<RoomPlannerResolvedProductsData>>(
    `/proposal-scenes/${input.sceneId}/room-planner/resolve-products`,
    {
      productVersionIds: input.productVersionIds,
    },
  );

  return response.data.data;
}

export async function resolveRoomPlannerSceneLayoutAssets(input: { layoutAssetIds: string[]; sceneId: string }) {
  const response = await proposalApiClient.post<ServiceResult<RoomPlannerResolvedLayoutAssetsData>>(
    `/proposal-scenes/${input.sceneId}/room-planner/resolve-layout-assets`,
    {
      layoutAssetIds: input.layoutAssetIds,
    },
  );

  return {
    ...response.data.data,
    items: (response.data.data.items ?? []).map(normalizeLayoutAsset),
  };
}

export async function getProposalItems(params: ProposalItemListParams) {
  const response = await proposalApiClient.get<ServiceResult<ProposalItemListData>>(`/proposals/${params.proposalId}/items`, {
    params: {
      sceneId: params.sceneId ?? undefined,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
  });

  return response.data.data;
}

export async function syncProposalItemsFromScene(input: SyncProposalItemsFromSceneInput) {
  const payload = input.items
    ? {
        sceneId: input.sceneId,
        items: input.items.map((item) => ({
          sceneObjectId: item.sceneObjectId,
          productVersionId: item.productVersionId,
          quantity: item.quantity,
          customizationNote: item.customizationNote?.trim() || null,
        })),
      }
    : {
        sceneId: input.sceneId,
      };
  const response = await proposalApiClient.post<ServiceResult<SyncProposalItemsFromSceneData>>(
    `/proposals/${input.proposalId}/items/sync-from-scene`,
    payload,
  );

  return response.data.data;
}

function getProposalApiBaseUrl() {
  const configuredApiUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;

  return configuredApiUrl?.replace(/\/api\/?$/, '');
}
