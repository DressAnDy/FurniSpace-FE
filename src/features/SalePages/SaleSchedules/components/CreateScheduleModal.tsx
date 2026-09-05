import { IconX } from '@tabler/icons-react';
import { type FormEvent, useEffect, useState } from 'react';

import { useLang } from '@/app/providers/useLang';
import { saleCopy } from '@/features/SalePages/salecomponents';
import {
  getProjectScheduleServiceResultMessage,
  type ProjectScheduleDto,
  type ProjectScheduleType,
} from '@/services/api';
import type { ProjectListItemDto } from '@/services/api/projects';
import { useCreateProjectSchedule, useProjectDetail, useUpdateProjectSchedule } from '@/services/queries';
import { getScheduleDateRangePayload } from '@/shared/utils/dateValidation';

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
  'HANDOVER',
  'OTHER',
];

export function CreateScheduleModal({ editingSchedule, isOpen, projects, onClose }: CreateScheduleModalProps) {
  const { lang } = useLang();
  const t = saleCopy[lang];
  const m = t.createScheduleModal;
  const [message, setMessage] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedScheduleType, setSelectedScheduleType] = useState<ProjectScheduleType>('MEASUREMENT');
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleLocation, setScheduleLocation] = useState('');
  const [scheduledStart, setScheduledStart] = useState('');
  const [scheduledEnd, setScheduledEnd] = useState('');
  const [hasEditedLocation, setHasEditedLocation] = useState(false);
  const createMutation = useCreateProjectSchedule();
  const updateMutation = useUpdateProjectSchedule();
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const eligibleProjects = projects.filter((project) => Boolean(project.assignedDesignerId));
  const selectedProject = editingSchedule
    ? projects.find((project) => project.projectId === editingSchedule.projectId)
    : projects.find((project) => project.projectId === selectedProjectId);
  const selectedProjectDetailQuery = useProjectDetail(selectedProjectId || undefined);

  useEffect(() => {
    setMessage('');

    if (!isOpen) {
      setSelectedProjectId('');
      setSelectedScheduleType('MEASUREMENT');
      setScheduleTitle('');
      setScheduleLocation('');
      setScheduledStart('');
      setScheduledEnd('');
      setHasEditedLocation(false);
      return;
    }

    if (editingSchedule) {
      setSelectedProjectId(editingSchedule.projectId);
      setSelectedScheduleType(editingSchedule.scheduleType);
      setScheduleTitle(editingSchedule.title ?? '');
      setScheduleLocation(editingSchedule.location ?? '');
      setScheduledStart(toDateTimeLocal(editingSchedule.scheduledStart));
      setScheduledEnd(toDateTimeLocal(editingSchedule.scheduledEnd));
      setHasEditedLocation(Boolean(editingSchedule.location));
      return;
    }

    setSelectedProjectId('');
    setSelectedScheduleType('MEASUREMENT');
    setScheduleTitle('');
    setScheduleLocation('');
    setScheduledStart('');
    setScheduledEnd('');
    setHasEditedLocation(false);
  }, [editingSchedule, isOpen]);

  useEffect(() => {
    if (!isOpen || editingSchedule || !selectedProjectDetailQuery.data || hasEditedLocation) {
      return;
    }

    setScheduleLocation(selectedProjectDetailQuery.data.projectAddress ?? '');
  }, [editingSchedule, hasEditedLocation, isOpen, selectedProjectDetailQuery.data]);

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');

    const formData = new FormData(event.currentTarget);
    const projectId = editingSchedule?.projectId ?? selectedProjectId;
    const project = projects.find((item) => item.projectId === projectId);

    if (!projectId || !project) {
      setMessage('Please select a project assigned to your sales workspace.');
      return;
    }

    if (!project.assignedDesignerId) {
      setMessage('Assign a designer to this project before creating a schedule.');
      return;
    }

    const scheduleType = editingSchedule?.scheduleType ?? selectedScheduleType;
    const dateRange = getScheduleDateRangePayload(scheduledStart, scheduledEnd);

    try {
      if (editingSchedule) {
        await updateMutation.mutateAsync({
          scheduleId: editingSchedule.scheduleId,
          title: scheduleTitle,
          description: String(formData.get('description') ?? ''),
          assignedStaffId: project.assignedDesignerId,
          scheduledStart: dateRange.startIso,
          scheduledEnd: dateRange.endIso,
          location: scheduleLocation,
        });
      } else {
        await createMutation.mutateAsync({
          projectId,
          scheduleType,
          title: scheduleTitle,
          description: String(formData.get('description') ?? ''),
          assignedStaffId: project.assignedDesignerId,
          scheduledStart: dateRange.startIso,
          scheduledEnd: dateRange.endIso,
          location: scheduleLocation,
        });
      }

      onClose();
    } catch (error) {
      setMessage(getProjectScheduleServiceResultMessage(error));
    }
  }

  return (
    <div className="sale-schedules-modal-overlay" role="presentation">
      <section className="sale-schedules-modal" role="dialog" aria-modal="true" aria-labelledby="create-schedule-title">
        <button className="sale-schedules-modal-close" type="button" aria-label={t.common.close} onClick={onClose}>
          <IconX size={16} />
        </button>

        <header className="sale-schedules-modal-header">
          <h3 id="create-schedule-title">{editingSchedule ? m.updateTitle : m.createTitle}</h3>
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
            <span>{m.project}</span>
            {editingSchedule ? (
              <input value={selectedProject ? `${selectedProject.projectCode} - ${selectedProject.projectName}` : m.selectProject} disabled readOnly />
            ) : (
              <select
                name="projectId"
                required
                value={selectedProjectId}
                onChange={(event) => {
                  const nextProjectId = event.target.value;
                  const nextProject = projects.find((project) => project.projectId === nextProjectId);

                  setSelectedProjectId(nextProjectId);
                  setScheduleTitle(nextProject ? getDefaultScheduleTitle(nextProject) : '');
                  setScheduleLocation('');
                  setHasEditedLocation(false);
                }}
              >
                <option value="" disabled>{m.selectProject}</option>
                {eligibleProjects.map((project) => (
                  <option key={project.projectId} value={project.projectId}>
                    {project.projectCode} - {project.projectName}
                  </option>
                ))}
              </select>
            )}
          </label>

          <label>
            <span>{m.scheduleType}</span>
            <select
              disabled={Boolean(editingSchedule)}
              name="scheduleType"
              value={selectedScheduleType}
              onChange={(event) => setSelectedScheduleType(event.target.value as ProjectScheduleType)}
            >
              {scheduleTypes.map((type) => (
                <option key={type} value={type}>{formatEnumLabel(type)}</option>
              ))}
            </select>
          </label>

          <label>
            <span>{m.title}</span>
            <input
              name="title"
              placeholder={m.scheduleTitle}
              type="text"
              value={scheduleTitle}
              onChange={(event) => setScheduleTitle(event.target.value)}
            />
          </label>

          <div className="sale-schedules-modal-grid">
            <label>
              <span>{m.startDateTime}</span>
              <input
                name="scheduledStart"
                type="datetime-local"
                value={scheduledStart}
                onChange={(event) => setScheduledStart(event.target.value)}
              />
            </label>
            <label>
              <span>{m.endDateTime}</span>
              <input
                name="scheduledEnd"
                type="datetime-local"
                value={scheduledEnd}
                onChange={(event) => setScheduledEnd(event.target.value)}
              />
            </label>
          </div>

          <label>
            <span>{m.location}</span>
            <input
              name="location"
              placeholder={selectedProjectDetailQuery.isLoading ? t.common.loading : m.meetingLocation}
              type="text"
              value={scheduleLocation}
              onChange={(event) => {
                setScheduleLocation(event.target.value);
                setHasEditedLocation(true);
              }}
            />
          </label>

          <label>
            <span>{m.description}</span>
            <textarea defaultValue={editingSchedule?.description ?? ''} name="description" placeholder={m.additionalNotes} />
          </label>

          {eligibleProjects.length === 0 && !editingSchedule ? (
            <p className="sale-schedules-modal-message">{m.noDesignerProject}</p>
          ) : null}
          {message ? <p className="sale-schedules-modal-message">{message}</p> : null}

          <footer className="sale-schedules-modal-footer">
            <button className="sale-schedules-modal-cancel" disabled={isSaving} type="button" onClick={onClose}>{t.common.cancel}</button>
            <button className="sale-schedules-modal-submit" disabled={isSaving || (!editingSchedule && eligibleProjects.length === 0)} type="submit">
              {isSaving ? 'Saving...' : editingSchedule ? m.saveChanges : m.create}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function getDefaultScheduleTitle(project: ProjectListItemDto) {
  return `${project.projectName} - designer schedule`;
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
