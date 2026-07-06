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
          <button disabled type="button"><IconFileText size={17} /> Publish Proposal</button>
        </div>
      </header>

      <nav className="designer-proposal-tabs" aria-label="Proposal workspace tabs">
        <button className={activeTab === 'scenes' ? 'is-active' : ''} type="button" onClick={() => setActiveTab('scenes')}><IconCube size={16} /> Scenes</button>
        <button className={activeTab === 'items' ? 'is-active' : ''} type="button" onClick={() => setActiveTab('items')}><IconPackage size={16} /> Proposal Items</button>
        <button className={activeTab === 'review' ? 'is-active' : ''} type="button" onClick={() => setActiveTab('review')}><IconFileText size={16} /> Customer Review</button>
        <button className={activeTab === 'chat' ? 'is-active' : ''} type="button" onClick={() => setActiveTab('chat')}><IconMessageCircle size={16} /> Chat</button>
      </nav>

      {message && <div className="designer-proposal-message">{message}</div>}
      {projectQuery.isError && <div className="designer-proposal-message is-error">{getProjectServiceResultMessage(projectQuery.error)}</div>}
      {proposalQuery.isError && <div className="designer-proposal-message is-error">{getProposalServiceResultMessage(proposalQuery.error)}</div>}
      {areasQuery.isError && <div className="designer-proposal-message is-error">{getProjectAreaServiceResultMessage(areasQuery.error)}</div>}

      {activeTab === 'scenes' && (
        <section className="designer-scenes-section">
          <header>
            <div><h2>Proposal Scenes</h2><p>Create proposal metadata and select a project area before Room Planner 3D.</p></div>
            <button disabled={!proposalId || proposal?.status !== 'DRAFT' || !selectedAreaId || createSceneMutation.isPending} type="button" onClick={() => void createScene()}>
              <IconPlus size={17} /> {createSceneMutation.isPending ? 'Creating...' : 'Create Scene'}
            </button>
          </header>
          <DesignScopePanel
            areaDraft={areaDraft}
            areas={areas}
            isCreating={createAreaMutation.isPending}
            isLoading={areasQuery.isLoading}
            selectedAreaId={selectedAreaId}
            onCreateArea={() => void createArea()}
            onDraftChange={setAreaDraft}
            onSelectArea={setSelectedAreaId}
          />
          <div className="designer-scenes-list">
            {scenesQuery.isLoading ? <EmptyState message="Loading proposal scenes from backend..." /> : null}
            {!scenesQuery.isLoading && scenes.length === 0 ? <EmptyState message="" /> : null}
            {scenes.map((scene) => (
              <SceneRow key={scene.sceneId} area={areas.find((area) => area.projectAreaId === scene.projectAreaId) ?? null} scene={scene} onOpen={() => openRoomPlanner(scene)} />
            ))}
          </div>
        </section>
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
            <div><IconFileText size={24} /><div><h2>Customer Review Preview</h2><p>Backend scene entry selected for customer-facing review.</p></div></div>
            <span>{proposal?.status ?? 'UNKNOWN'}</span>
          </header>
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

function DesignScopePanel({
  areaDraft,
  areas,
  isCreating,
  isLoading,
  selectedAreaId,
  onCreateArea,
  onDraftChange,
  onSelectArea,
}: {
  areaDraft: AreaDraft;
  areas: ProjectAreaDto[];
  isCreating: boolean;
  isLoading: boolean;
  selectedAreaId: string;
  onCreateArea: () => void;
  onDraftChange: (draft: AreaDraft) => void;
  onSelectArea: (areaId: string) => void;
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
            <h3>Design Scope</h3>
            <p>Project area is required before creating the 3D Room Planner scene.</p>
          </div>
        </div>
        {selectedArea ? <span><IconCheck size={15} /> {selectedArea.areaName}</span> : <span>Select an area</span>}
      </div>

      <div className="designer-area-picker">
        {isLoading ? <p>Loading project areas...</p> : null}
        {!isLoading && areas.length === 0 ? <p>No project areas yet. Create the first room or zone below.</p> : null}
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
        <button disabled={isCreating} type="button" onClick={onCreateArea}>
          <IconPlus size={16} /> {isCreating ? 'Creating area...' : 'Create Area'}
        </button>
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
