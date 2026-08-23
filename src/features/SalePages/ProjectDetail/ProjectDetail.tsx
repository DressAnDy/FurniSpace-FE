import { IconArrowLeft, IconBan, IconCircleCheck, IconInfoCircle, IconLoader2, IconRefresh, IconX } from '@tabler/icons-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { ProjectStatusBadge, ProjectTimeline, SaleNavbar, SaleSidebar } from '@/features/SalePages/salecomponents';
import type { OrderListItemDto } from '@/services/api/orders';
import type { ProjectDto, ProjectStatus } from '@/services/api/projects';
import { getProjectServiceResultMessage } from '@/services/api/projects';
import { useProjectOrders } from '@/services/queries/useOrders';
import {
  useAssignSalesToProject,
  useCompleteProject,
  useProjectDetail,
  useProjectPhaseDeadlines,
  useRejectProject,
  useReopenProjectProposal,
  useRequestProjectInformation,
  useUpdateProjectPhaseDeadlines,
} from '@/services/queries/useProjects';

import { ChatTab, FilesAttachmentsTab, OverviewTab, ProjectMemberTab, SchedulesTab } from './tabs';
import { ProjectStartFeePanel } from './components/ProjectStartFeePanel';
import './ProjectDetail.css';

type ProjectDetailTab = 'overview' | 'customer' | 'files' | 'chat' | 'schedules';

export type ProjectDetailProject = ProjectDto;

const reviewTabs: Array<{ id: ProjectDetailTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'customer', label: 'Project Member' },
];

const baseTabs: Array<{ id: ProjectDetailTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'customer', label: 'Project Member' },
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
  'Proposal Selected',
  'Quotation Sent',
  'Quotation Revision Requested',
  'Order Confirmed',
  'In Production',
  'Ready For Delivery',
  'Delivering',
  'Delivered',
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
  PROPOSAL_SELECTED: 'Proposal Selected',
  QUOTATION_SENT: 'Quotation Sent',
  QUOTATION_REVISION_REQUESTED: 'Quotation Revision Requested',
  ORDER_CONFIRMED: 'Order Confirmed',
  IN_PRODUCTION: 'In Production',
  READY_FOR_DELIVERY: 'Ready For Delivery',
  DELIVERING: 'Delivering',
  DELIVERED: 'Delivered',
  REJECTED: 'Rejected',
  COMPLETED: 'Completed',
};

export function ProjectDetail() {
  const { projectId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ProjectDetailTab>('overview');
  const [statusMessage, setStatusMessage] = useState('');
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false);
  const [isRequestInfoModalOpen, setIsRequestInfoModalOpen] = useState(false);
  const [requestInfoMessage, setRequestInfoMessage] = useState('');
  const projectQuery = useProjectDetail(projectId);
  const assignSalesMutation = useAssignSalesToProject();
  const requestInformationMutation = useRequestProjectInformation();
  const rejectProjectMutation = useRejectProject();
  const reopenProposalMutation = useReopenProjectProposal();
  const completeProjectMutation = useCompleteProject();
  const isAssignedProjectRoute = location.pathname.startsWith('/sales/assigned-projects');
  const projectOrdersQuery = useProjectOrders(projectId, { enabled: Boolean(projectId) && isAssignedProjectRoute });
  const project = projectQuery.data;
  const relatedOrder = useMemo(() => getPrimaryRelatedOrder(projectOrdersQuery.data?.items ?? []), [projectOrdersQuery.data?.items]);
  const activeSidebarLabel = isAssignedProjectRoute ? 'Assigned Projects' : 'Project Request Queue';
  const hasConsultationAccess = Boolean(project && project.status !== 'SUBMITTED');
  const visibleTabs = hasConsultationAccess ? (isAssignedProjectRoute ? assignedProjectTabs : baseTabs) : reviewTabs;
  const backPath = isAssignedProjectRoute ? '/sales/assigned-projects' : '/sales/project-requests';
  const backLabel = isAssignedProjectRoute ? 'Back to Assigned Projects' : 'Back to Project Request Queue';
  const requestedTab = new URLSearchParams(location.search).get('tab') as ProjectDetailTab | null;
  const canManagePhaseDeadlines = Boolean(project && isAssignedProjectRoute && project.status === 'IN_CONSULTATION');

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab('overview');
    }
  }, [activeTab, visibleTabs]);

  useEffect(() => {
    if (requestedTab && visibleTabs.some((tab) => tab.id === requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, [requestedTab, visibleTabs]);

  useEffect(() => {
    if (!canManagePhaseDeadlines) {
      setIsDeadlineModalOpen(false);
    }
  }, [canManagePhaseDeadlines]);

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

  async function handleAcceptForConsultation() {
    setStatusMessage('');

    if (!project) return;

    try {
      await assignSalesMutation.mutateAsync({
        projectId: project.projectId,
        note: getAcceptForConsultationNote(project.status),
      });
      await projectQuery.refetch();
      navigate(`/sales/assigned-projects/${project.projectId}`, { replace: true });
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

  async function handleCompleteProject() {
    setStatusMessage('');

    if (!project) return;

    try {
      const result = await completeProjectMutation.mutateAsync(project.projectId);
      setStatusMessage(`Project marked as ${formatStatusLabel(result.projectStatus)}.`);
      void projectQuery.refetch();
      void projectOrdersQuery.refetch();
    } catch (error) {
      setStatusMessage(getProjectServiceResultMessage(error));
    }
  }

  const renderActiveTab = () => {
    if (!project) return null;
    if (activeTab === 'overview') return <OverviewTab project={project} />;
    if (activeTab === 'customer') return <ProjectMemberTab project={project} canManageAssignment={isAssignedProjectRoute} />;
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
                {canRequestMoreInformation(project.status) || canRejectProject(project.status) || project.status === 'SUBMITTED' || project.status === 'NEED_BASIC_INFORMATION' ? (
                  <div className="project-detail-status-update">
                    <div className="project-detail-status-buttons">
                      {canRequestMoreInformation(project.status) ? (
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
                      ) : null}
                      {canManagePhaseDeadlines ? (
                        <button
                          className="project-detail-decision-button"
                          type="button"
                          onClick={() => setIsDeadlineModalOpen(true)}
                        >
                          <IconCircleCheck size={16} stroke={2} />
                          <span>Plan Phase Deadlines</span>
                        </button>
                      ) : null}
                      {canRejectProject(project.status) ? (
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
                      ) : null}
                      {project.status === 'SUBMITTED' || project.status === 'NEED_BASIC_INFORMATION' ? (
                        <button
                          type="button"
                          disabled={assignSalesMutation.isPending}
                          onClick={() => void handleAcceptForConsultation()}
                        >
                          {assignSalesMutation.isPending ? 'Accepting...' : 'Accept for Consultation'}
                        </button>
                      ) : null}
                    </div>
                  </div>
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
            <section className={isSuccessStatusMessage(statusMessage) ? 'project-detail-status-banner' : 'project-detail-status-banner project-detail-status-banner-error'}>
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
              <ProjectTimeline currentStep={getTimelineCurrentStep(project.status)} steps={getTimelineSteps(project.status)} dates={getTimelineDates(project)} />
              {isAssignedProjectRoute && isPostDeliveryProject(project.status) ? (
                <ProjectCompletionPanel
                  isCompleting={completeProjectMutation.isPending}
                  isLoadingOrder={projectOrdersQuery.isLoading}
                  order={relatedOrder}
                  projectStatus={project.status}
                  onComplete={() => void handleCompleteProject()}
                />
              ) : null}
              {isAssignedProjectRoute && !project.assignedDesignerId ? <ProjectStartFeePanel projectId={project.projectId} /> : null}

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
                {statusMessage && !isSuccessStatusMessage(statusMessage) ? (
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
          {isDeadlineModalOpen && project && canManagePhaseDeadlines ? (
            <PhaseDeadlineModal
              projectId={project.projectId}
              onClose={() => setIsDeadlineModalOpen(false)}
              onSaved={() => {
                setStatusMessage('Phase deadlines saved.');
                setIsDeadlineModalOpen(false);
              }}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}

function PhaseDeadlineModal({
  onClose,
  onSaved,
  projectId,
}: {
  onClose: () => void;
  onSaved: () => void;
  projectId: string;
}) {
  const deadlinesQuery = useProjectPhaseDeadlines(projectId, { enabled: true });
  const updateDeadlinesMutation = useUpdateProjectPhaseDeadlines();
  const [proposalDueDate, setProposalDueDate] = useState('');
  const [productionDueDate, setProductionDueDate] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const targetCompletionDate = toDateInputValue(deadlinesQuery.data?.targetCompletionDate);

  useEffect(() => {
    const proposalDeadline = deadlinesQuery.data?.deadlines.find((deadline) => deadline.phase === 'DESIGN' || deadline.phase === 'PROPOSAL');
    const productionDeadline = deadlinesQuery.data?.deadlines.find((deadline) => deadline.phase === 'PRODUCTION');

    setProposalDueDate(toDateInputValue(proposalDeadline?.deadlineAt ?? proposalDeadline?.dueDate));
    setProductionDueDate(toDateInputValue(productionDeadline?.deadlineAt ?? productionDeadline?.dueDate));
  }, [deadlinesQuery.data]);

  async function saveDeadlines(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormMessage('');

    if (proposalDueDate && productionDueDate && proposalDueDate > productionDueDate) {
      setFormMessage('Proposal due date cannot be after production due date.');
      return;
    }

    if (targetCompletionDate && proposalDueDate && proposalDueDate > targetCompletionDate) {
      setFormMessage('Proposal due date cannot be after target completion date.');
      return;
    }

    if (targetCompletionDate && productionDueDate && productionDueDate > targetCompletionDate) {
      setFormMessage('Production due date cannot be after target completion date.');
      return;
    }

    try {
      await updateDeadlinesMutation.mutateAsync({
        projectId,
        productionDueDate: productionDueDate || null,
        proposalDueDate: proposalDueDate || null,
      });
      onSaved();
    } catch (error) {
      setFormMessage(getProjectServiceResultMessage(error));
    }
  }

  return (
    <div className="project-detail-modal-backdrop" role="presentation">
      <form className="project-detail-phase-deadline-modal" onSubmit={saveDeadlines}>
        <header>
          <div>
            <h3>Plan Phase Deadlines</h3>
            <p>Set proposal and production due dates during consultation.</p>
          </div>
          <button aria-label="Close deadline planner" type="button" onClick={onClose}>x</button>
        </header>

        {deadlinesQuery.isLoading ? <p className="project-detail-muted">Loading current deadlines...</p> : null}
        {deadlinesQuery.isError ? <p className="project-detail-form-message project-detail-form-message-error">{getProjectServiceResultMessage(deadlinesQuery.error)}</p> : null}

        <div className="project-detail-phase-deadline-grid">
          <label>
            <span>Proposal due date</span>
            <input
              max={productionDueDate || targetCompletionDate || undefined}
              type="date"
              value={proposalDueDate}
              onChange={(event) => {
                setProposalDueDate(event.target.value);
                setFormMessage('');
              }}
            />
          </label>
          <label>
            <span>Production due date</span>
            <input
              max={targetCompletionDate || undefined}
              min={proposalDueDate || undefined}
              type="date"
              value={productionDueDate}
              onChange={(event) => {
                setProductionDueDate(event.target.value);
                setFormMessage('');
              }}
            />
          </label>
        </div>

        <div className="project-detail-phase-deadline-status">
          <DeadlineStatus label="Design" status={getDeadlineStatus(deadlinesQuery.data, 'DESIGN')} />
          <DeadlineStatus label="Production" status={getDeadlineStatus(deadlinesQuery.data, 'PRODUCTION')} />
          <DeadlineStatus label="Target" status={targetCompletionDate || '-'} />
        </div>

        {formMessage ? <p className="project-detail-form-message project-detail-form-message-error">{formMessage}</p> : null}

        <footer>
          <button className="project-detail-secondary-button" disabled={updateDeadlinesMutation.isPending} type="button" onClick={onClose}>
            Skip
          </button>
          <button className="project-detail-primary-button" disabled={deadlinesQuery.isLoading || updateDeadlinesMutation.isPending} type="submit">
            {updateDeadlinesMutation.isPending ? 'Saving...' : 'Save Deadlines'}
          </button>
        </footer>
      </form>
    </div>
  );
}

function DeadlineStatus({ label, status }: { label: string; status: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{status}</strong>
    </div>
  );
}

function getDeadlineStatus(
  data: ReturnType<typeof useProjectPhaseDeadlines>['data'],
  phase: 'DESIGN' | 'PRODUCTION',
) {
  const deadline = data?.deadlines.find((item) => item.phase === phase || (phase === 'DESIGN' && item.phase === 'PROPOSAL'));

  return deadline?.status ? formatStatusLabel(deadline.status) : '-';
}

function getTimelineDates(project: ProjectDto) {
  const dates: Partial<Record<string, string>> = {};

  if (project.submittedAt) {
    dates.Submitted = formatDate(project.submittedAt);
  }

  return dates;
}

function getTimelineCurrentStep(status: ProjectStatus) {
  return statusStepMap[status] ?? formatStatusLabel(status);
}

function getTimelineSteps(status: ProjectStatus) {
  const steps = status === 'REJECTED' ? rejectedTimelineSteps : timelineSteps;
  const currentStep = getTimelineCurrentStep(status);

  return steps.includes(currentStep) ? steps : [...steps, currentStep];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function canRequestMoreInformation(status: ProjectStatus) {
  return status === 'IN_CONSULTATION';
}

function toDateInputValue(value?: string | null) {
  return value?.slice(0, 10) ?? '';
}

function isSuccessStatusMessage(message: string) {
  const normalized = message.toLowerCase();

  return normalized.includes('success')
    || normalized.includes('reopened')
    || normalized.includes('saved')
    || normalized.includes('marked as completed');
}

function formatStatusLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getPrimaryRelatedOrder(orders: OrderListItemDto[]) {
  return [...orders].sort((left, right) => new Date(right.createdAt ?? '').getTime() - new Date(left.createdAt ?? '').getTime())[0] ?? null;
}

function isPostDeliveryProject(status: ProjectStatus) {
  return status === 'DELIVERED' || status === 'COMPLETED';
}

function ProjectCompletionPanel({
  isCompleting,
  isLoadingOrder,
  onComplete,
  order,
  projectStatus,
}: {
  isCompleting: boolean;
  isLoadingOrder: boolean;
  onComplete: () => void;
  order: OrderListItemDto | null;
  projectStatus: ProjectStatus;
}) {
  const canCompleteProject = projectStatus === 'DELIVERED' && order?.status === 'COMPLETED';
  const message = getProjectCompletionMessage(projectStatus, order, isLoadingOrder);

  return (
    <section className="project-detail-completion-card">
      <div>
        <span className="project-detail-completion-kicker">Project completion</span>
        <h3>{projectStatus === 'COMPLETED' ? 'Project completed' : 'Post-delivery review'}</h3>
        <p>{message}</p>
      </div>
      <div className="project-detail-completion-actions">
        {order ? (
          <span className={`project-detail-order-status project-detail-order-status-${(order.status ?? 'CREATED').toLowerCase()}`}>
            Order: {formatStatusLabel(order.status ?? 'CREATED')}
          </span>
        ) : null}
        <button disabled={!canCompleteProject || isCompleting} type="button" onClick={onComplete}>
          {isCompleting ? <IconLoader2 className="project-detail-decision-spinner" size={16} stroke={2} /> : <IconCircleCheck size={16} stroke={2} />}
          <span>{projectStatus === 'COMPLETED' ? 'Completed' : isCompleting ? 'Completing...' : 'Complete Project'}</span>
        </button>
      </div>
    </section>
  );
}

function getProjectCompletionMessage(projectStatus: ProjectStatus, order: OrderListItemDto | null, isLoadingOrder: boolean) {
  if (projectStatus === 'COMPLETED') {
    return 'Project has been confirmed as completed.';
  }

  if (isLoadingOrder) {
    return 'Checking related order before project completion.';
  }

  if (!order) {
    return 'No related order was found for this project.';
  }

  if (order.status === 'COMPLETED') {
    return 'The order is completed. Sales can now mark this project as completed.';
  }

  if (order.status === 'FINAL_PAYMENT_PENDING') {
    return 'Waiting for final payment confirmation before project completion.';
  }

  return `Order is currently ${formatStatusLabel(order.status ?? 'CREATED')}. Complete the order flow before closing this project.`;
}

function canRejectProject(status: ProjectStatus) {
  return [
    'SUBMITTED',
    'IN_CONSULTATION',
    'NEED_BASIC_INFORMATION',
    'WAITING_FOR_DESIGNER_ASSIGNMENT',
    'MEASUREMENT_REQUIRED',
    'SPACE_VERIFIED',
  ].includes(status);
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
