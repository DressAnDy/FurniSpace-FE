import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createLayoutAsset,
  deleteLayoutAssetFile,
  getLayoutAssets,
  getLayoutAssetById,
  getLayoutAssetFiles,
  getRoomPlannerLayoutAssets,
  setLayoutAssetPrimaryFile,
  updateLayoutAsset,
  updateLayoutAssetStatus,
  uploadLayoutAssetFile,
  type CreateLayoutAssetInput,
  type LayoutAssetListParams,
  type UpdateLayoutAssetInput,
} from '@/services/api/layoutAssets';

export const layoutAssetQueryKeys = {
  all: ['layout-assets'] as const,
  adminList: (params?: LayoutAssetListParams) => ['layout-assets', 'admin-list', params] as const,
  detail: (layoutAssetId: string) => ['layout-assets', 'detail', layoutAssetId] as const,
  files: (layoutAssetId: string) => ['layout-assets', 'files', layoutAssetId] as const,
  roomPlannerList: (params?: Pick<LayoutAssetListParams, 'keyword' | 'layoutAssetType' | 'page' | 'pageSize'>) =>
    ['layout-assets', 'room-planner-list', params] as const,
};

export function useLayoutAssets(params?: LayoutAssetListParams) {
  return useQuery({
    queryKey: layoutAssetQueryKeys.adminList(params),
    queryFn: () => getLayoutAssets(params),
  });
}

export function useRoomPlannerLayoutAssets(params?: Pick<LayoutAssetListParams, 'keyword' | 'layoutAssetType' | 'page' | 'pageSize'>) {
  return useQuery({
    queryKey: layoutAssetQueryKeys.roomPlannerList(params),
    queryFn: () => getRoomPlannerLayoutAssets(params),
  });
}

export function useLayoutAssetDetail(layoutAssetId?: string) {
  return useQuery({
    queryKey: layoutAssetQueryKeys.detail(layoutAssetId ?? ''),
    queryFn: () => getLayoutAssetById(layoutAssetId ?? ''),
    enabled: Boolean(layoutAssetId),
  });
}

export function useLayoutAssetFiles(layoutAssetId?: string) {
  return useQuery({
    queryKey: layoutAssetQueryKeys.files(layoutAssetId ?? ''),
    queryFn: () => getLayoutAssetFiles(layoutAssetId ?? ''),
    enabled: Boolean(layoutAssetId),
  });
}

export function useCreateLayoutAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateLayoutAssetInput) => createLayoutAsset(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: layoutAssetQueryKeys.all });
    },
  });
}

export function useUpdateLayoutAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateLayoutAssetInput) => updateLayoutAsset(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: layoutAssetQueryKeys.all });
    },
  });
}

export function useUpdateLayoutAssetStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { layoutAssetId: string; status: Parameters<typeof updateLayoutAssetStatus>[1] }) =>
      updateLayoutAssetStatus(input.layoutAssetId, input.status),
    onSuccess: (asset) => {
      void queryClient.invalidateQueries({ queryKey: layoutAssetQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: layoutAssetQueryKeys.detail(asset.layoutAssetId) });
    },
  });
}

export function useUploadLayoutAssetFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Parameters<typeof uploadLayoutAssetFile>[0]) => uploadLayoutAssetFile(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: layoutAssetQueryKeys.all });
    },
  });
}

export function useSetLayoutAssetPrimaryFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Parameters<typeof setLayoutAssetPrimaryFile>[0]) => setLayoutAssetPrimaryFile(input),
    onSuccess: (asset) => {
      void queryClient.invalidateQueries({ queryKey: layoutAssetQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: layoutAssetQueryKeys.detail(asset.layoutAssetId) });
      void queryClient.invalidateQueries({ queryKey: layoutAssetQueryKeys.files(asset.layoutAssetId) });
    },
  });
}

export function useDeleteLayoutAssetFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Parameters<typeof deleteLayoutAssetFile>[0]) => deleteLayoutAssetFile(input),
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({ queryKey: layoutAssetQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: layoutAssetQueryKeys.detail(input.layoutAssetId) });
      void queryClient.invalidateQueries({ queryKey: layoutAssetQueryKeys.files(input.layoutAssetId) });
    },
  });
}
