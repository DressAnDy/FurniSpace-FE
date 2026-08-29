import { IconCalendarEvent, IconClock, IconMapPin, IconUsers } from '@tabler/icons-react';
import { useMemo, useState, type ReactNode } from 'react';

import type { ProjectDto } from '@/services/api/projects';
import { getProjectScheduleServiceResultMessage } from '@/services/api/schedules';
import { useProjectScheduleList, useUpdateProjectScheduleStatus } from '@/services/queries';
import { isScheduleVisible } from '@/shared/utils/scheduleVisibility';

type SchedulesTabProps = {
  project: ProjectDto;
};

export function SchedulesTab({ project }: Readonly<SchedulesTabProps>) {
  const [statusMessage, setStatusMessage] = useState('');
  const [hiddenCompletedScheduleIds, setHiddenCompletedScheduleIds] = useState<Set<string>>(() => new Set());
  const schedulesQuery = useProjectScheduleList(
    {
      projectId: project.projectId,
      page: 1,
      limit: 100,
    },
    { fetchAll: true, staleTime: 60_000 },
  );
  const schedules = useMemo(
    () => (schedulesQuery.data?.items ?? []).filter((schedule) => (
      isScheduleVisible(schedule.status) && !hiddenCompletedScheduleIds.has(schedule.scheduleId)
    )),
    [hiddenCompletedScheduleIds, schedulesQuery.data?.items],
  );
  const updateScheduleStatusMutation = useUpdateProjectScheduleStatus();

  async function handleCompleteSchedule(scheduleId: string) {
    setStatusMessage('');

    try {
      await updateScheduleStatusMutation.mutateAsync({
        scheduleId,
        status: 'COMPLETED',
        note: 'Designer marked the schedule as completed from project detail.',
      });
      setHiddenCompletedScheduleIds((current) => new Set(current).add(scheduleId));
      setStatusMessage('Schedule completed successfully.');
      void schedulesQuery.refetch();
    } catch (error) {
      setStatusMessage(getProjectScheduleServiceResultMessage(error));
    }
  }

  return (
    <section className="designer-card designer-project-section-card">
      <div className="designer-project-section-toolbar">
        <div>
          <h3>Schedules</h3><p>{project.projectCode} - project meetings and design review sessions.</p>
        </div>
      </div>

      {schedulesQuery.isLoading ? <p className="designer-project-empty-text">Loading project schedules...</p> : null}
      {schedulesQuery.isError ? <p className="designer-project-empty-text designer-project-state-error">{getProjectScheduleServiceResultMessage(schedulesQuery.error)}</p> : null}
      {!schedulesQuery.isLoading && !schedulesQuery.isError && schedules.length === 0 ? <p className="designer-project-empty-text">No schedules have been created for this project yet.</p> : null}
      {statusMessage ? <p className={`designer-project-schedule-message ${statusMessage.toLowerCase().includes('success') ? 'designer-project-message-success' : 'designer-project-state-error'}`}>{statusMessage}</p> : null}

      <div className="designer-project-schedule-list">
        {schedules.map((schedule) => (
          <article className="designer-project-schedule-card" key={schedule.scheduleId}>
            <div>
              <div className="designer-project-schedule-heading">
                <div className="designer-project-file-icon">
                  <IconCalendarEvent size={21} stroke={1.8} />
                </div>
                <div>
                  <h4>{schedule.title ?? formatEnumLabel(schedule.scheduleType)}</h4>
                  <p>
                    <span className="designer-project-schedule-type">{formatEnumLabel(schedule.scheduleType)}</span>
                    <span className={`designer-project-schedule-status is-${getScheduleStatusTone(schedule.status)}`}>
                      {formatEnumLabel(schedule.status)}
                    </span>
                  </p>
                </div>
              </div>
              {schedule.description ? <p className="designer-project-schedule-description">{schedule.description}</p> : null}
              <div className="designer-project-schedule-meta-grid">
                <ScheduleMeta
                  icon={<IconClock size={16} stroke={1.9} />}
                  label="When"
                  value={formatScheduleDate(schedule.scheduledStart, schedule.scheduledEnd)}
                  hint={formatScheduleTime(schedule.scheduledStart, schedule.scheduledEnd)}
                />
                <ScheduleMeta
                  icon={<IconMapPin size={16} stroke={1.9} />}
                  label="Location"
                  value={schedule.location || 'Not specified'}
                  isMuted={!schedule.location}
                />
                <ScheduleMeta icon={<IconUsers size={16} stroke={1.9} />} label="Assignee" value="Assigned to you" />
              </div>
            </div>
            {schedule.status === 'CONFIRMED' ? (
              <button
                className="designer-project-detail-button designer-project-detail-button-primary designer-project-schedule-complete-button"
                type="button"
                disabled={updateScheduleStatusMutation.isPending}
                onClick={() => void handleCompleteSchedule(schedule.scheduleId)}
              >
                {updateScheduleStatusMutation.isPending ? 'Completing...' : 'Complete Schedule'}
              </button>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

type ScheduleMetaProps = {
  hint?: string | null;
  icon: ReactNode;
  isMuted?: boolean;
  label: string;
  value: string;
};

function ScheduleMeta({ hint, icon, isMuted, label, value }: Readonly<ScheduleMetaProps>) {
  return (
    <div className="designer-project-schedule-meta">
      <span className="designer-project-schedule-meta-icon">{icon}</span>
      <div className="designer-project-schedule-meta-copy">
        <small>{label}</small>
        <strong className={isMuted ? 'is-muted' : undefined} title={value}>
          {value}
        </strong>
        {hint ? <span>{hint}</span> : null}
      </div>
    </div>
  );
}

function getScheduleStatusTone(status: string) {
  const normalized = status.trim().toUpperCase();

  if (normalized === 'COMPLETED') return 'done';
  if (normalized === 'CONFIRMED') return 'active';
  if (normalized === 'CANCELLED' || normalized === 'REJECTED') return 'danger';

  return 'pending';
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatScheduleDate(start: string, end: string | null) {
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;

  if (!endDate || isSameDay(startDate, endDate)) {
    return formatDatePart(startDate);
  }

  return `${formatDatePart(startDate)} → ${formatDatePart(endDate)}`;
}

function formatScheduleTime(start: string, end: string | null) {
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;

  if (!endDate) {
    return formatTimePart(startDate);
  }

  return `${formatTimePart(startDate)} – ${formatTimePart(endDate)}`;
}

function isSameDay(first: Date, second: Date) {
  return first.toDateString() === second.toDateString();
}

function formatDatePart(value: Date) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(value);
}

function formatTimePart(value: Date) {
  return new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}
