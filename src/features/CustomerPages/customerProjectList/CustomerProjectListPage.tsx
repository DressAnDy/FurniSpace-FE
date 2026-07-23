import {
  IconArrowRight,
  IconCalendar,
  IconChevronRight,
  IconHome,
  IconMessageCircle,
  IconSearch,
  IconX,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import './CustomerProjectListPage.css';
import { CustomerNavbar } from '@/features/CustomerPages/customercomponents';
import { PaymentCollectionModal } from '@/features/payments';
import { ProjectChatPanel } from '@/features/projectChat/ProjectChatPanel';
import type { PaymentDetailDto } from '@/services/api/payments';
import type { ProjectListItemDto, ProjectStatus } from '@/services/api/projects';
import { usePayments } from '@/services/queries';
import { useProjectList } from '@/services/queries/useProjects';

const PROJECT_PAGE_SIZE = 6;

export function CustomerProjectListPage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<ProjectStatus | ''>('');
  const [page, setPage] = useState(1);
  const [chatProject, setChatProject] = useState<ProjectListItemDto | null>(null);
  const projectsQuery = useProjectList({
    search: keyword,
    status: status || null,
    page,
    limit: PROJECT_PAGE_SIZE,
  });
  const projects = projectsQuery.data?.items ?? [];
  const totalProjects = projectsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalProjects / PROJECT_PAGE_SIZE));
  const showingFrom = totalProjects === 0 ? 0 : (page - 1) * PROJECT_PAGE_SIZE + 1;
  const showingTo = Math.min(page * PROJECT_PAGE_SIZE, totalProjects);

  useEffect(() => {
    setPage(1);
  }, [keyword, status]);

  return (
    <main className="customer-project-list-page">
      <CustomerNavbar activeLabel="My Projects" classPrefix="customer-project-list" />

      <div className="customer-project-list-main">
        <div className="customer-project-list-breadcrumb">
          <a href="/customer/dashboard">
            <IconHome size={16} stroke={1.8} />
          </a>
          <IconChevronRight size={16} stroke={1.8} />
          <span>My Projects</span>
        </div>

        <section className="customer-project-list-heading">
          <div>
            <h1>My Projects</h1>
            <p>View and manage all your interior design projects</p>
          </div>
          <button type="button" onClick={() => navigate('/customer/project-request')}>Create New Project</button>
        </section>

        <section className="customer-project-list-filters" aria-label="Project filters">
          <label>
            <IconSearch size={17} stroke={1.8} />
            <input
              type="search"
              placeholder="Search projects..."
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus | '')}>
            <option value="">Status</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="NEED_BASIC_INFORMATION">Need Basic Information</option>
            <option value="IN_CONSULTATION">In Consultation</option>
            <option value="WAITING_FOR_DESIGNER_ASSIGNMENT">Waiting For Designer</option>
            <option value="MEASUREMENT_REQUIRED">Measurement Required</option>
            <option value="SPACE_VERIFIED">Space Verified</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </section>

        <section className="customer-project-list-grid" aria-label="Projects">
          {projectsQuery.isLoading ? <p className="customer-project-list-state">Loading projects...</p> : null}
          {projectsQuery.isError ? <p className="customer-project-list-state customer-project-list-state-error">Cannot load projects. Please try again.</p> : null}
          {!projectsQuery.isLoading && !projectsQuery.isError && projects.length === 0 ? (
            <p className="customer-project-list-state">No projects match your current filters.</p>
          ) : null}
          {projects.map((project) => (
            <ProjectCard
              key={project.projectId}
              project={project}
              onOpenChat={() => setChatProject(project)}
              onPaymentCompleted={() => void projectsQuery.refetch()}
            />
          ))}
        </section>

        <footer className="customer-project-list-pagination">
          <p>
            Showing <strong>{showingFrom}-{showingTo}</strong> of <strong>{totalProjects}</strong> projects
          </p>
          <div>
            <button disabled={page <= 1 || projectsQuery.isFetching} type="button" onClick={() => setPage((current) => Math.max(1, current - 1))}>
              Previous
            </button>
            <button className="customer-project-list-page-active" type="button" aria-current="page">
              {page}
            </button>
            <button disabled={page >= totalPages || projectsQuery.isFetching} type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
              Next
            </button>
          </div>
        </footer>
      </div>

      {chatProject ? (
        <div className="customer-project-chat-modal" role="dialog" aria-modal="true" aria-label={`${chatProject.projectName} chat`}>
          <div className="customer-project-chat-backdrop" onClick={() => setChatProject(null)} />
          <div className="customer-project-chat-dialog">
            <button className="customer-project-chat-close" type="button" aria-label="Close chat" onClick={() => setChatProject(null)}>
              <IconX size={18} />
            </button>
            <ProjectChatPanel
              projectCode={chatProject.projectCode}
              projectId={chatProject.projectId}
              title={`${chatProject.projectName} Chat`}
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}

type ProjectCardProps = {
  onOpenChat: () => void;
  onPaymentCompleted: () => void;
  project: ProjectListItemDto;
};

function ProjectCard({ onOpenChat, onPaymentCompleted, project }: ProjectCardProps) {
  const navigate = useNavigate();
  const [startFeePayment, setStartFeePayment] = useState<PaymentDetailDto | null>(null);
  const stage = getProjectStage(project.status);
  const needsInformationUpdate = project.status === 'NEED_BASIC_INFORMATION';
  const startFeePaymentsQuery = usePayments(
    {
      projectId: project.projectId,
      paymentType: 'PROJECT_START_FEE',
    },
    {
      enabled: !project.assignedDesignerId && project.status !== 'SUBMITTED' && project.status !== 'REJECTED',
    },
  );
  const projectStartFeePayment = useMemo(() => {
    const payments = startFeePaymentsQuery.data?.items ?? [];

    return payments.find((payment) => isCollectablePaymentStatus(normalizePaymentStatus(payment.status))) ?? payments[0] ?? null;
  }, [startFeePaymentsQuery.data?.items]);
  const startFeePaymentStatus = normalizePaymentStatus(projectStartFeePayment?.status);
  const canPayStartFee = Boolean(projectStartFeePayment && isCollectablePaymentStatus(startFeePaymentStatus));

  return (
    <article className="customer-project-list-card">
      <div className="customer-project-list-card-cover">
        <div>
          <strong>{project.businessType}</strong>
          <span>{project.projectCode}</span>
        </div>
        <span className={`customer-project-list-status customer-project-list-status-${stage.tone}`}>
          {stage.label}
        </span>
      </div>

      <div className="customer-project-list-card-body">
        <h2>{project.projectName}</h2>
        <p className="customer-project-list-code">{project.projectCode}</p>

        <div className="customer-project-list-detail-stack">
          <p>
            <IconCalendar size={16} stroke={1.8} />
            Submitted: {formatDate(project.submittedAt)}
          </p>
        </div>

        <div className="customer-project-list-stage">
          <span>Current Stage</span>
          <strong>{stage.label}</strong>
        </div>

        {projectStartFeePayment ? (
          <div className={`customer-project-start-fee ${canPayStartFee ? 'customer-project-start-fee-due' : ''}`}>
            <span>Project Start Fee</span>
            <strong>{formatPaymentStatus(startFeePaymentStatus)}</strong>
          </div>
        ) : null}

        <div className="customer-project-list-actions">
          <button
            type="button"
            onClick={() => {
              if (canPayStartFee && projectStartFeePayment) {
                setStartFeePayment(projectStartFeePayment);
                return;
              }

              navigate(needsInformationUpdate ? `/customer/projects/${project.projectId}/edit` : `/customer/proposals?projectId=${project.projectId}`);
            }}
          >
            {canPayStartFee ? 'Pay Start Fee' : needsInformationUpdate ? 'Update Information' : 'Open Project'}
            <IconArrowRight size={16} stroke={1.8} />
          </button>
          <button type="button" onClick={onOpenChat}>
            <IconMessageCircle size={16} stroke={1.8} />
            Chat
          </button>
        </div>
      </div>

      <PaymentCollectionModal
        payment={startFeePayment}
        title="Project Start Fee"
        completionTitle="Start fee paid"
        completionDescription="Your project can now continue to designer assignment."
        continueLabel="Back to Projects"
        onClose={() => setStartFeePayment(null)}
        onContinue={() => {
          setStartFeePayment(null);
          onPaymentCompleted();
        }}
        onPaid={() => {
          void startFeePaymentsQuery.refetch();
          onPaymentCompleted();
        }}
      />
    </article>
  );
}

function getProjectStage(status: ProjectListItemDto['status']) {
  const labels: Record<ProjectListItemDto['status'], { label: string; tone: string }> = {
    SUBMITTED: { label: 'Submitted', tone: 'gold' },
    NEED_BASIC_INFORMATION: { label: 'Need Info', tone: 'gold' },
    IN_CONSULTATION: { label: 'In Consultation', tone: 'stone' },
    WAITING_FOR_DESIGNER_ASSIGNMENT: { label: 'Waiting Designer', tone: 'stone' },
    MEASUREMENT_REQUIRED: { label: 'Measurement Required', tone: 'stone' },
    SPACE_VERIFIED: { label: 'Space Verified', tone: 'green' },
    PROPOSAL_CONSULTING: { label: 'Proposal Consulting', tone: 'gold' },
    PROPOSAL_SELECTED: { label: 'Proposal Selected', tone: 'green' },
    QUOTATION_SENT: { label: 'Quotation Sent', tone: 'gold' },
    QUOTATION_REVISION_REQUESTED: { label: 'Quotation Revision', tone: 'gold' },
    ORDER_CONFIRMED: { label: 'Order Confirmed', tone: 'green' },
    IN_PRODUCTION: { label: 'In Production', tone: 'stone' },
    PRODUCTION_BLOCKED: { label: 'Production Blocked', tone: 'gold' },
    READY_FOR_DELIVERY: { label: 'Ready For Delivery', tone: 'green' },
    DELIVERING: { label: 'Delivering', tone: 'green' },
    DELIVERED: { label: 'Delivered', tone: 'green' },
    COMPLETED: { label: 'Completed', tone: 'green' },
    REJECTED: { label: 'Rejected', tone: 'stone' },
  };

  return labels[status];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

const paymentStatusByNumber: Record<number, string> = {
  0: 'PENDING',
  1: 'PROCESSING',
  2: 'PARTIALLY_PAID',
  3: 'PAID',
  4: 'FAILED',
  5: 'CANCELLED',
  6: 'EXPIRED',
  7: 'REFUNDED',
};

function isCollectablePaymentStatus(status?: string | null) {
  return status === 'PENDING' || status === 'PROCESSING' || status === 'PARTIALLY_PAID';
}

function normalizePaymentStatus(value: unknown) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const numeric = Number(trimmed);

    if (trimmed && Number.isInteger(numeric) && numeric in paymentStatusByNumber) {
      return paymentStatusByNumber[numeric];
    }

    return trimmed ? trimmed.toUpperCase() : null;
  }

  if (typeof value === 'number' && Number.isInteger(value) && value in paymentStatusByNumber) {
    return paymentStatusByNumber[value];
  }

  if (value && typeof value === 'object') {
    const candidate = value as { name?: unknown; value?: unknown; status?: unknown };

    return normalizePaymentStatus(candidate.name ?? candidate.value ?? candidate.status);
  }

  return null;
}

function formatPaymentStatus(status?: string | null) {
  if (!status) return 'Not created';

  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
