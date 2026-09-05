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
  const [dateRange, setDateRange] = useState<DateRangeKey>('this-week');
  const [scope, setScope] = useState<ScopeKey>('my-projects');
  const [lastRefreshAt, setLastRefreshAt] = useState(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const dateRangeLabel: Record<DateRangeKey, string> = {
    today: d.today,
    'this-week': d.thisWeek,
    'this-month': d.thisMonth,
  };

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
  const countsByGroup = useMemo(() => queueQuery.data?.countsByGroup ?? {}, [queueQuery.data?.countsByGroup]);
  const queueGroups = useMemo(() => {
    const fromApi = Object.keys(countsByGroup);
    return fromApi.length > 0 ? fromApi : DEFAULT_SALES_GROUPS;
  }, [countsByGroup]);
  const kpis = useMemo(
    () => mapSalesKpis(kpisQuery.data, dateRangeLabel[dateRange], d),
    // dateRangeLabel is derived from d each render; d + dateRange are the stable inputs
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [d, dateRange, kpisQuery.data],
  );
  const refreshTime = new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' }).format(lastRefreshAt);
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
              <span>{d.dateRange}</span>
              <select value={dateRange} onChange={(event) => setDateRange(event.target.value as DateRangeKey)}>
                <option value="today">{d.today}</option>
                <option value="this-week">{d.thisWeek}</option>
                <option value="this-month">{d.thisMonth}</option>
              </select>
            </label>
            <label>
              <span>{d.scope}</span>
              <select value={scope} onChange={(event) => setScope(event.target.value as ScopeKey)}>
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
                  <h3>{d.mainActionQueue}</h3>
                  <p>{d.subtitle}</p>
                </div>
                <IconFilter size={20} />
              </header>
              <div className="sales-ops-tabs" role="tablist" aria-label={d.mainActionQueue}>
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
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}

function mapSalesKpis(
  data: SalesDashboardKpisDto | undefined,
  rangeLabel: string,
  d: (typeof saleCopy)['en']['dashboard'],
): KpiItem[] {
  return [
    {
      change: rangeLabel,
      description: d.kpiNewRequests,
      icon: IconFolderOpen,
      label: d.kpiNewRequests,
      path: '/sales/project-requests',
      tone: 'amber',
      value: String(data?.newRequests ?? 0),
    },
    {
      change: rangeLabel,
      description: d.kpiActiveProjects,
      icon: IconProgressCheck,
      label: d.kpiActiveProjects,
      path: '/sales/assigned-projects',
      tone: 'blue',
      value: String(data?.activeProjects ?? 0),
    },
    {
      change: rangeLabel,
      description: d.kpiWaitingCustomer,
      icon: IconUserCheck,
      label: d.kpiWaitingCustomer,
      path: '/sales/assigned-projects',
      tone: 'neutral',
      value: String(data?.waitingCustomer ?? 0),
    },
    {
      change: rangeLabel,
      description: d.kpiPaymentsFollowUp,
      icon: IconCreditCard,
      label: d.kpiPaymentsFollowUp,
      path: '/sales/orders',
      tone: 'red',
      value: String(data?.paymentFollowUp ?? 0),
    },
    {
      change: rangeLabel,
      description: d.kpiOverdueTasks,
      icon: IconShieldExclamation,
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
  if (dueBucket === 'OVERDUE') return 'Overdue';
  if (dueBucket === 'TODAY') return d.today;
  if (dueBucket === 'THIS_WEEK') return d.thisWeek;
  if (dueBucket === 'LATER') return dueAt ? formatShortDate(dueAt) : 'Later';
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
