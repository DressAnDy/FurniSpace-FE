import { IconArrowLeft } from '@tabler/icons-react';
import { FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { ProjectStatusBadge, ProjectTimeline, SaleNavbar, SaleSidebar } from '@/features/SalePages/salecomponents';
import type { ProjectDto, ProjectStatus } from '@/services/api/projects';
import { getProjectServiceResultMessage } from '@/services/api/projects';
import { useAssignSalesToProject, useProjectDetail, useUpdateProjectStatus } from '@/services/queries/useProjects';

import { ChatTab, CustomerInfoTab, FilesAttachmentsTab, OverviewTab, SchedulesTab } from './tabs';
import './ProjectDetail.css';

type ProjectDetailTab = 'overview' | 'customer' | 'files' | 'chat' | 'schedules';

export type ProjectDetailProject = ProjectDto;

const baseTabs: Array<{ id: ProjectDetailTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'customer', label: 'Customer Info' },
  { id: 'files', label: 'Files & Attachments' },
  { id: 'chat', label: 'Chat' },
];

const assignedProjectTabs: Array<{ id: ProjectDetailTab; label: string }> = [...baseTabs, { id: 'schedules', label: 'Schedules' }];

const projectStatusOptions: ProjectStatus[] = [
  'SUBMITTED',
  'IN_CONSULTATION',
  'NEED_BASIC_INFORMATION',
  'WAITING_FOR_DESIGNER_ASSIGNMENT',
  'MEASUREMENT_REQUIRED',
  'SPACE_VERIFIED',
  'PROPOSAL_DRAFTING',
  'WAITING_FOR_CUSTOMER_REVIEW',
  'REVISION_REQUESTED',
  'PROPOSAL_SELECTED',
  'QUOTATION_SENT',
  'QUOTATION_REVISION_REQUESTED',
  'ORDER_CONFIRMED',
  'IN_PRODUCTION',
  'PRODUCTION_BLOCKED',
  'READY_FOR_DELIVERY',
  'DELIVERING',
  'DELIVERED',
  'COMPLETED',
  'REJECTED',
];

const timelineSteps = [
  'Submitted',
  'Need Basic Information',
  'In Consultation',
  'Waiting For Designer Assignment',
  'Measurement Required',
  'Space Verified',
  'Proposal Drafting',
  'Quotation Sent',
  'Order Confirmed',
  'Completed',
];

const statusStepMap: Record<string, string> = {
  SUBMITTED: 'Submitted',
  NEED_BASIC_INFORMATION: 'Need Basic Information',
  IN_CONSULTATION: 'In Consultation',
  WAITING_FOR_DESIGNER_ASSIGNMENT: 'Waiting For Designer Assignment',
  MEASUREMENT_REQUIRED: 'Measurement Required',
  SPACE_VERIFIED: 'Space Verified',
  PROPOSAL_DRAFTING: 'Proposal Drafting',
  QUOTATION_SENT: 'Quotation Sent',
  ORDER_CONFIRMED: 'Order Confirmed',
  COMPLETED: 'Completed',
};

const projectStatusWorkflowOrder: ProjectStatus[] = [
  'SUBMITTED',
  'NEED_BASIC_INFORMATION',
  'IN_CONSULTATION',
  'WAITING_FOR_DESIGNER_ASSIGNMENT',
  'MEASUREMENT_REQUIRED',
  'SPACE_VERIFIED',
  'PROPOSAL_DRAFTING',
  'WAITING_FOR_CUSTOMER_REVIEW',
  'REVISION_REQUESTED',
  'PROPOSAL_SELECTED',
  'QUOTATION_SENT',
  'QUOTATION_REVISION_REQUESTED',
  'ORDER_CONFIRMED',
  'IN_PRODUCTION',
  'PRODUCTION_BLOCKED',
  'READY_FOR_DELIVERY',
  'DELIVERING',
  'DELIVERED',
  'COMPLETED',
  'REJECTED',
];

export function ProjectDetail() {
  const { projectId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ProjectDetailTab>('overview');
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus>('WAITING_FOR_DESIGNER_ASSIGNMENT');
  const [statusMessage, setStatusMessage] = useState('');
  const projectQuery = useProjectDetail(projectId);
  const assignSalesMutation = useAssignSalesToProject();
  const updateProjectStatusMutation = useUpdateProjectStatus();
  const project = projectQuery.data;
  const isAssignedProjectRoute = location.pathname.startsWith('/sales/assigned-projects');
  const activeSidebarLabel = isAssignedProjectRoute ? 'Assigned Projects' : 'Project Request Queue';
  const visibleTabs = isAssignedProjectRoute ? assignedProjectTabs : baseTabs;
  const backPath = isAssignedProjectRoute ? '/sales/assigned-projects' : '/sales/project-requests';
  const backLabel = isAssignedProjectRoute ? 'Back to Assigned Projects' : 'Back to Project Request Queue';

  useEffect(() => {
    if (!isAssignedProjectRoute && activeTab === 'schedules') {
      setActiveTab('overview');
    }
  }, [activeTab, isAssignedProjectRoute]);

  useEffect(() => {
    if (project?.status === 'IN_CONSULTATION') {
      setSelectedStatus('WAITING_FOR_DESIGNER_ASSIGNMENT');
      return;
    }

    if (project) {
      setSelectedStatus(project.status);
    }
  }, [project]);

  async function handleUpdateStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage('');

    if (!project) return;

    if (selectedStatus === project.status) {
      setStatusMessage('Please choose a new project status.');
      return;
    }

    try {
      await updateProjectStatusMutation.mutateAsync({
        projectId: project.projectId,
        status: selectedStatus,
        note: 'Project status updated by sales from project detail.',
      });
      setStatusMessage('Project status updated successfully.');
    } catch (error) {
      setStatusMessage(getProjectServiceResultMessage(error));
    }
  }

  const renderActiveTab = () => {
    if (!project) return null;
    if (activeTab === 'overview') return <OverviewTab project={project} showAssignedTeam={isAssignedProjectRoute} />;
    if (activeTab === 'customer') return <CustomerInfoTab project={project} />;
    if (activeTab === 'files') return <FilesAttachmentsTab projectId={project.projectId} />;
    if (activeTab === 'schedules' && isAssignedProjectRoute) return <SchedulesTab project={project} />;
    return <ChatTab project={project} />;
  };

  return (
    <div className="project-detail-shell">
      <SaleSidebar activeLabel={activeSidebarLabel} />
      <div className="project-detail-content">
        <SaleNavbar />
        <main className="project-detail-main">
          <section className="project-detail-header">
            <div>
              <button className="project-detail-back-button" type="button" onClick={() => navigate(backPath)}>
                <IconArrowLeft size={18} />
                <span>{backLabel}</span>
              </button>
              <div className="project-detail-title-row">
                <h2>{project?.projectName ?? 'Project Detail'}</h2>
                {project ? <ProjectStatusBadge status={project.status} /> : null}
              </div>
              {project ? (
                <div className="project-detail-subtitle">
                  <span>{project.projectCode}</span>
                  <span>-</span>
                  <span>{project.businessType}</span>
                  <span>-</span>
                  <span>Submitted: {formatDate(project.submittedAt)}</span>
                </div>
              ) : null}
            </div>
            {project ? (
              <div className="project-detail-header-actions">
                {isAssignedProjectRoute && hasPassedNeedBasicInformation(project.status) ? (
                  <form className="project-detail-status-update" onSubmit={handleUpdateStatus}>
                    <label>
                      <span>Update Status</span>
                      <select
                        value={selectedStatus}
                        disabled={updateProjectStatusMutation.isPending}
                        onChange={(event) => {
                          setSelectedStatus(event.target.value as ProjectStatus);
                          setStatusMessage('');
                        }}
                      >
                        {projectStatusOptions.map((status) => (
                          <option key={status} value={status} disabled={!canUpdateProjectStatus(project.status, status)}>
                            {formatStatusLabel(status)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button type="submit" disabled={updateProjectStatusMutation.isPending || !canUpdateProjectStatus(project.status, selectedStatus)}>
                      {updateProjectStatusMutation.isPending ? 'Updating...' : 'Update Status'}
                    </button>
                    {statusMessage ? <p className={statusMessage.toLowerCase().includes('success') ? 'project-detail-status-message' : 'project-detail-status-message project-detail-status-message-error'}>{statusMessage}</p> : null}
                  </form>
                ) : (
                  <button type="button" disabled>
                    Request More Info
                  </button>
                )}
                {project.status === 'SUBMITTED' || project.status === 'NEED_BASIC_INFORMATION' ? (
                  <button
                    type="button"
                    disabled={assignSalesMutation.isPending}
                    onClick={() =>
                      assignSalesMutation.mutate({
                        projectId: project.projectId,
                        note: 'Accepted from project detail.',
                      })
                    }
                  >
                    {assignSalesMutation.isPending ? 'Accepting...' : 'Accept Request'}
                  </button>
                ) : null}
              </div>
            ) : null}
          </section>

          {projectQuery.isLoading ? <section className="project-detail-card project-detail-state">Loading project detail...</section> : null}
          {projectQuery.isError ? (
            <section className="project-detail-card project-detail-state">
              {getProjectServiceResultMessage(projectQuery.error)}
              <p>
                If this is a submitted project that has not been accepted yet, the current guide says Sales detail access may require the project to be assigned first.
              </p>
            </section>
          ) : null}

          {project ? (
            <>
              <ProjectTimeline currentStep={statusStepMap[project.status] ?? 'Submitted'} steps={timelineSteps} dates={getTimelineDates(project)} />

              <section className="project-detail-tabs-section">
                <div className="project-detail-tabs">
                  {visibleTabs.map((tab) => (
                    <button key={tab.id} className={activeTab === tab.id ? 'project-detail-tab-active' : ''} type="button" onClick={() => setActiveTab(tab.id)}>
                      {tab.label}
                    </button>
                  ))}
                </div>
                {renderActiveTab()}
              </section>
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function getTimelineDates(project: ProjectDto) {
  const dates: Partial<Record<string, string>> = {};

  if (project.submittedAt) {
    dates.Submitted = formatDate(project.submittedAt);
  }

  return dates;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function hasPassedNeedBasicInformation(status: ProjectStatus) {
  return projectStatusWorkflowOrder.indexOf(status) > projectStatusWorkflowOrder.indexOf('NEED_BASIC_INFORMATION');
}

function canUpdateProjectStatus(currentStatus: ProjectStatus, nextStatus: ProjectStatus) {
  return currentStatus === 'IN_CONSULTATION' && nextStatus === 'WAITING_FOR_DESIGNER_ASSIGNMENT';
}

function formatStatusLabel(status: ProjectStatus) {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
