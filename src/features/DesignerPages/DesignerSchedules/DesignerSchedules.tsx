import { IconCalendar, IconCheck, IconChevronLeft, IconChevronRight, IconClock, IconMapPin, IconUsers } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { DesignerLayout } from '@/features/DesignerPages/designercomponents';
import { getProjectScheduleServiceResultMessage } from '@/services/api/schedules';
import type { ProjectScheduleDto, ProjectScheduleStatus } from '@/services/api/schedules';
import { useMyAssignedProjectSchedules, useProjectDetail, useUpdateProjectScheduleStatus } from '@/services/queries';

import './DesignerSchedules.css';

const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const scheduleStatusLegend: ProjectScheduleStatus[] = ['PENDING_CONFIRMATION', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

export function DesignerSchedules() {
  const [statusMessage, setStatusMessage] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();

    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState(() => getDateKey(new Date()));
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [expandedDateKey, setExpandedDateKey] = useState<string | null>(null);
  const schedulesQuery = useMyAssignedProjectSchedules(
    {
      page: 1,
      limit: 100,
    },
    { fetchAll: true, staleTime: 60_000 },
  );
  const schedules = useMemo(() => schedulesQuery.data?.items ?? [], [schedulesQuery.data?.items]);
  const updateScheduleStatusMutation = useUpdateProjectScheduleStatus();
  const schedulesByDate = useMemo(() => {
    const groups = new Map<string, ProjectScheduleDto[]>();

    schedules.forEach((schedule) => {
      const dateKey = getDateKey(new Date(schedule.scheduledStart));
      const daySchedules = groups.get(dateKey) ?? [];

      groups.set(dateKey, [...daySchedules, schedule]);
    });

    return groups;
  }, [schedules]);
  const selectedSchedule = useMemo(
    () => schedules.find((schedule) => schedule.scheduleId === selectedScheduleId)
      ?? schedulesByDate.get(selectedDateKey)?.[0]
      ?? null,
    [schedules, schedulesByDate, selectedDateKey, selectedScheduleId],
  );
  const selectedProjectQuery = useProjectDetail(selectedSchedule?.projectId);

  async function handleCompleteSchedule(scheduleId: string) {
    setStatusMessage('');

    try {
      await updateScheduleStatusMutation.mutateAsync({
        scheduleId,
        status: 'COMPLETED',
        note: 'Designer marked the schedule as completed.',
      });
      setStatusMessage('Schedule completed successfully.');
    } catch (error) {
      setStatusMessage(getProjectScheduleServiceResultMessage(error));
    }
  }

  return (
    <DesignerLayout activeLabel="My Schedule">
      <section className="designer-schedules-header">
        <h2>Schedules</h2>
        <div className="designer-schedules-legend" aria-label="Schedule status legend">
          {scheduleStatusLegend.map((legendStatus) => (
            <span className={`designer-schedules-legend-item designer-schedules-legend-item-${legendStatus.toLowerCase().replace(/_/g, '-')}`} key={legendStatus}>
              {formatEnumLabel(legendStatus)}
            </span>
          ))}
        </div>
      </section>

      {schedulesQuery.isError ? (
        <section className="designer-card designer-schedules-message designer-schedules-error">
          {getProjectScheduleServiceResultMessage(schedulesQuery.error)}
        </section>
      ) : null}

      {statusMessage ? (
        <section className={`designer-card designer-schedules-status-message ${statusMessage.toLowerCase().includes('success') ? 'designer-schedules-success' : 'designer-schedules-error'}`}>
          {statusMessage}
        </section>
      ) : null}

      <section className="designer-schedules-calendar-layout">
        <section className="designer-card designer-schedules-calendar" aria-label="Monthly schedule calendar">
          <div className="designer-schedules-calendar-head">
            <div>
              <span>Monthly overview</span>
              <h3>{formatMonthYear(calendarMonth)}</h3>
            </div>
            <div className="designer-schedules-calendar-controls">
              <button type="button" aria-label="Previous month" onClick={() => setCalendarMonth(moveMonth(calendarMonth, -1))}>
                <IconChevronLeft size={18} />
              </button>
              <button type="button" aria-label="Next month" onClick={() => setCalendarMonth(moveMonth(calendarMonth, 1))}>
                <IconChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="designer-schedules-calendar-weekdays" aria-hidden="true">
            {weekDays.map((day) => <span key={day}>{day}</span>)}
          </div>

          <div className="designer-schedules-calendar-grid">
            {getMonthDays(calendarMonth).map(({ date, day, gridColumnStart }) => {
              const dateKey = getDateKey(date);
              const daySchedules = schedulesByDate.get(dateKey) ?? [];
              const isToday = dateKey === getDateKey(new Date());
              const isSelected = selectedDateKey === dateKey;
              const isExpanded = expandedDateKey === dateKey;
              const visibleDaySchedules = isExpanded ? daySchedules : daySchedules.slice(0, 2);
              const hiddenCount = daySchedules.length - visibleDaySchedules.length;
              const dayClassName = [
                'designer-schedules-calendar-day',
                isToday ? 'designer-schedules-calendar-day-today' : '',
                isSelected ? 'designer-schedules-calendar-day-selected' : '',
                daySchedules.length > 0 ? 'designer-schedules-calendar-day-has-events' : '',
                isExpanded ? 'designer-schedules-calendar-day-expanded' : '',
              ].filter(Boolean).join(' ');

              return (
                <div
                  className={dayClassName}
                  key={dateKey}
                  style={gridColumnStart ? { gridColumnStart } : undefined}
                >
                  <button
                    className="designer-schedules-calendar-day-summary"
                    type="button"
                    onClick={() => {
                      setSelectedDateKey(dateKey);
                      setSelectedScheduleId(daySchedules[0]?.scheduleId ?? null);
                    }}
                  >
                    <span className="designer-schedules-calendar-day-number">{day}</span>
                    <span className="designer-schedules-calendar-day-meta">
                      {daySchedules.length > 0 ? `${daySchedules.length} schedule${daySchedules.length > 1 ? 's' : ''}` : 'No schedule'}
                    </span>
                  </button>
                  {daySchedules.length > 0 ? (
                    <span className="designer-schedules-calendar-events">
                      {visibleDaySchedules.map((schedule) => (
                        <button
                          className={`designer-schedules-calendar-event designer-schedules-calendar-event-${schedule.status.toLowerCase().replace(/_/g, '-')}${selectedSchedule?.scheduleId === schedule.scheduleId ? ' designer-schedules-calendar-event-active' : ''}`}
                          key={schedule.scheduleId}
                          title={`${schedule.title ?? formatEnumLabel(schedule.scheduleType)} - ${formatTime(schedule.scheduledStart)}`}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedDateKey(dateKey);
                            setSelectedScheduleId(schedule.scheduleId);
                          }}
                        >
                          <strong>{formatTime(schedule.scheduledStart)}</strong>
                          <em>{schedule.title ?? formatEnumLabel(schedule.scheduleType)}</em>
                        </button>
                      ))}
                      {daySchedules.length > 2 ? (
                        <button
                          aria-expanded={isExpanded}
                          className="designer-schedules-calendar-more"
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

        <section className="designer-card designer-schedules-detail">
          {selectedSchedule ? (
            <ScheduleDetail
              isUpdating={updateScheduleStatusMutation.isPending}
              project={selectedProjectQuery.data}
              schedule={selectedSchedule}
              onComplete={() => void handleCompleteSchedule(selectedSchedule.scheduleId)}
            />
          ) : (
            <div className="designer-schedules-empty-detail">
              <IconCalendar size={32} />
              <h3>No schedule selected</h3>
              <p>Select a schedule from the calendar to review its details.</p>
            </div>
          )}
        </section>
      </section>
    </DesignerLayout>
  );
}

type ScheduleDetailProps = {
  isUpdating: boolean;
  project: { projectCode: string; projectName: string } | undefined;
  schedule: ProjectScheduleDto;
  onComplete: () => void;
};

function ScheduleDetail({ isUpdating, project, schedule, onComplete }: ScheduleDetailProps) {
  const canComplete = schedule.status === 'CONFIRMED' && schedule.scheduleType !== 'DELIVERY' && Date.now() >= new Date(schedule.scheduledStart).getTime();

  return (
    <>
      <div className="designer-schedules-detail-head">
        <div>
          <span>{formatEnumLabel(schedule.scheduleType)}</span>
          <h3>{schedule.title ?? formatEnumLabel(schedule.scheduleType)}</h3>
          <p>{project ? `${project.projectCode} - ${project.projectName}` : `Project ${schedule.projectId}`}</p>
        </div>
        <strong>{formatEnumLabel(schedule.status)}</strong>
      </div>

      <div className="designer-schedules-detail-grid">
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
          <IconUsers size={18} />
          <span>Assignment</span>
          <strong>Assigned to you</strong>
        </div>
      </div>

      <div className="designer-schedules-notes">
        <h4>Details</h4>
        <p>{schedule.description || 'No additional schedule details were provided.'}</p>
      </div>

      <div className="designer-schedules-detail-actions">
        {schedule.status === 'CONFIRMED' ? (
          <button className="designer-schedule-confirm" disabled={isUpdating || !canComplete} type="button" onClick={onComplete}>
            <IconCheck size={16} />
            {isUpdating ? 'Completing...' : 'Complete Schedule'}
          </button>
        ) : null}
        <Link className="designer-schedule-open" to={`/designer/assigned-projects/${schedule.projectId}`}>Open project</Link>
      </div>
    </>
  );
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
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
