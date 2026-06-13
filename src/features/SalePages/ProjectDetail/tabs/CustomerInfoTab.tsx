import type { ProjectDetailProject } from '../ProjectDetail';

type CustomerInfoTabProps = {
  project: ProjectDetailProject;
};

export function CustomerInfoTab({ project }: CustomerInfoTabProps) {
  return (
    <section className="project-detail-card project-detail-tab-panel project-detail-customer-card">
      <header>
        <h3>Customer Information</h3>
        <p>The project detail API currently returns customerId only.</p>
      </header>
      {project.customerId ? (
        <div className="project-detail-contact-grid">
          <div className="project-detail-contact-item">
            <span>Customer Account Id</span>
            <strong>{project.customerId}</strong>
          </div>
        </div>
      ) : null}
      <p className="project-detail-api-note">
        Missing API in current guide: customer profile lookup for full name, email, phone, avatar, account status, and business profile.
      </p>
    </section>
  );
}
