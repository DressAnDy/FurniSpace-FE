import { useMemo, useState } from 'react';
import {
  IconArrowRight,
  IconChecklist,
  IconEditCircle,
  IconFileUpload,
  IconFlag,
  IconLayoutDashboard,
  IconPencilCog,
  IconRefresh,
  IconStack2,
  IconUserCheck,
  type Icon,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import { DesignerLayout } from '@/features/DesignerPages/designercomponents';
import { useCurrentUser } from '@/services/queries';

import './DesignerDashbroad.css';

type KpiItem = {
  description: string;
  icon: Icon;
  label: string;
  note: string;
  path: string;
  tone: 'amber' | 'blue' | 'green' | 'red' | 'neutral';
  value: string;
};

type WorkGroup = 'Project Preparation' | 'Proposal Work' | 'Customization Work';

type WorkItem = {
  action: string;
  due: string;
  group: WorkGroup;
  lastUpdated: string;
  path: string;
  priority: 'High' | 'Medium' | 'Low';
  project: string;
  state: string;
  target: string;
  type: string;
  warning: string;
};

const workGroups: WorkGroup[] = ['Project Preparation', 'Proposal Work', 'Customization Work'];

// Mocked until designer dashboard aggregation endpoints are available.
const kpis: KpiItem[] = [
  { description: 'Projects assigned to current designer', icon: IconLayoutDashboard, label: 'Assigned Projects', note: '+2 this week', path: '/designer/assigned-projects', tone: 'blue', value: '7' },
  { description: 'Assigned but not opened yet', icon: IconUserCheck, label: 'New Assignments', note: '1 urgent', path: '/designer/assigned-projects', tone: 'amber', value: '3' },
  { description: 'Projects still needing measurement or files', icon: IconFileUpload, label: 'Measurement Required', note: '2 due today', path: '/designer/schedules', tone: 'red', value: '4' },
  { description: 'Proposal drafts not yet published', icon: IconStack2, label: 'Draft Proposals', note: '3 missing scene data', path: '/designer/assigned-projects', tone: 'neutral', value: '6' },
  { description: 'Customer requested proposal revisions', icon: IconEditCircle, label: 'Revision Requests', note: '2 open', path: '/designer/assigned-projects', tone: 'amber', value: '3' },
  { description: 'Customization requests needing design review', icon: IconPencilCog, label: 'Customization Reviews', note: '1 production issue', path: '/designer/assigned-projects', tone: 'blue', value: '5' },
  { description: 'Proposals passing checks and ready to publish', icon: IconChecklist, label: 'Ready to Publish', note: '2 waiting', path: '/designer/assigned-projects', tone: 'green', value: '2' },
  { description: 'Design tasks past due date', icon: IconFlag, label: 'Overdue Design Tasks', note: '3 high priority', path: '/designer/assigned-projects', tone: 'red', value: '5' },
];

const workQueue: WorkItem[] = [
  { action: 'Open project brief', due: 'Today 11:00', group: 'Project Preparation', lastUpdated: '28m ago', path: '/designer/assigned-projects', priority: 'High', project: 'PRJ-2026-184 Bean & Brew', state: 'Assigned', target: 'New assignment', type: 'Assignment', warning: 'Not opened' },
  { action: 'Upload files', due: 'Today 16:30', group: 'Project Preparation', lastUpdated: '1h ago', path: '/designer/schedules', priority: 'High', project: 'PRJ-2026-181 Luma Cafe', state: 'Measurement scheduled', target: 'Site measurement', type: 'Measurement', warning: 'Files missing' },
  { action: 'Verify space', due: 'Tomorrow', group: 'Project Preparation', lastUpdated: 'Yesterday', path: '/designer/assigned-projects', priority: 'Medium', project: 'PRJ-2026-180 Atelier Home', state: 'Files uploaded', target: 'Ground floor', type: 'Space verification', warning: 'Pending check' },
  { action: 'Create first proposal', due: 'Today', group: 'Proposal Work', lastUpdated: '45m ago', path: '/designer/assigned-projects', priority: 'High', project: 'PRJ-2026-176 Nova Work Lounge', state: 'Space verified', target: 'Initial proposal', type: 'Proposal', warning: 'No proposal yet' },
  { action: 'Open Room Planner', due: 'Tomorrow', group: 'Proposal Work', lastUpdated: '2h ago', path: '/designer/assigned-projects', priority: 'Medium', project: 'PRJ-2026-174 Urban Threads', state: 'Draft proposal', target: 'Scene v1', type: 'Room Planner', warning: 'Missing preview' },
  { action: 'Publish proposal', due: '1 day overdue', group: 'Proposal Work', lastUpdated: 'Yesterday', path: '/designer/assigned-projects', priority: 'High', project: 'PRJ-2026-169 Green Bowl', state: 'Ready for review', target: 'Proposal v2', type: 'Proposal', warning: 'Ready not published' },
  { action: 'Review request', due: 'Today', group: 'Customization Work', lastUpdated: '34m ago', path: '/designer/assigned-projects', priority: 'High', project: 'PRJ-2026-166 Studio Nine', state: 'Designer review pending', target: 'CUS-2048', type: 'Customization', warning: 'Production issue returned' },
  { action: 'Apply accepted version', due: 'Tomorrow', group: 'Customization Work', lastUpdated: '3h ago', path: '/designer/assigned-projects', priority: 'Medium', project: 'PRJ-2026-160 Oak & Steel', state: 'Customer accepted', target: 'CUS-2032', type: 'Customization', warning: 'Not applied to scene' },
];

function priorityClass(priority: WorkItem['priority']) {
  return `designer-ops-priority designer-ops-priority-${priority.toLowerCase()}`;
}

export function DesignerDashbroad() {
  const [activeGroup, setActiveGroup] = useState<WorkGroup>('Project Preparation');
  const currentUserQuery = useCurrentUser();
  const now = useMemo(() => new Date(), []);
  const displayDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(now);
  const refreshTime = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(now);
  const designerName = currentUserQuery.data?.fullName ?? 'Designer';
  const activeWork = workQueue.filter((item) => item.group === activeGroup);

  return (
    <DesignerLayout activeLabel="Dashboard">
      <div className="designer-dashboard-page">
        <section className="designer-ops-header">
          <div>
            <span>Designer Workspace</span>
            <h2>Designer Dashboard</h2>
            <p>Assigned projects, design progress, Room Planner, and customization work</p>
          </div>
          <aside>
            <strong>{designerName}</strong>
            <p>{displayDate}</p>
            <small><IconRefresh size={14} /> Refreshed {refreshTime}</small>
          </aside>
        </section>

        <section className="designer-ops-filter-bar" aria-label="Designer dashboard filters">
          <label>
            <span>Date range</span>
            <select defaultValue="this-week">
              <option value="today">Today</option>
              <option value="this-week">This week</option>
              <option value="this-month">This month</option>
            </select>
          </label>
          <label>
            <span>Project filter</span>
            <select defaultValue="assigned">
              <option value="assigned">My assigned projects</option>
              <option value="overdue">Overdue / at risk</option>
              <option value="customization">Customization work</option>
            </select>
          </label>
          <Link className="designer-ops-primary-action" to="/designer/assigned-projects">
            Open Assigned Projects <IconArrowRight size={16} />
          </Link>
        </section>

        <section className="designer-ops-kpi-grid">
          {kpis.slice(0, 6).map(({ description, icon: KpiIcon, label, note, path, tone, value }) => (
            <Link className={`designer-ops-kpi designer-ops-kpi-${tone}`} key={label} title={description} to={path}>
              <span><KpiIcon size={19} /></span>
              <div>
                <small>{label}</small>
                <strong>{value}</strong>
                <p>{note}</p>
              </div>
            </Link>
          ))}
        </section>

        <section className="designer-ops-main-grid designer-ops-main-grid-single">
          <article className="designer-card designer-ops-work-queue">
            <header className="designer-ops-section-header">
              <div>
                <h3>Main Design Work Queue</h3>
                <p>Prioritized work by preparation, proposal, and customization phase.</p>
              </div>
            </header>
            <div className="designer-ops-tabs" role="tablist" aria-label="Design work groups">
              {workGroups.map((group) => (
                <button aria-selected={activeGroup === group} key={group} role="tab" type="button" onClick={() => setActiveGroup(group)}>
                  {group}
                </button>
              ))}
            </div>
            <div className="designer-ops-work-table">
              <div className="designer-ops-work-head">
                <span>Priority</span><span>Project</span><span>Work type</span><span>Target</span><span>State</span><span>Updated</span><span>Due</span><span>Warning</span><span />
              </div>
              {activeWork.map((item) => (
                <div className="designer-ops-work-row" key={`${item.project}-${item.action}`}>
                  <span className={priorityClass(item.priority)}>{item.priority}</span>
                  <strong>{item.project}</strong>
                  <span>{item.type}</span>
                  <span>{item.target}</span>
                  <span>{item.state}</span>
                  <span>{item.lastUpdated}</span>
                  <span>{item.due}</span>
                  <em>{item.warning}</em>
                  <Link to={item.path}>{item.action}</Link>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </DesignerLayout>
  );
}
