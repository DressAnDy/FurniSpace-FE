import { useMemo, useState } from 'react';
import {
  IconAlertTriangle,
  IconBriefcase,
  IconCash,
  IconChartBar,
  IconCheck,
  IconClock,
  IconCreditCard,
  IconInfoCircle,
  IconRefresh,
  IconTrendingDown,
  IconTrendingUp,
  type Icon,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import { AdminNavbar, AdminSidebar } from '../admincomponents';
import {
  getAdminFinancialServiceResultMessage,
  getFinancialPeriodRange,
  type AdminFinancialSummaryDto,
  type FinancialPeriodType,
} from '@/services/api/adminFinancial';
import {
  type ProjectListItemDto,
  type ProjectStatus,
  useAdminFinancialCollectionTrend,
  useAdminFinancialExceptions,
  useAdminFinancialPaymentBreakdown,
  useAdminFinancialSummary,
  useCurrentUser,
  useProjectList,
} from '@/services/queries';

import './AdminDashbroad.css';

type KpiItem = {
  comparison: string;
  description: string;
  icon: Icon;
  label: string;
  path: string;
  tone: 'amber' | 'blue' | 'green' | 'red' | 'neutral';
  trend: 'up' | 'down' | 'flat';
  value: string;
  warning: string;
};

type StatusBreakdown = {
  color: string;
  count: number;
  label: string;
};

type CollectionBucket = {
  label: string;
  projectStartFee: number;
  deposit: number;
  remainingPayment: number;
  total: number;
};

const MILLION_VND = 1_000_000;

const collectionSeries = [
  { key: 'projectStartFee' as const, color: '#22c55e', label: 'Project start fee' },
  { key: 'deposit' as const, color: '#f97316', label: 'Deposit' },
  { key: 'remainingPayment' as const, color: '#ef4444', label: 'Remaining payment' },
];

const activeStatuses: ProjectStatus[] = [
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

const overviewPhases: Array<{ color: string; label: string; statuses: ProjectStatus[] }> = [
  { color: '#5c4030', label: 'Request', statuses: ['SUBMITTED', 'NEED_BASIC_INFORMATION'] },
  {
    color: '#c4a574',
    label: 'Design',
    statuses: [
      'IN_CONSULTATION',
      'WAITING_FOR_DESIGNER_ASSIGNMENT',
      'MEASUREMENT_REQUIRED',
      'SPACE_VERIFIED',
      'PROPOSAL_CONSULTING',
      'PROPOSAL_SELECTED',
    ],
  },
  { color: '#a67c52', label: 'Quotation', statuses: ['QUOTATION_SENT', 'QUOTATION_REVISION_REQUESTED', 'ORDER_CONFIRMED'] },
  { color: '#e8d5b7', label: 'Production', statuses: ['IN_PRODUCTION'] },
  { color: '#1f1a17', label: 'Delivery', statuses: ['READY_FOR_DELIVERY', 'DELIVERING', 'DELIVERED'] },
  { color: '#b8956c', label: 'Complete', statuses: ['COMPLETED'] },
];

export function AdminDashbroad() {
  const [period, setPeriod] = useState<FinancialPeriodType>('THIS_MONTH');
  const [lastRefreshAt, setLastRefreshAt] = useState(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const dateRange = useMemo(() => getFinancialPeriodRange(period), [period]);
  const summaryParams = useMemo(() => ({ period, currency: 'VND' as const }), [period]);
  const trendParams = useMemo(
    () => ({ from: dateRange.from, to: dateRange.to, granularity: 'MONTH' as const, currency: 'VND' }),
    [dateRange],
  );

  const projectsQuery = useProjectList({ page: 1, limit: 100 });
  const currentUserQuery = useCurrentUser();
  const summaryQuery = useAdminFinancialSummary(summaryParams);
  const trendQuery = useAdminFinancialCollectionTrend(trendParams);
  const breakdownQuery = useAdminFinancialPaymentBreakdown(dateRange);
  const exceptionsQuery = useAdminFinancialExceptions({ page: 1, pageSize: 5 });

  const projects = useMemo(() => projectsQuery.data?.items ?? [], [projectsQuery.data?.items]);
  const refreshTime = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(lastRefreshAt);
  const statusBreakdown = useMemo(() => getStatusBreakdown(projects), [projects]);
  const collectionData = useMemo(() => {
    const series = trendQuery.data?.series ?? [];
    return series.map((bucket) => ({
      label: formatPeriodLabel(bucket.period),
      projectStartFee: toTrieu(bucket.projectStartFee),
      deposit: toTrieu(bucket.deposit),
      remainingPayment: toTrieu(bucket.remainingPayment),
      total: toTrieu(bucket.total),
    }));
  }, [trendQuery.data?.series]);

  const kpis = useMemo(
    () => buildKpis(projects, summaryQuery.data),
    [projects, summaryQuery.data],
  );

  const isLoading = projectsQuery.isLoading || summaryQuery.isLoading;
  const isError = projectsQuery.isError || summaryQuery.isError;

  async function handleRefresh() {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await Promise.all([
        projectsQuery.refetch(),
        currentUserQuery.refetch(),
        summaryQuery.refetch(),
        trendQuery.refetch(),
        breakdownQuery.refetch(),
        exceptionsQuery.refetch(),
      ]);
      setLastRefreshAt(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <AdminSidebar activeLabel="Admin Dashboard" />

        <section className="admin-main">
          <AdminNavbar activeLabel="Admin Dashboard" />
          <div className="admin-content admin-dash-v2">
            <section className="admin-dash-v2-header">
              <div>
                <span>Operational command center</span>
                <h2>Admin Dashboard</h2>
                <p>Live project workload and financial cash collection for VND.</p>
              </div>
              <div className="admin-dash-v2-header-actions">
                <div className="admin-dash-v2-revenue-controls" role="group" aria-label="Financial period">
                  <button className={period === 'THIS_MONTH' ? 'is-active' : undefined} type="button" onClick={() => setPeriod('THIS_MONTH')}>
                    This month
                  </button>
                  <button className={period === 'THIS_YEAR' ? 'is-active' : undefined} type="button" onClick={() => setPeriod('THIS_YEAR')}>
                    This year
                  </button>
                </div>
                <button
                  className="admin-dash-v2-refresh-button"
                  disabled={isRefreshing}
                  type="button"
                  onClick={() => void handleRefresh()}
                >
                  <IconRefresh className={isRefreshing ? 'is-spinning' : undefined} size={14} />
                  {isRefreshing ? 'Refreshing...' : `Refresh · ${refreshTime}`}
                </button>
              </div>
            </section>

            <DashboardQueryState
              isError={isError}
              isLoading={isLoading}
              errorMessage={
                summaryQuery.isError
                  ? getAdminFinancialServiceResultMessage(summaryQuery.error)
                  : projectsQuery.isError
                    ? 'Some project data could not be loaded.'
                    : undefined
              }
            />

            <section className="admin-dash-v2-kpis" aria-label="KPI insight cards">
              {kpis.map((kpi) => (
                <KpiCard item={kpi} key={kpi.label} />
              ))}
            </section>

            <section className="admin-dash-v2-grid admin-dash-v2-grid-middle">
              <article className="admin-card admin-dash-v2-status">
                <SectionTitle
                  icon={IconChartBar}
                  title="Overview distribution"
                  subtitle="Current project distribution across lifecycle phases."
                />
                {statusBreakdown.length > 0 ? (
                  <StatusDonutChart rows={statusBreakdown} />
                ) : (
                  <EmptyState text="No project status data loaded yet." />
                )}
              </article>

              <article className="admin-card admin-dash-v2-revenue">
                <SectionTitle
                  icon={IconCash}
                  title="Cash collection"
                  subtitle={`Canonical collected cash by month. Unit: triệu VNĐ (${MILLION_VND.toLocaleString('vi-VN')}).`}
                />
                {trendQuery.isLoading ? <EmptyState text="Loading collection trend..." /> : null}
                {trendQuery.isError ? (
                  <EmptyState text={getAdminFinancialServiceResultMessage(trendQuery.error)} />
                ) : null}
                {!trendQuery.isLoading && !trendQuery.isError ? (
                  collectionData.length > 0 ? (
                    <CollectionChart data={collectionData} />
                  ) : (
                    <EmptyState text="No collection data for this period." />
                  )
                ) : null}
              </article>
            </section>

            <section className="admin-dash-v2-grid admin-dash-v2-grid-bottom">
              <article className="admin-card">
                <SectionTitle
                  icon={IconCreditCard}
                  title="Payment type breakdown"
                  subtitle="Collected vs outstanding for start fee, deposit, and remaining payment."
                />
                {breakdownQuery.isLoading ? <EmptyState text="Loading breakdown..." /> : null}
                {breakdownQuery.isError ? (
                  <EmptyState text={getAdminFinancialServiceResultMessage(breakdownQuery.error)} />
                ) : null}
                {breakdownQuery.data ? <BreakdownList items={breakdownQuery.data.items} /> : null}
              </article>

              <article className="admin-card">
                <SectionTitle
                  icon={IconAlertTriangle}
                  title="Financial exceptions"
                  subtitle="Operational issues needing admin attention."
                />
                {exceptionsQuery.isLoading ? <EmptyState text="Loading exceptions..." /> : null}
                {exceptionsQuery.isError ? (
                  <EmptyState text={getAdminFinancialServiceResultMessage(exceptionsQuery.error)} />
                ) : null}
                {exceptionsQuery.data ? (
                  exceptionsQuery.data.items.length > 0 ? (
                    <ExceptionsList
                      items={exceptionsQuery.data.items}
                      total={exceptionsQuery.data.totalItems}
                    />
                  ) : (
                    <EmptyState text="No open financial exceptions." />
                  )
                ) : null}
              </article>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function buildKpis(projects: ProjectListItemDto[], summary: AdminFinancialSummaryDto | undefined): KpiItem[] {
  const activeProjects = projects.filter((project) => activeStatuses.includes(project.status)).length;
  const completedProjects = projects.filter((project) => project.status === 'COMPLETED').length;

  const financial: KpiItem[] = summary
    ? [
        {
          comparison: `${summary.activePaymentCount} active`,
          description: 'Verified start fee, deposit, and remaining payment collected in period.',
          icon: IconCreditCard,
          label: 'Amount Collected',
          path: '/admin/reports?tab=financial',
          tone: 'green',
          trend: 'up',
          value: formatKpiMoney(summary.collectedAmount),
          warning: `${summary.failedTransactionCount} failed attempts`,
        },
        {
          comparison: `${summary.activePaymentCount} obligations`,
          description: 'Active collectible payment obligations (current state).',
          icon: IconClock,
          label: 'Outstanding Payments',
          path: '/admin/reports?tab=financial',
          tone: 'amber',
          trend: 'flat',
          value: formatKpiMoney(summary.outstandingPaymentAmount),
          warning: 'Do not sum with contracted receivable',
        },
        {
          comparison: 'Order remaining',
          description: 'Active orders with remainingAmount > 0 (current state).',
          icon: IconCash,
          label: 'Contracted Receivable',
          path: '/admin/reports?tab=financial',
          tone: 'amber',
          trend: 'flat',
          value: formatKpiMoney(summary.contractedReceivableAmount),
          warning: 'Separate from outstanding payments',
        },
        {
          comparison: 'Confirmed in period',
          description: 'Sum of confirmed order finalTotalAmount in period.',
          icon: IconCash,
          label: 'Order Commercial Value',
          path: '/admin/reports?tab=financial',
          tone: 'blue',
          trend: 'flat',
          value: formatKpiMoney(summary.orderCommercialValue),
          warning: summary.currency,
        },
      ]
    : [];

  return [
    {
      comparison: 'Live projects',
      description: 'Projects currently moving through the FurniSpace workflow.',
      icon: IconBriefcase,
      label: 'Active Projects',
      path: '/admin/projects',
      tone: 'blue',
      trend: 'up',
      value: String(activeProjects),
      warning: 'Includes delivery and production',
    },
    {
      comparison: 'In sample',
      description: 'Projects with completed status in the loaded API sample.',
      icon: IconCheck,
      label: 'Completed Projects',
      path: '/admin/projects',
      tone: 'green',
      trend: 'up',
      value: String(completedProjects),
      warning: 'From loaded project page',
    },
    ...financial,
  ];
}

function getStatusBreakdown(projects: ProjectListItemDto[]): StatusBreakdown[] {
  return overviewPhases
    .map((phase) => ({
      color: phase.color,
      count: projects.filter((project) => phase.statuses.includes(project.status)).length,
      label: phase.label,
    }))
    .filter((row) => row.count > 0);
}

function DashboardQueryState({
  errorMessage,
  isError,
  isLoading,
}: {
  errorMessage?: string;
  isError: boolean;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <section className="admin-dash-v2-state">
        <IconRefresh size={16} /> Loading project and financial data...
      </section>
    );
  }

  if (isError) {
    return (
      <section className="admin-dash-v2-state admin-dash-v2-state-error">
        <IconInfoCircle size={16} /> {errorMessage || 'Some live API data could not be loaded.'}
      </section>
    );
  }

  return null;
}

function KpiCard({ item }: { item: KpiItem }) {
  const KpiIcon = item.icon;
  const TrendIcon = item.trend === 'down' ? IconTrendingDown : item.trend === 'up' ? IconTrendingUp : IconInfoCircle;

  return (
    <Link className={`admin-dash-v2-kpi admin-dash-v2-kpi-${item.tone}`} title={item.description} to={item.path}>
      <span>
        <KpiIcon size={19} />
      </span>
      <div>
        <small>{item.label}</small>
        <strong>{item.value}</strong>
        <p>{item.warning}</p>
      </div>
      <em>
        <TrendIcon size={14} /> {item.comparison}
      </em>
    </Link>
  );
}

function SectionTitle({ icon: TitleIcon, subtitle, title }: { icon: Icon; subtitle: string; title: string }) {
  return (
    <header className="admin-dash-v2-section-title">
      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      <TitleIcon size={20} />
    </header>
  );
}

function StatusDonutChart({ rows }: { rows: StatusBreakdown[] }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const gradient = buildConicGradient(rows, total);

  return (
    <div className="admin-dash-v2-donut">
      <div className="admin-dash-v2-donut-chart" aria-hidden="true" style={{ background: gradient }}>
        <div className="admin-dash-v2-donut-center">
          <strong>{total}</strong>
          <span>Total</span>
        </div>
      </div>

      <ul className="admin-dash-v2-donut-legend">
        {rows.map((row) => (
          <li key={row.label}>
            <i style={{ background: row.color }} />
            <span>{row.label}</span>
            <strong>{row.count}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function buildConicGradient(rows: StatusBreakdown[], total: number) {
  if (total <= 0) return '#f0ece6';

  let cursor = 0;
  const stops = rows.map((row) => {
    const start = (cursor / total) * 360;
    cursor += row.count;
    const end = (cursor / total) * 360;
    return `${row.color} ${start}deg ${end}deg`;
  });

  return `conic-gradient(from -90deg, ${stops.join(', ')})`;
}

function CollectionChart({ data }: { data: CollectionBucket[] }) {
  const yMax = Math.max(1, ...data.map((item) => item.total), 50);
  const ticks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];

  return (
    <div className="admin-dash-v2-revenue-chart">
      <div className="admin-dash-v2-revenue-plot">
        <div className="admin-dash-v2-revenue-yaxis" aria-hidden="true">
          {[...ticks].reverse().map((tick) => (
            <span key={tick}>{formatTrieu(tick)}</span>
          ))}
        </div>

        <div className="admin-dash-v2-revenue-canvas">
          <div className="admin-dash-v2-revenue-grid" aria-hidden="true">
            {ticks.map((tick) => (
              <span key={tick} />
            ))}
          </div>

          <div className="admin-dash-v2-revenue-bars">
            {data.map((item) => (
              <div
                className="admin-dash-v2-revenue-col"
                key={item.label}
                title={`${item.label}: ${formatTrieu(item.total)} triệu`}
              >
                <div
                  className="admin-dash-v2-revenue-stack"
                  style={{ height: `${Math.min((item.total / yMax) * 100, 100)}%` }}
                >
                  <span
                    style={{ background: '#ef4444', flexGrow: item.remainingPayment || 0.0001 }}
                    title={`Remaining: ${formatTrieu(item.remainingPayment)}`}
                  />
                  <span
                    style={{ background: '#f97316', flexGrow: item.deposit || 0.0001 }}
                    title={`Deposit: ${formatTrieu(item.deposit)}`}
                  />
                  <span
                    style={{ background: '#22c55e', flexGrow: item.projectStartFee || 0.0001 }}
                    title={`Start fee: ${formatTrieu(item.projectStartFee)}`}
                  />
                </div>
                <em>{item.label}</em>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ul className="admin-dash-v2-revenue-legend">
        {collectionSeries.map((series) => (
          <li key={series.key}>
            <i style={{ background: series.color }} />
            <span>{series.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BreakdownList({
  items,
}: {
  items: Array<{
    paymentType: string;
    collectedAmount: number;
    paidCount: number;
    outstandingAmount: number;
    outstandingCount: number;
    expiredCount: number;
  }>;
}) {
  return (
    <ul className="admin-dash-v2-breakdown-list">
      {items.map((item) => (
        <li key={item.paymentType}>
          <div>
            <strong>{formatEnumLabel(item.paymentType)}</strong>
            <span>
              {item.paidCount} paid · {item.outstandingCount} open · {item.expiredCount} expired
            </span>
          </div>
          <div>
            <em title={formatMoney(item.collectedAmount)}>{formatKpiMoney(item.collectedAmount)}</em>
            <small title={formatMoney(item.outstandingAmount)}>
              Outstanding {formatKpiMoney(item.outstandingAmount)}
            </small>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ExceptionsList({
  items,
  total,
}: {
  items: Array<{
    exceptionType: string;
    severity: string | null;
    title: string;
    amount: number | null;
    projectId: string | null;
  }>;
  total: number;
}) {
  return (
    <div className="admin-dash-v2-exceptions">
      <ul>
        {items.map((item, index) => (
          <li key={`${item.exceptionType}-${item.projectId ?? index}`}>
            <span className={`admin-dash-v2-severity admin-dash-v2-severity-${(item.severity || 'medium').toLowerCase()}`}>
              {item.severity || '—'}
            </span>
            <div>
              <strong>{item.title}</strong>
              <small>{formatEnumLabel(item.exceptionType)}</small>
            </div>
            <em>{item.amount != null ? formatKpiMoney(item.amount) : '—'}</em>
          </li>
        ))}
      </ul>
      <Link className="admin-dash-v2-exceptions-link" to="/admin/reports?tab=financial">
        View all exceptions ({total})
      </Link>
    </div>
  );
}

function formatPeriodLabel(period: string) {
  const [year, month] = period.split('-');
  if (!year || !month) return period;
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleString('en-US', { month: 'short' });
}

function toTrieu(value: number) {
  return value / MILLION_VND;
}

function formatTrieu(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function formatMoney(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
}

function formatKpiMoney(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ ₫`;
  }
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} triệu ₫`;
  }
  return formatMoney(value);
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function EmptyState({ text }: { text: string }) {
  return <div className="admin-dash-v2-empty">{text}</div>;
}

export default AdminDashbroad;
