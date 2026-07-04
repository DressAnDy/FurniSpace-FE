import { IconX } from '@tabler/icons-react';
import { type FormEvent, useEffect, useState } from 'react';

import {
  getProjectScheduleServiceResultMessage,
  type ProjectScheduleDto,
  type ProjectScheduleType,
} from '@/services/api';
import type { ProjectListItemDto } from '@/services/api/projects';
import { useCreateProjectSchedule, useUpdateProjectSchedule } from '@/services/queries';

type CreateScheduleModalProps = {
  editingSchedule: ProjectScheduleDto | null;
  isOpen: boolean;
  projects: ProjectListItemDto[];
  onClose: () => void;
};

const scheduleTypes: ProjectScheduleType[] = [
  'MEASUREMENT',
  'CONSULTATION',
  'DESIGN_REVIEW',
  'DELIVERY',
  'HANDOVER',
  'OTHER',
];

export function CreateScheduleModal({ editingSchedule, isOpen, projects, onClose }: CreateScheduleModalProps) {
  const [message, setMessage] = useState('');
  const createMutation = useCreateProjectSchedule();
  const updateMutation = useUpdateProjectSchedule();
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const eligibleProjects = projects.filter((project) => Boolean(project.assignedDesignerId));

  useEffect(() => {
    setMessage('');
  }, [editingSchedule, isOpen]);

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');

    const formData = new FormData(event.currentTarget);
    const projectId = editingSchedule?.projectId ?? String(formData.get('projectId') ?? '');
    const project = projects.find((item) => item.projectId === projectId);
    const scheduledStart = String(formData.get('scheduledStart') ?? '');
    const scheduledEnd = String(formData.get('scheduledEnd') ?? '');

    if (!projectId || !project) {
      setMessage('Please select a project assigned to your sales workspace.');
      return;
    }

    if (!project.assignedDesignerId) {
      setMessage('Assign a designer to this project before creating a schedule.');
      return;
    }

    if (!scheduledStart) {
      setMessage('Please choose a schedule start time.');
      return;
    }

    if (scheduledEnd && new Date(scheduledEnd) <= new Date(scheduledStart)) {
      setMessage('Schedule end time must be after the start time.');
      return;
    }

    try {
      if (editingSchedule) {
        await updateMutation.mutateAsync({
          scheduleId: editingSchedule.scheduleId,
          title: String(formData.get('title') ?? ''),
          description: String(formData.get('description') ?? ''),
          assignedStaffId: project.assignedDesignerId,
          scheduledStart: toIsoString(scheduledStart),
          scheduledEnd: scheduledEnd ? toIsoString(scheduledEnd) : null,
          location: String(formData.get('location') ?? ''),
        });
      } else {
        await createMutation.mutateAsync({
          projectId,
          scheduleType: String(formData.get('scheduleType') ?? 'MEASUREMENT') as ProjectScheduleType,
          title: String(formData.get('title') ?? ''),
          description: String(formData.get('description') ?? ''),
          assignedStaffId: project.assignedDesignerId,
          scheduledStart: toIsoString(scheduledStart),
          scheduledEnd: scheduledEnd ? toIsoString(scheduledEnd) : null,
          location: String(formData.get('location') ?? ''),
        });
      }

      onClose();
    } catch (error) {
      setMessage(getProjectScheduleServiceResultMessage(error));
    }
  }

  const selectedProject = editingSchedule
    ? projects.find((project) => project.projectId === editingSchedule.projectId)
    : null;

  return (
    <div className="sale-schedules-modal-overlay" role="presentation">
      <section className="sale-schedules-modal" role="dialog" aria-modal="true" aria-labelledby="create-schedule-title">
        <button className="sale-schedules-modal-close" type="button" aria-label="Close schedule modal" onClick={onClose}>
          <IconX size={16} />
        </button>

        <header className="sale-schedules-modal-header">
          <h3 id="create-schedule-title">{editingSchedule ? 'Update Appointment' : 'Create New Schedule'}</h3>
          <p>
            {editingSchedule?.status === 'CANCELLED'
              ? 'Update the appointment details and send it back to the customer for confirmation.'
              : editingSchedule
                ? 'Update the date, time, or meeting details'
                : 'Create an appointment for an assigned project'}
          </p>
        </header>

        <form className="sale-schedules-modal-form" onSubmit={handleSubmit}>
          <label>
            <span>Project</span>
            {editingSchedule ? (
              <input value={selectedProject ? `${selectedProject.projectCode} - ${selectedProject.projectName}` : 'Assigned project'} disabled readOnly />
            ) : (
              <select defaultValue="" name="projectId" required>
                <option value="" disabled>Select project</option>
                {eligibleProjects.map((project) => (
                  <option key={project.projectId} value={project.projectId}>
                    {project.projectCode} - {project.projectName}
                  </option>
                ))}
              </select>
            )}
          </label>

          <label>
            <span>Schedule Type</span>
            <select defaultValue={editingSchedule?.scheduleType ?? 'MEASUREMENT'} disabled={Boolean(editingSchedule)} name="scheduleType">
              {scheduleTypes.map((type) => (
                <option key={type} value={type}>{formatEnumLabel(type)}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Title</span>
            <input defaultValue={editingSchedule?.title ?? ''} name="title" placeholder="Schedule title" type="text" />
          </label>

          <div className="sale-schedules-modal-grid">
            <label>
              <span>Start Date & Time</span>
              <input defaultValue={toDateTimeLocal(editingSchedule?.scheduledStart)} name="scheduledStart" required type="datetime-local" />
            </label>
            <label>
              <span>End Date & Time</span>
              <input defaultValue={toDateTimeLocal(editingSchedule?.scheduledEnd)} name="scheduledEnd" type="datetime-local" />
            </label>
          </div>

          <label>
            <span>Location</span>
            <input defaultValue={editingSchedule?.location ?? ''} name="location" placeholder="Meeting location or address" type="text" />
          </label>

          <label>
            <span>Description</span>
            <textarea defaultValue={editingSchedule?.description ?? ''} name="description" placeholder="Additional notes..." />
          </label>

          {eligibleProjects.length === 0 && !editingSchedule ? (
            <p className="sale-schedules-modal-message">No assigned project currently has a designer.</p>
          ) : null}
          {message ? <p className="sale-schedules-modal-message">{message}</p> : null}

          <footer className="sale-schedules-modal-footer">
            <button className="sale-schedules-modal-cancel" disabled={isSaving} type="button" onClick={onClose}>Cancel</button>
            <button className="sale-schedules-modal-submit" disabled={isSaving || (!editingSchedule && eligibleProjects.length === 0)} type="submit">
              {isSaving ? 'Saving...' : editingSchedule ? 'Save Changes' : 'Create Schedule'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function toIsoString(value: string) {
  return new Date(value).toISOString();
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return '';

  const date = new Date(value);
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
