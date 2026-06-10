import type { ProjectDetailProject } from '../ProjectDetail';

type OverviewTabProps = {
  project: ProjectDetailProject;
};

export function OverviewTab({ project }: OverviewTabProps) {
  const projectInfo = [
    ['Business Type', project.businessType],
    ['Total Area', project.totalArea],
    ['Number of Floors', project.numberOfFloors],
    ['Target Completion', project.targetCompletionDate],
    ['Budget Range', project.budgetRange],
  ];

  const actions = ['Update Basic Info', 'Assign Designer', 'Create Schedule', 'Create Quotation'];

  return (
    <div className="project-detail-overview project-detail-tab-panel">
      <section className="project-detail-card project-detail-information-card">
        <header>
          <h3>Project Information</h3>
        </header>
        <div className="project-detail-info-grid">
          {projectInfo.map(([label, value]) => (
            <div key={label} className="project-detail-info-item">
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <div className="project-detail-section-divider" />
        <div className="project-detail-text-block">
          <span>Project Address</span>
          <p>{project.address}</p>
        </div>
        <div className="project-detail-text-block">
          <span>Business Purpose</span>
          <p>{project.businessPurpose}</p>
        </div>
        <div className="project-detail-text-block">
          <span>Furniture Requirements</span>
          <p>{project.furnitureRequirement}</p>
        </div>
        <div className="project-detail-text-block">
          <span>Description</span>
          <p>{project.description}</p>
        </div>
      </section>

      <aside className="project-detail-side-stack">
        <section className="project-detail-card">
          <header>
            <h3>Assigned Team</h3>
          </header>
          <div className="project-detail-team-profile">
            <div className="project-detail-team-avatar">SJ</div>
            <div className="project-detail-team-copy">
              <strong>{project.salesConsultant}</strong>
              <span>Sales Consultant</span>
            </div>
          </div>
          <div className="project-detail-team-divider" />
          <div className="project-detail-team-profile">
            <div className="project-detail-team-avatar project-detail-team-avatar-designer">ED</div>
            <div className="project-detail-team-copy">
              <strong>{project.interiorDesigner}</strong>
              <span>Interior Designer</span>
              <em>Assigned on {project.designerAssignedDate}</em>
            </div>
          </div>
        </section>

        <section className="project-detail-card">
          <header>
            <h3>Quick Actions</h3>
          </header>
          <div className="project-detail-action-list">
            {actions.map((label) => (
              <button key={label} type="button">
                {label}
              </button>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
