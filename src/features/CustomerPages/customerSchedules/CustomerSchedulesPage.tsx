import {
  IconCalendarEvent,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconHome,
  IconMapPin,
  IconSearch,
} from '@tabler/icons-react';
import { useQueries } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { CustomerNavbar } from '@/features/CustomerPages/customercomponents';
import {
  getProjectSchedules,
  getProjectScheduleServiceResultMessage,
  type ProjectScheduleDto,
  type ProjectScheduleStatus,
  type ProjectScheduleType,
} from '@/services/api/schedules';
import type { ProjectListItemDto } from '@/services/api/projects';
import { useProjectList } from '@/services/queries/useProjects';
import { projectScheduleQueryKeys, useUpdateProjectScheduleStatus } from '@/services/queries/useSchedules';

import './CustomerSchedulesPage.css';

type CustomerScheduleItem = {
  project: ProjectListItemDto;
  schedule: ProjectScheduleDto;
};

const scheduleTypeOptions: Array<ProjectScheduleType | ''> = ['', 'MEASUREMENT', 'CONSULTATION', 'DESIGN_REVIEW', 'DELIVERY', 'HANDOVER', 'OTHER'];
const scheduleStatusOptions: Array<ProjectScheduleStatus | ''> = ['', 'PENDING_CONFIRMATION', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CustomerSchedulesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [keyword, setKeyword] = useState('');
  const [scheduleType, setScheduleType] = useState<ProjectScheduleType | ''>('');
  const [status, setStatus] = useState<ProjectScheduleStatus | ''>('');
  const [selectedScheduleId, setSelectedScheduleId] = useState(searchParams.get('scheduleId') ?? '');
  const [selectedDateKey, setSelectedDateKey] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();

    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [message, setMessage] = useState('');
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const projectsQuery = useProjectList({ page: 1, limit: 100 });
  const projects = useMemo(() => (projectsQuery.data?.items ?? []).filter((project) => Boolean(project.projectId)), [projectsQuery.data?.items]);
  const scheduleQueries = useQueries({
    queries: projects.map((project) => {
      const params = {
        projectId: project.projectId,
        scheduleType: scheduleType || null,
        status: status || null,
        page: 1,
        limit: 100,
      };

      return {
        queryKey: projectScheduleQueryKeys.list(params),
        queryFn: () => getProjectSchedules(params),
      };
    }),
  });
  const updateStatusMutation = useUpdateProjectScheduleStatus();
  const schedules = useMemo<CustomerScheduleItem[]>(
    () =>
      scheduleQueries
        .flatMap((query, index) =>
          (query.data?.items ?? []).map((schedule) => ({
            project: projects[index],
            schedule,
          })),
        )
        .filter((item): item is CustomerScheduleItem => Boolean(item.project))
        .sort((left, right) => new Date(left.schedule.scheduledStart).getTime() - new Date(right.schedule.scheduledStart).getTime()),
    [projects, scheduleQueries],
  );
  const visibleSchedules = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    if (!normalizedKeyword) {
      return schedules;
    }

    return schedules.filter(({ project, schedule }) => {
      const searchableFields = [
        project.projectCode,
        project.projectName,
        schedule.title ?? '',
        schedule.description ?? '',
        schedule.customerNote ?? '',
        schedule.location ?? '',
        schedule.scheduleType,
        schedule.status,
      ];

      return searchableFields.some((value) => value.toLowerCase().includes(normalizedKeyword));
    });
  }, [keyword, schedules]);
  const selectedItem = visibleSchedules.find((item) => item.schedule.scheduleId === selectedScheduleId) ?? visibleSchedules[0] ?? null;
  const isLoading = projectsQuery.isLoading || scheduleQueries.some((query) => query.isLoading);
  const scheduleError = scheduleQueries.find((query) => query.isError)?.error;

  useEffect(() => {
    const scheduleId = searchParams.get('scheduleId') ?? '';

    if (scheduleId) {
      setSelectedScheduleId(scheduleId);
    }
  }, [searchParams]);

  function handleSelectSchedule(scheduleId: string) {
    setSelectedScheduleId(scheduleId);
    setSearchParams({ scheduleId });
    setMessage('');
  }

  function handleSelectCalendarDay(dateKey: string, daySchedules: CustomerScheduleItem[]) {
    setSelectedDateKey(dateKey);

    if (daySchedules[0]) {
      handleSelectSchedule(daySchedules[0].schedule.scheduleId);
    }
  }

  function handleMoveCalendarMonth(offset: number) {
    setCalendarMonth((currentMonth) => new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
  }

  async function handleConfirmSchedule(schedule: ProjectScheduleDto) {
    setMessage('');
    setActiveActionId(schedule.scheduleId);

    try {
      await updateStatusMutation.mutateAsync({
        scheduleId: schedule.scheduleId,
        status: 'CONFIRMED',
        note: 'Confirmed by customer from schedule management.',
      });
      setMessage('Schedule confirmed successfully.');
    } catch (error) {
      setMessage(getProjectScheduleServiceResultMessage(error));
    } finally {
      setActiveActionId(null);
    }
  }

  return (
    <main className="customer-schedules-page">
      <CustomerNavbar activeLabel="Schedules" classPrefix="customer-schedules" />

      <div className="customer-schedules-main">
        <div className="customer-schedules-breadcrumb">
          <a href="/customer/dashboard">
            <IconHome size={16} stroke={1.8} />
          </a>
          <IconChevronRight size={16} stroke={1.8} />
          <span>Schedules</span>
        </div>

        <section className="customer-schedules-heading">
          <div>
            <h1>Project Schedules</h1>
            <p>Review appointment details and confirm schedules sent by your project team.</p>
          </div>
        </section>

        <section className="customer-schedules-filters" aria-label="Schedule filters">
          <label>
            <IconSearch size={17} stroke={1.8} />
            <input type="search" placeholder="Search schedules..." value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          </label>
          <select value={scheduleType} onChange={(event) => setScheduleType(event.target.value as ProjectScheduleType | '')}>
            {scheduleTypeOptions.map((option) => (
              <option key={option || 'ALL'} value={option}>{option ? formatEnumLabel(option) : 'All types'}</option>
            ))}
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value as ProjectScheduleStatus | '')}>
            {scheduleStatusOptions.map((option) => (
              <option key={option || 'ALL'} value={option}>{option ? formatEnumLabel(option) : 'All statuses'}</option>
            ))}
          </select>
        </section>

        {message ? <p className={isActionError(message) ? 'customer-schedules-message customer-schedules-message-error' : 'customer-schedules-message'}>{message}</p> : null}
        {projectsQuery.isError ? <p className="customer-schedules-state customer-schedules-state-error">Could not load your projects.</p> : null}
        {scheduleError ? <p className="customer-schedules-state customer-schedules-state-error">{getProjectScheduleServiceResultMessage(scheduleError)}</p> : null}
        {isLoading ? <p className="customer-schedules-state">Loading schedules...</p> : null}

        <div className="customer-schedules-layout">
          <div className="customer-schedules-overview">
            <MonthlyScheduleCalendar
              month={calendarMonth}
              schedules={visibleSchedules}
              selectedDateKey={selectedDateKey}
              selectedScheduleId={selectedItem?.schedule.scheduleId ?? ''}
              onMoveMonth={handleMoveCalendarMonth}
              onSelectDay={handleSelectCalendarDay}
              onSelectSchedule={handleSelectSchedule}
            />
          </div>

          <section className="customer-schedules-detail" aria-label="Schedule detail">
            {selectedItem ? (
              <ScheduleDetail
                activeActionId={activeActionId}
                isUpdating={updateStatusMutation.isPending}
                item={selectedItem}
                onConfirm={() => void handleConfirmSchedule(selectedItem.schedule)}
              />
            ) : (
              <div className="customer-schedules-empty-detail">
                <IconCalendarEvent size={28} stroke={1.8} />
                <h2>No schedule selected</h2>
                <p>Select a schedule from the list to review its details.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

type MonthlyScheduleCalendarProps = {
  month: Date;
  schedules: CustomerScheduleItem[];
  selectedDateKey: string;
  selectedScheduleId: string;
  onMoveMonth: (offset: number) => void;
  onSelectDay: (dateKey: string, daySchedules: CustomerScheduleItem[]) => void;
  onSelectSchedule: (scheduleId: string) => void;
};

function MonthlyScheduleCalendar({
  month,
  schedules,
  selectedDateKey,
  selectedScheduleId,
  onMoveMonth,
  onSelectDay,
  onSelectSchedule,
}: MonthlyScheduleCalendarProps) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const todayKey = getDateKey(new Date());
  const scheduleMap = useMemo(() => {
    const nextMap = new Map<string, CustomerScheduleItem[]>();

    schedules.forEach((item) => {
      const dateKey = getDateKey(new Date(item.schedule.scheduledStart));
      const daySchedules = nextMap.get(dateKey) ?? [];

      nextMap.set(dateKey, [...daySchedules, item]);
    });

    return nextMap;
  }, [schedules]);

  return (
    <section className="customer-schedules-calendar" aria-label="Monthly schedule calendar">
      <div className="customer-schedules-calendar-head">
        <div>
          <span>Monthly overview</span>
          <h2>{formatMonthYear(month)}</h2>
        </div>
        <div className="customer-schedules-calendar-controls">
          <button type="button" aria-label="Previous month" onClick={() => onMoveMonth(-1)}>
            <IconChevronLeft size={18} stroke={1.8} />
          </button>
          <button type="button" aria-label="Next month" onClick={() => onMoveMonth(1)}>
            <IconChevronRight size={18} stroke={1.8} />
          </button>
        </div>
      </div>

      <div className="customer-schedules-calendar-weekdays" aria-hidden="true">
        {weekDays.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="customer-schedules-calendar-grid">
        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;
          const date = new Date(year, monthIndex, day);
          const dateKey = getDateKey(date);
          const daySchedules = scheduleMap.get(dateKey) ?? [];
          const isSelectedDate = selectedDateKey === dateKey;
          const className = [
            'customer-schedules-calendar-day',
            dateKey === todayKey ? 'customer-schedules-calendar-day-today' : '',
            isSelectedDate ? 'customer-schedules-calendar-day-selected' : '',
            daySchedules.length > 0 ? 'customer-schedules-calendar-day-has-events' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={dateKey}
              className={className}
              style={day === 1 ? { gridColumnStart: firstWeekday + 1 } : undefined}
              type="button"
              onClick={() => onSelectDay(dateKey, daySchedules)}
            >
              <span className="customer-schedules-calendar-day-number">{day}</span>
              <span className="customer-schedules-calendar-day-meta">
                {daySchedules.length > 0 ? `${daySchedules.length} schedule${daySchedules.length > 1 ? 's' : ''}` : 'No schedule'}
              </span>

              {daySchedules.length > 0 ? (
                <span className="customer-schedules-calendar-events">
                  {daySchedules.slice(0, 2).map(({ project, schedule }) => (
                    <span
                      className={`customer-schedules-calendar-event customer-schedules-calendar-event-${schedule.status.toLowerCase().replace(/_/g, '-')}${
                        selectedScheduleId === schedule.scheduleId ? ' customer-schedules-calendar-event-active' : ''
                      }`}
                      key={schedule.scheduleId}
                      role="button"
                      tabIndex={0}
                      title={`${schedule.title ?? formatEnumLabel(schedule.scheduleType)} - ${project.projectName}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectSchedule(schedule.scheduleId);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          event.stopPropagation();
                          onSelectSchedule(schedule.scheduleId);
                        }
                      }}
                    >
                      <strong>{formatTime(schedule.scheduledStart)}</strong>
                      <em>{schedule.title ?? formatEnumLabel(schedule.scheduleType)}</em>
                    </span>
                  ))}
                  {daySchedules.length > 2 ? <span className="customer-schedules-calendar-more">+{daySchedules.length - 2} more</span> : null}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

type ScheduleDetailProps = {
  activeActionId: string | null;
  isUpdating: boolean;
  item: CustomerScheduleItem;
  onConfirm: () => void;
};

function ScheduleDetail({ activeActionId, isUpdating, item, onConfirm }: ScheduleDetailProps) {
  const { project, schedule } = item;
  const canConfirm = schedule.status === 'PENDING_CONFIRMATION';

  return (
    <>
      <div className="customer-schedules-detail-head">
        <div>
          <span>{formatEnumLabel(schedule.scheduleType)}</span>
          <h2>{schedule.title ?? formatEnumLabel(schedule.scheduleType)}</h2>
          <p>{project.projectCode} - {project.projectName}</p>
        </div>
        <strong>{formatEnumLabel(schedule.status)}</strong>
      </div>

      <div className="customer-schedules-detail-grid">
        <div>
          <IconClock size={18} stroke={1.8} />
          <span>Start</span>
          <strong>{formatDateTime(schedule.scheduledStart)}</strong>
        </div>
        <div>
          <IconClock size={18} stroke={1.8} />
          <span>End</span>
          <strong>{schedule.scheduledEnd ? formatDateTime(schedule.scheduledEnd) : 'Not specified'}</strong>
        </div>
        <div>
          <IconMapPin size={18} stroke={1.8} />
          <span>Location</span>
          <strong>{schedule.location ?? 'Not specified'}</strong>
        </div>
        <div>
          <IconCalendarEvent size={18} stroke={1.8} />
          <span>Project</span>
          <strong>{project.projectName}</strong>
        </div>
      </div>

      <div className="customer-schedules-notes">
        <h3>Details</h3>
        <p>{schedule.customerNote || schedule.description || 'No additional schedule details were provided.'}</p>
      </div>

      {canConfirm ? (
        <div className="customer-schedules-actions">
          <button disabled={isUpdating} type="button" onClick={onConfirm}>
            <IconCheck size={16} stroke={2} />
            {activeActionId === schedule.scheduleId && isUpdating ? 'Confirming...' : 'Confirm'}
          </button>
        </div>
      ) : null}
    </>
  );
}

function isActionError(message: string) {
  const normalized = message.toLowerCase();

  return !normalized.includes('success');
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
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

function formatMonthYear(value: Date) {
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
  }).format(value);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
