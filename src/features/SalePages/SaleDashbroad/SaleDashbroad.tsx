import {
  IconArrowRight,
  IconBox,
  IconClock,
  IconFileText,
  IconPackage,
  IconTrendingUp,
  IconUsers,
} from '@tabler/icons-react';

import { SaleNavbar, SaleSidebar } from '@/features/SalePages/salecomponents';

import './SaleDashbroad.css';

type MetricCard = {
  label: string;
  value: string;
  icon: typeof IconFileText;
  tone: 'document' | 'clock' | 'users' | 'box' | 'trend';
};

type ActivityItem = {
  code: string;
  title: string;
  customer: string;
  status: string;
  date: string;
};

type ScheduleItem = {
  title: string;
  code: string;
  type: string;
  date: string;
  time: string;
};

const metrics: MetricCard[] = [
  { label: 'Total Submitted Requests', value: '24', icon: IconFileText, tone: 'document' },
  { label: 'Needs Information', value: '5', icon: IconClock, tone: 'clock' },
  { label: 'In Consultation', value: '12', icon: IconUsers, tone: 'users' },
  { label: 'Awaiting Designer', value: '7', icon: IconUsers, tone: 'users' },
  { label: 'Quotations Sent', value: '18', icon: IconFileText, tone: 'document' },
  { label: 'Orders Confirmed', value: '9', icon: IconBox, tone: 'box' },
  { label: 'In Production', value: '6', icon: IconTrendingUp, tone: 'trend' },
  { label: 'Delivery Pending', value: '3', icon: IconPackage, tone: 'box' },
];

const activities: ActivityItem[] = [
  { code: 'PRJ-2024-156', title: 'Luxury Cafe Interior', customer: 'Bean & Brew Co.', status: 'In Consultation', date: '2024-06-06' },
  { code: 'PRJ-2024-155', title: 'Fashion Boutique Renovation', customer: 'Chic Style Ltd.', status: 'Quotation Sent', date: '2024-06-05' },
  { code: 'PRJ-2024-154', title: 'Corporate Office Space', customer: 'Tech Innovations Inc.', status: 'Order Confirmed', date: '2024-06-05' },
  { code: 'PRJ-2024-153', title: 'Retail Store Design', customer: 'Urban Trends', status: 'In Production', date: '2024-06-04' },
  { code: 'PRJ-2024-152', title: 'Restaurant Interior', customer: 'Gourmet Bistro', status: 'Need Information', date: '2024-06-04' },
];

const schedules: ScheduleItem[] = [
  { title: 'Site Measurement - Cafe Project', code: 'PRJ-2024-156', type: 'MEASUREMENT', date: '2024-06-07', time: '10:00 AM' },
  { title: 'Design Review Meeting', code: 'PRJ-2024-150', type: 'DESIGN_REVIEW', date: '2024-06-08', time: '2:00 PM' },
  { title: 'Client Consultation', code: 'PRJ-2024-149', type: 'CONSULTATION', date: '2024-06-09', time: '11:00 AM' },
];

const filters = ['Submitted (24)', 'In Consultation (12)', 'Need Information (5)', 'Awaiting Designer (7)', 'Quotation Sent (18)', 'Order Confirmed (9)', 'In Production (6)'];

function getStatusClass(status: string) {
  if (status === 'Need Information') return 'sale-status-badge sale-status-muted';
  return 'sale-status-badge';
}

export function SaleDashbroad() {
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
            {metrics.map(({ label, value, icon: MetricIcon, tone }) => (
              <article key={label} className="sale-metric-card">
                <div>
                  <p>{label}</p>
                  <strong>{value}</strong>
                </div>
                <span className={`sale-metric-icon sale-metric-icon-${tone}`}>
                  <MetricIcon size={22} />
                </span>
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
                {activities.map((activity) => (
                  <div key={activity.code} className="sale-activity-row">
                    <div className="sale-activity-main">
                      <div className="sale-activity-meta">
                        <span>{activity.code}</span>
                        <span className={getStatusClass(activity.status)}>{activity.status}</span>
                      </div>
                      <h4>{activity.title}</h4>
                      <p>{activity.customer}</p>
                    </div>
                    <div className="sale-activity-action">
                      <span>{activity.date}</span>
                      <IconArrowRight size={16} />
                    </div>
                  </div>
                ))}
              </div>

              <button className="sale-outline-button" type="button">
                View All Projects
              </button>
            </article>

            <article className="sale-card sale-schedules-card">
              <header className="sale-card-header">
                <h3>Upcoming Schedules</h3>
                <p>Your appointments this week</p>
              </header>

              <div className="sale-schedule-list">
                {schedules.map((schedule) => (
                  <div key={`${schedule.code}-${schedule.type}`} className="sale-schedule-item">
                    <div className="sale-schedule-title-row">
                      <h4>{schedule.title}</h4>
                      <span>{schedule.type}</span>
                    </div>
                    <p>{schedule.code}</p>
                    <div className="sale-schedule-time">
                      <span>{schedule.date}</span>
                      <span>{schedule.time}</span>
                    </div>
                  </div>
                ))}
              </div>

              <button className="sale-outline-button" type="button">
                View All Schedules
              </button>
            </article>
          </section>

          <section className="sale-card sale-status-filter-card">
            <header className="sale-card-header">
              <h3>Quick Status Filters</h3>
              <p>View projects by status</p>
            </header>
            <div className="sale-filter-list">
              {filters.map((filter) => (
                <button key={filter} type="button">
                  {filter}
                </button>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
