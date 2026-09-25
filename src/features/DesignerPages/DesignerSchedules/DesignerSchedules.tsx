import { IconCalendar, IconCheck, IconChevronLeft, IconChevronRight, IconClock, IconMapPin, IconUsers } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useLang } from '@/app/providers/useLang';
import { DesignerLayout, designerCopy } from '@/features/DesignerPages/designercomponents';
import { getProjectScheduleServiceResultMessage } from '@/services/api/schedules';
import type { ProjectScheduleDto, ProjectScheduleStatus } from '@/services/api/schedules';
import { useMyAssignedProjectSchedules, useProjectDetail, useUpdateProjectScheduleStatus } from '@/services/queries';

import './DesignerSchedules.css';

const scheduleStatusLegend: ProjectScheduleStatus[] = ['PENDING_CONFIRMATION', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

export function DesignerSchedules() {
  const { lang } = useLang();
  const t = designerCopy[lang];
  const [statusMessage, setStatusMessage] = useState('');
  const [statusIsSuccess, setStatusIsSuccess] = useState(false);
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
  const schedules = useMemo(
    () => [...(schedulesQuery.data?.items ?? [])].sort((left, right) => (
      new Date(left.scheduledStart).getTime() - new Date(right.scheduledStart).getTime()
    )),
    [schedulesQuery.data?.items],
  );
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
    setStatusIsSuccess(false);

    try {
      await updateScheduleStatusMutation.mutateAsync({
        scheduleId,
        status: 'COMPLETED',
        note: t.schedules.completeNote,
      });
      setSelectedScheduleId(scheduleId);
      setStatusMessage(t.schedules.completedSuccess);
      setStatusIsSuccess(true);
      void schedulesQuery.refetch();
    } catch (error) {
      setStatusMessage(getProjectScheduleServiceResultMessage(error));
      setStatusIsSuccess(false);
    }
  }

  return (
    <DesignerLayout activeKey="schedules">
      <section className="designer-schedules-header">
        <h2>{t.schedules.title}</h2>
        <div className="designer-schedules-legend" aria-label={t.schedules.legendAria}>
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
        <section className={`designer-card designer-schedules-status-message ${statusIsSuccess ? 'designer-schedules-success' : 'designer-schedules-error'}`}>
          {statusMessage}
        </section>
      ) : null}

      <section className="designer-schedules-calendar-layout">
        <section className="designer-card designer-schedules-calendar" aria-label={t.schedules.monthlyOverview}>
          <div className="designer-schedules-calendar-head">
            <div>
              <span>{t.schedules.monthlyOverview}</span>
              <h3>{formatMonthYear(calendarMonth, lang)}</h3>
            </div>
            <div className="designer-schedules-calendar-controls">
              <button type="button" aria-label={t.schedules.prevMonth} onClick={() => setCalendarMonth(moveMonth(calendarMonth, -1))}>
                <IconChevronLeft size={18} />
              </button>
              <button type="button" aria-label={t.schedules.nextMonth} onClick={() => setCalendarMonth(moveMonth(calendarMonth, 1))}>
                <IconChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="designer-schedules-calendar-weekdays" aria-hidden="true">
            {t.schedules.weekdays.map((day) => <span key={day}>{day}</span>)}
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
                      {daySchedules.length > 0 ? t.schedules.scheduleCount(daySchedules.length) : t.schedules.noSchedule}
                    </span>
                  </button>
                  {daySchedules.length > 0 ? (
                    <span className="designer-schedules-calendar-events">
                      {visibleDaySchedules.map((schedule) => (
                        <button
                          className={`designer-schedules-calendar-event designer-schedules-calendar-event-${schedule.status.toLowerCase().replace(/_/g, '-')}${selectedSchedule?.scheduleId === schedule.scheduleId ? ' designer-schedules-calendar-event-active' : ''}`}
                          key={schedule.scheduleId}
                          title={`${schedule.title ?? formatEnumLabel(schedule.scheduleType)} - ${formatTime(schedule.scheduledStart, lang)}`}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedDateKey(dateKey);
                            setSelectedScheduleId(schedule.scheduleId);
                          }}
                        >
                          <strong>{formatTime(schedule.scheduledStart, lang)}</strong>
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
                          {isExpanded ? t.schedules.showLess : t.schedules.more(hiddenCount)}
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
              <h3>{t.schedules.emptyTitle}</h3>
              <p>{t.schedules.emptyHint}</p>
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
  const { lang } = useLang();
  const t = designerCopy[lang];
  const canComplete = schedule.status === 'CONFIRMED' && schedule.scheduleType !== 'DELIVERY';

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
          <span>{t.schedules.start}</span>
          <strong>{formatDateTime(schedule.scheduledStart, lang)}</strong>
        </div>
        <div>
          <IconClock size={18} />
          <span>{t.schedules.end}</span>
          <strong>{schedule.scheduledEnd ? formatDateTime(schedule.scheduledEnd, lang) : t.schedules.notSpecified}</strong>
        </div>
        <div>
          <IconMapPin size={18} />
          <span>{t.schedules.location}</span>
          <strong>{schedule.location ?? t.schedules.notSpecified}</strong>
        </div>
        <div>
          <IconUsers size={18} />
          <span>{t.schedules.assignment}</span>
          <strong>{t.schedules.assignedToYou}</strong>
        </div>
      </div>

      <div className="designer-schedules-notes">
        <h4>{t.schedules.details}</h4>
        <p>{schedule.description || t.schedules.noDetails}</p>
      </div>

      <div className="designer-schedules-detail-actions">
        {canComplete ? (
          <button className="designer-schedule-confirm" disabled={isUpdating || !canComplete} type="button" onClick={onComplete}>
            <IconCheck size={16} />
            {isUpdating ? t.schedules.completing : t.schedules.completeSchedule}
          </button>
        ) : null}
        <Link className="designer-schedule-open" to={`/designer/assigned-projects/${schedule.projectId}`}>{t.schedules.openProject}</Link>
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

function formatMonthYear(value: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en', {
    month: 'long',
    year: 'numeric',
  }).format(value);
}

function formatTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en', {
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
