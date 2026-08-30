import { useEffect, useMemo, useState } from 'react';
import {
  IconAdjustments,
  IconArrowRight,
  IconBan,
  IconCalendarCheck,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconClockCog,
  IconFilter,
  IconRefresh,
  IconTool,
  IconTruckDelivery,
  type Icon,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import { ProductionLayout } from '@/features/ProductionPages/productioncomponents';
import type {
  DashboardDateRange,
  DashboardDueBucket,
  DashboardQueueItemDto,
  DashboardScope,
  ProductionDashboardKpisDto,
  ProductionDashboardWorkType,
  ProjectPhaseDeadlineRiskItemDto,
} from '@/services/api/dashboard';
import {
  getDashboardServiceResultMessage,
  useCurrentUser,
  useProductionDashboardKpis,
  useProductionQueue,
  useProjectPhaseDeadlineRisks,
} from '@/services/queries';

import './ProductionDashbroad.css';

type KpiItem = {
  description: string;
  icon: Icon;
  label: string;
  note: string;
  onSelect?: () => void;
  path?: string;
  tone: 'amber' | 'blue' | 'green' | 'red' | 'neutral';
  value: string;
};

type QueueTabId = 'all' | 'customization' | 'production' | 'delivery' | 'overdue';
type ProductionStatusFilter = 'ALL' | 'PENDING' | 'IN_PRODUCTION' | 'READY_TO_COMPLETE' | 'COMPLETED';
type DeliveryStatusFilter = 'ALL' | 'AWAITING_SCHEDULE' | 'SCHEDULED' | 'IN_PROGRESS' | 'AWAITING_CUSTOMER_CONFIRMATION';
type DateRangeKey = 'today' | 'this-week' | 'this-month';
type QueueScopeKey = 'all' | 'assigned';

type QueueTabConfig = {
  id: QueueTabId;
  label: string;
  workType?: ProductionDashboardWorkType;
  dueBucket?: DashboardDueBucket;
  forceScopeAll?: boolean;
};

const QUEUE_TABS: QueueTabConfig[] = [
  { id: 'all', label: 'All Queue' },
  { id: 'customization', label: 'Customization', workType: 'CUSTOMIZATION_REVIEW', forceScopeAll: true },
  { id: 'production', label: 'Production', workType: 'PRODUCTION_REQUEST' },
  { id: 'delivery', label: 'Delivery', workType: 'DELIVERY' },
  { id: 'overdue', label: 'Overdue', dueBucket: 'OVERDUE' },
];

const PRODUCTION_STATUS_FILTERS: Array<{ label: string; value: ProductionStatusFilter }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'In Production', value: 'IN_PRODUCTION' },
  { label: 'Ready to Complete', value: 'READY_TO_COMPLETE' },
  { label: 'Completed', value: 'COMPLETED' },
];

const DATE_RANGE_LABEL: Record<DateRangeKey, string> = {
  today: 'Today',
  'this-week': 'This week',
  'this-month': 'This month',
};

const MIN_QUEUE_PAGE_SIZE = 1;
const MAX_QUEUE_PAGE_SIZE = 100;
const DEFAULT_QUEUE_PAGE_SIZE = 10;

export function ProductionDashbroad() {
  const [activeTab, setActiveTab] = useState<QueueTabId>('all');
  const [productionStatus, setProductionStatus] = useState<ProductionStatusFilter>('ALL');
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatusFilter>('ALL');
  const [dateRange, setDateRange] = useState<DateRangeKey>('this-week');
  const [queueScope, setQueueScope] = useState<QueueScopeKey>('all');
  const [queuePage, setQueuePage] = useState(1);
  const [queuePageSize, setQueuePageSize] = useState(DEFAULT_QUEUE_PAGE_SIZE);
  const [lastRefreshAt, setLastRefreshAt] = useState(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentUserQuery = useCurrentUser();
  const accountId = currentUserQuery.data?.accountId ?? null;
  const activeTabConfig = QUEUE_TABS.find((tab) => tab.id === activeTab) ?? QUEUE_TABS[0];
  const apiScope: DashboardScope = activeTabConfig.forceScopeAll || queueScope === 'all' ? 'all' : 'mine';
  const apiDateRange = toApiDateRange(dateRange);
  const queueStatus = resolveQueueStatus(activeTab, productionStatus, deliveryStatus);

  const queueQuery = useProductionQueue({
    scope: apiScope,
    dateRange: apiDateRange,
    workType: activeTabConfig.workType ?? null,
    status: queueStatus,
    dueBucket: activeTabConfig.dueBucket ?? null,
    page: queuePage,
    limit: queuePageSize,
  });
  const kpisQuery = useProductionDashboardKpis({
    scope: queueScope === 'assigned' ? 'mine' : 'all',
    dateRange: apiDateRange,
  });
  const customizationKpisQuery = useProductionDashboardKpis(
    { scope: 'all', dateRange: apiDateRange },
    queueScope === 'assigned',
  );
  const deadlineRisksQuery = useProjectPhaseDeadlineRisks(
    {
      phase: 'PRODUCTION',
      status: 'OVERDUE',
      productionId: accountId,
      page: 1,
      limit: 8,
    },
    { enabled: Boolean(accountId) },
  );

  const queueItems = useMemo(() => queueQuery.data?.items ?? [], [queueQuery.data?.items]);
  const countsByWorkType = queueQuery.data?.countsByWorkType ?? {};
  const countsByStatus = queueQuery.data?.countsByStatus ?? {};
  const overdueCount = kpisQuery.data?.overdueTasks ?? 0;
  const queueTotal = queueQuery.data?.total ?? 0;
  const queueTotalPages = Math.max(1, Math.ceil(queueTotal / queuePageSize) || 1);

  useEffect(() => {
    setQueuePage(1);
  }, [activeTab, productionStatus, deliveryStatus, dateRange, queueScope, queuePageSize]);

  useEffect(() => {
    setQueuePage((currentPage) => Math.min(currentPage, queueTotalPages));
  }, [queueTotalPages]);

  function applyKpiFilter(filter: {
    tab: QueueTabId;
    productionStatus?: ProductionStatusFilter;
    deliveryStatus?: DeliveryStatusFilter;
    forceAllScope?: boolean;
  }) {
    setActiveTab(filter.tab);
    setProductionStatus(filter.productionStatus ?? 'ALL');
    setDeliveryStatus(filter.deliveryStatus ?? 'ALL');
    if (filter.forceAllScope) {
      setQueueScope('all');
    }
  }

  const visibleKpis = mapProductionKpis({
    data: kpisQuery.data,
    customizationPending:
      queueScope === 'assigned'
        ? customizationKpisQuery.data?.pendingCustomizationReview
        : kpisQuery.data?.pendingCustomizationReview,
    rangeLabel: DATE_RANGE_LABEL[dateRange],
    onSelectFilter: applyKpiFilter,
  });
  const overdueDeadlines = deadlineRisksQuery.data?.items ?? [];
  const refreshTime = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(lastRefreshAt);
  const isLoading = queueQuery.isLoading || kpisQuery.isLoading;
  const loadError = resolveLoadError(queueQuery.error, kpisQuery.error);

  async function handleRefresh() {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await Promise.all([
        queueQuery.refetch(),
        kpisQuery.refetch(),
        customizationKpisQuery.refetch(),
        deadlineRisksQuery.refetch(),
      ]);
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
            <p>Customization review, production queue, deadlines, and delivery readiness</p>
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
            <select
              disabled={activeTabConfig.forceScopeAll}
              value={queueScope}
              onChange={(event) => setQueueScope(event.target.value as QueueScopeKey)}
            >
              <option value="all">All queue</option>
              <option value="assigned">Assigned to me</option>
            </select>
          </label>
          <Link className="production-ops-primary-action" to="/production/requests">
            Open Production Requests <IconArrowRight size={16} />
          </Link>
        </section>

        <section className="production-ops-kpi-grid production-ops-kpi-grid-wide">
          {visibleKpis.map((kpi) => {
            const content = (
              <>
                <span><kpi.icon size={19} /></span>
                <div>
                  <small>{kpi.label}</small>
                  <strong>{kpi.value}</strong>
                  <p>{kpi.note}</p>
                </div>
              </>
            );

            if (kpi.onSelect) {
              return (
                <button
                  className={`production-ops-kpi production-ops-kpi-${kpi.tone}`}
                  key={kpi.label}
                  title={kpi.description}
                  type="button"
                  onClick={kpi.onSelect}
                >
                  {content}
                </button>
              );
            }

            return (
              <Link className={`production-ops-kpi production-ops-kpi-${kpi.tone}`} key={kpi.label} title={kpi.description} to={kpi.path ?? '/production/requests'}>
                {content}
              </Link>
            );
          })}
        </section>

        <section className="production-ops-main-grid">
          <article className="production-workspace-card production-ops-queue">
            <header className="production-ops-section-header">
              <div>
                <h3>Production Queue</h3>
                <p>Unified work across customization, production requests, and delivery.</p>
              </div>
              <IconFilter size={20} />
            </header>
            <div className="production-ops-tabs" role="tablist" aria-label="Production queue work types">
              {QUEUE_TABS.map((tab) => (
                <button
                  aria-selected={activeTab === tab.id}
                  key={tab.id}
                  role="tab"
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.forceScopeAll) setQueueScope('all');
                    if (tab.id !== 'production') setProductionStatus('ALL');
                    if (tab.id !== 'delivery') setDeliveryStatus('ALL');
                  }}
                >
                  {tab.label}
                  <em>{getTabCount(tab, queueQuery.data?.total ?? 0, countsByWorkType, overdueCount)}</em>
                </button>
              ))}
            </div>

            {activeTab === 'production' ? (
              <div className="production-ops-status-chips" aria-label="Production status filters">
                {PRODUCTION_STATUS_FILTERS.map((filter) => (
                  <button
                    className={productionStatus === filter.value ? 'is-active' : undefined}
                    key={filter.value}
                    type="button"
                    onClick={() => setProductionStatus(filter.value)}
                  >
                    {filter.label}
                    <em>
                      {filter.value === 'ALL'
                        ? countsByWorkType.PRODUCTION_REQUEST ?? queueQuery.data?.total ?? 0
                        : countsByStatus[filter.value] ?? 0}
                    </em>
                  </button>
                ))}
              </div>
            ) : null}

            {activeTabConfig.forceScopeAll && queueScope === 'assigned' ? (
              <p className="production-ops-scope-note">Customization queue always uses scope=all.</p>
            ) : null}
            {activeTab === 'delivery' && deliveryStatus === 'AWAITING_SCHEDULE' ? (
              <p className="production-ops-scope-note">Filtered to delivery items awaiting DELIVERY schedule.</p>
            ) : null}

            <div className="production-ops-queue-table">
              <div className="production-ops-queue-head production-ops-queue-head-typed">
                <span>Project</span>
                <span>Type</span>
                <span>Assigned</span>
                <span className="production-ops-queue-col-center">Priority</span>
                <span>Action</span>
                <span>Deadline</span>
                <span className="production-ops-queue-col-center">Status</span>
                <span />
              </div>
              {isLoading ? <div className="production-ops-queue-empty">Loading production queue...</div> : null}
              {loadError ? <div className="production-ops-queue-empty">{loadError}</div> : null}
              {!isLoading && !loadError && queueItems.length === 0 ? (
                <div className="production-ops-queue-empty">No production work matches the selected filters.</div>
              ) : null}
              {queueItems.map((item) => (
                <div className="production-ops-queue-row production-ops-queue-row-typed" key={item.id}>
                  <strong title={`${item.id} · ${formatProjectLabel(item)}`}>{formatProjectLabel(item)}</strong>
                  <span>{formatWorkTypeLabel(getWorkType(item))}</span>
                  <span>{item.assigneeName || 'Unassigned'}</span>
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

            {!isLoading && !loadError ? (
              <ProductionQueuePager
                page={queuePage}
                pageSize={queuePageSize}
                totalItems={queueTotal}
                totalPages={queueTotalPages}
                onChange={setQueuePage}
                onPageSizeChange={(nextSize) => {
                  setQueuePageSize(nextSize);
                  setQueuePage(1);
                }}
              />
            ) : null}
          </article>

          <aside className="production-workspace-card production-ops-deadline-panel">
            <header className="production-ops-section-header">
              <div>
                <h3>Overdue Production Deadlines</h3>
                <p>Phase PRODUCTION risks for your assigned work.</p>
              </div>
              <IconBan size={20} />
            </header>
            {deadlineRisksQuery.isLoading ? <p className="production-ops-queue-empty">Loading deadlines...</p> : null}
            {deadlineRisksQuery.isError ? (
              <p className="production-ops-queue-empty">{getDashboardServiceResultMessage(deadlineRisksQuery.error)}</p>
            ) : null}
            {!deadlineRisksQuery.isLoading && !deadlineRisksQuery.isError && overdueDeadlines.length === 0 ? (
              <p className="production-ops-queue-empty">No overdue production deadlines.</p>
            ) : null}
            <ul className="production-ops-deadline-list">
              {overdueDeadlines.map((item) => (
                <li key={`${item.projectId}-${item.phase}-${item.dueDate}`}>
                  <div>
                    <strong>{item.projectCode}</strong>
                    <span>{item.projectName}</span>
                  </div>
                  <em>{formatDeadlineRisk(item)}</em>
                </li>
              ))}
            </ul>
            <button className="production-ops-deadline-link" type="button" onClick={() => applyKpiFilter({ tab: 'overdue' })}>
              View overdue queue <IconArrowRight size={14} />
            </button>
          </aside>
        </section>
      </div>
    </ProductionLayout>
  );
}

function getTabCount(
  tab: QueueTabConfig,
  total: number,
  countsByWorkType: Record<string, number>,
  overdueCount: number,
) {
  if (tab.id === 'all') {
    return Object.values(countsByWorkType).reduce((sum, value) => sum + value, 0) || total;
  }
  if (tab.id === 'overdue') {
    return overdueCount;
  }
  if (tab.workType) {
    return countsByWorkType[tab.workType] ?? 0;
  }
  return total;
}

function mapProductionKpis(input: {
  data: ProductionDashboardKpisDto | undefined;
  customizationPending?: number;
  rangeLabel: string;
  onSelectFilter: (filter: {
    tab: QueueTabId;
    productionStatus?: ProductionStatusFilter;
    deliveryStatus?: DeliveryStatusFilter;
    forceAllScope?: boolean;
  }) => void;
}): KpiItem[] {
  const data = input.data;
  const pendingStart = data?.pendingStart ?? Number(data && 'pendingReview' in data ? data.pendingReview : 0);

  return [
    {
      description: 'Customization versions waiting for feasibility review',
      icon: IconAdjustments,
      label: 'Customization',
      note: input.rangeLabel,
      tone: 'amber',
      value: String(input.customizationPending ?? data?.pendingCustomizationReview ?? 0),
      onSelect: () => input.onSelectFilter({ tab: 'customization', forceAllScope: true }),
    },
    {
      description: 'Production requests waiting to start',
      icon: IconClock,
      label: 'Pending Start',
      note: input.rangeLabel,
      tone: 'amber',
      value: String(pendingStart),
      onSelect: () => input.onSelectFilter({ tab: 'production', productionStatus: 'PENDING' }),
    },
    {
      description: 'Production requests currently active',
      icon: IconClockCog,
      label: 'In Production',
      note: input.rangeLabel,
      tone: 'neutral',
      value: String(data?.inProduction ?? 0),
      onSelect: () => input.onSelectFilter({ tab: 'production', productionStatus: 'IN_PRODUCTION' }),
    },
    {
      description: 'Requests ready to complete',
      icon: IconTool,
      label: 'Ready To Complete',
      note: input.rangeLabel,
      tone: 'blue',
      value: String(data?.readyToComplete ?? 0),
      onSelect: () => input.onSelectFilter({ tab: 'production', productionStatus: 'READY_TO_COMPLETE' }),
    },
    {
      description: 'Active requests past committed production deadline',
      icon: IconBan,
      label: 'Overdue',
      note: input.rangeLabel,
      tone: 'red',
      value: String(data?.overdueTasks ?? 0),
      onSelect: () => input.onSelectFilter({ tab: 'overdue' }),
    },
    {
      description: 'Orders in delivery flow',
      icon: IconTruckDelivery,
      label: 'Ready Delivery',
      note: input.rangeLabel,
      tone: 'blue',
      value: String(data?.readyForDelivery ?? 0),
      onSelect: () => input.onSelectFilter({ tab: 'delivery' }),
    },
    {
      description: 'Ready for delivery without a DELIVERY schedule',
      icon: IconCalendarCheck,
      label: 'Awaiting Schedule',
      note: input.rangeLabel,
      tone: 'amber',
      value: String(data?.awaitingDeliverySchedule ?? 0),
      onSelect: () => input.onSelectFilter({ tab: 'delivery', deliveryStatus: 'AWAITING_SCHEDULE' }),
    },
    {
      description: 'Production requests completed in selected date range',
      icon: IconCheck,
      label: 'Completed',
      note: input.rangeLabel,
      tone: 'green',
      value: String(data?.completedInRange ?? 0),
      onSelect: () => input.onSelectFilter({ tab: 'production', productionStatus: 'COMPLETED' }),
    },
  ];
}

function resolveQueueStatus(
  activeTab: QueueTabId,
  productionStatus: ProductionStatusFilter,
  deliveryStatus: DeliveryStatusFilter,
) {
  if (activeTab === 'production' && productionStatus !== 'ALL') {
    return productionStatus;
  }

  if (activeTab === 'delivery' && deliveryStatus !== 'ALL') {
    return deliveryStatus;
  }

  return null;
}

function resolveLoadError(queueError: unknown, kpisError: unknown) {
  if (queueError) {
    return getDashboardServiceResultMessage(queueError);
  }

  if (kpisError) {
    return getDashboardServiceResultMessage(kpisError);
  }

  return null;
}

function ProductionQueuePager({
  page,
  pageSize,
  totalPages,
  totalItems,
  onChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  onChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const safeTotalPages = Math.max(totalPages, 1);
  const [pageDraft, setPageDraft] = useState(String(page));
  const [sizeDraft, setSizeDraft] = useState(String(pageSize));

  useEffect(() => {
    setPageDraft(String(page));
  }, [page]);

  useEffect(() => {
    setSizeDraft(String(pageSize));
  }, [pageSize]);

  function commitPage() {
    const parsed = Number.parseInt(pageDraft, 10);
    if (!Number.isFinite(parsed)) {
      setPageDraft(String(page));
      return;
    }

    const next = Math.min(Math.max(parsed, 1), safeTotalPages);
    setPageDraft(String(next));
    if (next !== page) onChange(next);
  }

  function commitPageSize() {
    const parsed = Number.parseInt(sizeDraft, 10);
    if (!Number.isFinite(parsed)) {
      setSizeDraft(String(pageSize));
      return;
    }

    const next = Math.min(Math.max(parsed, MIN_QUEUE_PAGE_SIZE), MAX_QUEUE_PAGE_SIZE);
    setSizeDraft(String(next));
    if (next !== pageSize) onPageSizeChange(next);
  }

  return (
    <div className="admin-financial-pager production-ops-queue-pager">
      <div className="admin-financial-pager-meta">
        <label className="admin-financial-pager-field">
          <span>Rows / page</span>
          <input
            aria-label="Rows per page"
            inputMode="numeric"
            max={MAX_QUEUE_PAGE_SIZE}
            min={MIN_QUEUE_PAGE_SIZE}
            type="number"
            value={sizeDraft}
            onBlur={commitPageSize}
            onChange={(event) => setSizeDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
              }
            }}
          />
        </label>
        <label className="admin-financial-pager-field">
          <span>Page</span>
          <input
            aria-label="Page"
            inputMode="numeric"
            max={safeTotalPages}
            min={1}
            type="number"
            value={pageDraft}
            onBlur={commitPage}
            onChange={(event) => setPageDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
              }
            }}
          />
          <span className="admin-financial-pager-of">/ {safeTotalPages}</span>
        </label>
        <span className="admin-financial-pager-total">{totalItems} total</span>
      </div>
      <div className="admin-financial-pager-nav">
        <button disabled={page <= 1} type="button" onClick={() => onChange(page - 1)}>
          Previous
        </button>
        <button disabled={page >= safeTotalPages} type="button" onClick={() => onChange(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}

function toApiDateRange(dateRange: DateRangeKey): DashboardDateRange {
  if (dateRange === 'today') return 'today';
  if (dateRange === 'this-week') return 'thisWeek';
  return 'thisMonth';
}

function priorityClass(priority: string) {
  return `production-ops-priority production-ops-priority-${priority.toLowerCase()}`;
}

function formatProjectLabel(item: DashboardQueueItemDto) {
  return `${item.projectCode} ${item.projectName}`.trim();
}

function formatPriorityLabel(priority: string) {
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

function formatStatusLabel(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatWorkTypeLabel(workType: string) {
  if (workType === 'CUSTOMIZATION_REVIEW') return 'Customization';
  if (workType === 'DELIVERY') return 'Delivery';
  return 'Production';
}

function getWorkType(item: DashboardQueueItemDto) {
  return item.workType || 'PRODUCTION_REQUEST';
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

function formatDeadlineRisk(item: ProjectPhaseDeadlineRiskItemDto) {
  const due = formatShortDate(item.dueDate);
  return `${item.days}d overdue · due ${due}`;
}

function resolveProductionActionPath(item: DashboardQueueItemDto) {
  const workType = getWorkType(item);
  const links = item.links;
  const path = item.actionPath || '';

  if (path.startsWith('/production/')) {
    return path;
  }

  if (workType === 'CUSTOMIZATION_REVIEW') {
    const versionId = links?.versionId || item.entityId || item.id;
    return `/production/customization-reviews?versionId=${encodeURIComponent(versionId)}`;
  }

  if (workType === 'DELIVERY') {
    const orderId = links?.orderId || item.entityId;
    if (orderId) {
      return `/production/ready-for-delivery?orderId=${encodeURIComponent(orderId)}`;
    }
    return '/production/ready-for-delivery';
  }

  const productionRequestId = links?.productionRequestId || item.entityId || item.id;
  const legacyMatch = /\/production-requests\/([^/?]+)/.exec(path);
  if (legacyMatch?.[1]) {
    return `/production/requests/${legacyMatch[1]}`;
  }

  return `/production/requests/${productionRequestId}`;
}
