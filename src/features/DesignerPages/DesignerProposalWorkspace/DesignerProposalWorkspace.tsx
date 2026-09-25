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

import { useLang } from '@/app/providers/useLang';
import { DesignerShell } from '@/features/DesignerPages/components/DesignerShell';
import { designerCopy } from '@/features/DesignerPages/designercomponents';
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

function getSceneDisplayName(scene: ProposalSceneDto, untitledFallback: string) {
  return getDisplayText(scene.sceneName, untitledFallback);
}

function getAreaDisplayName(areaName: string | null | undefined, unnamedFallback: string) {
  return getDisplayText(areaName, unnamedFallback);
}

function getDisplayText(value: string | null | undefined, fallback: string) {
  const normalizedValue = value?.trim();

  if (!normalizedValue || isTechnicalId(normalizedValue)) {
    return fallback;
  }

  return normalizedValue;
}

function isTechnicalId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    || /^[0-9a-f]{24}$/i.test(value);
}

export function DesignerProposalWorkspace() {
  const { lang } = useLang();
  const w = designerCopy[lang].proposalWorkspace;
  const tc = designerCopy[lang].common;
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
  const areas = useMemo(() => getAreasByFloor(areasQuery.data ?? []), [areasQuery.data]);
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
  const canReopenProposal = canReopenProposalForEditing(proposal?.status, project?.status);
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
      setMessage(w.errPublish);
      return;
    }

    try {
      await publishProposalMutation.mutateAsync({
        proposalId: activeProposalId,
        note: 'Published by designer from proposal workspace.',
      });
      setMessage(w.publishSuccess);
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
      setMessage(w.errNameRequired);
      return;
    }

    if (!description) {
      setMessage(w.errDescRequired);
      return;
    }

    if (projectAreaIds.length === 0) {
      setMessage(w.errNeedAreas);
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
      setMessage(`Created ${getDisplayText(createdProposal.proposalName, 'proposal')} with one room planner scene.`);
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
    const sceneAreaIds = getSceneAreaIds(scene);
    const fullSceneAreas = sceneAreaIds.length > 0
      ? sceneAreaIds
          .map((areaId) => areas.find((area) => area.projectAreaId === areaId))
          .filter((area): area is ProjectAreaDto => Boolean(area))
      : areas;

    navigate(`/proposal-scenes/${scene.sceneId}/room-planner`, {
      state: {
        mode: 'create-proposal',
        projectAreaIds: sceneAreaIds,
        areas: fullSceneAreas,
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
      setMessage(w.errNameRequired);
      return;
    }

    try {
      await updateProposalMutation.mutateAsync({
        proposalId: activeProposalId,
        proposalName,
        description: proposalEditDraft.description,
      });
      setIsUpdateInfoModalOpen(false);
      setMessage(w.proposalUpdated);
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
      sceneName: getSceneDisplayName(scene, w.untitledScene),
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
      setMessage(w.errNameRequired);
      return;
    }

    try {
      await updateProposalSceneMutation.mutateAsync({
        sceneId: editingScene.sceneId,
        sceneName,
        projectAreaIds: sceneEditDraft.projectAreaId ? [sceneEditDraft.projectAreaId] : getSceneAreaIds(editingScene),
      });
      setMessage(w.sceneUpdated);
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

    const confirmed = window.confirm(w.confirmReopen);

    if (!confirmed) {
      return;
    }

    try {
      await reopenProposalMutation.mutateAsync(activeProposalId);
      setMessage(w.reopened);
      void projectQuery.refetch();
      void proposalQuery.refetch();
      void scenesQuery.refetch();
      void itemsQuery.refetch();
    } catch (error) {
      setMessage(getProposalServiceResultMessage(error));
    }
  }

  return (
    <DesignerShell activeKey="assignedProjects">
      <button className="designer-proposal-back" type="button" onClick={() => navigate(projectId ? `/designer/assigned-projects/${projectId}` : '/designer/assigned-projects')}>
        <IconArrowLeft size={16} /> {w.backProjectDetail}
      </button>

      <header className="designer-proposal-heading">
        <div className="designer-proposal-heading-copy">
          <span>{projectQuery.isLoading ? w.loadingProject : project?.projectCode ?? w.projectNotFound}</span>
          <h1>{isProposalSetupMode ? w.setupTitle : proposalQuery.isLoading ? w.loadingProposal : getDisplayText(proposal?.proposalName, w.proposalNotFound)}</h1>
          <p>
            {project?.projectName ?? w.noProjectData}
            {proposal ? ` · ${w.version(proposal.versionNo)}` : ''}
          </p>
        </div>
        <div className="designer-proposal-heading-actions">
          <span className="designer-proposal-status">{isProposalSetupMode ? w.setup : proposal?.status ?? 'UNKNOWN'}</span>
          <button
            className="designer-proposal-update-button"
            disabled={isProposalSetupMode || !proposal || !canEditProposal}
            title={canEditProposal ? 'Edit proposal information.' : 'Only Draft or Revision Requested proposals can be edited.'}
            type="button"
            onClick={openUpdateInfoModal}
          >
            <IconEdit size={17} /> {w.updateInfo}
          </button>
          {canReopenProposal ? (
            <button
              className="designer-proposal-update-button"
              disabled={reopenProposalMutation.isPending}
              title="Move this published proposal back to Draft so the design can be edited."
              type="button"
              onClick={() => void reopenCurrentProposal()}
            >
              <IconRefresh size={17} /> {reopenProposalMutation.isPending ? w.reopening : w.reopen}
            </button>
          ) : null}
          <button
            className="designer-proposal-publish-button"
            disabled={!canPublishProposal || publishProposalMutation.isPending}
            title={canPublishProposal ? 'Publish this proposal for customer review.' : 'Proposal must be editable and have at least one active scene.'}
            type="button"
            onClick={() => void publishCurrentProposal()}
          >
            <IconFileText size={17} /> {publishProposalMutation.isPending ? w.publishing : w.publishProposal}
          </button>
        </div>
      </header>

      <nav className="designer-proposal-tabs" aria-label="Proposal workspace tabs">
        <button className={activeTab === 'scenes' ? 'is-active' : ''} type="button" onClick={() => setActiveTab('scenes')}><IconCube size={16} /> {w.scenes}</button>
        <button className={activeTab === 'chat' ? 'is-active' : ''} type="button" onClick={() => setActiveTab('chat')}><IconMessageCircle size={16} /> {w.chat}</button>
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
          w={w}
          tc={tc}
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
          w={w}
          tc={tc}
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
              w={w}
            />
          ) : (
            <div className="designer-scenes-layout">
              <aside className="designer-scenes-aside">
                {proposal ? (
                  <ProposalSummarySection
                    proposal={proposal}
                    sceneCount={scenesQuery.data?.total ?? scenes.length}
                    itemCount={itemsQuery.data?.total ?? items.length}
                    w={w}
                  />
                ) : null}
                <ProjectAreasSection
                  areas={areas}
                  isLoading={areasQuery.isLoading}
                  projectId={projectId}
                  selectedAreaId={selectedAreaId}
                  onSelectArea={selectProjectArea}
                  w={w}
                />
              </aside>

              <div className="designer-scenes-main">
                <section className="designer-scenes-section">
                  <header>
                    <div><h2>{w.proposalScenes}</h2><p>{w.proposalScenesHint}</p></div>
                  </header>
                  <div className="designer-scenes-list">
                    {scenesQuery.isLoading ? <EmptyState message={w.loadingScenes} /> : null}
                    {!selectedAreaId ? <EmptyState message={w.selectAreaFirst} /> : null}
                    {selectedAreaId && !scenesQuery.isLoading && selectedAreaScenes.length === 0 ? <EmptyState message={w.noSceneForArea} /> : null}
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
                        w={w}
                      />
                    ))}
                  </div>
                </section>

                <section className="designer-items-section designer-scene-items-section">
                  <header>
                    <div>
                      <h2>{w.projectItems}</h2>
                      <p>{selectedScene ? getSceneDisplayName(selectedScene, w.untitledScene) : w.selectAreaFirst}</p>
                    </div>
                  </header>
                  {itemsQuery.isLoading ? (
                    <EmptyState message={w.loadingItems} />
                  ) : displayItems.length ? (
                    <ItemsTable items={displayItems} total={total} w={w} />
                  ) : (
                    <EmptyState message={w.noItems} />
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
              preferredChatType="DESIGNER"
              projectCode={project.projectCode}
              projectId={project.projectId}
              title={w.designerChat}
              viewerRole="DESIGNER"
            />
          ) : (
            <EmptyState message={w.chatUnavailable} />
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
  w,
}: {
  itemCount: number;
  proposal: ProposalDetailDto;
  sceneCount: number;
  w: typeof designerCopy.en.proposalWorkspace;
}) {
  const { lang } = useLang();
  const pt = designerCopy[lang].proposalsTab;
  return (
    <section className="designer-proposal-summary" aria-label={w.proposalInfo}>
      <header>
        <div>
          <IconFileText size={22} />
          <div>
            <h2>{w.proposalInfo}</h2>
            <p>{proposal.description?.trim() || w.noDescription}</p>
          </div>
        </div>
        <span>{formatEnumLabel(proposal.status)}</span>
      </header>
      <dl>
        <div>
          <dt>{pt.cols.version}</dt>
          <dd>{w.version(proposal.versionNo)}</dd>
        </div>
        <div>
          <dt>{w.scenes}</dt>
          <dd>{sceneCount}</dd>
        </div>
        <div>
          <dt>{w.projectItems}</dt>
          <dd>{itemCount}</dd>
        </div>
        <div>
          <dt>{w.publish}</dt>
          <dd>{proposal.publishedAt ? formatDateTime(proposal.publishedAt) : '-'}</dd>
        </div>
        <div>
          <dt>{w.updateInfo}</dt>
          <dd>{formatDateTime(proposal.updatedAt)}</dd>
        </div>
      </dl>
      {proposal.status === 'REVISION_REQUESTED' && proposal.revisionNote ? (
        <div className="designer-proposal-revision-note">
          <strong>{w.customerRevisionNote}</strong>
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
  w,
}: {
  areas: ProjectAreaDto[];
  isLoading: boolean;
  projectId?: string;
  selectedAreaId: string;
  onSelectArea: (areaId: string) => void;
  w: typeof designerCopy.en.proposalWorkspace;
}) {
  const { lang } = useLang();
  const tc = designerCopy[lang].common;
  const selectedArea = areas.find((area) => area.projectAreaId === selectedAreaId) ?? null;

  return (
    <section className="designer-design-scope">
      <div className="designer-design-scope-heading">
        <div>
          <IconRulerMeasure size={22} />
          <div>
            <h3>{w.projectAreas}</h3>
          </div>
        </div>
        {selectedArea ? <span><IconCheck size={15} /> {w.selected(selectedArea.areaName)}</span> : <span>{w.selectArea}</span>}
      </div>

      <div className="designer-area-picker">
        {isLoading ? <p>{tc.loading}</p> : null}
        {!isLoading && areas.length === 0 ? <p>{w.noFloors}</p> : null}
        {areas.map((area) => (
          <button
            className={selectedAreaId === area.projectAreaId ? 'is-selected' : ''}
            key={area.projectAreaId}
            aria-pressed={selectedAreaId === area.projectAreaId}
            type="button"
            onClick={() => onSelectArea(area.projectAreaId)}
          >
              <strong>{getAreaDisplayName(area.areaName, w.unnamedArea)}</strong>
            <span>{formatEnumLabel(area.areaType)}{area.areaSqm ? ` - ${area.areaSqm} m2` : ''}</span>
          </button>
        ))}
      </div>

      {selectedArea ? (
        <div className="designer-selected-area-panel">
          <header>
            <div>
              <strong>{getAreaDisplayName(selectedArea.areaName, w.unnamedArea)}</strong>
            </div>
          </header>
          <dl>
            <div>
              <dt>{w.floor}</dt>
              <dd>{selectedArea.floorNumber ?? '-'}</dd>
            </div>
            <div>
              <dt>{w.area}</dt>
              <dd>{formatAreaMeasurement(selectedArea.areaSqm, 'm2')}</dd>
            </div>
            <div>
              <dt>{w.width}</dt>
              <dd>{formatAreaMeasurement(selectedArea.width, 'm')}</dd>
            </div>
            <div>
              <dt>{w.length}</dt>
              <dd>{formatAreaMeasurement(selectedArea.length, 'm')}</dd>
            </div>
            <div>
              <dt>{w.height}</dt>
              <dd>{formatAreaMeasurement(selectedArea.height, 'm')}</dd>
            </div>
          </dl>
          {(selectedArea.currentCondition || selectedArea.requirementNote) ? (
            <div className="designer-selected-area-notes">
              {selectedArea.currentCondition ? (
                <p><span>{w.condition}</span>{selectedArea.currentCondition}</p>
              ) : null}
              {selectedArea.requirementNote ? (
                <p><span>{w.requirement}</span>{selectedArea.requirementNote}</p>
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
  w,
  tc,
}: {
  draft: ProposalDraft;
  isSaving: boolean;
  onClose: () => void;
  onDraftChange: (draft: ProposalDraft) => void;
  onSave: () => void;
  w: typeof designerCopy.en.proposalWorkspace;
  tc: typeof designerCopy.en.common;
}) {
  const { lang } = useLang();
  const pt = designerCopy[lang].proposalsTab;
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
              <h2 id="proposal-update-title">{w.updateProposalModalTitle}</h2>
              <p>{w.updateProposalModalDesc}</p>
            </div>
          </div>
          <button aria-label="Close update proposal info modal" className="designer-proposal-modal-close" type="button" onClick={onClose}>
            <IconX size={18} />
          </button>
        </header>
        <div className="designer-proposal-metadata-form">
          <label>
            <span>{w.proposalName}</span>
            <input value={draft.proposalName} onChange={(event) => updateDraft('proposalName', event.target.value)} />
          </label>
          <label>
            <span>{pt.description}</span>
            <textarea value={draft.description} onChange={(event) => updateDraft('description', event.target.value)} />
          </label>
        </div>
        <footer>
          <button className="designer-proposal-modal-secondary" disabled={isSaving} type="button" onClick={onClose}>
            {tc.cancel}
          </button>
          <button disabled={isSaving || !draft.proposalName.trim()} type="button" onClick={onSave}>
            <IconCheck size={16} /> {isSaving ? tc.saving : w.saveInfo}
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
  w,
  tc,
}: {
  areas: ProjectAreaDto[];
  draft: SceneEditDraft;
  isSaving: boolean;
  onClose: () => void;
  onDraftChange: (draft: SceneEditDraft) => void;
  onSave: () => void;
  w: typeof designerCopy.en.proposalWorkspace;
  tc: typeof designerCopy.en.common;
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
              <h2 id="scene-update-title">{w.updateSceneModalTitle}</h2>
              <p>{w.updateSceneModalDesc}</p>
            </div>
          </div>
          <button aria-label="Close update scene info modal" className="designer-proposal-modal-close" type="button" onClick={onClose}>
            <IconX size={18} />
          </button>
        </header>
        <div className="designer-proposal-metadata-form">
          <label>
            <span>{w.sceneName}</span>
            <input value={draft.sceneName} onChange={(event) => updateDraft('sceneName', event.target.value)} />
          </label>
          <label>
            <span>{w.projectAreas}</span>
            <select value={draft.projectAreaId} onChange={(event) => updateDraft('projectAreaId', event.target.value)}>
              <option value="">{w.noAreaLinked}</option>
              {areas.map((area) => (
                <option key={area.projectAreaId} value={area.projectAreaId}>{getAreaDisplayName(area.areaName, w.unnamedArea)}</option>
              ))}
            </select>
          </label>
        </div>
        <footer>
          <button className="designer-proposal-modal-secondary" disabled={isSaving} type="button" onClick={onClose}>
            {tc.cancel}
          </button>
          <button disabled={isSaving || !draft.sceneName.trim()} type="button" onClick={onSave}>
            <IconCheck size={16} /> {isSaving ? tc.saving : w.saveScene}
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
  w,
}: {
  draft: ProposalDraft;
  isCreating: boolean;
  onCreateProposal: () => void;
  onDraftChange: (draft: ProposalDraft) => void;
  w: typeof designerCopy.en.proposalWorkspace;
}) {
  const { lang } = useLang();
  const pt = designerCopy[lang].proposalsTab;
  function updateDraft<K extends keyof ProposalDraft>(field: K, value: ProposalDraft[K]) {
    onDraftChange({ ...draft, [field]: value });
  }

  return (
    <section className="designer-proposal-setup-section">
      <header>
        <div>
          <IconFileText size={22} />
          <div>
            <h2>{w.createProposalScene}</h2>
            <p>{w.proposalScenesHint}</p>
          </div>
        </div>
        <span>Name and description required</span>
      </header>

      <div className="designer-proposal-setup-form">
        <label>
          <span>{w.proposalName}</span>
          <input
            placeholder={pt.namePh}
            value={draft.proposalName}
            onChange={(event) => updateDraft('proposalName', event.target.value)}
          />
        </label>
        <label>
          <span>{pt.description}</span>
          <textarea
            placeholder={pt.descPh}
            value={draft.description}
            onChange={(event) => updateDraft('description', event.target.value)}
          />
        </label>
        <button disabled={isCreating || !draft.proposalName.trim() || !draft.description.trim()} type="button" onClick={onCreateProposal}>
          <IconPlus size={17} /> {isCreating ? pt.creating : w.createProposalScene}
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
  w,
}: {
  areas: ProjectAreaDto[];
  canEdit: boolean;
  isSelected: boolean;
  scene: ProposalSceneDto;
  onEdit: () => void;
  onOpen: () => void;
  onSelect: () => void;
  w: typeof designerCopy.en.proposalWorkspace;
}) {
  const sceneAreaIds = getSceneAreaIds(scene);
  const sceneAreaNames = sceneAreaIds
    .map((areaId) => getAreaDisplayName(areas.find((area) => area.projectAreaId === areaId)?.areaName ?? scene.areas?.find((area) => area.projectAreaId === areaId)?.areaName, w.unnamedArea))
    .filter(Boolean);
  const areaLabel = sceneAreaNames.length > 0 ? `${w.floors}: ${sceneAreaNames.join(', ')}` : w.noFloors;

  return (
    <article className={isSelected ? 'designer-scene-row is-selected' : 'designer-scene-row'}>
      <button className="designer-scene-summary-button" type="button" onClick={onSelect}>
        <span>{scene.sceneType ?? 'ROOM_PLANNER'}</span>
        <h3>{getSceneDisplayName(scene, w.untitledScene)}</h3>
        <p>{areaLabel}</p>
        <small>Version {scene.versionNo} · Updated {formatDateTime(scene.updatedAt)}</small>
      </button>
      <div className="designer-scene-actions">
        <button disabled={!canEdit} title={canEdit ? 'Edit scene metadata' : 'Only Draft or Revision Requested proposals can be edited.'} type="button" onClick={onEdit}><IconEdit size={17} /></button>
        <button type="button" onClick={onOpen}>{w.openRoomPlanner} <IconChevronRight size={17} /></button>
      </div>
    </article>
  );
}

function ItemsTable({ items, total, w }: { items: ProposalItemDto[]; total: number; w: typeof designerCopy.en.proposalWorkspace }) {
  return (
    <div className="designer-items-table-wrap">
      <table>
        <thead>
          <tr><th>{w.productVersion}</th><th>{w.material}</th><th>{w.color}</th><th>{w.quantity}</th><th>{w.unitPrice}</th><th>{w.subtotal}</th></tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.proposalItemId}>
              <td><strong>{getDisplayText(item.productNameSnapshot, w.proposalItem)}</strong></td>
              <td>{item.materialSnapshot ?? '-'}</td>
              <td>{item.colorSnapshot ?? '-'}</td>
              <td>{item.quantity}</td>
              <td>{formatCurrency(item.unitPriceSnapshot)}</td>
              <td>{formatCurrency(item.subtotalAmount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr><td colSpan={5}>{w.estimatedTotal}</td><td>{formatCurrency(total)}</td></tr></tfoot>
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

function getAreasByFloor<T extends { areaName: string; floorNumber: number | null }>(areas: T[]) {
  return [...areas].sort((first, second) => {
    const floorDifference = getSortableFloor(first.floorNumber) - getSortableFloor(second.floorNumber);

    if (floorDifference !== 0) return floorDifference;

    return first.areaName.localeCompare(second.areaName);
  });
}

function getSortableFloor(floorNumber: number | null) {
  return typeof floorNumber === 'number' ? floorNumber : Number.MAX_SAFE_INTEGER;
}

function isEditableProposalStatus(status?: ProposalDetailDto['status'] | null) {
  return status === 'DRAFT' || status === 'REVISION_REQUESTED';
}

function canReopenProposalForEditing(
  proposalStatus?: ProposalDetailDto['status'] | null,
  projectStatus?: string | null,
) {
  return proposalStatus === 'PUBLISHED' && projectStatus === 'PROPOSAL_CONSULTING';
}
