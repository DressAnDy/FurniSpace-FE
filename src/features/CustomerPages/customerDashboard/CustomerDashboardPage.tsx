import {
  IconArrowRight,
  IconCheck,
  IconHelp,
  IconMessageCircle,
  IconPlus,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { CustomerNavbar } from '@/features/CustomerPages/customercomponents';
import { getProjectServiceResultMessage, type ProjectListItemDto, type ProjectStatus } from '@/services/api/projects';
import { getProjectScheduleServiceResultMessage, type ProjectScheduleDto } from '@/services/api/schedules';
import { useCurrentUser } from '@/services/queries/useAuth';
import { useProjectDetail, useProjectList } from '@/services/queries/useProjects';
import { useProjectProposals } from '@/services/queries/useProposals';
import { useProjectScheduleList, useUpdateProjectScheduleStatus } from '@/services/queries/useSchedules';

import './CustomerDashboardPage.css';

type JourneyStatus =
  | 'SUBMITTED'
  | 'IN_CONSULTATION'
  | 'SPACE_VERIFIED'
  | 'PROPOSAL_CONSULTING'
  | 'QUOTATION_SENT'
  | 'ORDER_CONFIRMED';

const journeyStatusOrder: JourneyStatus[] = [
  'SUBMITTED',
  'IN_CONSULTATION',
  'SPACE_VERIFIED',
  'PROPOSAL_CONSULTING',
  'QUOTATION_SENT',
  'ORDER_CONFIRMED',
];

const journeyLabels: Record<JourneyStatus, string> = {
  SUBMITTED: 'Request Submitted',
  IN_CONSULTATION: 'Consultation',
  SPACE_VERIFIED: 'Space Verified',
  PROPOSAL_CONSULTING: 'Proposal Consulting',
  QUOTATION_SENT: 'Quotation',
  ORDER_CONFIRMED: 'Order Confirmed',
};

const activeProjectStatuses: ProjectStatus[] = [
  'SUBMITTED',
  'IN_CONSULTATION',
  'NEED_BASIC_INFORMATION',
  'WAITING_FOR_DESIGNER_ASSIGNMENT',
  'MEASUREMENT_REQUIRED',
  'SPACE_VERIFIED',
  'PROPOSAL_CONSULTING',
  'PROPOSAL_SELECTED',
  'QUOTATION_SENT',
  'QUOTATION_REVISION_REQUESTED',
  'ORDER_CONFIRMED',
  'IN_PRODUCTION',
  'PRODUCTION_BLOCKED',
  'READY_FOR_DELIVERY',
  'DELIVERING',
  'DELIVERED',
];

export function CustomerDashboardPage() {
  const navigate = useNavigate();
  const todayIso = useMemo(() => new Date().toISOString(), []);
  const [scheduleActionMessage, setScheduleActionMessage] = useState('');
  const [activeScheduleActionId, setActiveScheduleActionId] = useState<string | null>(null);
  const currentUserQuery = useCurrentUser();
  const customerName = getCustomerGreetingName(currentUserQuery.data?.fullName);
  const projectsQuery = useProjectList({ page: 1, limit: 50 });
  const activeProject = useMemo(() => getFirstActiveProject(projectsQuery.data?.items ?? []), [projectsQuery.data?.items]);
  const projectDetailQuery = useProjectDetail(activeProject?.projectId);
  const project = projectDetailQuery.data ?? activeProject;
  const proposalsQuery = useProjectProposals(
    activeProject
      ? {
          projectId: activeProject.projectId,
          status: 'PUBLISHED',
          page: 1,
          limit: 5,
        }
      : undefined,
    { enabled: Boolean(activeProject) },
  );
  const schedulesQuery = useProjectScheduleList(
    activeProject
      ? {
          projectId: activeProject.projectId,
          from: todayIso,
          page: 1,
          limit: 5,
        }
      : undefined,
  );
  const updateScheduleStatusMutation = useUpdateProjectScheduleStatus();
  const journeySteps = getJourneySteps(project?.status);
  const hasActiveProject = Boolean(project);
  const pendingReviewProposals = proposalsQuery.data?.items ?? [];
  const upcomingSchedules = useMemo(
    () =>
      (schedulesQuery.data?.items ?? [])
        .filter((schedule) => schedule.status !== 'CANCELLED' && new Date(schedule.scheduledStart).getTime() >= new Date(todayIso).getTime())
        .sort((left, right) => new Date(left.scheduledStart).getTime() - new Date(right.scheduledStart).getTime()),
    [schedulesQuery.data?.items, todayIso],
  );
  const actionConfig = project ? getActionConfig(project.status) : null;

  async function handleScheduleConfirm(schedule: ProjectScheduleDto) {
    setScheduleActionMessage('');
    setActiveScheduleActionId(schedule.scheduleId);

    try {
      await updateScheduleStatusMutation.mutateAsync({
        scheduleId: schedule.scheduleId,
        status: 'CONFIRMED',
        note: 'Confirmed by customer.',
      });
      setScheduleActionMessage('Schedule confirmed successfully.');
    } catch (error) {
      setScheduleActionMessage(getProjectScheduleServiceResultMessage(error));
    } finally {
      setActiveScheduleActionId(null);
    }
  }

  return (
    <main className="customer-dashboard-page">
      <CustomerNavbar activeLabel="Home" classPrefix="customer-dashboard" />

      <div className="customer-dashboard-main">
        <div className="customer-dashboard-layout">
          <div className="customer-dashboard-primary">
            <section className="customer-dashboard-welcome">
              <h1>Welcome back, {customerName}!</h1>
              <p>{hasActiveProject ? 'Your interior design journey is in progress. Let us continue transforming your space.' : 'Start a project request so your team can guide the next steps.'}</p>
            </section>

            {projectsQuery.isLoading ? (
              <section className="customer-dashboard-project-card">
                <p className="customer-dashboard-state">Loading your active project...</p>
              </section>
            ) : !hasActiveProject ? (
              <section className="customer-dashboard-empty-project">
                <div className="customer-dashboard-empty-icon">
                  <IconPlus size={26} stroke={1.8} />
                </div>
                <div>
                  <h2>No active project yet</h2>
                  <p>Create your first project request so you can follow its progress, schedules, proposals, and team updates from this dashboard.</p>
                </div>
                <button type="button" onClick={() => navigate('/customer/project-request')}>
                  Create Project
                  <IconArrowRight size={16} stroke={1.8} />
                </button>
                {projectsQuery.isError ? <p className="customer-dashboard-api-note">{getProjectServiceResultMessage(projectsQuery.error)}</p> : null}
              </section>
            ) : (
              <section className="customer-dashboard-project-card">
                <div className="customer-dashboard-project-head">
                  <div>
                    <div className="customer-dashboard-title-row">
                      <h2>Your Active Project</h2>
                      <span className="customer-dashboard-status">{formatEnumLabel(project.status)}</span>
                    </div>
                    <p>Track progress and take next steps</p>
                  </div>
                  <button type="button" onClick={() => navigate('/customer/projects')}>
                    Open Project
                    <IconArrowRight size={16} stroke={1.8} />
                  </button>
                </div>

                <div className="customer-dashboard-project-meta">
                  <div>
                    <span>Project Name</span>
                    <strong>{project.projectName}</strong>
                  </div>
                  <div>
                    <span>Business Type</span>
                    <strong>{project.businessType}</strong>
                  </div>
                  <div>
                    <span>Budget Range</span>
                    <strong>{projectDetailQuery.data ? formatBudgetRange(projectDetailQuery.data.budgetMin, projectDetailQuery.data.budgetMax) : 'Available in detail'}</strong>
                  </div>
                </div>

                <div className="customer-dashboard-journey">
                  <h3>Project Journey</h3>
                  <ol>
                    {journeySteps.map((step, index) => (
                      <li className={`customer-dashboard-step customer-dashboard-step-${step.status}`} key={step.label}>
                        <span>{step.status === 'complete' ? <IconCheck size={15} stroke={2.4} /> : index + 1}</span>
                        <p>{step.label}</p>
                      </li>
                    ))}
                  </ol>
                </div>

                {actionConfig ? (
                  <div className="customer-dashboard-action-required">
                    <IconHelp size={16} stroke={1.8} />
                    <div>
                      <strong>{actionConfig.title}</strong>
                      <p>{actionConfig.description}</p>
                    </div>
                    <button type="button" onClick={() => navigate(actionConfig.path)}>{actionConfig.label}</button>
                  </div>
                ) : null}
              </section>
            )}
          </div>

          <aside className="customer-dashboard-sidebar">
            {hasActiveProject ? (
              <DashboardPanel title="Pending Your Review">
                <div className="customer-dashboard-review-list">
                  {proposalsQuery.isLoading ? <p className="customer-dashboard-state">Loading published proposals...</p> : null}
                  {proposalsQuery.isError ? <p className="customer-dashboard-api-note">Cannot load published proposals.</p> : null}
                  {!proposalsQuery.isLoading && !proposalsQuery.isError && pendingReviewProposals.length === 0 ? (
                    <p className="customer-dashboard-state">No published proposals are pending review.</p>
                  ) : null}
                  {pendingReviewProposals.map((proposal) => (
                    <article key={proposal.proposalId}>
                      <div>
                        <h3>{proposal.proposalName}</h3>
                        <p>Version {proposal.versionNo} - {proposal.publishedAt ? formatDate(proposal.publishedAt) : 'Published'}</p>
                        <button type="button" onClick={() => navigate(`/customer/proposals/${proposal.proposalId}?projectId=${proposal.projectId}`)}>
                          Review
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </DashboardPanel>
            ) : null}

            <section className="customer-dashboard-panel customer-dashboard-milestones">
              <div className="customer-dashboard-panel-head">
                <h2>Project Schedule</h2>
              </div>
              <p className="customer-dashboard-schedule-intro">Schedules created for the project team are shown here for your confirmation and tracking.</p>
              {scheduleActionMessage ? (
                <p className={isScheduleActionError(scheduleActionMessage) ? 'customer-dashboard-schedule-message customer-dashboard-schedule-message-error' : 'customer-dashboard-schedule-message'}>
                  {scheduleActionMessage}
                </p>
              ) : null}
              <div className="customer-dashboard-milestone-list">
                {!hasActiveProject ? <p className="customer-dashboard-state">Create a project to receive schedules from your team.</p> : null}
                {hasActiveProject && schedulesQuery.isLoading ? <p className="customer-dashboard-state">Loading project schedules...</p> : null}
                {hasActiveProject && schedulesQuery.isError ? <p className="customer-dashboard-api-note">{getProjectScheduleServiceResultMessage(schedulesQuery.error)}</p> : null}
                {hasActiveProject && !schedulesQuery.isLoading && !schedulesQuery.isError && upcomingSchedules.length === 0 ? (
                  <p className="customer-dashboard-state">No upcoming schedules have been sent for this project.</p>
                ) : null}
                {upcomingSchedules.map((item) => (
                  <article key={item.scheduleId}>
                    <strong>{formatDateTimeRange(item.scheduledStart, item.scheduledEnd)}</strong>
                    <h3>{item.title ?? formatEnumLabel(item.scheduleType)}</h3>
                    <p>{item.description || 'Schedule shared with the project roles and customer.'}</p>
                    <span>{formatEnumLabel(item.status)}</span>
                    {item.status === 'PENDING_CONFIRMATION' ? (
                      <div className="customer-dashboard-schedule-actions">
                        <button
                          disabled={updateScheduleStatusMutation.isPending}
                          type="button"
                          onClick={() => void handleScheduleConfirm(item)}
                        >
                          {activeScheduleActionId === item.scheduleId && updateScheduleStatusMutation.isPending ? 'Confirming...' : 'Confirm'}
                        </button>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>

            <section className="customer-dashboard-help">
              <div className="customer-dashboard-help-icon">
                <IconMessageCircle size={28} stroke={1.8} />
              </div>
              <div>
                <h2>Need Help?</h2>
                <p>Our team is here to assist you throughout your interior design journey.</p>
                <div>
                  <button type="button" onClick={() => navigate('/customer/projects')}>Contact Your Team</button>
                  <button type="button" onClick={() => navigate('/customer/dashboard')}>View Help Center</button>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

type DashboardPanelProps = {
  children: React.ReactNode;
  title: string;
};

function DashboardPanel({ children, title }: DashboardPanelProps) {
  const href = title === 'Pending Your Review' ? '/customer/proposals' : '/customer/projects';

  return (
    <section className="customer-dashboard-panel">
      <div className="customer-dashboard-panel-head">
        <h2>{title}</h2>
        <a href={href}>View All</a>
      </div>
      {children}
    </section>
  );
}

function getFirstActiveProject(projects: ProjectListItemDto[]) {
  return projects
    .filter((project) => activeProjectStatuses.includes(project.status))
    .sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime())[0];
}

function getJourneySteps(status: ProjectStatus | undefined) {
  const currentIndex = status ? getJourneyIndex(status) : 0;

  return journeyStatusOrder.map((stepStatus, index) => ({
    label: journeyLabels[stepStatus],
    status: index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'pending',
  }));
}

function getJourneyIndex(status: ProjectStatus) {
  if (status === 'NEED_BASIC_INFORMATION') {
    return 1;
  }

  if (status === 'WAITING_FOR_DESIGNER_ASSIGNMENT' || status === 'MEASUREMENT_REQUIRED') {
    return 2;
  }

  if (status === 'PROPOSAL_SELECTED') {
    return 4;
  }

  if (status === 'QUOTATION_REVISION_REQUESTED') {
    return 5;
  }

  if (['IN_PRODUCTION', 'PRODUCTION_BLOCKED', 'READY_FOR_DELIVERY', 'DELIVERING', 'DELIVERED'].includes(status)) {
    return 6;
  }

  const directIndex = (journeyStatusOrder as ProjectStatus[]).indexOf(status);

  return directIndex >= 0 ? directIndex : 0;
}

function getActionConfig(status: ProjectStatus) {
  if (status === 'NEED_BASIC_INFORMATION') {
    return {
      title: 'Action Required: Add Project Information',
      description: 'Your sales team needs more details before the project can continue.',
      label: 'Update Info',
      path: '/customer/projects',
    };
  }

  if (status === 'PROPOSAL_CONSULTING') {
    return {
      title: 'Action Required: Review Design Proposals',
      description: 'Your designer has published design proposals. Please review and provide feedback.',
      label: 'Review Now',
      path: '/customer/proposals',
    };
  }

  if (status === 'QUOTATION_SENT' || status === 'QUOTATION_REVISION_REQUESTED') {
    return {
      title: 'Action Required: Review Quotation',
      description: 'A quotation is ready for review before the next project stage.',
      label: 'View Quotation',
      path: '/customer/proposals',
    };
  }

  return null;
}

function isScheduleActionError(message: string) {
  const normalizedMessage = message.toLowerCase();

  return !normalizedMessage.includes('success');
}

function formatBudgetRange(min: number | null | undefined, max: number | null | undefined) {
  if (min == null && max == null) {
    return 'Not specified';
  }

  if (min != null && max != null) {
    return `${formatCurrency(min)} - ${formatCurrency(max)}`;
  }

  return min != null ? `From ${formatCurrency(min)}` : `Up to ${formatCurrency(max ?? 0)}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDateTimeRange(start: string, end: string | null) {
  const startText = formatDateTime(start);
  const endText = end ? formatDateTime(end) : null;

  return endText ? `${startText} - ${endText}` : startText;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function getCustomerGreetingName(fullName?: string | null) {
  const nameParts = fullName?.trim().split(/\s+/).filter(Boolean) ?? [];

  return nameParts[nameParts.length - 1] ?? 'Customer';
}
