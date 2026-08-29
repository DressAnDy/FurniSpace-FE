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
import { adminCopy } from '../admincomponents/adminI18n';
import { useLang } from '@/app/providers/useLang';
import {
  getAdminFinancialServiceResultMessage,
  getFinancialPeriodRange,
  type AdminFinancialSummaryDto,
  type FinancialPeriodType,
} from '@/services/api/adminFinancial';
import {
  getReportServiceResultMessage,
  type ProjectBucketCounts,
  type ReportOverviewDto,
} from '@/services/api/reports';
import {
  useAdminFinancialExceptions,
  useAdminFinancialPaymentBreakdown,
  useAdminFinancialSummary,
  useCurrentUser,
  useReportOverview,
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

const overviewBuckets: Array<{ color: string; key: keyof ProjectBucketCounts; label: string }> = [
  { color: '#5c4030', key: 'intake', label: 'Intake' },
  { color: '#c4a574', key: 'designMonitor', label: 'Design' },
  { color: '#a67c52', key: 'commercial', label: 'Commercial' },
  { color: '#e8d5b7', key: 'fulfillment', label: 'Fulfillment' },
  { color: '#b8956c', key: 'terminal', label: 'Terminal' },
  { color: '#9ca3af', key: 'other', label: 'Other' },
];

export function AdminDashbroad() {
  const { lang } = useLang();
  const t = adminCopy[lang];
  const [period, setPeriod] = useState<FinancialPeriodType>('THIS_MONTH');
  const [lastRefreshAt, setLastRefreshAt] = useState(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const dateRange = useMemo(() => getFinancialPeriodRange(period), [period]);
  const summaryParams = useMemo(() => ({ period, currency: 'VND' as const }), [period]);
  const overviewParams = useMemo(() => ({ from: dateRange.from, to: dateRange.to }), [dateRange]);

  const overviewQuery = useReportOverview(overviewParams);
  const currentUserQuery = useCurrentUser();
  const summaryQuery = useAdminFinancialSummary(summaryParams);
  const breakdownQuery = useAdminFinancialPaymentBreakdown(dateRange);
  const exceptionsQuery = useAdminFinancialExceptions({ page: 1, pageSize: 3 });

  const refreshTime = new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' }).format(lastRefreshAt);
  const statusBreakdown = useMemo(
    () => getBucketBreakdown(overviewQuery.data?.projects.byBucket),
    [overviewQuery.data?.projects.byBucket],
  );

  const kpis = useMemo(
    () => buildKpis(overviewQuery.data, summaryQuery.data),
    [overviewQuery.data, summaryQuery.data],
  );

  const isLoading = overviewQuery.isLoading || summaryQuery.isLoading;
  const isError = overviewQuery.isError || summaryQuery.isError;

  async function handleRefresh() {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await Promise.all([
        overviewQuery.refetch(),
        currentUserQuery.refetch(),
        summaryQuery.refetch(),
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
        <AdminSidebar activeKey="dashboard" />

        <section className="admin-main">
          <AdminNavbar activeLabel={t.nav.dashboard} />
          <div className="admin-content admin-dash-v2">
            <section className="admin-dash-v2-header">
              <div>
                <span>Operational command center</span>
                <h2>{t.dashboard.title}</h2>
                <p>{t.dashboard.subtitle}</p>
              </div>
              <div className="admin-dash-v2-header-actions">
                <div className="admin-dash-v2-revenue-controls" role="group" aria-label="Financial period">
                  <button className={period === 'THIS_MONTH' ? 'is-active' : undefined} type="button" onClick={() => setPeriod('THIS_MONTH')}>
                    {t.dashboard.periodThisMonth}
                  </button>
                  <button className={period === 'THIS_YEAR' ? 'is-active' : undefined} type="button" onClick={() => setPeriod('THIS_YEAR')}>
                    {t.dashboard.periodThisYear}
                  </button>
                </div>
                <button
                  className="admin-dash-v2-refresh-button"
                  disabled={isRefreshing}
                  type="button"
                  onClick={() => void handleRefresh()}
                >
                  <IconRefresh className={isRefreshing ? 'is-spinning' : undefined} size={14} />
                  {isRefreshing ? t.common.refreshing : `${t.common.refresh} · ${refreshTime}`}
                </button>
              </div>
            </section>

            <DashboardQueryState
              isError={isError}
              isLoading={isLoading}
              errorMessage={
                summaryQuery.isError
                  ? getAdminFinancialServiceResultMessage(summaryQuery.error)
                  : overviewQuery.isError
                    ? getReportServiceResultMessage(overviewQuery.error)
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
                  subtitle="Project buckets from admin reports overview (system-wide)."
                />
                {overviewQuery.isLoading ? <EmptyState text="Loading project distribution..." /> : null}
                {overviewQuery.isError ? (
                  <EmptyState text={getReportServiceResultMessage(overviewQuery.error)} />
                ) : null}
                {!overviewQuery.isLoading && !overviewQuery.isError ? (
                  statusBreakdown.length > 0 ? (
                    <StatusDonutChart rows={statusBreakdown} />
                  ) : (
                    <EmptyState text="No project status data loaded yet." />
                  )
                ) : null}
              </article>

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
            </section>

            <section className="admin-dash-v2-grid admin-dash-v2-grid-bottom">
              <article className="admin-card admin-dash-v2-exceptions-wide">
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

function buildKpis(
  overview: ReportOverviewDto | undefined,
  summary: AdminFinancialSummaryDto | undefined,
): KpiItem[] {
  const activeProjects = overview?.projects.totalNonTerminal ?? 0;
  const completedProjects = overview?.projects.completedInRange ?? 0;

  const projectKpis: KpiItem[] = overview
    ? [
        {
          comparison: 'Non-terminal',
          description: 'All projects that are not COMPLETED or REJECTED across the system.',
          icon: IconBriefcase,
          label: 'Active Projects',
          path: '/admin/projects',
          tone: 'blue',
          trend: 'up',
          value: String(activeProjects),
          warning: 'System-wide count',
        },
        {
          comparison: 'In selected period',
          description: 'Projects completed within the selected financial period.',
          icon: IconCheck,
          label: 'Completed Projects',
          path: '/admin/projects',
          tone: 'green',
          trend: 'up',
          value: String(completedProjects),
          warning: `${overview.projects.rejectedInRange} rejected in period`,
        },
      ]
    : [];

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

  return [...projectKpis, ...financial];
}

function getBucketBreakdown(byBucket: ProjectBucketCounts | undefined): StatusBreakdown[] {
  if (!byBucket) return [];

  return overviewBuckets
    .map((bucket) => ({
      color: bucket.color,
      count: byBucket[bucket.key] ?? 0,
      label: bucket.label,
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
