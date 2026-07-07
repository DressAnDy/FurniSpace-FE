import {
  IconBox,
  IconChevronRight,
  IconCircleCheck,
  IconCircleX,
  IconHome,
  IconMessageDots,
  IconRefresh,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import './CustomerProposalDetailPage.css';
import { CustomerNavbar } from '@/features/CustomerPages/customercomponents';
import scenePreview from '@/assets/product-detail-shop/table-room.png';
import { getProposalServiceResultMessage } from '@/services/api/proposals';
import { useProposalDetail, useRequestProposalRevision, useSelectFinalProposal } from '@/services/queries';
import {
  MOCK_PROPOSAL,
  MOCK_PROPOSAL_ITEMS,
  MOCK_PROPOSAL_SCENES,
} from '@/features/ThreeD/mocks/proposalScene.mock';

const tableHeaders = ['Item Name', 'Type', 'Dimensions', 'Material', 'Qty', 'Unit Price', 'Total'];
const proposalSummary = [
  { label: 'Designer', value: 'Michael Torres' },
  { label: 'Published', value: '2/6/2026' },
  { label: 'Revision', value: 'Version 1' },
  { label: 'Estimated Cost', value: '$52.000' },
];
const decisionChecklist = [
  'Review all 3 rendered scenes in 2D/3D viewer',
  'Validate furniture quantities and dimensions',
  'Confirm budget range before approval',
];

export function CustomerProposalDetailPage() {
  const navigate = useNavigate();
  const { proposalId } = useParams();
  const [decisionMessage, setDecisionMessage] = useState('');
  const proposalQuery = useProposalDetail(proposalId, { enabled: Boolean(proposalId) });
  const selectFinalMutation = useSelectFinalProposal();
  const requestRevisionMutation = useRequestProposalRevision();
  const backendProposal = proposalQuery.data;
  const proposalName = backendProposal?.proposalName ?? MOCK_PROPOSAL.name;
  const proposalDescription =
    backendProposal?.description ??
    'An edgy cafe design with exposed brick, metal fixtures, and reclaimed wood elements';
  const proposalVersion = backendProposal?.versionNo ?? MOCK_PROPOSAL.version;
  const proposalStatus = backendProposal?.status ?? 'PUBLISHED';
  const estimatedTotal = MOCK_PROPOSAL_ITEMS.reduce(
    (total, item) => total + item.estimatedPrice * item.quantity,
    0,
  );

  async function selectFinalProposal() {
    if (!proposalId) {
      setDecisionMessage('Open a backend proposal before selecting the final design.');
      return;
    }

    setDecisionMessage('');

    try {
      await selectFinalMutation.mutateAsync({
        proposalId,
        note: 'Customer selected this proposal as the final design for quotation preparation.',
      });
      setDecisionMessage('Final proposal selected. The project can move toward quotation.');
    } catch (error) {
      setDecisionMessage(getProposalServiceResultMessage(error));
    }
  }

  async function requestRevision() {
    if (!proposalId) {
      setDecisionMessage('Open a backend proposal before requesting a revision.');
      return;
    }

    setDecisionMessage('');

    try {
      await requestRevisionMutation.mutateAsync({
        proposalId,
        note: 'Customer requested another review/revision for this design proposal.',
      });
      setDecisionMessage('Revision request sent to the design team.');
    } catch (error) {
      setDecisionMessage(getProposalServiceResultMessage(error));
    }
  }

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
          <span>{proposalName}</span>
        </nav>

        <div className="customer-proposal-detail-layout">
          <div className="customer-proposal-detail-primary">
            <section className="customer-proposal-detail-hero">
              <img className="customer-proposal-detail-hero-media" alt="Published interior proposal" src={scenePreview} />
          <div className="customer-proposal-detail-hero-copy">
                <div>
                  <h1>{proposalName}</h1>
                  <span>Version {proposalVersion}</span>
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
                  <span className="customer-proposal-detail-status">{proposalStatus}</span>
                  <p>{MOCK_PROPOSAL_SCENES.filter((scene) => scene.status === 'PUBLISHED').length} Published Scene • {MOCK_PROPOSAL_ITEMS.reduce((sum, item) => sum + item.quantity, 0)} Items</p>
                </div>
                <button type="button" onClick={() => navigate('/customer/3d-preview')}>
                  <IconBox size={20} stroke={1.8} />
                  Open 2D/3D Review
                </button>
              </div>
            </section>

            <section className="customer-proposal-detail-card">
              <h2>Design Concept</h2>
              <p>{proposalDescription}</p>
            </section>

        <section className="customer-proposal-detail-card customer-proposal-detail-row-card">
          <h2>3D Scenes ({MOCK_PROPOSAL_SCENES.filter((scene) => scene.status === 'PUBLISHED').length})</h2>
          <a href="/customer/3d-preview">
            View All in 2D/3D Viewer
            <IconChevronRight size={16} stroke={1.8} />
          </a>
        </section>

        <section className="customer-proposal-detail-card customer-proposal-detail-items">
          <div>
            <h2>Furniture & Items ({MOCK_PROPOSAL_ITEMS.length})</h2>
            <p>Total Estimated: {new Intl.NumberFormat('vi-VN').format(estimatedTotal)} VND</p>
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
              <tbody>
                {MOCK_PROPOSAL_ITEMS.map((item) => (
                  <tr key={item.productVersionId}>
                    <td>{item.name}</td>
                    <td>{item.type}</td>
                    <td>-</td>
                    <td>{item.material}</td>
                    <td>{item.quantity}</td>
                    <td>{new Intl.NumberFormat('vi-VN').format(item.estimatedPrice)} VND</td>
                    <td>{new Intl.NumberFormat('vi-VN').format(item.estimatedPrice * item.quantity)} VND</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

          <aside className="customer-proposal-detail-sidebar">
            <section className="customer-proposal-detail-decision">
              <h2>Make Your Decision</h2>
              <p>Review the design proposal carefully and let us know your decision</p>
              {proposalQuery.isLoading ? <p>Loading backend proposal...</p> : null}
              {proposalQuery.isError ? <p>{getProposalServiceResultMessage(proposalQuery.error)}</p> : null}
              {decisionMessage ? <p>{decisionMessage}</p> : null}
              <div>
                <button type="button">
                  <IconMessageDots size={20} stroke={1.8} />
                  Submit Feedback
                </button>
                <button disabled={requestRevisionMutation.isPending} type="button" onClick={() => void requestRevision()}>
                  <IconRefresh size={20} stroke={1.8} />
                  {requestRevisionMutation.isPending ? 'Requesting...' : 'Request Revision'}
                </button>
                <button disabled={selectFinalMutation.isPending} type="button" onClick={() => void selectFinalProposal()}>
                  <IconCircleCheck size={20} stroke={1.8} />
                  {selectFinalMutation.isPending ? 'Selecting...' : 'Select This Proposal'}
                </button>
                <button type="button">
                  <IconCircleX size={20} stroke={1.8} />
                  Reject Proposal
                </button>
              </div>
            </section>

            <section className="customer-proposal-detail-card customer-proposal-detail-summary">
              <h2>Proposal Snapshot</h2>
              <div className="customer-proposal-detail-summary-grid">
                {proposalSummary.map((item) => (
                  <article key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </article>
                ))}
              </div>
            </section>

            <section className="customer-proposal-detail-card customer-proposal-detail-checklist">
              <h2>Before You Decide</h2>
              <ul>
                {decisionChecklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
        </div>        
      </div>
    </main>
    
  )
}

