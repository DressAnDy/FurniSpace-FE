import { useEffect, useMemo, useState } from 'react';
import {
  IconArrowLeft,
  IconCheck,
  IconChevronRight,
  IconCube,
  IconEdit,
  IconFileText,
  IconMessageCircle,
  IconPlus,
  IconRefresh,
  IconRulerMeasure,
  IconX,
} from '@tabler/icons-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { DesignerShell } from '@/features/DesignerPages/components/DesignerShell';
import { ProjectChatPanel } from '@/features/projectChat/ProjectChatPanel';
import { getProjectAreaServiceResultMessage, type ProjectAreaDto } from '@/services/api/projectAreas';
import { getProjectServiceResultMessage } from '@/services/api/projects';
import { getProposalServiceResultMessage, type ProposalDetailDto, type ProposalItemDto, type ProposalSceneDto } from '@/services/api/proposals';
import {
  useCreateProposal,
  useCreateProposalScene,
  useProjectDetail,
  useProjectAreas,
  useProposalDetail,
  useProposalItems,
  useProposalScenes,
  usePublishProposal,
  useReopenProposalForEditing,
  useUpdateProposal,
  useUpdateProposalScene,
} from '@/services/queries';
import { aggregateDuplicateItems } from '@/shared/utils/itemAggregation';

import './DesignerProposalWorkspace.css';

type WorkspaceTab = 'scenes' | 'chat';
type ProposalDraft = {
  description: string;
  proposalName: string;
};

type SceneEditDraft = {
  projectAreaId: string;
  sceneName: string;
};

const DEFAULT_PROPOSAL_DRAFT: ProposalDraft = {
  description: '',
  proposalName: '',
};

const DEFAULT_SCENE_EDIT_DRAFT: SceneEditDraft = {
  projectAreaId: '',
  sceneName: '',
};

function getSceneAreaIds(scene: ProposalSceneDto) {
  const areaIds = scene.areas?.map((area) => area.projectAreaId).filter(Boolean) ?? [];

  if (areaIds.length > 0) {
    return areaIds;
  }

  return scene.projectAreaId ? [scene.projectAreaId] : [];
}

function getSceneDisplayName(scene: ProposalSceneDto) {
  return scene.sceneName?.trim() || 'Untitled Room Planner Scene';
}

export function DesignerProposalWorkspace() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId, proposalId } = useParams();
  const isProposalSetupMode = !proposalId || proposalId === 'new';
  const activeProposalId = isProposalSetupMode ? undefined : proposalId;
  const routeState = location.state as { createdSceneId?: string; selectedAreaId?: string } | null;
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('scenes');
  const [message, setMessage] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState(routeState?.selectedAreaId ?? '');
  const [selectedSceneId, setSelectedSceneId] = useState('');
  const [proposalDraft, setProposalDraft] = useState<ProposalDraft>(DEFAULT_PROPOSAL_DRAFT);
  const [proposalEditDraft, setProposalEditDraft] = useState<ProposalDraft>(DEFAULT_PROPOSAL_DRAFT);
  const [editingScene, setEditingScene] = useState<ProposalSceneDto | null>(null);
  const [sceneEditDraft, setSceneEditDraft] = useState<SceneEditDraft>(DEFAULT_SCENE_EDIT_DRAFT);
  const [isUpdateInfoModalOpen, setIsUpdateInfoModalOpen] = useState(false);
  const projectQuery = useProjectDetail(projectId);
  const proposalQuery = useProposalDetail(activeProposalId);
  const areasQuery = useProjectAreas({
    projectId: projectId ?? '',
    includeCancelled: false,
  });
  const scenesQuery = useProposalScenes({
    proposalId: activeProposalId ?? '',
    isActive: true,
    page: 1,
    limit: 100,
  });
  const itemsQuery = useProposalItems({
    proposalId: activeProposalId ?? '',
    sceneId: selectedSceneId || null,
    page: 1,
    limit: 100,
  }, {
    enabled: Boolean(activeProposalId && selectedSceneId),
  });
  const createProposalMutation = useCreateProposal();
  const createSceneMutation = useCreateProposalScene();
  const publishProposalMutation = usePublishProposal();
  const reopenProposalMutation = useReopenProposalForEditing();
  const updateProposalMutation = useUpdateProposal();
  const updateProposalSceneMutation = useUpdateProposalScene();
  const project = projectQuery.data;
  const proposal = proposalQuery.data;
  const areas = useMemo(() => areasQuery.data ?? [], [areasQuery.data]);
  const scenes = useMemo(
    () => scenesQuery.data?.items ?? proposal?.scenes ?? [],
    [proposal?.scenes, scenesQuery.data?.items],
  );
  const items = useMemo(
    () => itemsQuery.data?.items ?? [],
    [itemsQuery.data?.items],
  );
  const displayItems = useMemo(() => aggregateDuplicateItems(items), [items]);
  const total = useMemo(
    () => displayItems.reduce((sum, item) => sum + (item.subtotalAmount ?? 0), 0),
    [displayItems],
  );
  const primaryScene = scenes.find((scene) => scene.sceneType === 'ROOM_PLANNER') ?? scenes.find((scene) => scene.sceneType === 'THREE_D') ?? scenes[0] ?? null;
  const selectedAreaScenes = useMemo(
    () => (selectedAreaId ? scenes.filter((scene) => getSceneAreaIds(scene).includes(selectedAreaId)) : []),
    [scenes, selectedAreaId],
  );
  const selectedScene = scenes.find((scene) => scene.sceneId === selectedSceneId) ?? selectedAreaScenes[0] ?? (selectedAreaId ? null : primaryScene);
  const canEditProposal = Boolean(proposal && isEditableProposalStatus(proposal.status));
  const canPublishProposal = Boolean(activeProposalId && proposal && isEditableProposalStatus(proposal.status) && scenes.length > 0);
  const canReopenProposal = proposal?.status === 'PUBLISHED';
  useEffect(() => {
    if (!proposal) {
      return;
    }

    setProposalEditDraft({
      description: proposal.description ?? '',
      proposalName: proposal.proposalName,
    });
  }, [proposal]);

  useEffect(() => {
    if (selectedSceneId || scenes.length === 0) {
      return;
    }

    setSelectedSceneId(routeState?.createdSceneId && scenes.some((scene) => scene.sceneId === routeState.createdSceneId) ? routeState.createdSceneId : scenes[0].sceneId);
  }, [routeState?.createdSceneId, scenes, selectedSceneId]);

  useEffect(() => {
    if (selectedAreaId || isProposalSetupMode || areas.length === 0) {
      return;
    }

    const areaWithScene = areas.find((area) => scenes.some((scene) => getSceneAreaIds(scene).includes(area.projectAreaId)));
    setSelectedAreaId((areaWithScene ?? areas[0]).projectAreaId);
  }, [areas, isProposalSetupMode, scenes, selectedAreaId]);

  async function publishCurrentProposal() {
    if (!activeProposalId) {
      return;
    }

    setMessage('');

    if (!canPublishProposal) {
      setMessage('Proposal must be editable and have at least one active scene before publishing.');
      return;
    }

    try {
      await publishProposalMutation.mutateAsync({
        proposalId: activeProposalId,
        note: 'Published by designer from proposal workspace.',
      });
      setMessage('Proposal published successfully. It is now ready for customer review.');
    } catch (error) {
      setMessage(getProposalServiceResultMessage(error));
    }
  }

  async function createProposal() {
    if (!projectId) {
      return;
    }

    const proposalName = proposalDraft.proposalName.trim();
    const description = proposalDraft.description.trim();
    const projectAreaIds = areas
      .filter((area) => area.status !== 'CANCELLED')
      .map((area) => area.projectAreaId);

    setMessage('');

    if (!proposalName) {
      setMessage('Proposal name is required. Leave the default blank and enter the sale/designer naming before creating it.');
      return;
    }

    if (!description) {
      setMessage('Proposal description is required.');
      return;
    }

    if (projectAreaIds.length === 0) {
      setMessage('Create at least one project area first. Each area becomes a floor in the room planner scene.');
      return;
    }

    try {
      const createdProposal = await createProposalMutation.mutateAsync({
        projectId,
        proposalName,
        description,
      });

      const createdScene = await createSceneMutation.mutateAsync({
        proposalId: createdProposal.proposalId,
        sceneName: `${proposalName} Room Planner`,
        sceneType: 'ROOM_PLANNER',
        projectAreaIds,
      });

      setProposalDraft(DEFAULT_PROPOSAL_DRAFT);
      setMessage(`Created ${createdProposal.proposalName} with one room planner scene.`);
      navigate(`/designer/projects/${projectId}/proposals/${createdProposal.proposalId}`, {
        state: {
          createdSceneId: createdScene.sceneId,
          ...(selectedAreaId ? { selectedAreaId } : {}),
        },
      });
    } catch (error) {
      setMessage(getProposalServiceResultMessage(error));
    }
  }

  function openRoomPlanner(scene: ProposalSceneDto) {
    navigate(`/proposal-scenes/${scene.sceneId}/room-planner`, {
      state: {
        mode: 'create-proposal',
        projectAreaIds: getSceneAreaIds(scene),
        areas: scene.areas ?? areas,
        projectId,
        proposalId: activeProposalId,
        returnTo: `/designer/projects/${projectId}/proposals/${activeProposalId}`,
      },
    });
  }

  function openUpdateInfoModal() {
    if (!proposal || !isEditableProposalStatus(proposal.status)) {
      setMessage('Reopen the proposal or wait for a revision request before editing proposal information.');
      return;
    }

    setProposalEditDraft({
      description: proposal.description ?? '',
      proposalName: proposal.proposalName,
    });
    setIsUpdateInfoModalOpen(true);
  }

  function closeUpdateInfoModal() {
    if (proposal) {
      setProposalEditDraft({
        description: proposal.description ?? '',
        proposalName: proposal.proposalName,
      });
    }

    setIsUpdateInfoModalOpen(false);
  }

  async function updateProposalMetadata() {
    if (!activeProposalId || !canEditProposal) {
      return;
    }

    const proposalName = proposalEditDraft.proposalName.trim();

    setMessage('');

    if (!proposalName) {
      setMessage('Proposal name is required.');
      return;
    }

    try {
      await updateProposalMutation.mutateAsync({
        proposalId: activeProposalId,
        proposalName,
        description: proposalEditDraft.description,
      });
      setIsUpdateInfoModalOpen(false);
      setMessage('Proposal information updated.');
    } catch (error) {
      setMessage(getProposalServiceResultMessage(error));
    }
  }

  function openSceneEditModal(scene: ProposalSceneDto) {
    if (!canEditProposal) {
      setMessage('Reopen the proposal or wait for a revision request before editing scenes.');
      return;
    }

    setEditingScene(scene);
    setSceneEditDraft({
      projectAreaId: getSceneAreaIds(scene)[0] ?? '',
      sceneName: getSceneDisplayName(scene),
    });
  }

  function closeSceneEditModal() {
    setEditingScene(null);
    setSceneEditDraft(DEFAULT_SCENE_EDIT_DRAFT);
  }

  function selectProjectArea(areaId: string) {
    setSelectedAreaId(areaId);

    const firstAreaScene = scenes.find((scene) => getSceneAreaIds(scene).includes(areaId));
    if (firstAreaScene) {
      setSelectedSceneId(firstAreaScene.sceneId);
    } else {
      setSelectedSceneId('');
    }
  }

  async function updateSceneMetadata() {
    if (!editingScene || !canEditProposal) {
      return;
    }

    const sceneName = sceneEditDraft.sceneName.trim();

    setMessage('');

    if (!sceneName) {
      setMessage('Scene name is required.');
      return;
    }

    try {
      await updateProposalSceneMutation.mutateAsync({
        sceneId: editingScene.sceneId,
        sceneName,
        projectAreaIds: sceneEditDraft.projectAreaId ? [sceneEditDraft.projectAreaId] : getSceneAreaIds(editingScene),
      });
      setMessage('Scene information updated.');
      closeSceneEditModal();
    } catch (error) {
      setMessage(getProposalServiceResultMessage(error));
    }
  }

  async function reopenCurrentProposal() {
    if (!activeProposalId) {
      return;
    }

    setMessage('');

    try {
      await reopenProposalMutation.mutateAsync(activeProposalId);
      setMessage('Proposal reopened for editing. You can update scenes, items, and proposal information before publishing again.');
      void proposalQuery.refetch();
      void scenesQuery.refetch();
      void itemsQuery.refetch();
    } catch (error) {
      setMessage(getProposalServiceResultMessage(error));
    }
  }

  return (
    <DesignerShell activeLabel="Proposals">
      <button className="designer-proposal-back" type="button" onClick={() => navigate(projectId ? `/designer/assigned-projects/${projectId}` : '/designer/assigned-projects')}>
        <IconArrowLeft size={16} /> Project Detail
      </button>

      <header className="designer-proposal-heading">
        <div className="designer-proposal-heading-copy">
          <span>{projectQuery.isLoading ? 'LOADING PROJECT' : project?.projectCode ?? 'PROJECT NOT FOUND'}</span>
          <h1>{isProposalSetupMode ? 'Set Up Project Areas & Proposal' : proposalQuery.isLoading ? 'Loading proposal...' : proposal?.proposalName ?? 'Proposal not found'}</h1>
          <p>
            {project?.projectName ?? 'No project data from backend'}
            {proposal ? ` · Version ${proposal.versionNo}` : ''}
          </p>
        </div>
        <div className="designer-proposal-heading-actions">
          <span className="designer-proposal-status">{isProposalSetupMode ? 'SETUP' : proposal?.status ?? 'UNKNOWN'}</span>
          <button
            className="designer-proposal-update-button"
            disabled={isProposalSetupMode || !proposal || !canEditProposal}
            title={canEditProposal ? 'Edit proposal information.' : 'Only Draft or Revision Requested proposals can be edited.'}
            type="button"
            onClick={openUpdateInfoModal}
          >
            <IconEdit size={17} /> Update Info
          </button>
          {canReopenProposal ? (
            <button
              className="designer-proposal-update-button"
              disabled={reopenProposalMutation.isPending}
              title="Move this published proposal back to Draft so the design can be edited."
              type="button"
              onClick={() => void reopenCurrentProposal()}
            >
              <IconRefresh size={17} /> {reopenProposalMutation.isPending ? 'Reopening...' : 'Reopen for Editing'}
            </button>
          ) : null}
          <button
            className="designer-proposal-publish-button"
            disabled={!canPublishProposal || publishProposalMutation.isPending}
            title={canPublishProposal ? 'Publish this proposal for customer review.' : 'Proposal must be editable and have at least one active scene.'}
            type="button"
            onClick={() => void publishCurrentProposal()}
          >
            <IconFileText size={17} /> {publishProposalMutation.isPending ? 'Publishing...' : 'Publish Proposal'}
          </button>
        </div>
      </header>

      <nav className="designer-proposal-tabs" aria-label="Proposal workspace tabs">
        <button className={activeTab === 'scenes' ? 'is-active' : ''} type="button" onClick={() => setActiveTab('scenes')}><IconCube size={16} /> Scenes</button>
        <button className={activeTab === 'chat' ? 'is-active' : ''} type="button" onClick={() => setActiveTab('chat')}><IconMessageCircle size={16} /> Chat</button>
      </nav>

      {message && <div className="designer-proposal-message">{message}</div>}
      {projectQuery.isError && <div className="designer-proposal-message is-error">{getProjectServiceResultMessage(projectQuery.error)}</div>}
      {proposalQuery.isError && <div className="designer-proposal-message is-error">{getProposalServiceResultMessage(proposalQuery.error)}</div>}
      {areasQuery.isError && <div className="designer-proposal-message is-error">{getProjectAreaServiceResultMessage(areasQuery.error)}</div>}
      {isUpdateInfoModalOpen && proposal ? (
        <ProposalUpdateModal
          draft={proposalEditDraft}
          isSaving={updateProposalMutation.isPending}
          onClose={closeUpdateInfoModal}
          onDraftChange={setProposalEditDraft}
          onSave={() => void updateProposalMetadata()}
        />
      ) : null}
      {editingScene ? (
        <SceneUpdateModal
          areas={areas}
          draft={sceneEditDraft}
          isSaving={updateProposalSceneMutation.isPending}
          onClose={closeSceneEditModal}
          onDraftChange={setSceneEditDraft}
          onSave={() => void updateSceneMetadata()}
        />
      ) : null}

      {activeTab === 'scenes' && (
        <div className="designer-scenes-workflow">
          {isProposalSetupMode ? (
            <ProposalSetupSection
              draft={proposalDraft}
              isCreating={createProposalMutation.isPending || createSceneMutation.isPending}
              onCreateProposal={() => void createProposal()}
              onDraftChange={setProposalDraft}
            />
          ) : (
            <div className="designer-scenes-layout">
              <aside className="designer-scenes-aside">
                {proposal ? (
                  <ProposalSummarySection
                    proposal={proposal}
                    sceneCount={scenesQuery.data?.total ?? scenes.length}
                    itemCount={itemsQuery.data?.total ?? items.length}
                  />
                ) : null}
                <ProjectAreasSection
                  areas={areas}
                  isLoading={areasQuery.isLoading}
                  projectId={projectId}
                  selectedAreaId={selectedAreaId}
                  onSelectArea={selectProjectArea}
                />
              </aside>

              <div className="designer-scenes-main">
                <section className="designer-scenes-section">
                  <header>
                    <div><h2>Proposal Scenes</h2><p>One proposal maps to one Room Planner scene per area.</p></div>
                  </header>
                  <div className="designer-scenes-list">
                    {scenesQuery.isLoading ? <EmptyState message="Loading proposal scenes from backend..." /> : null}
                    {!selectedAreaId ? <EmptyState message="Select a project area first." /> : null}
                    {selectedAreaId && !scenesQuery.isLoading && selectedAreaScenes.length === 0 ? <EmptyState message="No scene has been created for the selected project area in this proposal." /> : null}
                    {selectedAreaScenes.map((scene) => (
                      <SceneRow
                        key={scene.sceneId}
                        areas={areas}
                        isSelected={scene.sceneId === selectedScene?.sceneId}
                        scene={scene}
                        onEdit={() => openSceneEditModal(scene)}
                        onOpen={() => openRoomPlanner(scene)}
                        onSelect={() => setSelectedSceneId(scene.sceneId)}
                        canEdit={canEditProposal}
                      />
                    ))}
                  </div>
                </section>

                <section className="designer-items-section designer-scene-items-section">
                  <header>
                    <div>
                      <h2>Project Items</h2>
                      <p>{selectedScene ? getSceneDisplayName(selectedScene) : 'Select a proposal scene to view synced project items.'}</p>
                    </div>
                  </header>
                  {itemsQuery.isLoading ? (
                    <EmptyState message="Loading proposal items from backend..." />
                  ) : displayItems.length ? (
                    <ItemsTable items={displayItems} total={total} />
                  ) : (
                    <EmptyState message="No proposal items returned by backend. Open a scene, add catalog products, then Save Project to sync." />
                  )}
                </section>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'chat' && (
        <section className="designer-chat-section">
          {project ? (
            <ProjectChatPanel
              canClose
              preferredChatType="DESIGNER"
              projectCode={project.projectCode}
              projectId={project.projectId}
              title="Designer Chat with Customer"
            />
          ) : (
            <EmptyState message="Project chat is unavailable until project data is loaded from backend." />
          )}
        </section>
      )}
    </DesignerShell>
  );
}

function ProposalSummarySection({
  itemCount,
  proposal,
  sceneCount,
}: {
  itemCount: number;
  proposal: ProposalDetailDto;
  sceneCount: number;
}) {
  return (
    <section className="designer-proposal-summary" aria-label="Proposal information">
      <header>
        <div>
          <IconFileText size={22} />
          <div>
            <h2>Proposal Information</h2>
            <p>{proposal.description?.trim() || 'No description provided.'}</p>
          </div>
        </div>
        <span>{formatEnumLabel(proposal.status)}</span>
      </header>
      <dl>
        <div>
          <dt>Version</dt>
          <dd>v{proposal.versionNo}</dd>
        </div>
        <div>
          <dt>Scenes</dt>
          <dd>{sceneCount}</dd>
        </div>
        <div>
          <dt>Items</dt>
          <dd>{itemCount}</dd>
        </div>
        <div>
          <dt>Published</dt>
          <dd>{proposal.publishedAt ? formatDateTime(proposal.publishedAt) : '-'}</dd>
        </div>
        <div>
          <dt>Updated</dt>
          <dd>{formatDateTime(proposal.updatedAt)}</dd>
        </div>
      </dl>
      {proposal.status === 'REVISION_REQUESTED' && proposal.revisionNote ? (
        <div className="designer-proposal-revision-note">
          <strong>Customer revision note</strong>
          <p>{proposal.revisionNote}</p>
        </div>
      ) : null}
    </section>
  );
}

function formatAreaMeasurement(value: number | null | undefined, unit: string) {
  if (typeof value !== 'number') {
    return '-';
  }

  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value)} ${unit}`;
}

function ProjectAreasSection({
  areas,
  isLoading,
  selectedAreaId,
  onSelectArea,
}: {
  areas: ProjectAreaDto[];
  isLoading: boolean;
  projectId?: string;
  selectedAreaId: string;
  onSelectArea: (areaId: string) => void;
}) {
  const selectedArea = areas.find((area) => area.projectAreaId === selectedAreaId) ?? null;

  return (
    <section className="designer-design-scope">
      <div className="designer-design-scope-heading">
        <div>
          <IconRulerMeasure size={22} />
          <div>
            <h3>Project Areas</h3>
          </div>
        </div>
        {selectedArea ? <span><IconCheck size={15} /> Selected: {selectedArea.areaName}</span> : <span>Select a project area</span>}
      </div>

      <div className="designer-area-picker">
        {isLoading ? <p>Loading project areas...</p> : null}
        {!isLoading && areas.length === 0 ? <p>No project areas exist for this project yet. Create project areas from Project Detail &gt; Project Areas before creating proposal scenes.</p> : null}
        {areas.map((area) => (
          <button
            className={selectedAreaId === area.projectAreaId ? 'is-selected' : ''}
            key={area.projectAreaId}
            aria-pressed={selectedAreaId === area.projectAreaId}
            type="button"
            onClick={() => onSelectArea(area.projectAreaId)}
          >
            <strong>{area.areaName}</strong>
            <span>{formatEnumLabel(area.areaType)}{area.areaSqm ? ` - ${area.areaSqm} m2` : ''}</span>
          </button>
        ))}
      </div>

      {selectedArea ? (
        <div className="designer-selected-area-panel">
          <header>
            <div>
              <strong>{selectedArea.areaName}</strong>
            </div>
          </header>
          <dl>
            <div>
              <dt>Floor</dt>
              <dd>{selectedArea.floorNumber ?? '-'}</dd>
            </div>
            <div>
              <dt>Area</dt>
              <dd>{formatAreaMeasurement(selectedArea.areaSqm, 'm2')}</dd>
            </div>
            <div>
              <dt>Width</dt>
              <dd>{formatAreaMeasurement(selectedArea.width, 'm')}</dd>
            </div>
            <div>
              <dt>Length</dt>
              <dd>{formatAreaMeasurement(selectedArea.length, 'm')}</dd>
            </div>
            <div>
              <dt>Height</dt>
              <dd>{formatAreaMeasurement(selectedArea.height, 'm')}</dd>
            </div>
          </dl>
          {(selectedArea.currentCondition || selectedArea.requirementNote) ? (
            <div className="designer-selected-area-notes">
              {selectedArea.currentCondition ? (
                <p><span>Condition</span>{selectedArea.currentCondition}</p>
              ) : null}
              {selectedArea.requirementNote ? (
                <p><span>Requirement</span>{selectedArea.requirementNote}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

    </section>
  );
}

function ProposalUpdateModal({
  draft,
  isSaving,
  onClose,
  onDraftChange,
  onSave,
}: {
  draft: ProposalDraft;
  isSaving: boolean;
  onClose: () => void;
  onDraftChange: (draft: ProposalDraft) => void;
  onSave: () => void;
}) {
  function updateDraft<K extends keyof ProposalDraft>(field: K, value: ProposalDraft[K]) {
    onDraftChange({ ...draft, [field]: value });
  }

  return (
    <div className="designer-proposal-modal-backdrop">
      <section className="designer-proposal-update-modal" role="dialog" aria-modal="true" aria-labelledby="proposal-update-title">
        <header>
          <div>
            <IconFileText size={22} />
            <div>
              <h2 id="proposal-update-title">Update Proposal Info</h2>
              <p>Edit the proposal name and description before publishing.</p>
            </div>
          </div>
          <button aria-label="Close update proposal info modal" className="designer-proposal-modal-close" type="button" onClick={onClose}>
            <IconX size={18} />
          </button>
        </header>
        <div className="designer-proposal-metadata-form">
          <label>
            <span>Proposal Name</span>
            <input value={draft.proposalName} onChange={(event) => updateDraft('proposalName', event.target.value)} />
          </label>
          <label>
            <span>Description</span>
            <textarea value={draft.description} onChange={(event) => updateDraft('description', event.target.value)} />
          </label>
        </div>
        <footer>
          <button className="designer-proposal-modal-secondary" disabled={isSaving} type="button" onClick={onClose}>
            Cancel
          </button>
          <button disabled={isSaving || !draft.proposalName.trim()} type="button" onClick={onSave}>
            <IconCheck size={16} /> {isSaving ? 'Saving...' : 'Save Info'}
          </button>
        </footer>
      </section>
    </div>
  );
}

function SceneUpdateModal({
  areas,
  draft,
  isSaving,
  onClose,
  onDraftChange,
  onSave,
}: {
  areas: ProjectAreaDto[];
  draft: SceneEditDraft;
  isSaving: boolean;
  onClose: () => void;
  onDraftChange: (draft: SceneEditDraft) => void;
  onSave: () => void;
}) {
  function updateDraft<K extends keyof SceneEditDraft>(field: K, value: SceneEditDraft[K]) {
    onDraftChange({ ...draft, [field]: value });
  }

  return (
    <div className="designer-proposal-modal-backdrop">
      <section className="designer-proposal-update-modal" role="dialog" aria-modal="true" aria-labelledby="scene-update-title">
        <header>
          <div>
            <IconEdit size={22} />
            <div>
              <h2 id="scene-update-title">Update Scene Info</h2>
              <p>Update the scene name and link it to a project area.</p>
            </div>
          </div>
          <button aria-label="Close update scene info modal" className="designer-proposal-modal-close" type="button" onClick={onClose}>
            <IconX size={18} />
          </button>
        </header>
        <div className="designer-proposal-metadata-form">
          <label>
            <span>Scene Name</span>
            <input value={draft.sceneName} onChange={(event) => updateDraft('sceneName', event.target.value)} />
          </label>
          <label>
            <span>Project Area</span>
            <select value={draft.projectAreaId} onChange={(event) => updateDraft('projectAreaId', event.target.value)}>
              <option value="">No area linked</option>
              {areas.map((area) => (
                <option key={area.projectAreaId} value={area.projectAreaId}>{area.areaName}</option>
              ))}
            </select>
          </label>
        </div>
        <footer>
          <button className="designer-proposal-modal-secondary" disabled={isSaving} type="button" onClick={onClose}>
            Cancel
          </button>
          <button disabled={isSaving || !draft.sceneName.trim()} type="button" onClick={onSave}>
            <IconCheck size={16} /> {isSaving ? 'Saving...' : 'Save Scene'}
          </button>
        </footer>
      </section>
    </div>
  );
}

function ProposalSetupSection({
  draft,
  isCreating,
  onCreateProposal,
  onDraftChange,
}: {
  draft: ProposalDraft;
  isCreating: boolean;
  onCreateProposal: () => void;
  onDraftChange: (draft: ProposalDraft) => void;
}) {
  function updateDraft<K extends keyof ProposalDraft>(field: K, value: ProposalDraft[K]) {
    onDraftChange({ ...draft, [field]: value });
  }

  return (
    <section className="designer-proposal-setup-section">
      <header>
        <div>
          <IconFileText size={22} />
          <div>
            <h2>Create Proposal & Scene</h2>
            <p>Creates one proposal with one Room Planner scene. Do not create extra scenes for the same proposal.</p>
          </div>
        </div>
        <span>Name and description required</span>
      </header>

      <div className="designer-proposal-setup-form">
        <label>
          <span>Proposal Name</span>
          <input
            placeholder="Enter proposal name"
            value={draft.proposalName}
            onChange={(event) => updateDraft('proposalName', event.target.value)}
          />
        </label>
        <label>
          <span>Description</span>
          <textarea
            placeholder="Enter proposal description"
            value={draft.description}
            onChange={(event) => updateDraft('description', event.target.value)}
          />
        </label>
        <button disabled={isCreating || !draft.proposalName.trim() || !draft.description.trim()} type="button" onClick={onCreateProposal}>
          <IconPlus size={17} /> {isCreating ? 'Creating proposal & scene...' : 'Create Proposal & Scene'}
        </button>
      </div>
    </section>
  );
}

function SceneRow({
  areas,
  canEdit,
  isSelected,
  scene,
  onEdit,
  onOpen,
  onSelect,
}: {
  areas: ProjectAreaDto[];
  canEdit: boolean;
  isSelected: boolean;
  scene: ProposalSceneDto;
  onEdit: () => void;
  onOpen: () => void;
  onSelect: () => void;
}) {
  const sceneAreaIds = getSceneAreaIds(scene);
  const sceneAreaNames = sceneAreaIds
    .map((areaId) => areas.find((area) => area.projectAreaId === areaId)?.areaName ?? scene.areas?.find((area) => area.projectAreaId === areaId)?.areaName ?? areaId)
    .filter(Boolean);
  const areaLabel = sceneAreaNames.length > 0 ? `Floors: ${sceneAreaNames.join(', ')}` : 'No floors linked';

  return (
    <article className={isSelected ? 'designer-scene-row is-selected' : 'designer-scene-row'}>
      <button className="designer-scene-summary-button" type="button" onClick={onSelect}>
        <span>{scene.sceneType ?? 'ROOM_PLANNER'}</span>
        <h3>{getSceneDisplayName(scene)}</h3>
        <p>{areaLabel}</p>
        <small>Version {scene.versionNo} · Updated {formatDateTime(scene.updatedAt)}</small>
      </button>
      <div className="designer-scene-actions">
        <button disabled={!canEdit} title={canEdit ? 'Edit scene metadata' : 'Only Draft or Revision Requested proposals can be edited.'} type="button" onClick={onEdit}><IconEdit size={17} /></button>
        <button type="button" onClick={onOpen}>Open Room Planner <IconChevronRight size={17} /></button>
      </div>
    </article>
  );
}

function ItemsTable({ items, total }: { items: ProposalItemDto[]; total: number }) {
  return (
    <div className="designer-items-table-wrap">
      <table>
        <thead>
          <tr><th>Product Version</th><th>Material</th><th>Color</th><th>Quantity</th><th>Unit Price</th><th>Subtotal</th></tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.proposalItemId}>
              <td><strong>{item.productNameSnapshot}</strong></td>
              <td>{item.materialSnapshot ?? '-'}</td>
              <td>{item.colorSnapshot ?? '-'}</td>
              <td>{item.quantity}</td>
              <td>{formatCurrency(item.unitPriceSnapshot)}</td>
              <td>{formatCurrency(item.subtotalAmount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr><td colSpan={5}>Estimated total</td><td>{formatCurrency(total)}</td></tr></tfoot>
      </table>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="designer-proposal-empty">{message}</div>;
}

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== 'number') {
    return '-';
  }

  return `${new Intl.NumberFormat('vi-VN').format(value)} VND`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function isEditableProposalStatus(status?: ProposalDetailDto['status'] | null) {
  return status === 'DRAFT' || status === 'REVISION_REQUESTED';
}
