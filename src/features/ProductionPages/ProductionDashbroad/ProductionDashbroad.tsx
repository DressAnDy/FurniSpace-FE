import { useMemo, useState } from 'react';
import {
  IconArrowRight,
  IconBan,
  IconChevronRight,
  IconClock,
  IconClockCog,
  IconFilter,
  IconRefresh,
  IconTool,
  type Icon,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import { ProductionLayout } from '@/features/ProductionPages/productioncomponents';
import type {
  DashboardDateRange,
  DashboardDueBucket,
  DashboardPriority,
  DashboardQueueItemDto,
  DashboardScope,
  ProductionDashboardKpisDto,
} from '@/services/api/dashboard';
import {
  getDashboardServiceResultMessage,
  useProductionDashboardKpis,
  useProductionQueue,
} from '@/services/queries';

import './ProductionDashbroad.css';

type KpiItem = {
  description: string;
  icon: Icon;
  label: string;
  note: string;
  path: string;
  tone: 'amber' | 'blue' | 'green' | 'red' | 'neutral';
  value: string;
};

type QueueTab = 'All Queue' | 'Pending' | 'In Production' | 'Ready to Complete' | 'Completed';
type DateRangeKey = 'today' | 'this-week' | 'this-month';
type QueueScopeKey = 'all' | 'assigned';

const queueTabs: QueueTab[] = ['All Queue', 'Pending', 'In Production', 'Ready to Complete', 'Completed'];

const DATE_RANGE_LABEL: Record<DateRangeKey, string> = {
  today: 'Today',
  'this-week': 'This week',
  'this-month': 'This month',
};

const TAB_STATUS_MAP: Record<Exclude<QueueTab, 'All Queue'>, string[]> = {
  Pending: ['PENDING'],
  'In Production': ['ASSIGNED', 'IN_PRODUCTION'],
  'Ready to Complete': ['READY_TO_COMPLETE'],
  Completed: ['COMPLETED'],
};

export function ProductionDashbroad() {
  const [activeTab, setActiveTab] = useState<QueueTab>('All Queue');
  const [dateRange, setDateRange] = useState<DateRangeKey>('this-week');
  const [queueScope, setQueueScope] = useState<QueueScopeKey>('all');
  const [lastRefreshAt, setLastRefreshAt] = useState(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const apiScope: DashboardScope = queueScope === 'assigned' ? 'mine' : 'all';
  const apiDateRange = toApiDateRange(dateRange);
  const queueQuery = useProductionQueue({
    scope: apiScope,
    dateRange: apiDateRange,
    page: 1,
    limit: 50,
  });
  const kpisQuery = useProductionDashboardKpis({
    scope: apiScope,
    dateRange: apiDateRange,
  });

  const allItems = useMemo(() => queueQuery.data?.items ?? [], [queueQuery.data?.items]);
  const tabCounts = useMemo(() => getTabCounts(allItems), [allItems]);
  const activeQueue = useMemo(() => {
    if (activeTab === 'All Queue') {
      return allItems;
    }

    const statuses = TAB_STATUS_MAP[activeTab];
    return allItems.filter((item) => statuses.includes(item.status));
  }, [activeTab, allItems]);
  const visibleKpis = useMemo(
    () => mapProductionKpis(kpisQuery.data, DATE_RANGE_LABEL[dateRange]),
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
    <ProductionLayout activeLabel="Dashboard" searchPlaceholder="Search production queue...">
      <div className="production-workspace-page production-dashboard-page">
        <section className="production-ops-header">
          <div>
            <span>Production Workspace</span>
            <h2>Production Dashboard</h2>
            <p>Production queue, item execution, blockers, and delivery readiness</p>
          </div>
          <div className="production-ops-header-side">
            <button
              className="production-ops-refresh-button"
              disabled={isRefreshing}
              type="button"
              onClick={() => void handleRefresh()}
            >
              <IconRefresh className={isRefreshing ? 'is-spinning' : undefined} size={14} />
              {isRefreshing ? 'Refreshing...' : `Refresh · ${refreshTime}`}
            </button>
          </div>
        </section>

        <section className="production-ops-filter-bar" aria-label="Production dashboard filters">
          <label>
            <span>Date range</span>
            <select value={dateRange} onChange={(event) => setDateRange(event.target.value as DateRangeKey)}>
              <option value="today">Today</option>
              <option value="this-week">This week</option>
              <option value="this-month">This month</option>
            </select>
          </label>
          <label>
            <span>Queue scope</span>
            <select value={queueScope} onChange={(event) => setQueueScope(event.target.value as QueueScopeKey)}>
              <option value="all">All queue</option>
              <option value="assigned">Assigned to me</option>
            </select>
          </label>
          <Link className="production-ops-primary-action" to="/production/requests">
            Open Production Queue <IconArrowRight size={16} />
          </Link>
        </section>

        <section className="production-ops-kpi-grid">
          {visibleKpis.map(({ description, icon: KpiIcon, label, note, path, tone, value }) => (
            <Link className={`production-ops-kpi production-ops-kpi-${tone}`} key={label} title={description} to={path}>
              <span><KpiIcon size={19} /></span>
              <div>
                <small>{label}</small>
                <strong>{value}</strong>
                <p>{note}</p>
              </div>
            </Link>
          ))}
        </section>

        <section className="production-ops-main-grid production-ops-main-grid-single">
          <article className="production-workspace-card production-ops-queue">
            <header className="production-ops-section-header">
              <div>
                <h3>Production Queue</h3>
                <p>Prioritized production work grouped by request stage.</p>
              </div>
              <IconFilter size={20} />
            </header>
            <div className="production-ops-tabs" role="tablist" aria-label="Production queue filters">
              {queueTabs.map((tab) => (
                <button aria-selected={activeTab === tab} key={tab} role="tab" type="button" onClick={() => setActiveTab(tab)}>
                  {tab}
                  <em>{tabCounts[tab]}</em>
                </button>
              ))}
            </div>
            <div className="production-ops-queue-table">
              <div className="production-ops-queue-head">
                <span>Project</span>
                <span>Assigned</span>
                <span>Phase</span>
                <span className="production-ops-queue-col-center">Priority</span>
                <span>Action</span>
                <span>Deadline</span>
                <span className="production-ops-queue-col-center">Status</span>
                <span />
              </div>
              {isLoading ? <div className="production-ops-queue-empty">Loading production queue...</div> : null}
              {loadError ? <div className="production-ops-queue-empty">{loadError}</div> : null}
              {!isLoading && !loadError && activeQueue.length === 0 ? (
                <div className="production-ops-queue-empty">No production work matches the selected filters.</div>
              ) : null}
              {activeQueue.map((item) => (
                <div className="production-ops-queue-row" key={item.id}>
                  <strong title={`${item.id} · ${formatProjectLabel(item)}`}>{formatProjectLabel(item)}</strong>
                  <span>{item.assigneeName || 'Unassigned'}</span>
                  <span>{item.phase || '-'}</span>
                  <span className={priorityClass(item.priority)}>{formatPriorityLabel(item.priority)}</span>
                  <span>{item.action}</span>
                  <span>{formatDueLabel(item.dueAt, item.dueBucket)}</span>
                  <em title={item.status}>{formatStatusLabel(item.status)}</em>
                  <Link
                    aria-label={`Open ${item.projectCode}`}
                    className="production-ops-queue-open"
                    title="Open"
                    to={resolveProductionActionPath(item)}
                  >
                    <IconChevronRight size={18} stroke={2} />
                  </Link>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </ProductionLayout>
  );
}

function getTabCounts(items: DashboardQueueItemDto[]): Record<QueueTab, number> {
  return {
    'All Queue': items.length,
    Pending: items.filter((item) => TAB_STATUS_MAP.Pending.includes(item.status)).length,
    'In Production': items.filter((item) => TAB_STATUS_MAP['In Production'].includes(item.status)).length,
    'Ready to Complete': items.filter((item) => TAB_STATUS_MAP['Ready to Complete'].includes(item.status)).length,
    Completed: items.filter((item) => TAB_STATUS_MAP.Completed.includes(item.status)).length,
  };
}

function mapProductionKpis(data: ProductionDashboardKpisDto | undefined, rangeLabel: string): KpiItem[] {
  return [
    {
      description: 'Requests waiting to start production',
      icon: IconClock,
      label: 'Pending',
      note: rangeLabel,
      path: '/production/requests',
      tone: 'amber',
      value: String(data?.pendingReview ?? 0),
    },
    {
      description: 'Production requests currently active',
      icon: IconClockCog,
      label: 'In Production',
      note: rangeLabel,
      path: '/production/requests',
      tone: 'neutral',
      value: String(data?.inProduction ?? 0),
    },
    {
      description: 'Requests ready to complete',
      icon: IconTool,
      label: 'Ready To Complete',
      note: rangeLabel,
      path: '/production/requests',
      tone: 'blue',
      value: String(data?.readyToComplete ?? 0),
    },
    {
      description: 'Active requests past committed production deadline',
      icon: IconBan,
      label: 'Overdue (Deadline)',
      note: rangeLabel,
      path: '/production/requests',
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

function priorityClass(priority: DashboardPriority) {
  return `production-ops-priority production-ops-priority-${priority.toLowerCase()}`;
}

function formatProjectLabel(item: DashboardQueueItemDto) {
  return `${item.projectCode} ${item.projectName}`.trim();
}

function formatPriorityLabel(priority: DashboardPriority) {
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

function formatStatusLabel(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDueLabel(dueAt: string | null, dueBucket: DashboardDueBucket | null) {
  if (dueBucket === 'OVERDUE') return dueAt ? `Overdue · ${formatShortDate(dueAt)}` : 'Overdue';
  if (dueBucket === 'TODAY') return 'Deadline today';
  if (dueBucket === 'THIS_WEEK') return dueAt ? `This week · ${formatShortDate(dueAt)}` : 'This week';
  if (dueBucket === 'LATER') return dueAt ? formatShortDate(dueAt) : 'Later';
  if (dueAt) return formatShortDate(dueAt);
  return 'No deadline';
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' }).format(new Date(value));
}

function resolveProductionActionPath(item: DashboardQueueItemDto) {
  const path = item.actionPath || '';
  const requestMatch = path.match(/^\/production-requests\/([^/]+)/);

  if (requestMatch?.[1]) {
    return `/production/requests/${requestMatch[1]}`;
  }

  if (item.id) {
    return `/production/requests/${item.id}`;
  }

  return path.startsWith('/') ? path : '/production/requests';
}
