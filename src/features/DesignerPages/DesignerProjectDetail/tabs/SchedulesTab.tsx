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

  async function handleConfirmSchedule(scheduleId: string) {
    setStatusMessage('');

    try {
      await updateScheduleStatusMutation.mutateAsync({
        scheduleId,
        status: 'CONFIRMED',
        note: 'Designer confirmed the site measurement schedule.',
      });
      setStatusMessage('Schedule confirmed successfully.');
    } catch (error) {
      setStatusMessage(getProjectScheduleServiceResultMessage(error));
    }
  }

  return (
    <section className="designer-card p-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-950">Schedules</h3>
          <p className="mt-1 text-sm text-zinc-500">{project.projectCode} - project meetings and design review sessions.</p>
        </div>
      </div>

      {schedulesQuery.isLoading ? <p className="m-0 text-sm font-medium text-zinc-500">Loading project schedules...</p> : null}
      {schedulesQuery.isError ? <p className="m-0 text-sm font-medium text-red-700">{getProjectScheduleServiceResultMessage(schedulesQuery.error)}</p> : null}
      {!schedulesQuery.isLoading && !schedulesQuery.isError && schedules.length === 0 ? <p className="m-0 text-sm font-medium text-zinc-500">No schedules have been created for this project yet.</p> : null}
      {statusMessage ? <p className={`mb-4 rounded-xl bg-zinc-50 px-4 py-3 text-sm font-medium ${statusMessage.toLowerCase().includes('success') ? 'text-green-700' : 'text-red-700'}`}>{statusMessage}</p> : null}

      <div className="space-y-4">
        {schedules.map((schedule) => (
          <article className="designer-project-schedule-card" key={schedule.scheduleId}>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="designer-project-file-icon">
                  <IconCalendarEvent size={21} stroke={1.8} />
                </div>
                <div>
                  <h4 className="m-0 text-base font-semibold text-zinc-950">{schedule.title ?? formatEnumLabel(schedule.scheduleType)}</h4>
                  <p className="mt-1 text-sm text-zinc-500">{formatEnumLabel(schedule.scheduleType)} - {formatEnumLabel(schedule.status)}</p>
                </div>
              </div>
              {schedule.description ? <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-600">{schedule.description}</p> : null}
              <div className="mt-5 grid gap-3 md:grid-cols-3">
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
            {schedule.status === 'PENDING_CONFIRMATION' ? (
              <button
                className="designer-project-detail-button designer-project-detail-button-primary"
                type="button"
                disabled={updateScheduleStatusMutation.isPending}
                onClick={() => void handleConfirmSchedule(schedule.scheduleId)}
              >
                {updateScheduleStatusMutation.isPending ? 'Confirming...' : 'Confirm Schedule'}
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
