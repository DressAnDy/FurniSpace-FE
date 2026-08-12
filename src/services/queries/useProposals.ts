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
  requestProposalRevision,
  resolveRoomPlannerSceneProducts,
  saveRoomPlannerScene,
  selectFinalProposal,
  syncProposalItemsFromScene,
  updateProposal,
  updateProposalScene,
  type CreateProposalInput,
  type CreateProposalSceneInput,
  type ProposalDecisionInput,
  type ProposalListParams,
  type ProposalItemListParams,
  type ProposalSceneListParams,
  type RoomPlannerResolvedProductsData,
  type SaveRoomPlannerSceneInput,
  type SyncProposalItemsFromSceneInput,
  type UpdateProposalInput,
  type UpdateProposalSceneInput,
} from '@/services/api/proposals';

export const proposalQueryKeys = {
  all: ['proposals'] as const,
  detail: (proposalId: string) => ['proposals', 'detail', proposalId] as const,
  items: (params: ProposalItemListParams) => ['proposals', params.proposalId, 'items', params] as const,
  byProject: (params: ProposalListParams) => ['proposals', 'project', params] as const,
  scenes: (params: ProposalSceneListParams) => ['proposals', params.proposalId, 'scenes', params] as const,
  roomPlanner: (sceneId: string) => ['proposal-scenes', sceneId, 'room-planner'] as const,
  roomPlannerResolvedProducts: (sceneId: string, productVersionIds: string[]) =>
    ['proposal-scenes', sceneId, 'room-planner', 'resolved-products', productVersionIds] as const,
};

export function useCreateProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProposalInput) => createProposal(input),
    onSuccess: () => {
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

export function useUpdateProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProposalInput) => updateProposal(input),
    onSuccess: (proposal) => {
      void queryClient.invalidateQueries({ queryKey: proposalQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: proposalQueryKeys.detail(proposal.proposalId) });
      void queryClient.invalidateQueries({ queryKey: proposalQueryKeys.byProject({ projectId: proposal.projectId }) });
    },
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

export function useSelectFinalProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProposalDecisionInput) => selectFinalProposal(input),
    onSuccess: (proposal) => {
      void queryClient.invalidateQueries({ queryKey: proposalQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: proposalQueryKeys.detail(proposal.proposalId) });
      void queryClient.invalidateQueries({ queryKey: proposalQueryKeys.byProject({ projectId: proposal.projectId }) });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useRequestProposalRevision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProposalDecisionInput) => requestProposalRevision(input),
    onSuccess: (proposal) => {
      void queryClient.invalidateQueries({ queryKey: proposalQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: proposalQueryKeys.detail(proposal.proposalId) });
      void queryClient.invalidateQueries({ queryKey: proposalQueryKeys.byProject({ projectId: proposal.projectId }) });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
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

export function useUpdateProposalScene() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProposalSceneInput) => updateProposalScene(input),
    onSuccess: (scene) => {
      void queryClient.invalidateQueries({ queryKey: ['proposals', scene.proposalId, 'scenes'] });
      void queryClient.invalidateQueries({ queryKey: proposalQueryKeys.scenes({ proposalId: scene.proposalId }) });
      void queryClient.invalidateQueries({ queryKey: proposalQueryKeys.roomPlanner(scene.sceneId) });
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

export function useRoomPlannerResolvedProducts(
  sceneId?: string,
  productVersionIds: string[] = [],
  options?: { enabled?: boolean },
) {
  return useQuery<RoomPlannerResolvedProductsData>({
    queryKey: proposalQueryKeys.roomPlannerResolvedProducts(sceneId ?? '', productVersionIds),
    queryFn: () => resolveRoomPlannerSceneProducts({
      sceneId: sceneId ?? '',
      productVersionIds,
    }),
    enabled: Boolean(sceneId) && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000,
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
