import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createProposal,
  createProposalScene,
  getProposalById,
  getProposalItems,
  getProjectProposals,
  getProposalScenes,
  getRoomPlannerScene,
  publishProposal,
  saveRoomPlannerScene,
  syncProposalItemsFromScene,
  type CreateProposalInput,
  type CreateProposalSceneInput,
  type ProposalListParams,
  type ProposalItemListParams,
  type ProposalSceneListParams,
  type SaveRoomPlannerSceneInput,
  type SyncProposalItemsFromSceneInput,
} from '@/services/api/proposals';

export const proposalQueryKeys = {
  all: ['proposals'] as const,
  detail: (proposalId: string) => ['proposals', 'detail', proposalId] as const,
  items: (params: ProposalItemListParams) => ['proposals', params.proposalId, 'items', params] as const,
  byProject: (params: ProposalListParams) => ['proposals', 'project', params] as const,
  scenes: (params: ProposalSceneListParams) => ['proposals', params.proposalId, 'scenes', params] as const,
  roomPlanner: (sceneId: string) => ['proposal-scenes', sceneId, 'room-planner'] as const,
};

export function useCreateProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProposalInput) => createProposal(input),
    onSuccess: (proposal) => {
      void queryClient.invalidateQueries({ queryKey: proposalQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['proposals', 'project'] });
    },
  });
}

export function useProjectProposals(params?: ProposalListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: proposalQueryKeys.byProject(params ?? { projectId: '' }),
    queryFn: () => getProjectProposals(params as ProposalListParams),
    enabled: Boolean(params?.projectId) && (options?.enabled ?? true),
  });
}

export function useProposalDetail(proposalId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: proposalQueryKeys.detail(proposalId ?? ''),
    queryFn: () => getProposalById(proposalId ?? ''),
    enabled: Boolean(proposalId) && (options?.enabled ?? true),
  });
}

export function usePublishProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { note?: string | null; proposalId: string }) => publishProposal(input.proposalId, input.note),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: proposalQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: proposalQueryKeys.detail(result.proposalId) });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useCreateProposalScene() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProposalSceneInput) => createProposalScene(input),
    onSuccess: (scene) => {
      void queryClient.invalidateQueries({ queryKey: ['proposals', scene.proposalId, 'scenes'] });
    },
  });
}

export function useProposalScenes(params?: ProposalSceneListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: proposalQueryKeys.scenes(params ?? { proposalId: '' }),
    queryFn: () => getProposalScenes(params as ProposalSceneListParams),
    enabled: Boolean(params?.proposalId) && (options?.enabled ?? true),
  });
}

export function useProposalItems(params?: ProposalItemListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: proposalQueryKeys.items(params ?? { proposalId: '' }),
    queryFn: () => getProposalItems(params as ProposalItemListParams),
    enabled: Boolean(params?.proposalId) && (options?.enabled ?? true),
  });
}

export function useRoomPlannerScene(sceneId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: proposalQueryKeys.roomPlanner(sceneId ?? ''),
    queryFn: () => getRoomPlannerScene(sceneId ?? ''),
    enabled: Boolean(sceneId) && (options?.enabled ?? true),
  });
}

export function useSaveRoomPlannerScene() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SaveRoomPlannerSceneInput) => saveRoomPlannerScene(input),
    onSuccess: (scene) => {
      void queryClient.invalidateQueries({ queryKey: proposalQueryKeys.roomPlanner(scene.sceneId) });
    },
  });
}

export function useSyncProposalItemsFromScene() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SyncProposalItemsFromSceneInput) => syncProposalItemsFromScene(input),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['proposals', result.proposalId, 'items'] });
      void queryClient.invalidateQueries({ queryKey: ['proposals', result.proposalId, 'scenes'] });
      void queryClient.invalidateQueries({ queryKey: proposalQueryKeys.roomPlanner(result.sceneId) });
    },
  });
}
