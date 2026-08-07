import {
  IconAdjustmentsHorizontal,
  IconArrowRight,
  IconChartLine,
  IconChecks,
  IconCube,
  IconFileText,
  IconShoppingCart,
  IconTruckDelivery,
} from '@tabler/icons-react';
import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { SaleNavbar, SaleSidebar } from '@/features/SalePages/salecomponents';
import {
  getAccountById,
  getProjectSchedules,
  getProjectScheduleServiceResultMessage,
  type AccountDto,
  type ProjectScheduleDto,
} from '@/services/api';
import type { ProjectListItemDto } from '@/services/api/projects';
import { useCurrentUser } from '@/services/queries/useAuth';
import { useProjectList } from '@/services/queries/useProjects';
import { projectScheduleQueryKeys } from '@/services/queries/useSchedules';

import './SaleDashbroad.css';

type MetricCard = {
  title: string;
  subtitle: string;
  icon: typeof IconFileText;
  items: {
    label: string;
    value: string;
    delta: string;
    icon: typeof IconFileText;
    tone: 'neutral' | 'accent';
  }[];
};

type UpcomingSchedule = {
  project: ProjectListItemDto;
  schedule: ProjectScheduleDto;
};

const metrics: MetricCard[] = [
  {
    title: 'Project',
    subtitle: 'Pipeline and catalog coverage',
    icon: IconCube,
    items: [
      { label: 'Active Projects', value: '75', delta: '+8%', icon: IconFileText, tone: 'neutral' },
      { label: 'Total Products', value: '342', delta: '+18', icon: IconCube, tone: 'neutral' },
    ],
  },
  {
    title: 'Revenue',
    subtitle: 'Monthly commercial performance',
    icon: IconChartLine,
    items: [
      { label: 'Revenue This Month', value: '$245K', delta: '+23%', icon: IconChartLine, tone: 'neutral' },
    ],
  },
  {
    title: 'Order',
    subtitle: 'Confirmed and fulfillment status',
    icon: IconShoppingCart,
    items: [
      { label: 'Orders Confirmed', value: '52', delta: '+11%', icon: IconChecks, tone: 'neutral' },
      { label: 'In Production', value: '15', delta: '+4', icon: IconCube, tone: 'neutral' },
      { label: 'Ready For Delivery', value: '8', delta: '+2', icon: IconTruckDelivery, tone: 'accent' },
    ],
  },
];

const filters = [
  { label: 'Submitted', count: 24 },
  { label: 'In Consultation', count: 12 },
  { label: 'Need Information', count: 5 },
  { label: 'Awaiting Designer', count: 7 },
  { label: 'Quotation Sent', count: 18 },
  { label: 'Order Confirmed', count: 9 },
  { label: 'In Production', count: 6 },
];

function getStatusClass(status: string) {
  if (status === 'NEED_BASIC_INFORMATION' || status === 'Need Information') {
    return 'sale-status-badge sale-status-muted';
  }

  return 'sale-status-badge';
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-CA').format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function startOfToday() {
  const now = new Date();

  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function SaleDashbroad() {
  const currentUserQuery = useCurrentUser();
  const currentUser = currentUserQuery.data;
  const projectsQuery = useProjectList(
    {
      assignedSalesId: currentUser?.accountId,
      page: 1,
      limit: 50,
    },
    { enabled: Boolean(currentUser?.accountId) },
  );
  const assignedProjects = useMemo(
    () => (projectsQuery.data?.items ?? []).filter((project) => Boolean(project.projectId)),
    [projectsQuery.data?.items],
  );
  const recentProjects = useMemo(
    () =>
      [...assignedProjects]
        .filter((project) => project.status !== 'SUBMITTED')
        .sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime())
        .slice(0, 5),
    [assignedProjects],
  );
  const customerIds = useMemo(
    () => Array.from(new Set(recentProjects.map((project) => project.customerId).filter(Boolean))),
    [recentProjects],
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
      const account = query.data;

      if (account) {
        lookup[customerIds[index]] = account;
      }

      return lookup;
    }, {});
  }, [customerIds, customerQueries]);
  const scheduleQueries = useQueries({
    queries: assignedProjects.map((project) => {
      const params = {
        projectId: project.projectId,
        scheduleType: null,
        status: null,
        page: 1,
        limit: 100,
      };

      return {
        queryKey: projectScheduleQueryKeys.list(params),
        queryFn: () => getProjectSchedules(params),
        enabled: Boolean(project.projectId),
      };
    }),
  });
  const upcomingSchedules = useMemo<UpcomingSchedule[]>(() => {
    const today = startOfToday().getTime();
    const allSchedules = scheduleQueries
      .flatMap((query, index) =>
        (query.data?.items ?? []).map((schedule) => ({
          project: assignedProjects[index],
          schedule,
        })),
      )
      .filter((item): item is UpcomingSchedule => Boolean(item.project))
      .filter(({ schedule }) => schedule.status !== 'CANCELLED')
      .sort(
        (left, right) =>
          new Date(left.schedule.scheduledStart).getTime() - new Date(right.schedule.scheduledStart).getTime(),
      );
    const upcoming = allSchedules.filter(
      ({ schedule }) => new Date(schedule.scheduledStart).getTime() >= today,
    );
    const recentPast = allSchedules
      .filter(({ schedule }) => new Date(schedule.scheduledStart).getTime() < today)
      .reverse();

    return [...upcoming, ...recentPast].slice(0, 5);
  }, [assignedProjects, scheduleQueries]);
  const isLoadingActivities = currentUserQuery.isLoading || projectsQuery.isLoading;
  const hasActivityError = currentUserQuery.isError || projectsQuery.isError;
  const isLoadingSchedules = isLoadingActivities || scheduleQueries.some((query) => query.isLoading);
  const scheduleError = scheduleQueries.find((query) => query.isError)?.error;

  return (
    <div className="sale-dashboard-shell">
      <SaleSidebar activeLabel="Dashboard" />

      <div className="sale-dashboard-content">
        <SaleNavbar />

        <main className="sale-dashboard-main sale-dashboard-scrollbar">
          <section className="sale-dashboard-title">
            <h2>Sales Dashboard</h2>
            <p>Welcome back! Here's an overview of your projects and activities.</p>
          </section>

          <section className="sale-metrics-grid">
            <article className="sale-card sale-status-filter-card">
              <header className="sale-status-filter-header">
                <span className="sale-status-filter-icon">
                  <IconAdjustmentsHorizontal size={20} />
                </span>
                <div>
                  <h3>Quick Status Filters</h3>
                  <p>Jump directly to projects by their current status</p>
                </div>
              </header>
              <div className="sale-filter-list">
                {filters.map(({ label, count }) => (
                  <button key={label} type="button">
                    <span>{label}</span>
                    <strong>{count}</strong>
                  </button>
                ))}
              </div>
            </article>

            {metrics.map(({ title, subtitle, icon: MetricIcon, items }) => (
              <article key={title} className="sale-metric-card">
                <header className="sale-metric-card-header">
                  <div>
                    <h3>{title}</h3>
                    <p>{subtitle}</p>
                  </div>
                  <span className="sale-metric-card-icon">
                    <MetricIcon size={18} />
                  </span>
                </header>

                <div className="sale-metric-list">
                  {items.map(({ label, value, delta, icon: ItemIcon, tone }) => (
                    <div key={label} className="sale-metric-item">
                      <span className={`sale-metric-item-icon sale-metric-item-icon-${tone}`}>
                        <ItemIcon size={16} />
                      </span>
                      <div className="sale-metric-item-copy">
                        <p>{label}</p>
                        <strong>{value}</strong>
                      </div>
                      <span className="sale-metric-item-delta">{delta}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </section>

          <section className="sale-dashboard-lower">
            <article className="sale-card sale-activity-card">
              <header className="sale-card-header">
                <h3>Recent Project Activity</h3>
                <p>Latest updates from your active projects</p>
              </header>

              <div className="sale-activity-list">
                {isLoadingActivities ? <p className="sale-activity-state">Loading recent projects...</p> : null}
                {hasActivityError ? <p className="sale-activity-state sale-activity-state-error">Could not load recent projects.</p> : null}
                {!isLoadingActivities && !hasActivityError && recentProjects.length === 0 ? (
                  <p className="sale-activity-state">No assigned projects yet.</p>
                ) : null}
                {recentProjects.map((project) => {
                  const customer = customerById[project.customerId];

                  return (
                    <div key={project.projectId} className="sale-activity-row">
                      <div className="sale-activity-main">
                        <div className="sale-activity-meta">
                          <span>{project.projectCode}</span>
                          <span className={getStatusClass(project.status)}>{formatEnumLabel(project.status)}</span>
                        </div>
                        <h4>{project.projectName}</h4>
                        <p>{customer?.fullName ?? customer?.email ?? 'Loading customer...'}</p>
                      </div>
                      <Link
                        aria-label={`Open project ${project.projectName}`}
                        className="sale-activity-action"
                        to={`/sales/assigned-projects/${project.projectId}`}
                      >
                        <span>{project.submittedAt ? formatDate(project.submittedAt) : '-'}</span>
                        <IconArrowRight size={16} />
                      </Link>
                    </div>
                  );
                })}
              </div>

              <Link className="sale-outline-button" to="/sales/assigned-projects">
                View All Projects
              </Link>
            </article>

            <article className="sale-card sale-schedules-card">
              <header className="sale-card-header">
                <h3>Upcoming Schedules</h3>
                <p>Your appointments this week</p>
              </header>

              <div className="sale-schedule-list">
                {isLoadingSchedules ? <p className="sale-activity-state">Loading upcoming schedules...</p> : null}
                {scheduleError ? (
                  <p className="sale-activity-state sale-activity-state-error">
                    {getProjectScheduleServiceResultMessage(scheduleError)}
                  </p>
                ) : null}
                {!isLoadingSchedules && !scheduleError && upcomingSchedules.length === 0 ? (
                  <p className="sale-activity-state">No upcoming schedules yet.</p>
                ) : null}
                {upcomingSchedules.map(({ project, schedule }) => (
                  <div key={schedule.scheduleId} className="sale-schedule-item">
                    <div className="sale-schedule-main">
                      <div className="sale-schedule-meta">
                        <span>{project.projectCode}</span>
                        <span className="sale-status-badge sale-status-muted">{formatEnumLabel(schedule.scheduleType)}</span>
                      </div>
                      <h4>{schedule.title ?? formatEnumLabel(schedule.scheduleType)}</h4>
                    </div>
                    <Link
                      aria-label={`Open schedule ${schedule.title ?? formatEnumLabel(schedule.scheduleType)}`}
                      className="sale-schedule-time"
                      to={`/sales/schedules?scheduleId=${encodeURIComponent(schedule.scheduleId)}`}
                    >
                      <span>{formatDate(schedule.scheduledStart)}</span>
                      <span>{formatTime(schedule.scheduledStart)}</span>
                      <IconArrowRight size={16} />
                    </Link>
                  </div>
                ))}
              </div>

              <Link className="sale-outline-button" to="/sales/schedules">
                View All Schedules
              </Link>
            </article>
          </section>

        </main>
      </div>
    </div>
  );
}
