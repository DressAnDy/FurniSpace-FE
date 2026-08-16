import { useEffect, useMemo, useRef, useState } from 'react';
import {
  IconArrowRight,
  IconChecklist,
  IconChevronRight,
  IconEditCircle,
  IconFileUpload,
  IconFilter,
  IconFlag,
  IconRefresh,
  IconX,
  type Icon,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import { DesignerLayout } from '@/features/DesignerPages/designercomponents';
import type {
  DashboardDateRange,
  DashboardDueBucket,
  DashboardPriority,
  DashboardQueueGroup,
  DashboardQueueItemDto,
  DesignerDashboardKpisDto,
} from '@/services/api/dashboard';
import {
  getDashboardServiceResultMessage,
  useDesignerDashboardKpis,
  useDesignerWorkQueue,
} from '@/services/queries';

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

const ALL_PRIORITIES = 'All priorities';
const priorityOptions = [ALL_PRIORITIES, 'HIGH', 'MEDIUM', 'LOW'];
const DEFAULT_DESIGNER_GROUPS: DashboardQueueGroup[] = ['Design'];

export function DesignerDashbroad() {
  const [activeGroup, setActiveGroup] = useState<DashboardQueueGroup>('Design');
  const [dateRange, setDateRange] = useState<DateRangeKey>('this-week');
  const [projectFilter, setProjectFilter] = useState<ProjectFilterKey>('assigned');
  const [priorityFilter, setPriorityFilter] = useState(ALL_PRIORITIES);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);

  const apiDateRange = toApiDateRange(dateRange);
  const apiPriority = priorityFilter === ALL_PRIORITIES ? null : (priorityFilter as DashboardPriority);
  const queueQuery = useDesignerWorkQueue({
    scope: 'mine',
    group: activeGroup,
    dateRange: apiDateRange,
    priority: apiPriority,
    page: 1,
    limit: 20,
  });
  const kpisQuery = useDesignerDashboardKpis({
    scope: 'mine',
    dateRange: apiDateRange,
  });

  const queueItems = useMemo(() => {
    const items = queueQuery.data?.items ?? [];
    if (projectFilter === 'overdue') {
      return items.filter((item) => item.dueBucket === 'OVERDUE' || item.priority === 'HIGH');
    }
    if (projectFilter === 'customization') {
      return items.filter((item) => /custom/i.test(item.phase) || /custom/i.test(item.action) || /custom/i.test(item.group));
    }
    return items;
  }, [projectFilter, queueQuery.data?.items]);

  const countsByGroup = queueQuery.data?.countsByGroup ?? {};
  const workGroups = useMemo(() => {
    const fromApi = Object.keys(countsByGroup);
    return fromApi.length > 0 ? fromApi : DEFAULT_DESIGNER_GROUPS;
  }, [countsByGroup]);
  const visibleKpis = useMemo(
    () => mapDesignerKpis(kpisQuery.data, DATE_RANGE_LABEL[dateRange]),
    [dateRange, kpisQuery.data],
  );
  const refreshTime = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(lastRefreshAt);
  const isLoading = queueQuery.isLoading || kpisQuery.isLoading;
  const loadError = queueQuery.error
    ? getDashboardServiceResultMessage(queueQuery.error)
    : kpisQuery.error
      ? getDashboardServiceResultMessage(kpisQuery.error)
      : null;
  const activeFilterCount = Number(priorityFilter !== ALL_PRIORITIES);
  const hasActiveFilters = activeFilterCount > 0;
  const primaryActionLabel =
    projectFilter === 'customization'
      ? 'Open Customization Work'
      : projectFilter === 'overdue'
        ? 'Open At-Risk Projects'
        : 'Open Assigned Projects';

  useEffect(() => {
    setActiveGroup((current) => {
      if (workGroups.includes(current)) {
        return current;
      }

      return workGroups[0] ?? current;
    });
  }, [workGroups]);

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
  }

  async function handleRefresh() {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await Promise.all([queueQuery.refetch(), kpisQuery.refetch()]);
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
                          <option key={option} value={option}>{option === ALL_PRIORITIES ? option : formatPriorityLabel(option as DashboardPriority)}</option>
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
                    Priority: {formatPriorityLabel(priorityFilter as DashboardPriority)}
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
                  <em>{countsByGroup[group] ?? 0}</em>
                </button>
              ))}
            </div>

            <div className="designer-ops-queue-table">
              <div className="designer-ops-queue-head">
                <span>Project</span>
                <span>Phase</span>
                <span>Warning</span>
                <span className="designer-ops-queue-col-center">Priority</span>
                <span>Action</span>
                <span>Due</span>
                <span className="designer-ops-queue-col-center">Status</span>
                <span />
              </div>
              {isLoading ? <div className="designer-ops-queue-empty">Loading design work queue...</div> : null}
              {loadError ? <div className="designer-ops-queue-empty">{loadError}</div> : null}
              {!isLoading && !loadError && queueItems.length === 0 ? (
                <div className="designer-ops-queue-empty">
                  {hasActiveFilters || dateRange !== 'this-month' || projectFilter !== 'assigned'
                    ? `No work items match ${DATE_RANGE_LABEL[dateRange].toLowerCase()} · ${PROJECT_FILTER_LABEL[projectFilter]}.`
                    : 'No work items in this phase.'}
                </div>
              ) : null}
              {queueItems.map((item) => (
                <div className="designer-ops-queue-row" key={item.id}>
                  <strong>{formatProjectLabel(item)}</strong>
                  <span>{item.phase || '-'}</span>
                  <span>{item.warning || '-'}</span>
                  <span className={priorityClass(item.priority)}>{formatPriorityLabel(item.priority)}</span>
                  <span>{item.action}</span>
                  <span>{formatDueLabel(item.dueAt, item.dueBucket)}</span>
                  <em title={item.status}>{formatStatusLabel(item.status)}</em>
                  <Link
                    aria-label={`Open ${item.projectCode}`}
                    className="designer-ops-queue-open"
                    title="Open"
                    to={resolveDesignerActionPath(item)}
                  >
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

function mapDesignerKpis(data: DesignerDashboardKpisDto | undefined, rangeLabel: string): KpiItem[] {
  return [
    {
      description: 'Projects still needing measurement or files',
      icon: IconFileUpload,
      label: 'Measurement Due',
      note: rangeLabel,
      path: '/designer/schedules',
      tone: 'red',
      value: String(data?.measurementDue ?? 0),
    },
    {
      description: 'Proposal drafts currently in progress',
      icon: IconChecklist,
      label: 'Proposals In Progress',
      note: rangeLabel,
      path: '/designer/assigned-projects',
      tone: 'blue',
      value: String(data?.proposalsInProgress ?? 0),
    },
    {
      description: 'Customer requested proposal revisions',
      icon: IconEditCircle,
      label: 'Revision Requests',
      note: rangeLabel,
      path: '/designer/assigned-projects',
      tone: 'amber',
      value: String(data?.revisionRequested ?? 0),
    },
    {
      description: 'Design tasks past due date',
      icon: IconFlag,
      label: 'Overdue Design Tasks',
      note: rangeLabel,
      path: '/designer/assigned-projects',
      tone: 'red',
      value: String(data?.overdueTasks ?? 0),
    },
  ];
}

function toApiDateRange(dateRange: DateRangeKey): DashboardDateRange {
  if (dateRange === 'today') return 'today';
  if (dateRange === 'this-week') return 'thisWeek';
  return 'thisMonth';
}

function priorityClass(priority: DashboardPriority) {
  return `designer-ops-priority designer-ops-priority-${priority.toLowerCase()}`;
}

function formatProjectLabel(item: DashboardQueueItemDto) {
  return `${item.projectCode} ${item.projectName}`.trim();
}

function formatPriorityLabel(priority: DashboardPriority) {
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

function formatStatusLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDueLabel(dueAt: string | null, dueBucket: DashboardDueBucket | null) {
  if (dueBucket === 'OVERDUE') return 'Overdue';
  if (dueBucket === 'TODAY') return 'Today';
  if (dueBucket === 'THIS_WEEK') return 'This week';
  if (dueBucket === 'LATER') return dueAt ? formatShortDate(dueAt) : 'Later';
  if (dueAt) return formatShortDate(dueAt);
  return '-';
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' }).format(new Date(value));
}

function resolveDesignerActionPath(item: DashboardQueueItemDto) {
  const path = item.actionPath || '';
  const projectMatch = path.match(/^\/projects\/([^/]+)/);

  if (projectMatch?.[1]) {
    return `/designer/assigned-projects/${projectMatch[1]}`;
  }

  if (item.projectId) {
    return `/designer/assigned-projects/${item.projectId}`;
  }

  return path.startsWith('/') ? path : '/designer/assigned-projects';
}
