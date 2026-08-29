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

const overviewBuckets: Array<{ color: string; key: keyof ProjectBucketCounts }> = [
  { color: '#5c4030', key: 'intake' },
  { color: '#c4a574', key: 'designMonitor' },
  { color: '#a67c52', key: 'commercial' },
  { color: '#e8d5b7', key: 'fulfillment' },
  { color: '#b8956c', key: 'terminal' },
  { color: '#9ca3af', key: 'other' },
];

export function AdminDashbroad() {
  const { lang } = useLang();
  const t = adminCopy[lang];
  const d = t.dashboard;
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
    () => getBucketBreakdown(overviewQuery.data?.projects.byBucket, d),
    [overviewQuery.data?.projects.byBucket, d],
  );

  const kpis = useMemo(
    () => buildKpis(overviewQuery.data, summaryQuery.data, d),
    [overviewQuery.data, summaryQuery.data, d],
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
                <span>{d.eyebrow}</span>
                <h2>{d.title}</h2>
                <p>{d.subtitle}</p>
              </div>
              <div className="admin-dash-v2-header-actions">
                <div className="admin-dash-v2-revenue-controls" role="group" aria-label="Financial period">
                  <button className={period === 'THIS_MONTH' ? 'is-active' : undefined} type="button" onClick={() => setPeriod('THIS_MONTH')}>
                    {d.periodThisMonth}
                  </button>
                  <button className={period === 'THIS_YEAR' ? 'is-active' : undefined} type="button" onClick={() => setPeriod('THIS_YEAR')}>
                    {d.periodThisYear}
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
              loadingText={d.loadingData}
              fallbackError={d.loadError}
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
                  title={d.overviewTitle}
                  subtitle={d.overviewSubtitle}
                />
                {overviewQuery.isLoading ? <EmptyState text={d.overviewLoading} /> : null}
                {overviewQuery.isError ? (
                  <EmptyState text={getReportServiceResultMessage(overviewQuery.error)} />
                ) : null}
                {!overviewQuery.isLoading && !overviewQuery.isError ? (
                  statusBreakdown.length > 0 ? (
                    <StatusDonutChart rows={statusBreakdown} totalLabel={d.overviewTotal} />
                  ) : (
                    <EmptyState text={d.overviewEmpty} />
                  )
                ) : null}
              </article>

              <article className="admin-card">
                <SectionTitle
                  icon={IconCreditCard}
                  title={d.breakdownTitle}
                  subtitle={d.breakdownSubtitle}
                />
                {breakdownQuery.isLoading ? <EmptyState text={d.breakdownLoading} /> : null}
                {breakdownQuery.isError ? (
                  <EmptyState text={getAdminFinancialServiceResultMessage(breakdownQuery.error)} />
                ) : null}
                {breakdownQuery.data ? <BreakdownList items={breakdownQuery.data.items} copy={d} /> : null}
              </article>
            </section>

            <section className="admin-dash-v2-grid admin-dash-v2-grid-bottom">
              <article className="admin-card admin-dash-v2-exceptions-wide">
                <SectionTitle
                  icon={IconAlertTriangle}
                  title={d.exceptionsTitle}
                  subtitle={d.exceptionsSubtitle}
                />
                {exceptionsQuery.isLoading ? <EmptyState text={d.exceptionsLoading} /> : null}
                {exceptionsQuery.isError ? (
                  <EmptyState text={getAdminFinancialServiceResultMessage(exceptionsQuery.error)} />
                ) : null}
                {exceptionsQuery.data ? (
                  exceptionsQuery.data.items.length > 0 ? (
                    <ExceptionsList
                      items={exceptionsQuery.data.items}
                      viewAllLabel={d.exceptionsViewAll(exceptionsQuery.data.totalItems)}
                      formatExceptionType={(value) => formatPaymentOrExceptionLabel(value, d)}
                    />
                  ) : (
                    <EmptyState text={d.exceptionsEmpty} />
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
  d: (typeof adminCopy)['en']['dashboard'],
): KpiItem[] {
  const activeProjects = overview?.projects.totalNonTerminal ?? 0;
  const completedProjects = overview?.projects.completedInRange ?? 0;

  const projectKpis: KpiItem[] = overview
    ? [
        {
          comparison: d.kpiActiveCompare,
          description: d.kpiActiveDesc,
          icon: IconBriefcase,
          label: d.kpiActive,
          path: '/admin/projects',
          tone: 'blue',
          trend: 'up',
          value: String(activeProjects),
          warning: d.kpiActiveWarn,
        },
        {
          comparison: d.kpiCompletedCompare,
          description: d.kpiCompletedDesc,
          icon: IconCheck,
          label: d.kpiCompleted,
          path: '/admin/projects',
          tone: 'green',
          trend: 'up',
          value: String(completedProjects),
          warning: d.kpiRejectedInPeriod(overview.projects.rejectedInRange),
        },
      ]
    : [];

  const financial: KpiItem[] = summary
    ? [
        {
          comparison: d.kpiActivePayments(summary.activePaymentCount),
          description: d.kpiCollectedDesc,
          icon: IconCreditCard,
          label: d.kpiCollected,
          path: '/admin/reports?tab=financial',
          tone: 'green',
          trend: 'up',
          value: formatKpiMoney(summary.collectedAmount),
          warning: d.kpiFailedAttempts(summary.failedTransactionCount),
        },
        {
          comparison: d.kpiObligations(summary.activePaymentCount),
          description: d.kpiOutstandingDesc,
          icon: IconClock,
          label: d.kpiOutstanding,
          path: '/admin/reports?tab=financial',
          tone: 'amber',
          trend: 'flat',
          value: formatKpiMoney(summary.outstandingPaymentAmount),
          warning: d.kpiOutstandingWarn,
        },
        {
          comparison: d.kpiReceivableCompare,
          description: d.kpiReceivableDesc,
          icon: IconCash,
          label: d.kpiReceivable,
          path: '/admin/reports?tab=financial',
          tone: 'amber',
          trend: 'flat',
          value: formatKpiMoney(summary.contractedReceivableAmount),
          warning: d.kpiReceivableWarn,
        },
        {
          comparison: d.kpiCommercialCompare,
          description: d.kpiCommercialDesc,
          icon: IconCash,
          label: d.kpiCommercial,
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

function getBucketBreakdown(
  byBucket: ProjectBucketCounts | undefined,
  d: (typeof adminCopy)['en']['dashboard'],
): StatusBreakdown[] {
  if (!byBucket) return [];

  const labels: Record<keyof ProjectBucketCounts, string> = {
    intake: d.bucketIntake,
    designMonitor: d.bucketDesign,
    commercial: d.bucketCommercial,
    fulfillment: d.bucketFulfillment,
    terminal: d.bucketTerminal,
    other: d.bucketOther,
  };

  return overviewBuckets
    .map((bucket) => ({
      color: bucket.color,
      count: byBucket[bucket.key] ?? 0,
      label: labels[bucket.key],
    }))
    .filter((row) => row.count > 0);
}

function DashboardQueryState({
  errorMessage,
  fallbackError,
  isError,
  isLoading,
  loadingText,
}: {
  errorMessage?: string;
  fallbackError: string;
  isError: boolean;
  isLoading: boolean;
  loadingText: string;
}) {
  if (isLoading) {
    return (
      <section className="admin-dash-v2-state">
        <IconRefresh size={16} /> {loadingText}
      </section>
    );
  }

  if (isError) {
    return (
      <section className="admin-dash-v2-state admin-dash-v2-state-error">
        <IconInfoCircle size={16} /> {errorMessage || fallbackError}
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

function StatusDonutChart({ rows, totalLabel }: { rows: StatusBreakdown[]; totalLabel: string }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const gradient = buildConicGradient(rows, total);

  return (
    <div className="admin-dash-v2-donut">
      <div className="admin-dash-v2-donut-chart" aria-hidden="true" style={{ background: gradient }}>
        <div className="admin-dash-v2-donut-center">
          <strong>{total}</strong>
          <span>{totalLabel}</span>
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
  copy,
}: {
  items: Array<{
    paymentType: string;
    collectedAmount: number;
    paidCount: number;
    outstandingAmount: number;
    outstandingCount: number;
    expiredCount: number;
  }>;
  copy: (typeof adminCopy)['en']['dashboard'];
}) {
  return (
    <ul className="admin-dash-v2-breakdown-list">
      {items.map((item) => (
        <li key={item.paymentType}>
          <div>
            <strong>{formatPaymentOrExceptionLabel(item.paymentType, copy)}</strong>
            <span>
              {copy.breakdownPaidOpenExpired(item.paidCount, item.outstandingCount, item.expiredCount)}
            </span>
          </div>
          <div>
            <em title={formatMoney(item.collectedAmount)}>{formatKpiMoney(item.collectedAmount)}</em>
            <small title={formatMoney(item.outstandingAmount)}>
              {copy.breakdownOutstanding} {formatKpiMoney(item.outstandingAmount)}
            </small>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ExceptionsList({
  items,
  viewAllLabel,
  formatExceptionType,
}: {
  items: Array<{
    exceptionType: string;
    severity: string | null;
    title: string;
    amount: number | null;
    projectId: string | null;
  }>;
  viewAllLabel: string;
  formatExceptionType: (value: string) => string;
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
              <small>{formatExceptionType(item.exceptionType)}</small>
            </div>
            <em>{item.amount != null ? formatKpiMoney(item.amount) : '—'}</em>
          </li>
        ))}
      </ul>
      <Link className="admin-dash-v2-exceptions-link" to="/admin/reports?tab=financial">
        {viewAllLabel}
      </Link>
    </div>
  );
}

function formatPaymentOrExceptionLabel(value: string, d: (typeof adminCopy)['en']['dashboard']) {
  const map: Record<string, string> = {
    PROJECT_START_FEE: d.paymentStartFee,
    START_FEE: d.paymentStartFee,
    DEPOSIT: d.paymentDeposit,
    REMAINING_PAYMENT: d.paymentRemaining,
    REMAINING: d.paymentRemaining,
  };
  return map[value] ?? formatEnumLabel(value);
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
