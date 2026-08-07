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
  IconUsers,
  type Icon,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import { AdminNavbar, AdminSidebar } from '../admincomponents';
import {
  type ProjectListItemDto,
  type ProjectStatus,
  useCurrentUser,
  useProjectList,
} from '@/services/queries';
import {
  dashboardKpiMocks,
  monthlyRevenue,
  roleWorkload,
  type DashboardKpiMock,
  type RevenuePeriodDatum,
} from './adminDashboardMockData';
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

type RevenueViewMode = 'month' | 'quarter';

const MILLION_VND = 1_000_000;

const revenueSeries = [
  { key: 'wholesale' as const, color: '#22c55e', label: 'Wholesale' },
  { key: 'retail' as const, color: '#f97316', label: 'Retail' },
  { key: 'completedOrders' as const, color: '#ef4444', label: 'Completed orders' },
];

const revenueYTicks = [0, 50, 100, 150, 200];
const revenueYMax = revenueYTicks[revenueYTicks.length - 1];

const quarterMonthGroups = [
  { label: 'Q1', months: ['Jan', 'Feb', 'Mar'] },
  { label: 'Q2', months: ['Apr', 'May', 'Jun'] },
  { label: 'Q3', months: ['Jul', 'Aug', 'Sep'] },
  { label: 'Q4', months: ['Oct', 'Nov', 'Dec'] },
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
  'PRODUCTION_BLOCKED',
  'READY_FOR_DELIVERY',
  'DELIVERING',
];

const overviewPhases: Array<{ color: string; label: string; statuses: ProjectStatus[] }> = [
  { color: '#5c4030', label: 'Request', statuses: ['SUBMITTED', 'NEED_BASIC_INFORMATION'] },
  { color: '#c4a574', label: 'Design', statuses: ['IN_CONSULTATION', 'WAITING_FOR_DESIGNER_ASSIGNMENT', 'MEASUREMENT_REQUIRED', 'SPACE_VERIFIED', 'PROPOSAL_CONSULTING', 'PROPOSAL_SELECTED'] },
  { color: '#a67c52', label: 'Quotation', statuses: ['QUOTATION_SENT', 'QUOTATION_REVISION_REQUESTED', 'ORDER_CONFIRMED'] },
  { color: '#e8d5b7', label: 'Production', statuses: ['IN_PRODUCTION', 'PRODUCTION_BLOCKED'] },
  { color: '#1f1a17', label: 'Delivery', statuses: ['READY_FOR_DELIVERY', 'DELIVERING', 'DELIVERED'] },
  { color: '#b8956c', label: 'Complete', statuses: ['COMPLETED'] },
];

const kpiIconMap: Record<DashboardKpiMock['label'], Icon> = {
  'Active Order Value': IconCash,
  'Amount Collected': IconCreditCard,
  'Outstanding Amount': IconClock,
};

const kpiToneMap: Record<DashboardKpiMock['label'], KpiItem['tone']> = {
  'Active Order Value': 'blue',
  'Amount Collected': 'green',
  'Outstanding Amount': 'amber',
};

export function AdminDashbroad() {
  const [revenueView, setRevenueView] = useState<RevenueViewMode>('month');
  const [lastRefreshAt, setLastRefreshAt] = useState(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const projectsQuery = useProjectList({ page: 1, limit: 100 });
  const currentUserQuery = useCurrentUser();
  const projects = useMemo(() => projectsQuery.data?.items ?? [], [projectsQuery.data?.items]);
  const refreshTime = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(lastRefreshAt);
  const statusBreakdown = useMemo(() => getStatusBreakdown(projects), [projects]);
  const revenueData = useMemo(() => getRevenueSeries(revenueView), [revenueView]);
  const kpis = getKpis(projects);

  async function handleRefresh() {
    if (isRefreshing) {
      return;
    }

    setIsRefreshing(true);

    try {
      await Promise.all([projectsQuery.refetch(), currentUserQuery.refetch()]);
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
                <p>Current operational overview, workload, revenue, and catalog readiness.</p>
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
            </section>

            <DashboardQueryState isError={projectsQuery.isError} isLoading={projectsQuery.isLoading} />

            <section className="admin-dash-v2-kpis" aria-label="KPI insight cards">
              {kpis.map((kpi) => <KpiCard item={kpi} key={kpi.label} />)}
            </section>

            <section className="admin-dash-v2-grid admin-dash-v2-grid-middle">
              <article className="admin-card admin-dash-v2-status">
                <SectionTitle icon={IconChartBar} title="Overview distribution" subtitle="Current project distribution across lifecycle phases." />
                {statusBreakdown.length > 0 ? <StatusDonutChart rows={statusBreakdown} /> : <EmptyState text="No project status data loaded yet." />}
              </article>

              <article className="admin-card admin-dash-v2-revenue">
                <SectionTitle
                  icon={IconCash}
                  title="Revenue"
                  subtitle={`Stacked sales by period. Unit: triệu VNĐ (${MILLION_VND.toLocaleString('vi-VN')}).`}
                />
                <div className="admin-dash-v2-revenue-controls" role="group" aria-label="Revenue period">
                  <button
                    className={revenueView === 'month' ? 'is-active' : undefined}
                    type="button"
                    onClick={() => setRevenueView('month')}
                  >
                    Month
                  </button>
                  <button
                    className={revenueView === 'quarter' ? 'is-active' : undefined}
                    type="button"
                    onClick={() => setRevenueView('quarter')}
                  >
                    Quarter
                  </button>
                </div>
                <RevenueChart data={revenueData} />
              </article>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function getKpis(projects: ProjectListItemDto[]): KpiItem[] {
  const activeProjects = projects.filter((project) => activeStatuses.includes(project.status)).length;
  const completedProjects = projects.filter((project) => project.status === 'COMPLETED').length;

  return [
    { comparison: '+8 this week', description: 'Projects currently moving through the FurniSpace workflow.', icon: IconBriefcase, label: 'Active Projects', path: '/admin/projects', tone: 'blue', trend: 'up', value: String(activeProjects), warning: 'Includes delivery and production' },
    { comparison: '+12%', description: 'Projects with completed status in the loaded API sample.', icon: IconCheck, label: 'Completed Projects This Month', path: '/admin/projects', tone: 'green', trend: 'up', value: String(completedProjects), warning: 'Needs date aggregate endpoint' },
    ...dashboardKpiMocks.map(toKpi),
  ];
}

function toKpi(item: DashboardKpiMock): KpiItem {
  return {
    comparison: item.comparison,
    description: item.note,
    icon: kpiIconMap[item.label],
    label: item.label,
    path: item.path,
    tone: kpiToneMap[item.label],
    trend: item.trend,
    value: item.value,
    warning: item.warning,
  };
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

function DashboardQueryState({ isError, isLoading }: { isError: boolean; isLoading: boolean }) {
  if (isLoading) {
    return <section className="admin-dash-v2-state"><IconRefresh size={16} /> Loading project and catalog data...</section>;
  }

  if (isError) {
    return <section className="admin-dash-v2-state admin-dash-v2-state-error"><IconAlertTriangle size={16} /> Some live API data could not be loaded. Mock dashboard sections remain visible for UI review.</section>;
  }

  return null;
}

function KpiCard({ item }: { item: KpiItem }) {
  const KpiIcon = item.icon;
  const TrendIcon = item.trend === 'down' ? IconTrendingDown : item.trend === 'up' ? IconTrendingUp : IconInfoCircle;

  return (
    <Link className={`admin-dash-v2-kpi admin-dash-v2-kpi-${item.tone}`} title={item.description} to={item.path}>
      <span><KpiIcon size={19} /></span>
      <div>
        <small>{item.label}</small>
        <strong>{item.value}</strong>
        <p>{item.warning}</p>
      </div>
      <em><TrendIcon size={14} /> {item.comparison}</em>
    </Link>
  );
}

function SectionTitle({ icon: TitleIcon, subtitle, title }: { icon: Icon; subtitle: string; title: string }) {
  return (
    <header className="admin-dash-v2-section-title">
      <div><h3>{title}</h3><p>{subtitle}</p></div>
      <TitleIcon size={20} />
    </header>
  );
}

function MetricBlock({ label, value }: { label: string; value: string }) {
  return <div className="admin-dash-v2-metric-block"><span>{label}</span><strong>{value}</strong></div>;
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
  if (total <= 0) {
    return '#f0ece6';
  }

  let cursor = 0;
  const stops = rows.map((row) => {
    const start = (cursor / total) * 360;
    cursor += row.count;
    const end = (cursor / total) * 360;

    return `${row.color} ${start}deg ${end}deg`;
  });

  return `conic-gradient(from -90deg, ${stops.join(', ')})`;
}

function getRevenueSeries(view: RevenueViewMode): RevenuePeriodDatum[] {
  if (view === 'month') {
    return monthlyRevenue;
  }

  return quarterMonthGroups
    .map((quarter) => {
      const months = monthlyRevenue.filter((item) => quarter.months.includes(item.label));

      if (months.length === 0) {
        return null;
      }

      return {
        label: quarter.label,
        wholesale: sumField(months, 'wholesale'),
        retail: sumField(months, 'retail'),
        completedOrders: sumField(months, 'completedOrders'),
        profit: sumField(months, 'profit'),
      };
    })
    .filter((item): item is RevenuePeriodDatum => Boolean(item));
}

function sumField(rows: RevenuePeriodDatum[], key: Exclude<keyof RevenuePeriodDatum, 'label'>) {
  return rows.reduce((sum, row) => sum + row[key], 0);
}

function RevenueChart({ data }: { data: RevenuePeriodDatum[] }) {
  return (
    <div className="admin-dash-v2-revenue-chart">
      <div className="admin-dash-v2-revenue-plot">
        <div className="admin-dash-v2-revenue-yaxis" aria-hidden="true">
          {[...revenueYTicks].reverse().map((tick) => (
            <span key={tick}>{formatTrieu(tick)}</span>
          ))}
        </div>

        <div className="admin-dash-v2-revenue-canvas">
          <div className="admin-dash-v2-revenue-grid" aria-hidden="true">
            {revenueYTicks.map((tick) => (
              <span key={tick} />
            ))}
          </div>

          <div className="admin-dash-v2-revenue-bars">
            {data.map((item) => {
              const stacked = item.wholesale + item.retail + item.completedOrders;

              return (
                <div className="admin-dash-v2-revenue-col" key={item.label} title={`${item.label}: ${formatTrieu(stacked)} triệu`}>
                  <div className="admin-dash-v2-revenue-stack" style={{ height: `${Math.min((stacked / revenueYMax) * 100, 100)}%` }}>
                    <span style={{ background: '#ef4444', flexGrow: item.completedOrders }} title={`Completed orders: ${formatTrieu(item.completedOrders)}`} />
                    <span style={{ background: '#f97316', flexGrow: item.retail }} title={`Retail: ${formatTrieu(item.retail)}`} />
                    <span style={{ background: '#22c55e', flexGrow: item.wholesale }} title={`Wholesale: ${formatTrieu(item.wholesale)}`} />
                  </div>
                  <em>{item.label}</em>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ul className="admin-dash-v2-revenue-legend">
        {revenueSeries.map((series) => (
          <li key={series.key}>
            <i style={{ background: series.color }} />
            <span>{series.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatTrieu(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function EmptyState({ text }: { text: string }) {
  return <div className="admin-dash-v2-empty">{text}</div>;
}

export default AdminDashbroad;
