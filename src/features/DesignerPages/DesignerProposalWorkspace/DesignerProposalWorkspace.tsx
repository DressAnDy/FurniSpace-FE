import { useEffect, useMemo, useState } from 'react';
import {
  IconArrowLeft,
  IconCheck,
  IconChevronRight,
  IconCube,
  IconEdit,
  IconFileText,
  IconMessageCircle,
  IconPackage,
  IconPlus,
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
  useUpdateProposal,
  useUpdateProposalScene,
} from '@/services/queries';
import { aggregateDuplicateItems } from '@/shared/utils/itemAggregation';

import './DesignerProposalWorkspace.css';

type WorkspaceTab = 'scenes' | 'items' | 'review' | 'chat';
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

export function DesignerProposalWorkspace() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId, proposalId } = useParams();
  const isProposalSetupMode = !proposalId || proposalId === 'new';
  const activeProposalId = isProposalSetupMode ? undefined : proposalId;
  const routeState = location.state as { selectedAreaId?: string } | null;
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
  });
  const createProposalMutation = useCreateProposal();
  const createSceneMutation = useCreateProposalScene();
  const publishProposalMutation = usePublishProposal();
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
    () => itemsQuery.data?.items ?? proposal?.items ?? [],
    [itemsQuery.data?.items, proposal?.items],
  );
  const displayItems = useMemo(() => aggregateDuplicateItems(items), [items]);
  const total = useMemo(
    () => displayItems.reduce((sum, item) => sum + (item.subtotalAmount ?? 0), 0),
    [displayItems],
  );
  const primaryScene = scenes.find((scene) => scene.sceneType === 'THREE_D') ?? scenes[0] ?? null;
  const selectedScene = scenes.find((scene) => scene.sceneId === selectedSceneId) ?? primaryScene;
  const selectedArea = areas.find((area) => area.projectAreaId === selectedAreaId) ?? null;
  const selectedAreaScenes = useMemo(
    () => (selectedAreaId ? scenes.filter((scene) => scene.projectAreaId === selectedAreaId) : []),
    [scenes, selectedAreaId],
  );
  const canPublishProposal = Boolean(activeProposalId && proposal?.status === 'DRAFT' && scenes.length > 0);
  const publishChecklist = useMemo(
    () => [
      { label: 'Proposal is Draft', ready: proposal?.status === 'DRAFT' },
      { label: 'At least one active scene exists', ready: scenes.length > 0 },
      { label: 'Room Planner scene is saved', ready: scenes.some((scene) => Boolean(scene.mongoSceneId)) },
      { label: 'Proposal items are synced if required', ready: items.length > 0 },
    ],
    [items.length, proposal?.status, scenes],
  );

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

    setSelectedSceneId(scenes[0].sceneId);
  }, [scenes, selectedSceneId]);

  useEffect(() => {
    if (selectedAreaId || isProposalSetupMode || areas.length === 0) {
      return;
    }

    const areaWithScene = areas.find((area) => scenes.some((scene) => scene.projectAreaId === area.projectAreaId));
    setSelectedAreaId((areaWithScene ?? areas[0]).projectAreaId);
  }, [areas, isProposalSetupMode, scenes, selectedAreaId]);

  async function publishCurrentProposal() {
    if (!activeProposalId) {
      return;
    }

    setMessage('');

    if (!canPublishProposal) {
      setMessage('Proposal must be Draft and have at least one active scene before publishing.');
      setActiveTab('review');
      return;
    }

    try {
      await publishProposalMutation.mutateAsync({
        proposalId: activeProposalId,
        note: 'Published by designer from proposal workspace.',
      });
      setActiveTab('review');
      setMessage('Proposal published successfully. It is now ready for customer review.');
    } catch (error) {
      setMessage(getProposalServiceResultMessage(error));
    }
  }

  async function createScene() {
    if (!activeProposalId || !project) {
      return;
    }

    setMessage('');

    if (!selectedAreaId) {
      setMessage('Select or create a project area before creating a 3D proposal scene.');
      return;
    }

    try {
      const scene = await createSceneMutation.mutateAsync({
        proposalId: activeProposalId,
        sceneName: `${selectedArea?.areaName ?? project.projectName} 3D Scene`,
        sceneType: 'THREE_D',
        projectAreaId: selectedAreaId,
      });

      openRoomPlanner(scene);
    } catch (error) {
      setMessage(getProposalServiceResultMessage(error));
    }
  }

  async function createProposal() {
    if (!projectId) {
      return;
    }

    const proposalName = proposalDraft.proposalName.trim();

    setMessage('');

    if (!selectedAreaId) {
      setMessage('Create or select a project area before creating a proposal.');
      return;
    }

    if (!proposalName) {
      setMessage('Proposal name is required. Leave the default blank and enter the sale/designer naming before creating it.');
      return;
    }

    try {
      const createdProposal = await createProposalMutation.mutateAsync({
        projectId,
        proposalName,
        description: proposalDraft.description,
      });

      setProposalDraft(DEFAULT_PROPOSAL_DRAFT);
      setMessage('Proposal created. You can create a proposal scene for the selected project area now.');
      navigate(`/designer/projects/${projectId}/proposals/${createdProposal.proposalId}`, {
        state: { selectedAreaId },
      });
    } catch (error) {
      setMessage(getProposalServiceResultMessage(error));
    }
  }

  function openRoomPlanner(scene: ProposalSceneDto) {
    navigate(`/proposal-scenes/${scene.sceneId}/room-planner`, {
      state: {
        mode: 'create-proposal',
        projectAreaId: scene.projectAreaId,
        projectId,
        proposalId: activeProposalId,
        returnTo: `/designer/projects/${projectId}/proposals/${activeProposalId}`,
      },
    });
  }

  function openUpdateInfoModal() {
    if (!proposal) {
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
    if (!activeProposalId) {
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
    setEditingScene(scene);
    setSceneEditDraft({
      projectAreaId: scene.projectAreaId ?? '',
      sceneName: scene.sceneName,
    });
  }

  function closeSceneEditModal() {
    setEditingScene(null);
    setSceneEditDraft(DEFAULT_SCENE_EDIT_DRAFT);
  }

  async function updateSceneMetadata() {
    if (!editingScene) {
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
        projectAreaId: sceneEditDraft.projectAreaId || null,
      });
      setMessage('Scene information updated.');
      closeSceneEditModal();
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
        <div>
          <span>{projectQuery.isLoading ? 'LOADING PROJECT' : project?.projectCode ?? 'PROJECT NOT FOUND'}</span>
          <h1>{isProposalSetupMode ? 'Set Up Project Areas & Proposal' : proposalQuery.isLoading ? 'Loading proposal...' : proposal?.proposalName ?? 'Proposal not found'}</h1>
          <p>
            {project?.projectName ?? 'No project data from backend'}
            {proposal ? ` · Version ${proposal.versionNo}` : ''}
          </p>
        </div>
        <div>
          <span className="designer-proposal-status">{isProposalSetupMode ? 'SETUP' : proposal?.status ?? 'UNKNOWN'}</span>
          <button
            disabled={isProposalSetupMode || !proposal}
            type="button"
            onClick={openUpdateInfoModal}
          >
            <IconEdit size={17} /> Update Info
          </button>
          <button
            disabled={!canPublishProposal || publishProposalMutation.isPending}
            title={canPublishProposal ? 'Publish this proposal for customer review.' : 'Proposal must be Draft and have at least one active scene.'}
            type="button"
            onClick={() => void publishCurrentProposal()}
          >
            <IconFileText size={17} /> {publishProposalMutation.isPending ? 'Publishing...' : 'Publish Proposal'}
          </button>
        </div>
      </header>

      <nav className="designer-proposal-tabs" aria-label="Proposal workspace tabs">
        <button className={activeTab === 'scenes' ? 'is-active' : ''} type="button" onClick={() => setActiveTab('scenes')}><IconCube size={16} /> Scenes</button>
        <button className={activeTab === 'items' ? 'is-active' : ''} disabled={isProposalSetupMode} type="button" onClick={() => setActiveTab('items')}><IconPackage size={16} /> Proposal Items</button>
        <button className={activeTab === 'review' ? 'is-active' : ''} disabled={isProposalSetupMode} type="button" onClick={() => setActiveTab('review')}><IconFileText size={16} /> Review & Publish</button>
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

      {!isProposalSetupMode && proposal ? (
        <ProposalSummarySection
          proposal={proposal}
          sceneCount={scenesQuery.data?.total ?? scenes.length}
          itemCount={itemsQuery.data?.total ?? items.length}
        />
      ) : null}

      {activeTab === 'scenes' && (
        <div className="designer-scenes-workflow">
          <ProjectAreasSection
            areas={areas}
            isLoading={areasQuery.isLoading}
            projectId={projectId}
            selectedAreaId={selectedAreaId}
            onSelectArea={setSelectedAreaId}
          />

          {isProposalSetupMode ? (
            <ProposalSetupSection
              draft={proposalDraft}
              isCreating={createProposalMutation.isPending}
              selectedArea={selectedArea}
              onCreateProposal={() => void createProposal()}
              onDraftChange={setProposalDraft}
            />
          ) : (
          <section className="designer-scenes-section">
            <header>
              <div><h2>Proposal Scenes</h2></div>
              <button disabled={!activeProposalId || proposal?.status !== 'DRAFT' || !selectedAreaId || createSceneMutation.isPending} type="button" onClick={() => void createScene()}>
                <IconPlus size={17} /> {createSceneMutation.isPending ? 'Creating...' : selectedArea ? `Create Scene for ${selectedArea.areaName}` : 'Create Scene'}
              </button>
            </header>
            <div className="designer-scenes-list">
              {scenesQuery.isLoading ? <EmptyState message="Loading proposal scenes from backend..." /> : null}
              {!selectedAreaId ? <EmptyState message="Select a project area first." /> : null}
              {selectedAreaId && !scenesQuery.isLoading && selectedAreaScenes.length === 0 ? <EmptyState message="No scene has been created for the selected project area in this proposal." /> : null}
              {selectedAreaScenes.map((scene) => (
                <SceneRow key={scene.sceneId} area={selectedArea} scene={scene} onEdit={() => openSceneEditModal(scene)} onOpen={() => openRoomPlanner(scene)} />
              ))}
            </div>
          </section>
          )}
        </div>
      )}

      {activeTab === 'items' && (
        <section className="designer-items-section">
          <header>
            <div><h2>Proposal Items</h2><p>SQL business items synchronized from Room Planner scene objects.</p></div>
            <button disabled type="button"><IconCube size={17} /> Sync From Scene</button>
          </header>
          <div className="designer-items-scene-filter">
            {scenes.length === 0 ? <span>No scenes available.</span> : null}
            {scenes.map((scene) => (
              <button
                className={scene.sceneId === selectedScene?.sceneId ? 'is-active' : ''}
                key={scene.sceneId}
                type="button"
                onClick={() => setSelectedSceneId(scene.sceneId)}
              >
                {scene.sceneName}
              </button>
            ))}
          </div>
          {itemsQuery.isLoading ? (
            <EmptyState message="Loading proposal items from backend..." />
          ) : displayItems.length ? (
            <ItemsTable items={displayItems} total={total} />
          ) : (
            <EmptyState message="No proposal items returned by backend. Open a scene, add catalog products, then Save Project to sync." />
          )}
        </section>
      )}

      {activeTab === 'review' && (
        <section className="designer-review-section">
          <header>
            <div><IconFileText size={24} /><div><h2>Review & Publish</h2><p>Check proposal readiness before publishing it for customer review.</p></div></div>
            <span>{proposal?.status ?? 'UNKNOWN'}</span>
          </header>
          <div className="designer-publish-checklist">
            {publishChecklist.map((item) => (
              <span className={item.ready ? 'is-ready' : ''} key={item.label}>
                <IconCheck size={15} /> {item.label}
              </span>
            ))}
          </div>
          <div className="designer-publish-actions">
            <div>
              <strong>{canPublishProposal ? 'Ready for backend publish' : 'Publish is not available yet'}</strong>
              <span>{canPublishProposal ? 'Backend will update proposal/project status after publish.' : 'Create at least one active scene while this proposal is still Draft.'}</span>
            </div>
            <button
              disabled={!canPublishProposal || publishProposalMutation.isPending}
              type="button"
              onClick={() => void publishCurrentProposal()}
            >
              <IconFileText size={17} /> {publishProposalMutation.isPending ? 'Publishing...' : 'Publish Proposal'}
            </button>
          </div>
          <div className="designer-review-empty">
            {primaryScene ? (
              <>
                <strong>{primaryScene.sceneName}</strong>
                <span>Open the Room Planner to preview the saved 3D scene from MongoDB.</span>
                <button type="button" onClick={() => openRoomPlanner(primaryScene)}>Open Room Planner <IconChevronRight size={17} /></button>
              </>
            ) : (
              <span>No backend scene is available for review.</span>
            )}
          </div>
        </section>
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
    </section>
  );
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
            type="button"
            onClick={() => onSelectArea(area.projectAreaId)}
          >
            <strong>{area.areaName}</strong>
            <span>{formatEnumLabel(area.areaType)}{area.areaSqm ? ` - ${area.areaSqm} m2` : ''}</span>
          </button>
        ))}
      </div>

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
  selectedArea,
  onCreateProposal,
  onDraftChange,
}: {
  draft: ProposalDraft;
  isCreating: boolean;
  selectedArea: ProjectAreaDto | null;
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
            <h2>Create Proposal</h2>
            <p>Name and description are intentionally blank. Fill them before creating the proposal workspace.</p>
          </div>
        </div>
        <span>{selectedArea ? `Area selected: ${selectedArea.areaName}` : 'Select a project area first'}</span>
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
        <button disabled={isCreating || !selectedArea || !draft.proposalName.trim()} type="button" onClick={onCreateProposal}>
          <IconPlus size={17} /> {isCreating ? 'Creating proposal...' : 'Create Proposal'}
        </button>
      </div>
    </section>
  );
}

function SceneRow({ area, scene, onEdit, onOpen }: { area: ProjectAreaDto | null; scene: ProposalSceneDto; onEdit: () => void; onOpen: () => void }) {
  return (
    <article className="designer-scene-row">
      <div>
        <span>{scene.sceneType}</span>
        <h3>{scene.sceneName}</h3>
        <p>{area ? `Area: ${area.areaName}` : scene.projectAreaId ? `Area ID: ${scene.projectAreaId}` : 'No project area linked'}</p>
        <p>{scene.mongoSceneId ? `Mongo scene ${scene.mongoSceneId}` : 'No Mongo scene saved yet'}</p>
        <small>Version {scene.versionNo} · Updated {formatDateTime(scene.updatedAt)}</small>
      </div>
      <div className="designer-scene-actions">
        <button title="Edit scene metadata" type="button" onClick={onEdit}><IconEdit size={17} /></button>
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
              <td><strong>{item.productNameSnapshot}</strong><small>{item.productVersionId}</small></td>
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
