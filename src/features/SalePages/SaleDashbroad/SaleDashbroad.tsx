import { useMemo, useState } from 'react';
import {
  IconArrowRight,
  IconCreditCard,
  IconFileInvoice,
  IconFilter,
  IconFolderOpen,
  IconMessageCircle,
  IconProgressCheck,
  IconRefresh,
  IconShieldExclamation,
  IconUserCheck,
  type Icon,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import { SaleNavbar, SaleSidebar } from '@/features/SalePages/salecomponents';
import { useCurrentUser } from '@/services/queries';

import './SaleDashbroad.css';

type KpiItem = {
  change: string;
  description: string;
  icon: Icon;
  label: string;
  path: string;
  tone: 'amber' | 'blue' | 'green' | 'red' | 'neutral';
  value: string;
};

type QueueGroup = 'Intake' | 'Proposal and Quotation' | 'Payment and Production' | 'Delivery and Completion';

type QueueItem = {
  action: string;
  assignee: string;
  customer: string;
  due: string;
  group: QueueGroup;
  path: string;
  phase: string;
  priority: 'High' | 'Medium' | 'Low';
  project: string;
  status: string;
};

const queueGroups: QueueGroup[] = ['Intake', 'Proposal and Quotation', 'Payment and Production', 'Delivery and Completion'];

// Mocked until sales dashboard aggregation endpoints are available.
const kpis: KpiItem[] = [
  { change: '5 overdue', description: 'Requests not reviewed within SLA', icon: IconFolderOpen, label: 'New Project Requests', path: '/sales/project-requests', tone: 'amber', value: '24' },
  { change: '+8 this week', description: 'Assigned projects in active coordination', icon: IconProgressCheck, label: 'Active Projects', path: '/sales/assigned-projects', tone: 'blue', value: '75' },
  { change: '12 need reply', description: 'Information, schedule, or payment waiting on customer', icon: IconMessageCircle, label: 'Waiting for Customer', path: '/sales/assigned-projects', tone: 'neutral', value: '18' },
  { change: '7 designer tasks', description: 'Designer or production action needed', icon: IconUserCheck, label: 'Waiting for Internal Team', path: '/sales/assigned-projects', tone: 'neutral', value: '21' },
  { change: '$48.2k sent', description: 'Quotations sent but not accepted/rejected', icon: IconFileInvoice, label: 'Quotations Pending Decision', path: '/sales/quotations', tone: 'amber', value: '14' },
  { change: '6 due soon', description: 'Start fee, deposit, or remaining payment follow-up', icon: IconCreditCard, label: 'Payments Requiring Follow-up', path: '/sales/orders', tone: 'red', value: '11' },
  { change: '3 critical', description: 'Overdue, blocked, or missing required action', icon: IconShieldExclamation, label: 'At-Risk Projects', path: '/sales/assigned-projects', tone: 'red', value: '9' },
];

const actionQueue: QueueItem[] = [
  { action: 'Review request', assignee: 'Mai Nguyen', customer: 'Bean & Brew Co.', due: '2h overdue', group: 'Intake', path: '/sales/project-requests', phase: 'Request intake', priority: 'High', project: 'PRJ-2026-184 Bean & Brew', status: 'SUBMITTED' },
  { action: 'Request missing business hours', assignee: 'Mai Nguyen', customer: 'Luma Cafe', due: 'Today 15:00', group: 'Intake', path: '/sales/project-requests', phase: 'Information check', priority: 'Medium', project: 'PRJ-2026-181 Luma Cafe', status: 'NEED_BASIC_INFORMATION' },
  { action: 'Create start fee', assignee: 'Quang Vo', customer: 'Atelier Home', due: 'Today', group: 'Intake', path: '/sales/assigned-projects', phase: 'Consultation', priority: 'High', project: 'PRJ-2026-180 Atelier Home', status: 'SPACE_VERIFIED' },
  { action: 'Send quotation', assignee: 'Nhi Pham', customer: 'Nova Works', due: 'Tomorrow', group: 'Proposal and Quotation', path: '/sales/quotations', phase: 'Quotation draft', priority: 'High', project: 'PRJ-2026-176 Nova Work Lounge', status: 'DRAFT' },
  { action: 'Follow proposal revision', assignee: 'Mai Nguyen', customer: 'Urban Threads', due: 'Today 17:30', group: 'Proposal and Quotation', path: '/sales/assigned-projects', phase: 'Proposal consulting', priority: 'Medium', project: 'PRJ-2026-174 Urban Threads', status: 'REVISION_REQUESTED' },
  { action: 'Create production request', assignee: 'Khoa Le', customer: 'Green Bowl', due: '1 day overdue', group: 'Payment and Production', path: '/sales/orders', phase: 'Deposit paid', priority: 'High', project: 'PRJ-2026-169 Green Bowl', status: 'DEPOSIT_PAID' },
  { action: 'Coordinate adjustment', assignee: 'Nhi Pham', customer: 'Studio Nine', due: 'Today', group: 'Payment and Production', path: '/sales/orders', phase: 'Production blocked', priority: 'High', project: 'PRJ-2026-166 Studio Nine', status: 'UNAVAILABLE_ITEM' },
  { action: 'Create delivery schedule', assignee: 'Mai Nguyen', customer: 'Oak & Steel', due: 'Tomorrow', group: 'Delivery and Completion', path: '/sales/tracking', phase: 'Ready for delivery', priority: 'Medium', project: 'PRJ-2026-160 Oak & Steel', status: 'READY_FOR_DELIVERY' },
  { action: 'Prepare remaining payment', assignee: 'Quang Vo', customer: 'Northline Office', due: '2 days overdue', group: 'Delivery and Completion', path: '/sales/orders', phase: 'Delivered', priority: 'High', project: 'PRJ-2026-151 Northline Office', status: 'DELIVERED' },
];

function getPriorityClass(priority: QueueItem['priority']) {
  return `sales-ops-priority sales-ops-priority-${priority.toLowerCase()}`;
}

export function SaleDashbroad() {
  const [activeGroup, setActiveGroup] = useState<QueueGroup>('Intake');
  const currentUserQuery = useCurrentUser();
  const now = useMemo(() => new Date(), []);
  const displayedDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(now);
  const refreshTime = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(now);
  const activeQueue = actionQueue.filter((item) => item.group === activeGroup);
  const userName = currentUserQuery.data?.fullName ?? 'Sales Staff';

  return (
    <div className="sale-dashboard-shell">
      <SaleSidebar activeLabel="Dashboard" />

      <div className="sale-dashboard-content">
        <SaleNavbar />

        <main className="sale-dashboard-main sale-dashboard-scrollbar">
          <section className="sales-ops-header">
            <div>
              <span>Sales Workspace</span>
              <h2>Sales Dashboard</h2>
              <p>Project coordination, commercial follow-up, and operational priorities</p>
            </div>
            <div className="sales-ops-header-side">
              <p>{userName}</p>
              <strong>{displayedDate}</strong>
              <small><IconRefresh size={14} /> Refreshed {refreshTime}</small>
            </div>
          </section>

          <section className="sales-ops-filter-bar" aria-label="Sales dashboard filters">
            <label>
              <span>Date range</span>
              <select defaultValue="this-week">
                <option value="today">Today</option>
                <option value="this-week">This week</option>
                <option value="this-month">This month</option>
              </select>
            </label>
            <label>
              <span>Scope</span>
              <select defaultValue="my-projects">
                <option value="my-projects">My assigned projects</option>
                <option value="team">Team overview</option>
              </select>
            </label>
            <Link className="sales-ops-primary-action" to="/sales/project-requests">
              Review Project Requests
              <IconArrowRight size={16} />
            </Link>
          </section>

          <section className="sales-ops-kpi-grid">
            {kpis.map(({ change, description, icon: KpiIcon, label, path, tone, value }) => (
              <Link className={`sales-ops-kpi sales-ops-kpi-${tone}`} key={label} title={description} to={path}>
                <span><KpiIcon size={19} /></span>
                <div>
                  <small>{label}</small>
                  <strong>{value}</strong>
                  <p>{change}</p>
                </div>
              </Link>
            ))}
          </section>

          <section className="sales-ops-main-grid sales-ops-main-grid-single">
            <article className="sale-card sales-ops-action-queue">
              <header className="sales-ops-section-header">
                <div>
                  <h3>Main Action Queue</h3>
                  <p>Prioritized work grouped by business phase.</p>
                </div>
                <IconFilter size={20} />
              </header>
              <div className="sales-ops-tabs" role="tablist" aria-label="Action queue groups">
                {queueGroups.map((group) => (
                  <button
                    aria-selected={activeGroup === group}
                    key={group}
                    role="tab"
                    type="button"
                    onClick={() => setActiveGroup(group)}
                  >
                    {group}
                  </button>
                ))}
              </div>
              <div className="sales-ops-queue-table">
                <div className="sales-ops-queue-head">
                  <span>Priority</span>
                  <span>Project</span>
                  <span>Customer</span>
                  <span>Phase</span>
                  <span>Action</span>
                  <span>Due</span>
                  <span>Status</span>
                  <span />
                </div>
                {activeQueue.map((item) => (
                  <div className="sales-ops-queue-row" key={`${item.project}-${item.action}`}>
                    <span className={getPriorityClass(item.priority)}>{item.priority}</span>
                    <strong>{item.project}</strong>
                    <span>{item.customer}</span>
                    <span>{item.phase}</span>
                    <span>{item.action}</span>
                    <span>{item.due}</span>
                    <em>{item.status}</em>
                    <Link to={item.path}>Open</Link>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}
