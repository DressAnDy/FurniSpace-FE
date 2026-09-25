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

import { useLang, type Lang } from '@/app/providers/useLang';
import { DesignerLayout, designerCopy } from '@/features/DesignerPages/designercomponents';
import type { DesignerCopy } from '@/features/DesignerPages/designercomponents/designerI18n';
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

const ALL_PRIORITIES = '';
const priorityOptions: Array<'' | DashboardPriority> = [ALL_PRIORITIES, 'HIGH', 'MEDIUM', 'LOW'];
const DEFAULT_DESIGNER_GROUPS: string[] = ['Design'];
const LIST_PAGE_SIZES = [5, 10, 20];

export function DesignerDashbroad() {
  const { lang } = useLang();
  const t = designerCopy[lang];
  const d = t.dashboard;
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

  const dateRangeLabel = getDateRangeLabel(d, dateRange);
  const projectFilterLabel = getProjectFilterLabel(d, projectFilter);

  const visibleKpis = useMemo(
    () => mapDesignerKpis(kpisQuery.data, d, dateRange, detailPanel, openDetailPanel),
    [d, dateRange, detailPanel, kpisQuery.data, openDetailPanel],
  );

  const refreshTime = new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(lastRefreshAt);
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
      ? d.primaryActionCustomization
      : projectFilter === 'overdue'
        ? d.primaryActionOverdue
        : d.primaryActionAssigned;
  const measurementsTotal = confirmedMeasurementsQuery.data?.total ?? 0;
  const measurementsTotalPages = Math.max(1, Math.ceil(measurementsTotal / measurementsPageSize));
  const consultingTotal = proposalConsultingQuery.data?.total ?? 0;
  const consultingTotalPages = Math.max(1, Math.ceil(consultingTotal / consultingPageSize));
  const revisionsTotal = revisionRequestedQuery.data?.total ?? 0;
  const revisionsTotalPages = Math.max(1, Math.ceil(revisionsTotal / revisionsPageSize));
  const assignedTotal = assignedProjectsQuery.data?.total ?? 0;
  const assignedTotalPages = Math.max(1, Math.ceil(assignedTotal / assignedPageSize));
  const detailTitle = showConfirmedMeasurements
    ? d.panelConfirmed
    : showProposalConsulting
      ? d.panelConsulting
      : showRevisionRequested
        ? d.panelRevisions
        : showAssignedProjects
          ? d.panelAssigned
          : d.panelWorkQueue;
  const detailSubtitle = showConfirmedMeasurements
    ? d.panelSubtitleConfirmed(dateRangeLabel)
    : showProposalConsulting
      ? d.panelSubtitleConsulting(dateRangeLabel)
      : showRevisionRequested
        ? d.panelSubtitleRevisions(dateRangeLabel)
        : showAssignedProjects
          ? d.panelSubtitleAssigned
          : d.panelSubtitleWorkQueue(dateRangeLabel, projectFilterLabel);

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
    <DesignerLayout activeKey="dashboard">
      <div className="designer-dashboard-page">
        <section className="designer-ops-header">
          <div>
            <span>{d.eyebrow}</span>
            <h2>{d.title}</h2>
            <p>{d.subtitle}</p>
          </div>
          <div className="designer-ops-header-side">
            <button
              className="designer-ops-refresh-button"
              disabled={isRefreshing}
              type="button"
              onClick={() => void handleRefresh()}
            >
              <IconRefresh className={isRefreshing ? 'is-spinning' : undefined} size={14} />
              {isRefreshing ? t.common.refreshing : d.refreshAt(refreshTime)}
            </button>
          </div>
        </section>

        <section className="designer-ops-filter-bar" aria-label={d.filtersAria}>
          <label>
            <span>{d.dateRange}</span>
            <select
              value={dateRange}
              onChange={(event) => {
                setDateRange(event.target.value as DateRangeKey);
                setMeasurementsPage(1);
                setConsultingPage(1);
                setRevisionsPage(1);
              }}
            >
              <option value="today">{d.today}</option>
              <option value="this-week">{d.thisWeek}</option>
              <option value="this-month">{d.thisMonth}</option>
            </select>
          </label>
          <label>
            <span>{d.projectFilter}</span>
            <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value as ProjectFilterKey)}>
              <option value="assigned">{d.filterAssigned}</option>
              <option value="overdue">{d.filterOverdue}</option>
              <option value="customization">{d.filterCustomization}</option>
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
                    {showConfirmedMeasurements ? d.openSchedules : d.openProjects}
                  </Link>
                  <button type="button" onClick={() => setDetailPanel('queue')}>
                    {d.backToQueue}
                  </button>
                </div>
              ) : (
                <div className="designer-ops-filter-menu" ref={filterMenuRef}>
                  <button
                    aria-expanded={isFilterOpen}
                    aria-haspopup="dialog"
                    aria-label={d.filterWorkQueue}
                    className={hasActiveFilters || isFilterOpen ? 'designer-ops-filter-toggle is-active' : 'designer-ops-filter-toggle'}
                    type="button"
                    onClick={() => setIsFilterOpen((open) => !open)}
                  >
                    <IconFilter size={18} />
                    {hasActiveFilters ? <span>{activeFilterCount}</span> : null}
                  </button>

                  {isFilterOpen ? (
                    <div className="designer-ops-filter-panel" role="dialog" aria-label={d.workQueueFiltersAria}>
                      <div className="designer-ops-filter-panel-header">
                        <strong>{d.filterWorkQueue}</strong>
                        <button aria-label={t.common.closeFilters} type="button" onClick={() => setIsFilterOpen(false)}>
                          <IconX size={16} />
                        </button>
                      </div>

                      <label>
                        <span>{t.common.priority}</span>
                        <select
                          value={priorityFilter}
                          onChange={(event) => setPriorityFilter(event.target.value as '' | DashboardPriority)}
                        >
                          {priorityOptions.map((option) => (
                            <option key={option || '__all__'} value={option}>
                              {option === ALL_PRIORITIES ? t.common.allPriorities : formatPriorityLabel(option)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="designer-ops-filter-panel-actions">
                        <button disabled={!hasActiveFilters} type="button" onClick={clearWorkFilters}>
                          {t.common.clear}
                        </button>
                        <button type="button" onClick={() => setIsFilterOpen(false)}>
                          {t.common.done}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </header>

            {showConfirmedMeasurements ? (
              <ConfirmedMeasurementsList
                emptyLabel={d.emptyConfirmed(dateRangeLabel)}
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
                emptyLabel={d.emptyConsulting(dateRangeLabel)}
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
                emptyLabel={d.emptyRevisions(dateRangeLabel)}
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
                emptyLabel={d.emptyAssigned}
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
                        {d.priorityChip(formatPriorityLabel(priorityFilter))}
                        <IconX size={14} />
                      </button>
                    ) : null}
                    <button className="designer-ops-clear-all" type="button" onClick={clearWorkFilters}>
                      {t.common.clearAll}
                    </button>
                  </div>
                ) : null}

                <div className="designer-ops-tabs" role="tablist" aria-label={d.workGroupsAria}>
                  {workGroups.map((group) => (
                    <button aria-selected={activeGroup === group} key={group} role="tab" type="button" onClick={() => setActiveGroup(group)}>
                      {group}
                      <em>{countsByGroup[group] ?? 0}</em>
                    </button>
                  ))}
                </div>

                <div className="designer-ops-queue-table">
                  <div className="designer-ops-queue-head">
                    <span>{d.queueCols.project}</span>
                    <span>{d.queueCols.phase}</span>
                    <span>{d.queueCols.warning}</span>
                    <span className="designer-ops-queue-col-center">{d.queueCols.priority}</span>
                    <span>{d.queueCols.action}</span>
                    <span>{d.queueCols.due}</span>
                    <span className="designer-ops-queue-col-center">{d.queueCols.status}</span>
                    <span />
                  </div>
                  {isLoading ? <div className="designer-ops-queue-empty">{d.loadingQueue}</div> : null}
                  {loadError ? <div className="designer-ops-queue-empty">{loadError}</div> : null}
                  {!isLoading && !loadError && queueItems.length === 0 ? (
                    <div className="designer-ops-queue-empty">
                      {hasActiveFilters || dateRange !== 'this-month' || projectFilter !== 'assigned'
                        ? d.emptyQueueFiltered(dateRangeLabel, projectFilterLabel)
                        : d.emptyQueueDefault}
                    </div>
                  ) : null}
                  {queueItems.map((item) => (
                    <div className="designer-ops-queue-row" key={item.id}>
                      <strong>{formatProjectLabel(item)}</strong>
                      <span>{item.phase || t.common.dash}</span>
                      <span>{item.warning || t.common.dash}</span>
                      <span className={priorityClass(item.priority)}>{formatPriorityLabel(item.priority)}</span>
                      <span>{item.action}</span>
                      <span>{formatDueLabel(item.dueAt, item.dueBucket, d, lang)}</span>
                      <em title={item.status}>{formatStatusLabel(item.status)}</em>
                      <Link
                        aria-label={d.openProjectAria(item.projectCode)}
                        className="designer-ops-queue-open"
                        title={t.common.open}
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
  const { lang } = useLang();
  const t = designerCopy[lang];
  const d = t.dashboard;

  return (
    <>
      <div className="designer-ops-tabs" role="tablist" aria-label={d.panelConfirmed}>
        <button aria-selected="true" type="button">
          {d.tabConfirmed}
          <em>{totalItems}</em>
        </button>
      </div>

      <div className="designer-ops-queue-table designer-ops-measurements-table">
        <div className="designer-ops-queue-head designer-ops-measurements-head">
          <span>{d.measurementsCols.project}</span>
          <span>{d.measurementsCols.title}</span>
          <span>{d.measurementsCols.start}</span>
          <span>{d.measurementsCols.location}</span>
          <span>{d.measurementsCols.assignee}</span>
          <span>{d.measurementsCols.status}</span>
          <span />
        </div>
        {isLoading ? <div className="designer-ops-queue-empty">{d.loadingConfirmed}</div> : null}
        {errorLabel ? <div className="designer-ops-queue-empty">{errorLabel}</div> : null}
        {!isLoading && !errorLabel && items.length === 0 ? (
          <div className="designer-ops-queue-empty">{emptyLabel}</div>
        ) : null}
        {items.map((item) => (
          <div className="designer-ops-queue-row designer-ops-measurements-row" key={item.scheduleId}>
            <strong title={`${item.projectCode} ${item.projectName}`.trim()}>
              {`${item.projectCode} ${item.projectName}`.trim()}
            </strong>
            <span title={item.title ?? undefined}>{item.title || t.common.dash}</span>
            <span>{formatScheduleDateTime(item.scheduledStart, lang)}</span>
            <span title={item.location ?? undefined}>{item.location || t.common.dash}</span>
            <span title={item.assignedStaffName ?? undefined}>{item.assignedStaffName || t.common.dash}</span>
            <em title={formatStatusLabel(item.status)}>{formatStatusLabel(item.status)}</em>
            <Link
              aria-label={d.openProjectAria(item.projectCode)}
              className="designer-ops-queue-open"
              title={d.openProject}
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
  const { lang } = useLang();
  const t = designerCopy[lang];
  const d = t.dashboard;

  return (
    <>
      <div className="designer-ops-tabs" role="tablist" aria-label={d.panelConsulting}>
        <button aria-selected="true" type="button">
          {d.tabConsulting}
          <em>{totalItems}</em>
        </button>
      </div>

      <div className="designer-ops-queue-table designer-ops-consulting-table">
        <div className="designer-ops-queue-head designer-ops-consulting-head">
          <span>{d.consultingCols.project}</span>
          <span>{d.consultingCols.customer}</span>
          <span>{d.consultingCols.designer}</span>
          <span>{d.consultingCols.assigned}</span>
          <span>{d.consultingCols.updated}</span>
          <span>{d.consultingCols.status}</span>
          <span />
        </div>
        {isLoading ? <div className="designer-ops-queue-empty">{d.loadingConsulting}</div> : null}
        {errorLabel ? <div className="designer-ops-queue-empty">{errorLabel}</div> : null}
        {!isLoading && !errorLabel && items.length === 0 ? (
          <div className="designer-ops-queue-empty">{emptyLabel}</div>
        ) : null}
        {items.map((item) => (
          <div className="designer-ops-queue-row designer-ops-consulting-row" key={item.projectId}>
            <strong title={`${item.projectCode} ${item.projectName}`.trim()}>
              {`${item.projectCode} ${item.projectName}`.trim()}
            </strong>
            <span title={item.customerName || undefined}>{item.customerName || t.common.dash}</span>
            <span title={item.assignedDesignerName ?? undefined}>{item.assignedDesignerName || t.common.dash}</span>
            <span>{item.designerAssignedAt ? formatScheduleDateTime(item.designerAssignedAt, lang) : t.common.dash}</span>
            <span>{formatScheduleDateTime(item.updatedAt, lang)}</span>
            <em title={formatStatusLabel(item.status)}>{formatStatusLabel(item.status)}</em>
            <Link
              aria-label={d.openProjectAria(item.projectCode)}
              className="designer-ops-queue-open"
              title={d.openProject}
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
  const { lang } = useLang();
  const t = designerCopy[lang];
  const d = t.dashboard;

  return (
    <>
      <div className="designer-ops-tabs" role="tablist" aria-label={d.panelRevisions}>
        <button aria-selected="true" type="button">
          {d.tabRevisions}
          <em>{totalItems}</em>
        </button>
      </div>

      <div className="designer-ops-queue-table designer-ops-revisions-table">
        <div className="designer-ops-queue-head designer-ops-revisions-head">
          <span>{d.revisionsCols.proposal}</span>
          <span>{d.revisionsCols.project}</span>
          <span>{d.revisionsCols.note}</span>
          <span>{d.revisionsCols.requested}</span>
          <span>{d.revisionsCols.designer}</span>
          <span>{d.revisionsCols.status}</span>
          <span />
        </div>
        {isLoading ? <div className="designer-ops-queue-empty">{d.loadingRevisions}</div> : null}
        {errorLabel ? <div className="designer-ops-queue-empty">{errorLabel}</div> : null}
        {!isLoading && !errorLabel && items.length === 0 ? (
          <div className="designer-ops-queue-empty">{emptyLabel}</div>
        ) : null}
        {items.map((item) => (
          <div className="designer-ops-queue-row designer-ops-revisions-row" key={item.proposalId}>
            <strong title={item.proposalName ?? undefined}>{item.proposalName || d.untitledProposal}</strong>
            <span title={`${item.projectCode} ${item.projectName}`.trim()}>
              {`${item.projectCode} ${item.projectName}`.trim()}
            </span>
            <span title={item.revisionNote ?? undefined}>{item.revisionNote || t.common.dash}</span>
            <span>{formatScheduleDateTime(item.revisionRequestedAt, lang)}</span>
            <span title={item.assignedDesignerName ?? undefined}>{item.assignedDesignerName || t.common.dash}</span>
            <em title={formatStatusLabel(item.status)}>{formatStatusLabel(item.status)}</em>
            <Link
              aria-label={d.openProposalAria(item.proposalName || item.proposalId)}
              className="designer-ops-queue-open"
              title={d.openProposal}
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
  const { lang } = useLang();
  const t = designerCopy[lang];
  const d = t.dashboard;

  return (
    <>
      <div className="designer-ops-tabs" role="tablist" aria-label={d.panelAssigned}>
        <button aria-selected="true" type="button">
          {d.tabAssigned}
          <em>{totalItems}</em>
        </button>
      </div>

      <div className="designer-ops-queue-table designer-ops-assigned-table">
        <div className="designer-ops-queue-head designer-ops-assigned-head">
          <span>{d.assignedCols.project}</span>
          <span>{d.assignedCols.customer}</span>
          <span>{d.assignedCols.assigned}</span>
          <span>{d.assignedCols.customization}</span>
          <span>{d.assignedCols.customStatus}</span>
          <span>{d.assignedCols.status}</span>
          <span />
        </div>
        {isLoading ? <div className="designer-ops-queue-empty">{d.loadingAssigned}</div> : null}
        {errorLabel ? <div className="designer-ops-queue-empty">{errorLabel}</div> : null}
        {!isLoading && !errorLabel && items.length === 0 ? (
          <div className="designer-ops-queue-empty">{emptyLabel}</div>
        ) : null}
        {items.map((item) => {
          const customizationLabel = item.hasCustomerCustomizationRequest
            ? item.openCustomizationRequestCount > 0
              ? d.customizationYesOpen(item.openCustomizationRequestCount)
              : d.customizationYes
            : d.customizationNo;

          return (
            <div className="designer-ops-queue-row designer-ops-assigned-row" key={item.projectId}>
              <strong title={`${item.projectCode} ${item.projectName}`.trim()}>
                {`${item.projectCode} ${item.projectName}`.trim()}
              </strong>
              <span title={item.customerName || undefined}>{item.customerName || t.common.dash}</span>
              <span>{item.designerAssignedAt ? formatScheduleDateTime(item.designerAssignedAt, lang) : t.common.dash}</span>
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
                {item.latestCustomizationStatus ? formatStatusLabel(item.latestCustomizationStatus) : t.common.dash}
              </em>
              <em title={formatStatusLabel(item.status)}>{formatStatusLabel(item.status)}</em>
              <Link
                aria-label={d.openProjectAria(item.projectCode)}
                className="designer-ops-queue-open"
                title={d.openProject}
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
  const { lang } = useLang();
  const t = designerCopy[lang];
  const d = t.dashboard;

  return (
    <div className="designer-ops-pager">
      <label>
        <span>{t.common.rows}</span>
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
        {totalItems === 0 ? d.pagerZeroItems : d.pagerSummary(page, totalPages, totalItems)}
      </span>
      <div className="designer-ops-pager-buttons">
        <button
          aria-label={d.previousPageAria}
          disabled={isLoading || page <= 1}
          type="button"
          onClick={() => onPageChange(page - 1)}
        >
          <IconChevronLeft size={16} />
        </button>
        <button
          aria-label={d.nextPageAria}
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
  d: DesignerCopy['dashboard'],
  dateRange: DateRangeKey,
  detailPanel: DetailPanel,
  onOpenDetailPanel: (panel: Exclude<DetailPanel, 'queue'>) => void,
): KpiItem[] {
  const confirmedCount = data?.confirmedMeasurements ?? data?.measurementDue ?? 0;
  const consultingCount = data?.proposalConsultingProjects ?? data?.proposalsInProgress ?? 0;
  const revisionCount = data?.proposalRevisionsRequested ?? data?.revisionRequested ?? 0;
  const assignedCount = data?.assignedProjects ?? 0;
  const rangeNote = getDateRangeLabel(d, dateRange);

  return [
    {
      description: d.kpiConfirmedDescription,
      icon: IconCalendarEvent,
      id: 'confirmed-measurements',
      label: d.kpiConfirmedLabel,
      note: rangeNote,
      onSelect: () => onOpenDetailPanel('confirmed-measurements'),
      selected: detailPanel === 'confirmed-measurements',
      tone: 'red',
      value: String(confirmedCount),
    },
    {
      description: d.kpiConsultingDescription,
      icon: IconChecklist,
      id: 'proposals',
      label: d.kpiConsultingLabel,
      note: rangeNote,
      onSelect: () => onOpenDetailPanel('proposal-consulting'),
      selected: detailPanel === 'proposal-consulting',
      tone: 'blue',
      value: String(consultingCount),
    },
    {
      description: d.kpiRevisionDescription,
      icon: IconEditCircle,
      id: 'revisions',
      label: d.kpiRevisionLabel,
      note: rangeNote,
      onSelect: () => onOpenDetailPanel('revision-requested'),
      selected: detailPanel === 'revision-requested',
      tone: 'amber',
      value: String(revisionCount),
    },
    {
      description: d.kpiAssignedDescription,
      icon: IconBriefcase,
      id: 'assigned',
      label: d.kpiAssignedLabel,
      note: d.kpiAssignedNote,
      onSelect: () => onOpenDetailPanel('assigned-projects'),
      selected: detailPanel === 'assigned-projects',
      tone: 'neutral',
      value: String(assignedCount),
    },
  ];
}

function getDateRangeLabel(d: DesignerCopy['dashboard'], dateRange: DateRangeKey) {
  if (dateRange === 'today') return d.today;
  if (dateRange === 'this-week') return d.thisWeek;
  return d.thisMonth;
}

function getProjectFilterLabel(d: DesignerCopy['dashboard'], projectFilter: ProjectFilterKey) {
  if (projectFilter === 'assigned') return d.filterAssigned;
  if (projectFilter === 'overdue') return d.filterOverdue;
  return d.filterCustomization;
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

function formatDueLabel(
  dueAt: string | null,
  dueBucket: DashboardDueBucket | null,
  d: DesignerCopy['dashboard'],
  lang: Lang,
) {
  const dash = designerCopy[lang].common.dash;
  if (!dueAt && !dueBucket) return dash;
  if (dueBucket === 'OVERDUE') return 'Overdue';
  if (dueBucket === 'TODAY') return d.today;
  if (dueBucket === 'THIS_WEEK') return d.thisWeek;
  if (dueBucket === 'LATER') return 'Later';
  if (!dueAt) return dash;

  return new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dueAt));
}

function formatScheduleDateTime(value: string, lang: Lang) {
  return new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-US', {
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
