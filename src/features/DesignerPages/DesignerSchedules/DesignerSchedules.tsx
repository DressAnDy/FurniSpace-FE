import { IconCalendarEvent, IconClock, IconMapPin, IconUsers } from '@tabler/icons-react';
import { useQueries } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { DesignerLayout } from '@/features/DesignerPages/designercomponents';
import { getProjectById, type ProjectDto } from '@/services/api/projects';
import { getProjectScheduleServiceResultMessage } from '@/services/api/schedules';
import type { ProjectScheduleStatus, ProjectScheduleType } from '@/services/api/schedules';
import { useMyAssignedProjectSchedules, useUpdateProjectScheduleStatus } from '@/services/queries';

import './DesignerSchedules.css';

const scheduleTypeOptions: Array<ProjectScheduleType | 'ALL'> = ['ALL', 'MEASUREMENT', 'CONSULTATION', 'DESIGN_REVIEW', 'DELIVERY', 'HANDOVER', 'OTHER'];
const scheduleStatusOptions: Array<ProjectScheduleStatus | 'ALL'> = ['ALL', 'PENDING_CONFIRMATION', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

export function DesignerSchedules() {
  const [scheduleType, setScheduleType] = useState<ProjectScheduleType | 'ALL'>('ALL');
  const [status, setStatus] = useState<ProjectScheduleStatus | 'ALL'>('ALL');
  const [statusMessage, setStatusMessage] = useState('');
  const schedulesQuery = useMyAssignedProjectSchedules({
    scheduleType: scheduleType === 'ALL' ? null : scheduleType,
    status: status === 'ALL' ? null : status,
    page: 1,
    limit: 50,
  });
  const schedules = schedulesQuery.data?.items ?? [];
  const updateScheduleStatusMutation = useUpdateProjectScheduleStatus();
  const projectIds = useMemo(() => Array.from(new Set(schedules.map((schedule) => schedule.projectId))), [schedules]);
  const projectQueries = useQueries({
    queries: projectIds.map((projectId) => ({
      queryKey: ['projects', 'detail', projectId],
      queryFn: () => getProjectById(projectId),
      enabled: Boolean(projectId),
      staleTime: 5 * 60 * 1000,
    })),
  });
  const projectById = useMemo(() => {
    return projectQueries.reduce<Record<string, ProjectDto>>((lookup, query, index) => {
      const project = query.data;

      if (project) {
        lookup[projectIds[index]] = project;
      }

      return lookup;
    }, {});
  }, [projectIds, projectQueries]);

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
    <DesignerLayout activeLabel="My Schedule">
      <section className="mb-7">
        <h2 className="text-3xl font-semibold tracking-tight">Schedules</h2>
        <p className="mt-2 text-sm text-zinc-500">
          {schedulesQuery.isLoading ? 'Loading your assigned schedules...' : `${schedulesQuery.data?.total ?? 0} assigned schedules`}
        </p>
      </section>

      <section className="designer-card mb-6 flex flex-wrap items-center gap-3 p-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Type:</span>
        {scheduleTypeOptions.map((option) => (
          <button className={scheduleType === option ? 'designer-pill px-4 py-2 text-xs font-semibold' : 'rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-600'} key={option} type="button" onClick={() => setScheduleType(option)}>
            {option === 'ALL' ? 'All' : formatEnumLabel(option)}
          </button>
        ))}
        <span className="ml-0 text-xs font-semibold uppercase tracking-wide text-zinc-400 lg:ml-6">Status:</span>
        {scheduleStatusOptions.map((option) => (
          <button className={status === option ? 'designer-pill px-4 py-2 text-xs font-semibold' : 'rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-600'} key={option} type="button" onClick={() => setStatus(option)}>
            {option === 'ALL' ? 'All' : formatEnumLabel(option)}
          </button>
        ))}
      </section>

      {schedulesQuery.isError ? (
        <section className="designer-card p-5 text-sm font-medium text-red-700">
          {getProjectScheduleServiceResultMessage(schedulesQuery.error)}
        </section>
      ) : null}

      {!schedulesQuery.isLoading && !schedulesQuery.isError && schedules.length === 0 ? (
        <section className="designer-card p-5 text-sm font-medium text-zinc-500">
          You do not have assigned schedules yet.
        </section>
      ) : null}

      {statusMessage ? (
        <section className={`designer-card mb-4 p-4 text-sm font-medium ${statusMessage.toLowerCase().includes('success') ? 'text-green-700' : 'text-red-700'}`}>
          {statusMessage}
        </section>
      ) : null}

      <section className="space-y-4">
        {schedules.map((schedule) => {
          const project = projectById[schedule.projectId];

          return (
            <article className="designer-card p-5" key={schedule.scheduleId}>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#f4ead8] text-[#9a713b]">
                    <IconCalendarEvent size={22} />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-zinc-950">{schedule.title ?? formatEnumLabel(schedule.scheduleType)}</h3>
                      <span className="designer-pill px-3 py-1 text-[11px] font-semibold">{formatEnumLabel(schedule.scheduleType)}</span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">
                      {project ? `${project.projectCode} - ${project.projectName}` : `Project ${schedule.projectId}`}
                    </p>
                    {schedule.description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">{schedule.description}</p> : null}
                    <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium text-zinc-500">
                      <span className="inline-flex items-center gap-1.5">
                        <IconClock size={15} />
                        {formatDateTimeRange(schedule.scheduledStart, schedule.scheduledEnd)}
                      </span>
                      {schedule.location ? (
                        <span className="inline-flex items-center gap-1.5">
                          <IconMapPin size={15} />
                          {schedule.location}
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1.5">
                        <IconUsers size={15} />
                        Assigned to you
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">{formatEnumLabel(schedule.status)}</span>
                  {schedule.status === 'PENDING_CONFIRMATION' ? (
                    <button
                      className="rounded-full bg-[#c7a15f] px-4 py-2 text-xs font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                      disabled={updateScheduleStatusMutation.isPending}
                      onClick={() => void handleConfirmSchedule(schedule.scheduleId)}
                    >
                      {updateScheduleStatusMutation.isPending ? 'Confirming...' : 'Confirm'}
                    </button>
                  ) : null}
                  <Link className="rounded-full bg-[#1f1a17] px-4 py-2 text-xs font-semibold text-white no-underline" to={`/designer/assigned-projects/${schedule.projectId}`}>Open</Link>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </DesignerLayout>
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
