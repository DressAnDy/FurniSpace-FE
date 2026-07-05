import {
  IconCalendarEvent,
  IconClock,
  IconMapPin,
  IconPlus,
  IconUser,
} from '@tabler/icons-react';
import { useQueries } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { SaleNavbar, SaleSidebar } from '@/features/SalePages/salecomponents';
import {
  getProjectSchedules,
  getProjectScheduleServiceResultMessage,
  type ProjectScheduleDto,
  type ProjectScheduleStatus,
  type ProjectScheduleType,
} from '@/services/api';
import type { ProjectListItemDto } from '@/services/api/projects';
import { useCurrentUser, useProjectList, useUpdateProjectScheduleStatus } from '@/services/queries';
import { projectScheduleQueryKeys } from '@/services/queries/useSchedules';

import { CreateScheduleModal } from './components';
import './SaleSchedules.css';

type ScheduleView = 'list' | 'calendar';

type ManagedSchedule = {
  project: ProjectListItemDto;
  schedule: ProjectScheduleDto;
};

const scheduleTypeOptions: Array<ProjectScheduleType | ''> = [
  '',
  'MEASUREMENT',
  'CONSULTATION',
  'DESIGN_REVIEW',
  'DELIVERY',
  'HANDOVER',
  'OTHER',
];

const scheduleStatusOptions: Array<ProjectScheduleStatus | ''> = [
  '',
  'PENDING_CONFIRMATION',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
];

export function SaleSchedules() {
  const [activeView, setActiveView] = useState<ScheduleView>('list');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ProjectScheduleDto | null>(null);
  const [scheduleType, setScheduleType] = useState<ProjectScheduleType | ''>('');
  const [status, setStatus] = useState<ProjectScheduleStatus | ''>('');
  const [actionMessage, setActionMessage] = useState('');
  const currentUserQuery = useCurrentUser();
  const currentUser = currentUserQuery.data;
  const projectsQuery = useProjectList(
    {
      assignedSalesId: currentUser?.accountId,
      page: 1,
      limit: 100,
    },
    { enabled: Boolean(currentUser?.accountId) },
  );
  const projects = useMemo(() => (projectsQuery.data?.items ?? []).filter((project) => Boolean(project.projectId)), [projectsQuery.data?.items]);
  const scheduleQueries = useQueries({
    queries: projects.map((project) => {
      const params = {
        projectId: project.projectId,
        scheduleType: scheduleType || null,
        status: status || null,
        page: 1,
        limit: 100,
      };

      return {
        queryKey: projectScheduleQueryKeys.list(params),
        queryFn: () => getProjectSchedules(params),
      };
    }),
  });
  const updateStatusMutation = useUpdateProjectScheduleStatus();
  const managedSchedules = useMemo<ManagedSchedule[]>(
    () =>
      scheduleQueries
        .flatMap((query, index) =>
          (query.data?.items ?? []).map((schedule) => ({
            project: projects[index],
            schedule,
          })),
        )
        .filter((item): item is ManagedSchedule => Boolean(item.project))
        .sort(
          (left, right) =>
            new Date(left.schedule.scheduledStart).getTime() -
            new Date(right.schedule.scheduledStart).getTime(),
        ),
    [projects, scheduleQueries],
  );
  const isLoading = currentUserQuery.isLoading || projectsQuery.isLoading || scheduleQueries.some((query) => query.isLoading);
  const scheduleError = scheduleQueries.find((query) => query.isError)?.error;
  const calendarGroups = useMemo(() => groupSchedulesByDate(managedSchedules), [managedSchedules]);

  async function updateScheduleStatus(
    schedule: ProjectScheduleDto,
    nextStatus: 'COMPLETED' | 'CANCELLED',
  ) {
    setActionMessage('');

    try {
      await updateStatusMutation.mutateAsync({
        scheduleId: schedule.scheduleId,
        status: nextStatus,
        note: `${formatEnumLabel(nextStatus)} by sales from schedule management.`,
      });
      setActionMessage(`Schedule ${formatEnumLabel(nextStatus).toLowerCase()} successfully.`);
    } catch (error) {
      setActionMessage(getProjectScheduleServiceResultMessage(error));
    }
  }

  return (
    <div className="sale-schedules-shell">
      <SaleSidebar activeLabel="Schedules" />
      <div className="sale-schedules-content">
        <SaleNavbar />
        <main className="sale-schedules-main">
          <section className="sale-schedules-heading">
            <div>
              <h2>Schedules & Appointments</h2>
              <p>Manage schedules across projects assigned to your sales workspace</p>
            </div>
            <button
              className="sale-schedules-create-button"
              disabled={projects.length === 0}
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <IconPlus size={16} />
              Create Schedule
            </button>
          </section>

          <section className="sale-schedules-view-card">
            <div className="sale-schedules-view-switch">
              <button className={activeView === 'list' ? 'sale-schedules-view-active' : ''} type="button" onClick={() => setActiveView('list')}>
                List View
              </button>
              <button className={activeView === 'calendar' ? 'sale-schedules-view-active' : ''} type="button" onClick={() => setActiveView('calendar')}>
                Calendar View
              </button>
            </div>
            <div className="sale-schedules-filters">
              <label>
                <span>Type</span>
                <select value={scheduleType} onChange={(event) => setScheduleType(event.target.value as ProjectScheduleType | '')}>
                  {scheduleTypeOptions.map((option) => (
                    <option key={option || 'ALL'} value={option}>{option ? formatEnumLabel(option) : 'All types'}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Status</span>
                <select value={status} onChange={(event) => setStatus(event.target.value as ProjectScheduleStatus | '')}>
                  {scheduleStatusOptions.map((option) => (
                    <option key={option || 'ALL'} value={option}>{option ? formatEnumLabel(option) : 'All statuses'}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {actionMessage ? <p className="sale-schedules-message">{actionMessage}</p> : null}
          {isLoading ? <p className="sale-schedules-state">Loading schedules...</p> : null}
          {projectsQuery.isError ? <p className="sale-schedules-state sale-schedules-state-error">Could not load projects assigned to this sales account.</p> : null}
          {scheduleError ? <p className="sale-schedules-state sale-schedules-state-error">{getProjectScheduleServiceResultMessage(scheduleError)}</p> : null}
          {!isLoading && !projectsQuery.isError && !scheduleError && managedSchedules.length === 0 ? (
            <p className="sale-schedules-state">No schedules match the current filters.</p>
          ) : null}

          {activeView === 'list' ? (
            <section className="sale-schedules-list">
              {managedSchedules.map(({ project, schedule }) => (
                <ScheduleCard
                  key={schedule.scheduleId}
                  project={project}
                  schedule={schedule}
                  isUpdating={updateStatusMutation.isPending}
                  onCancel={() => void updateScheduleStatus(schedule, 'CANCELLED')}
                  onComplete={() => void updateScheduleStatus(schedule, 'COMPLETED')}
                  onReschedule={() => setEditingSchedule(schedule)}
                />
              ))}
            </section>
          ) : (
            <section className="sale-schedules-calendar-card">
              <h3>Calendar View</h3>
              <div className="sale-schedules-calendar-days">
                {calendarGroups.map(([date, items]) => (
                  <section key={date} className="sale-schedules-calendar-day">
                    <h4>{date}</h4>
                    {items.map(({ project, schedule }) => (
                      <button key={schedule.scheduleId} type="button" onClick={() => setEditingSchedule(schedule)}>
                        <span>{formatTime(schedule.scheduledStart)}</span>
                        <strong>{schedule.title ?? formatEnumLabel(schedule.scheduleType)}</strong>
                        <em>{project.projectCode}</em>
                      </button>
                    ))}
                  </section>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
      <CreateScheduleModal
        editingSchedule={editingSchedule}
        isOpen={isCreateModalOpen || Boolean(editingSchedule)}
        projects={projects}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingSchedule(null);
        }}
      />
    </div>
  );
}

type ScheduleCardProps = {
  project: ProjectListItemDto;
  schedule: ProjectScheduleDto;
  isUpdating: boolean;
  onCancel: () => void;
  onComplete: () => void;
  onReschedule: () => void;
};

function ScheduleCard({ project, schedule, isUpdating, onCancel, onComplete, onReschedule }: ScheduleCardProps) {
  const canReschedule = schedule.status === 'PENDING_CONFIRMATION' || schedule.status === 'CONFIRMED' || schedule.status === 'CANCELLED';
  const canCancel = schedule.status === 'PENDING_CONFIRMATION' || schedule.status === 'CONFIRMED';
  const canComplete = schedule.status === 'CONFIRMED';

  return (
    <article className="sale-schedules-card">
      <div className="sale-schedules-card-body">
        <div className="sale-schedules-title-row">
          <h3>{schedule.title ?? formatEnumLabel(schedule.scheduleType)}</h3>
          <span className="sale-schedules-type-badge">{formatEnumLabel(schedule.scheduleType)}</span>
          <span className="sale-schedules-status-badge">{formatEnumLabel(schedule.status)}</span>
        </div>
        <p>{schedule.description ?? 'No description provided.'}</p>
        <div className="sale-schedules-meta">
          <span><IconCalendarEvent size={16} />{project.projectCode} - {project.projectName}</span>
          <span><IconClock size={16} />{formatDateTime(schedule.scheduledStart)}</span>
          <span><IconMapPin size={16} />{schedule.location ?? 'No location'}</span>
          <span><IconUser size={16} />{schedule.assignedStaffId ? 'Assigned project designer' : 'No staff assigned'}</span>
        </div>
      </div>
      {canReschedule || canComplete || canCancel ? (
        <div className="sale-schedules-actions">
          {canReschedule ? <button disabled={isUpdating} type="button" onClick={onReschedule}>{schedule.status === 'CANCELLED' ? 'Update Schedule' : 'Reschedule'}</button> : null}
          {canComplete ? <button disabled={isUpdating} type="button" onClick={onComplete}>Mark Complete</button> : null}
          {canCancel ? <button className="sale-schedules-cancel-button" disabled={isUpdating} type="button" onClick={onCancel}>Cancel</button> : null}
        </div>
      ) : null}
    </article>
  );
}

function groupSchedulesByDate(items: ManagedSchedule[]) {
  const groups = new Map<string, ManagedSchedule[]>();

  items.forEach((item) => {
    const date = new Intl.DateTimeFormat('en', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(item.schedule.scheduledStart));
    groups.set(date, [...(groups.get(date) ?? []), item]);
  });

  return Array.from(groups.entries());
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

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
