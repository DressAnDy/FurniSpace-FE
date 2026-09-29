import { FormEvent, useEffect, useMemo, useState } from 'react';

import {
  useCreateProjectSchedule,
  useDeleteProjectSchedule,
  useProjectScheduleList,
  useUpdateProjectSchedule,
} from '@/services/queries';
import { getProjectScheduleServiceResultMessage } from '@/services/api/schedules';
import type { ProjectScheduleDto, ProjectScheduleStatus, ProjectScheduleType } from '@/services/api/schedules';
import { useConfirmDialog } from '@/shared/components';
import { getScheduleDateRangePayload } from '@/shared/utils/dateValidation';
import { isScheduleVisible } from '@/shared/utils/scheduleVisibility';

import type { ProjectDetailProject } from '../ProjectDetail';

type SchedulesTabProps = {
  project: ProjectDetailProject;
};

const scheduleTypeOptions: ProjectScheduleType[] = ['MEASUREMENT'];
const scheduleStatusOptions: ProjectScheduleStatus[] = ['PENDING_CONFIRMATION', 'CONFIRMED', 'CANCELLED'];

export function SchedulesTab({ project }: SchedulesTabProps) {
  const confirm = useConfirmDialog();
  const [message, setMessage] = useState('');
  const [scheduleTypeInput, setScheduleTypeInput] = useState<ProjectScheduleType>('MEASUREMENT');
  const [scheduleStartInput, setScheduleStartInput] = useState('');
  const [scheduleEndInput, setScheduleEndInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectScheduleStatus | ''>('');
  const [rescheduleTarget, setRescheduleTarget] = useState<ProjectScheduleDto | null>(null);
  const schedulesQuery = useProjectScheduleList(
    {
      projectId: project.projectId,
      page: 1,
      limit: 100,
    },
    { fetchAll: true, staleTime: 60_000 },
  );
  const createScheduleMutation = useCreateProjectSchedule();
  const updateScheduleMutation = useUpdateProjectSchedule();
  const deleteScheduleMutation = useDeleteProjectSchedule();
  const defaultTitle = useMemo(() => getDefaultScheduleTitle(project), [project]);
  const schedules = useMemo(() => {
    const items = [...(schedulesQuery.data?.items ?? [])]
      .filter((schedule) => isScheduleVisible(schedule.status))
      .sort((left, right) => new Date(left.scheduledStart).getTime() - new Date(right.scheduledStart).getTime());

    if (!statusFilter) {
      return items;
    }

    return items.filter((schedule) => schedule.status === statusFilter);
  }, [schedulesQuery.data?.items, statusFilter]);

  function handleCreateSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');

    const form = event.currentTarget;
    const formData = new FormData(form);
    const assignedStaffId = project.assignedDesignerId;
    const scheduledStart = String(formData.get('scheduledStart') ?? '').trim();
    const scheduledEnd = String(formData.get('scheduledEnd') ?? '').trim();
    const scheduleType = scheduleTypeInput;

    if (!assignedStaffId) {
      setMessage('Please assign a designer to this project before creating a schedule.');
      return;
    }

    const dateRange = getScheduleDateRangePayload(scheduledStart, scheduledEnd);

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

  async function deleteSchedule(schedule: { scheduleId: string; title: string | null; scheduleType: ProjectScheduleType }) {
    const confirmed = await confirm({
      confirmLabel: 'Delete',
      description: `Delete ${schedule.title ?? formatEnumLabel(schedule.scheduleType)}?`,
      title: 'Delete schedule',
      tone: 'danger',
    });

    if (!confirmed) {
      return;
    }

    setMessage('');

    try {
      await deleteScheduleMutation.mutateAsync(schedule.scheduleId);
      setMessage('Schedule deleted successfully.');
      void schedulesQuery.refetch();
    } catch (error) {
      setMessage(getProjectScheduleServiceResultMessage(error));
    }
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
      setScheduleTypeInput('MEASUREMENT');
      setScheduleStartInput('');
      setScheduleEndInput('');
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

          <div className="project-detail-schedule-form-grid">
            <label>
              <span>Schedule Type</span>
              <select
                name="scheduleType"
                value={scheduleTypeInput}
                disabled={createScheduleMutation.isPending}
                onChange={(event) => setScheduleTypeInput(event.target.value as ProjectScheduleType)}
              >
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
              <input
                disabled={createScheduleMutation.isPending}
                name="scheduledStart"
                type="datetime-local"
                value={scheduleStartInput}
                onChange={(event) => setScheduleStartInput(event.target.value)}
              />
            </label>
            <label>
              <span>End</span>
              <input
                disabled={createScheduleMutation.isPending}
                name="scheduledEnd"
                type="datetime-local"
                value={scheduleEndInput}
                onChange={(event) => setScheduleEndInput(event.target.value)}
              />
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
            <div>
              <h4>Current Schedules</h4>
            </div>
            <span>{schedules.length} total</span>
          </div>

          {schedulesQuery.isLoading ? <p className="project-detail-muted">Loading project schedules...</p> : null}
          {schedulesQuery.isError ? <p className="project-detail-api-note">{getProjectScheduleServiceResultMessage(schedulesQuery.error)}</p> : null}
          {!schedulesQuery.isLoading && schedules.length === 0 ? (
            <p className="project-detail-muted">No schedules have been created for this project yet.</p>
          ) : null}

          <div className="project-detail-schedule-list">
            {schedules.map((schedule) => (
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
                <div className="project-detail-schedule-card-actions">
                  <strong>{formatEnumLabel(schedule.status)}</strong>
                  <div className="project-detail-schedule-card-action-buttons">
                    {canRescheduleSchedule(schedule) ? (
                      <button
                        className="project-detail-schedule-action-button"
                        disabled={updateScheduleMutation.isPending}
                        type="button"
                        onClick={() => setRescheduleTarget(schedule)}
                      >
                        {updateScheduleMutation.isPending ? 'Saving...' : 'Reschedule'}
                      </button>
                    ) : null}
                    <button
                      className="project-detail-danger-button"
                      disabled={deleteScheduleMutation.isPending}
                      type="button"
                      onClick={() => void deleteSchedule(schedule)}
                    >
                      {deleteScheduleMutation.isPending ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <RescheduleScheduleModal
        isSaving={updateScheduleMutation.isPending}
        project={project}
        schedule={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onSubmit={async (input) => {
          setMessage('');

          try {
            await updateScheduleMutation.mutateAsync(input);
            setMessage('Schedule rescheduled successfully.');
            setRescheduleTarget(null);
            void schedulesQuery.refetch();
          } catch (error) {
            setMessage(getProjectScheduleServiceResultMessage(error));
          }
        }}
      />
    </section>
  );
}

type RescheduleScheduleModalProps = {
  isSaving: boolean;
  project: ProjectDetailProject;
  schedule: ProjectScheduleDto | null;
  onClose: () => void;
  onSubmit: (input: {
    scheduleId: string;
    title: string | null;
    description: string | null;
    assignedStaffId: string | null;
    scheduledStart: string;
    scheduledEnd: string | null;
    location: string | null;
  }) => Promise<void>;
};

function RescheduleScheduleModal({
  isSaving,
  onClose,
  onSubmit,
  project,
  schedule,
}: Readonly<RescheduleScheduleModalProps>) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [scheduledStart, setScheduledStart] = useState('');
  const [scheduledEnd, setScheduledEnd] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!schedule) {
      setTitle('');
      setDescription('');
      setLocation('');
      setScheduledStart('');
      setScheduledEnd('');
      setFormError('');
      return;
    }

    setTitle(schedule.title ?? getDefaultScheduleTitle(project));
    setDescription(schedule.description ?? '');
    setLocation(schedule.location ?? project.projectAddress ?? '');
    setScheduledStart(toDateTimeLocal(schedule.scheduledStart));
    setScheduledEnd(toDateTimeLocal(schedule.scheduledEnd));
    setFormError('');
  }, [project, schedule]);

  if (!schedule) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    const currentSchedule = schedule;

    if (!currentSchedule) {
      return;
    }

    if (!project.assignedDesignerId) {
      setFormError('Please assign a designer to this project before rescheduling.');
      return;
    }

    try {
      const dateRange = getScheduleDateRangePayload(scheduledStart, scheduledEnd);

      await onSubmit({
        scheduleId: currentSchedule.scheduleId,
        title: title.trim() || getDefaultScheduleTitle(project),
        description: description.trim() || null,
        assignedStaffId: project.assignedDesignerId,
        scheduledStart: dateRange.startIso,
        scheduledEnd: dateRange.endIso,
        location: location.trim() || project.projectAddress || null,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not reschedule this appointment. Please try again.');
    }
  }

  return (
    <div className="project-detail-modal-backdrop">
      <section className="project-detail-schedule-reschedule-modal" role="dialog" aria-modal="true" aria-labelledby="project-detail-reschedule-title">
        <header className="project-detail-request-modal-header">
          <div>
            <strong id="project-detail-reschedule-title">Reschedule measurement</strong>
            <p>Update the measurement appointment date, time, location, and preparation notes.</p>
          </div>
          <button aria-label="Close" disabled={isSaving} type="button" onClick={onClose}>Close</button>
        </header>

        <form className="project-detail-schedule-form" onSubmit={handleSubmit}>
          <label>
            <span>Title</span>
            <input disabled={isSaving} type="text" value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>

          <div className="project-detail-schedule-form-grid">
            <label>
              <span>Start</span>
              <input
                disabled={isSaving}
                required
                type="datetime-local"
                value={scheduledStart}
                onChange={(event) => setScheduledStart(event.target.value)}
              />
            </label>
            <label>
              <span>End</span>
              <input
                disabled={isSaving}
                type="datetime-local"
                value={scheduledEnd}
                onChange={(event) => setScheduledEnd(event.target.value)}
              />
            </label>
          </div>

          <label>
            <span>Location</span>
            <input disabled={isSaving} type="text" value={location} onChange={(event) => setLocation(event.target.value)} />
          </label>

          <label>
            <span>Description</span>
            <textarea disabled={isSaving} value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>

          {formError ? <p className="project-detail-form-message project-detail-form-message-error">{formError}</p> : null}

          <div className="project-detail-request-modal-actions">
            <button disabled={isSaving} type="button" onClick={onClose}>Cancel</button>
            <button disabled={isSaving} type="submit">{isSaving ? 'Saving...' : 'Save reschedule'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function getDefaultScheduleTitle(project: ProjectDetailProject) {
  return `${project.projectName} - designer schedule`;
}

function canRescheduleSchedule(schedule: ProjectScheduleDto) {
  return schedule.scheduleType === 'MEASUREMENT'
    && ['PENDING_CONFIRMATION', 'CONFIRMED', 'CANCELLED'].includes(schedule.status);
}

function toDateTimeLocal(value?: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
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
