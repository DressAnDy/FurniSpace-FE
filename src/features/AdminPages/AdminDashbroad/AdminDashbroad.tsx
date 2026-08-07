import { useMemo } from 'react';
import {
  IconAlertTriangle,
  IconBriefcase,
  IconBuildingFactory,
  IconCash,
  IconChartBar,
  IconCheck,
  IconClock,
  IconCreditCard,
  IconFolder,
  IconInfoCircle,
  IconRefresh,
  IconReportAnalytics,
  IconShieldExclamation,
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
  dashboardAlerts,
  dashboardKpiMocks,
  paymentHealth,
  roleWorkload,
  type DashboardKpiMock,
} from './adminDashboardMockData';
import './AdminDashbroad.css';

type KpiItem = {
  comparison: string;
  description: string;
  icon: Icon;
  label: string;
  note: string;
  path: string;
  tone: 'amber' | 'blue' | 'green' | 'red' | 'neutral';
  trend: 'up' | 'down' | 'flat';
  value: string;
  warning: string;
};

type PipelinePhase = {
  age: string;
  count: number;
  label: string;
  overdue: number;
  path: string;
  statuses: ProjectStatus[];
};

type StatusBreakdown = {
  count: number;
  label: string;
};

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

const statusLabels: Record<ProjectStatus, string> = {
  SUBMITTED: 'Request',
  IN_CONSULTATION: 'Consultation',
  NEED_BASIC_INFORMATION: 'Needs Info',
  WAITING_FOR_DESIGNER_ASSIGNMENT: 'Designer Needed',
  MEASUREMENT_REQUIRED: 'Measurement',
  SPACE_VERIFIED: 'Space Verified',
  PROPOSAL_CONSULTING: 'Proposal',
  PROPOSAL_SELECTED: 'Proposal Selected',
  QUOTATION_SENT: 'Quotation',
  QUOTATION_REVISION_REQUESTED: 'Quotation Revision',
  ORDER_CONFIRMED: 'Order Confirmed',
  IN_PRODUCTION: 'Production',
  PRODUCTION_BLOCKED: 'Production Blocked',
  READY_FOR_DELIVERY: 'Ready Delivery',
  DELIVERING: 'Delivering',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
};

const pipelineDefinition: Array<Omit<PipelinePhase, 'count'>> = [
  { age: '9h avg', label: 'Request', overdue: 5, path: '/admin/projects', statuses: ['SUBMITTED', 'NEED_BASIC_INFORMATION'] },
  { age: '1.4d avg', label: 'Consultation', overdue: 2, path: '/admin/projects', statuses: ['IN_CONSULTATION', 'MEASUREMENT_REQUIRED'] },
  { age: '2.1d avg', label: 'Design Prep', overdue: 3, path: '/admin/projects', statuses: ['WAITING_FOR_DESIGNER_ASSIGNMENT', 'SPACE_VERIFIED'] },
  { age: '3.6d avg', label: 'Proposal', overdue: 4, path: '/admin/reports', statuses: ['PROPOSAL_CONSULTING', 'PROPOSAL_SELECTED'] },
  { age: '1.8d avg', label: 'Quotation', overdue: 3, path: '/admin/reports', statuses: ['QUOTATION_SENT', 'QUOTATION_REVISION_REQUESTED'] },
  { age: '2.7d avg', label: 'Order / Deposit', overdue: 2, path: '/admin/reports', statuses: ['ORDER_CONFIRMED'] },
  { age: '5.8d avg', label: 'Production', overdue: 7, path: '/admin/reports', statuses: ['IN_PRODUCTION', 'PRODUCTION_BLOCKED'] },
  { age: '1.2d avg', label: 'Delivery', overdue: 1, path: '/admin/reports', statuses: ['READY_FOR_DELIVERY', 'DELIVERING'] },
  { age: '0.6d avg', label: 'Completion', overdue: 0, path: '/admin/reports', statuses: ['DELIVERED', 'COMPLETED'] },
];

const kpiIconMap: Record<DashboardKpiMock['label'], Icon> = {
  'Projects At Risk': IconShieldExclamation,
  'Active Order Value': IconCash,
  'Amount Collected': IconCreditCard,
  'Outstanding Amount': IconClock,
  'Blocked Production': IconBuildingFactory,
};

const kpiToneMap: Record<DashboardKpiMock['label'], KpiItem['tone']> = {
  'Projects At Risk': 'red',
  'Active Order Value': 'blue',
  'Amount Collected': 'green',
  'Outstanding Amount': 'amber',
  'Blocked Production': 'red',
};

export function AdminDashbroad() {
  const projectsQuery = useProjectList({ page: 1, limit: 100 });
  const currentUserQuery = useCurrentUser();
  const projects = useMemo(() => projectsQuery.data?.items ?? [], [projectsQuery.data?.items]);
  const now = useMemo(() => new Date(), []);
  const displayDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(now);
  const refreshTime = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(now);
  const adminName = currentUserQuery.data?.fullName ?? 'Admin';
  const pipeline = useMemo(() => getPipeline(projects), [projects]);
  const statusBreakdown = useMemo(() => getStatusBreakdown(projects), [projects]);
  const kpis = getKpis(projects);

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
                <p>Current operational overview, alerts, workload, payment health, and catalog readiness.</p>
              </div>
              <aside>
                <strong>{adminName}</strong>
                <p>{displayDate}</p>
                <small><IconRefresh size={14} /> Last refresh {refreshTime}</small>
              </aside>
            </section>

            <section className="admin-dash-v2-filters" aria-label="Admin dashboard filters">
              <label><span>Date range</span><select defaultValue="this-week"><option value="today">Today</option><option value="this-week">This week</option><option value="this-month">This month</option></select></label>
              <label><span>Business type</span><select defaultValue="all"><option value="all">All business types</option><option value="cafe">Cafe</option><option value="office">Office</option><option value="retail">Retail</option><option value="restaurant">Restaurant</option></select></label>
              <label><span>Project scope</span><select defaultValue="active"><option value="active">Active projects</option><option value="risk">At risk</option><option value="completed">Completed</option></select></label>
              <Link className="admin-dash-v2-report-link" to="/admin/reports"><IconReportAnalytics size={17} /> Open Reports</Link>
            </section>

            <DashboardQueryState isError={projectsQuery.isError} isLoading={projectsQuery.isLoading} />

            <section className="admin-dash-v2-alerts" aria-label="Critical alerts">
              <SectionTitle icon={IconAlertTriangle} title="Attention Center" subtitle="Current issues that need operational follow-up." />
              <div className="admin-dash-v2-alert-grid">
                {dashboardAlerts.map((alert) => (
                  <Link className={`admin-dash-v2-alert admin-dash-v2-alert-${alert.severity}`} key={`${alert.module}-${alert.entity}`} to={alert.path}>
                    <span>{alert.severity}</span>
                    <strong>{alert.count}</strong>
                    <div>
                      <p>{alert.module}</p>
                      <small>{alert.entity} / {alert.age}</small>
                    </div>
                    <em>{alert.action}</em>
                  </Link>
                ))}
              </div>
            </section>

            <section className="admin-dash-v2-kpis" aria-label="KPI insight cards">
              {kpis.map((kpi) => <KpiCard item={kpi} key={kpi.label} />)}
            </section>

            <section className="admin-dash-v2-grid admin-dash-v2-grid-top">
              <article className="admin-card admin-dash-v2-pipeline">
                <SectionTitle icon={IconBriefcase} title="Project Pipeline" subtitle="Major lifecycle phases without exposing raw backend enums." />
                <div className="admin-dash-v2-pipeline-track">
                  {pipeline.map((phase) => (
                    <Link key={phase.label} to={phase.path} title={`${phase.label}: ${phase.statuses.map((status) => statusLabels[status]).join(', ')}`}>
                      <strong>{phase.count}</strong>
                      <span>{phase.label}</span>
                      <small>{phase.age}</small>
                      <em>{phase.overdue} overdue</em>
                    </Link>
                  ))}
                </div>
              </article>
            </section>

            <section className="admin-dash-v2-grid admin-dash-v2-grid-middle">
              <article className="admin-card admin-dash-v2-status">
                <SectionTitle icon={IconChartBar} title="Status Breakdown" subtitle="Current project distribution." />
                {statusBreakdown.length > 0 ? <HorizontalBars rows={statusBreakdown} /> : <EmptyState text="No project status data loaded yet." />}
              </article>

              <article className="admin-card admin-dash-v2-payment">
                <SectionTitle icon={IconCreditCard} title="Payment Health" subtitle="Canonical payment phases only." />
                <div className="admin-dash-v2-payment-list">
                  {paymentHealth.map((item) => (
                    <Link key={item.label} to={item.path}>
                      <div><strong>{item.label}</strong><span>{item.value}</span></div>
                      <p className={`admin-dash-v2-payment-bar admin-dash-v2-payment-${item.tone}`}><i style={{ width: `${item.progress}%` }} /></p>
                    </Link>
                  ))}
                </div>
              </article>
            </section>

            <section className="admin-card admin-dash-v2-workload">
              <SectionTitle icon={IconUsers} title="Workload by Role" subtitle="Compact role view, not employee ranking." />
              <div className="admin-dash-v2-role-grid">
                {roleWorkload.map((role) => (
                  <Link key={role.label} to={role.path}>
                    <header><strong>{role.label}</strong><span>{role.utilization}% load</span></header>
                    <p><i style={{ width: `${role.utilization}%` }} /></p>
                    <div>
                      {role.metrics.map((metric) => <MetricBlock key={metric.label} label={metric.label} value={metric.value} />)}
                    </div>
                  </Link>
                ))}
              </div>
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
  const newProjects = projects.filter((project) => isCurrentMonth(project.submittedAt)).length || projects.length;
  const apiKpis: KpiItem[] = [
    { comparison: '+8 this week', description: 'Projects currently moving through the FurniSpace workflow.', icon: IconBriefcase, label: 'Active Projects', note: 'From project API', path: '/admin/projects', tone: 'blue', trend: 'up', value: String(activeProjects), warning: 'Includes delivery and production' },
    { comparison: '+18 vs previous', description: 'Projects submitted in the selected/current period.', icon: IconFolder, label: 'New Projects This Month', note: 'From submittedAt when available', path: '/admin/projects', tone: 'neutral', trend: 'up', value: String(newProjects), warning: 'Filter is client-side' },
    { comparison: '+12%', description: 'Projects with completed status in the loaded API sample.', icon: IconCheck, label: 'Completed Projects This Month', note: 'From project API sample', path: '/admin/projects', tone: 'green', trend: 'up', value: String(completedProjects), warning: 'Needs date aggregate endpoint' },
  ];

  return [
    apiKpis[0],
    toKpi(dashboardKpiMocks[0]),
    apiKpis[1],
    apiKpis[2],
    ...dashboardKpiMocks.slice(1).map(toKpi),
  ];
}

function toKpi(item: DashboardKpiMock): KpiItem {
  return {
    comparison: item.comparison,
    description: item.note,
    icon: kpiIconMap[item.label],
    label: item.label,
    note: 'Mock aggregate',
    path: item.path,
    tone: kpiToneMap[item.label],
    trend: item.trend,
    value: item.value,
    warning: item.warning,
  };
}

function getPipeline(projects: ProjectListItemDto[]): PipelinePhase[] {
  return pipelineDefinition.map((phase) => ({
    ...phase,
    count: projects.filter((project) => phase.statuses.includes(project.status)).length,
  }));
}

function getStatusBreakdown(projects: ProjectListItemDto[]): StatusBreakdown[] {
  const counts = projects.reduce<Record<string, number>>((acc, project) => {
    const label = statusLabels[project.status];
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 8);
}

function isCurrentMonth(value: string) {
  const date = new Date(value);
  const now = new Date();
  return Number.isFinite(date.getTime()) && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
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
      <b>{item.note}</b>
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

function HorizontalBars({ rows }: { rows: StatusBreakdown[] }) {
  const max = Math.max(...rows.map((row) => row.count), 1);

  return (
    <div className="admin-dash-v2-bars">
      {rows.map((row) => (
        <div key={row.label} className="admin-dash-v2-bar-row" title={`${row.label}: ${row.count} projects`}>
          <span>{row.label}</span>
          <div><i style={{ width: `${Math.max((row.count / max) * 100, 6)}%` }} /></div>
          <strong>{row.count}</strong>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="admin-dash-v2-empty">{text}</div>;
}

export default AdminDashbroad;
