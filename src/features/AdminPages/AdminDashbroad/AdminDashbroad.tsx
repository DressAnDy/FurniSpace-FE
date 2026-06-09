import type { ReactNode } from 'react';
import { IconBriefcase, IconChartLine, IconCube, IconUsers } from '@tabler/icons-react';

import { AdminNavbar, AdminSidebar } from '../admincomponents';
import './AdminDashbroad.css';

const stats = [
  { label: 'Total Users', value: '1,248', delta: '+12%', icon: IconUsers, tone: 'blue' },
  { label: 'Active Projects', value: '75', delta: '+8%', icon: IconBriefcase, tone: 'gold' },
  { label: 'Total Products', value: '342', delta: '+18', icon: IconCube, tone: 'green' },
  { label: 'Revenue This Month', value: '$245K', delta: '+23%', icon: IconChartLine, tone: 'amber' },
  { label: 'Active Customers', value: '432' },
  { label: 'Sales Consultants', value: '28' },
  { label: 'Designers', value: '15' },
  { label: 'Production Staff', value: '42' },
  { label: 'Quotations Sent', value: '38' },
  { label: 'Orders Confirmed', value: '52' },
  { label: 'In Production', value: '15' },
  { label: 'Ready For Delivery', value: '8' },
];

const projectStatuses = [
  { label: 'Submitted', value: 12, tone: 'amber' },
  { label: 'In Consultation', value: 8, tone: 'blue' },
  { label: 'Proposal Drafting', value: 6, tone: 'violet' },
  { label: 'Waiting Review', value: 10, tone: 'gold' },
  { label: 'In Production', value: 15, tone: 'green' },
  { label: 'Completed', value: 24, tone: 'dark-green' },
];

const monthlyRequests = [
  ['Jan', 12],
  ['Feb', 18],
  ['Mar', 15],
  ['Apr', 22],
  ['May', 28],
  ['Jun', 25],
] as const;

const revenuePoints = [
  ['Jan', '$125K', 38],
  ['Feb', '$152K', 30],
  ['Mar', '$138K', 34],
  ['Apr', '$195K', 18],
  ['May', '$218K', 12],
  ['Jun', '$245K', 6],
] as const;

const activities = [
  { title: 'New project submitted', detail: 'PRJ-2024-156 - 5 min ago', status: 'SUBMITTED', tone: 'neutral' },
  { title: 'Quotation accepted', detail: 'PRJ-2024-142 - 15 min ago', status: 'ACCEPTED', tone: 'success' },
  { title: 'Production completed', detail: 'PRJ-2024-098 - 1 hour ago', status: 'COMPLETED', tone: 'success' },
  { title: 'New 3D model uploaded', detail: 'Chair-V3 - 2 hours ago', status: 'ACTIVE', tone: 'success' },
  { title: 'Order confirmed', detail: 'PRJ-2024-133 - 3 hours ago', status: 'CONFIRMED', tone: 'success' },
];

const uploadedModels = [
  ['Modern Office Chair V3', 'V3.2', 'Designer A', '2024-06-05'],
  ['Conference Table Oak', 'V2.1', 'Designer B', '2024-06-04'],
  ['Lounge Sofa Premium', 'V1.5', 'Designer C', '2024-06-03'],
] as const;

export function AdminDashbroad() {
  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <AdminSidebar activeLabel="Admin Dashboard" />

        <section className="admin-main">
          <AdminNavbar />

          <div className="admin-content">
            <div className="admin-page-heading">
              <h2>Admin Dashboard</h2>
              <p>Overview of FurniSpace operations and metrics</p>
            </div>

            <section className="admin-stat-grid">
              {stats.map(({ label, value, delta, icon: Icon, tone }) => (
                <article key={label} className="admin-stat-card">
                  <div>
                    <p>{label}</p>
                    <strong>{value}</strong>
                    {delta ? <span>+ {delta}</span> : null}
                  </div>
                  {Icon && tone ? (
                    <div className={`admin-stat-icon admin-tone-${tone}`}>
                      <Icon size={22} />
                    </div>
                  ) : null}
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
                  <svg viewBox="0 0 520 210" role="img" aria-label="Monthly revenue trend">
                    <polyline fill="none" points="0,132 104,102 208,118 312,56 416,34 520,0" stroke="#10b981" strokeWidth="4" />
                    {revenuePoints.map(([month, value, y], index) => (
                      <g key={month}>
                        <circle cx={index * 104} cy={y * 1.8} fill="#10b981" r="5" />
                        <text fill="#6b7280" fontSize="12" textAnchor="middle" x={index * 104} y="190">
                          {month}
                        </text>
                        <text fill="#1a1d29" fontSize="12" textAnchor="middle" x={index * 104} y="208">
                          {value}
                        </text>
                      </g>
                    ))}
                  </svg>
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

function DashboardCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="admin-card">
      <h3>{title}</h3>
      {children}
    </article>
  );
}

export default AdminDashbroad;
