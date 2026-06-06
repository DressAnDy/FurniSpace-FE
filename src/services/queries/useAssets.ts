import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/services/api';
import type {
  ApiResponse,
  Asset,
  PaginatedResponse,
} from '@/services/api/types';

export type AssetFilters = {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
};

export type UploadAssetInput = {
  file: File;
  name?: string;
  metadata?: Record<string, string | Blob>;
};

export const assetQueryKeys = {
  all: ['assets'] as const,
  list: (filters?: AssetFilters) => ['assets', filters] as const,
  detail: (id: string) => ['assets', id] as const,
};

async function getAssetList(filters?: AssetFilters) {
  const response = await apiClient.get<ApiResponse<PaginatedResponse<Asset>>>(
    '/assets',
    {
      params: filters,
    },
  );

  return response.data.data;
}

async function getAssetById(id: string) {
  const response = await apiClient.get<ApiResponse<Asset>>(`/assets/${id}`);

  return response.data.data;
}

async function uploadAsset(input: UploadAssetInput) {
  const formData = new FormData();

  formData.append('file', input.file);

  if (input.name) {
    formData.append('name', input.name);
  }

  Object.entries(input.metadata ?? {}).forEach(([key, value]) => {
    formData.append(key, value);
  });

  const response = await apiClient.post<ApiResponse<Asset>>(
    '/assets',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return response.data.data;
}

export function useAssetList(filters?: AssetFilters) {
  return useQuery({
    queryKey: assetQueryKeys.list(filters),
    queryFn: () => getAssetList(filters),
  });
}

export function useAssetById(id: string) {
  return useQuery({
    queryKey: assetQueryKeys.detail(id),
    queryFn: () => getAssetById(id),
    enabled: Boolean(id),
  });
}

export function useUploadAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadAsset,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: assetQueryKeys.all });
    },
  });
}
