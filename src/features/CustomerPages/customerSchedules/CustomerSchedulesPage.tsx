import {
  IconCalendarEvent,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconMapPin,
  IconSearch,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useLang, type Lang } from '@/app/providers/useLang';
import { CustomerNavbar, customerCopy } from '@/features/CustomerPages/customercomponents';
import { formatCustomerDateTime } from '@/features/CustomerPages/utils';
import {
  getProjectScheduleServiceResultMessage,
  type ProjectScheduleDto,
  type ProjectScheduleStatus,
  type ProjectScheduleType,
} from '@/services/api/schedules';
import type { ProjectListItemDto } from '@/services/api/projects';
import {
  useMultiProjectSchedules,
  useProjectList,
  useRequestProjectScheduleChange,
  useUpdateProjectScheduleStatus,
} from '@/services/queries';
import { isScheduleVisible } from '@/shared/utils/scheduleVisibility';

import './CustomerSchedulesPage.css';

type CustomerScheduleItem = {
  project: ProjectListItemDto;
  schedule: ProjectScheduleDto;
};

const scheduleTypeOptions: Array<ProjectScheduleType | ''> = ['', 'MEASUREMENT', 'CONSULTATION', 'DESIGN_REVIEW', 'DELIVERY', 'HANDOVER', 'OTHER'];
const scheduleStatusOptions: Array<ProjectScheduleStatus | ''> = ['', 'PENDING_CONFIRMATION', 'CONFIRMED', 'CANCELLED'];

export function CustomerSchedulesPage() {
  const { lang } = useLang();
  const t = customerCopy[lang];
  const [searchParams, setSearchParams] = useSearchParams();
  const [keyword, setKeyword] = useState('');
  const [scheduleType, setScheduleType] = useState<ProjectScheduleType | ''>('');
  const [status, setStatus] = useState<ProjectScheduleStatus | ''>('');
  const [selectedScheduleId, setSelectedScheduleId] = useState(searchParams.get('scheduleId') ?? '');
  const [selectedDateKey, setSelectedDateKey] = useState(() => getDateKey(new Date()));
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();

    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [message, setMessage] = useState('');
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [requestChangeNotes, setRequestChangeNotes] = useState<Record<string, string>>({});
  const projectsQuery = useProjectList({ page: 1, limit: 100 });
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
  const requestChangeMutation = useRequestProjectScheduleChange();
  const schedules = useMemo<CustomerScheduleItem[]>(
    () =>
      (schedulesQuery.data ?? [])
        .map((schedule) => {
          const project = projectById[schedule.projectId];

          if (!project) {
            return null;
          }

          return { project, schedule };
        })
        .filter((item): item is CustomerScheduleItem => item !== null)
        .filter(({ schedule }) => isScheduleVisible(schedule.status))
        .sort((left, right) => new Date(left.schedule.scheduledStart).getTime() - new Date(right.schedule.scheduledStart).getTime()),
    [projectById, schedulesQuery.data],
  );
  const visibleSchedules = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return schedules.filter(({ project, schedule }) => {
      if (scheduleType && schedule.scheduleType !== scheduleType) {
        return false;
      }

      if (status && schedule.status !== status) {
        return false;
      }

      if (!normalizedKeyword) {
        return true;
      }

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
  }, [keyword, scheduleType, schedules, status]);
  const schedulesByDate = useMemo(() => {
    const groups = new Map<string, CustomerScheduleItem[]>();

    visibleSchedules.forEach((item) => {
      const dateKey = getDateKey(new Date(item.schedule.scheduledStart));
      const daySchedules = groups.get(dateKey) ?? [];

      groups.set(dateKey, [...daySchedules, item]);
    });

    return groups;
  }, [visibleSchedules]);
  const selectedItem = useMemo(
    () => visibleSchedules.find((item) => item.schedule.scheduleId === selectedScheduleId)
      ?? schedulesByDate.get(selectedDateKey)?.[0]
      ?? null,
    [schedulesByDate, selectedDateKey, selectedScheduleId, visibleSchedules],
  );
  const isLoading = projectsQuery.isLoading || schedulesQuery.isLoading;
  const scheduleError = schedulesQuery.error;

  useEffect(() => {
    const scheduleId = searchParams.get('scheduleId') ?? '';

    if (scheduleId) {
      setSelectedScheduleId(scheduleId);
    }
  }, [searchParams]);

  function handleSelectSchedule(scheduleId: string, dateKey?: string) {
    setSelectedScheduleId(scheduleId);

    if (dateKey) {
      setSelectedDateKey(dateKey);
    }

    setSearchParams({ scheduleId });
    setMessage('');
  }

  function handleSelectCalendarDay(dateKey: string, daySchedules: CustomerScheduleItem[]) {
    setSelectedDateKey(dateKey);

    if (daySchedules[0]) {
      handleSelectSchedule(daySchedules[0].schedule.scheduleId, dateKey);
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
      setMessage(t.schedules.confirmedToast);
    } catch (error) {
      setMessage(getProjectScheduleServiceResultMessage(error));
    } finally {
      setActiveActionId(null);
    }
  }

  async function handleRequestScheduleChange(schedule: ProjectScheduleDto) {
    const note = requestChangeNotes[schedule.scheduleId]?.trim();

    setMessage('');
    setActiveActionId(schedule.scheduleId);

    try {
      await requestChangeMutation.mutateAsync({
        scheduleId: schedule.scheduleId,
        note,
      });
      setRequestChangeNotes((current) => ({ ...current, [schedule.scheduleId]: '' }));
      setMessage(t.schedules.changeRequestSentToast);
    } catch (error) {
      setMessage(getProjectScheduleServiceResultMessage(error));
    } finally {
      setActiveActionId(null);
    }
  }

  return (
    <main className="customer-schedules-page">
      <CustomerNavbar activeKey="schedules" classPrefix="customer-schedules" />

      <div className="customer-schedules-main">
        <section className="customer-schedules-heading">
          <div>
            <h1>{t.schedules.title}</h1>
          </div>
        </section>

        <section className="customer-schedules-filters" aria-label="Schedule filters">
          <label>
            <IconSearch size={17} stroke={1.8} />
            <input type="search" placeholder={t.schedules.searchPlaceholder} value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          </label>
          <select value={scheduleType} onChange={(event) => setScheduleType(event.target.value as ProjectScheduleType | '')}>
            {scheduleTypeOptions.map((option) => (
              <option key={option || 'ALL'} value={option}>{option ? formatEnumLabel(option) : t.schedules.allTypes}</option>
            ))}
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value as ProjectScheduleStatus | '')}>
            {scheduleStatusOptions.map((option) => (
              <option key={option || 'ALL'} value={option}>{option ? formatEnumLabel(option) : t.schedules.allStatuses}</option>
            ))}
          </select>
        </section>

        {message ? <p className={isActionError(message) ? 'customer-schedules-message customer-schedules-message-error' : 'customer-schedules-message'}>{message}</p> : null}
        {projectsQuery.isError ? <p className="customer-schedules-state customer-schedules-state-error">Could not load your projects.</p> : null}
        {scheduleError ? <p className="customer-schedules-state customer-schedules-state-error">{getProjectScheduleServiceResultMessage(scheduleError)}</p> : null}
        {isLoading ? <p className="customer-schedules-state">{t.common.loading}</p> : null}

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
                isUpdating={updateStatusMutation.isPending || requestChangeMutation.isPending}
                item={selectedItem}
                requestChangeNote={requestChangeNotes[selectedItem.schedule.scheduleId] ?? ''}
                onConfirm={() => void handleConfirmSchedule(selectedItem.schedule)}
                onRequestChange={() => void handleRequestScheduleChange(selectedItem.schedule)}
                onRequestChangeNoteChange={(value) => setRequestChangeNotes((current) => ({ ...current, [selectedItem.schedule.scheduleId]: value }))}
              />
            ) : (
              <div className="customer-schedules-empty-detail">
                <IconCalendarEvent size={28} stroke={1.8} />
                <h2>{t.schedules.noScheduleSelected}</h2>
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
  onSelectSchedule: (scheduleId: string, dateKey: string) => void;
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
  const { lang } = useLang();
  const t = customerCopy[lang];
  const weekDays = [t.schedules.sun, t.schedules.mon, t.schedules.tue, t.schedules.wed, t.schedules.thu, t.schedules.fri, t.schedules.sat];
  const [expandedDateKey, setExpandedDateKey] = useState<string | null>(null);
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

  useEffect(() => {
    setExpandedDateKey(null);
  }, [month]);

  return (
    <section className="customer-schedules-calendar" aria-label="Monthly schedule calendar">
      <div className="customer-schedules-calendar-head">
        <div>
          <span>{t.schedules.monthlyOverview}</span>
          <h2>{formatMonthYear(month, lang)}</h2>
        </div>
        <div className="customer-schedules-calendar-controls">
          <button type="button" aria-label={t.common.previous} onClick={() => onMoveMonth(-1)}>
            <IconChevronLeft size={18} stroke={1.8} />
          </button>
          <button type="button" aria-label={t.common.next} onClick={() => onMoveMonth(1)}>
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
          const isExpanded = expandedDateKey === dateKey;
          const visibleDaySchedules = isExpanded ? daySchedules : daySchedules.slice(0, 2);
          const hiddenCount = daySchedules.length - visibleDaySchedules.length;
          const className = [
            'customer-schedules-calendar-day',
            dateKey === todayKey ? 'customer-schedules-calendar-day-today' : '',
            isSelectedDate ? 'customer-schedules-calendar-day-selected' : '',
            daySchedules.length > 0 ? 'customer-schedules-calendar-day-has-events' : '',
            isExpanded ? 'customer-schedules-calendar-day-expanded' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <div
              key={dateKey}
              className={className}
              style={day === 1 ? { gridColumnStart: firstWeekday + 1 } : undefined}
            >
              <button
                className="customer-schedules-calendar-day-summary"
                type="button"
                onClick={() => onSelectDay(dateKey, daySchedules)}
              >
                <span className="customer-schedules-calendar-day-number">{day}</span>
                <span className="customer-schedules-calendar-day-meta">
                  {daySchedules.length > 0 ? t.schedules.scheduleCount(daySchedules.length) : t.schedules.noSchedule}
                </span>
              </button>

              {daySchedules.length > 0 ? (
                <span className="customer-schedules-calendar-events">
                  {visibleDaySchedules.map(({ project, schedule }) => (
                    <button
                      className={`customer-schedules-calendar-event customer-schedules-calendar-event-${schedule.status.toLowerCase().replace(/_/g, '-')}${
                        selectedScheduleId === schedule.scheduleId ? ' customer-schedules-calendar-event-active' : ''
                      }`}
                      key={schedule.scheduleId}
                      title={`${schedule.title ?? formatEnumLabel(schedule.scheduleType)} - ${project.projectName}`}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectSchedule(schedule.scheduleId, dateKey);
                      }}
                    >
                      <strong>{formatTime(schedule.scheduledStart, lang)}</strong>
                      <em>{schedule.title ?? formatEnumLabel(schedule.scheduleType)}</em>
                    </button>
                  ))}
                  {daySchedules.length > 2 ? (
                    <button
                      aria-expanded={isExpanded}
                      className="customer-schedules-calendar-more"
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
  );
}

type ScheduleDetailProps = {
  activeActionId: string | null;
  isUpdating: boolean;
  item: CustomerScheduleItem;
  requestChangeNote: string;
  onConfirm: () => void;
  onRequestChange: () => void;
  onRequestChangeNoteChange: (value: string) => void;
};

function ScheduleDetail({
  activeActionId,
  isUpdating,
  item,
  onConfirm,
  onRequestChange,
  onRequestChangeNoteChange,
  requestChangeNote,
}: ScheduleDetailProps) {
  const { lang } = useLang();
  const t = customerCopy[lang];
  const { project, schedule } = item;
  const canConfirm = schedule.status === 'PENDING_CONFIRMATION';
  const canRequestDeliveryChange = schedule.scheduleType === 'DELIVERY'
    && schedule.status === 'PENDING_CONFIRMATION';

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
          <span>{t.schedules.start}</span>
          <strong>{formatCustomerDateTime(schedule.scheduledStart, lang)}</strong>
        </div>
        <div>
          <IconClock size={18} stroke={1.8} />
          <span>{t.schedules.end}</span>
          <strong>{schedule.scheduledEnd ? formatCustomerDateTime(schedule.scheduledEnd, lang) : t.common.notSpecified}</strong>
        </div>
        <div>
          <IconMapPin size={18} stroke={1.8} />
          <span>{t.schedules.location}</span>
          <strong>{schedule.location ?? t.common.notSpecified}</strong>
        </div>
        <div>
          <IconCalendarEvent size={18} stroke={1.8} />
          <span>{t.schedules.project}</span>
          <strong>{project.projectName}</strong>
        </div>
      </div>

      <div className="customer-schedules-notes">
        <h3>{t.schedules.details}</h3>
        <p>{schedule.customerNote || schedule.description || t.schedules.noAdditionalDetails}</p>
      </div>

      {canRequestDeliveryChange ? (
        <label className="customer-schedules-change-note">
          <span>{t.schedules.deliveryChangeRequest}</span>
          <textarea
            disabled={isUpdating}
            placeholder={t.schedules.changePlaceholder}
            rows={3}
            value={requestChangeNote}
            onChange={(event) => onRequestChangeNoteChange(event.target.value)}
          />
        </label>
      ) : null}

      {canConfirm || canRequestDeliveryChange ? (
        <div className="customer-schedules-actions">
          {canConfirm ? (
            <button disabled={isUpdating} type="button" onClick={onConfirm}>
              <IconCheck size={16} stroke={2} />
              {activeActionId === schedule.scheduleId && isUpdating ? t.common.confirming : t.schedules.confirm}
            </button>
          ) : null}
          {canRequestDeliveryChange ? (
            <button className="is-secondary" disabled={isUpdating} type="button" onClick={onRequestChange}>
              {activeActionId === schedule.scheduleId && isUpdating ? t.common.send : t.schedules.requestChange}
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function isActionError(message: string) {
  const normalized = message.toLowerCase();

  return !normalized.includes('success') && !normalized.includes('thành công');
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatMonthYear(value: Date, lang: Lang) {
  return new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en', {
    month: 'long',
    year: 'numeric',
  }).format(value);
}

function formatTime(value: string, lang: Lang) {
  return new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en', {
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
