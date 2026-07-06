import { useMemo, useState } from 'react';
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
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';

import scenePreview from '@/assets/product-detail-shop/table-room.png';
import { DesignerShell } from '@/features/DesignerPages/components/DesignerShell';
import { ProjectChatPanel } from '@/features/projectChat/ProjectChatPanel';
import { getProjectAreaServiceResultMessage, type ProjectAreaDto, type ProjectAreaType } from '@/services/api/projectAreas';
import { getProjectServiceResultMessage } from '@/services/api/projects';
import { getProposalServiceResultMessage, type ProposalItemDto, type ProposalSceneDto } from '@/services/api/proposals';
import {
  useCreateProjectArea,
  useCreateProposalScene,
  useProjectDetail,
  useProjectAreas,
  useProposalDetail,
  useProposalItems,
  useProposalScenes,
  usePublishProposal,
} from '@/services/queries';

import './DesignerProposalWorkspace.css';

type WorkspaceTab = 'scenes' | 'items' | 'review' | 'chat';
type AreaDraft = {
  areaName: string;
  areaType: ProjectAreaType;
  areaSqm: string;
  floorNumber: string;
  height: string;
  length: string;
  requirementNote: string;
  width: string;
};

const DEFAULT_AREA_DRAFT: AreaDraft = {
  areaName: '',
  areaType: 'ROOM',
  areaSqm: '',
  floorNumber: '',
  height: '',
  length: '',
  requirementNote: '',
  width: '',
};

const AREA_TYPES: ProjectAreaType[] = ['STORE', 'FLOOR', 'ROOM', 'ZONE', 'OUTDOOR_AREA', 'OTHER'];

export function DesignerProposalWorkspace() {
  const navigate = useNavigate();
  const { projectId, proposalId } = useParams();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('scenes');
  const [message, setMessage] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [areaDraft, setAreaDraft] = useState<AreaDraft>(DEFAULT_AREA_DRAFT);
  const [showAreaForm, setShowAreaForm] = useState(false);
  const projectQuery = useProjectDetail(projectId);
  const proposalQuery = useProposalDetail(proposalId);
  const areasQuery = useProjectAreas({
    projectId: projectId ?? '',
    includeCancelled: false,
  });
  const scenesQuery = useProposalScenes({
    proposalId: proposalId ?? '',
    isActive: true,
    page: 1,
    limit: 100,
  });
  const itemsQuery = useProposalItems({
    proposalId: proposalId ?? '',
    page: 1,
    limit: 100,
  });
  const createAreaMutation = useCreateProjectArea();
  const createSceneMutation = useCreateProposalScene();
  const publishProposalMutation = usePublishProposal();
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
  const total = useMemo(
    () => items.reduce((sum, item) => sum + (item.subtotalAmount ?? 0), 0),
    [items],
  );
  const primaryScene = scenes.find((scene) => scene.sceneType === 'THREE_D') ?? scenes[0] ?? null;
  const selectedArea = areas.find((area) => area.projectAreaId === selectedAreaId) ?? null;
  const selectedAreaScenes = useMemo(
    () => (selectedAreaId ? scenes.filter((scene) => scene.projectAreaId === selectedAreaId) : []),
    [scenes, selectedAreaId],
  );
  const canPublishProposal = Boolean(proposalId && proposal?.status === 'DRAFT' && scenes.length > 0);
  const publishChecklist = useMemo(
    () => [
      { label: 'Proposal is Draft', ready: proposal?.status === 'DRAFT' },
      { label: 'At least one active scene exists', ready: scenes.length > 0 },
      { label: 'Room Planner scene is saved', ready: scenes.some((scene) => Boolean(scene.mongoSceneId)) },
      { label: 'Proposal items are synced if required', ready: items.length > 0 },
    ],
    [items.length, proposal?.status, scenes],
  );

  async function publishCurrentProposal() {
    if (!proposalId) {
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
        proposalId,
        note: 'Published by designer from proposal workspace.',
      });
      setActiveTab('review');
      setMessage('Proposal published successfully. It is now ready for customer review.');
    } catch (error) {
      setMessage(getProposalServiceResultMessage(error));
    }
  }

  async function createScene() {
    if (!proposalId || !project) {
      return;
    }

    setMessage('');

    if (!selectedAreaId) {
      setMessage('Select or create a project area before creating a 3D proposal scene.');
      return;
    }

    try {
      const scene = await createSceneMutation.mutateAsync({
        proposalId,
        sceneName: `${selectedArea?.areaName ?? project.projectName} 3D Scene`,
        sceneType: 'THREE_D',
        projectAreaId: selectedAreaId,
      });

      openRoomPlanner(scene);
    } catch (error) {
      setMessage(getProposalServiceResultMessage(error));
    }
  }

  async function createArea() {
    if (!projectId) {
      return;
    }

    const areaName = areaDraft.areaName.trim();

    setMessage('');

    if (!areaName) {
      setMessage('Area name is required before the proposal can move into 3D design.');
      return;
    }

    try {
      const area = await createAreaMutation.mutateAsync({
        projectId,
        areaName,
        areaType: areaDraft.areaType,
        areaSqm: parseOptionalNumber(areaDraft.areaSqm),
        floorNumber: parseOptionalNumber(areaDraft.floorNumber),
        height: parseOptionalNumber(areaDraft.height),
        length: parseOptionalNumber(areaDraft.length),
        requirementNote: areaDraft.requirementNote,
        status: 'NEED_MEASUREMENT',
        width: parseOptionalNumber(areaDraft.width),
      });

      setSelectedAreaId(area.projectAreaId);
      setAreaDraft(DEFAULT_AREA_DRAFT);
      setShowAreaForm(false);
      setMessage(`${area.areaName} is ready. You can create the 3D scene for this area now.`);
    } catch (error) {
      setMessage(getProjectAreaServiceResultMessage(error));
    }
  }

  function openRoomPlanner(scene: ProposalSceneDto) {
    navigate(`/proposal-scenes/${scene.sceneId}/room-planner`, {
      state: {
        mode: 'create-proposal',
        projectAreaId: scene.projectAreaId,
        projectId,
        proposalId,
        returnTo: `/designer/projects/${projectId}/proposals/${proposalId}`,
      },
    });
  }

  return (
    <DesignerShell activeLabel="Proposals">
      <button className="designer-proposal-back" type="button" onClick={() => navigate(projectId ? `/designer/assigned-projects/${projectId}` : '/designer/assigned-projects')}>
        <IconArrowLeft size={16} /> Project Detail
      </button>

      <header className="designer-proposal-heading">
        <div>
          <span>{projectQuery.isLoading ? 'LOADING PROJECT' : project?.projectCode ?? 'PROJECT NOT FOUND'}</span>
          <h1>{proposalQuery.isLoading ? 'Loading proposal...' : proposal?.proposalName ?? 'Proposal not found'}</h1>
          <p>
            {project?.projectName ?? 'No project data from backend'}
            {proposal ? ` · Version ${proposal.versionNo}` : ''}
          </p>
        </div>
        <div>
          <span className="designer-proposal-status">{proposal?.status ?? 'UNKNOWN'}</span>
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
        <button className={activeTab === 'items' ? 'is-active' : ''} type="button" onClick={() => setActiveTab('items')}><IconPackage size={16} /> Proposal Items</button>
        <button className={activeTab === 'review' ? 'is-active' : ''} type="button" onClick={() => setActiveTab('review')}><IconFileText size={16} /> Review & Publish</button>
        <button className={activeTab === 'chat' ? 'is-active' : ''} type="button" onClick={() => setActiveTab('chat')}><IconMessageCircle size={16} /> Chat</button>
      </nav>

      {message && <div className="designer-proposal-message">{message}</div>}
      {projectQuery.isError && <div className="designer-proposal-message is-error">{getProjectServiceResultMessage(projectQuery.error)}</div>}
      {proposalQuery.isError && <div className="designer-proposal-message is-error">{getProposalServiceResultMessage(proposalQuery.error)}</div>}
      {areasQuery.isError && <div className="designer-proposal-message is-error">{getProjectAreaServiceResultMessage(areasQuery.error)}</div>}

      {activeTab === 'scenes' && (
        <div className="designer-scenes-workflow">
          <ProjectAreasSection
            areaDraft={areaDraft}
            areas={areas}
            isCreating={createAreaMutation.isPending}
            isLoading={areasQuery.isLoading}
            selectedAreaId={selectedAreaId}
            showAreaForm={showAreaForm}
            onCreateArea={() => void createArea()}
            onDraftChange={setAreaDraft}
            onSelectArea={setSelectedAreaId}
            onToggleAreaForm={() => setShowAreaForm((isOpen) => !isOpen)}
          />

          <section className="designer-scenes-section">
            <header>
              <div><h2>Proposal Scenes</h2><p>Scenes belong to this proposal and are linked to the selected project area.</p></div>
              <button disabled={!proposalId || proposal?.status !== 'DRAFT' || !selectedAreaId || createSceneMutation.isPending} type="button" onClick={() => void createScene()}>
                <IconPlus size={17} /> {createSceneMutation.isPending ? 'Creating...' : selectedArea ? `Create Scene for ${selectedArea.areaName}` : 'Create Scene'}
              </button>
            </header>
            <div className="designer-scene-context">
              <span>{selectedArea ? `Selected area: ${selectedArea.areaName}` : 'Select a project area first.'}</span>
              <small>Project Area is the real space of the project. Proposal Scene is the design version of one Project Area inside one Proposal. Room Planner stores the detailed 3D data of that Proposal Scene.</small>
            </div>
            <div className="designer-scenes-list">
              {scenesQuery.isLoading ? <EmptyState message="Loading proposal scenes from backend..." /> : null}
              {!selectedAreaId ? <EmptyState message="Select a project area first." /> : null}
              {selectedAreaId && !scenesQuery.isLoading && selectedAreaScenes.length === 0 ? <EmptyState message="No scene has been created for the selected project area in this proposal." /> : null}
              {selectedAreaScenes.map((scene) => (
                <SceneRow key={scene.sceneId} area={selectedArea} scene={scene} onOpen={() => openRoomPlanner(scene)} />
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'items' && (
        <section className="designer-items-section">
          <header>
            <div><h2>Proposal Items</h2><p>SQL business items synchronized from Room Planner scene objects.</p></div>
            <button disabled type="button"><IconCube size={17} /> Sync From Scene</button>
          </header>
          {itemsQuery.isLoading ? (
            <EmptyState message="Loading proposal items from backend..." />
          ) : items.length ? (
            <ItemsTable items={items} total={total} />
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

function ProjectAreasSection({
  areaDraft,
  areas,
  isCreating,
  isLoading,
  selectedAreaId,
  showAreaForm,
  onCreateArea,
  onDraftChange,
  onSelectArea,
  onToggleAreaForm,
}: {
  areaDraft: AreaDraft;
  areas: ProjectAreaDto[];
  isCreating: boolean;
  isLoading: boolean;
  selectedAreaId: string;
  showAreaForm: boolean;
  onCreateArea: () => void;
  onDraftChange: (draft: AreaDraft) => void;
  onSelectArea: (areaId: string) => void;
  onToggleAreaForm: () => void;
}) {
  const selectedArea = areas.find((area) => area.projectAreaId === selectedAreaId) ?? null;

  function updateDraft<K extends keyof AreaDraft>(field: K, value: AreaDraft[K]) {
    onDraftChange({ ...areaDraft, [field]: value });
  }

  return (
    <section className="designer-design-scope">
      <div className="designer-design-scope-heading">
        <div>
          <IconRulerMeasure size={22} />
          <div>
            <h3>Project Areas</h3>
            <p>Project areas belong to the project and can be reused across proposals.</p>
          </div>
        </div>
        {selectedArea ? <span><IconCheck size={15} /> Selected: {selectedArea.areaName}</span> : <span>Select a project area</span>}
      </div>

      <div className="designer-area-picker">
        {isLoading ? <p>Loading project areas...</p> : null}
        {!isLoading && areas.length === 0 ? <p>No project areas exist for this project yet. Add one project area, then create the proposal scene from it.</p> : null}
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

      <div className="designer-area-form-shell">
        <button className="designer-area-form-toggle" type="button" onClick={onToggleAreaForm}>
          <IconPlus size={16} /> {showAreaForm ? 'Hide Project Area Form' : 'Add Project Area to This Project'}
        </button>

        {(showAreaForm || areas.length === 0) && (
          <div className="designer-area-form">
            <label>
              <span>Area Name</span>
              <input value={areaDraft.areaName} onChange={(event) => updateDraft('areaName', event.target.value)} />
            </label>
            <label>
              <span>Type</span>
              <select value={areaDraft.areaType} onChange={(event) => updateDraft('areaType', event.target.value as ProjectAreaType)}>
                {AREA_TYPES.map((type) => <option key={type} value={type}>{formatEnumLabel(type)}</option>)}
              </select>
            </label>
            <label>
              <span>Floor</span>
              <input inputMode="numeric" value={areaDraft.floorNumber} onChange={(event) => updateDraft('floorNumber', event.target.value)} />
            </label>
            <label>
              <span>Area m2</span>
              <input inputMode="decimal" value={areaDraft.areaSqm} onChange={(event) => updateDraft('areaSqm', event.target.value)} />
            </label>
            <label>
              <span>Width</span>
              <input inputMode="decimal" value={areaDraft.width} onChange={(event) => updateDraft('width', event.target.value)} />
            </label>
            <label>
              <span>Length</span>
              <input inputMode="decimal" value={areaDraft.length} onChange={(event) => updateDraft('length', event.target.value)} />
            </label>
            <label>
              <span>Height</span>
              <input inputMode="decimal" value={areaDraft.height} onChange={(event) => updateDraft('height', event.target.value)} />
            </label>
            <label className="designer-area-form-note">
              <span>Requirement Note</span>
              <textarea value={areaDraft.requirementNote} onChange={(event) => updateDraft('requirementNote', event.target.value)} />
            </label>
            <button disabled={isCreating || !areaDraft.areaName.trim()} type="button" onClick={onCreateArea}>
              <IconPlus size={16} /> {isCreating ? 'Creating area...' : 'Create Project Area'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function SceneRow({ area, scene, onOpen }: { area: ProjectAreaDto | null; scene: ProposalSceneDto; onOpen: () => void }) {
  return (
    <article className="designer-scene-row">
      <img alt="Room scene preview" src={scene.previewFileUrl ?? scenePreview} />
      <div>
        <span>{scene.sceneType}</span>
        <h3>{scene.sceneName}</h3>
        <p>{area ? `Area: ${area.areaName}` : scene.projectAreaId ? `Area ID: ${scene.projectAreaId}` : 'No project area linked'}</p>
        <p>{scene.mongoSceneId ? `Mongo scene ${scene.mongoSceneId}` : 'No Mongo scene saved yet'}</p>
        <small>Version {scene.versionNo} · Updated {formatDateTime(scene.updatedAt)}</small>
      </div>
      <div className="designer-scene-actions">
        <button disabled title="Edit scene metadata" type="button"><IconEdit size={17} /></button>
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

function parseOptionalNumber(value: string) {
  const normalizedValue = value.trim().replace(',', '.');

  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : null;
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
