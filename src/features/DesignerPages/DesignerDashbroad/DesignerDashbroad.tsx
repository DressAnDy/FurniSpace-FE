import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  IconArrowRight,
  IconBriefcase,
  IconCalendarEvent,
  IconChecklist,
  IconChevronLeft,
  IconChevronRight,
  IconEditCircle,
  IconFilter,
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
  DashboardQueueItemDto,
  DesignerAssignedProjectKpiItemDto,
  DesignerConfirmedMeasurementItemDto,
  DesignerDashboardKpisDto,
  DesignerProposalConsultingItemDto,
  DesignerRevisionRequestedItemDto,
} from '@/services/api/dashboard';
import {
  getDashboardServiceResultMessage,
  useDesignerAssignedProjectsList,
  useDesignerConfirmedMeasurementsList,
  useDesignerDashboardKpis,
  useDesignerProposalConsultingList,
  useDesignerRevisionRequestedList,
  useDesignerWorkQueue,
} from '@/services/queries';

import './DesignerDashbroad.css';

type DetailPanel = 'queue' | 'confirmed-measurements' | 'proposal-consulting' | 'revision-requested' | 'assigned-projects';

type KpiItem = {
  description: string;
  icon: Icon;
  id: 'confirmed-measurements' | 'proposals' | 'revisions' | 'assigned';
  label: string;
  note: string;
  onSelect?: () => void;
  path?: string;
  selected?: boolean;
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
const DEFAULT_DESIGNER_GROUPS: string[] = ['Design'];
const LIST_PAGE_SIZES = [5, 10, 20];

export function DesignerDashbroad() {
  const [activeGroup, setActiveGroup] = useState<string>('Design');
  const [dateRange, setDateRange] = useState<DateRangeKey>('this-week');
  const [projectFilter, setProjectFilter] = useState<ProjectFilterKey>('assigned');
  const [priorityFilter, setPriorityFilter] = useState(ALL_PRIORITIES);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [detailPanel, setDetailPanel] = useState<DetailPanel>('queue');
  const [measurementsPage, setMeasurementsPage] = useState(1);
  const [measurementsPageSize, setMeasurementsPageSize] = useState(5);
  const [consultingPage, setConsultingPage] = useState(1);
  const [consultingPageSize, setConsultingPageSize] = useState(5);
  const [revisionsPage, setRevisionsPage] = useState(1);
  const [revisionsPageSize, setRevisionsPageSize] = useState(5);
  const [assignedPage, setAssignedPage] = useState(1);
  const [assignedPageSize, setAssignedPageSize] = useState(5);
  const [lastRefreshAt, setLastRefreshAt] = useState(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);

  const apiDateRange = toApiDateRange(dateRange);
  const apiPriority = priorityFilter === ALL_PRIORITIES ? null : (priorityFilter as DashboardPriority);
  const showConfirmedMeasurements = detailPanel === 'confirmed-measurements';
  const showProposalConsulting = detailPanel === 'proposal-consulting';
  const showRevisionRequested = detailPanel === 'revision-requested';
  const showAssignedProjects = detailPanel === 'assigned-projects';
  const showDetailPanel =
    showConfirmedMeasurements || showProposalConsulting || showRevisionRequested || showAssignedProjects;

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
  const confirmedMeasurementsQuery = useDesignerConfirmedMeasurementsList(
    {
      scope: 'mine',
      dateRange: apiDateRange,
      page: measurementsPage,
      limit: measurementsPageSize,
    },
    showConfirmedMeasurements,
  );
  const proposalConsultingQuery = useDesignerProposalConsultingList(
    {
      scope: 'mine',
      dateRange: apiDateRange,
      page: consultingPage,
      limit: consultingPageSize,
    },
    showProposalConsulting,
  );
  const revisionRequestedQuery = useDesignerRevisionRequestedList(
    {
      scope: 'mine',
      dateRange: apiDateRange,
      page: revisionsPage,
      limit: revisionsPageSize,
    },
    showRevisionRequested,
  );
  const assignedProjectsQuery = useDesignerAssignedProjectsList(
    {
      scope: 'mine',
      page: assignedPage,
      limit: assignedPageSize,
    },
    showAssignedProjects,
  );

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

  const countsByGroup = useMemo(() => queueQuery.data?.countsByGroup ?? {}, [queueQuery.data?.countsByGroup]);
  const workGroups = useMemo(() => {
    const fromApi = Object.keys(countsByGroup);
    return fromApi.length > 0 ? fromApi : DEFAULT_DESIGNER_GROUPS;
  }, [countsByGroup]);

  const openDetailPanel = useCallback((panel: Exclude<DetailPanel, 'queue'>) => {
    setDetailPanel((current) => (current === panel ? 'queue' : panel));
    if (panel === 'confirmed-measurements') setMeasurementsPage(1);
    if (panel === 'proposal-consulting') setConsultingPage(1);
    if (panel === 'revision-requested') setRevisionsPage(1);
    if (panel === 'assigned-projects') setAssignedPage(1);
  }, []);

  const visibleKpis = useMemo(
    () => mapDesignerKpis(kpisQuery.data, DATE_RANGE_LABEL[dateRange], detailPanel, openDetailPanel),
    [dateRange, detailPanel, kpisQuery.data, openDetailPanel],
  );

  const refreshTime = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(lastRefreshAt);
  const isLoading = queueQuery.isLoading || kpisQuery.isLoading;
  const loadError = queueQuery.error
    ? getDashboardServiceResultMessage(queueQuery.error)
    : kpisQuery.error
      ? getDashboardServiceResultMessage(kpisQuery.error)
      : null;
  const measurementsError = confirmedMeasurementsQuery.error
    ? getDashboardServiceResultMessage(confirmedMeasurementsQuery.error)
    : null;
  const consultingError = proposalConsultingQuery.error
    ? getDashboardServiceResultMessage(proposalConsultingQuery.error)
    : null;
  const revisionsError = revisionRequestedQuery.error
    ? getDashboardServiceResultMessage(revisionRequestedQuery.error)
    : null;
  const assignedError = assignedProjectsQuery.error
    ? getDashboardServiceResultMessage(assignedProjectsQuery.error)
    : null;
  const activeFilterCount = Number(priorityFilter !== ALL_PRIORITIES);
  const hasActiveFilters = activeFilterCount > 0;
  const primaryActionLabel =
    projectFilter === 'customization'
      ? 'Open Customization Work'
      : projectFilter === 'overdue'
        ? 'Open At-Risk Projects'
        : 'Open Assigned Projects';
  const measurementsTotal = confirmedMeasurementsQuery.data?.total ?? 0;
  const measurementsTotalPages = Math.max(1, Math.ceil(measurementsTotal / measurementsPageSize));
  const consultingTotal = proposalConsultingQuery.data?.total ?? 0;
  const consultingTotalPages = Math.max(1, Math.ceil(consultingTotal / consultingPageSize));
  const revisionsTotal = revisionRequestedQuery.data?.total ?? 0;
  const revisionsTotalPages = Math.max(1, Math.ceil(revisionsTotal / revisionsPageSize));
  const assignedTotal = assignedProjectsQuery.data?.total ?? 0;
  const assignedTotalPages = Math.max(1, Math.ceil(assignedTotal / assignedPageSize));
  const detailTitle = showConfirmedMeasurements
    ? 'Confirmed Measurements'
    : showProposalConsulting
      ? 'Proposal Consulting'
      : showRevisionRequested
        ? 'Revision Requests'
        : showAssignedProjects
          ? 'Assigned Projects'
          : 'Main Design Work Queue';
  const detailSubtitle = showConfirmedMeasurements
    ? `Confirmed measurement schedules for ${DATE_RANGE_LABEL[dateRange].toLowerCase()}.`
    : showProposalConsulting
      ? `Projects in Proposal Consulting for ${DATE_RANGE_LABEL[dateRange].toLowerCase()}.`
      : showRevisionRequested
        ? `Proposals with customer revision requests for ${DATE_RANGE_LABEL[dateRange].toLowerCase()}.`
        : showAssignedProjects
          ? 'Projects currently assigned to you (stock count). Customer customization shown per project.'
          : `Prioritized work for ${DATE_RANGE_LABEL[dateRange].toLowerCase()} · ${PROJECT_FILTER_LABEL[projectFilter]}.`;

  useEffect(() => {
    setActiveGroup((current) => {
      if (workGroups.includes(current)) {
        return current;
      }

      return workGroups[0] ?? current;
    });
  }, [workGroups]);

  useEffect(() => {
    setMeasurementsPage(1);
    setConsultingPage(1);
    setRevisionsPage(1);
  }, [dateRange]);

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
      await Promise.all([
        queueQuery.refetch(),
        kpisQuery.refetch(),
        showConfirmedMeasurements ? confirmedMeasurementsQuery.refetch() : Promise.resolve(),
        showProposalConsulting ? proposalConsultingQuery.refetch() : Promise.resolve(),
        showRevisionRequested ? revisionRequestedQuery.refetch() : Promise.resolve(),
        showAssignedProjects ? assignedProjectsQuery.refetch() : Promise.resolve(),
      ]);
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
            <select
              value={dateRange}
              onChange={(event) => {
                setDateRange(event.target.value as DateRangeKey);
                setMeasurementsPage(1);
                setConsultingPage(1);
                setRevisionsPage(1);
              }}
            >
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
          {visibleKpis.map((kpi) => {
            const content = (
              <>
                <span><kpi.icon size={19} /></span>
                <div>
                  <small>{kpi.label}</small>
                  <strong>{kpi.value}</strong>
                  <p>{kpi.note}</p>
                </div>
              </>
            );

            if (kpi.onSelect) {
              return (
                <button
                  aria-pressed={kpi.selected}
                  className={`designer-ops-kpi designer-ops-kpi-${kpi.tone}${kpi.selected ? ' is-selected' : ''}`}
                  key={kpi.id}
                  title={kpi.description}
                  type="button"
                  onClick={kpi.onSelect}
                >
                  {content}
                </button>
              );
            }

            return (
              <Link
                className={`designer-ops-kpi designer-ops-kpi-${kpi.tone}`}
                key={kpi.id}
                title={kpi.description}
                to={kpi.path ?? '/designer'}
              >
                {content}
              </Link>
            );
          })}
        </section>

        <section className="designer-ops-main-grid designer-ops-main-grid-single">
          <article className="designer-card designer-ops-work-queue">
            <header className="designer-ops-section-header">
              <div>
                <h3>{detailTitle}</h3>
                <p>{detailSubtitle}</p>
              </div>
              {showDetailPanel ? (
                <div className="designer-ops-panel-actions">
                  <Link
                    className="designer-ops-panel-link"
                    to={showConfirmedMeasurements ? '/designer/schedules' : '/designer/assigned-projects'}
                  >
                    {showConfirmedMeasurements ? 'Open schedules' : 'Open projects'}
                  </Link>
                  <button type="button" onClick={() => setDetailPanel('queue')}>
                    Back to queue
                  </button>
                </div>
              ) : (
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
              )}
            </header>

            {showConfirmedMeasurements ? (
              <ConfirmedMeasurementsList
                emptyLabel={`No confirmed measurement schedules for ${DATE_RANGE_LABEL[dateRange].toLowerCase()}.`}
                errorLabel={measurementsError}
                isLoading={confirmedMeasurementsQuery.isLoading}
                items={confirmedMeasurementsQuery.data?.items ?? []}
                page={Math.min(measurementsPage, measurementsTotalPages)}
                pageSize={measurementsPageSize}
                totalItems={measurementsTotal}
                totalPages={measurementsTotalPages}
                onPageChange={setMeasurementsPage}
                onPageSizeChange={(nextSize) => {
                  setMeasurementsPageSize(nextSize);
                  setMeasurementsPage(1);
                }}
              />
            ) : showProposalConsulting ? (
              <ProposalConsultingList
                emptyLabel={`No Proposal Consulting projects for ${DATE_RANGE_LABEL[dateRange].toLowerCase()}.`}
                errorLabel={consultingError}
                isLoading={proposalConsultingQuery.isLoading}
                items={proposalConsultingQuery.data?.items ?? []}
                page={Math.min(consultingPage, consultingTotalPages)}
                pageSize={consultingPageSize}
                totalItems={consultingTotal}
                totalPages={consultingTotalPages}
                onPageChange={setConsultingPage}
                onPageSizeChange={(nextSize) => {
                  setConsultingPageSize(nextSize);
                  setConsultingPage(1);
                }}
              />
            ) : showRevisionRequested ? (
              <RevisionRequestedList
                emptyLabel={`No revision requests for ${DATE_RANGE_LABEL[dateRange].toLowerCase()}.`}
                errorLabel={revisionsError}
                isLoading={revisionRequestedQuery.isLoading}
                items={revisionRequestedQuery.data?.items ?? []}
                page={Math.min(revisionsPage, revisionsTotalPages)}
                pageSize={revisionsPageSize}
                totalItems={revisionsTotal}
                totalPages={revisionsTotalPages}
                onPageChange={setRevisionsPage}
                onPageSizeChange={(nextSize) => {
                  setRevisionsPageSize(nextSize);
                  setRevisionsPage(1);
                }}
              />
            ) : showAssignedProjects ? (
              <AssignedProjectsList
                emptyLabel="No projects are currently assigned to you."
                errorLabel={assignedError}
                isLoading={assignedProjectsQuery.isLoading}
                items={assignedProjectsQuery.data?.items ?? []}
                page={Math.min(assignedPage, assignedTotalPages)}
                pageSize={assignedPageSize}
                totalItems={assignedTotal}
                totalPages={assignedTotalPages}
                onPageChange={setAssignedPage}
                onPageSizeChange={(nextSize) => {
                  setAssignedPageSize(nextSize);
                  setAssignedPage(1);
                }}
              />
            ) : (
              <>
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
              </>
            )}
          </article>
        </section>
      </div>
    </DesignerLayout>
  );
}

function ConfirmedMeasurementsList({
  emptyLabel,
  errorLabel,
  isLoading,
  items,
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: {
  emptyLabel: string;
  errorLabel: string | null;
  isLoading: boolean;
  items: DesignerConfirmedMeasurementItemDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  return (
    <>
      <div className="designer-ops-tabs" role="tablist" aria-label="Confirmed measurements">
        <button aria-selected="true" type="button">
          Confirmed
          <em>{totalItems}</em>
        </button>
      </div>

      <div className="designer-ops-queue-table designer-ops-measurements-table">
        <div className="designer-ops-queue-head designer-ops-measurements-head">
          <span>Project</span>
          <span>Title</span>
          <span>Start</span>
          <span>Location</span>
          <span>Assignee</span>
          <span>Status</span>
          <span />
        </div>
        {isLoading ? <div className="designer-ops-queue-empty">Loading confirmed measurements...</div> : null}
        {errorLabel ? <div className="designer-ops-queue-empty">{errorLabel}</div> : null}
        {!isLoading && !errorLabel && items.length === 0 ? (
          <div className="designer-ops-queue-empty">{emptyLabel}</div>
        ) : null}
        {items.map((item) => (
          <div className="designer-ops-queue-row designer-ops-measurements-row" key={item.scheduleId}>
            <strong title={`${item.projectCode} ${item.projectName}`.trim()}>
              {`${item.projectCode} ${item.projectName}`.trim()}
            </strong>
            <span title={item.title ?? undefined}>{item.title || '-'}</span>
            <span>{formatScheduleDateTime(item.scheduledStart)}</span>
            <span title={item.location ?? undefined}>{item.location || '-'}</span>
            <span title={item.assignedStaffName ?? undefined}>{item.assignedStaffName || '-'}</span>
            <em title={formatStatusLabel(item.status)}>{formatStatusLabel(item.status)}</em>
            <Link
              aria-label={`Open ${item.projectCode}`}
              className="designer-ops-queue-open"
              title="Open project"
              to={`/designer/assigned-projects/${item.projectId}`}
            >
              <IconChevronRight size={18} stroke={2} />
            </Link>
          </div>
        ))}
      </div>

      <KpiListPager
        isLoading={isLoading}
        page={page}
        pageSize={pageSize}
        totalItems={totalItems}
        totalPages={totalPages}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </>
  );
}

function ProposalConsultingList({
  emptyLabel,
  errorLabel,
  isLoading,
  items,
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: {
  emptyLabel: string;
  errorLabel: string | null;
  isLoading: boolean;
  items: DesignerProposalConsultingItemDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  return (
    <>
      <div className="designer-ops-tabs" role="tablist" aria-label="Proposal consulting projects">
        <button aria-selected="true" type="button">
          Proposal Consulting
          <em>{totalItems}</em>
        </button>
      </div>

      <div className="designer-ops-queue-table designer-ops-consulting-table">
        <div className="designer-ops-queue-head designer-ops-consulting-head">
          <span>Project</span>
          <span>Customer</span>
          <span>Designer</span>
          <span>Assigned</span>
          <span>Updated</span>
          <span>Status</span>
          <span />
        </div>
        {isLoading ? <div className="designer-ops-queue-empty">Loading Proposal Consulting projects...</div> : null}
        {errorLabel ? <div className="designer-ops-queue-empty">{errorLabel}</div> : null}
        {!isLoading && !errorLabel && items.length === 0 ? (
          <div className="designer-ops-queue-empty">{emptyLabel}</div>
        ) : null}
        {items.map((item) => (
          <div className="designer-ops-queue-row designer-ops-consulting-row" key={item.projectId}>
            <strong title={`${item.projectCode} ${item.projectName}`.trim()}>
              {`${item.projectCode} ${item.projectName}`.trim()}
            </strong>
            <span title={item.customerName || undefined}>{item.customerName || '-'}</span>
            <span title={item.assignedDesignerName ?? undefined}>{item.assignedDesignerName || '-'}</span>
            <span>{item.designerAssignedAt ? formatScheduleDateTime(item.designerAssignedAt) : '-'}</span>
            <span>{formatScheduleDateTime(item.updatedAt)}</span>
            <em title={formatStatusLabel(item.status)}>{formatStatusLabel(item.status)}</em>
            <Link
              aria-label={`Open ${item.projectCode}`}
              className="designer-ops-queue-open"
              title="Open project"
              to={`/designer/assigned-projects/${item.projectId}`}
            >
              <IconChevronRight size={18} stroke={2} />
            </Link>
          </div>
        ))}
      </div>

      <KpiListPager
        isLoading={isLoading}
        page={page}
        pageSize={pageSize}
        totalItems={totalItems}
        totalPages={totalPages}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </>
  );
}

function RevisionRequestedList({
  emptyLabel,
  errorLabel,
  isLoading,
  items,
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: {
  emptyLabel: string;
  errorLabel: string | null;
  isLoading: boolean;
  items: DesignerRevisionRequestedItemDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  return (
    <>
      <div className="designer-ops-tabs" role="tablist" aria-label="Revision requested proposals">
        <button aria-selected="true" type="button">
          Revision Requests
          <em>{totalItems}</em>
        </button>
      </div>

      <div className="designer-ops-queue-table designer-ops-revisions-table">
        <div className="designer-ops-queue-head designer-ops-revisions-head">
          <span>Proposal</span>
          <span>Project</span>
          <span>Note</span>
          <span>Requested</span>
          <span>Designer</span>
          <span>Status</span>
          <span />
        </div>
        {isLoading ? <div className="designer-ops-queue-empty">Loading revision requests...</div> : null}
        {errorLabel ? <div className="designer-ops-queue-empty">{errorLabel}</div> : null}
        {!isLoading && !errorLabel && items.length === 0 ? (
          <div className="designer-ops-queue-empty">{emptyLabel}</div>
        ) : null}
        {items.map((item) => (
          <div className="designer-ops-queue-row designer-ops-revisions-row" key={item.proposalId}>
            <strong title={item.proposalName ?? undefined}>{item.proposalName || 'Untitled proposal'}</strong>
            <span title={`${item.projectCode} ${item.projectName}`.trim()}>
              {`${item.projectCode} ${item.projectName}`.trim()}
            </span>
            <span title={item.revisionNote ?? undefined}>{item.revisionNote || '-'}</span>
            <span>{formatScheduleDateTime(item.revisionRequestedAt)}</span>
            <span title={item.assignedDesignerName ?? undefined}>{item.assignedDesignerName || '-'}</span>
            <em title={formatStatusLabel(item.status)}>{formatStatusLabel(item.status)}</em>
            <Link
              aria-label={`Open proposal ${item.proposalName || item.proposalId}`}
              className="designer-ops-queue-open"
              title="Open proposal"
              to={`/designer/projects/${item.projectId}/proposals/${item.proposalId}`}
            >
              <IconChevronRight size={18} stroke={2} />
            </Link>
          </div>
        ))}
      </div>

      <KpiListPager
        isLoading={isLoading}
        page={page}
        pageSize={pageSize}
        totalItems={totalItems}
        totalPages={totalPages}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </>
  );
}

function AssignedProjectsList({
  emptyLabel,
  errorLabel,
  isLoading,
  items,
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: {
  emptyLabel: string;
  errorLabel: string | null;
  isLoading: boolean;
  items: DesignerAssignedProjectKpiItemDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  return (
    <>
      <div className="designer-ops-tabs" role="tablist" aria-label="Assigned projects">
        <button aria-selected="true" type="button">
          Assigned
          <em>{totalItems}</em>
        </button>
      </div>

      <div className="designer-ops-queue-table designer-ops-assigned-table">
        <div className="designer-ops-queue-head designer-ops-assigned-head">
          <span>Project</span>
          <span>Customer</span>
          <span>Assigned</span>
          <span>Customization</span>
          <span>Custom status</span>
          <span>Status</span>
          <span />
        </div>
        {isLoading ? <div className="designer-ops-queue-empty">Loading assigned projects...</div> : null}
        {errorLabel ? <div className="designer-ops-queue-empty">{errorLabel}</div> : null}
        {!isLoading && !errorLabel && items.length === 0 ? (
          <div className="designer-ops-queue-empty">{emptyLabel}</div>
        ) : null}
        {items.map((item) => {
          const customizationLabel = item.hasCustomerCustomizationRequest
            ? item.openCustomizationRequestCount > 0
              ? `Yes · ${item.openCustomizationRequestCount} open`
              : 'Yes'
            : 'No';

          return (
            <div className="designer-ops-queue-row designer-ops-assigned-row" key={item.projectId}>
              <strong title={`${item.projectCode} ${item.projectName}`.trim()}>
                {`${item.projectCode} ${item.projectName}`.trim()}
              </strong>
              <span title={item.customerName || undefined}>{item.customerName || '-'}</span>
              <span>{item.designerAssignedAt ? formatScheduleDateTime(item.designerAssignedAt) : '-'}</span>
              <span
                className={
                  item.hasCustomerCustomizationRequest
                    ? 'designer-ops-customization-yes'
                    : 'designer-ops-customization-no'
                }
                title={customizationLabel}
              >
                {customizationLabel}
              </span>
              <em title={item.latestCustomizationStatus ? formatStatusLabel(item.latestCustomizationStatus) : undefined}>
                {item.latestCustomizationStatus ? formatStatusLabel(item.latestCustomizationStatus) : '-'}
              </em>
              <em title={formatStatusLabel(item.status)}>{formatStatusLabel(item.status)}</em>
              <Link
                aria-label={`Open ${item.projectCode}`}
                className="designer-ops-queue-open"
                title="Open project"
                to={`/designer/assigned-projects/${item.projectId}`}
              >
                <IconChevronRight size={18} stroke={2} />
              </Link>
            </div>
          );
        })}
      </div>

      <KpiListPager
        isLoading={isLoading}
        page={page}
        pageSize={pageSize}
        totalItems={totalItems}
        totalPages={totalPages}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </>
  );
}

function KpiListPager({
  isLoading,
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: {
  isLoading: boolean;
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  return (
    <div className="designer-ops-pager">
      <label>
        <span>Rows</span>
        <select
          disabled={isLoading}
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          {LIST_PAGE_SIZES.map((size) => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
      </label>
      <span>
        {totalItems === 0 ? '0 items' : `Page ${page} of ${totalPages} · ${totalItems} items`}
      </span>
      <div className="designer-ops-pager-buttons">
        <button
          aria-label="Previous page"
          disabled={isLoading || page <= 1}
          type="button"
          onClick={() => onPageChange(page - 1)}
        >
          <IconChevronLeft size={16} />
        </button>
        <button
          aria-label="Next page"
          disabled={isLoading || page >= totalPages}
          type="button"
          onClick={() => onPageChange(page + 1)}
        >
          <IconChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function mapDesignerKpis(
  data: DesignerDashboardKpisDto | undefined,
  rangeLabel: string,
  detailPanel: DetailPanel,
  onOpenDetailPanel: (panel: Exclude<DetailPanel, 'queue'>) => void,
): KpiItem[] {
  const confirmedCount = data?.confirmedMeasurements ?? data?.measurementDue ?? 0;
  const consultingCount = data?.proposalConsultingProjects ?? data?.proposalsInProgress ?? 0;
  const revisionCount = data?.proposalRevisionsRequested ?? data?.revisionRequested ?? 0;
  const assignedCount = data?.assignedProjects ?? 0;

  return [
    {
      description: 'Confirmed measurement schedules still to complete in this date range',
      icon: IconCalendarEvent,
      id: 'confirmed-measurements',
      label: 'Confirmed Measurements',
      note: rangeLabel,
      onSelect: () => onOpenDetailPanel('confirmed-measurements'),
      selected: detailPanel === 'confirmed-measurements',
      tone: 'red',
      value: String(confirmedCount),
    },
    {
      description: 'Assigned projects currently in Proposal Consulting',
      icon: IconChecklist,
      id: 'proposals',
      label: 'Proposal Consulting',
      note: rangeLabel,
      onSelect: () => onOpenDetailPanel('proposal-consulting'),
      selected: detailPanel === 'proposal-consulting',
      tone: 'blue',
      value: String(consultingCount),
    },
    {
      description: 'Proposals with customer revision requests still pending',
      icon: IconEditCircle,
      id: 'revisions',
      label: 'Revision Requests',
      note: rangeLabel,
      onSelect: () => onOpenDetailPanel('revision-requested'),
      selected: detailPanel === 'revision-requested',
      tone: 'amber',
      value: String(revisionCount),
    },
    {
      description: 'Projects currently assigned to you, including customer customization requests',
      icon: IconBriefcase,
      id: 'assigned',
      label: 'Customize Requests',
      note: 'Stock',
      onSelect: () => onOpenDetailPanel('assigned-projects'),
      selected: detailPanel === 'assigned-projects',
      tone: 'neutral',
      value: String(assignedCount),
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

function formatPriorityLabel(priority: DashboardPriority | string) {
  if (priority === 'URGENT') return 'Urgent';
  if (priority === 'HIGH') return 'High';
  if (priority === 'MEDIUM') return 'Medium';
  if (priority === 'LOW') return 'Low';
  return priority;
}

function formatStatusLabel(status: string) {
  return status
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDueLabel(dueAt: string | null, dueBucket: DashboardDueBucket | null) {
  if (!dueAt && !dueBucket) return '-';
  if (dueBucket === 'OVERDUE') return 'Overdue';
  if (dueBucket === 'TODAY') return 'Today';
  if (dueBucket === 'THIS_WEEK') return 'This week';
  if (dueBucket === 'LATER') return 'Later';
  if (!dueAt) return '-';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dueAt));
}

function formatScheduleDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function resolveDesignerActionPath(item: DashboardQueueItemDto) {
  if (item.actionPath) return item.actionPath;
  return `/designer/assigned-projects/${item.projectId}`;
}
