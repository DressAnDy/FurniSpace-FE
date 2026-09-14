import { useEffect, useMemo, useRef, useState } from 'react';
import {
  IconArrowRight,
  IconChevronRight,
  IconCreditCard,
  IconFilter,
  IconFolderOpen,
  IconProgressCheck,
  IconRefresh,
  IconShieldExclamation,
  IconX,
  type Icon,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';

import { useLang } from '@/app/providers/useLang';
import { SaleNavbar, SaleSidebar, saleCopy } from '@/features/SalePages/salecomponents';
import type {
  DashboardDateRange,
  DashboardDueBucket,
  DashboardPriority,
  DashboardQueueItemDto,
  DashboardScope,
  SalesDashboardKpisDto,
} from '@/services/api/dashboard';
import type { ProjectListItemDto } from '@/services/api/projects';
import { getAccountById, type AccountDto } from '@/services/api/accounts';
import {
  getDashboardServiceResultMessage,
  useCurrentUser,
  useSalesActionQueue,
  useSalesDashboardKpis,
  useStaffProjectQueue,
} from '@/services/queries';
import { useProjectList } from '@/services/queries/useProjects';

import './SaleDashbroad.css';

type DateRangeKey = 'today' | 'this-week' | 'this-month';
type QueueDateRangeKey = 'all' | DateRangeKey;
type ScopeKey = 'my-projects' | 'team';
type QueuePriorityFilter = '' | DashboardPriority;
type QueueDueFilter = '' | DashboardDueBucket;

type KpiItem = {
  change: string;
  description: string;
  icon: Icon;
  id: 'new-requests' | 'accepted' | 'unpaid-remaining' | 'overdue';
  label: string;
  onSelect?: () => void;
  path?: string;
  selected?: boolean;
  tone: 'amber' | 'blue' | 'green' | 'red' | 'neutral';
  value: string;
};

const DEFAULT_SALES_GROUPS: string[] = [
  'Intake',
  'Proposal and Quotation',
  'Order and Payment',
  'Delivery',
];

export function SaleDashbroad() {
  const { lang } = useLang();
  const t = saleCopy[lang];
  const d = t.dashboard;
  const [activeGroup, setActiveGroup] = useState<string>('Intake');
  const [scope, setScope] = useState<ScopeKey>('my-projects');
  const [queueDateRange, setQueueDateRange] = useState<QueueDateRangeKey>('all');
  const [queuePriority, setQueuePriority] = useState<QueuePriorityFilter>('');
  const [queueDue, setQueueDue] = useState<QueueDueFilter>('');
  const [queuePage, setQueuePage] = useState(1);
  const [queuePageSize, setQueuePageSize] = useState(5);
  const [showAcceptedProjects, setShowAcceptedProjects] = useState(false);
  const [acceptedPage, setAcceptedPage] = useState(1);
  const [acceptedPageSize, setAcceptedPageSize] = useState(5);
  const [isQueueFilterOpen, setIsQueueFilterOpen] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queueFilterRef = useRef<HTMLDivElement | null>(null);

  const apiScope: DashboardScope = scope === 'my-projects' ? 'mine' : 'team';
  const queueDateRangeFilter = queueDateRange === 'all' ? null : toApiDateRange(queueDateRange);
  const activeQueueFilterCount = Number(queueDateRange !== 'all') + Number(Boolean(queuePriority)) + Number(Boolean(queueDue));
  const queueQuery = useSalesActionQueue({
    scope: apiScope,
    group: activeGroup,
    dateRange: queueDateRangeFilter,
    priority: queuePriority || null,
    dueBucket: queueDue || null,
    page: queuePage,
    limit: queuePageSize,
  });
  const kpisQuery = useSalesDashboardKpis({
    scope: apiScope,
  });
  // New requests are unassigned SUBMITTED projects — same source as Project Request Queue.
  // Dashboard KPI `newRequests` with scope=mine stays 0 because those projects are not assigned yet.
  const currentUserQuery = useCurrentUser();
  const acceptedProjectsQuery = useProjectList(
    {
      assignedSalesId: scope === 'my-projects' ? currentUserQuery.data?.accountId : undefined,
      page: acceptedPage,
      limit: acceptedPageSize,
    },
    {
      enabled: showAcceptedProjects && (scope === 'team' || Boolean(currentUserQuery.data?.accountId)),
    },
  );
  const newRequestsQuery = useStaffProjectQueue({
    page: 1,
    limit: 50,
  });

  const queueItems = queueQuery.data?.items ?? [];
  const queueTotal = queueQuery.data?.total ?? 0;
  const queueTotalPages = Math.max(1, Math.ceil(queueTotal / queuePageSize));
  const countsByGroup = useMemo(() => queueQuery.data?.countsByGroup ?? {}, [queueQuery.data?.countsByGroup]);
  const queueGroups = useMemo(() => {
    const fromApi = Object.keys(countsByGroup);
    return fromApi.length > 0 ? fromApi : DEFAULT_SALES_GROUPS;
  }, [countsByGroup]);
  const newRequestCount = newRequestsQuery.data
    ? Math.max(newRequestsQuery.data.total, newRequestsQuery.data.items.length)
    : undefined;
  const kpis = useMemo(
    () => mapSalesKpis(kpisQuery.data, d, newRequestCount, newRequestsQuery.isLoading, showAcceptedProjects, () => {
      setShowAcceptedProjects((current) => !current);
      setAcceptedPage(1);
    }),
    [d, kpisQuery.data, newRequestCount, newRequestsQuery.isLoading, showAcceptedProjects],
  );
  const refreshTime = new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' }).format(lastRefreshAt);
  const isLoading = queueQuery.isLoading || kpisQuery.isLoading;
  const loadError = queueQuery.error
    ? getDashboardServiceResultMessage(queueQuery.error)
    : kpisQuery.error
      ? getDashboardServiceResultMessage(kpisQuery.error)
      : null;

  useEffect(() => {
    if (!isQueueFilterOpen) {
      return undefined;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!queueFilterRef.current?.contains(event.target as Node)) {
        setIsQueueFilterOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsQueueFilterOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isQueueFilterOpen]);

  useEffect(() => {
    // While the next page is loading, data is the previous page. Do not treat that
    // gap (or a missing total) as "only 1 page" and snap back.
    if (queueQuery.isPlaceholderData || queueQuery.isFetching || !queueQuery.isSuccess) return;
    if (queueTotal > 0 && queuePage > queueTotalPages) {
      setQueuePage(queueTotalPages);
    }
  }, [queuePage, queueQuery.isFetching, queueQuery.isPlaceholderData, queueQuery.isSuccess, queueTotal, queueTotalPages]);

  function clearQueueFilters() {
    setQueueDateRange('all');
    setQueuePriority('');
    setQueueDue('');
    setQueuePage(1);
  }

  function handleQueuePageSizeChange(nextSize: number) {
    setQueuePageSize(nextSize);
    setQueuePage(1);
  }

  async function handleRefresh() {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await Promise.all([queueQuery.refetch(), kpisQuery.refetch(), newRequestsQuery.refetch()]);
      setLastRefreshAt(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <div className="sale-dashboard-shell">
      <SaleSidebar activeKey="dashboard" />

      <div className="sale-dashboard-content">
        <SaleNavbar />

        <main className="sale-dashboard-main sale-dashboard-scrollbar">
          <section className="sales-ops-header">
            <div>
              <span>{d.eyebrow}</span>
              <h2>{d.title}</h2>
              <p>{d.subtitle}</p>
            </div>
            <div className="sales-ops-header-side">
              <button
                className="sales-ops-refresh-button"
                disabled={isRefreshing}
                type="button"
                onClick={() => void handleRefresh()}
              >
                <IconRefresh className={isRefreshing ? 'is-spinning' : undefined} size={14} />
                {isRefreshing ? t.common.refreshing : `${t.common.refresh} · ${refreshTime}`}
              </button>
            </div>
          </section>

          <section className="sales-ops-filter-bar" aria-label={d.filtersAria}>
            <label>
              <span>{d.scope}</span>
              <select
                value={scope}
                onChange={(event) => {
                  setScope(event.target.value as ScopeKey);
                  setQueuePage(1);
                }}
              >
                <option value="my-projects">{d.myProjects}</option>
                <option value="team">{d.teamOverview}</option>
              </select>
            </label>
            <Link className="sales-ops-primary-action" to="/sales/project-requests">
              {t.nav.projectRequestQueue}
              <IconArrowRight size={16} />
            </Link>
          </section>

          <section className="sales-ops-kpi-grid">
            {kpis.map((kpi) => {
              const content = (
                <>
                  <span><kpi.icon size={19} /></span>
                  <div>
                    <small>{kpi.label}</small>
                    <strong>{kpi.value}</strong>
                    <p>{kpi.change}</p>
                  </div>
                </>
              );

              if (kpi.onSelect) {
                return (
                  <button
                    aria-pressed={kpi.selected}
                    className={`sales-ops-kpi sales-ops-kpi-${kpi.tone}${kpi.selected ? ' is-selected' : ''}`}
                    key={kpi.id}
                    title={kpi.description}
                    type="button"
                    onClick={kpi.onSelect}
                  >
                    {content}
                  </button>
                );
              }

              return (
                <Link className={`sales-ops-kpi sales-ops-kpi-${kpi.tone}`} key={kpi.id} title={kpi.description} to={kpi.path ?? '/sales'}>
                  {content}
                </Link>
              );
            })}
          </section>

          <section className="sales-ops-main-grid sales-ops-main-grid-single">
            <article className="sale-card sales-ops-action-queue">
              <header className="sales-ops-section-header">
                <div>
                  <h3>{showAcceptedProjects ? d.acceptedListTitle : d.mainActionQueue}</h3>
                  <p>{showAcceptedProjects ? d.acceptedListNote : d.subtitle}</p>
                </div>
                <div className="sales-ops-queue-filter" ref={queueFilterRef} hidden={showAcceptedProjects}>
                  <button
                    aria-expanded={isQueueFilterOpen}
                    aria-haspopup="dialog"
                    aria-label={d.queueFilterAria}
                    className={activeQueueFilterCount > 0 || isQueueFilterOpen ? 'sales-ops-queue-filter-toggle is-active' : 'sales-ops-queue-filter-toggle'}
                    type="button"
                    onClick={() => setIsQueueFilterOpen((open) => !open)}
                  >
                    <IconFilter size={18} />
                    {activeQueueFilterCount > 0 ? <span>{activeQueueFilterCount}</span> : null}
                  </button>
                  {isQueueFilterOpen ? (
                    <div className="sales-ops-queue-filter-panel" role="dialog" aria-label={d.queueFilterAria}>
                      <div className="sales-ops-queue-filter-panel-header">
                        <strong>{d.queueFilter}</strong>
                        <button aria-label={d.closeFilters} type="button" onClick={() => setIsQueueFilterOpen(false)}>
                          <IconX size={16} />
                        </button>
                      </div>
                      <label>
                        <span>{d.dateRange}</span>
                        <select
                          value={queueDateRange}
                          onChange={(event) => {
                            setQueueDateRange(event.target.value as QueueDateRangeKey);
                            setQueuePage(1);
                          }}
                        >
                          <option value="all">{d.allDates}</option>
                          <option value="today">{d.today}</option>
                          <option value="this-week">{d.thisWeek}</option>
                          <option value="this-month">{d.thisMonth}</option>
                        </select>
                      </label>
                      <label>
                        <span>{d.priority}</span>
                        <select
                          value={queuePriority}
                          onChange={(event) => {
                            setQueuePriority(event.target.value as QueuePriorityFilter);
                            setQueuePage(1);
                          }}
                        >
                          <option value="">{d.allPriorities}</option>
                          <option value="URGENT">{formatPriorityLabel('URGENT')}</option>
                          <option value="HIGH">{formatPriorityLabel('HIGH')}</option>
                          <option value="MEDIUM">{formatPriorityLabel('MEDIUM')}</option>
                          <option value="LOW">{formatPriorityLabel('LOW')}</option>
                        </select>
                      </label>
                      <label>
                        <span>{d.due}</span>
                        <select
                          value={queueDue}
                          onChange={(event) => {
                            setQueueDue(event.target.value as QueueDueFilter);
                            setQueuePage(1);
                          }}
                        >
                          <option value="">{d.allDue}</option>
                          <option value="OVERDUE">{d.overdue}</option>
                          <option value="TODAY">{d.today}</option>
                          <option value="THIS_WEEK">{d.thisWeek}</option>
                          <option value="LATER">{d.later}</option>
                        </select>
                      </label>
                      <div className="sales-ops-queue-filter-panel-actions">
                        <button disabled={activeQueueFilterCount === 0} type="button" onClick={clearQueueFilters}>
                          {d.clear}
                        </button>
                        <button type="button" onClick={() => setIsQueueFilterOpen(false)}>
                          {d.done}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </header>
              {showAcceptedProjects ? (
                <AcceptedProjectsList
                  chipLabel={d.acceptedListTitle}
                  customerLabel={d.colCustomer}
                  isLoading={acceptedProjectsQuery.isLoading || currentUserQuery.isLoading}
                  items={(acceptedProjectsQuery.data?.items ?? []).filter((project) => Boolean(project.assignedSalesId))}
                  lang={lang}
                  loadingLabel={d.loadingData}
                  page={acceptedPage}
                  pageSize={acceptedPageSize}
                  totalItems={acceptedProjectsQuery.data?.total ?? 0}
                  viewLabel={t.common.view}
                  onPageChange={setAcceptedPage}
                  onPageSizeChange={(nextSize) => {
                    setAcceptedPageSize(nextSize);
                    setAcceptedPage(1);
                  }}
                />
              ) : (
              <>
              <div className="sales-ops-tabs" role="tablist" aria-label={d.mainActionQueue}>
                {queueGroups.map((group) => (
                  <button
                    aria-selected={activeGroup === group}
                    key={group}
                    role="tab"
                    type="button"
                    onClick={() => {
                      setActiveGroup(group);
                      setQueuePage(1);
                    }}
                  >
                    {group}
                    <em>{countsByGroup[group] ?? 0}</em>
                  </button>
                ))}
              </div>
              <div className="sales-ops-queue-table">
                <div className="sales-ops-queue-head">
                  <span>{d.colProject}</span>
                  <span>{d.colCustomer}</span>
                  <span className="sales-ops-queue-col-center">{d.colPhase}</span>
                  <span className="sales-ops-queue-col-center">{d.colPriority}</span>
                  <span className="sales-ops-queue-col-center">{d.colDue}</span>
                  <span className="sales-ops-queue-col-center">{d.colUpdated}</span>
                  <span />
                </div>
                {isLoading ? (
                  <div className="sales-ops-queue-empty">{d.loadingData}</div>
                ) : null}
                {loadError ? <div className="sales-ops-queue-empty sales-ops-queue-empty-error">{loadError || d.loadError}</div> : null}
                {!isLoading && !loadError && queueItems.length === 0 ? (
                  <div className="sales-ops-queue-empty">{d.emptyPhase}</div>
                ) : null}
                {queueItems.map((item) => (
                  <div className="sales-ops-queue-row" key={item.id}>
                    <strong title={item.warning ?? undefined}>{formatProjectLabel(item)}</strong>
                    <span>{item.customerName || '-'}</span>
                    <span className="sales-ops-phase" title={item.phase || item.status || undefined}>
                      {formatStatusLabel(item.phase || item.status || '-')}
                    </span>
                    <span className={getPriorityClass(item.priority)}>{formatPriorityLabel(item.priority)}</span>
                    <span className="sales-ops-due">{formatDueLabel(item.dueAt, item.dueBucket, d)}</span>
                    <span className="sales-ops-updated" title={item.lastUpdatedAt || undefined}>
                      {formatLastUpdatedAt(item.lastUpdatedAt, lang)}
                    </span>
                    <Link
                      aria-label={`Open ${item.projectCode}`}
                      className="sales-ops-queue-open"
                      title={t.common.view}
                      to={resolveSalesActionPath(item)}
                    >
                      <IconChevronRight size={18} stroke={2} />
                    </Link>
                  </div>
                ))}
              </div>
              <QueuePager
                disabled={queueQuery.isFetching}
                page={Math.min(queuePage, queueTotalPages)}
                pageSize={queuePageSize}
                totalItems={queueTotal}
                totalPages={queueTotalPages}
                onPageChange={setQueuePage}
                onPageSizeChange={handleQueuePageSizeChange}
              />
              </>
              )}
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}

function AcceptedProjectsList({
  chipLabel,
  customerLabel,
  emptyLabel,
  isLoading,
  items,
  lang,
  loadingLabel,
  page,
  pageSize,
  totalItems,
  viewLabel,
  onPageChange,
  onPageSizeChange,
}: {
  chipLabel: string;
  customerLabel: string;
  emptyLabel: string;
  isLoading: boolean;
  items: ProjectListItemDto[];
  lang: 'en' | 'vi';
  loadingLabel: string;
  page: number;
  pageSize: number;
  totalItems: number;
  viewLabel: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const customerIds = useMemo(
    () => Array.from(new Set(items.map((project) => project.customerId).filter(Boolean))),
    [items],
  );
  const customerQueries = useQueries({
    queries: customerIds.map((customerId) => ({
      queryKey: ['accounts', 'detail', customerId],
      queryFn: () => getAccountById(customerId),
      enabled: Boolean(customerId),
      staleTime: 5 * 60 * 1000,
    })),
  });
  const customerById = useMemo(() => {
    return customerQueries.reduce<Record<string, AccountDto>>((lookup, query, index) => {
      const customer = query.data;
      if (customer) lookup[customerIds[index]] = customer;
      return lookup;
    }, {});
  }, [customerIds, customerQueries]);

  return (
    <>
      <div className="sales-ops-tabs" role="tablist" aria-label={emptyLabel}>
        <button aria-selected="true" type="button">
          {chipLabel}
          <em>{totalItems}</em>
        </button>
      </div>
      <div className="sales-ops-queue-table">
        <div className="sales-ops-queue-head sales-ops-accepted-head">
          <span>Project</span>
          <span>{customerLabel}</span>
          <span>Phase</span>
          <span>Submitted</span>
          <span />
        </div>
        {isLoading ? <div className="sales-ops-queue-empty">{loadingLabel}</div> : null}
        {!isLoading && items.length === 0 ? <div className="sales-ops-queue-empty">{emptyLabel}</div> : null}
        {items.map((project) => (
          <div className="sales-ops-queue-row sales-ops-accepted-row" key={project.projectId}>
            <strong>{`${project.projectCode} ${project.projectName}`.trim()}</strong>
            <span title={customerById[project.customerId]?.fullName || undefined}>
              {customerById[project.customerId]?.fullName || '-'}
            </span>
            <span className="sales-ops-phase">{formatStatusLabel(project.status)}</span>
            <span className="sales-ops-updated">{formatLastUpdatedAt(project.submittedAt, lang)}</span>
            <Link
              aria-label={`Open ${project.projectCode}`}
              className="sales-ops-queue-open"
              title={viewLabel}
              to={`/sales/assigned-projects/${project.projectId}`}
            >
              <IconChevronRight size={18} stroke={2} />
            </Link>
          </div>
        ))}
      </div>
      <QueuePager
        disabled={isLoading}
        page={Math.min(page, totalPages)}
        pageSize={pageSize}
        totalItems={totalItems}
        totalPages={totalPages}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </>
  );
}

function QueuePager({
  disabled,
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: {
  disabled?: boolean;
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const { lang } = useLang();
  const t = saleCopy[lang].common;
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
    const next = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), totalPages) : page;
    setPageDraft(String(next));
    if (next !== page) onPageChange(next);
  }

  function commitPageSize() {
    const parsed = Number.parseInt(sizeDraft, 10);
    const next = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 100) : pageSize;
    setSizeDraft(String(next));
    if (next !== pageSize) onPageSizeChange(next);
  }

  return (
    <div className="sales-ops-queue-pager">
      <div className="sales-ops-queue-pager-meta">
      <label className="sales-ops-queue-pager-field">
        <span>{t.rows}</span>
        <input
          aria-label={t.rows}
          disabled={disabled}
          max={100}
          min={1}
          type="number"
          value={sizeDraft}
          onBlur={commitPageSize}
          onChange={(event) => setSizeDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
        />
      </label>
      <label className="sales-ops-queue-pager-field">
        <span>{t.page}</span>
        <input
          aria-label={t.page}
          disabled={disabled}
          max={totalPages}
          min={1}
          type="number"
          value={pageDraft}
          onBlur={commitPage}
          onChange={(event) => setPageDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
        />
        <span className="sales-ops-queue-pager-of">/ {totalPages}</span>
      </label>
      <span className="sales-ops-queue-pager-total">
        {totalItems} {lang === 'vi' ? 'dòng' : 'rows'}
      </span>
      </div>
      <div className="sales-ops-queue-pager-nav">
        <button disabled={disabled || page <= 1} type="button" onClick={() => onPageChange(page - 1)}>
          {t.previous}
        </button>
        <button disabled={disabled || page >= totalPages} type="button" onClick={() => onPageChange(page + 1)}>
          {t.next}
        </button>
      </div>
    </div>
  );
}

function mapSalesKpis(
  data: SalesDashboardKpisDto | undefined,
  d: (typeof saleCopy)['en']['dashboard'],
  newRequestCount: number | undefined,
  isNewRequestsLoading: boolean,
  acceptedSelected: boolean,
  onToggleAccepted: () => void,
): KpiItem[] {
  return [
    {
      change: d.kpiNewRequestsHint,
      description: d.kpiNewRequestsHint,
      icon: IconFolderOpen,
      id: 'new-requests',
      label: d.kpiNewRequests,
      path: '/sales/project-requests',
      tone: 'amber',
      value: isNewRequestsLoading && newRequestCount === undefined ? '—' : String(newRequestCount ?? data?.newRequests ?? 0),
    },
    {
      change: d.kpiAcceptedProjectsHint,
      description: d.kpiAcceptedProjectsHint,
      icon: IconProgressCheck,
      id: 'accepted',
      label: d.kpiAcceptedProjects,
      onSelect: onToggleAccepted,
      selected: acceptedSelected,
      tone: 'blue',
      value: String(data?.acceptedProjects ?? 0),
    },
    {
      change: d.kpiUnpaidRemainingHint,
      description: d.kpiUnpaidRemainingHint,
      icon: IconCreditCard,
      id: 'unpaid-remaining',
      label: d.kpiUnpaidRemaining,
      path: '/sales/orders',
      tone: 'red',
      value: String(data?.unpaidRemaining ?? 0),
    },
    {
      change: d.kpiOverdueTasksHint,
      description: d.kpiOverdueTasksHint,
      icon: IconShieldExclamation,
      id: 'overdue',
      label: d.kpiOverdueTasks,
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

function formatDueLabel(
  dueAt: string | null,
  dueBucket: DashboardDueBucket | null,
  d: (typeof saleCopy)['en']['dashboard'],
) {
  if (dueBucket === 'OVERDUE') return d.overdue;
  if (dueBucket === 'TODAY') return d.today;
  if (dueBucket === 'THIS_WEEK') return d.thisWeek;
  if (dueBucket === 'LATER') return dueAt ? formatShortDate(dueAt) : d.later;
  if (dueAt) return formatShortDate(dueAt);
  return '-';
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' }).format(new Date(value));
}

function formatLastUpdatedAt(value: string | null | undefined, lang: 'en' | 'vi') {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
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
