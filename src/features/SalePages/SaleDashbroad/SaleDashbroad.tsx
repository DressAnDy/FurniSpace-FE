import { useMemo, useState } from 'react';
import {
  IconArrowRight,
  IconChevronRight,
  IconCreditCard,
  IconFileInvoice,
  IconFilter,
  IconFolderOpen,
  IconMessageCircle,
  IconProgressCheck,
  IconRefresh,
  IconShieldExclamation,
  IconUserCheck,
  type Icon,
} from '@tabler/icons-react';
import { useQueries } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { SaleNavbar, SaleSidebar } from '@/features/SalePages/salecomponents';
import { getAccountById, type AccountDto } from '@/services/api';
import {
  getProjectServiceResultMessage,
  type ProjectListItemDto,
  type ProjectStatus,
} from '@/services/api/projects';
import { useCurrentUser, useProjectList } from '@/services/queries';

import './SaleDashbroad.css';

type DateRangeKey = 'today' | 'this-week' | 'this-month';
type ScopeKey = 'my-projects' | 'team';
type QueueGroup = 'Intake' | 'Proposal and Quotation' | 'Payment and Production' | 'Delivery and Completion';
type QueuePriority = 'High' | 'Medium' | 'Low';

type KpiItem = {
  change: string;
  description: string;
  icon: Icon;
  label: string;
  path: string;
  tone: 'amber' | 'blue' | 'green' | 'red' | 'neutral';
  value: string;
};

type QueueItem = {
  action: string;
  assignee: string;
  customer: string;
  due: string;
  group: QueueGroup;
  path: string;
  phase: string;
  priority: QueuePriority;
  project: string;
  status: string;
};

const queueGroups: QueueGroup[] = ['Intake', 'Proposal and Quotation', 'Payment and Production', 'Delivery and Completion'];

const DATE_RANGE_LABEL: Record<DateRangeKey, string> = {
  today: 'Today',
  'this-week': 'This week',
  'this-month': 'This month',
};

const ACTIVE_STATUSES: ProjectStatus[] = [
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
];

const WAITING_CUSTOMER_STATUSES: ProjectStatus[] = [
  'NEED_BASIC_INFORMATION',
  'PROPOSAL_CONSULTING',
  'QUOTATION_SENT',
  'QUOTATION_REVISION_REQUESTED',
];

const WAITING_INTERNAL_STATUSES: ProjectStatus[] = [
  'WAITING_FOR_DESIGNER_ASSIGNMENT',
  'MEASUREMENT_REQUIRED',
  'SPACE_VERIFIED',
  'PROPOSAL_SELECTED',
  'IN_PRODUCTION',
];

const QUOTATION_PENDING_STATUSES: ProjectStatus[] = ['QUOTATION_SENT', 'QUOTATION_REVISION_REQUESTED'];
const PAYMENT_FOLLOWUP_STATUSES: ProjectStatus[] = ['ORDER_CONFIRMED', 'DELIVERED'];
const AT_RISK_STATUSES: ProjectStatus[] = ['NEED_BASIC_INFORMATION', 'REJECTED'];

export function SaleDashbroad() {
  const [activeGroup, setActiveGroup] = useState<QueueGroup>('Intake');
  const [dateRange, setDateRange] = useState<DateRangeKey>('this-week');
  const [scope, setScope] = useState<ScopeKey>('my-projects');
  const [lastRefreshAt, setLastRefreshAt] = useState(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const currentUserQuery = useCurrentUser();
  const currentUser = currentUserQuery.data;
  const isMyScope = scope === 'my-projects';
  const projectsQuery = useProjectList(
    {
      assignedSalesId: isMyScope ? currentUser?.accountId : null,
      page: 1,
      limit: 100,
    },
    { enabled: isMyScope ? Boolean(currentUser?.accountId) : true },
  );
  const projects = useMemo(() => projectsQuery.data?.items ?? [], [projectsQuery.data?.items]);
  const visibleProjects = useMemo(
    () => projects.filter((project) => isInDateRange(project.submittedAt, dateRange)),
    [dateRange, projects],
  );
  const accountIds = useMemo(
    () =>
      Array.from(
        new Set(
          visibleProjects
            .flatMap((project) => [project.customerId, project.assignedSalesId])
            .filter((accountId): accountId is string => Boolean(accountId)),
        ),
      ),
    [visibleProjects],
  );
  const accountQueries = useQueries({
    queries: accountIds.map((accountId) => ({
      queryKey: ['accounts', 'detail', accountId],
      queryFn: () => getAccountById(accountId),
      enabled: Boolean(accountId),
      staleTime: 5 * 60 * 1000,
    })),
  });
  const accountById = useMemo(() => {
    return accountQueries.reduce<Record<string, AccountDto>>((lookup, query, index) => {
      const account = query.data;

      if (account) {
        lookup[accountIds[index]] = account;
      }

      return lookup;
    }, {});
  }, [accountIds, accountQueries]);
  const kpis = useMemo(() => getKpis(visibleProjects, DATE_RANGE_LABEL[dateRange]), [dateRange, visibleProjects]);
  const actionQueue = useMemo(
    () => visibleProjects.map((project) => toQueueItem(project, accountById, currentUser?.fullName ?? 'Unassigned')),
    [accountById, currentUser?.fullName, visibleProjects],
  );
  const activeQueue = actionQueue.filter((item) => item.group === activeGroup);
  const refreshTime = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(lastRefreshAt);
  const isLoading = currentUserQuery.isLoading || projectsQuery.isLoading;
  const loadError = getDashboardLoadError(currentUserQuery.isError, projectsQuery.isError, projectsQuery.error);

  async function handleRefresh() {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await Promise.all([currentUserQuery.refetch(), projectsQuery.refetch()]);
      setLastRefreshAt(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <div className="sale-dashboard-shell">
      <SaleSidebar activeLabel="Dashboard" />

      <div className="sale-dashboard-content">
        <SaleNavbar />

        <main className="sale-dashboard-main sale-dashboard-scrollbar">
          <section className="sales-ops-header">
            <div>
              <span>Sales Workspace</span>
              <h2>Sales Dashboard</h2>
              <p>Project coordination, commercial follow-up, and operational priorities</p>
            </div>
            <div className="sales-ops-header-side">
              <button
                className="sales-ops-refresh-button"
                disabled={isRefreshing}
                type="button"
                onClick={() => void handleRefresh()}
              >
                <IconRefresh className={isRefreshing ? 'is-spinning' : undefined} size={14} />
                {isRefreshing ? 'Refreshing...' : `Refresh · ${refreshTime}`}
              </button>
            </div>
          </section>

          <section className="sales-ops-filter-bar" aria-label="Sales dashboard filters">
            <label>
              <span>Date range</span>
              <select value={dateRange} onChange={(event) => setDateRange(event.target.value as DateRangeKey)}>
                <option value="today">Today</option>
                <option value="this-week">This week</option>
                <option value="this-month">This month</option>
              </select>
            </label>
            <label>
              <span>Scope</span>
              <select value={scope} onChange={(event) => setScope(event.target.value as ScopeKey)}>
                <option value="my-projects">My assigned projects</option>
                <option value="team">Team overview</option>
              </select>
            </label>
            <Link className="sales-ops-primary-action" to="/sales/project-requests">
              Review Project Requests
              <IconArrowRight size={16} />
            </Link>
          </section>

          <section className="sales-ops-kpi-grid">
            {kpis.map(({ change, description, icon: KpiIcon, label, path, tone, value }) => (
              <Link className={`sales-ops-kpi sales-ops-kpi-${tone}`} key={label} title={description} to={path}>
                <span><KpiIcon size={19} /></span>
                <div>
                  <small>{label}</small>
                  <strong>{value}</strong>
                  <p>{change}</p>
                </div>
              </Link>
            ))}
          </section>

          <section className="sales-ops-main-grid sales-ops-main-grid-single">
            <article className="sale-card sales-ops-action-queue">
              <header className="sales-ops-section-header">
                <div>
                  <h3>Main Action Queue</h3>
                  <p>Prioritized work grouped by business phase.</p>
                </div>
                <IconFilter size={20} />
              </header>
              <div className="sales-ops-tabs" role="tablist" aria-label="Action queue groups">
                {queueGroups.map((group) => (
                  <button
                    aria-selected={activeGroup === group}
                    key={group}
                    role="tab"
                    type="button"
                    onClick={() => setActiveGroup(group)}
                  >
                    {group}
                    <em>{actionQueue.filter((item) => item.group === group).length}</em>
                  </button>
                ))}
              </div>
              <div className="sales-ops-queue-table">
                <div className="sales-ops-queue-head">
                  <span>Project</span>
                  <span>Customer</span>
                  <span>Phase</span>
                  <span className="sales-ops-queue-col-center">Priority</span>
                  <span>Action</span>
                  <span>Due</span>
                  <span className="sales-ops-queue-col-center">Status</span>
                  <span />
                </div>
                {isLoading ? (
                  <div className="sales-ops-queue-empty">Loading action queue...</div>
                ) : null}
                {loadError ? <div className="sales-ops-queue-empty sales-ops-queue-empty-error">{loadError}</div> : null}
                {!isLoading && !loadError && activeQueue.length === 0 ? (
                  <div className="sales-ops-queue-empty">
                    No actions in this phase for {DATE_RANGE_LABEL[dateRange].toLowerCase()}
                    {isMyScope ? ' on your assigned projects' : ' across the team'}.
                  </div>
                ) : null}
                {activeQueue.map((item) => (
                  <div className="sales-ops-queue-row" key={`${item.project}-${item.status}`}>
                    <strong>{item.project}</strong>
                    <span>{item.customer}</span>
                    <span>{item.phase}</span>
                    <span className={getPriorityClass(item.priority)}>{item.priority}</span>
                    <span>{item.action}</span>
                    <span>{item.due}</span>
                    <em title={item.status}>{formatStatusLabel(item.status)}</em>
                    <Link aria-label={`Open ${item.project}`} className="sales-ops-queue-open" title="Open" to={item.path}>
                      <IconChevronRight size={18} stroke={2} />
                    </Link>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}

function getDashboardLoadError(userFailed: boolean, projectsFailed: boolean, projectError: unknown) {
  if (userFailed) return 'Cannot load current sales account.';
  if (projectsFailed) return getProjectServiceResultMessage(projectError);
  return null;
}

function getKpis(projects: ProjectListItemDto[], rangeLabel: string): KpiItem[] {
  const countBy = (statuses: ProjectStatus[]) => projects.filter((project) => statuses.includes(project.status)).length;

  return [
    {
      change: rangeLabel,
      description: 'Requests not yet accepted into consultation',
      icon: IconFolderOpen,
      label: 'New Project Requests',
      path: '/sales/project-requests',
      tone: 'amber',
      value: String(countBy(['SUBMITTED'])),
    },
    {
      change: rangeLabel,
      description: 'Assigned projects in active coordination',
      icon: IconProgressCheck,
      label: 'Active Projects',
      path: '/sales/assigned-projects',
      tone: 'blue',
      value: String(countBy(ACTIVE_STATUSES)),
    },
    {
      change: rangeLabel,
      description: 'Information, proposal, or quotation waiting on customer',
      icon: IconMessageCircle,
      label: 'Waiting for Customer',
      path: '/sales/assigned-projects',
      tone: 'neutral',
      value: String(countBy(WAITING_CUSTOMER_STATUSES)),
    },
    {
      change: rangeLabel,
      description: 'Designer or production action needed',
      icon: IconUserCheck,
      label: 'Waiting for Internal Team',
      path: '/sales/assigned-projects',
      tone: 'neutral',
      value: String(countBy(WAITING_INTERNAL_STATUSES)),
    },
    {
      change: rangeLabel,
      description: 'Quotations sent but not accepted or rejected',
      icon: IconFileInvoice,
      label: 'Quotations Pending Decision',
      path: '/sales/quotations',
      tone: 'amber',
      value: String(countBy(QUOTATION_PENDING_STATUSES)),
    },
    {
      change: rangeLabel,
      description: 'Start fee, deposit, or remaining payment follow-up',
      icon: IconCreditCard,
      label: 'Payments Requiring Follow-up',
      path: '/sales/orders',
      tone: 'red',
      value: String(countBy(PAYMENT_FOLLOWUP_STATUSES)),
    },
    {
      change: rangeLabel,
      description: 'Overdue, blocked, or missing required action',
      icon: IconShieldExclamation,
      label: 'At-Risk Projects',
      path: '/sales/assigned-projects',
      tone: 'red',
      value: String(countBy(AT_RISK_STATUSES)),
    },
  ];
}

function toQueueItem(
  project: ProjectListItemDto,
  accountById: Record<string, AccountDto>,
  fallbackAssignee: string,
): QueueItem {
  const customer = accountById[project.customerId];
  const sales = project.assignedSalesId ? accountById[project.assignedSalesId] : null;
  const meta = getQueueMeta(project.status);

  return {
    action: meta.action,
    assignee: sales?.fullName ?? fallbackAssignee,
    customer: customer?.fullName ?? 'Unknown customer',
    due: formatSubmittedDue(project.submittedAt),
    group: meta.group,
    path: meta.path(project.projectId),
    phase: meta.phase,
    priority: meta.priority,
    project: `${project.projectCode} ${project.projectName}`,
    status: project.status,
  };
}

function getQueueMeta(status: ProjectStatus): {
  action: string;
  group: QueueGroup;
  path: (projectId: string) => string;
  phase: string;
  priority: QueuePriority;
} {
  if (status === 'SUBMITTED') {
    return { action: 'Review request', group: 'Intake', path: (id) => `/sales/project-requests/${id}`, phase: 'Request intake', priority: 'High' };
  }
  if (status === 'NEED_BASIC_INFORMATION') {
    return { action: 'Follow missing information', group: 'Intake', path: (id) => `/sales/project-requests/${id}`, phase: 'Information check', priority: 'High' };
  }
  if (status === 'IN_CONSULTATION') {
    return { action: 'Confirm requirements', group: 'Intake', path: (id) => `/sales/assigned-projects/${id}`, phase: 'Consultation', priority: 'Medium' };
  }
  if (status === 'WAITING_FOR_DESIGNER_ASSIGNMENT') {
    return { action: 'Assign designer', group: 'Intake', path: (id) => `/sales/assigned-projects/${id}`, phase: 'Designer assignment', priority: 'High' };
  }
  if (status === 'MEASUREMENT_REQUIRED') {
    return { action: 'Schedule measurement', group: 'Intake', path: (id) => `/sales/assigned-projects/${id}`, phase: 'Measurement', priority: 'High' };
  }
  if (status === 'SPACE_VERIFIED') {
    return { action: 'Start proposal consulting', group: 'Intake', path: (id) => `/sales/assigned-projects/${id}`, phase: 'Consultation', priority: 'Medium' };
  }
  if (status === 'PROPOSAL_CONSULTING') {
    return { action: 'Follow proposal review', group: 'Proposal and Quotation', path: (id) => `/sales/assigned-projects/${id}`, phase: 'Proposal consulting', priority: 'Medium' };
  }
  if (status === 'PROPOSAL_SELECTED') {
    return { action: 'Prepare quotation', group: 'Proposal and Quotation', path: () => `/sales/quotations`, phase: 'Quotation draft', priority: 'High' };
  }
  if (status === 'QUOTATION_SENT') {
    return { action: 'Follow quotation decision', group: 'Proposal and Quotation', path: () => '/sales/quotations', phase: 'Quotation sent', priority: 'Medium' };
  }
  if (status === 'QUOTATION_REVISION_REQUESTED') {
    return { action: 'Revise quotation', group: 'Proposal and Quotation', path: () => '/sales/quotations', phase: 'Quotation revision', priority: 'High' };
  }
  if (status === 'ORDER_CONFIRMED') {
    return { action: 'Follow payment and production', group: 'Payment and Production', path: () => '/sales/orders', phase: 'Order confirmed', priority: 'Medium' };
  }
  if (status === 'IN_PRODUCTION') {
    return { action: 'Monitor production', group: 'Payment and Production', path: () => '/sales/orders', phase: 'In production', priority: 'Medium' };
  }
  if (status === 'READY_FOR_DELIVERY') {
    return { action: 'Create delivery schedule', group: 'Delivery and Completion', path: () => '/sales/tracking', phase: 'Ready for delivery', priority: 'Medium' };
  }
  if (status === 'DELIVERING') {
    return { action: 'Track delivery', group: 'Delivery and Completion', path: () => '/sales/tracking', phase: 'Delivering', priority: 'Medium' };
  }
  if (status === 'DELIVERED') {
    return { action: 'Prepare remaining payment', group: 'Delivery and Completion', path: () => '/sales/orders', phase: 'Delivered', priority: 'High' };
  }
  if (status === 'COMPLETED') {
    return { action: 'Review completed project', group: 'Delivery and Completion', path: (id) => `/sales/assigned-projects/${id}`, phase: 'Completed', priority: 'Low' };
  }

  return { action: 'Review project', group: 'Intake', path: (id) => `/sales/assigned-projects/${id}`, phase: 'Closed', priority: 'Low' };
}

function isInDateRange(iso: string, range: DateRangeKey) {
  const submittedAt = new Date(iso);

  if (Number.isNaN(submittedAt.getTime())) {
    return false;
  }

  const start = getDateRangeStart(range);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return submittedAt >= start && submittedAt <= end;
}

function getDateRangeStart(range: DateRangeKey) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  if (range === 'today') {
    return start;
  }

  if (range === 'this-week') {
    const weekday = start.getDay();
    const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
    start.setDate(start.getDate() - daysFromMonday);
    return start;
  }

  start.setDate(1);
  return start;
}

function formatSubmittedDue(iso: string) {
  const submittedAt = new Date(iso);

  if (Number.isNaN(submittedAt.getTime())) {
    return '-';
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfSubmitted = new Date(submittedAt);
  startOfSubmitted.setHours(0, 0, 0, 0);
  const dayDiff = Math.round((startOfToday.getTime() - startOfSubmitted.getTime()) / 86_400_000);

  if (dayDiff <= 0) return 'Today';
  if (dayDiff === 1) return 'Yesterday';
  if (dayDiff < 7) return `${dayDiff} days ago`;

  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' }).format(submittedAt);
}

function getPriorityClass(priority: QueuePriority) {
  return `sales-ops-priority sales-ops-priority-${priority.toLowerCase()}`;
}

function formatStatusLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
