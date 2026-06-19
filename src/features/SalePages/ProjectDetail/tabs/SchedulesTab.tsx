import { FormEvent, useMemo, useState } from 'react';

import {
  useAvailableDesigners,
  useAssignDesignerToProject,
  useCreateProjectSchedule,
  useProjectScheduleList,
} from '@/services/queries';
import { getAccountServiceResultMessage } from '@/services/api/accounts';
import { getProjectServiceResultMessage, type ProjectSpaceDataStatus } from '@/services/api/projects';
import { getProjectScheduleServiceResultMessage } from '@/services/api/schedules';
import type { ProjectScheduleStatus, ProjectScheduleType } from '@/services/api/schedules';

import type { ProjectDetailProject } from '../ProjectDetail';

type SchedulesTabProps = {
  project: ProjectDetailProject;
};

const scheduleTypeOptions: ProjectScheduleType[] = ['MEASUREMENT', 'CONSULTATION', 'DESIGN_REVIEW', 'DELIVERY', 'HANDOVER', 'OTHER'];
const scheduleStatusOptions: ProjectScheduleStatus[] = ['PENDING_CONFIRMATION', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

export function SchedulesTab({ project }: SchedulesTabProps) {
  const [message, setMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectScheduleStatus | ''>('');
  const availableDesignersQuery = useAvailableDesigners({ page: 1, pageSize: 100 });
  const schedulesQuery = useProjectScheduleList({
    projectId: project.projectId,
    status: statusFilter || null,
    page: 1,
    limit: 20,
  });
  const assignDesignerMutation = useAssignDesignerToProject();
  const createScheduleMutation = useCreateProjectSchedule();
  const designers = availableDesignersQuery.data?.items ?? [];
  const defaultTitle = useMemo(() => getDefaultScheduleTitle(project), [project]);

  function handleCreateSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');

    const form = event.currentTarget;
    const formData = new FormData(form);
    const assignedStaffId = String(formData.get('assignedStaffId') ?? '').trim();
    const scheduledStart = String(formData.get('scheduledStart') ?? '').trim();
    const scheduledEnd = String(formData.get('scheduledEnd') ?? '').trim();

    if (!assignedStaffId) {
      setMessage('Please select an available designer before creating a schedule.');
      return;
    }

    if (!scheduledStart) {
      setMessage('Please choose a schedule start time.');
      return;
    }

    const scheduleType = String(formData.get('scheduleType') ?? 'MEASUREMENT') as ProjectScheduleType;
    const assignNote = String(formData.get('assignNote') ?? '').trim() || `Schedule requested for ${formatEnumLabel(scheduleType)}.`;
    const spaceDataStatus = String(formData.get('spaceDataStatus') ?? 'INSUFFICIENT') as ProjectSpaceDataStatus;

    void createScheduleAfterDesignerAssignment({
      form,
      assignedStaffId,
      assignNote,
      spaceDataStatus,
      scheduleType,
      scheduledStart,
      scheduledEnd,
      title: String(formData.get('title') ?? '').trim() || defaultTitle,
      description: String(formData.get('description') ?? '').trim() || null,
      location: String(formData.get('location') ?? '').trim() || project.projectAddress,
      customerNote: String(formData.get('customerNote') ?? '').trim() || null,
      internalNote: String(formData.get('internalNote') ?? '').trim() || null,
    });
  }

  async function createScheduleAfterDesignerAssignment(input: {
    form: HTMLFormElement;
    assignedStaffId: string;
    assignNote: string;
    spaceDataStatus: ProjectSpaceDataStatus;
    scheduleType: ProjectScheduleType;
    scheduledStart: string;
    scheduledEnd: string;
    title: string;
    description: string | null;
    location: string | null;
    customerNote: string | null;
    internalNote: string | null;
  }) {
    try {
      if (project.assignedDesignerId !== input.assignedStaffId) {
        try {
          await assignDesignerMutation.mutateAsync({
            projectId: project.projectId,
            designerId: input.assignedStaffId,
            spaceDataStatus: input.spaceDataStatus,
            note: input.assignNote,
          });
        } catch (error) {
          setMessage(getProjectServiceResultMessage(error));
          return;
        }
      }

      try {
        await createScheduleMutation.mutateAsync({
          projectId: project.projectId,
          scheduleType: input.scheduleType,
          title: input.title,
          description: input.description,
          assignedStaffId: input.assignedStaffId,
          scheduledStart: toIsoString(input.scheduledStart),
          scheduledEnd: input.scheduledEnd ? toIsoString(input.scheduledEnd) : null,
          location: input.location,
          customerNote: input.customerNote,
          internalNote: input.internalNote,
        });
      } catch (error) {
        setMessage(getProjectScheduleServiceResultMessage(error));
        return;
      }

      setMessage('Designer assigned and schedule created successfully.');
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
          <p>{project.projectCode} - assign an available designer and create a project schedule.</p>
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

          <label>
            <span>Available Designer</span>
            <select name="assignedStaffId" defaultValue={project.assignedDesignerId ?? ''} disabled={availableDesignersQuery.isLoading || createScheduleMutation.isPending || assignDesignerMutation.isPending}>
              <option value="">{availableDesignersQuery.isLoading ? 'Loading designers...' : 'Select designer'}</option>
              {designers.map((designer) => (
                <option key={designer.accountId} value={designer.accountId}>
                  {designer.fullName} - {designer.availableSlot}/{designer.maxActiveProjects} slots
                </option>
              ))}
            </select>
          </label>

          {availableDesignersQuery.isError ? (
            <p className="project-detail-form-message project-detail-form-message-error">
              {getAccountServiceResultMessage(availableDesignersQuery.error)}
            </p>
          ) : null}

          <div className="project-detail-schedule-form-grid">
            <label>
              <span>Space Data Status</span>
              <select name="spaceDataStatus" defaultValue="INSUFFICIENT" disabled={createScheduleMutation.isPending || assignDesignerMutation.isPending}>
                <option value="INSUFFICIENT">Insufficient - needs measurement</option>
                <option value="SUFFICIENT">Sufficient - ready for design review</option>
              </select>
            </label>
            <label>
              <span>Schedule Type</span>
              <select name="scheduleType" defaultValue="MEASUREMENT" disabled={createScheduleMutation.isPending || assignDesignerMutation.isPending}>
                {scheduleTypeOptions.map((type) => (
                  <option key={type} value={type}>{formatEnumLabel(type)}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Title</span>
              <input name="title" placeholder={defaultTitle} type="text" disabled={createScheduleMutation.isPending || assignDesignerMutation.isPending} />
            </label>
          </div>

          <label>
            <span>Assignment Note</span>
            <input name="assignNote" placeholder="Need measurement before proposal." type="text" disabled={createScheduleMutation.isPending || assignDesignerMutation.isPending} />
          </label>

          <div className="project-detail-schedule-form-grid">
            <label>
              <span>Start</span>
              <input name="scheduledStart" type="datetime-local" disabled={createScheduleMutation.isPending || assignDesignerMutation.isPending} />
            </label>
            <label>
              <span>End</span>
              <input name="scheduledEnd" type="datetime-local" disabled={createScheduleMutation.isPending || assignDesignerMutation.isPending} />
            </label>
          </div>

          <label>
            <span>Location</span>
            <input name="location" placeholder={project.projectAddress ?? 'Meeting location'} type="text" disabled={createScheduleMutation.isPending || assignDesignerMutation.isPending} />
          </label>

          <label>
            <span>Description</span>
            <textarea name="description" placeholder="Schedule purpose and preparation notes" disabled={createScheduleMutation.isPending || assignDesignerMutation.isPending} />
          </label>

          <div className="project-detail-schedule-form-grid">
            <label>
              <span>Customer Note</span>
              <textarea name="customerNote" placeholder="Visible to customer" disabled={createScheduleMutation.isPending || assignDesignerMutation.isPending} />
            </label>
            <label>
              <span>Internal Note</span>
              <textarea name="internalNote" placeholder="Internal team note" disabled={createScheduleMutation.isPending || assignDesignerMutation.isPending} />
            </label>
          </div>

          {message ? <p className={`project-detail-form-message ${message.toLowerCase().includes('success') || message.toLowerCase().includes('created') ? '' : 'project-detail-form-message-error'}`}>{message}</p> : null}

          <button className="project-detail-primary-button" type="submit" disabled={createScheduleMutation.isPending || assignDesignerMutation.isPending}>
            {assignDesignerMutation.isPending ? 'Assigning designer...' : createScheduleMutation.isPending ? 'Creating...' : 'Assign Designer & Create Schedule'}
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
                  {schedule.assignedStaffId ? <p className="project-detail-schedule-staff">Designer: {getDesignerName(schedule.assignedStaffId, designers)}</p> : null}
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

function getDesignerName(accountId: string, designers: Array<{ accountId: string; fullName: string }>) {
  return designers.find((designer) => designer.accountId === accountId)?.fullName ?? accountId;
}

function toIsoString(value: string) {
  return new Date(value).toISOString();
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
