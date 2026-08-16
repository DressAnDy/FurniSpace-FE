import {
  IconCalendar,
  IconChevronRight,
  IconHome,
  IconMapPin,
  IconPalette,
  IconRefresh,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { CustomerNavbar } from '@/features/CustomerPages/customercomponents';
import { getProjectServiceResultMessage, type ProjectStatus } from '@/services/api/projects';
import { getProposalServiceResultMessage, type ProposalDto } from '@/services/api/proposals';
import { useProjectDetail, useProjectProposals, useReopenProjectProposal } from '@/services/queries';

import { CustomerProjectProposalAccordionItem } from './CustomerProjectProposalAccordion';
import '../customerProjectList/CustomerProjectListPage.css';

export function CustomerProjectDetailPage() {
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const proposalIdFromUrl = searchParams.get('proposalId');
  const navigate = useNavigate();
  const projectQuery = useProjectDetail(projectId);
  const project = projectQuery.data;
  const reopenProposalMutation = useReopenProjectProposal();
  const proposalsQuery = useProjectProposals(
    {
      projectId: project?.projectId ?? '',
      page: 1,
      limit: 50,
    },
    { enabled: Boolean(project?.projectId) },
  );
  const proposals = useMemo(
    () => (proposalsQuery.data?.items ?? []).filter((proposal) => isCustomerVisibleProposal(proposal.status)),
    [proposalsQuery.data?.items],
  );
  const [expandedProposalId, setExpandedProposalId] = useState<string | null>(proposalIdFromUrl);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    if (!proposalIdFromUrl) {
      return;
    }

    setExpandedProposalId(proposalIdFromUrl);

    const frameId = window.requestAnimationFrame(() => {
      document.querySelector('.customer-project-detail-proposals')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [proposalIdFromUrl, proposals]);

  async function reopenProposalFlow() {
    if (!project) return;

    setMessage(null);

    try {
      await reopenProposalMutation.mutateAsync(project.projectId);
      setMessage({ tone: 'success', text: 'Project was reopened to proposal consulting.' });
      setExpandedProposalId(null);
      void projectQuery.refetch();
      void proposalsQuery.refetch();
    } catch (error) {
      setMessage({ tone: 'error', text: getProjectServiceResultMessage(error) });
    }
  }

  return (
    <main className="customer-project-list-page">
      <CustomerNavbar activeLabel="My Projects" classPrefix="customer-project-list" />

      <div className="customer-project-list-main">
        <div className="customer-project-list-breadcrumb">
          <Link to="/customer/dashboard">
            <IconHome size={16} stroke={1.8} />
          </Link>
          <IconChevronRight size={16} stroke={1.8} />
          <Link to="/customer/projects">My Projects</Link>
          <IconChevronRight size={16} stroke={1.8} />
          <span>{project?.projectCode ?? 'Project Detail'}</span>
        </div>

        {projectQuery.isLoading ? <section className="customer-project-list-state">Loading project detail...</section> : null}
        {projectQuery.isError ? <section className="customer-project-list-state is-error">{getProjectServiceResultMessage(projectQuery.error)}</section> : null}
        {message ? <section className={`customer-project-detail-message customer-project-detail-message-${message.tone}`}>{message.text}</section> : null}

        {project ? (
          <section className="customer-project-detail-card">
            <div className="customer-project-detail-hero">
              <span className={`customer-project-list-status customer-project-list-status-${getStageTone(project.status)}`}>
                {formatStatusLabel(project.status)}
              </span>
              <div className="customer-project-detail-hero-copy">
                <span className="customer-project-detail-kicker">Project Overview</span>
                <h1>{project.projectName}</h1>
                <p className="customer-project-detail-code">{project.projectCode}</p>
              </div>
            </div>

            <div className="customer-project-detail-body">
              {(project.status === 'NEED_BASIC_INFORMATION' || project.status === 'SUBMITTED' || project.status === 'COMPLETED') ? (
                <div className="customer-project-detail-actions">
                  {project.status === 'NEED_BASIC_INFORMATION' || project.status === 'SUBMITTED' ? (
                    <button type="button" onClick={() => navigate(`/customer/projects/${project.projectId}/edit`)}>
                      Update Information
                    </button>
                  ) : null}
                  {project.status === 'COMPLETED' ? (
                    <button type="button" onClick={() => navigate(`/customer/projects/${project.projectId}/feedback`)}>
                      Submit Feedback
                    </button>
                  ) : null}
                </div>
              ) : null}

              <div className="customer-project-detail-grid">
                <DetailBlock icon={IconCalendar} label="Submitted" value={formatDate(project.submittedAt)} />
                <DetailBlock icon={IconMapPin} label="Address" value={project.projectAddress ?? 'Not provided'} />
                <DetailBlock label="Business Type" value={project.businessType} />
                <DetailBlock label="Current Stage" value={getStageLabel(project.status)} />
                <DetailBlock label="Area" value={project.totalAreaSqm ? `${project.totalAreaSqm} sqm` : '-'} />
                <DetailBlock label="Floors" value={project.numberOfFloors ? String(project.numberOfFloors) : '-'} />
                <DetailBlock label="Minimum Budget" value={formatBudgetAmount(project.budgetMin)} />
                <DetailBlock label="Maximum Budget" value={formatBudgetAmount(project.budgetMax)} />
              </div>

              <section className="customer-project-detail-section">
                <h2>Requirements</h2>
                <p>{project.furnitureRequirement}</p>
                {project.description ? <p>{project.description}</p> : null}
              </section>

              <section className="customer-project-detail-links">
                <Link to="/customer/orders">Orders</Link>
                <Link to="/customer/schedules">Schedules</Link>
                <Link to="/customer/tracking">Delivery Tracking</Link>
              </section>

              <section className="customer-project-detail-proposals" aria-label="Design proposals">
                <header className="customer-project-detail-proposals-head">
                  <div>
                    <span className="customer-project-detail-proposals-icon">
                      <IconPalette size={18} stroke={1.8} />
                    </span>
                    <div>
                      <h2>Design Proposals</h2>
                      <p>Review published design options for this project.</p>
                    </div>
                  </div>
                  <div className="customer-project-detail-proposals-tools">
                    <span className="customer-project-detail-proposals-count">
                      {proposals.length} option{proposals.length === 1 ? '' : 's'}
                    </span>
                    {canReopenProjectProposal(project.status) ? (
                      <button
                        className="customer-project-detail-reopen-button"
                        type="button"
                        disabled={reopenProposalMutation.isPending}
                        onClick={() => void reopenProposalFlow()}
                      >
                        <IconRefresh size={16} stroke={1.8} />
                        {reopenProposalMutation.isPending ? 'Reopening...' : 'Reopen Proposal'}
                      </button>
                    ) : null}
                  </div>
                </header>

                {proposalsQuery.isLoading ? <p className="customer-project-detail-proposals-state">Loading proposals...</p> : null}
                {proposalsQuery.isError ? (
                  <p className="customer-project-detail-proposals-state is-error">
                    {getProposalServiceResultMessage(proposalsQuery.error)}
                  </p>
                ) : null}
                {!proposalsQuery.isLoading && !proposalsQuery.isError && proposals.length === 0 ? (
                  <p className="customer-project-detail-proposals-state">
                    No design proposal has been published for this project yet.
                  </p>
                ) : null}

                <div className="customer-project-detail-proposal-list">
                  {proposals.map((proposal) => (
                    <CustomerProjectProposalAccordionItem
                      expanded={expandedProposalId === proposal.proposalId}
                      key={proposal.proposalId}
                      projectId={project.projectId}
                      proposal={proposal}
                      onToggle={() => {
                        setExpandedProposalId((current) => (
                          current === proposal.proposalId ? null : proposal.proposalId
                        ));
                      }}
                    />
                  ))}
                </div>
              </section>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function DetailBlock({
  icon: IconComponent,
  label,
  value,
}: {
  icon?: typeof IconCalendar;
  label: string;
  value: string;
}) {
  return (
    <article className="customer-project-detail-block">
      <span>{label}</span>
      <strong>
        {IconComponent ? <IconComponent size={16} stroke={1.8} /> : null}
        {value}
      </strong>
    </article>
  );
}

function isCustomerVisibleProposal(status: ProposalDto['status']) {
  return ['PUBLISHED', 'REVISION_REQUESTED', 'SELECTED', 'REJECTED'].includes(status);
}

function getStageLabel(status: ProjectStatus) {
  const labels: Partial<Record<ProjectStatus, string>> = {
    SUBMITTED: 'Submitted',
    NEED_BASIC_INFORMATION: 'Need Info',
    IN_CONSULTATION: 'In Consultation',
    PROPOSAL_CONSULTING: 'Proposal Review',
    PROPOSAL_SELECTED: 'Proposal Selected',
    QUOTATION_SENT: 'Quotation Sent',
    ORDER_CONFIRMED: 'Order Confirmed',
    IN_PRODUCTION: 'In Production',
    DELIVERING: 'Delivering',
    DELIVERED: 'Awaiting Sales Completion',
    COMPLETED: 'Completed',
  };

  return labels[status] ?? formatStatusLabel(status);
}

function getStageTone(status: ProjectStatus) {
  if (status === 'COMPLETED' || status === 'DELIVERED') return 'green';
  if (status === 'REJECTED') return 'gold';
  return 'stone';
}

function canReopenProjectProposal(status: ProjectStatus) {
  return status === 'PROPOSAL_SELECTED'
    || status === 'QUOTATION_SENT'
    || status === 'ORDER_CONFIRMED';
}

function formatStatusLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatBudgetAmount(value: number | null | undefined) {
  if (value == null) {
    return '-';
  }

  return `${new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(value)} VNĐ`;
}
