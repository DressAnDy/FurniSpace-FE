import {
  IconChevronLeft,
  IconUpload,
} from '@tabler/icons-react';

import './CustomerProjectRequestPage.css';
import { CustomerNavbar } from '@/features/CustomerPages/customercomponents';

export function CustomerProjectRequestPage() {
  return (
    <main className="customer-project-request-page">
      <CustomerNavbar activeLabel="My Projects" classPrefix="customer-project-request" />

      <header className="customer-project-request-header">
        <a href="/customer/projects">
          <IconChevronLeft size={16} stroke={1.8} />
          Back to Projects
        </a>
        <h1>Create New Project Request</h1>
        <p>Submit a new interior design project request to our team</p>
      </header>

      <form className="customer-project-request-form">
        <FormSection title="Basic Information">
          <div className="customer-project-request-grid">
            <Field label="Project Name *">
              <input placeholder="e.g., Downtown Coffee Shop Interior" type="text" />
            </Field>
            <Field label="Business Type *">
              <select defaultValue="">
                <option value="" disabled>
                  Select business type
                </option>
                <option value="cafe">Café</option>
                <option value="retail">Retail</option>
                <option value="office">Office</option>
              </select>
            </Field>
          </div>

          <Field label="Business Purpose">
            <input placeholder="e.g., Specialty coffee shop with bakery section" type="text" />
          </Field>

          <Field label="Project Address *">
            <input placeholder="Full address of the project location" type="text" />
          </Field>

          <Field label="Furniture Requirement *">
            <textarea placeholder="e.g., Counter seating, dining tables, lounge area, display cases" rows={3} />
          </Field>

          <Field label="Additional Description">
            <textarea placeholder="Describe your vision, style preferences, or specific requirements..." rows={4} />
          </Field>
        </FormSection>

        <FormSection title="Space Details">
          <div className="customer-project-request-grid">
            <Field label="Total Area (sqm) *">
              <input placeholder="e.g., 120" type="number" />
            </Field>
            <Field label="Number of Floors *">
              <input placeholder="e.g., 1" type="number" />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Budget & Timeline">
          <div className="customer-project-request-grid">
            <Field label="Minimum Budget ($) *">
              <input placeholder="e.g., 45000" type="number" />
            </Field>
            <Field label="Maximum Budget ($) *">
              <input placeholder="e.g., 65000" type="number" />
            </Field>
          </div>

          <Field label="Target Completion Date *">
            <input type="date" />
          </Field>
        </FormSection>

        <FormSection
          description="Upload floor plans, reference images, or any relevant documents"
          title="Project Files"
        >
          <label className="customer-project-request-upload">
            <IconUpload size={48} stroke={1.7} />
            <strong>Click to upload or drag and drop</strong>
            <span>PNG, JPG, PDF up to 10MB each</span>
            <input type="file" multiple />
          </label>
        </FormSection>

        <div className="customer-project-request-actions">
          <button type="submit">Submit Project Request</button>
          <a href="/customer/projects">Cancel</a>
        </div>

        <section className="customer-project-request-next">
          <h2>What happens next?</h2>
          <ul>
            <li>Our sales team will review your request within 24 hours</li>
            <li>You&apos;ll be assigned a dedicated sales representative and designer</li>
            <li>We may schedule a site visit or consultation call</li>
            <li>You&apos;ll receive design proposals for review</li>
          </ul>
        </section>
      </form>
    </main>
  );
}

type FormSectionProps = {
  children: React.ReactNode;
  description?: string;
  title: string;
};

function FormSection({ children, description, title }: FormSectionProps) {
  return (
    <section className="customer-project-request-section">
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      <div className="customer-project-request-section-body">{children}</div>
    </section>
  );
}

type FieldProps = {
  children: React.ReactNode;
  label: string;
};

function Field({ children, label }: FieldProps) {
  return (
    <label className="customer-project-request-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

