import { FormEvent, useMemo, useState } from 'react';

import {
  useCreateProjectSchedule,
  useProjectScheduleList,
} from '@/services/queries';
import { getProjectScheduleServiceResultMessage } from '@/services/api/schedules';
import type { ProjectScheduleStatus, ProjectScheduleType } from '@/services/api/schedules';
import { validateScheduleDateRange } from '@/shared/utils/dateValidation';

import type { ProjectDetailProject } from '../ProjectDetail';

type SchedulesTabProps = {
  project: ProjectDetailProject;
};

const scheduleTypeOptions: ProjectScheduleType[] = ['MEASUREMENT', 'CONSULTATION'];
const scheduleStatusOptions: ProjectScheduleStatus[] = ['PENDING_CONFIRMATION', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

export function SchedulesTab({ project }: SchedulesTabProps) {
  const [message, setMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectScheduleStatus | ''>('');
  const schedulesQuery = useProjectScheduleList({
    projectId: project.projectId,
    status: statusFilter || null,
    page: 1,
    limit: 20,
  });
  const createScheduleMutation = useCreateProjectSchedule();
  const defaultTitle = useMemo(() => getDefaultScheduleTitle(project), [project]);

  function handleCreateSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');

    const form = event.currentTarget;
    const formData = new FormData(form);
    const assignedStaffId = project.assignedDesignerId;
    const scheduledStart = String(formData.get('scheduledStart') ?? '').trim();
    const scheduledEnd = String(formData.get('scheduledEnd') ?? '').trim();

    if (!assignedStaffId) {
      setMessage('Please assign a designer to this project before creating a schedule.');
      return;
    }

    const dateRange = validateScheduleDateRange(scheduledStart, scheduledEnd);
    if (!dateRange.ok) {
      setMessage(dateRange.message);
      return;
    }

    const scheduleType = String(formData.get('scheduleType') ?? 'MEASUREMENT') as ProjectScheduleType;
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
              <select name="scheduleType" defaultValue="MEASUREMENT" disabled={createScheduleMutation.isPending}>
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
              <input name="scheduledStart" required type="datetime-local" disabled={createScheduleMutation.isPending} />
            </label>
            <label>
              <span>End</span>
              <input name="scheduledEnd" type="datetime-local" disabled={createScheduleMutation.isPending} />
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
            <h4>Current Schedules</h4>
            <span>{schedulesQuery.data?.total ?? 0} total</span>
          </div>

          {schedulesQuery.isLoading ? <p className="project-detail-muted">Loading project schedules...</p> : null}
          {schedulesQuery.isError ? <p className="project-detail-api-note">{getProjectScheduleServiceResultMessage(schedulesQuery.error)}</p> : null}

          {schedulesQuery.data?.items.length === 0 ? (
            <p className="project-detail-muted">No schedules have been created for this project yet.</p>
          ) : null}

          <div className="project-detail-schedule-list">
            {schedulesQuery.data?.items.map((schedule) => (
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

function getDefaultScheduleTitle(project: ProjectDetailProject) {
  return `${project.projectName} - designer schedule`;
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
