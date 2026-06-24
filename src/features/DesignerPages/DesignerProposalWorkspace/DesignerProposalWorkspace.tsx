import { useState } from 'react';
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
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';

import scenePreview from '@/assets/product-detail-shop/table-room.png';
import { DesignerShell } from '@/features/DesignerPages/components/DesignerShell';
import { ProjectChatPanel } from '@/features/projectChat/ProjectChatPanel';
import { RoomPreview3D } from '@/features/ThreeD/components/RoomPreview3D';
import {
  MOCK_FLOOR_MATERIAL,
  MOCK_PLACED_PRODUCTS,
  MOCK_PROJECT,
  MOCK_PROPOSAL,
  MOCK_PROPOSAL_ITEMS,
  MOCK_PROPOSAL_SCENES,
  MOCK_ROOM_LAYOUT,
  MOCK_WALL_MATERIAL,
} from '@/features/ThreeD/mocks/proposalScene.mock';
import '@/features/ThreeD/pages/ThreeDTestPage.css';

import './DesignerProposalWorkspace.css';

type WorkspaceTab = 'scenes' | 'items' | 'review' | 'chat';

export function DesignerProposalWorkspace() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('scenes');
  const [message, setMessage] = useState('');
  const [previewObjectId, setPreviewObjectId] = useState<string | null>(null);
  const total = MOCK_PROPOSAL_ITEMS.reduce((sum, item) => sum + item.estimatedPrice * item.quantity, 0);

  return (
    <DesignerShell activeLabel="Proposals">
      <button className="designer-proposal-back" type="button" onClick={() => navigate('/designer/assigned-projects')}><IconArrowLeft size={16} /> Assigned Projects</button>
      <header className="designer-proposal-heading">
        <div><span>{MOCK_PROJECT.projectCode}</span><h1>{MOCK_PROPOSAL.name}</h1><p>{MOCK_PROJECT.name} · Version {MOCK_PROPOSAL.version}</p></div>
        <div><span className="designer-proposal-status">{MOCK_PROPOSAL.status}</span><button type="button" onClick={() => setMessage('Publish validation opened in demo mode.')}><IconCheck size={17} /> Publish Proposal</button></div>
      </header>

      <nav className="designer-proposal-tabs" aria-label="Proposal workspace tabs">
        <button className={activeTab === 'scenes' ? 'is-active' : ''} type="button" onClick={() => setActiveTab('scenes')}><IconCube size={16} /> Scenes</button>
        <button className={activeTab === 'items' ? 'is-active' : ''} type="button" onClick={() => setActiveTab('items')}><IconPackage size={16} /> Proposal Items</button>
        <button className={activeTab === 'review' ? 'is-active' : ''} type="button" onClick={() => setActiveTab('review')}><IconFileText size={16} /> Customer Review</button>
        <button className={activeTab === 'chat' ? 'is-active' : ''} type="button" onClick={() => setActiveTab('chat')}><IconMessageCircle size={16} /> Chat</button>
      </nav>

      {message && <div className="designer-proposal-message">{message}</div>}

      {activeTab === 'scenes' && (
        <section className="designer-scenes-section">
          <header><div><h2>Proposal Scenes</h2><p>Official and draft Room Planner scenes for this proposal.</p></div><button type="button" onClick={() => setMessage('Create Scene modal will use POST /proposals/{proposalId}/scenes.')}><IconPlus size={17} /> Create Scene</button></header>
          <div className="designer-scenes-list">
            {MOCK_PROPOSAL_SCENES.map((scene) => (
              <article className="designer-scene-row" key={scene.sceneId}>
                <img alt="Room scene preview" src={scenePreview} />
                <div><span>{scene.status}</span><h3>{scene.name}</h3><p>{scene.description}</p><small>Version {scene.version} · Updated {new Date(scene.updatedAt).toLocaleDateString()}</small></div>
                <div className="designer-scene-actions">
                  <button title="Edit scene metadata" type="button"><IconEdit size={17} /></button>
                  <button type="button" onClick={() => navigate(`/proposal-scenes/${scene.sceneId}/room-planner`)}>Open Room Planner <IconChevronRight size={17} /></button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'items' && (
        <section className="designer-items-section">
          <header><div><h2>Proposal Items</h2><p>SQL business items synchronized from Product Versions in the scene.</p></div><button type="button" onClick={() => setMessage('Scene objects queued for proposal item synchronization.')}><IconCube size={17} /> Sync From Scene</button></header>
          <div className="designer-items-table-wrap"><table><thead><tr><th>Product Version</th><th>Type</th><th>Material</th><th>Quantity</th><th>Unit Price</th><th>Subtotal</th></tr></thead><tbody>{MOCK_PROPOSAL_ITEMS.map((item) => <tr key={item.productVersionId}><td><strong>{item.name}</strong><small>{item.productVersionId}</small></td><td>{item.type}</td><td>{item.material}</td><td>{item.quantity}</td><td>{new Intl.NumberFormat('vi-VN').format(item.estimatedPrice)} VND</td><td>{new Intl.NumberFormat('vi-VN').format(item.estimatedPrice * item.quantity)} VND</td></tr>)}</tbody><tfoot><tr><td colSpan={5}>Estimated total</td><td>{new Intl.NumberFormat('vi-VN').format(total)} VND</td></tr></tfoot></table></div>
        </section>
      )}

      {activeTab === 'review' && (
        <section className="designer-review-section">
          <header>
            <div><IconFileText size={24} /><div><h2>Customer Review Preview</h2><p>Read-only preview of the scene currently published to the Customer.</p></div></div>
            <span>Published</span>
          </header>
          <div className="designer-review-viewer">
            <RoomPreview3D
              floorMaterial={MOCK_FLOOR_MATERIAL}
              layout={MOCK_ROOM_LAYOUT}
              placedProducts={MOCK_PLACED_PRODUCTS}
              readOnly
              selectedProductId={previewObjectId}
              wallMaterial={MOCK_WALL_MATERIAL}
              onProductSelect={(productId) => setPreviewObjectId(productId)}
            />
            <div className="designer-review-overlay">Customer view simulation · editing disabled</div>
          </div>
          <footer>
            <span>{previewObjectId ? `Selected object: ${previewObjectId}` : 'Select an object to inspect the Customer-facing scene.'}</span>
            <button type="button" onClick={() => setMessage('Customer review activity refreshed in demo mode.')}>Refresh Review Status</button>
          </footer>
        </section>
      )}

      {activeTab === 'chat' && (
        <section className="designer-chat-section">
          <ProjectChatPanel
            canClose
            preferredChatType="DESIGNER"
            projectCode={MOCK_PROJECT.projectCode}
            projectId={projectId ?? MOCK_PROJECT.projectId}
            title="Designer Chat with Customer"
          />
        </section>
      )}
    </DesignerShell>
  );
}
