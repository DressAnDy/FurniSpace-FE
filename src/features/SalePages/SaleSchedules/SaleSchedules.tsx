import {
  IconCalendarEvent,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconMapPin,
  IconPlus,
  IconUser,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { SaleNavbar, SaleSidebar } from '@/features/SalePages/salecomponents';
import {
  getProjectScheduleServiceResultMessage,
  type ProjectScheduleDto,
  type ProjectScheduleStatus,
  type ProjectScheduleType,
} from '@/services/api';
import type { ProjectListItemDto } from '@/services/api/projects';
import {
  useCurrentUser,
  useDeleteProjectSchedule,
  useMultiProjectSchedules,
  useProjectList,
  useUpdateProjectScheduleStatus,
} from '@/services/queries';
import { isScheduleVisible } from '@/shared/utils/scheduleVisibility';

import { CreateScheduleModal } from './components';
import './SaleSchedules.css';

type ManagedSchedule = {
  project: ProjectListItemDto;
  schedule: ProjectScheduleDto;
};

type ParticipantCalendarActor = 'customer' | 'designer';

const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const scheduleTypeOptions: Array<ProjectScheduleType | ''> = [
  '',
  'MEASUREMENT',
  'CONSULTATION',
  'DESIGN_REVIEW',
  'DELIVERY',
  'HANDOVER',
  'OTHER',
];

const scheduleStatusOptions: Array<ProjectScheduleStatus | ''> = [
  '',
  'PENDING_CONFIRMATION',
  'CONFIRMED',
  'CANCELLED',
];

export function SaleSchedules() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ProjectScheduleDto | null>(null);
  const [scheduleType, setScheduleType] = useState<ProjectScheduleType | ''>('');
  const [status, setStatus] = useState<ProjectScheduleStatus | ''>('');
  const [actionMessage, setActionMessage] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();

    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState(() => getDateKey(new Date()));
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(searchParams.get('scheduleId'));
  const [expandedDateKey, setExpandedDateKey] = useState<string | null>(null);
  const currentUserQuery = useCurrentUser();
  const currentUser = currentUserQuery.data;
  const projectsQuery = useProjectList(
    {
      assignedSalesId: currentUser?.accountId,
      page: 1,
      limit: 100,
    },
    { enabled: Boolean(currentUser?.accountId) },
  );
  const projects = useMemo(() => (projectsQuery.data?.items ?? []).filter((project) => Boolean(project.projectId)), [projectsQuery.data?.items]);
  const projectById = useMemo(
    () => Object.fromEntries(projects.map((project) => [project.projectId, project])),
    [projects],
  );
  const projectIds = useMemo(() => projects.map((project) => project.projectId), [projects]);
  const schedulesQuery = useMultiProjectSchedules(projectIds, {
    enabled: projectsQuery.isSuccess && projectIds.length > 0,
  });
  const updateStatusMutation = useUpdateProjectScheduleStatus();
  const deleteScheduleMutation = useDeleteProjectSchedule();
  const managedSchedules = useMemo<ManagedSchedule[]>(
    () =>
      (schedulesQuery.data ?? [])
        .map((schedule) => {
          const project = projectById[schedule.projectId];

          if (!project) {
            return null;
          }

          if (!isScheduleVisible(schedule.status)) {
            return null;
          }

          if (scheduleType && schedule.scheduleType !== scheduleType) {
            return null;
          }

          if (status && schedule.status !== status) {
            return null;
          }

          return { project, schedule };
        })
        .filter((item): item is ManagedSchedule => item !== null)
        .sort(
          (left, right) =>
            new Date(left.schedule.scheduledStart).getTime() -
            new Date(right.schedule.scheduledStart).getTime(),
        ),
    [projectById, scheduleType, schedulesQuery.data, status],
  );
  const isLoading = currentUserQuery.isLoading || projectsQuery.isLoading || schedulesQuery.isLoading;
  const scheduleError = schedulesQuery.error;
  const schedulesByDate = useMemo(() => {
    const groups = new Map<string, ManagedSchedule[]>();

    managedSchedules.forEach((item) => {
      const dateKey = getDateKey(new Date(item.schedule.scheduledStart));
      const daySchedules = groups.get(dateKey) ?? [];

      groups.set(dateKey, [...daySchedules, item]);
    });

    return groups;
  }, [managedSchedules]);
  const selectedItem = useMemo(
    () => managedSchedules.find(({ schedule }) => schedule.scheduleId === selectedScheduleId)
      ?? schedulesByDate.get(selectedDateKey)?.[0]
      ?? null,
    [managedSchedules, schedulesByDate, selectedDateKey, selectedScheduleId],
  );
  useEffect(() => {
    const scheduleId = searchParams.get('scheduleId');

    if (!scheduleId) {
      return;
    }

    const matched = managedSchedules.find(({ schedule }) => schedule.scheduleId === scheduleId);

    if (!matched) {
      return;
    }

    const scheduledStart = new Date(matched.schedule.scheduledStart);

    setSelectedScheduleId(matched.schedule.scheduleId);
    setSelectedDateKey(getDateKey(scheduledStart));
    setCalendarMonth((currentMonth) => (
      currentMonth.getFullYear() === scheduledStart.getFullYear()
        && currentMonth.getMonth() === scheduledStart.getMonth()
        ? currentMonth
        : new Date(scheduledStart.getFullYear(), scheduledStart.getMonth(), 1)
    ));
  }, [managedSchedules, searchParams]);

  useEffect(() => {
    setExpandedDateKey(null);
  }, [calendarMonth]);

  function selectSchedule(scheduleId: string, dateKey: string) {
    setSelectedDateKey(dateKey);
    setSelectedScheduleId(scheduleId);
    setSearchParams({ scheduleId });
  }

  function selectCalendarDay(dateKey: string, daySchedules: ManagedSchedule[]) {
    setSelectedDateKey(dateKey);

    const firstScheduleId = daySchedules[0]?.schedule.scheduleId ?? null;

    setSelectedScheduleId(firstScheduleId);

    if (firstScheduleId) {
      setSearchParams({ scheduleId: firstScheduleId });
    } else {
      setSearchParams({});
    }
  }

  async function updateScheduleStatus(
    schedule: ProjectScheduleDto,
    nextStatus: 'COMPLETED' | 'CANCELLED',
  ) {
    setActionMessage('');

    try {
      await updateStatusMutation.mutateAsync({
        scheduleId: schedule.scheduleId,
        status: nextStatus,
        note: `${formatEnumLabel(nextStatus)} by sales from schedule management.`,
      });
      setActionMessage(`Schedule ${formatEnumLabel(nextStatus).toLowerCase()} successfully.`);
    } catch (error) {
      setActionMessage(getProjectScheduleServiceResultMessage(error));
    }
  }

  async function deleteSchedule(schedule: ProjectScheduleDto) {
    const confirmed = window.confirm(`Delete ${schedule.title ?? formatEnumLabel(schedule.scheduleType)}?`);

    if (!confirmed) {
      return;
    }

    setActionMessage('');

    try {
      await deleteScheduleMutation.mutateAsync(schedule.scheduleId);
      setActionMessage('Schedule deleted successfully.');
      setSelectedScheduleId(null);
    } catch (error) {
      setActionMessage(getProjectScheduleServiceResultMessage(error));
    }
  }

  return (
    <div className="sale-schedules-shell">
      <SaleSidebar activeLabel="Schedules" />
      <div className="sale-schedules-content">
        <SaleNavbar />
        <main className="sale-schedules-main">
          <section className="sale-schedules-heading">
            <div>
              <h2>Schedules & Appointments</h2>
              <p>Manage schedules across projects assigned to your sales workspace</p>
            </div>
            <button
              className="sale-schedules-create-button"
              disabled={projects.length === 0}
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <IconPlus size={16} />
              Create Schedule
            </button>
          </section>

          <section className="sale-schedules-view-card">
            <div className="sale-schedules-filters">
              <label>
                <span>Type</span>
                <select value={scheduleType} onChange={(event) => setScheduleType(event.target.value as ProjectScheduleType | '')}>
                  {scheduleTypeOptions.map((option) => (
                    <option key={option || 'ALL'} value={option}>{option ? formatEnumLabel(option) : 'All types'}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Status</span>
                <select value={status} onChange={(event) => setStatus(event.target.value as ProjectScheduleStatus | '')}>
                  {scheduleStatusOptions.map((option) => (
                    <option key={option || 'ALL'} value={option}>{option ? formatEnumLabel(option) : 'All statuses'}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {actionMessage ? <p className="sale-schedules-message">{actionMessage}</p> : null}
          {isLoading ? <p className="sale-schedules-state">Loading schedules...</p> : null}
          {projectsQuery.isError ? <p className="sale-schedules-state sale-schedules-state-error">Could not load projects assigned to this sales account.</p> : null}
          {scheduleError ? <p className="sale-schedules-state sale-schedules-state-error">{getProjectScheduleServiceResultMessage(scheduleError)}</p> : null}

          <section className="sale-schedules-calendar-layout">
              <section className="sale-schedules-calendar-card" aria-label="Monthly schedule calendar">
                <div className="sale-schedules-calendar-head">
                  <div>
                    <span>Monthly overview</span>
                    <h3>{formatMonthYear(calendarMonth)}</h3>
                  </div>
                  <div className="sale-schedules-calendar-controls">
                    <button type="button" aria-label="Previous month" onClick={() => setCalendarMonth(moveMonth(calendarMonth, -1))}>
                      <IconChevronLeft size={18} />
                    </button>
                    <button type="button" aria-label="Next month" onClick={() => setCalendarMonth(moveMonth(calendarMonth, 1))}>
                      <IconChevronRight size={18} />
                    </button>
                  </div>
                </div>

                <div className="sale-schedules-calendar-weekdays" aria-hidden="true">
                  {weekDays.map((day) => <span key={day}>{day}</span>)}
                </div>

                <div className="sale-schedules-calendar-grid">
                  {getMonthDays(calendarMonth).map(({ date, day, gridColumnStart }) => {
                    const dateKey = getDateKey(date);
                    const daySchedules = schedulesByDate.get(dateKey) ?? [];
                    const isExpanded = expandedDateKey === dateKey;
                    const visibleDaySchedules = isExpanded ? daySchedules : daySchedules.slice(0, 2);
                    const hiddenCount = daySchedules.length - visibleDaySchedules.length;
                    const dayClassName = [
                      'sale-schedules-calendar-day',
                      dateKey === getDateKey(new Date()) ? 'sale-schedules-calendar-day-today' : '',
                      selectedDateKey === dateKey ? 'sale-schedules-calendar-day-selected' : '',
                      daySchedules.length > 0 ? 'sale-schedules-calendar-day-has-events' : '',
                      isExpanded ? 'sale-schedules-calendar-day-expanded' : '',
                    ].filter(Boolean).join(' ');
                    const scheduleCountLabel = formatScheduleCount(daySchedules.length);

                    return (
                      <div
                        className={dayClassName}
                        key={dateKey}
                        style={gridColumnStart ? { gridColumnStart } : undefined}
                      >
                        <button
                          className="sale-schedules-calendar-day-summary"
                          type="button"
                          onClick={() => selectCalendarDay(dateKey, daySchedules)}
                        >
                          <span className="sale-schedules-calendar-day-number">{day}</span>
                          <span className="sale-schedules-calendar-day-meta">{scheduleCountLabel}</span>
                        </button>

                        {daySchedules.length > 0 ? (
                          <span className="sale-schedules-calendar-events">
                            {visibleDaySchedules.map(({ project, schedule }) => (
                              <button
                                className={`sale-schedules-calendar-event sale-schedules-calendar-event-${schedule.status.toLowerCase().replace(/_/g, '-')}${selectedItem?.schedule.scheduleId === schedule.scheduleId ? ' sale-schedules-calendar-event-active' : ''}`}
                                key={schedule.scheduleId}
                                title={`${schedule.title ?? formatEnumLabel(schedule.scheduleType)} - ${project.projectName}`}
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  selectSchedule(schedule.scheduleId, dateKey);
                                }}
                              >
                                <strong>{formatTime(schedule.scheduledStart)}</strong>
                                <em>{schedule.title ?? formatEnumLabel(schedule.scheduleType)}</em>
                              </button>
                            ))}
                            {daySchedules.length > 2 ? (
                              <button
                                aria-expanded={isExpanded}
                                className="sale-schedules-calendar-more"
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setExpandedDateKey(isExpanded ? null : dateKey);
                                }}
                              >
                                {isExpanded ? 'Show less' : `+${hiddenCount} more`}
                              </button>
                            ) : null}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="sale-schedules-calendar-detail" aria-label="Schedule detail">
                {selectedItem ? (
                  <ScheduleDetail
                    item={selectedItem}
                    isUpdating={updateStatusMutation.isPending || deleteScheduleMutation.isPending}
                    onCancel={() => void updateScheduleStatus(selectedItem.schedule, 'CANCELLED')}
                    onComplete={() => void updateScheduleStatus(selectedItem.schedule, 'COMPLETED')}
                    onDelete={() => void deleteSchedule(selectedItem.schedule)}
                    onReschedule={() => setEditingSchedule(selectedItem.schedule)}
                  />
                ) : (
                  <div className="sale-schedules-empty-detail">
                    <IconCalendarEvent size={32} />
                    <h3>No schedule selected</h3>
                    <p>Select a schedule from the calendar to review its details.</p>
                  </div>
                )}
              </section>
            </section>
        </main>
      </div>
      <CreateScheduleModal
        editingSchedule={editingSchedule}
        isOpen={isCreateModalOpen || Boolean(editingSchedule)}
        projects={projects}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingSchedule(null);
        }}
      />
    </div>
  );
}

type ScheduleDetailProps = Readonly<{
  item: ManagedSchedule;
  isUpdating: boolean;
  onCancel: () => void;
  onComplete: () => void;
  onDelete: () => void;
  onReschedule: () => void;
}>;

function ScheduleDetail({ item, isUpdating, onCancel, onComplete, onDelete, onReschedule }: ScheduleDetailProps) {
  const { project, schedule } = item;
  const canReschedule = schedule.status === 'PENDING_CONFIRMATION' || schedule.status === 'CONFIRMED' || schedule.status === 'CANCELLED';
  const canCancel = schedule.status === 'PENDING_CONFIRMATION' || schedule.status === 'CONFIRMED';
  const canComplete = schedule.status === 'CONFIRMED';
  const canDelete = schedule.status !== 'COMPLETED';

  return (
    <>
      <div className="sale-schedules-detail-head">
        <div>
          <span>{formatEnumLabel(schedule.scheduleType)}</span>
          <h3>{schedule.title ?? formatEnumLabel(schedule.scheduleType)}</h3>
          <p>{project.projectCode} - {project.projectName}</p>
        </div>
        <strong>{formatEnumLabel(schedule.status)}</strong>
      </div>

      <div className="sale-schedules-detail-grid">
        <div>
          <IconClock size={18} />
          <span>Start</span>
          <strong>{formatDateTime(schedule.scheduledStart)}</strong>
        </div>
        <div>
          <IconClock size={18} />
          <span>End</span>
          <strong>{schedule.scheduledEnd ? formatDateTime(schedule.scheduledEnd) : 'Not specified'}</strong>
        </div>
        <div>
          <IconMapPin size={18} />
          <span>Location</span>
          <strong>{schedule.location ?? 'Not specified'}</strong>
        </div>
        <div>
          <IconUser size={18} />
          <span>Assignment</span>
          <strong>{schedule.assignedStaffId ? 'Assigned project designer' : 'No staff assigned'}</strong>
        </div>
      </div>

      <div className="sale-schedules-detail-notes">
        <h4>Details</h4>
        <p>{schedule.description || schedule.internalNote || schedule.customerNote || 'No additional schedule details were provided.'}</p>
      </div>

      {canReschedule || canComplete || canCancel || canDelete ? (
        <div className="sale-schedules-detail-actions">
          {canReschedule ? <button disabled={isUpdating} type="button" onClick={onReschedule}>{schedule.status === 'CANCELLED' ? 'Update Schedule' : 'Reschedule'}</button> : null}
          {canComplete ? <button disabled={isUpdating} type="button" onClick={onComplete}>Mark Complete</button> : null}
          {canCancel ? <button className="sale-schedules-cancel-button" disabled={isUpdating} type="button" onClick={onCancel}>Cancel</button> : null}
          {canDelete ? <button className="sale-schedules-cancel-button" disabled={isUpdating} type="button" onClick={onDelete}>Delete</button> : null}
        </div>
      ) : null}
    </>
  );
}

type ParticipantScheduleCalendarProps = Readonly<{
  actor: ParticipantCalendarActor;
  listDateKey: string | null;
  month: Date;
  project: ProjectListItemDto;
  schedules: ManagedSchedule[];
  selectedScheduleId?: string | null;
  onActorChange: (actor: ParticipantCalendarActor) => void;
  onBackToCalendar: () => void;
  onMonthChange: (month: Date) => void;
  onOpenDateList: (dateKey: string) => void;
  onSelectSchedule: (schedule: ProjectScheduleDto, dateKey: string) => void;
}>;

function ParticipantScheduleCalendar({
  actor,
  listDateKey,
  month,
  onActorChange,
  onBackToCalendar,
  onMonthChange,
  onOpenDateList,
  onSelectSchedule,
  project,
  schedules,
  selectedScheduleId,
}: ParticipantScheduleCalendarProps) {
  const visibleSchedules = useMemo(
    () => schedules
      .filter(({ schedule }) => actor === 'customer' || schedule.assignedStaffId === project.assignedDesignerId)
      .sort((left, right) => new Date(left.schedule.scheduledStart).getTime() - new Date(right.schedule.scheduledStart).getTime()),
    [actor, project.assignedDesignerId, schedules],
  );
  const schedulesByParticipantDate = useMemo(() => {
    const groups = new Map<string, ManagedSchedule[]>();

    visibleSchedules.forEach((item) => {
      const dateKey = getDateKey(new Date(item.schedule.scheduledStart));
      const daySchedules = groups.get(dateKey) ?? [];

      groups.set(dateKey, [...daySchedules, item]);
    });

    return groups;
  }, [visibleSchedules]);
  const listItems = listDateKey ? schedulesByParticipantDate.get(listDateKey) ?? [] : [];

  return (
    <section className="sale-schedules-participant-calendar" aria-label="Project participant schedules">
      <header>
        <div>
          <span>Project Calendar</span>
          <h4>{actor === 'customer' ? 'Customer schedules' : 'Designer schedules'}</h4>
          <p>{project.projectCode} - {project.projectName}</p>
        </div>
        <div className="sale-schedules-participant-tabs" role="tablist" aria-label="Participant calendar">
          <button
            className={actor === 'customer' ? 'is-active' : ''}
            type="button"
            role="tab"
            aria-selected={actor === 'customer'}
            onClick={() => onActorChange('customer')}
          >
            Customer
          </button>
          <button
            className={actor === 'designer' ? 'is-active' : ''}
            type="button"
            role="tab"
            aria-selected={actor === 'designer'}
            onClick={() => onActorChange('designer')}
          >
            Designer
          </button>
        </div>
      </header>

      {listDateKey ? (
        <div className="sale-schedules-participant-list-view">
          <button className="sale-schedules-participant-back" type="button" onClick={onBackToCalendar}>
            <IconChevronLeft size={16} />
            Back to calendar
          </button>
          <h5>{formatDateOnly(listDateKey)}</h5>
          {listItems.length === 0 ? <p>No schedule on this date.</p> : null}
          <div className="sale-schedules-participant-list">
            {listItems.map(({ schedule }) => (
              <button
                className={schedule.scheduleId === selectedScheduleId ? 'is-active' : ''}
                key={schedule.scheduleId}
                type="button"
                onClick={() => onSelectSchedule(schedule, listDateKey)}
              >
                <strong>{formatTime(schedule.scheduledStart)} - {schedule.title ?? formatEnumLabel(schedule.scheduleType)}</strong>
                <span>{formatEnumLabel(schedule.status)} · {schedule.location ?? 'No location'}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="sale-schedules-participant-calendar-head">
            <button type="button" aria-label="Previous participant month" onClick={() => onMonthChange(moveMonth(month, -1))}>
              <IconChevronLeft size={16} />
            </button>
            <strong>{formatMonthYear(month)}</strong>
            <button type="button" aria-label="Next participant month" onClick={() => onMonthChange(moveMonth(month, 1))}>
              <IconChevronRight size={16} />
            </button>
          </div>
          <div className="sale-schedules-participant-weekdays" aria-hidden="true">
            {weekDays.map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="sale-schedules-participant-grid">
            {getMonthDays(month).map(({ date, day, gridColumnStart }) => {
              const dateKey = getDateKey(date);
              const count = schedulesByParticipantDate.get(dateKey)?.length ?? 0;
              const isToday = dateKey === getDateKey(new Date());

              return (
                <button
                  className={[
                    'sale-schedules-participant-day',
                    count > 0 ? 'has-schedules' : '',
                    isToday ? 'is-today' : '',
                  ].filter(Boolean).join(' ')}
                  disabled={count === 0}
                  key={dateKey}
                  style={gridColumnStart ? { gridColumnStart } : undefined}
                  type="button"
                  onClick={() => onOpenDateList(dateKey)}
                >
                  <span>{day}</span>
                  {count > 0 ? <strong>{count}</strong> : null}
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function formatScheduleCount(count: number) {
  if (count === 0) return 'No schedule';
  if (count === 1) return '1 schedule';
  return `${count} schedules`;
}

function formatMonthYear(value: Date) {
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
  }).format(value);
}

function getDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function moveMonth(value: Date, offset: number) {
  return new Date(value.getFullYear(), value.getMonth() + offset, 1);
}

function getMonthDays(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;

    return {
      date: new Date(year, monthIndex, day),
      day,
      gridColumnStart: day === 1 ? firstWeekday + 1 : undefined,
    };
  });
}
