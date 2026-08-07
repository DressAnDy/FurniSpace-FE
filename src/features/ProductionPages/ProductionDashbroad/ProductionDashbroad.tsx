import { useMemo, useState } from 'react';
import {
  IconAlertTriangle,
  IconArrowRight,
  IconBan,
  IconClock,
  IconClockCog,
  IconRefresh,
  IconTool,
  IconUserCheck,
  type Icon,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import { ProductionLayout } from '@/features/ProductionPages/productioncomponents';
import { useCurrentUser } from '@/services/queries';

import './ProductionDashbroad.css';

type KpiItem = {
  description: string;
  icon: Icon;
  label: string;
  note: string;
  path: string;
  tone: 'amber' | 'blue' | 'green' | 'red' | 'neutral';
  value: string;
};

type QueueTab = 'All Queue' | 'Pending Review' | 'Assigned to Me' | 'In Production' | 'Blocked' | 'Ready to Complete' | 'Completed';

type QueueItem = {
  action: string;
  assigned: string;
  completed: number;
  due: string;
  path: string;
  priority: 'High' | 'Medium' | 'Low';
  project: string;
  request: string;
  risk: string;
  start: string;
  status: string;
  total: number;
  tabs: QueueTab[];
};

const queueTabs: QueueTab[] = ['All Queue', 'Pending Review', 'Assigned to Me', 'In Production', 'Blocked'];

// Mocked until production dashboard aggregation endpoints are available.
const kpis: KpiItem[] = [
  { description: 'Requests waiting for production review', icon: IconClock, label: 'Pending Review', note: '4 older than SLA', path: '/production/requests', tone: 'amber', value: '12' },
  { description: 'Requests primarily assigned to current staff', icon: IconUserCheck, label: 'Assigned to Me', note: '6 active', path: '/production/my-tasks', tone: 'blue', value: '9' },
  { description: 'Production requests currently active', icon: IconClockCog, label: 'In Production', note: '+3 this week', path: '/production/requests', tone: 'neutral', value: '18' },
  { description: 'Item-level execution currently active', icon: IconTool, label: 'Items In Progress', note: '42 units', path: '/production/requests', tone: 'blue', value: '27' },
  { description: 'Items blocked by material or technical issue', icon: IconAlertTriangle, label: 'Blocked Items', note: '3 critical', path: '/production/blocked-issues', tone: 'red', value: '7' },
  { description: 'Unavailable/cancelled item paths needing adjustment', icon: IconBan, label: 'Unavailable Items', note: '2 need Sales adjustment', path: '/production/blocked-issues', tone: 'red', value: '3' },
];

const productionQueue: QueueItem[] = [
  { action: 'Review', assigned: 'Shared queue', completed: 0, due: 'Today 13:00', path: '/production/requests', priority: 'High', project: 'PRJ-2026-184 Bean & Brew', request: 'PROD-2026-090', risk: 'Review overdue', start: '-', status: 'PENDING_REVIEW', tabs: ['All Queue', 'Pending Review'], total: 12 },
  { action: 'Start Production', assigned: 'Minh Tran', completed: 3, due: 'Aug 9', path: '/production/requests', priority: 'Medium', project: 'PRJ-2026-181 Luma Cafe', request: 'PROD-2026-088', risk: 'On track', start: 'Aug 5', status: 'ASSIGNED', tabs: ['All Queue', 'Assigned to Me'], total: 10 },
  { action: 'View Items', assigned: 'Minh Tran', completed: 8, due: 'Tomorrow', path: '/production/requests', priority: 'High', project: 'PRJ-2026-176 Nova Work Lounge', request: 'PROD-2026-084', risk: '2 items due soon', start: 'Aug 3', status: 'IN_PRODUCTION', tabs: ['All Queue', 'Assigned to Me', 'In Production'], total: 16 },
  { action: 'Resolve Blocker', assigned: 'Huy Pham', completed: 5, due: 'Overdue', path: '/production/blocked-issues', priority: 'High', project: 'PRJ-2026-166 Studio Nine', request: 'PROD-2026-080', risk: 'Material unavailable', start: 'Aug 1', status: 'BLOCKED', tabs: ['All Queue', 'Blocked'], total: 15 },
  { action: 'Complete Request', assigned: 'Lan Ho', completed: 14, due: 'Today', path: '/production/requests', priority: 'Medium', project: 'PRJ-2026-160 Oak & Steel', request: 'PROD-2026-076', risk: 'Ready to complete', start: 'Jul 29', status: 'READY_TO_COMPLETE', tabs: ['All Queue', 'Ready to Complete'], total: 14 },
  { action: 'View Delivery', assigned: 'Thanh Le', completed: 18, due: 'Done', path: '/production/ready-for-delivery', priority: 'Low', project: 'PRJ-2026-151 Northline Office', request: 'PROD-2026-070', risk: 'Awaiting delivery', start: 'Jul 24', status: 'COMPLETED', tabs: ['All Queue', 'Completed'], total: 18 },
];

function priorityClass(priority: QueueItem['priority']) {
  return `production-ops-priority production-ops-priority-${priority.toLowerCase()}`;
}

export function ProductionDashbroad() {
  const [activeTab, setActiveTab] = useState<QueueTab>('All Queue');
  const currentUserQuery = useCurrentUser();
  const activeQueue = productionQueue.filter((item) => item.tabs.includes(activeTab));
  const now = useMemo(() => new Date(), []);
  const displayDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(now);
  const refreshTime = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(now);
  const userName = currentUserQuery.data?.fullName ?? 'Production Staff';

  return (
    <ProductionLayout activeLabel="Dashboard" searchPlaceholder="Search production queue...">
      <div className="production-workspace-page production-dashboard-page">
        <section className="production-ops-header">
          <div>
            <span>Production Workspace</span>
            <h2>Production Dashboard</h2>
            <p>Production queue, item execution, blockers, and delivery readiness</p>
          </div>
          <aside>
            <strong>{userName}</strong>
            <p>{displayDate}</p>
            <small><IconRefresh size={14} /> Refreshed {refreshTime}</small>
          </aside>
        </section>

        <section className="production-ops-filter-bar" aria-label="Production dashboard filters">
          <label>
            <span>Date range</span>
            <select defaultValue="this-week">
              <option value="today">Today</option>
              <option value="this-week">This week</option>
              <option value="this-month">This month</option>
            </select>
          </label>
          <label>
            <span>Queue scope</span>
            <select defaultValue="all">
              <option value="all">All queue</option>
              <option value="assigned">Assigned to me</option>
            </select>
          </label>
          <Link className="production-ops-primary-action" to="/production/requests">
            Open Production Queue <IconArrowRight size={16} />
          </Link>
        </section>

        <section className="production-ops-kpi-grid">
          {kpis.map(({ description, icon: KpiIcon, label, note, path, tone, value }) => (
            <Link className={`production-ops-kpi production-ops-kpi-${tone}`} key={label} title={description} to={path}>
              <span><KpiIcon size={19} /></span>
              <div>
                <small>{label}</small>
                <strong>{value}</strong>
                <p>{note}</p>
              </div>
            </Link>
          ))}
        </section>

        <section className="production-ops-main-grid production-ops-main-grid-single">
          <article className="production-workspace-card production-ops-queue">
            <header className="production-ops-section-header">
              <div>
                <h3>Production Queue</h3>
                <p>Shared queue visibility with assignment as the responsible owner.</p>
              </div>
            </header>
            <div className="production-ops-tabs" role="tablist" aria-label="Production queue filters">
              {queueTabs.map((tab) => (
                <button aria-selected={activeTab === tab} key={tab} role="tab" type="button" onClick={() => setActiveTab(tab)}>
                  {tab}
                </button>
              ))}
            </div>
            <div className="production-ops-queue-table">
              <div className="production-ops-queue-head">
                <span>Priority</span><span>Request</span><span>Project</span><span>Items</span><span>Completed</span><span>Assigned</span><span>Status</span><span>Start</span><span>Due</span><span>Risk</span><span />
              </div>
              {activeQueue.map((item) => (
                <div className="production-ops-queue-row" key={item.request}>
                  <span className={priorityClass(item.priority)}>{item.priority}</span>
                  <strong>{item.request}</strong>
                  <span>{item.project}</span>
                  <span>{item.total}</span>
                  <span>{item.completed}/{item.total}</span>
                  <span>{item.assigned}</span>
                  <em>{item.status}</em>
                  <span>{item.start}</span>
                  <span>{item.due}</span>
                  <span>{item.risk}</span>
                  <Link to={item.path}>{item.action}</Link>
                </div>
              ))}
            </div>
          </article>

        </section>
      </div>
    </ProductionLayout>
  );
}
