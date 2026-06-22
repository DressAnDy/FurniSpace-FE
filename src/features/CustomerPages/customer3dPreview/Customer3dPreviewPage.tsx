import { useMemo, useRef, useState } from 'react';
import {
  IconChevronLeft,
  IconCircleCheck,
  IconCube,
  IconLayoutDashboard,
  IconMaximize,
  IconMessageDots,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

import { CustomerNavbar } from '@/features/CustomerPages/customercomponents';
import { BlueprintCanvas } from '@/features/ThreeD/components/BlueprintCanvas';
import { RoomPreview3D } from '@/features/ThreeD/components/RoomPreview3D';
import {
  MOCK_FLOOR_MATERIAL,
  MOCK_PLACED_PRODUCTS,
  MOCK_PROPOSAL,
  MOCK_PROPOSAL_ITEMS,
  MOCK_PROPOSAL_SCENES,
  MOCK_ROOM_LAYOUT,
  MOCK_WALL_MATERIAL,
} from '@/features/ThreeD/mocks/proposalScene.mock';
import '@/features/ThreeD/pages/ThreeDTestPage.css';
import './Customer3dPreviewPage.css';

type ViewMode = '2d' | '3d';

export function Customer3dPreviewPage() {
  const navigate = useNavigate();
  const stageRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('3d');
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [decisionMessage, setDecisionMessage] = useState('');
  const selectedObject = useMemo(
    () => MOCK_PLACED_PRODUCTS.find((object) => object.id === selectedObjectId) ?? null,
    [selectedObjectId],
  );
  const publishedScenes = MOCK_PROPOSAL_SCENES.filter((scene) => scene.status === 'PUBLISHED');

  return (
    <main className="customer-3d-preview-page">
      <CustomerNavbar activeLabel="2D/3D Review" classPrefix="customer-3d-preview" />

      <section className="customer-3d-preview-viewer" aria-label="Customer proposal scene review">
        <div className="customer-3d-preview-toolbar">
          <div className="customer-3d-preview-titlebar">
            <button type="button" aria-label="Back to proposal detail" onClick={() => navigate('/customer/proposals')}>
              <IconChevronLeft size={20} stroke={1.8} />
            </button>
            <span />
            <div>
              <strong>{MOCK_PROPOSAL.name}</strong>
              <small>Customer review · read-only</small>
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
            <span className="customer-3d-preview-status">Published</span>
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

        <div className="customer-3d-preview-workspace">
          <aside className="customer-3d-preview-left-panel" aria-label="Published scenes">
            <PanelHeader title="Scenes" />
            <div className="customer-scene-list">
              {publishedScenes.map((scene, index) => (
                <button className="is-active" key={scene.sceneId} type="button">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div><strong>{scene.name}</strong><small>Version {scene.version}</small></div>
                </button>
              ))}
            </div>
          </aside>

          <div className="customer-3d-preview-stage" ref={stageRef}>
            <div className="customer-scene-renderer">
              {viewMode === '3d' ? (
                <RoomPreview3D
                  floorMaterial={MOCK_FLOOR_MATERIAL}
                  layout={MOCK_ROOM_LAYOUT}
                  placedProducts={MOCK_PLACED_PRODUCTS}
                  readOnly
                  selectedProductId={selectedObjectId}
                  wallMaterial={MOCK_WALL_MATERIAL}
                  onProductSelect={(productId) => setSelectedObjectId(productId)}
                />
              ) : (
                <BlueprintCanvas
                  activeTool="select"
                  floorFillColor={MOCK_FLOOR_MATERIAL.fallbackColor}
                  hideLabels={false}
                  layout={MOCK_ROOM_LAYOUT}
                  readOnly
                  selectedItem={null}
                  wallFillColor={MOCK_WALL_MATERIAL.fallbackColor}
                  onLayoutChange={() => undefined}
                  onSelectItem={() => undefined}
                />
              )}
            </div>

            <div className="customer-3d-preview-scene-card">
              <strong>{publishedScenes[0]?.name}</strong>
              <span />
              <p>{viewMode === '3d' ? 'Orbit, pan and zoom enabled' : 'Top-down floor plan'}</p>
            </div>

            <div className="customer-readonly-notice">Published scene · editing disabled</div>
          </div>

          <aside className="customer-3d-preview-right-panel" aria-label="Scene items">
            <PanelHeader title="Scene Items" />
            {selectedObject && (
              <div className="customer-selected-object">
                <span>Selected object</span>
                <strong>{selectedObject.modelName}</strong>
                <small>{selectedObject.productId}</small>
              </div>
            )}
            <div className="customer-3d-preview-item-list">
              {MOCK_PROPOSAL_ITEMS.map((item) => (
                <article className="customer-3d-preview-item-card" key={item.productVersionId}>
                  <div><strong>{item.name}</strong><span>{item.type} · {item.material}</span></div>
                  <div><span>{item.quantity}x</span><strong>{new Intl.NumberFormat('vi-VN').format(item.estimatedPrice)} VND</strong></div>
                </article>
              ))}
            </div>

            {decisionMessage && <div className="customer-decision-message">{decisionMessage}</div>}
            <div className="customer-3d-preview-decision">
              <button type="button" onClick={() => setDecisionMessage('Feedback draft opened for this proposal scene.')}>
                <IconMessageDots size={18} stroke={1.8} /> Request Revision
              </button>
              <button type="button" onClick={() => setDecisionMessage('Proposal selection recorded in demo mode.')}>
                <IconCircleCheck size={18} stroke={1.8} /> Select Proposal
              </button>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function PanelHeader({ title }: { title: string }) {
  return <header className="customer-3d-preview-panel-header"><h2>{title}</h2></header>;
}
