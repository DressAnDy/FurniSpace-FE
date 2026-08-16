import { useMemo, useState } from 'react';
import {
  IconArrowRight,
  IconChevronRight,
  IconCreditCard,
  IconFilter,
  IconFolderOpen,
  IconProgressCheck,
  IconRefresh,
  IconShieldExclamation,
  IconUserCheck,
  type Icon,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import { SaleNavbar, SaleSidebar } from '@/features/SalePages/salecomponents';
import type {
  DashboardDateRange,
  DashboardDueBucket,
  DashboardPriority,
  DashboardQueueGroup,
  DashboardQueueItemDto,
  DashboardScope,
  SalesDashboardKpisDto,
} from '@/services/api/dashboard';
import {
  getDashboardServiceResultMessage,
  useSalesActionQueue,
  useSalesDashboardKpis,
} from '@/services/queries';

import './SaleDashbroad.css';

type DateRangeKey = 'today' | 'this-week' | 'this-month';
type ScopeKey = 'my-projects' | 'team';

type KpiItem = {
  change: string;
  description: string;
  icon: Icon;
  label: string;
  path: string;
  tone: 'amber' | 'blue' | 'green' | 'red' | 'neutral';
  value: string;
};

const DEFAULT_SALES_GROUPS: DashboardQueueGroup[] = [
  'Intake',
  'Proposal and Quotation',
  'Order and Payment',
  'Delivery',
];

const DATE_RANGE_LABEL: Record<DateRangeKey, string> = {
  today: 'Today',
  'this-week': 'This week',
  'this-month': 'This month',
};

export function SaleDashbroad() {
  const [activeGroup, setActiveGroup] = useState<DashboardQueueGroup>('Intake');
  const [dateRange, setDateRange] = useState<DateRangeKey>('this-week');
  const [scope, setScope] = useState<ScopeKey>('my-projects');
  const [lastRefreshAt, setLastRefreshAt] = useState(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const apiScope: DashboardScope = scope === 'my-projects' ? 'mine' : 'team';
  const apiDateRange = toApiDateRange(dateRange);
  const queueQuery = useSalesActionQueue({
    scope: apiScope,
    group: activeGroup,
    dateRange: apiDateRange,
    page: 1,
    limit: 20,
  });
  const kpisQuery = useSalesDashboardKpis({
    scope: apiScope,
    dateRange: apiDateRange,
  });

  const queueItems = queueQuery.data?.items ?? [];
  const countsByGroup = queueQuery.data?.countsByGroup ?? {};
  const queueGroups = useMemo(() => {
    const fromApi = Object.keys(countsByGroup);
    return fromApi.length > 0 ? fromApi : DEFAULT_SALES_GROUPS;
  }, [countsByGroup]);
  const kpis = useMemo(
    () => mapSalesKpis(kpisQuery.data, DATE_RANGE_LABEL[dateRange]),
    [dateRange, kpisQuery.data],
  );
  const refreshTime = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(lastRefreshAt);
  const isLoading = queueQuery.isLoading || kpisQuery.isLoading;
  const loadError = queueQuery.error
    ? getDashboardServiceResultMessage(queueQuery.error)
    : kpisQuery.error
      ? getDashboardServiceResultMessage(kpisQuery.error)
      : null;

  async function handleRefresh() {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await Promise.all([queueQuery.refetch(), kpisQuery.refetch()]);
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
                    <em>{countsByGroup[group] ?? 0}</em>
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
                {!isLoading && !loadError && queueItems.length === 0 ? (
                  <div className="sales-ops-queue-empty">
                    No actions in this phase for {DATE_RANGE_LABEL[dateRange].toLowerCase()}
                    {scope === 'my-projects' ? ' on your assigned projects' : ' across the team'}.
                  </div>
                ) : null}
                {queueItems.map((item) => (
                  <div className="sales-ops-queue-row" key={item.id}>
                    <strong title={item.warning ?? undefined}>{formatProjectLabel(item)}</strong>
                    <span>{item.customerName || '-'}</span>
                    <span>{item.phase || '-'}</span>
                    <span className={getPriorityClass(item.priority)}>{formatPriorityLabel(item.priority)}</span>
                    <span>{item.action}</span>
                    <span>{formatDueLabel(item.dueAt, item.dueBucket)}</span>
                    <em title={item.status}>{formatStatusLabel(item.status)}</em>
                    <Link
                      aria-label={`Open ${item.projectCode}`}
                      className="sales-ops-queue-open"
                      title="Open"
                      to={resolveSalesActionPath(item)}
                    >
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

function mapSalesKpis(data: SalesDashboardKpisDto | undefined, rangeLabel: string): KpiItem[] {
  return [
    {
      change: rangeLabel,
      description: 'Requests not yet accepted into consultation',
      icon: IconFolderOpen,
      label: 'New Project Requests',
      path: '/sales/project-requests',
      tone: 'amber',
      value: String(data?.newRequests ?? 0),
    },
    {
      change: rangeLabel,
      description: 'Assigned projects in active coordination',
      icon: IconProgressCheck,
      label: 'Active Projects',
      path: '/sales/assigned-projects',
      tone: 'blue',
      value: String(data?.activeProjects ?? 0),
    },
    {
      change: rangeLabel,
      description: 'Information, proposal, or quotation waiting on customer',
      icon: IconUserCheck,
      label: 'Waiting for Customer',
      path: '/sales/assigned-projects',
      tone: 'neutral',
      value: String(data?.waitingCustomer ?? 0),
    },
    {
      change: rangeLabel,
      description: 'Start fee, deposit, or remaining payment follow-up',
      icon: IconCreditCard,
      label: 'Payments Requiring Follow-up',
      path: '/sales/orders',
      tone: 'red',
      value: String(data?.paymentFollowUp ?? 0),
    },
    {
      change: rangeLabel,
      description: 'Overdue, blocked, or missing required action',
      icon: IconShieldExclamation,
      label: 'Overdue Tasks',
      path: '/sales/assigned-projects',
      tone: 'red',
      value: String(data?.overdueTasks ?? 0),
    },
  ];
}

function toApiDateRange(dateRange: DateRangeKey): DashboardDateRange {
  if (dateRange === 'today') return 'today';
  if (dateRange === 'this-week') return 'thisWeek';
  return 'thisMonth';
}

function formatProjectLabel(item: DashboardQueueItemDto) {
  return `${item.projectCode} ${item.projectName}`.trim();
}

function formatPriorityLabel(priority: DashboardPriority) {
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

function formatStatusLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDueLabel(dueAt: string | null, dueBucket: DashboardDueBucket | null) {
  if (dueBucket === 'OVERDUE') return 'Overdue';
  if (dueBucket === 'TODAY') return 'Today';
  if (dueBucket === 'THIS_WEEK') return 'This week';
  if (dueBucket === 'LATER') return dueAt ? formatShortDate(dueAt) : 'Later';
  if (dueAt) return formatShortDate(dueAt);
  return '-';
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' }).format(new Date(value));
}

function getPriorityClass(priority: DashboardPriority) {
  return `sales-ops-priority sales-ops-priority-${priority.toLowerCase()}`;
}

function resolveSalesActionPath(item: DashboardQueueItemDto) {
  const path = item.actionPath || '';

  if (path.startsWith('/orders/')) {
    return '/sales/orders';
  }

  const projectMatch = path.match(/^\/projects\/([^/]+)/);
  if (projectMatch?.[1]) {
    const projectId = projectMatch[1];
    if (item.group === 'Intake' || item.status === 'SUBMITTED' || item.status === 'NEED_BASIC_INFORMATION') {
      return `/sales/project-requests/${projectId}`;
    }
    return `/sales/assigned-projects/${projectId}`;
  }

  if (item.projectId) {
    if (item.group === 'Intake' || item.status === 'SUBMITTED' || item.status === 'NEED_BASIC_INFORMATION') {
      return `/sales/project-requests/${item.projectId}`;
    }
    return `/sales/assigned-projects/${item.projectId}`;
  }

  return path.startsWith('/') ? path : '/sales/assigned-projects';
}
