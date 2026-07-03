import { useMemo, useState } from 'react';
import {
  IconArrowLeft,
  IconChevronRight,
  IconCube,
  IconEdit,
  IconFileText,
  IconMessageCircle,
  IconPackage,
  IconPlus,
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';

import scenePreview from '@/assets/product-detail-shop/table-room.png';
import { DesignerShell } from '@/features/DesignerPages/components/DesignerShell';
import { ProjectChatPanel } from '@/features/projectChat/ProjectChatPanel';
import { getProjectServiceResultMessage } from '@/services/api/projects';
import { getProposalServiceResultMessage, type ProposalItemDto, type ProposalSceneDto } from '@/services/api/proposals';
import {
  useCreateProposalScene,
  useProjectDetail,
  useProposalDetail,
  useProposalItems,
  useProposalScenes,
} from '@/services/queries';

import './DesignerProposalWorkspace.css';

type WorkspaceTab = 'scenes' | 'items' | 'review' | 'chat';

export function DesignerProposalWorkspace() {
  const navigate = useNavigate();
  const { projectId, proposalId } = useParams();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('scenes');
  const [message, setMessage] = useState('');
  const projectQuery = useProjectDetail(projectId);
  const proposalQuery = useProposalDetail(proposalId);
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
  const createSceneMutation = useCreateProposalScene();
  const project = projectQuery.data;
  const proposal = proposalQuery.data;
  const scenes = scenesQuery.data?.items ?? proposal?.scenes ?? [];
  const items = itemsQuery.data?.items ?? proposal?.items ?? [];
  const total = useMemo(
    () => items.reduce((sum, item) => sum + (item.subtotalAmount ?? 0), 0),
    [items],
  );
  const primaryScene = scenes.find((scene) => scene.sceneType === 'THREE_D') ?? scenes[0] ?? null;

  async function createScene() {
    if (!proposalId || !project) {
      return;
    }

    setMessage('');

    try {
      const scene = await createSceneMutation.mutateAsync({
        proposalId,
        sceneName: `${project.projectName} 3D Scene`,
        sceneType: 'THREE_D',
      });

      openRoomPlanner(scene);
    } catch (error) {
      setMessage(getProposalServiceResultMessage(error));
    }
  }

  function openRoomPlanner(scene: ProposalSceneDto) {
    navigate(`/proposal-scenes/${scene.sceneId}/room-planner`, {
      state: {
        mode: 'create-proposal',
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

      {activeTab === 'scenes' && (
        <section className="designer-scenes-section">
          <header>
            <div><h2>Proposal Scenes</h2><p>Loaded from proposal scene APIs only.</p></div>
            <button disabled={!proposalId || proposal?.status !== 'DRAFT' || createSceneMutation.isPending} type="button" onClick={() => void createScene()}>
              <IconPlus size={17} /> {createSceneMutation.isPending ? 'Creating...' : 'Create Scene'}
            </button>
          </header>
          <div className="designer-scenes-list">
            {scenesQuery.isLoading ? <EmptyState message="Loading proposal scenes from backend..." /> : null}
            {!scenesQuery.isLoading && scenes.length === 0 ? <EmptyState message="No scenes returned by backend for this proposal." /> : null}
            {scenes.map((scene) => (
              <SceneRow key={scene.sceneId} scene={scene} onOpen={() => openRoomPlanner(scene)} />
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

function SceneRow({ scene, onOpen }: { scene: ProposalSceneDto; onOpen: () => void }) {
  return (
    <article className="designer-scene-row">
      <img alt="Room scene preview" src={scene.previewFileUrl ?? scenePreview} />
      <div>
        <span>{scene.sceneType}</span>
        <h3>{scene.sceneName}</h3>
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}
