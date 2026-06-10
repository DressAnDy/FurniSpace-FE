import { IconCalendar } from '@tabler/icons-react';

import type { ProjectDetailProject } from '../ProjectDetail';

type SchedulesTabProps = {
  project: ProjectDetailProject;
};

export function SchedulesTab({ project }: SchedulesTabProps) {
  return (
    <section className="project-detail-card project-detail-tab-panel">
      <header className="project-detail-card-toolbar">
        <div>
          <h3>Project Schedules</h3>
          <p>Scheduled consultations, measurements, and review sessions</p>
        </div>
        <button className="project-detail-primary-button" type="button">
          Create Schedule
        </button>
      </header>
      <div className="project-detail-schedule-list">
        {project.schedules.map((schedule) => (
          <article key={schedule.id} className="project-detail-schedule-card">
            <div>
              <div className="project-detail-schedule-title">
                <h4>{schedule.title}</h4>
                <span>{schedule.type}</span>
              </div>
              <p>{schedule.description}</p>
              <div className="project-detail-schedule-meta">
                <IconCalendar size={16} />
                <span>{schedule.scheduledTime}</span>
                <span>{schedule.location}</span>
              </div>
            </div>
            <strong>{schedule.status}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
