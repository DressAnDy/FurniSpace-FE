import {
  IconArrowRight,
  IconCheck,
  IconHelp,
  IconMessageCircle,
  IconPlus,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useLang, type Lang } from '@/app/providers/useLang';
import { CustomerNavbar, customerCopy, type CustomerCopy } from '@/features/CustomerPages/customercomponents';
import { formatCustomerDate, formatCustomerDateTime, getCustomerProjectStatusLabel } from '@/features/CustomerPages/utils';
import { getProjectServiceResultMessage, type ProjectListItemDto, type ProjectStatus } from '@/services/api/projects';
import { getProjectScheduleServiceResultMessage, type ProjectScheduleDto } from '@/services/api/schedules';
import { useCurrentUser } from '@/services/queries/useAuth';
import { useProjectDetail, useProjectList } from '@/services/queries/useProjects';
import { useProjectProposals } from '@/services/queries/useProposals';
import { useProjectScheduleList, useUpdateProjectScheduleStatus } from '@/services/queries/useSchedules';
import { isScheduleVisible } from '@/shared/utils/scheduleVisibility';

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
  'READY_FOR_DELIVERY',
  'DELIVERING',
  'AWAITING_CUSTOMER_CONFIRMATION',
  'DELIVERED',
];

export function CustomerDashboardPage() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const t = customerCopy[lang];
  const todayIso = useMemo(() => new Date().toISOString(), []);
  const [scheduleActionMessage, setScheduleActionMessage] = useState('');
  const [activeScheduleActionId, setActiveScheduleActionId] = useState<string | null>(null);
  const currentUserQuery = useCurrentUser();
  const customerName = getCustomerGreetingName(currentUserQuery.data?.fullName, t.common.customer);
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
    {
      enabled: Boolean(activeProject?.projectId),
      staleTime: 60_000,
    },
  );
  const updateScheduleStatusMutation = useUpdateProjectScheduleStatus();
  const journeyLabels = getJourneyLabels(t);
  const journeySteps = getJourneySteps(project?.status, journeyLabels);
  const hasActiveProject = Boolean(project);
  const pendingReviewProposals = proposalsQuery.data?.items ?? [];
  const upcomingSchedules = useMemo(
    () =>
      (schedulesQuery.data?.items ?? [])
        .filter((schedule) => isScheduleVisible(schedule.status) && schedule.status !== 'CANCELLED' && new Date(schedule.scheduledStart).getTime() >= new Date(todayIso).getTime())
        .sort((left, right) => new Date(left.scheduledStart).getTime() - new Date(right.scheduledStart).getTime()),
    [schedulesQuery.data?.items, todayIso],
  );
  const actionConfig = project ? getActionConfig(project.status, t.dashboard, project.projectId) : null;

  async function handleScheduleConfirm(schedule: ProjectScheduleDto) {
    setScheduleActionMessage('');
    setActiveScheduleActionId(schedule.scheduleId);

    try {
      await updateScheduleStatusMutation.mutateAsync({
        scheduleId: schedule.scheduleId,
        status: 'CONFIRMED',
        note: 'Confirmed by customer.',
      });
      setScheduleActionMessage(t.dashboard.scheduleConfirmed);
    } catch (error) {
      setScheduleActionMessage(getProjectScheduleServiceResultMessage(error));
    } finally {
      setActiveScheduleActionId(null);
    }
  }

  return (
    <main className="customer-dashboard-page">
      <CustomerNavbar activeKey="home" classPrefix="customer-dashboard" />

      <div className="customer-dashboard-main">
        <div className="customer-dashboard-layout">
          <div className="customer-dashboard-primary">
            <section className="customer-dashboard-welcome">
              <h1>{t.dashboard.welcomeBack(customerName)}</h1>
              <p>{hasActiveProject ? t.dashboard.journeyInProgress : t.dashboard.startRequestHint}</p>
            </section>

            {projectsQuery.isLoading ? (
              <section className="customer-dashboard-project-card">
                <p className="customer-dashboard-state">{t.dashboard.loadingActiveProject}</p>
              </section>
            ) : !hasActiveProject ? (
              <section className="customer-dashboard-empty-project">
                <div className="customer-dashboard-empty-icon">
                  <IconPlus size={26} stroke={1.8} />
                </div>
                <div>
                  <h2>{t.dashboard.noActiveProjectTitle}</h2>
                  <p>{t.dashboard.noActiveProjectDesc}</p>
                </div>
                <button type="button" onClick={() => navigate('/customer/project-request')}>
                  {t.dashboard.createProject}
                  <IconArrowRight size={16} stroke={1.8} />
                </button>
                {projectsQuery.isError ? <p className="customer-dashboard-api-note">{getProjectServiceResultMessage(projectsQuery.error)}</p> : null}
              </section>
            ) : (
              <section className="customer-dashboard-project-card">
                <div className="customer-dashboard-project-head">
                  <div>
                    <div className="customer-dashboard-title-row">
                      <h2>{t.dashboard.yourActiveProject}</h2>
                      <span className="customer-dashboard-status">{getCustomerProjectStatusLabel(project.status, lang)}</span>
                    </div>
                    <p>{t.dashboard.trackProgress}</p>
                  </div>
                  <div className="customer-dashboard-project-head-actions">
                    <button type="button" onClick={() => navigate('/customer/tracking')}>
                      {t.dashboard.trackProject}
                      <IconArrowRight size={16} stroke={1.8} />
                    </button>
                    <button type="button" onClick={() => navigate('/customer/projects')}>
                      {t.dashboard.openProject}
                      <IconArrowRight size={16} stroke={1.8} />
                    </button>
                  </div>
                </div>

                <div className="customer-dashboard-project-meta">
                  <div>
                    <span>{t.common.projectName}</span>
                    <strong>{project.projectName}</strong>
                  </div>
                  <div>
                    <span>{t.common.businessType}</span>
                    <strong>{project.businessType}</strong>
                  </div>
                  <div>
                    <span>{t.dashboard.budgetRange}</span>
                    <strong>
                      {projectDetailQuery.data
                        ? formatBudgetRange(projectDetailQuery.data.budgetMin, projectDetailQuery.data.budgetMax, t.common, lang)
                        : t.dashboard.availableInDetail}
                    </strong>
                  </div>
                </div>

                <div className="customer-dashboard-journey">
                  <h3>{t.dashboard.projectJourney}</h3>
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
              <DashboardPanel
                projectId={activeProject?.projectId}
                title={t.dashboard.pendingYourReview}
                viewAllLabel={t.dashboard.viewAll}
              >
                <div className="customer-dashboard-review-list">
                  {proposalsQuery.isLoading ? <p className="customer-dashboard-state">{t.dashboard.loadingProposals}</p> : null}
                  {proposalsQuery.isError ? <p className="customer-dashboard-api-note">{t.dashboard.cannotLoadProposals}</p> : null}
                  {!proposalsQuery.isLoading && !proposalsQuery.isError && pendingReviewProposals.length === 0 ? (
                    <p className="customer-dashboard-state">{t.dashboard.noPendingProposals}</p>
                  ) : null}
                  {pendingReviewProposals.map((proposal) => (
                    <article key={proposal.proposalId}>
                      <div>
                        <h3>{proposal.proposalName}</h3>
                        <p>
                          {t.common.version} {proposal.versionNo} -{' '}
                          {proposal.publishedAt ? formatCustomerDate(proposal.publishedAt, lang) : t.common.published}
                        </p>
                        <button type="button" onClick={() => navigate(`/customer/projects/${proposal.projectId}?proposalId=${proposal.proposalId}`)}>
                          {t.dashboard.review}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </DashboardPanel>
            ) : null}

            <section className="customer-dashboard-panel customer-dashboard-milestones">
              <div className="customer-dashboard-panel-head">
                <h2>{t.dashboard.projectSchedule}</h2>
              </div>
              <p className="customer-dashboard-schedule-intro">{t.dashboard.scheduleIntro}</p>
              {scheduleActionMessage ? (
                <p className={isScheduleActionError(scheduleActionMessage, t.dashboard.scheduleConfirmed) ? 'customer-dashboard-schedule-message customer-dashboard-schedule-message-error' : 'customer-dashboard-schedule-message'}>
                  {scheduleActionMessage}
                </p>
              ) : null}
              <div className="customer-dashboard-milestone-list">
                {!hasActiveProject ? <p className="customer-dashboard-state">{t.dashboard.createProjectForSchedules}</p> : null}
                {hasActiveProject && schedulesQuery.isLoading ? <p className="customer-dashboard-state">{t.dashboard.loadingSchedules}</p> : null}
                {hasActiveProject && schedulesQuery.isError ? <p className="customer-dashboard-api-note">{getProjectScheduleServiceResultMessage(schedulesQuery.error)}</p> : null}
                {hasActiveProject && !schedulesQuery.isLoading && !schedulesQuery.isError && upcomingSchedules.length === 0 ? (
                  <p className="customer-dashboard-state">{t.dashboard.noUpcomingSchedules}</p>
                ) : null}
                {upcomingSchedules.map((item) => (
                  <article key={item.scheduleId}>
                    <strong>{formatDateTimeRange(item.scheduledStart, item.scheduledEnd, lang)}</strong>
                    <h3>{item.title ?? formatEnumLabel(item.scheduleType)}</h3>
                    <p>{item.description || t.dashboard.scheduleShared}</p>
                    <span>{formatEnumLabel(item.status)}</span>
                    {item.status === 'PENDING_CONFIRMATION' ? (
                      <div className="customer-dashboard-schedule-actions">
                        <button
                          disabled={updateScheduleStatusMutation.isPending}
                          type="button"
                          onClick={() => void handleScheduleConfirm(item)}
                        >
                          {activeScheduleActionId === item.scheduleId && updateScheduleStatusMutation.isPending ? t.common.confirming : t.common.confirm}
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
                <h2>{t.dashboard.needHelp}</h2>
                <p>{t.dashboard.needHelpDesc}</p>
                <div>
                  <button type="button" onClick={() => navigate('/customer/projects')}>{t.dashboard.contactYourTeam}</button>
                  <button type="button" onClick={() => navigate('/customer/dashboard')}>{t.dashboard.viewHelpCenter}</button>
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
  projectId?: string;
  title: string;
  viewAllLabel: string;
};

function DashboardPanel({ children, projectId, title, viewAllLabel }: DashboardPanelProps) {
  const href = projectId ? `/customer/projects/${projectId}` : '/customer/projects';

  return (
    <section className="customer-dashboard-panel">
      <div className="customer-dashboard-panel-head">
        <h2>{title}</h2>
        <a href={href}>{viewAllLabel}</a>
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

function getJourneyLabels(t: CustomerCopy): Record<JourneyStatus, string> {
  return {
    SUBMITTED: t.journey.requestSubmitted,
    IN_CONSULTATION: t.journey.consultation,
    SPACE_VERIFIED: t.journey.spaceVerified,
    PROPOSAL_CONSULTING: t.journey.proposalConsulting,
    QUOTATION_SENT: t.journey.quotation,
    ORDER_CONFIRMED: t.journey.orderConfirmed,
  };
}

function getJourneySteps(status: ProjectStatus | undefined, journeyLabels: Record<JourneyStatus, string>) {
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

  if (['IN_PRODUCTION', 'READY_FOR_DELIVERY', 'DELIVERING', 'AWAITING_CUSTOMER_CONFIRMATION', 'DELIVERED'].includes(status)) {
    return 6;
  }

  const directIndex = (journeyStatusOrder as ProjectStatus[]).indexOf(status);

  return directIndex >= 0 ? directIndex : 0;
}

function getActionConfig(status: ProjectStatus, copy: CustomerCopy['dashboard'], projectId?: string) {
  if (status === 'NEED_BASIC_INFORMATION') {
    return {
      title: copy.actionAddInfoTitle,
      description: copy.actionAddInfoDesc,
      label: copy.updateInfo,
      path: projectId ? `/customer/projects/${projectId}/edit` : '/customer/projects',
    };
  }

  if (status === 'PROPOSAL_CONSULTING') {
    return {
      title: copy.actionReviewProposalsTitle,
      description: copy.actionReviewProposalsDesc,
      label: copy.reviewNow,
      path: projectId ? `/customer/projects/${projectId}` : '/customer/projects',
    };
  }

  if (status === 'QUOTATION_SENT' || status === 'QUOTATION_REVISION_REQUESTED') {
    return {
      title: copy.actionReviewQuotationTitle,
      description: copy.actionReviewQuotationDesc,
      label: copy.viewQuotation,
      path: '/customer/quotations',
    };
  }

  if (status === 'AWAITING_CUSTOMER_CONFIRMATION') {
    return {
      title: copy.actionConfirmDeliveryTitle,
      description: copy.actionConfirmDeliveryDesc,
      label: copy.confirmDelivery,
      path: '/customer/tracking',
    };
  }

  if (status === 'COMPLETED') {
    return {
      title: copy.projectCompletedTitle,
      description: copy.projectCompletedDesc,
      label: copy.openProject,
      path: `/customer/projects/${projectId}`,
    };
  }

  return null;
}

function isScheduleActionError(message: string, successMessage: string) {
  if (message === successMessage) {
    return false;
  }

  const normalizedMessage = message.toLowerCase();

  return !normalizedMessage.includes('success');
}

function formatBudgetRange(
  min: number | null | undefined,
  max: number | null | undefined,
  common: CustomerCopy['common'],
  lang: Lang,
) {
  if (min == null && max == null) {
    return common.notSpecified;
  }

  if (min != null && max != null) {
    return `${formatCurrency(min, lang)} - ${formatCurrency(max, lang)}`;
  }

  return min != null ? common.from(formatCurrency(min, lang)) : common.upTo(formatCurrency(max ?? 0, lang));
}

function formatCurrency(value: number, lang: Lang) {
  return new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US', {
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

function formatDateTimeRange(start: string, end: string | null, lang: Lang) {
  const startText = formatCustomerDateTime(start, lang);
  const endText = end ? formatCustomerDateTime(end, lang) : null;

  return endText ? `${startText} - ${endText}` : startText;
}

function getCustomerGreetingName(fullName?: string | null, fallback = 'Customer') {
  const nameParts = fullName?.trim().split(/\s+/).filter(Boolean) ?? [];

  return nameParts[nameParts.length - 1] ?? fallback;
}
