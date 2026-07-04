import {
  IconArrowRight,
  IconCheck,
  IconHelp,
  IconMessageCircle,
  IconPlus,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import warmScandinavianUrl from '@/assets/customer-dashboard/warm-scandinavian.png';
import { CustomerNavbar } from '@/features/CustomerPages/customercomponents';
import { getProjectServiceResultMessage, type ProjectListItemDto, type ProjectStatus } from '@/services/api/projects';
import { getProjectScheduleServiceResultMessage, type ProjectScheduleDto } from '@/services/api/schedules';
import { useProjectDetail, useProjectList } from '@/services/queries/useProjects';
import { useProjectScheduleList, useUpdateProjectScheduleStatus } from '@/services/queries/useSchedules';

import './CustomerDashboardPage.css';

type JourneyStatus =
  | 'SUBMITTED'
  | 'IN_CONSULTATION'
  | 'SPACE_VERIFIED'
  | 'PROPOSAL_DRAFTING'
  | 'WAITING_FOR_CUSTOMER_REVIEW'
  | 'QUOTATION_SENT'
  | 'ORDER_CONFIRMED';

const journeyStatusOrder: JourneyStatus[] = [
  'SUBMITTED',
  'IN_CONSULTATION',
  'SPACE_VERIFIED',
  'PROPOSAL_DRAFTING',
  'WAITING_FOR_CUSTOMER_REVIEW',
  'QUOTATION_SENT',
  'ORDER_CONFIRMED',
];

const journeyLabels: Record<JourneyStatus, string> = {
  SUBMITTED: 'Request Submitted',
  IN_CONSULTATION: 'Consultation',
  SPACE_VERIFIED: 'Space Verified',
  PROPOSAL_DRAFTING: 'Design Proposal',
  WAITING_FOR_CUSTOMER_REVIEW: 'Customer Review',
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
];

const reviewItems = [
  {
    imageUrl: warmScandinavianUrl,
    meta: '$58,000 - 4 Scenes',
    title: 'Warm Scandinavian Concept',
  },
  {
    imageUrl: '',
    meta: '$52,000 - 3 Scenes',
    title: 'Industrial Modern Concept',
  },
];

export function CustomerDashboardPage() {
  const navigate = useNavigate();
  const [scheduleActionMessage, setScheduleActionMessage] = useState('');
  const [activeScheduleActionId, setActiveScheduleActionId] = useState<string | null>(null);
  const projectsQuery = useProjectList({ page: 1, limit: 50 });
  const activeProject = useMemo(() => getFirstActiveProject(projectsQuery.data?.items ?? []), [projectsQuery.data?.items]);
  const projectDetailQuery = useProjectDetail(activeProject?.projectId);
  const project = projectDetailQuery.data ?? activeProject;
  const schedulesQuery = useProjectScheduleList(
    activeProject
      ? {
          projectId: activeProject.projectId,
          page: 1,
          limit: 5,
        }
      : undefined,
  );
  const updateScheduleStatusMutation = useUpdateProjectScheduleStatus();
  const journeySteps = getJourneySteps(project?.status);
  const hasActiveProject = Boolean(project);

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
              <h1>Welcome back, Alex!</h1>
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

                <div className="customer-dashboard-action-required">
                  <IconHelp size={16} stroke={1.8} />
                  <div>
                    <strong>{getActionTitle(project.status)}</strong>
                    <p>{getActionDescription(project.status)}</p>
                  </div>
                  <button type="button" onClick={() => navigate(getActionPath(project.status))}>{getActionLabel(project.status)}</button>
                </div>
              </section>
            )}
          </div>

          <aside className="customer-dashboard-sidebar">
            {hasActiveProject ? (
              <DashboardPanel title="Pending Your Review">
                <div className="customer-dashboard-review-list">
                  {reviewItems.map((item) => (
                    <article key={item.title}>
                      {item.imageUrl ? <img src={item.imageUrl} alt={item.title} /> : <div className="customer-dashboard-empty-thumb" />}
                      <div>
                        <h3>{item.title}</h3>
                        <p>{item.meta}</p>
                        <span>Published</span>
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
                {hasActiveProject && !schedulesQuery.isLoading && !schedulesQuery.isError && schedulesQuery.data?.items.length === 0 ? (
                  <p className="customer-dashboard-state">No schedules have been sent for this project yet.</p>
                ) : null}
                {schedulesQuery.data?.items.map((item) => (
                  <article key={item.scheduleId}>
                    <strong>{formatDateTimeRange(item.scheduledStart, item.scheduledEnd)}</strong>
                    <h3>{item.title ?? formatEnumLabel(item.scheduleType)}</h3>
                    <p>{item.customerNote || item.description || 'Schedule shared with the project roles and customer.'}</p>
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

  if (status === 'REVISION_REQUESTED' || status === 'PROPOSAL_SELECTED') {
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

function getActionTitle(status: ProjectStatus) {
  if (status === 'NEED_BASIC_INFORMATION') {
    return 'Action Required: Add Project Information';
  }

  if (status === 'WAITING_FOR_CUSTOMER_REVIEW') {
    return 'Action Required: Review Design Proposals';
  }

  if (status === 'QUOTATION_SENT' || status === 'QUOTATION_REVISION_REQUESTED') {
    return 'Action Required: Review Quotation';
  }

  return 'Project In Progress';
}

function getActionDescription(status: ProjectStatus) {
  if (status === 'NEED_BASIC_INFORMATION') {
    return 'Your sales team needs more details before the project can continue.';
  }

  if (status === 'WAITING_FOR_CUSTOMER_REVIEW') {
    return 'Your designer has published design proposals. Please review and provide feedback.';
  }

  if (status === 'QUOTATION_SENT' || status === 'QUOTATION_REVISION_REQUESTED') {
    return 'A quotation is ready for review before the next project stage.';
  }

  return 'Your team is working on the next step. Check the schedule panel for upcoming appointments.';
}

function getActionLabel(status: ProjectStatus) {
  if (status === 'NEED_BASIC_INFORMATION') {
    return 'Update Info';
  }

  if (status === 'WAITING_FOR_CUSTOMER_REVIEW') {
    return 'Review Now';
  }

  if (status === 'QUOTATION_SENT' || status === 'QUOTATION_REVISION_REQUESTED') {
    return 'View Quotation';
  }

  return 'Open Project';
}

function getActionPath(status: ProjectStatus) {
  if (status === 'WAITING_FOR_CUSTOMER_REVIEW' || status === 'QUOTATION_SENT' || status === 'QUOTATION_REVISION_REQUESTED') {
    return '/customer/proposals';
  }

  return '/customer/projects';
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
