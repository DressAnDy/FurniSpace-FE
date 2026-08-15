import { useEffect, useMemo, useRef, useState } from 'react';
import {
  IconArrowRight,
  IconChecklist,
  IconChevronRight,
  IconEditCircle,
  IconFileUpload,
  IconFilter,
  IconFlag,
  IconLayoutDashboard,
  IconPencilCog,
  IconRefresh,
  IconStack2,
  IconUserCheck,
  IconX,
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

type DateRangeKey = 'today' | 'this-week' | 'this-month';
type ProjectFilterKey = 'assigned' | 'overdue' | 'customization';

type WorkGroup = 'Project Preparation' | 'Proposal Work' | 'Customization Work';

type WorkItem = {
  action: string;
  due: string;
  dueBucket: 'today' | 'this-week' | 'later' | 'overdue';
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

const DATE_RANGE_LABEL: Record<DateRangeKey, string> = {
  today: 'Today',
  'this-week': 'This week',
  'this-month': 'This month',
};

const PROJECT_FILTER_LABEL: Record<ProjectFilterKey, string> = {
  assigned: 'My assigned projects',
  overdue: 'Overdue / at risk',
  customization: 'Customization work',
};

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
  { action: 'Open project brief', due: 'Today 11:00', dueBucket: 'today', group: 'Project Preparation', lastUpdated: '28m ago', path: '/designer/assigned-projects', priority: 'High', project: 'PRJ-2026-184 Bean & Brew', state: 'Assigned', target: 'New assignment', type: 'Assignment', warning: 'Not opened' },
  { action: 'Upload files', due: 'Today 16:30', dueBucket: 'today', group: 'Project Preparation', lastUpdated: '1h ago', path: '/designer/schedules', priority: 'High', project: 'PRJ-2026-181 Luma Cafe', state: 'Measurement scheduled', target: 'Site measurement', type: 'Measurement', warning: 'Files missing' },
  { action: 'Verify space', due: 'Tomorrow', dueBucket: 'this-week', group: 'Project Preparation', lastUpdated: 'Yesterday', path: '/designer/assigned-projects', priority: 'Medium', project: 'PRJ-2026-180 Atelier Home', state: 'Files uploaded', target: 'Ground floor', type: 'Space verification', warning: 'Pending check' },
  { action: 'Create first proposal', due: 'Today', dueBucket: 'today', group: 'Proposal Work', lastUpdated: '45m ago', path: '/designer/assigned-projects', priority: 'High', project: 'PRJ-2026-176 Nova Work Lounge', state: 'Space verified', target: 'Initial proposal', type: 'Proposal', warning: 'No proposal yet' },
  { action: 'Open Room Planner', due: 'Tomorrow', dueBucket: 'this-week', group: 'Proposal Work', lastUpdated: '2h ago', path: '/designer/assigned-projects', priority: 'Medium', project: 'PRJ-2026-174 Urban Threads', state: 'Draft proposal', target: 'Scene v1', type: 'Room Planner', warning: 'Missing preview' },
  { action: 'Publish proposal', due: '1 day overdue', dueBucket: 'overdue', group: 'Proposal Work', lastUpdated: 'Yesterday', path: '/designer/assigned-projects', priority: 'High', project: 'PRJ-2026-169 Green Bowl', state: 'Ready for review', target: 'Proposal v2', type: 'Proposal', warning: 'Ready not published' },
  { action: 'Review request', due: 'Today', dueBucket: 'today', group: 'Customization Work', lastUpdated: '34m ago', path: '/designer/assigned-projects', priority: 'High', project: 'PRJ-2026-166 Studio Nine', state: 'Designer review pending', target: 'CUS-2048', type: 'Customization', warning: 'Production issue returned' },
  { action: 'Apply accepted version', due: 'Tomorrow', dueBucket: 'this-week', group: 'Customization Work', lastUpdated: '3h ago', path: '/designer/assigned-projects', priority: 'Medium', project: 'PRJ-2026-160 Oak & Steel', state: 'Customer accepted', target: 'CUS-2032', type: 'Customization', warning: 'Not applied to scene' },
];

const ALL_PRIORITIES = 'All priorities';
const ALL_WORK_TYPES = 'All work types';

const priorityOptions = [ALL_PRIORITIES, 'High', 'Medium', 'Low'];

function priorityClass(priority: WorkItem['priority']) {
  return `designer-ops-priority designer-ops-priority-${priority.toLowerCase()}`;
}

function matchesDateRange(item: WorkItem, dateRange: DateRangeKey) {
  if (dateRange === 'today') {
    return item.dueBucket === 'today' || item.dueBucket === 'overdue';
  }

  if (dateRange === 'this-week') {
    return item.dueBucket === 'today' || item.dueBucket === 'this-week' || item.dueBucket === 'overdue';
  }

  return true;
}

function matchesProjectFilter(item: WorkItem, projectFilter: ProjectFilterKey) {
  if (projectFilter === 'overdue') {
    return item.dueBucket === 'overdue' || item.priority === 'High';
  }

  if (projectFilter === 'customization') {
    return item.group === 'Customization Work';
  }

  return true;
}

function getVisibleKpis(projectFilter: ProjectFilterKey, dateRange: DateRangeKey) {
  const rangeNote = DATE_RANGE_LABEL[dateRange];
  const scopedKpis =
    projectFilter === 'customization'
      ? kpis.filter((item) => ['Customization Reviews', 'Revision Requests', 'Assigned Projects'].includes(item.label))
      : projectFilter === 'overdue'
        ? kpis.filter((item) => ['Overdue Design Tasks', 'Measurement Required', 'New Assignments', 'Assigned Projects'].includes(item.label))
        : kpis.slice(0, 6);

  return scopedKpis.map((item) => ({
    ...item,
    note: `${item.note} · ${rangeNote}`,
  }));
}

export function DesignerDashbroad() {
  const [activeGroup, setActiveGroup] = useState<WorkGroup>('Project Preparation');
  const [dateRange, setDateRange] = useState<DateRangeKey>('this-week');
  const [projectFilter, setProjectFilter] = useState<ProjectFilterKey>('assigned');
  const [priorityFilter, setPriorityFilter] = useState(ALL_PRIORITIES);
  const [typeFilter, setTypeFilter] = useState(ALL_WORK_TYPES);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const currentUserQuery = useCurrentUser();
  const refreshTime = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(lastRefreshAt);
  const scopedQueue = useMemo(
    () =>
      workQueue.filter(
        (item) => matchesDateRange(item, dateRange) && matchesProjectFilter(item, projectFilter),
      ),
    [dateRange, projectFilter],
  );
  const visibleKpis = useMemo(() => getVisibleKpis(projectFilter, dateRange), [dateRange, projectFilter]);
  const groupWork = useMemo(() => scopedQueue.filter((item) => item.group === activeGroup), [activeGroup, scopedQueue]);
  const typeOptions = useMemo(
    () => [ALL_WORK_TYPES, ...Array.from(new Set(groupWork.map((item) => item.type))).sort((first, second) => first.localeCompare(second))],
    [groupWork],
  );
  const activeWork = useMemo(
    () =>
      groupWork.filter((item) => {
        const matchesPriority = priorityFilter === ALL_PRIORITIES || item.priority === priorityFilter;
        const matchesType = typeFilter === ALL_WORK_TYPES || item.type === typeFilter;

        return matchesPriority && matchesType;
      }),
    [groupWork, priorityFilter, typeFilter],
  );
  const activeFilterCount = Number(priorityFilter !== ALL_PRIORITIES) + Number(typeFilter !== ALL_WORK_TYPES);
  const hasActiveFilters = activeFilterCount > 0;
  const primaryActionLabel =
    projectFilter === 'customization'
      ? 'Open Customization Work'
      : projectFilter === 'overdue'
        ? 'Open At-Risk Projects'
        : 'Open Assigned Projects';

  useEffect(() => {
    setTypeFilter(ALL_WORK_TYPES);
  }, [activeGroup, dateRange, projectFilter]);

  useEffect(() => {
    if (projectFilter === 'customization') {
      setActiveGroup((current) => (current === 'Customization Work' ? current : 'Customization Work'));
      return;
    }

    setActiveGroup((current) => {
      if (scopedQueue.some((item) => item.group === current)) {
        return current;
      }

      return workGroups.find((group) => scopedQueue.some((item) => item.group === group)) ?? current;
    });
  }, [projectFilter, scopedQueue]);

  useEffect(() => {
    if (!isFilterOpen) {
      return undefined;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!filterMenuRef.current?.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsFilterOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isFilterOpen]);

  function clearWorkFilters() {
    setPriorityFilter(ALL_PRIORITIES);
    setTypeFilter(ALL_WORK_TYPES);
  }

  async function handleRefresh() {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await currentUserQuery.refetch();
      setLastRefreshAt(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <DesignerLayout activeLabel="Dashboard">
      <div className="designer-dashboard-page">
        <section className="designer-ops-header">
          <div>
            <span>Designer Workspace</span>
            <h2>Designer Dashboard</h2>
            <p>Assigned projects, design progress, Room Planner, and customization work</p>
          </div>
          <div className="designer-ops-header-side">
            <button
              className="designer-ops-refresh-button"
              disabled={isRefreshing}
              type="button"
              onClick={() => void handleRefresh()}
            >
              <IconRefresh className={isRefreshing ? 'is-spinning' : undefined} size={14} />
              {isRefreshing ? 'Refreshing...' : `Refresh · ${refreshTime}`}
            </button>
          </div>
        </section>

        <section className="designer-ops-filter-bar" aria-label="Designer dashboard filters">
          <label>
            <span>Date range</span>
            <select value={dateRange} onChange={(event) => setDateRange(event.target.value as DateRangeKey)}>
              <option value="today">Today</option>
              <option value="this-week">This week</option>
              <option value="this-month">This month</option>
            </select>
          </label>
          <label>
            <span>Project filter</span>
            <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value as ProjectFilterKey)}>
              <option value="assigned">My assigned projects</option>
              <option value="overdue">Overdue / at risk</option>
              <option value="customization">Customization work</option>
            </select>
          </label>
          <Link className="designer-ops-primary-action" to="/designer/assigned-projects">
            {primaryActionLabel} <IconArrowRight size={16} />
          </Link>
        </section>

        <section className="designer-ops-kpi-grid">
          {visibleKpis.map(({ description, icon: KpiIcon, label, note, path, tone, value }) => (
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
                <p>
                  Prioritized work for {DATE_RANGE_LABEL[dateRange].toLowerCase()}
                  {` · ${PROJECT_FILTER_LABEL[projectFilter]}`}.
                </p>
              </div>
              <div className="designer-ops-filter-menu" ref={filterMenuRef}>
                <button
                  aria-expanded={isFilterOpen}
                  aria-haspopup="dialog"
                  aria-label="Filter work queue"
                  className={hasActiveFilters || isFilterOpen ? 'designer-ops-filter-toggle is-active' : 'designer-ops-filter-toggle'}
                  type="button"
                  onClick={() => setIsFilterOpen((open) => !open)}
                >
                  <IconFilter size={18} />
                  {hasActiveFilters ? <span>{activeFilterCount}</span> : null}
                </button>

                {isFilterOpen ? (
                  <div className="designer-ops-filter-panel" role="dialog" aria-label="Work queue filters">
                    <div className="designer-ops-filter-panel-header">
                      <strong>Filter work queue</strong>
                      <button aria-label="Close filters" type="button" onClick={() => setIsFilterOpen(false)}>
                        <IconX size={16} />
                      </button>
                    </div>

                    <label>
                      <span>Priority</span>
                      <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
                        {priorityOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span>Work type</span>
                      <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                        {typeOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </label>

                    <div className="designer-ops-filter-panel-actions">
                      <button disabled={!hasActiveFilters} type="button" onClick={clearWorkFilters}>
                        Clear
                      </button>
                      <button type="button" onClick={() => setIsFilterOpen(false)}>
                        Done
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </header>

            {hasActiveFilters ? (
              <div className="designer-ops-active-filters">
                {priorityFilter !== ALL_PRIORITIES ? (
                  <button type="button" onClick={() => setPriorityFilter(ALL_PRIORITIES)}>
                    Priority: {priorityFilter}
                    <IconX size={14} />
                  </button>
                ) : null}
                {typeFilter !== ALL_WORK_TYPES ? (
                  <button type="button" onClick={() => setTypeFilter(ALL_WORK_TYPES)}>
                    Type: {typeFilter}
                    <IconX size={14} />
                  </button>
                ) : null}
                <button className="designer-ops-clear-all" type="button" onClick={clearWorkFilters}>
                  Clear all
                </button>
              </div>
            ) : null}
            <div className="designer-ops-tabs" role="tablist" aria-label="Design work groups">
              {workGroups.map((group) => (
                <button aria-selected={activeGroup === group} key={group} role="tab" type="button" onClick={() => setActiveGroup(group)}>
                  {group}
                  <em>{scopedQueue.filter((item) => item.group === group).length}</em>
                </button>
              ))}
            </div>
            <div className="designer-ops-queue-table">
              <div className="designer-ops-queue-head">
                <span>Project</span>
                <span>Work type</span>
                <span>Target</span>
                <span className="designer-ops-queue-col-center">Priority</span>
                <span>Action</span>
                <span>Due</span>
                <span className="designer-ops-queue-col-center">Status</span>
                <span />
              </div>
              {activeWork.length === 0 ? (
                <div className="designer-ops-queue-empty">
                  {hasActiveFilters || dateRange !== 'this-month' || projectFilter !== 'assigned'
                    ? `No work items match ${DATE_RANGE_LABEL[dateRange].toLowerCase()} · ${PROJECT_FILTER_LABEL[projectFilter]}.`
                    : 'No work items in this phase.'}
                </div>
              ) : null}
              {activeWork.map((item) => (
                <div className="designer-ops-queue-row" key={`${item.project}-${item.action}`}>
                  <strong>{item.project}</strong>
                  <span>{item.type}</span>
                  <span>{item.target}</span>
                  <span className={priorityClass(item.priority)}>{item.priority}</span>
                  <span>{item.action}</span>
                  <span>{item.due}</span>
                  <em title={item.state}>{item.state}</em>
                  <Link aria-label={`Open ${item.project}`} className="designer-ops-queue-open" title="Open" to={item.path}>
                    <IconChevronRight size={18} stroke={2} />
                  </Link>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </DesignerLayout>
  );
}
