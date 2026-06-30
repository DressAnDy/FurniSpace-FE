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
  const schedules = useMemo(() => schedulesQuery.data?.items ?? [], [schedulesQuery.data?.items]);
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
      <section className="designer-schedules-header">
        <h2>Schedules</h2>
        <p>
          {schedulesQuery.isLoading ? 'Loading your assigned schedules...' : `${schedulesQuery.data?.total ?? 0} assigned schedules`}
        </p>
      </section>

      <section className="designer-card designer-schedules-filters">
        <span className="designer-schedules-filter-label">Type:</span>
        {scheduleTypeOptions.map((option) => (
          <button className={scheduleType === option ? 'designer-schedules-filter designer-schedules-filter-active' : 'designer-schedules-filter'} key={option} type="button" onClick={() => setScheduleType(option)}>
            {option === 'ALL' ? 'All' : formatEnumLabel(option)}
          </button>
        ))}
        <span className="designer-schedules-filter-label designer-schedules-status-label">Status:</span>
        {scheduleStatusOptions.map((option) => (
          <button className={status === option ? 'designer-schedules-filter designer-schedules-filter-active' : 'designer-schedules-filter'} key={option} type="button" onClick={() => setStatus(option)}>
            {option === 'ALL' ? 'All' : formatEnumLabel(option)}
          </button>
        ))}
      </section>

      {schedulesQuery.isError ? (
        <section className="designer-card designer-schedules-message designer-schedules-error">
          {getProjectScheduleServiceResultMessage(schedulesQuery.error)}
        </section>
      ) : null}

      {!schedulesQuery.isLoading && !schedulesQuery.isError && schedules.length === 0 ? (
        <section className="designer-card designer-schedules-message">
          You do not have assigned schedules yet.
        </section>
      ) : null}

      {statusMessage ? (
        <section className={`designer-card designer-schedules-status-message ${statusMessage.toLowerCase().includes('success') ? 'designer-schedules-success' : 'designer-schedules-error'}`}>
          {statusMessage}
        </section>
      ) : null}

      <section className="designer-schedules-list">
        {schedules.map((schedule) => {
          const project = projectById[schedule.projectId];

          return (
            <article className="designer-card designer-schedule-card" key={schedule.scheduleId}>
              <div className="designer-schedule-card-layout">
                <div className="designer-schedule-main">
                  <span className="designer-schedule-icon">
                    <IconCalendarEvent size={22} />
                  </span>
                  <div>
                    <div className="designer-schedule-title-row">
                      <h3>{schedule.title ?? formatEnumLabel(schedule.scheduleType)}</h3>
                      <span className="designer-pill designer-schedule-type">{formatEnumLabel(schedule.scheduleType)}</span>
                    </div>
                    <p className="designer-schedule-project">
                      {project ? `${project.projectCode} - ${project.projectName}` : `Project ${schedule.projectId}`}
                    </p>
                    {schedule.description ? <p className="designer-schedule-description">{schedule.description}</p> : null}
                    <div className="designer-schedule-meta-list">
                      <span>
                        <IconClock size={15} />
                        {formatDateTimeRange(schedule.scheduledStart, schedule.scheduledEnd)}
                      </span>
                      {schedule.location ? (
                        <span>
                          <IconMapPin size={15} />
                          {schedule.location}
                        </span>
                      ) : null}
                      <span>
                        <IconUsers size={15} />
                        Assigned to you
                      </span>
                    </div>
                  </div>
                </div>
                <div className="designer-schedule-actions">
                  <span className="designer-schedule-status">{formatEnumLabel(schedule.status)}</span>
                  {schedule.status === 'PENDING_CONFIRMATION' ? (
                    <button
                      className="designer-schedule-confirm"
                      type="button"
                      disabled={updateScheduleStatusMutation.isPending}
                      onClick={() => void handleConfirmSchedule(schedule.scheduleId)}
                    >
                      {updateScheduleStatusMutation.isPending ? 'Confirming...' : 'Confirm'}
                    </button>
                  ) : null}
                  <Link className="designer-schedule-open" to={`/designer/assigned-projects/${schedule.projectId}`}>Open</Link>
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
