import {
  IconArrowsMove,
  IconChevronLeft,
  IconChevronRight,
  IconCircleCheck,
  IconCube,
  IconEye,
  IconGridDots,
  IconLayoutDashboard,
  IconMaximize,
  IconMessageDots,
  IconRotateClockwise,
  IconZoomIn,
  IconZoomOut,
} from '@tabler/icons-react';
import { useState } from 'react';

import './Customer3dPreviewPage.css';
import { CustomerNavbar } from '@/features/CustomerPages/customercomponents';
import { mockProposalItems, mockProposalScenes } from '@/features/CustomerPages/mockData';

const viewerTools = [
  { icon: <IconArrowsMove size={20} stroke={1.8} />, label: 'Pan scene' },
  { icon: <IconRotateClockwise size={20} stroke={1.8} />, label: 'Rotate scene' },
  { icon: <IconZoomIn size={20} stroke={1.8} />, label: 'Zoom in' },
  { icon: <IconZoomOut size={20} stroke={1.8} />, label: 'Zoom out' },
  { divider: true, icon: <IconGridDots size={20} stroke={1.8} />, label: 'Toggle grid' },
  { icon: <IconEye size={20} stroke={1.8} />, label: 'Preview visibility' },
];

export function Customer3dPreviewPage() {
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const activeScene = mockProposalScenes[activeSceneIndex];

  return (
    <main className="customer-3d-preview-page">
      <CustomerNavbar activeLabel="2D/3D Review" classPrefix="customer-3d-preview" />

      <section className="customer-3d-preview-viewer" aria-label="Customer 3D preview">
        <div className="customer-3d-preview-toolbar">
          <div className="customer-3d-preview-titlebar">
            <a href="/customer/proposals" aria-label="Back to proposal detail">
              <IconChevronLeft size={20} stroke={1.8} />
            </a>
            <span />
            <strong>Industrial Modern Concept</strong>
          </div>

          <div className="customer-3d-preview-actions">
            <div className="customer-3d-preview-view-switch" role="tablist" aria-label="Preview mode">
              <button type="button" role="tab">
                <IconLayoutDashboard size={16} stroke={1.8} />
                2D Floor Plan
              </button>
              <button className="customer-3d-preview-view-active" type="button" role="tab" aria-selected="true">
                <IconCube size={16} stroke={1.8} />
                3D View
              </button>
            </div>
            <span className="customer-3d-preview-status">Published</span>
            <button className="customer-3d-preview-icon-button" type="button" aria-label="Fullscreen preview">
              <IconMaximize size={20} stroke={1.8} />
            </button>
          </div>
        </div>

        <div className="customer-3d-preview-workspace">
          <aside className="customer-3d-preview-left-panel" aria-label="Scenes">
            <PanelHeader title="Scenes" />
            <div className="customer-3d-preview-scene-list">
              {mockProposalScenes.map((scene, index) => (
                <button
                  type="button"
                  key={scene.id}
                  className={index === activeSceneIndex ? 'customer-3d-preview-scene-active' : undefined}
                  onClick={() => setActiveSceneIndex(index)}
                >
                  <strong>{scene.name}</strong>
                  <span>{scene.id}</span>
                  <p>{scene.note}</p>
                </button>
              ))}
            </div>
          </aside>

          <div className="customer-3d-preview-stage">
            <div className="customer-3d-preview-tool-stack" aria-label="Scene tools">
              {viewerTools.map((tool) => (
                <button
                  className={tool.divider ? 'customer-3d-preview-tool-divider' : undefined}
                  type="button"
                  aria-label={tool.label}
                  key={tool.label}
                >
                  {tool.icon}
                </button>
              ))}
            </div>

            <div className="customer-3d-preview-scene-card">
              <strong>3D Scene View</strong>
              <span />
              <p>Scene ID: {activeScene.id}</p>
            </div>

            <div className="customer-3d-preview-canvas-mark">
              <IconCube size={96} stroke={1.2} />
            </div>

            <div className="customer-3d-preview-pager" aria-label="Scene pagination">
              <button type="button" aria-label="Previous scene" disabled={activeSceneIndex === 0} onClick={() => setActiveSceneIndex((current) => current - 1)}>
                <IconChevronLeft size={18} stroke={1.8} />
              </button>
              <span>
                {activeSceneIndex + 1} of {mockProposalScenes.length}
              </span>
              <button
                type="button"
                aria-label="Next scene"
                disabled={activeSceneIndex === mockProposalScenes.length - 1}
                onClick={() => setActiveSceneIndex((current) => current + 1)}
              >
                <IconChevronRight size={18} stroke={1.8} />
              </button>
            </div>
          </div>

          <aside className="customer-3d-preview-right-panel" aria-label="Scene items">
            <PanelHeader title="Scene Items" />
            <div className="customer-3d-preview-item-list">
              {mockProposalItems.map((item) => (
                <article className="customer-3d-preview-item-card" key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.type.toUpperCase()}</span>
                  </div>
                  <div>
                    <span>{item.quantity}x</span>
                    <strong>${item.unitPrice.toLocaleString('en-US')}</strong>
                  </div>
                </article>
              ))}
            </div>

            <div className="customer-3d-preview-decision">
              <button type="button">
                <IconMessageDots size={18} stroke={1.8} />
                Submit Feedback
              </button>
              <button type="button">
                <IconCircleCheck size={18} stroke={1.8} />
                Approve Scene
              </button>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function PanelHeader({ title }: { title: string }) {
  return (
    <header className="customer-3d-preview-panel-header">
      <h2>{title}</h2>
      <button type="button" aria-label={`Collapse ${title}`}>
        <IconChevronLeft size={20} stroke={1.8} />
      </button>
    </header>
  );
}

