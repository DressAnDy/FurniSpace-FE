import type { ReactNode } from 'react';
import { useMemo } from 'react';
import {
  IconBriefcase,
  IconBuildingFactory,
  IconChartLine,
  IconClipboardCheck,
  IconCube,
  IconShoppingCartCheck,
  IconTruckDelivery,
} from '@tabler/icons-react';

import { AdminNavbar, AdminSidebar } from '../admincomponents';
import { type ProductListItemDto, type ProjectListItemDto, type ProjectStatus, useProductList, useProjectList } from '@/services/queries';
import './AdminDashbroad.css';

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

const statusTones = ['amber', 'blue', 'violet', 'gold', 'green', 'dark-green'] as const;

export function AdminDashbroad() {
  const projectsQuery = useProjectList({ page: 1, limit: 100 });
  const productsQuery = useProductList({ page: 1, limit: 100 });
  const projects = useMemo(() => projectsQuery.data?.items ?? [], [projectsQuery.data?.items]);
  const products = useMemo(() => productsQuery.data?.items ?? [], [productsQuery.data?.items]);
  const stats = useMemo(() => getStats(projects, products), [products, projects]);
  const projectStatuses = useMemo(() => getProjectStatuses(projects), [projects]);
  const monthlyRequests = useMemo(() => getMonthlyRequests(projects), [projects]);
  const activities = useMemo(() => getRecentActivities(projects), [projects]);
  const uploadedModels = useMemo(() => getUploadedModels(products), [products]);

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <AdminSidebar activeLabel="Admin Dashboard" />

        <section className="admin-main">
          <AdminNavbar activeLabel="Admin Dashboard" />
          <div className="admin-content">
            <div className="admin-page-heading">
              <h2>Admin Dashboard</h2>
              <p>Overview of FurniSpace operations and metrics</p>
            </div>

            <section className="admin-stat-layer-grid">
              {stats.map(({ title, description, icon: LayerIcon, tone, metrics }) => (
                <article key={title} className="admin-stat-layer-card">
                  <div className="admin-stat-layer-heading">
                    <div>
                      <h3>{title}</h3>
                      <p>{description}</p>
                    </div>
                    <div className={`admin-stat-icon admin-tone-${tone}`}>
                      <LayerIcon size={22} />
                    </div>
                  </div>

                  <div className="admin-stat-metric-list">
                    {metrics.map(({ label, value, delta, icon: Icon, tone: metricTone }) => (
                      <div key={label} className="admin-stat-metric">
                        <div className={`admin-stat-metric-icon admin-tone-${metricTone}`}>
                          <Icon size={18} />
                        </div>
                        <div className="admin-stat-copy">
                          <p>{label}</p>
                          <strong>{value}</strong>
                        </div>
                        {delta ? (
                          <span className="admin-stat-delta">
                            <IconClipboardCheck size={14} />
                            {delta}
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </section>

            <section className="admin-two-column">
              <DashboardCard title="Project Status Distribution">
                <div className="admin-status-list">
                  {projectStatuses.map((item) => (
                    <div key={item.label} className="admin-status-row">
                      <div>
                        <span className={`admin-status-dot admin-tone-${item.tone}`} />
                        <span>{item.label}</span>
                      </div>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </DashboardCard>

              <DashboardCard title="Monthly Project Requests">
                <div className="admin-request-chart">
                  {monthlyRequests.map(([month, value]) => (
                    <div key={month} className="admin-request-item">
                      <span>{value}</span>
                      <div />
                      <span>{month}</span>
                    </div>
                  ))}
                </div>
              </DashboardCard>
            </section>

            <section className="admin-two-column">
              <DashboardCard title="Monthly Revenue Trend">
                <div className="admin-revenue-chart">
                  <svg viewBox="0 0 520 210" role="img" aria-label="Monthly revenue trend" />
                </div>
              </DashboardCard>

              <DashboardCard title="Recent Activities">
                <div className="admin-activity-list">
                  {activities.map((activity) => (
                    <div key={activity.title} className="admin-activity-row">
                      <div>
                        <p>{activity.title}</p>
                        <span>{activity.detail}</span>
                      </div>
                      <strong className={`admin-badge admin-badge-${activity.tone}`}>{activity.status}</strong>
                    </div>
                  ))}
                </div>
              </DashboardCard>
            </section>

            <section className="admin-card admin-model-card">
              <h3>Latest Uploaded 3D Models</h3>
              <div className="admin-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Model Name</th>
                      <th>Version</th>
                      <th>Uploaded By</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadedModels.map(([name, version, author, date]) => (
                      <tr key={name}>
                        <td>{name}</td>
                        <td>
                          <span className="admin-version">{version}</span>
                        </td>
                        <td>{author}</td>
                        <td>{date}</td>
                      </tr>
                    ))}
                    {!productsQuery.isLoading && uploadedModels.length === 0 ? (
                      <tr>
                        <td colSpan={4}></td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function getStats(projects: ProjectListItemDto[], products: ProductListItemDto[]) {
  const activeProjects = projects.filter((project) => activeStatuses.includes(project.status)).length;
  const countStatus = (status: ProjectStatus) => projects.filter((project) => project.status === status).length;

  return [
    {
      title: 'Project',
      description: 'Pipeline and catalog coverage',
      icon: IconBriefcase,
      tone: 'gold',
      metrics: [
        { label: 'Active Projects', value: String(activeProjects), delta: '', icon: IconBriefcase, tone: 'gold' },
        { label: 'Total Products', value: String(products.length), delta: '', icon: IconCube, tone: 'blue' },
      ],
    },
    {
      title: 'Revenue',
      description: 'Monthly commercial performance',
      icon: IconChartLine,
      tone: 'green',
      metrics: [{ label: 'Revenue This Month', value: '', delta: '', icon: IconChartLine, tone: 'green' }],
    },
    {
      title: 'Order',
      description: 'Confirmed and fulfillment status',
      icon: IconShoppingCartCheck,
      tone: 'dark-green',
      metrics: [
        { label: 'Orders Confirmed', value: String(countStatus('ORDER_CONFIRMED')), delta: '', icon: IconShoppingCartCheck, tone: 'dark-green' },
        { label: 'In Production', value: String(countStatus('IN_PRODUCTION')), delta: '', icon: IconBuildingFactory, tone: 'amber' },
        { label: 'Ready For Delivery', value: String(countStatus('READY_FOR_DELIVERY')), delta: '', icon: IconTruckDelivery, tone: 'cyan' },
      ],
    },
  ];
}

function getProjectStatuses(projects: ProjectListItemDto[]) {
  const counts = projects.reduce<Record<string, number>>((lookup, project) => {
    lookup[project.status] = (lookup[project.status] ?? 0) + 1;
    return lookup;
  }, {});

  return Object.entries(counts).map(([status, value], index) => ({
    label: formatEnumLabel(status),
    value,
    tone: statusTones[index % statusTones.length],
  }));
}

function getMonthlyRequests(projects: ProjectListItemDto[]) {
  const monthCounts = new Map<string, number>();

  projects.forEach((project) => {
    const month = new Intl.DateTimeFormat('en', { month: 'short' }).format(new Date(project.submittedAt));
    monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1);
  });

  return Array.from(monthCounts.entries()).slice(-6);
}

function getRecentActivities(projects: ProjectListItemDto[]) {
  return [...projects]
    .sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime())
    .slice(0, 5)
    .map((project) => ({
      title: project.projectName,
      detail: `${project.projectCode} - ${formatDate(project.submittedAt)}`,
      status: project.status,
      tone: project.status === 'REJECTED' ? 'neutral' : 'success',
    }));
}

function getUploadedModels(products: ProductListItemDto[]) {
  return products
    .filter((product) => product.defaultVersion?.files.some((file) => file.fileType === 'MODEL_3D'))
    .slice(0, 5)
    .map((product) => [
      product.productName,
      product.defaultVersion?.versionName ?? '',
      '',
      '',
    ] as const);
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function DashboardCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="admin-card">
      <h3>{title}</h3>
      {children}
    </article>
  );
}

export default AdminDashbroad;
