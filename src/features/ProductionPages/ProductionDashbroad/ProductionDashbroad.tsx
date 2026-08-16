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
import { useCurrentUser } from '@/services/queries';

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

type QueueTab = 'All Queue' | 'Pending Review' | 'In Production' | 'Ready to Complete' | 'Completed';
type DateRangeKey = 'today' | 'this-week' | 'this-month';
type QueueScopeKey = 'all' | 'assigned';

type QueueItem = {
  action: string;
  assigned: string;
  assignedToCurrentUser?: boolean;
  completed: number;
  due: string;
  dueBucket: 'today' | 'this-week' | 'this-month' | 'overdue';
  path: string;
  phase: string;
  priority: 'High' | 'Medium' | 'Low';
  project: string;
  request: string;
  risk: string;
  start: string;
  status: string;
  total: number;
  tabs: QueueTab[];
  unavailableItems?: number;
};

const queueTabs: QueueTab[] = ['All Queue', 'Pending Review', 'In Production', 'Ready to Complete', 'Completed'];

// Mocked until production dashboard aggregation endpoints are available.
const productionQueue: QueueItem[] = [
  { action: 'Review request', assigned: 'Shared queue', completed: 0, due: 'Today 13:00', dueBucket: 'today', path: '/production/requests', phase: 'Pending review', priority: 'High', project: 'PRJ-2026-184 Bean & Brew', request: 'PROD-2026-090', risk: 'Review overdue', start: '-', status: 'PENDING_REVIEW', tabs: ['All Queue', 'Pending Review'], total: 12 },
  { action: 'Start production', assigned: '', assignedToCurrentUser: true, completed: 3, due: 'This week', dueBucket: 'this-week', path: '/production/requests', phase: 'Assigned', priority: 'Medium', project: 'PRJ-2026-181 Luma Cafe', request: 'PROD-2026-088', risk: 'On track', start: 'Aug 5', status: 'ASSIGNED', tabs: ['All Queue', 'In Production'], total: 10 },
  { action: 'View items', assigned: '', assignedToCurrentUser: true, completed: 8, due: 'Tomorrow', dueBucket: 'this-week', path: '/production/requests', phase: 'In production', priority: 'High', project: 'PRJ-2026-176 Nova Work Lounge', request: 'PROD-2026-084', risk: '2 items due soon', start: 'Aug 3', status: 'IN_PRODUCTION', tabs: ['All Queue', 'In Production'], total: 16 },
  { action: 'Review unavailable item', assigned: 'Huy Pham', completed: 5, due: 'Overdue', dueBucket: 'overdue', path: '/production/blocked-issues', phase: 'Blocked item', priority: 'High', project: 'PRJ-2026-166 Studio Nine', request: 'PROD-2026-080', risk: 'Material unavailable', start: 'Aug 1', status: 'CANCELLED_ITEM', tabs: ['All Queue'], total: 15, unavailableItems: 3 },
  { action: 'Complete request', assigned: 'Lan Ho', completed: 14, due: 'Today', dueBucket: 'today', path: '/production/requests', phase: 'Ready to complete', priority: 'Medium', project: 'PRJ-2026-160 Oak & Steel', request: 'PROD-2026-076', risk: 'Ready to complete', start: 'Jul 29', status: 'READY_TO_COMPLETE', tabs: ['All Queue', 'Ready to Complete'], total: 14 },
  { action: 'View delivery', assigned: 'Thanh Le', completed: 18, due: 'Done', dueBucket: 'this-month', path: '/production/ready-for-delivery', phase: 'Completed', priority: 'Low', project: 'PRJ-2026-151 Northline Office', request: 'PROD-2026-070', risk: 'Awaiting delivery', start: 'Jul 24', status: 'COMPLETED', tabs: ['All Queue', 'Completed'], total: 18 },
];

function priorityClass(priority: QueueItem['priority']) {
  return `production-ops-priority production-ops-priority-${priority.toLowerCase()}`;
}

function formatStatusLabel(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function matchesDateRange(item: QueueItem, dateRange: DateRangeKey) {
  if (dateRange === 'today') {
    return item.dueBucket === 'today' || item.dueBucket === 'overdue';
  }

  if (dateRange === 'this-week') {
    return item.dueBucket === 'today' || item.dueBucket === 'this-week' || item.dueBucket === 'overdue';
  }

  return true;
}

function getKpis(queue: QueueItem[]): KpiItem[] {
  const pendingReviewCount = queue.filter((item) => item.status === 'PENDING_REVIEW').length;
  const inProductionQueue = queue.filter((item) => item.status === 'ASSIGNED' || item.status === 'IN_PRODUCTION');
  const itemsInProgress = inProductionQueue.reduce(
    (total, item) => total + Math.max(item.total - item.completed, 0),
    0,
  );
  const unavailableItems = queue.reduce((total, item) => total + (item.unavailableItems ?? 0), 0);

  return [
    { description: 'Requests waiting for production review', icon: IconClock, label: 'Pending Review', note: 'Matching selected filters', path: '/production/requests', tone: 'amber', value: String(pendingReviewCount) },
    { description: 'Production requests currently active', icon: IconClockCog, label: 'In Production', note: 'Matching selected filters', path: '/production/requests', tone: 'neutral', value: String(inProductionQueue.length) },
    { description: 'Item-level execution currently active', icon: IconTool, label: 'Items In Progress', note: 'Remaining units in active requests', path: '/production/requests', tone: 'blue', value: String(itemsInProgress) },
    { description: 'Unavailable or cancelled item paths needing Sales/customer coordination', icon: IconBan, label: 'Unavailable Items', note: 'Matching selected filters', path: '/production/blocked-issues', tone: 'red', value: String(unavailableItems) },
  ];
}

export function ProductionDashbroad() {
  const [activeTab, setActiveTab] = useState<QueueTab>('All Queue');
  const [dateRange, setDateRange] = useState<DateRangeKey>('this-week');
  const [queueScope, setQueueScope] = useState<QueueScopeKey>('all');
  const [lastRefreshAt, setLastRefreshAt] = useState(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const currentUserQuery = useCurrentUser();
  const scopedQueue = useMemo(
    () =>
      productionQueue.filter(
        (item) =>
          matchesDateRange(item, dateRange)
          && (queueScope === 'all' || item.assignedToCurrentUser),
      ),
    [dateRange, queueScope],
  );
  const activeQueue = useMemo(
    () => scopedQueue.filter((item) => item.tabs.includes(activeTab)),
    [activeTab, scopedQueue],
  );
  const visibleKpis = useMemo(() => getKpis(scopedQueue), [scopedQueue]);
  const refreshTime = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(lastRefreshAt);
  const userName = currentUserQuery.data?.fullName ?? 'Production Staff';

  async function handleRefresh() {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await currentUserQuery.refetch();
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
                  <em>{scopedQueue.filter((item) => item.tabs.includes(tab)).length}</em>
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
                <span>Due</span>
                <span className="production-ops-queue-col-center">Status</span>
                <span />
              </div>
              {activeQueue.map((item) => (
                <div className="production-ops-queue-row" key={item.request}>
                  <strong title={`${item.request} · ${item.project}`}>{item.project}</strong>
                  <span>{item.assignedToCurrentUser ? userName : item.assigned}</span>
                  <span>{item.phase}</span>
                  <span className={priorityClass(item.priority)}>{item.priority}</span>
                  <span>{item.action}</span>
                  <span>{item.due}</span>
                  <em title={item.status}>{formatStatusLabel(item.status)}</em>
                  <Link aria-label={`Open ${item.project}`} className="production-ops-queue-open" title="Open" to={item.path}>
                    <IconChevronRight size={18} stroke={2} />
                  </Link>
                </div>
              ))}
              {activeQueue.length === 0 ? (
                <div className="production-ops-queue-empty">No production work matches the selected filters.</div>
              ) : null}
            </div>
          </article>
        </section>
      </div>
    </ProductionLayout>
  );
}
