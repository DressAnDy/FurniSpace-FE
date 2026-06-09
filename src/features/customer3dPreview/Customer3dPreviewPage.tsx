import {
  IconArrowsMove,
  IconBell,
  IconBox,
  IconChevronLeft,
  IconChevronRight,
  IconCircleCheck,
  IconCube,
  IconEye,
  IconFileText,
  IconGridDots,
  IconHome,
  IconLayoutDashboard,
  IconMaximize,
  IconMessageCircle,
  IconMessageDots,
  IconPlus,
  IconReceipt,
  IconRotateClockwise,
  IconSparkles,
  IconZoomIn,
  IconZoomOut,
} from '@tabler/icons-react';

import './Customer3dPreviewPage.css';

const navigation = [
  { icon: <IconHome size={15} stroke={1.8} />, label: 'Home' },
  { icon: <IconFileText size={15} stroke={1.8} />, label: 'My Projects' },
  { active: true, icon: <IconFileText size={15} stroke={1.8} />, label: 'Design Proposals' },
  { icon: <IconSparkles size={15} stroke={1.8} />, label: '2D/3D Review' },
  { icon: <IconReceipt size={15} stroke={1.8} />, label: 'Quotations' },
  { icon: <IconMessageCircle size={15} stroke={1.8} />, label: 'Project Chat' },
  { icon: <IconBox size={15} stroke={1.8} />, label: 'Handover' },
];

const sceneItems = [
  {
    name: 'Oak Dining Table - 4 Seater',
    price: '$650',
    quantity: '6x',
    type: 'TABLE',
  },
  {
    name: 'Bentwood Dining Chair',
    price: '$180',
    quantity: '24x',
    type: 'CHAIR',
  },
];

const viewerTools = [
  { icon: <IconArrowsMove size={20} stroke={1.8} />, label: 'Pan scene' },
  { icon: <IconRotateClockwise size={20} stroke={1.8} />, label: 'Rotate scene' },
  { icon: <IconZoomIn size={20} stroke={1.8} />, label: 'Zoom in' },
  { icon: <IconZoomOut size={20} stroke={1.8} />, label: 'Zoom out' },
  { divider: true, icon: <IconGridDots size={20} stroke={1.8} />, label: 'Toggle grid' },
  { icon: <IconEye size={20} stroke={1.8} />, label: 'Preview visibility' },
];

export function Customer3dPreviewPage() {
  return (
    <main className="customer-3d-preview-page">
      <TopNavigation />

      <section className="customer-3d-preview-viewer" aria-label="Customer 3D preview">
        <div className="customer-3d-preview-toolbar">
          <div className="customer-3d-preview-titlebar">
            <a href="/customer-proposal-detail" aria-label="Back to proposal detail">
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
            <div className="customer-3d-preview-empty-list" />
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
              <p>Scene ID: ...</p>
            </div>

            <div className="customer-3d-preview-canvas-mark">
              <IconCube size={96} stroke={1.2} />
            </div>

            <div className="customer-3d-preview-pager" aria-label="Scene pagination">
              <button type="button" aria-label="Previous scene">
                <IconChevronLeft size={18} stroke={1.8} />
              </button>
              <span>0 of 0</span>
              <button type="button" aria-label="Next scene" disabled>
                <IconChevronRight size={18} stroke={1.8} />
              </button>
            </div>
          </div>

          <aside className="customer-3d-preview-right-panel" aria-label="Scene items">
            <PanelHeader title="Scene Items" />
            <div className="customer-3d-preview-item-list">
              {sceneItems.map((item) => (
                <article className="customer-3d-preview-item-card" key={item.name}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.type}</span>
                  </div>
                  <div>
                    <span>{item.quantity}</span>
                    <strong>{item.price}</strong>
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

function TopNavigation() {
  return (
    <header className="customer-3d-preview-topnav">
      <a className="customer-3d-preview-logo" href="/">
        <span>
          <IconBox size={19} stroke={1.8} />
        </span>
        <strong>FurniSpace</strong>
      </a>

      <nav aria-label="Customer navigation">
        {navigation.map((item) => (
          <a className={item.active ? 'customer-3d-preview-nav-active' : undefined} href={`#${item.label}`} key={item.label}>
            {item.icon}
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      <div className="customer-3d-preview-userbar">
        <button className="customer-3d-preview-create" type="button">
          <IconPlus size={15} stroke={2} />
          Create Project Request
        </button>
        <button className="customer-3d-preview-bell" aria-label="Notifications" type="button">
          <IconBell size={20} stroke={1.8} />
          <span />
        </button>
        <div className="customer-3d-preview-user">
          <div>
            <strong>Alex Thompson</strong>
            <span>Customer</span>
          </div>
          <span>AT</span>
        </div>
      </div>
    </header>
  );
}
