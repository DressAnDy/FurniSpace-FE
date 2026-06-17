import {
  IconBox,
  IconChevronRight,
  IconCircleCheck,
  IconCircleX,
  IconHome,
  IconMessageDots,
  IconRefresh,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

import './CustomerProposalDetailPage.css';
import { CustomerNavbar } from '@/features/CustomerPages/customercomponents';

const tableHeaders = ['Item Name', 'Type', 'Dimensions', 'Material', 'Qty', 'Unit Price', 'Total'];

export function CustomerProposalDetailPage() {
  const navigate = useNavigate();

  return (
    <main className="customer-proposal-detail-page">
      <CustomerNavbar activeLabel="Design Proposals" classPrefix="customer-proposal-detail" />

      <div className="customer-proposal-detail-main">
        <nav className="customer-proposal-detail-breadcrumb" aria-label="Breadcrumb">
          <a href="/customer/dashboard">
            <IconHome size={16} stroke={1.8} />
          </a>
          <IconChevronRight size={16} stroke={1.8} />
          <a href="/customer/proposals">Design Proposals</a>
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
            <button type="button" onClick={() => navigate('/customer/3d-preview')}>
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
          <a href="/customer/3d-preview">
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

