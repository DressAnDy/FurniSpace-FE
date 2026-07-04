import { getAccountRoleName } from '@/services/api';
import { useAccountDetail } from '@/services/queries';

import type { ProjectDetailProject } from '../ProjectDetail';

type CustomerInfoTabProps = {
  project: ProjectDetailProject;
};

export function CustomerInfoTab({ project }: CustomerInfoTabProps) {
  const customerQuery = useAccountDetail(project.customerId);
  const customer = customerQuery.data;

  return (
    <section className="project-detail-card project-detail-tab-panel project-detail-customer-card">
      <header>
        <h3>Customer Information</h3>
      </header>

      {customerQuery.isLoading ? <p className="project-detail-muted">Loading customer information...</p> : null}

      {customerQuery.isError ? (
        <p className="project-detail-api-note">Could not load customer account details. Showing project customer id only.</p>
      ) : null}

      {customer ? (
        <>
          <div className="project-detail-customer-profile">
            <div className="project-detail-customer-avatar">
              {customer.avatarUrl ? <img src={customer.avatarUrl} alt="" /> : getInitial(customer.fullName)}
            </div>
            <div>
              <h3>{customer.fullName}</h3>
              <p>{customer.email}</p>
              <div className="project-detail-badge-row project-detail-customer-badges">
                <span className="project-detail-small-badge project-detail-small-badge-primary">{getAccountRoleName(customer.roleId)}</span>
              </div>
            </div>
          </div>

          <div className="project-detail-contact-grid">
            <ContactItem label="Email" value={customer.email} />
            <ContactItem label="Full Name" value={customer.fullName} />
            <ContactItem label="Phone" value={customer.phone ?? '-'} />
          </div>
        </>
      ) : null}

      {!customerQuery.isLoading && !customer && project.customerId ? (
        <div className="project-detail-contact-grid">
          <ContactItem label="Customer Account ID" value={project.customerId} />
        </div>
      ) : null}
    </section>
  );
}

function ContactItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="project-detail-contact-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || '-';
}

