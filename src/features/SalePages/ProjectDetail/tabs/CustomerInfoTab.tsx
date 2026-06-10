import type { ProjectDetailProject } from '../ProjectDetail';

type CustomerInfoTabProps = {
  project: ProjectDetailProject;
};

export function CustomerInfoTab({ project }: CustomerInfoTabProps) {
  return (
    <section className="project-detail-card project-detail-tab-panel project-detail-customer-card">
      <header>
        <h3>Customer Information</h3>
      </header>
      <div className="project-detail-customer-profile">
        <div className="project-detail-customer-avatar">{project.customer.initials}</div>
        <div>
          <h3>{project.customer.fullName}</h3>
          <p>{project.customer.businessName}</p>
        </div>
      </div>
      <div className="project-detail-contact-grid">
        <div className="project-detail-contact-item">
          <span>Email</span>
          <strong>{project.customer.email}</strong>
        </div>
        <div className="project-detail-contact-item">
          <span>Phone</span>
          <strong>{project.customer.phone}</strong>
        </div>
      </div>
      <div className="project-detail-badge-row">
        <span className="project-detail-small-badge project-detail-small-badge-primary">{project.customer.accountStatus}</span>
        <span className="project-detail-small-badge">{project.customer.emailStatus}</span>
      </div>
    </section>
  );
}
