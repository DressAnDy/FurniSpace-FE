import {
  IconBell,
  IconBox,
  IconChevronRight,
  IconCircleCheck,
  IconCircleX,
  IconFileText,
  IconHome,
  IconMessageCircle,
  IconMessageDots,
  IconPlus,
  IconReceipt,
  IconRefresh,
  IconSparkles,
} from '@tabler/icons-react';

import './CustomerProposalDetailPage.css';

const navigation = [
  { icon: <IconHome size={15} stroke={1.8} />, label: 'Home' },
  { icon: <IconFileText size={15} stroke={1.8} />, label: 'My Projects' },
  { active: true, icon: <IconFileText size={15} stroke={1.8} />, label: 'Design Proposals' },
  { icon: <IconSparkles size={15} stroke={1.8} />, label: '2D/3D Review' },
  { icon: <IconReceipt size={15} stroke={1.8} />, label: 'Quotations' },
  { icon: <IconMessageCircle size={15} stroke={1.8} />, label: 'Project Chat' },
  { icon: <IconBox size={15} stroke={1.8} />, label: 'Handover' },
];

const tableHeaders = ['Item Name', 'Type', 'Dimensions', 'Material', 'Qty', 'Unit Price', 'Total'];

export function CustomerProposalDetailPage() {
  return (
    <main className="customer-proposal-detail-page">
      <TopNavigation />

      <div className="customer-proposal-detail-main">
        <nav className="customer-proposal-detail-breadcrumb" aria-label="Breadcrumb">
          <a href="/">
            <IconHome size={16} stroke={1.8} />
          </a>
          <IconChevronRight size={16} stroke={1.8} />
          <a href="/customer-dashboard">Design Proposals</a>
          <IconChevronRight size={16} stroke={1.8} />
          <span>Industrial Modern Concept</span>
        </nav>

        <section className="customer-proposal-detail-hero">
          <div className="customer-proposal-detail-hero-copy">
            <div>
              <h1>Industrial Modern Concept</h1>
              <span>Version 1</span>
            </div>
            <p>An edgy café design with exposed brick, metal fixtures, and reclaimed wood elements</p>
            <ul>
              <li>by Michael Torres</li>
              <li>Published 2/6/2026</li>
              <li>$52.000</li>
            </ul>
          </div>
          <div className="customer-proposal-detail-hero-footer">
            <div>
              <span className="customer-proposal-detail-status">Published</span>
              <p>3 Scenes • 24 Items</p>
            </div>
            <button type="button">
              <IconBox size={20} stroke={1.8} />
              Open 2D/3D Review
            </button>
          </div>
        </section>

        <section className="customer-proposal-detail-card">
          <h2>Design Concept</h2>
          <p>
            This proposal embraces an urban industrial aesthetic with exposed structural elements, Edison bulb
            lighting, and a mix of raw and refined materials. The design creates visual interest through contrasting
            textures while maintaining a cohesive and inviting environment.
          </p>
        </section>

        <section className="customer-proposal-detail-card customer-proposal-detail-row-card">
          <h2>3D Scenes (0)</h2>
          <a href="/viewer3d">
            View All in 2D/3D Viewer
            <IconChevronRight size={16} stroke={1.8} />
          </a>
        </section>

        <section className="customer-proposal-detail-card customer-proposal-detail-items">
          <div>
            <h2>Furniture & Items (0)</h2>
            <p>Total Estimated: $0</p>
          </div>
          <div className="customer-proposal-detail-table-wrap">
            <table>
              <thead>
                <tr>
                  {tableHeaders.map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
            </table>
          </div>
        </section>

        <section className="customer-proposal-detail-decision">
          <h2>Make Your Decision</h2>
          <p>Review the design proposal carefully and let us know your decision</p>
          <div>
            <button type="button">
              <IconMessageDots size={20} stroke={1.8} />
              Submit Feedback
            </button>
            <button type="button">
              <IconRefresh size={20} stroke={1.8} />
              Request Revision
            </button>
            <button type="button">
              <IconCircleCheck size={20} stroke={1.8} />
              Select This Proposal
            </button>
            <button type="button">
              <IconCircleX size={20} stroke={1.8} />
              Reject Proposal
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function TopNavigation() {
  return (
    <header className="customer-proposal-detail-topnav">
      <a className="customer-proposal-detail-logo" href="/">
        <span>
          <IconBox size={19} stroke={1.8} />
        </span>
        <strong>FurniSpace</strong>
      </a>

      <nav aria-label="Customer navigation">
        {navigation.map((item) => (
          <a
            className={item.active ? 'customer-proposal-detail-nav-active' : undefined}
            href={`#${item.label}`}
            key={item.label}
          >
            {item.icon}
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      <div className="customer-proposal-detail-userbar">
        <button className="customer-proposal-detail-create" type="button">
          <IconPlus size={15} stroke={2} />
          Create Project Request
        </button>
        <button className="customer-proposal-detail-bell" aria-label="Notifications" type="button">
          <IconBell size={20} stroke={1.8} />
          <span />
        </button>
        <div className="customer-proposal-detail-user">
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
