import { IconCalendarEvent, IconClock, IconMapPin, IconUsers } from '@tabler/icons-react';
import { useState } from 'react';

import type { ProjectDto } from '@/services/api/projects';
import { getProjectScheduleServiceResultMessage } from '@/services/api/schedules';
import { useProjectScheduleList, useUpdateProjectScheduleStatus } from '@/services/queries';

type SchedulesTabProps = {
  project: ProjectDto;
};

export function SchedulesTab({ project }: SchedulesTabProps) {
  const [statusMessage, setStatusMessage] = useState('');
  const schedulesQuery = useProjectScheduleList({
    projectId: project.projectId,
    page: 1,
    limit: 50,
  });
  const schedules = schedulesQuery.data?.items ?? [];
  const updateScheduleStatusMutation = useUpdateProjectScheduleStatus();

  async function handleCompleteSchedule(scheduleId: string) {
    setStatusMessage('');

    try {
      await updateScheduleStatusMutation.mutateAsync({
        scheduleId,
        status: 'COMPLETED',
        note: 'Designer marked the schedule as completed from project detail.',
      });
      setStatusMessage('Schedule completed successfully.');
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
                  <p>{formatEnumLabel(schedule.scheduleType)} - {formatEnumLabel(schedule.status)}</p>
                </div>
              </div>
              {schedule.description ? <p className="designer-project-schedule-description">{schedule.description}</p> : null}
              <div className="designer-project-schedule-meta-grid">
                <span className="designer-project-schedule-meta">
                  <IconClock size={15} />
                  {formatDateTimeRange(schedule.scheduledStart, schedule.scheduledEnd)}
                </span>
                {schedule.location ? (
                  <span className="designer-project-schedule-meta">
                    <IconMapPin size={15} />
                    {schedule.location}
                  </span>
                ) : null}
                <span className="designer-project-schedule-meta">
                  <IconUsers size={15} />
                  Assigned to you
                </span>
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

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDateTimeRange(start: string, end: string | null) {
  const startText = formatDateTime(start);
  const endText = end ? formatDateTime(end) : null;

  return endText ? `${startText} - ${endText}` : startText;
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
