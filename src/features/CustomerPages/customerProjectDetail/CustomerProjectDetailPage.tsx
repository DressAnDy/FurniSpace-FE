import {
  IconArrowRight,
  IconCalendar,
  IconChevronRight,
  IconHome,
  IconMapPin,
} from '@tabler/icons-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { CustomerNavbar } from '@/features/CustomerPages/customercomponents';
import { getProjectServiceResultMessage, type ProjectStatus } from '@/services/api/projects';
import { useProjectDetail } from '@/services/queries';

import '../customerProjectList/CustomerProjectListPage.css';

export function CustomerProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const projectQuery = useProjectDetail(projectId);
  const project = projectQuery.data;

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

        {project ? (
          <section className="customer-project-detail-card">
            <header className="customer-project-detail-header">
              <div>
                <span className={`customer-project-list-status customer-project-list-status-${getStageTone(project.status)}`}>
                  {formatStatusLabel(project.status)}
                </span>
                <h1>{project.projectName}</h1>
                <p>{project.projectCode}</p>
              </div>
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
                <button type="button" onClick={() => navigate(`/customer/proposals?projectId=${project.projectId}`)}>
                  View Proposals
                  <IconArrowRight size={16} stroke={1.8} />
                </button>
              </div>
            </header>

            <div className="customer-project-detail-grid">
              <DetailBlock icon={IconCalendar} label="Submitted" value={formatDate(project.submittedAt)} />
              <DetailBlock icon={IconMapPin} label="Address" value={project.projectAddress ?? 'Not provided'} />
              <DetailBlock label="Business Type" value={project.businessType} />
              <DetailBlock label="Current Stage" value={getStageLabel(project.status)} />
              <DetailBlock label="Area" value={project.totalAreaSqm ? `${project.totalAreaSqm} sqm` : '-'} />
              <DetailBlock label="Floors" value={project.numberOfFloors ? String(project.numberOfFloors) : '-'} />
            </div>

            <section className="customer-project-detail-section">
              <h2>Requirements</h2>
              <p>{project.furnitureRequirement}</p>
              {project.description ? <p>{project.description}</p> : null}
            </section>

            <section className="customer-project-detail-links">
              <Link to={`/customer/proposals?projectId=${project.projectId}`}>Design Proposals</Link>
              <Link to="/customer/orders">Orders</Link>
              <Link to="/customer/schedules">Schedules</Link>
              <Link to="/customer/tracking">Delivery Tracking</Link>
            </section>
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
    COMPLETED: 'Completed',
  };

  return labels[status] ?? formatStatusLabel(status);
}

function getStageTone(status: ProjectStatus) {
  if (status === 'COMPLETED' || status === 'DELIVERED') return 'green';
  if (status === 'REJECTED' || status === 'PRODUCTION_BLOCKED') return 'gold';
  return 'stone';
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
