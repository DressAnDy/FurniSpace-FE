import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import {
  useCreateProjectSchedule,
  useProjectScheduleList,
} from '@/services/queries';
import { getProjectScheduleServiceResultMessage } from '@/services/api/schedules';
import type { ProjectScheduleDto, ProjectScheduleStatus, ProjectScheduleType } from '@/services/api/schedules';
import { validateScheduleDateTimeRange } from '@/shared/utils/dateValidation';

import type { ProjectDetailProject } from '../ProjectDetail';

type SchedulesTabProps = {
  project: ProjectDetailProject;
};

type ProjectScheduleActor = 'customer' | 'designer';

const scheduleTypeOptions: ProjectScheduleType[] = ['MEASUREMENT', 'CONSULTATION'];
const scheduleStatusOptions: ProjectScheduleStatus[] = ['PENDING_CONFIRMATION', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

export function SchedulesTab({ project }: SchedulesTabProps) {
  const [message, setMessage] = useState('');
  const [scheduleTypeInput, setScheduleTypeInput] = useState<ProjectScheduleType>('MEASUREMENT');
  const [scheduleStartInput, setScheduleStartInput] = useState('');
  const [scheduleEndInput, setScheduleEndInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectScheduleStatus | ''>('');
  const [calendarActor, setCalendarActor] = useState<ProjectScheduleActor>('customer');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();

    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [calendarListDateKey, setCalendarListDateKey] = useState<string | null>(null);
  const schedulesQuery = useProjectScheduleList({
    projectId: project.projectId,
    status: statusFilter || null,
    page: 1,
    limit: 100,
  });
  const createScheduleMutation = useCreateProjectSchedule();
  const defaultTitle = useMemo(() => getDefaultScheduleTitle(project), [project]);
  const schedules = useMemo(
    () => [...(schedulesQuery.data?.items ?? [])].sort((left, right) => new Date(left.scheduledStart).getTime() - new Date(right.scheduledStart).getTime()),
    [schedulesQuery.data?.items],
  );
  const visibleCalendarSchedules = useMemo(
    () => schedules.filter((schedule) => calendarActor === 'customer' || schedule.assignedStaffId === project.assignedDesignerId),
    [calendarActor, project.assignedDesignerId, schedules],
  );

  useEffect(() => {
    setCalendarListDateKey(null);
  }, [calendarActor, project.projectId, statusFilter]);

  useEffect(() => {
    if (visibleCalendarSchedules.length === 0) {
      return;
    }

    const currentMonthHasSchedules = visibleCalendarSchedules.some((schedule) => {
      const scheduledDate = new Date(schedule.scheduledStart);

      return scheduledDate.getFullYear() === calendarMonth.getFullYear()
        && scheduledDate.getMonth() === calendarMonth.getMonth();
    });

    if (currentMonthHasSchedules) {
      return;
    }

    const firstScheduleDate = new Date(visibleCalendarSchedules[0].scheduledStart);
    setCalendarMonth(new Date(firstScheduleDate.getFullYear(), firstScheduleDate.getMonth(), 1));
  }, [calendarActor, calendarMonth, visibleCalendarSchedules]);

  function handleCreateSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');

    const form = event.currentTarget;
    const formData = new FormData(form);
    const assignedStaffId = project.assignedDesignerId;
    const scheduledStart = String(formData.get('scheduledStart') ?? '').trim();
    const scheduledEnd = String(formData.get('scheduledEnd') ?? '').trim();
    const scheduleType = scheduleTypeInput;

    if (!assignedStaffId) {
      setMessage('Please assign a designer to this project before creating a schedule.');
      return;
    }

    const dateRange = validateScheduleDateTimeRange(scheduledStart, scheduledEnd, { requireEnd: requiresCompleteScheduleWindow(scheduleType) });

    if (!dateRange.ok) {
      setMessage(dateRange.message);
      return;
    }

    void createSchedule({
      form,
      assignedStaffId,
      scheduleType,
      scheduledStart: dateRange.startIso,
      scheduledEnd: dateRange.endIso,
      title: String(formData.get('title') ?? '').trim() || defaultTitle,
      description: String(formData.get('description') ?? '').trim() || null,
      location: String(formData.get('location') ?? '').trim() || project.projectAddress,
    });
  }

  async function createSchedule(input: {
    form: HTMLFormElement;
    assignedStaffId: string;
    scheduleType: ProjectScheduleType;
    scheduledStart: string;
    scheduledEnd: string | null;
    title: string;
    description: string | null;
    location: string | null;
  }) {
    try {
      try {
        await createScheduleMutation.mutateAsync({
          projectId: project.projectId,
          scheduleType: input.scheduleType,
          title: input.title,
          description: input.description,
          assignedStaffId: input.assignedStaffId,
          scheduledStart: input.scheduledStart,
          scheduledEnd: input.scheduledEnd,
          location: input.location,
          customerNote: null,
          internalNote: null,
        });
      } catch (error) {
        setMessage(getProjectScheduleServiceResultMessage(error));
        return;
      }

      setMessage('Schedule created successfully.');
      input.form.reset();
      setScheduleTypeInput('MEASUREMENT');
      setScheduleStartInput('');
      setScheduleEndInput('');
      void schedulesQuery.refetch();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create this schedule. Please try again.');
    }
  }

  return (
    <section className="project-detail-card project-detail-tab-panel">
      <header className="project-detail-card-toolbar">
        <div>
          <h3>Project Schedules</h3>
          <p>{project.projectCode} - create schedules for the assigned project designer.</p>
        </div>
        <select className="project-detail-schedule-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ProjectScheduleStatus | '')}>
          <option value="">All statuses</option>
          {scheduleStatusOptions.map((status) => (
            <option key={status} value={status}>{formatEnumLabel(status)}</option>
          ))}
        </select>
      </header>

      <div className="project-detail-schedule-workspace">
        <form className="project-detail-schedule-form" onSubmit={handleCreateSchedule}>
          <h4>Create Schedule</h4>

          <p className={project.assignedDesignerId ? 'project-detail-muted' : 'project-detail-form-message project-detail-form-message-error'}>
            {project.assignedDesignerId
              ? 'This schedule will be assigned to the project designer.'
              : 'No designer is assigned to this project yet.'}
          </p>

          <div className="project-detail-schedule-form-grid">
            <label>
              <span>Schedule Type</span>
              <select
                name="scheduleType"
                value={scheduleTypeInput}
                disabled={createScheduleMutation.isPending}
                onChange={(event) => setScheduleTypeInput(event.target.value as ProjectScheduleType)}
              >
                {scheduleTypeOptions.map((type) => (
                  <option key={type} value={type}>{formatEnumLabel(type)}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Title</span>
              <input name="title" defaultValue={defaultTitle} placeholder={defaultTitle} type="text" disabled={createScheduleMutation.isPending} />
            </label>
          </div>

          <div className="project-detail-schedule-form-grid">
            <label>
              <span>Start</span>
              <input
                disabled={createScheduleMutation.isPending}
                name="scheduledStart"
                required
                type="datetime-local"
                value={scheduleStartInput}
                onChange={(event) => setScheduleStartInput(event.target.value)}
              />
            </label>
            <label>
              <span>End</span>
              <input
                disabled={createScheduleMutation.isPending}
                name="scheduledEnd"
                required={requiresCompleteScheduleWindow(scheduleTypeInput)}
                type="datetime-local"
                value={scheduleEndInput}
                onChange={(event) => setScheduleEndInput(event.target.value)}
              />
            </label>
          </div>

          <label>
            <span>Location</span>
            <input name="location" defaultValue={project.projectAddress ?? ''} placeholder={project.projectAddress ?? 'Meeting location'} type="text" disabled={createScheduleMutation.isPending} />
          </label>

          <label>
            <span>Description</span>
            <textarea name="description" placeholder="Schedule purpose and preparation notes" disabled={createScheduleMutation.isPending} />
          </label>

          {message ? <p className={`project-detail-form-message ${message.toLowerCase().includes('success') || message.toLowerCase().includes('created') ? '' : 'project-detail-form-message-error'}`}>{message}</p> : null}

          <button className="project-detail-primary-button" type="submit" disabled={!project.assignedDesignerId || createScheduleMutation.isPending}>
            {createScheduleMutation.isPending ? 'Creating...' : 'Create Schedule'}
          </button>
        </form>

        <div className="project-detail-schedule-list-panel">
          <div className="project-detail-schedule-list-header">
            <div>
              <h4>Current Schedules</h4>
              <p>GET /project-schedules?projectId={project.projectId}</p>
            </div>
            <span>{schedulesQuery.data?.total ?? 0} total</span>
          </div>

          {schedulesQuery.isLoading ? <p className="project-detail-muted">Loading project schedules...</p> : null}
          {schedulesQuery.isError ? <p className="project-detail-api-note">{getProjectScheduleServiceResultMessage(schedulesQuery.error)}</p> : null}

          <ProjectParticipantCalendar
            actor={calendarActor}
            listDateKey={calendarListDateKey}
            month={calendarMonth}
            project={project}
            schedules={visibleCalendarSchedules}
            totalProjectScheduleCount={schedules.length}
            onActorChange={setCalendarActor}
            onBackToCalendar={() => setCalendarListDateKey(null)}
            onMonthChange={setCalendarMonth}
            onOpenDateList={setCalendarListDateKey}
          />

          {schedules.length === 0 ? (
            <p className="project-detail-muted">No schedules have been created for this project yet.</p>
          ) : null}

          <div className="project-detail-schedule-list">
            {schedules.map((schedule) => (
              <article className="project-detail-schedule-card" key={schedule.scheduleId}>
                <div>
                  <div className="project-detail-schedule-title">
                    <h4>{schedule.title ?? formatEnumLabel(schedule.scheduleType)}</h4>
                    <span>{formatEnumLabel(schedule.scheduleType)}</span>
                  </div>
                  <p>{schedule.description ?? 'No description provided.'}</p>
                  <div className="project-detail-schedule-meta">
                    <span>{formatDateTime(schedule.scheduledStart)}</span>
                    {schedule.scheduledEnd ? <span>{formatDateTime(schedule.scheduledEnd)}</span> : null}
                    {schedule.location ? <span>{schedule.location}</span> : null}
                  </div>
                  {schedule.assignedStaffId ? (
                    <p className="project-detail-schedule-staff">
                      {schedule.assignedStaffId === project.assignedDesignerId ? 'Assigned to project designer' : 'Assigned staff'}
                    </p>
                  ) : null}
                </div>
                <strong>{formatEnumLabel(schedule.status)}</strong>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProjectParticipantCalendar({
  actor,
  listDateKey,
  month,
  onActorChange,
  onBackToCalendar,
  onMonthChange,
  onOpenDateList,
  project,
  schedules,
  totalProjectScheduleCount,
}: {
  actor: ProjectScheduleActor;
  listDateKey: string | null;
  month: Date;
  onActorChange: (actor: ProjectScheduleActor) => void;
  onBackToCalendar: () => void;
  onMonthChange: (month: Date) => void;
  onOpenDateList: (dateKey: string) => void;
  project: ProjectDetailProject;
  schedules: ProjectScheduleDto[];
  totalProjectScheduleCount: number;
}) {
  const schedulesByDate = useMemo(() => {
    const groups = new Map<string, ProjectScheduleDto[]>();

    schedules.forEach((schedule) => {
      const dateKey = getDateKey(new Date(schedule.scheduledStart));
      const dateSchedules = groups.get(dateKey) ?? [];

      groups.set(dateKey, [...dateSchedules, schedule]);
    });

    return groups;
  }, [schedules]);
  const listSchedules = listDateKey ? schedulesByDate.get(listDateKey) ?? [] : [];
  const currentMonthScheduleCount = useMemo(
    () => schedules.filter((schedule) => {
      const scheduledDate = new Date(schedule.scheduledStart);

      return scheduledDate.getFullYear() === month.getFullYear()
        && scheduledDate.getMonth() === month.getMonth();
    }).length,
    [month, schedules],
  );

  return (
    <section className="project-detail-schedule-calendar-card" aria-label="Project participant calendar">
      <header>
        <div>
          <span>Project Calendar</span>
          <h4>{actor === 'customer' ? 'Customer schedules' : 'Designer schedules'}</h4>
          <p>
            {schedules.length} visible / {totalProjectScheduleCount} project schedule(s).
            {actor === 'designer' && !project.assignedDesignerId ? ' No designer is assigned yet.' : ''}
          </p>
        </div>
        <div className="project-detail-schedule-calendar-tabs" role="tablist" aria-label="Participant schedules">
          <button className={actor === 'customer' ? 'is-active' : ''} type="button" role="tab" aria-selected={actor === 'customer'} onClick={() => onActorChange('customer')}>
            Customer
          </button>
          <button className={actor === 'designer' ? 'is-active' : ''} type="button" role="tab" aria-selected={actor === 'designer'} onClick={() => onActorChange('designer')}>
            Designer
          </button>
        </div>
      </header>

      {listDateKey ? (
        <div className="project-detail-schedule-calendar-list-view">
          <button className="project-detail-schedule-calendar-back" type="button" onClick={onBackToCalendar}>
            <IconChevronLeft size={16} />
            Back to calendar
          </button>
          <h5>{formatDateOnly(listDateKey)}</h5>
          {listSchedules.length === 0 ? <p className="project-detail-muted">No schedules on this date.</p> : null}
          <div className="project-detail-schedule-calendar-list">
            {listSchedules.map((schedule) => (
              <article key={schedule.scheduleId}>
                <strong>{formatTime(schedule.scheduledStart)} - {schedule.title ?? formatEnumLabel(schedule.scheduleType)}</strong>
                <span>{formatEnumLabel(schedule.status)} · {schedule.location ?? 'No location'}</span>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="project-detail-schedule-calendar-month-head">
            <button type="button" aria-label="Previous month" onClick={() => onMonthChange(moveMonth(month, -1))}>
              <IconChevronLeft size={16} />
            </button>
            <strong>{formatMonthYear(month)}</strong>
            <button type="button" aria-label="Next month" onClick={() => onMonthChange(moveMonth(month, 1))}>
              <IconChevronRight size={16} />
            </button>
          </div>
          {schedules.length > 0 && currentMonthScheduleCount === 0 ? (
            <p className="project-detail-schedule-calendar-empty-month">
              No {actor} schedules in {formatMonthYear(month)}. Use the month arrows or clear filters to inspect other dates.
            </p>
          ) : null}
          {schedules.length === 0 ? (
            <p className="project-detail-schedule-calendar-empty-month">
              {actor === 'designer'
                ? 'No schedules are assigned to the project designer under the current filters.'
                : 'No schedules are available for this project under the current filters.'}
            </p>
          ) : null}
          <div className="project-detail-schedule-calendar-weekdays" aria-hidden="true">
            {weekDays.map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="project-detail-schedule-calendar-grid">
            {getMonthDays(month).map(({ date, day, gridColumnStart }) => {
              const dateKey = getDateKey(date);
              const count = schedulesByDate.get(dateKey)?.length ?? 0;
              const isToday = dateKey === getDateKey(new Date());

              return (
                <button
                  className={[
                    'project-detail-schedule-calendar-day',
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

const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function getDefaultScheduleTitle(project: ProjectDetailProject) {
  return `${project.projectName} - designer schedule`;
}

function requiresCompleteScheduleWindow(scheduleType: ProjectScheduleType) {
  return scheduleType === 'MEASUREMENT' || scheduleType === 'DELIVERY';
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
