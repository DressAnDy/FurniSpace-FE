import {
  IconArrowRight,
  IconCalendar,
  IconChevronRight,
  IconCurrencyDollar,
  IconFilter,
  IconHome,
  IconMapPin,
  IconMessageCircle,
  IconSearch,
  IconUsers,
  IconX,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import './CustomerProjectListPage.css';
import { CustomerNavbar } from '@/features/CustomerPages/customercomponents';
import { mockCustomerProjects } from '@/features/CustomerPages/mockData';
import { ProjectChatPanel } from '@/features/projectChat/ProjectChatPanel';
import type { ProjectListItemDto, ProjectStatus } from '@/services/api/projects';
import { useProjectList } from '@/services/queries/useProjects';

export function CustomerProjectListPage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<ProjectStatus | ''>('');
  const [businessType, setBusinessType] = useState('');
  const [chatProject, setChatProject] = useState<ProjectListItemDto | null>(null);
  const projectsQuery = useProjectList({
    search: keyword,
    status: status || null,
    page: 1,
    limit: 50,
  });
  const apiProjects = projectsQuery.data?.items ?? [];
  const usingMockData = projectsQuery.isError || apiProjects.length === 0;
  const projects = usingMockData ? mockCustomerProjects : apiProjects;
  const visibleProjects = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return projects.filter((project) => {
      const searchableFields = [project.projectCode, project.projectName, project.businessType, project.status];
      const matchesKeyword = !normalizedKeyword || searchableFields.some((value) => value.toLowerCase().includes(normalizedKeyword));
      const matchesType = !businessType || project.businessType === businessType;

      return matchesKeyword && matchesType;
    });
  }, [businessType, keyword, projects]);

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
          <select value={businessType} onChange={(event) => setBusinessType(event.target.value)}>
            <option value="">Project type</option>
            <option value="Cafe">Cafe</option>
            <option value="Retail">Retail</option>
            <option value="Office">Office</option>
            <option value="Restaurant">Restaurant</option>
            <option value="Showroom">Showroom</option>
          </select>
          <button type="button">
            <IconFilter size={17} stroke={1.8} />
            More Filters
          </button>
        </section>

        <section className="customer-project-list-grid" aria-label="Projects">
          {projectsQuery.isLoading ? <p className="customer-project-list-state">Loading projects...</p> : null}
          {!projectsQuery.isLoading && usingMockData ? (
            <p className="customer-project-list-state">Using demo projects for UI preview.</p>
          ) : null}
          {!projectsQuery.isLoading && !projectsQuery.isError && visibleProjects.length === 0 ? (
            <p className="customer-project-list-state">No projects found. Create a project request to start the flow.</p>
          ) : null}
          {visibleProjects.map((project) => (
            <ProjectCard key={project.projectId} project={project} onOpenChat={() => setChatProject(project)} />
          ))}
        </section>

        <footer className="customer-project-list-pagination">
          <p>
            Showing <strong>{visibleProjects.length}</strong> of <strong>{projects.length}</strong> projects
          </p>
          <div>
            <button disabled type="button">
              Previous
            </button>
            <button className="customer-project-list-page-active" type="button">
              1
            </button>
            <button disabled type="button">Next</button>
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
  project: ProjectListItemDto;
};

function ProjectCard({ onOpenChat, project }: ProjectCardProps) {
  const navigate = useNavigate();
  const stage = getProjectStage(project.status);
  const needsInformationUpdate = project.status === 'NEED_BASIC_INFORMATION';

  return (
    <article className="customer-project-list-card">
      <div className="customer-project-list-card-cover">
        <div>
          <strong>{project.businessType}</strong>
          <span>{formatDate(project.submittedAt)}</span>
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
            <IconMapPin size={16} stroke={1.8} />
            Project address available in detail
          </p>
          <p>
            <IconCurrencyDollar size={16} stroke={1.8} />
            Budget available in detail
          </p>
          <p>
            <IconCalendar size={16} stroke={1.8} />
            Submitted: {formatDate(project.submittedAt)}
          </p>
        </div>

        <div className="customer-project-list-people">
          <div>
            <IconUsers size={16} stroke={1.8} />
            <span>Sales</span>
            <strong>{project.assignedSalesId ? 'Assigned' : 'Pending'}</strong>
          </div>
          <div>
            <IconUsers size={16} stroke={1.8} />
            <span>Designer</span>
            <strong>{project.assignedDesignerId ? 'Assigned' : 'Pending'}</strong>
          </div>
        </div>

        <div className="customer-project-list-stage">
          <span>Current Stage</span>
          <strong>{stage.label}</strong>
        </div>

        <div className="customer-project-list-actions">
          <button
            type="button"
            onClick={() => navigate(needsInformationUpdate ? `/customer/projects/${project.projectId}/edit` : '/customer/proposals')}
          >
            {needsInformationUpdate ? 'Update Information' : 'Open Project'}
            <IconArrowRight size={16} stroke={1.8} />
          </button>
          <button type="button" onClick={onOpenChat}>
            <IconMessageCircle size={16} stroke={1.8} />
            Chat
          </button>
        </div>
      </div>
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
    PROPOSAL_DRAFTING: { label: 'Proposal Drafting', tone: 'stone' },
    WAITING_FOR_CUSTOMER_REVIEW: { label: 'Awaiting Your Review', tone: 'gold' },
    REVISION_REQUESTED: { label: 'Revision Requested', tone: 'gold' },
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
