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
          <p>{project.projectCode}</p>
        </div>
        <button className="project-detail-primary-button" type="button" disabled>
          Create Schedule
        </button>
      </header>
      <p className="project-detail-api-note">
        Missing API in current guide: schedule list/create endpoints are not included in the Project module guide. The file API supports PROJECT_SCHEDULE as a reference type, but schedule records themselves are not documented here.
      </p>
    </section>
  );
}
