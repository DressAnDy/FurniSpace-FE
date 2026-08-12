import { useEffect, useMemo, useRef, useState } from 'react';
import {
  IconChevronLeft,
  IconCircleCheck,
  IconCube,
  IconLayoutDashboard,
  IconMaximize,
  IconMessageDots,
  IconPackage,
} from '@tabler/icons-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { CustomerNavbar } from '@/features/CustomerPages/customercomponents';
import { ProjectChatPanel } from '@/features/projectChat/ProjectChatPanel';
import { BlueprintCanvas } from '@/features/ThreeD/components/BlueprintCanvas';
import { RoomPreview3D, type PlacedProduct3D } from '@/features/ThreeD/components/RoomPreview3D';
import type { RoomMaterialSelection } from '@/features/ThreeD/types/roomLayout.types';
import { hydrateRoomPlannerScenePayload } from '@/features/ThreeD/utils/roomPlannerSceneMapper';
import { BuildingSceneCanvas } from '@/features/ThreeDTest/components/BuildingSceneCanvas';
import type { BuildingLevelVisibility } from '@/features/ThreeDTest/schemas/buildingScene.types';
import {
  createResolvedRoomPlannerBuildingModelVersionMap,
  resolvePlacedBuildingProducts,
} from '@/features/ThreeDTest/utils/buildingProductCatalogMapper';
import { hydrateBuildingRoomPlannerPayload } from '@/features/ThreeDTest/utils/buildingRoomPlannerPayloadMapper';
import '@/features/ThreeD/pages/ThreeDTestPage.css';
import './Customer3dPreviewPage.css';
import {
  getProposalServiceResultMessage,
  type ProposalDto,
  type ProposalItemDto,
  type RoomPlannerSceneData,
} from '@/services/api/proposals';
import {
  useProjectCustomizationRequests,
  useProjectList,
  useProjectProposals,
  useProposalItems,
  useProposalScenes,
  useRoomPlannerResolvedProducts,
  useRoomPlannerScene,
  useSelectFinalProposal,
} from '@/services/queries';
import { aggregateDuplicateItems } from '@/shared/utils/itemAggregation';

type ViewMode = '2d' | '3d';
type SidePanelMode = 'items' | 'chat' | null;
const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

export function Customer3dPreviewPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const projectIdFromUrl = searchParams.get('projectId') ?? '';
  const proposalIdFromUrl = searchParams.get('proposalId') ?? '';
  const sceneIdFromUrl = searchParams.get('sceneId') ?? '';
  const stageRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('3d');
  const [activeLevel, setActiveLevel] = useState<BuildingLevelVisibility>('all');
  const [sidePanelMode, setSidePanelMode] = useState<SidePanelMode>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [decisionMessage, setDecisionMessage] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(() => projectIdFromUrl);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(() => proposalIdFromUrl || null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(() => sceneIdFromUrl || null);
  const selectFinalProposalMutation = useSelectFinalProposal();

  const projectsQuery = useProjectList({ page: 1, limit: 50 });
  const projects = useMemo(() => projectsQuery.data?.items ?? [], [projectsQuery.data?.items]);
  const proposalsQuery = useProjectProposals(
    {
      projectId: selectedProjectId,
      page: 1,
      limit: 100,
    },
    { enabled: Boolean(selectedProjectId) },
  );
  const proposals = useMemo(() => proposalsQuery.data?.items ?? [], [proposalsQuery.data?.items]);
  const selectedProject = projects.find((project) => project.projectId === selectedProjectId) ?? null;
  const selectedProposal = proposals.find((proposal) => proposal.proposalId === selectedProposalId) ?? proposals[0] ?? null;
  const customizationRequestsQuery = useProjectCustomizationRequests(
    selectedProposal
      ? {
          projectId: selectedProposal.projectId,
          proposalId: selectedProposal.proposalId,
        }
      : undefined,
    { enabled: Boolean(selectedProposal?.projectId && selectedProposal?.proposalId) },
  );
  const customizationBlocker = getProposalSelectionCustomizationBlocker(customizationRequestsQuery.data?.items ?? []);
  const canSelectProposal = selectedProposal?.status === 'PUBLISHED' && !customizationBlocker;
  const scenesQuery = useProposalScenes(
    selectedProposal
      ? {
          proposalId: selectedProposal.proposalId,
          isActive: true,
          page: 1,
          limit: 50,
        }
      : undefined,
    { enabled: Boolean(selectedProposal) },
  );
  const scenes = useMemo(
    () => (scenesQuery.data?.items ?? []).filter(isRoomPlannerPreviewScene),
    [scenesQuery.data?.items],
  );
  const selectedScene = scenes.find((scene) => scene.sceneId === selectedSceneId) ?? scenes[0] ?? null;
  const roomPlannerSceneQuery = useRoomPlannerScene(selectedScene?.sceneId, { enabled: Boolean(selectedScene?.sceneId) });
  const sceneProductVersionIds = useMemo(
    () => collectSceneProductVersionIds(roomPlannerSceneQuery.data),
    [roomPlannerSceneQuery.data],
  );
  const resolvedProductsQuery = useRoomPlannerResolvedProducts(
    selectedScene?.sceneId,
    sceneProductVersionIds,
    { enabled: Boolean(selectedScene?.sceneId && roomPlannerSceneQuery.data) },
  );
  const resolvedProductsByVersionId = useMemo(
    () => new Map((resolvedProductsQuery.data?.items ?? []).map((item) => [item.productVersionId, item])),
    [resolvedProductsQuery.data?.items],
  );
  const proposalItemsQuery = useProposalItems(
    selectedProposal
      ? {
          proposalId: selectedProposal.proposalId,
          sceneId: selectedScene?.sceneId ?? null,
          page: 1,
          limit: 100,
        }
      : undefined,
    { enabled: Boolean(selectedProposal) },
  );
  const hydratedScene = useMemo(
    () => hydrateRoomPlannerScenePayload(roomPlannerSceneQuery.data, {
      resolveModelUrl: (object) => {
        const productVersionId = object.productVersionId;
        const product = productVersionId ? resolvedProductsByVersionId.get(productVersionId) : null;

        return product?.files?.find((file) => file.fileType === 'MODEL_3D')?.fileUrl ?? null;
      },
    }),
    [resolvedProductsByVersionId, roomPlannerSceneQuery.data],
  );
  const hydratedBuildingScene = useMemo(
    () => hydrateBuildingRoomPlannerPayload(roomPlannerSceneQuery.data),
    [roomPlannerSceneQuery.data],
  );
  const buildingModelsByVersionId = useMemo(
    () => createResolvedRoomPlannerBuildingModelVersionMap(resolvedProductsQuery.data?.items ?? []),
    [resolvedProductsQuery.data?.items],
  );
  const resolvedBuildingProducts = useMemo(
    () => resolvePlacedBuildingProducts(hydratedBuildingScene.placedProducts, buildingModelsByVersionId),
    [buildingModelsByVersionId, hydratedBuildingScene.placedProducts],
  );
  const floorMaterial = useMemo(
    () => getSceneFloorMaterial(roomPlannerSceneQuery.data),
    [roomPlannerSceneQuery.data],
  );
  const wallMaterial = useMemo(
    () => getSceneWallMaterial(roomPlannerSceneQuery.data),
    [roomPlannerSceneQuery.data],
  );
  const proposalItems = useMemo(() => proposalItemsQuery.data?.items ?? [], [proposalItemsQuery.data?.items]);
  const sceneProducts = hydratedScene.placedProducts;
  const displayProposalItems = useMemo(() => aggregateDuplicateItems(proposalItems), [proposalItems]);
  const displaySceneProducts = useMemo(() => aggregateSceneProducts(sceneProducts), [sceneProducts]);
  const selectedObject = useMemo(
    () => sceneProducts.find((object) => object.id === selectedObjectId) ?? null,
    [sceneProducts, selectedObjectId],
  );
  const levelOptions = useMemo<Array<{ label: string; value: BuildingLevelVisibility }>>(() => {
    const levels = hydratedBuildingScene.sceneData?.building.levels ?? [];

    if (levels.length === 0) {
      return [{ label: 'All', value: 'all' }];
    }

    return [
      { label: 'All Floors', value: 'all' },
      ...levels.map((level) => ({ label: level.label, value: level.id })),
    ];
  }, [hydratedBuildingScene.sceneData?.building.levels]);

  useEffect(() => {
    if (activeLevel === 'all') return;

    const levels = hydratedBuildingScene.sceneData?.building.levels ?? [];
    if (!levels.some((level) => level.id === activeLevel)) {
      setActiveLevel('all');
    }
  }, [activeLevel, hydratedBuildingScene.sceneData?.building.levels]);

  useEffect(() => {
    if (selectedProjectId || projects.length === 0) {
      return;
    }

    const firstProjectId = projects[0].projectId;
    setSelectedProjectId(firstProjectId);
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      nextParams.set('projectId', firstProjectId);
      return nextParams;
    }, { replace: true });
  }, [projects, selectedProjectId, setSearchParams]);

  useEffect(() => {
    if (projectIdFromUrl && projectIdFromUrl !== selectedProjectId) {
      setSelectedProjectId(projectIdFromUrl);
    }
  }, [projectIdFromUrl, selectedProjectId]);

  useEffect(() => {
    if (proposalIdFromUrl && proposalIdFromUrl !== selectedProposalId) {
      setSelectedProposalId(proposalIdFromUrl);
    }
  }, [proposalIdFromUrl, selectedProposalId]);

  useEffect(() => {
    if (sceneIdFromUrl && sceneIdFromUrl !== selectedSceneId) {
      setSelectedSceneId(sceneIdFromUrl);
    }
  }, [sceneIdFromUrl, selectedSceneId]);

  useEffect(() => {
    if (!selectedProjectId || projectIdFromUrl === selectedProjectId) {
      return;
    }

    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      nextParams.set('projectId', selectedProjectId);
      return nextParams;
    }, { replace: true });
  }, [projectIdFromUrl, selectedProjectId, setSearchParams]);

  useEffect(() => {
    setSelectedProposalId((currentProposalId) => {
      if (currentProposalId && proposals.some((proposal) => proposal.proposalId === currentProposalId)) {
        return currentProposalId;
      }

      if (proposalIdFromUrl && proposals.some((proposal) => proposal.proposalId === proposalIdFromUrl)) {
        return proposalIdFromUrl;
      }

      return proposals[0]?.proposalId ?? null;
    });
  }, [proposalIdFromUrl, proposals, selectedProjectId]);

  useEffect(() => {
    setSelectedSceneId((currentSceneId) => {
      if (currentSceneId && scenes.some((scene) => scene.sceneId === currentSceneId)) {
        return currentSceneId;
      }

      if (sceneIdFromUrl && scenes.some((scene) => scene.sceneId === sceneIdFromUrl)) {
        return sceneIdFromUrl;
      }

      return scenes[0]?.sceneId ?? null;
    });
  }, [sceneIdFromUrl, selectedProposal?.proposalId, scenes]);

  useEffect(() => {
    setSelectedObjectId(null);
  }, [selectedScene?.sceneId]);

  async function selectProposal() {
    if (!selectedProposal) {
      return;
    }

    setDecisionMessage('');

    try {
      await selectFinalProposalMutation.mutateAsync({ proposalId: selectedProposal.proposalId });
      setDecisionMessage('Proposal selected successfully. Sales can now create the official quotation.');
    } catch (error) {
      setDecisionMessage(getProposalServiceResultMessage(error));
    }
  }

  return (
    <main className="customer-3d-preview-page">
      <CustomerNavbar activeLabel="Design Proposals" classPrefix="customer-3d-preview" />

      <section className="customer-3d-preview-viewer" aria-label="Customer proposal scene review">
        <div className="customer-3d-preview-toolbar">
          <div className="customer-3d-preview-titlebar">
            <button type="button" aria-label="Back to proposal detail" onClick={() => navigate('/customer/proposals')}>
              <IconChevronLeft size={20} stroke={1.8} />
            </button>
            <span />
            <div>
              <strong>{selectedProposal?.proposalName ?? 'No proposal selected'}</strong>
              <small>{selectedProject?.projectName ?? 'Customer review'} - read-only</small>
            </div>
          </div>

          <div className="customer-3d-preview-actions">
            <div className="customer-3d-preview-view-switch" role="tablist" aria-label="Preview mode">
              <button
                className={viewMode === '2d' ? 'customer-3d-preview-view-active' : ''}
                type="button"
                role="tab"
                aria-selected={viewMode === '2d'}
                onClick={() => setViewMode('2d')}
              >
                <IconLayoutDashboard size={16} stroke={1.8} /> 2D Floor Plan
              </button>
              <button
                className={viewMode === '3d' ? 'customer-3d-preview-view-active' : ''}
                type="button"
                role="tab"
                aria-selected={viewMode === '3d'}
                onClick={() => setViewMode('3d')}
              >
                <IconCube size={16} stroke={1.8} /> 3D View
              </button>
            </div>
            <div className="customer-3d-preview-panel-switch" role="tablist" aria-label="Preview side panel">
              <button
                className={sidePanelMode === 'chat' ? 'customer-3d-preview-view-active' : ''}
                type="button"
                role="tab"
                aria-selected={sidePanelMode === 'chat'}
                onClick={() => setSidePanelMode((currentMode) => (currentMode === 'chat' ? null : 'chat'))}
              >
                <IconMessageDots size={16} stroke={1.8} /> Chat
              </button>
              <button
                className={sidePanelMode === 'items' ? 'customer-3d-preview-view-active' : ''}
                type="button"
                role="tab"
                aria-selected={sidePanelMode === 'items'}
                onClick={() => setSidePanelMode((currentMode) => (currentMode === 'items' ? null : 'items'))}
              >
                <IconPackage size={16} stroke={1.8} /> Scene Items
              </button>
            </div>
            <span className="customer-3d-preview-status">{selectedProposal?.status ?? 'No proposal'}</span>
            <button
              className="customer-3d-preview-select-button"
              disabled={!canSelectProposal || selectFinalProposalMutation.isPending || selectedProposal?.status === 'SELECTED'}
              type="button"
              onClick={() => void selectProposal()}
            >
              <IconCircleCheck size={16} stroke={1.8} />
              {selectFinalProposalMutation.isPending ? 'Selecting...' : selectedProposal?.status === 'SELECTED' ? 'Selected' : 'Select Proposal'}
            </button>
            <button
              className="customer-3d-preview-icon-button"
              type="button"
              aria-label="Fullscreen preview"
              onClick={() => void stageRef.current?.requestFullscreen?.()}
            >
              <IconMaximize size={20} stroke={1.8} />
            </button>
          </div>
        </div>

        <div className={`customer-3d-preview-workspace${sidePanelMode ? '' : ' customer-3d-preview-workspace-no-side'}`}>
          <aside className="customer-3d-preview-left-panel" aria-label="Project proposals">
            <PanelHeader title="Proposals" />
            <div className="customer-proposal-list">
              {projectsQuery.isLoading && <p>Loading projects...</p>}
              {!projectsQuery.isLoading && projects.length === 0 && <p>No customer projects returned yet.</p>}
              {proposalsQuery.isLoading && <p>Loading proposals...</p>}
              {proposalsQuery.isError && <p>{getProposalServiceResultMessage(proposalsQuery.error)}</p>}
              {!proposalsQuery.isLoading && !proposalsQuery.isError && selectedProjectId && proposals.length === 0 && (
                <p>No proposals returned for this project yet.</p>
              )}
              {proposals.map((proposal) => (
                <ProposalButton
                  isActive={proposal.proposalId === selectedProposal?.proposalId}
                  key={proposal.proposalId}
                  proposal={proposal}
                  onSelect={() => {
                    setSelectedProposalId(proposal.proposalId);
                    setSelectedSceneId(null);
                    setSearchParams((currentParams) => {
                      const nextParams = new URLSearchParams(currentParams);
                      nextParams.set('projectId', proposal.projectId);
                      nextParams.set('proposalId', proposal.proposalId);
                      nextParams.delete('sceneId');
                      return nextParams;
                    }, { replace: true });
                  }}
                />
              ))}
            </div>

            <PanelHeader title="Scenes" />
            <div className="customer-scene-list is-compact">
              {scenesQuery.isLoading && <p className="customer-scene-state">Loading scenes...</p>}
              {scenesQuery.isError && <p className="customer-scene-state">{getProposalServiceResultMessage(scenesQuery.error)}</p>}
              {!scenesQuery.isLoading && !scenesQuery.isError && selectedProposal && scenes.length === 0 && (
                <p className="customer-scene-state">No saved 3D scenes returned for this proposal yet.</p>
              )}
              {scenes.map((scene, index) => (
                <button
                  className={scene.sceneId === selectedScene?.sceneId ? 'is-active' : ''}
                  key={scene.sceneId}
                  type="button"
                  onClick={() => {
                    setSelectedSceneId(scene.sceneId);
                    setSearchParams((currentParams) => {
                      const nextParams = new URLSearchParams(currentParams);
                      nextParams.set('projectId', selectedProjectId);
                      nextParams.set('proposalId', scene.proposalId);
                      nextParams.set('sceneId', scene.sceneId);
                      return nextParams;
                    }, { replace: true });
                  }}
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div><strong>{scene.sceneName}</strong><small>Version {scene.versionNo}</small></div>
                </button>
              ))}
            </div>
          </aside>

          <div className="customer-3d-preview-stage" ref={stageRef}>
            <div className="customer-scene-renderer">
              {roomPlannerSceneQuery.isLoading ? (
                <SceneState message="Loading saved Room Planner scene..." />
              ) : resolvedProductsQuery.isError ? (
                <SceneState message={getProposalServiceResultMessage(resolvedProductsQuery.error)} />
              ) : roomPlannerSceneQuery.isError ? (
                <SceneState message={getProposalServiceResultMessage(roomPlannerSceneQuery.error)} />
              ) : !selectedScene ? (
                <SceneState message="Select a proposal with a saved 3D scene." />
              ) : !hydratedScene.layout && !hydratedBuildingScene.sceneData ? (
                <SceneState message="This scene has no saved room layout in MongoDB yet." />
              ) : viewMode === '3d' && hydratedBuildingScene.sceneData ? (
                <BuildingSceneCanvas
                  activeLevel={activeLevel}
                  modelsById={new Map()}
                  placedProducts={resolvedBuildingProducts}
                  sceneData={hydratedBuildingScene.sceneData}
                  selectedProductId={selectedObjectId}
                  onProductDrop={() => undefined}
                  onProductLoadError={() => undefined}
                  onProductMove={() => undefined}
                  onProductSelect={(productId) => setSelectedObjectId(productId)}
                />
              ) : viewMode === '3d' && hydratedScene.layout ? (
                <RoomPreview3D
                  floorMaterial={floorMaterial}
                  layout={hydratedScene.layout}
                  placedProducts={sceneProducts}
                  readOnly
                  selectedProductId={selectedObjectId}
                  wallMaterial={wallMaterial}
                  onProductSelect={(productId) => setSelectedObjectId(productId)}
                />
              ) : hydratedScene.layout ? (
                <BlueprintCanvas
                  activeTool="select"
                  floorFillColor={floorMaterial.fallbackColor}
                  hideLabels={false}
                  layout={hydratedScene.layout}
                  readOnly
                  selectedItem={null}
                  wallFillColor={wallMaterial.fallbackColor}
                  onLayoutChange={() => undefined}
                  onSelectItem={() => undefined}
                />
              ) : (
                <SceneState message="2D preview for this multi-floor scene is not available yet." />
              )}
            </div>

            <div className="customer-3d-preview-scene-card">
              <strong>{selectedScene?.sceneName ?? selectedProposal?.proposalName ?? 'Room Planner Scene'}</strong>
              <p>{selectedScene ? `Scene version ${selectedScene.versionNo}` : selectedProposal ? `Proposal version ${selectedProposal.versionNo}` : 'No scene selected'}</p>
              {levelOptions.length > 1 ? (
                <div className="customer-3d-preview-floor-tabs" role="tablist" aria-label="Floor view">
                  {levelOptions.map((level) => (
                    <button
                      key={level.value}
                      className={activeLevel === level.value ? 'is-active' : ''}
                      type="button"
                      role="tab"
                      aria-selected={activeLevel === level.value}
                      onClick={() => setActiveLevel(level.value)}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="customer-readonly-notice">Saved scene - editing disabled</div>
          </div>

          {sidePanelMode ? (
          <aside className="customer-3d-preview-right-panel" aria-label={sidePanelMode === 'chat' ? 'Designer chat' : 'Scene items'}>
            <PanelHeader title={sidePanelMode === 'chat' ? 'Designer Chat' : 'Scene Items'} />
            {sidePanelMode === 'chat' ? (
              selectedProject ? (
                <div className="customer-3d-preview-side-content customer-3d-preview-side-chat">
                  <ProjectChatPanel
                    compact
                    preferredChatType="DESIGNER"
                    projectCode={selectedProject.projectCode}
                    projectId={selectedProject.projectId}
                    title="Designer Chat"
                  />
                </div>
              ) : (
                <p className="customer-scene-state">Select a project to chat with the assigned designer.</p>
              )
            ) : (
              <>
                <div className="customer-3d-preview-side-content">
                  {selectedObject && (
                    <div className="customer-selected-object">
                      <span>Selected object</span>
                      <strong>{selectedObject.modelName}</strong>
                      <small>{selectedObject.productVersionId ?? selectedObject.productId ?? selectedObject.id}</small>
                    </div>
                  )}
                  <div className="customer-3d-preview-item-list">
                    {proposalItemsQuery.isLoading && <p className="customer-scene-state">Loading proposal items...</p>}
                    {displayProposalItems.length > 0
                      ? displayProposalItems.map((item) => <ProposalItemCard item={item} key={item.proposalItemId} />)
                      : displaySceneProducts.map((product) => <SceneProductCard product={product} key={product.id} />)}
                    {!proposalItemsQuery.isLoading && displayProposalItems.length === 0 && displaySceneProducts.length === 0 && (
                      <p className="customer-scene-state">No furniture objects are saved in this scene yet.</p>
                    )}
                  </div>
                </div>

                {decisionMessage && <div className="customer-decision-message">{decisionMessage}</div>}
                {customizationBlocker ? <div className="customer-decision-message">{customizationBlocker}</div> : null}
                <div className="customer-3d-preview-decision">
                  <button
                    disabled={!canSelectProposal || selectFinalProposalMutation.isPending}
                    type="button"
                    onClick={() => void selectProposal()}
                  >
                    <IconCircleCheck size={18} stroke={1.8} /> {selectFinalProposalMutation.isPending ? 'Selecting...' : selectedProposal?.status === 'SELECTED' ? 'Selected Proposal' : 'Select Proposal'}
                  </button>
                </div>
              </>
            )}
          </aside>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function ProposalButton({
  isActive,
  onSelect,
  proposal,
}: {
  isActive: boolean;
  onSelect: () => void;
  proposal: ProposalDto;
}) {
  return (
    <button
      className={isActive ? 'customer-proposal-button is-active' : 'customer-proposal-button'}
      type="button"
      onClick={onSelect}
    >
      <div>
        <strong>{proposal.proposalName}</strong>
        <span>{proposal.status}</span>
      </div>
      <small>Version {proposal.versionNo} - Updated {formatDateTime(proposal.updatedAt)}</small>
    </button>
  );
}

function ProposalItemCard({ item }: { item: ProposalItemDto }) {
  return (
    <article className="customer-3d-preview-item-card">
      <div>
        <strong>{item.productNameSnapshot || item.versionNameSnapshot || item.productVersionId}</strong>
        <span>{[item.materialSnapshot, item.colorSnapshot].filter(Boolean).join(' - ') || item.productVersionId}</span>
      </div>
      <div>
        <span>{item.quantity}x</span>
        <strong>{formatCurrency(item.subtotalAmount ?? item.unitPriceSnapshot)}</strong>
      </div>
    </article>
  );
}

type AggregatedSceneProduct = PlacedProduct3D & { quantity: number };

function SceneProductCard({ product }: { product: AggregatedSceneProduct }) {
  return (
    <article className="customer-3d-preview-item-card">
      <div>
        <strong>{product.modelName}</strong>
        <span>{[product.visualSnapshot?.material, product.visualSnapshot?.color].filter(Boolean).join(' - ') || product.productVersionId || product.id}</span>
      </div>
      <div>
        <span>{product.quantity}x</span>
        <strong>{product.productVersionId ? 'From scene' : 'Local object'}</strong>
      </div>
    </article>
  );
}

function aggregateSceneProducts(products: PlacedProduct3D[]) {
  const productsBySample = new Map<string, AggregatedSceneProduct>();

  for (const product of products) {
    const key = [
      product.productVersionId ?? product.productId ?? product.modelName,
      product.visualSnapshot?.material ?? 'NO_MATERIAL',
      product.visualSnapshot?.color ?? 'NO_COLOR',
    ].join('|');
    const existingProduct = productsBySample.get(key);

    if (existingProduct) {
      existingProduct.quantity += 1;
      continue;
    }

    productsBySample.set(key, { ...product, quantity: 1 });
  }

  return Array.from(productsBySample.values());
}

function SceneState({ message }: { message: string }) {
  return <div className="customer-scene-state-overlay">{message}</div>;
}

function PanelHeader({ title }: { title: string }) {
  return <header className="customer-3d-preview-panel-header"><h2>{title}</h2></header>;
}

function isRoomPlannerPreviewScene(scene: { sceneType?: string | null }) {
  return scene.sceneType === 'ROOM_PLANNER' || scene.sceneType === 'THREE_D';
}

function collectSceneProductVersionIds(scene: RoomPlannerSceneData | null | undefined) {
  const ids = (scene?.objects ?? [])
    .filter((object) => object.objectType === 'FURNITURE')
    .map((object) => object.productVersionId)
    .filter((value): value is string => Boolean(value && value !== EMPTY_GUID));

  return Array.from(new Set(ids)).sort();
}

function getProposalSelectionCustomizationBlocker(
  requests: Array<{ acceptedRequestVersionId?: string | null; status?: string | null }>,
) {
  const activeRequests = requests.filter((request) => request.status === 'SUBMITTED' || request.status === 'REVIEWING');

  if (activeRequests.length > 0) {
    return `${activeRequests.length} customization request${activeRequests.length === 1 ? '' : 's'} must be resolved before selecting this proposal.`;
  }

  return null;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== 'number') {
    return '-';
  }

  return `${new Intl.NumberFormat('vi-VN').format(value)} VND`;
}

function getSceneFloorMaterial(scene: RoomPlannerSceneData | null | undefined): RoomMaterialSelection {
  const layout = scene?.layout as {
    floor?: {
      color?: string | null;
      materialId?: string | null;
      textureUrlSnapshot?: string | null;
    };
    floorMaterialId?: string | null;
  } | undefined;

  return {
    fallbackColor: layout?.floor?.color ?? '#8B5A2B',
    id: layout?.floor?.materialId ?? layout?.floorMaterialId ?? 'scene-floor',
    label: layout?.floor?.materialId ?? layout?.floorMaterialId ?? 'Scene Floor',
    textureUrl: undefined,
    type: 'floor',
  };
}

function getSceneWallMaterial(scene: RoomPlannerSceneData | null | undefined): RoomMaterialSelection {
  const layout = scene?.layout as {
    wallMaterialId?: string | null;
    walls?: Array<{
      style?: {
        color?: string | null;
        materialId?: string | null;
        textureUrlSnapshot?: string | null;
      };
    }>;
  } | undefined;
  const wallStyle = layout?.walls?.find((wall) => wall.style)?.style;

  return {
    fallbackColor: wallStyle?.color ?? '#D8D2C5',
    id: wallStyle?.materialId ?? layout?.wallMaterialId ?? 'scene-wall',
    label: wallStyle?.materialId ?? layout?.wallMaterialId ?? 'Scene Wall',
    textureUrl: undefined,
    type: 'wall',
  };
}
