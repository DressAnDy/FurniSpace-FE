import { IconArrowLeft, IconBan, IconInfoCircle, IconLoader2, IconRefresh, IconX } from '@tabler/icons-react';
import { FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { ProjectStatusBadge, ProjectTimeline, SaleNavbar, SaleSidebar } from '@/features/SalePages/salecomponents';
import type { ProjectDto, ProjectStatus } from '@/services/api/projects';
import { getProjectServiceResultMessage } from '@/services/api/projects';
import { useAssignSalesToProject, useProjectDetail, useRejectProject, useReopenProjectProposal, useRequestProjectInformation } from '@/services/queries/useProjects';

import { ChatTab, CustomerInfoTab, FilesAttachmentsTab, OverviewTab, SchedulesTab } from './tabs';
import './ProjectDetail.css';

type ProjectDetailTab = 'overview' | 'customer' | 'files' | 'chat' | 'schedules';

export type ProjectDetailProject = ProjectDto;

const reviewTabs: Array<{ id: ProjectDetailTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'customer', label: 'Customer Info' },
];

const baseTabs: Array<{ id: ProjectDetailTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'customer', label: 'Customer Info' },
  { id: 'files', label: 'Files & Attachments' },
  { id: 'chat', label: 'Chat' },
];

const assignedProjectTabs: Array<{ id: ProjectDetailTab; label: string }> = [
  ...baseTabs,
  { id: 'schedules', label: 'Schedules' },
];

const timelineSteps = [
  'Submitted',
  'In Consultation',
  'Need Basic Information',
  'Waiting For Designer Assignment',
  'Measurement Required',
  'Space Verified',
  'Proposal Consulting',
  'Quotation Sent',
  'Order Confirmed',
  'Completed',
];

const rejectedTimelineSteps = ['Submitted', 'In Consultation', 'Rejected'];

const statusStepMap: Record<string, string> = {
  SUBMITTED: 'Submitted',
  NEED_BASIC_INFORMATION: 'Need Basic Information',
  IN_CONSULTATION: 'In Consultation',
  WAITING_FOR_DESIGNER_ASSIGNMENT: 'Waiting For Designer Assignment',
  MEASUREMENT_REQUIRED: 'Measurement Required',
  SPACE_VERIFIED: 'Space Verified',
  PROPOSAL_CONSULTING: 'Proposal Consulting',
  QUOTATION_SENT: 'Quotation Sent',
  ORDER_CONFIRMED: 'Order Confirmed',
  REJECTED: 'Rejected',
  COMPLETED: 'Completed',
};

export function ProjectDetail() {
  const { projectId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ProjectDetailTab>('overview');
  const [statusMessage, setStatusMessage] = useState('');
  const [isRequestInfoModalOpen, setIsRequestInfoModalOpen] = useState(false);
  const [requestInfoMessage, setRequestInfoMessage] = useState('');
  const projectQuery = useProjectDetail(projectId);
  const assignSalesMutation = useAssignSalesToProject();
  const requestInformationMutation = useRequestProjectInformation();
  const rejectProjectMutation = useRejectProject();
  const reopenProposalMutation = useReopenProjectProposal();
  const project = projectQuery.data;
  const isAssignedProjectRoute = location.pathname.startsWith('/sales/assigned-projects');
  const activeSidebarLabel = isAssignedProjectRoute ? 'Assigned Projects' : 'Project Request Queue';
  const hasConsultationAccess = Boolean(project && project.status !== 'SUBMITTED');
  const visibleTabs = hasConsultationAccess ? (isAssignedProjectRoute ? assignedProjectTabs : baseTabs) : reviewTabs;
  const backPath = isAssignedProjectRoute ? '/sales/assigned-projects' : '/sales/project-requests';
  const backLabel = isAssignedProjectRoute ? 'Back to Assigned Projects' : 'Back to Project Request Queue';

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab('overview');
    }
  }, [activeTab, visibleTabs]);

  async function handleConsultationDecision(status: Extract<ProjectStatus, 'NEED_BASIC_INFORMATION' | 'REJECTED'>) {
    setStatusMessage('');

    if (!project) return;

    if (status === 'NEED_BASIC_INFORMATION') {
      setRequestInfoMessage('');
      setIsRequestInfoModalOpen(true);
      return;
    }

    try {
      await rejectProjectMutation.mutateAsync({
        projectId: project.projectId,
        note: getStatusUpdateNote(status),
      });
      setStatusMessage('Project status updated successfully.');
    } catch (error) {
      setStatusMessage(getProjectServiceResultMessage(error));
    }
  }

  async function handleRequestInformationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage('');

    if (!project) return;

    const trimmedMessage = requestInfoMessage.trim();

    if (!trimmedMessage) {
      setStatusMessage('Request message is required.');
      return;
    }

    try {
      await requestInformationMutation.mutateAsync({
        projectId: project.projectId,
        message: trimmedMessage,
      });
      setIsRequestInfoModalOpen(false);
      setRequestInfoMessage('');
      setStatusMessage('Project status updated successfully.');
    } catch (error) {
      setStatusMessage(getProjectServiceResultMessage(error));
    }
  }

  async function handleReopenProposal() {
    setStatusMessage('');

    if (!project) return;

    try {
      await reopenProposalMutation.mutateAsync(project.projectId);
      setStatusMessage('Project reopened to proposal consulting.');
      projectQuery.refetch();
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
                {isAssignedProjectRoute && canSalesDecideConsultation(project.status) ? (
                  <div className="project-detail-status-update">
                    <span>Consultation Decision</span>
                    <div className="project-detail-status-buttons">
                      <button
                        className="project-detail-decision-button project-detail-decision-info"
                        type="button"
                        disabled={rejectProjectMutation.isPending || requestInformationMutation.isPending}
                        onClick={() => void handleConsultationDecision('NEED_BASIC_INFORMATION')}
                      >
                        {requestInformationMutation.isPending ? (
                          <IconLoader2 className="project-detail-decision-spinner" size={16} stroke={2} />
                        ) : (
                          <IconInfoCircle size={16} stroke={2} />
                        )}
                        <span>{requestInformationMutation.isPending ? 'Sending...' : 'Request More Info'}</span>
                      </button>
                      <button
                        className="project-detail-decision-button project-detail-decision-reject"
                        type="button"
                        disabled={rejectProjectMutation.isPending || requestInformationMutation.isPending}
                        onClick={() => void handleConsultationDecision('REJECTED')}
                      >
                        {rejectProjectMutation.isPending ? (
                          <IconLoader2 className="project-detail-decision-spinner" size={16} stroke={2} />
                        ) : (
                          <IconBan size={16} stroke={2} />
                        )}
                        <span>{rejectProjectMutation.isPending ? 'Updating...' : 'Reject Project'}</span>
                      </button>
                    </div>
                    {statusMessage ? <p className={statusMessage.toLowerCase().includes('success') ? 'project-detail-status-message' : 'project-detail-status-message project-detail-status-message-error'}>{statusMessage}</p> : null}
                  </div>
                ) : null}
                {project.status === 'SUBMITTED' || project.status === 'NEED_BASIC_INFORMATION' ? (
                  <button
                    type="button"
                    disabled={assignSalesMutation.isPending}
                    onClick={() =>
                      assignSalesMutation.mutate({
                        projectId: project.projectId,
                        note: getAcceptForConsultationNote(project.status),
                      })
                    }
                  >
                    {assignSalesMutation.isPending ? 'Accepting...' : 'Accept for Consultation'}
                  </button>
                ) : null}
                {canReopenProjectProposal(project.status) ? (
                  <button
                    className="project-detail-secondary-button"
                    type="button"
                    disabled={reopenProposalMutation.isPending}
                    onClick={() => void handleReopenProposal()}
                  >
                    <IconRefresh size={16} />
                    {reopenProposalMutation.isPending ? 'Reopening...' : 'Reopen Proposal'}
                  </button>
                ) : null}
              </div>
            ) : null}
          </section>

          {statusMessage && !isRequestInfoModalOpen ? (
            <section className={statusMessage.toLowerCase().includes('success') || statusMessage.toLowerCase().includes('reopened') ? 'project-detail-status-banner' : 'project-detail-status-banner project-detail-status-banner-error'}>
              {statusMessage}
            </section>
          ) : null}

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
              <ProjectTimeline currentStep={statusStepMap[project.status] ?? 'Submitted'} steps={getTimelineSteps(project.status)} dates={getTimelineDates(project)} />

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

          {isRequestInfoModalOpen && project ? (
            <div className="project-detail-request-modal-overlay">
              <form className="project-detail-request-modal" onSubmit={handleRequestInformationSubmit}>
                <div className="project-detail-request-modal-header">
                  <div>
                    <strong>Request Basic Information</strong>
                    <p>Write the message customers will see before they update their project details.</p>
                  </div>
                  <button
                    aria-label="Close request information modal"
                    type="button"
                    onClick={() => {
                      setIsRequestInfoModalOpen(false);
                      setRequestInfoMessage('');
                      setStatusMessage('');
                    }}
                  >
                    <IconX size={16} />
                  </button>
                </div>
                <label className="project-detail-request-modal-field">
                  <span>Request message *</span>
                  <textarea
                    autoFocus
                    required
                    rows={5}
                    value={requestInfoMessage}
                    placeholder="Explain which basic project information the customer needs to add or update."
                    onChange={(event) => setRequestInfoMessage(event.target.value)}
                  />
                </label>
                {statusMessage && !statusMessage.toLowerCase().includes('success') ? (
                  <p className="project-detail-request-modal-error">{statusMessage}</p>
                ) : null}
                <div className="project-detail-request-modal-actions">
                  <button
                    type="button"
                    disabled={requestInformationMutation.isPending}
                    onClick={() => {
                      setIsRequestInfoModalOpen(false);
                      setRequestInfoMessage('');
                      setStatusMessage('');
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={requestInformationMutation.isPending || !requestInfoMessage.trim()}>
                    {requestInformationMutation.isPending ? 'Sending...' : 'Send Request'}
                  </button>
                </div>
              </form>
            </div>
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

function getTimelineSteps(status: ProjectStatus) {
  return status === 'REJECTED' ? rejectedTimelineSteps : timelineSteps;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function canSalesDecideConsultation(status: ProjectStatus) {
  return status === 'IN_CONSULTATION';
}

function canReopenProjectProposal(status: ProjectStatus) {
  return status === 'PROPOSAL_SELECTED'
    || status === 'QUOTATION_SENT'
    || status === 'ORDER_CONFIRMED';
}

function getStatusUpdateNote(status: ProjectStatus) {
  if (status === 'NEED_BASIC_INFORMATION') return 'Sales requested more basic information from the customer.';
  if (status === 'REJECTED') return 'Sales rejected the project during consultation.';

  return 'Project status updated by sales from project detail.';
}

function getAcceptForConsultationNote(status: ProjectStatus) {
  if (status === 'NEED_BASIC_INFORMATION') {
    return 'Customer provided additional basic information. Sales accepted the project for consultation.';
  }

  return 'Sales accepted the submitted project for consultation.';
}
