import {
  IconChevronLeft,
  IconFileText,
  IconPhoto,
  IconUpload,
  IconX,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import './CustomerProjectRequestPage.css';
import { CustomerNavbar } from '@/features/CustomerPages/customercomponents';
import {
  getProjectServiceResultMessage,
  normalizeOptionalNumber,
  normalizeOptionalText,
  normalizeRequiredText,
} from '@/services/api/projects';
import { useCreateProject, useUploadProjectFile } from '@/services/queries/useProjects';

export function CustomerProjectRequestPage() {
  const navigate = useNavigate();
  const createProjectMutation = useCreateProject();
  const uploadProjectFileMutation = useUploadProjectFile();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const isSubmitting = createProjectMutation.isPending || uploadProjectFileMutation.isPending;

  function addSelectedFiles(fileList: FileList | null) {
    if (!fileList?.length) {
      return;
    }

    setSelectedFiles((currentFiles) => {
      const existingFileKeys = new Set(currentFiles.map(getFileKey));
      const newFiles = Array.from(fileList).filter((file) => !existingFileKeys.has(getFileKey(file)));

      return [...currentFiles, ...newFiles];
    });
  }

  function removeSelectedFile(fileToRemove: File) {
    setSelectedFiles((currentFiles) => currentFiles.filter((file) => file !== fileToRemove));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormMessage(null);

    const formData = new FormData(event.currentTarget);

    try {
      const project = await createProjectMutation.mutateAsync({
        projectName: normalizeRequiredText(formData.get('projectName')),
        businessType: normalizeRequiredText(formData.get('businessType')),
        projectAddress: normalizeOptionalText(formData.get('projectAddress')),
        businessPurpose: normalizeOptionalText(formData.get('businessPurpose')),
        furnitureRequirement: normalizeRequiredText(formData.get('furnitureRequirement')),
        description: normalizeOptionalText(formData.get('description')),
        totalAreaSqm: normalizeOptionalNumber(formData.get('totalAreaSqm')),
        numberOfFloors: normalizeOptionalNumber(formData.get('numberOfFloors')),
        budgetMin: normalizeOptionalNumber(formData.get('budgetMin')),
        budgetMax: normalizeOptionalNumber(formData.get('budgetMax')),
        targetCompletionDate: normalizeOptionalText(formData.get('targetCompletionDate')),
      });

      const uploads = await Promise.allSettled(
        selectedFiles.map((file) =>
          uploadProjectFileMutation.mutateAsync({
            projectId: project.projectId,
            file,
            note: 'Customer project request attachment',
          }),
        ),
      );
      const failedUploads = uploads.filter((upload) => upload.status === 'rejected').length;

      if (failedUploads > 0) {
        setFormMessage(`Project was created, but ${failedUploads} file(s) could not be uploaded.`);
      }

      navigate('/customer/projects');
    } catch (error) {
      setFormMessage(getProjectServiceResultMessage(error));
    }
  }

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

      <form className="customer-project-request-form" onSubmit={handleSubmit}>
        <FormSection title="Basic Information">
          <div className="customer-project-request-grid">
            <Field label="Project Name *">
              <input name="projectName" placeholder="e.g., Downtown Coffee Shop Interior" required type="text" />
            </Field>
            <Field label="Business Type *">
              <select defaultValue="" name="businessType" required>
                <option value="" disabled>
                  Select business type
                </option>
                <option value="Cafe">Cafe</option>
                <option value="Retail">Retail</option>
                <option value="Office">Office</option>
                <option value="Restaurant">Restaurant</option>
                <option value="Showroom">Showroom</option>
              </select>
            </Field>
          </div>

          <Field label="Business Purpose">
            <input name="businessPurpose" placeholder="e.g., Specialty coffee shop with bakery section" type="text" />
          </Field>

          <Field label="Project Address">
            <input name="projectAddress" placeholder="Full address of the project location" type="text" />
          </Field>

          <Field label="Furniture Requirement *">
            <textarea name="furnitureRequirement" placeholder="e.g., Counter seating, dining tables, lounge area, display cases" required rows={3} />
          </Field>

          <Field label="Additional Description">
            <textarea name="description" placeholder="Describe your vision, style preferences, or specific requirements..." rows={4} />
          </Field>
        </FormSection>

        <FormSection title="Space Details">
          <div className="customer-project-request-grid">
            <Field label="Total Area (sqm)">
              <input min="0" name="totalAreaSqm" placeholder="e.g., 120" step="0.1" type="number" />
            </Field>
            <Field label="Number of Floors">
              <input min="0" name="numberOfFloors" placeholder="e.g., 1" step="1" type="number" />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Budget & Timeline">
          <div className="customer-project-request-grid">
            <Field label="Minimum Budget">
              <input min="0" name="budgetMin" placeholder="e.g., 45000" type="number" />
            </Field>
            <Field label="Maximum Budget">
              <input min="0" name="budgetMax" placeholder="e.g., 65000" type="number" />
            </Field>
          </div>

          <Field label="Target Completion Date">
            <input name="targetCompletionDate" type="date" />
          </Field>
        </FormSection>

        <FormSection
          description="Upload floor plans, reference images, or any relevant documents"
          title="Project Files"
        >
          <label className="customer-project-request-upload">
            <IconUpload size={48} stroke={1.7} />
            <strong>Click to upload or drag and drop</strong>
            <span>Images, PDFs, 3D files, documents up to backend limit</span>
            <input
              type="file"
              multiple
              onChange={(event) => {
                addSelectedFiles(event.target.files);
                event.currentTarget.value = '';
              }}
            />
          </label>
          {selectedFiles.length > 0 ? (
            <div className="customer-project-request-file-preview">
              <p className="customer-project-request-file-count">{selectedFiles.length} file(s) selected</p>
              <div className="customer-project-request-file-grid-preview">
                {selectedFiles.map((file) => (
                  <SelectedFilePreview
                    file={file}
                    key={`${file.name}-${file.lastModified}-${file.size}`}
                    onRemove={() => removeSelectedFile(file)}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </FormSection>

        {formMessage ? <p className="customer-project-request-message">{formMessage}</p> : null}

        <div className="customer-project-request-actions">
          <button disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Submitting...' : 'Submit Project Request'}
          </button>
          <a href="/customer/projects">Cancel</a>
        </div>

        <section className="customer-project-request-next">
          <h2>What happens next?</h2>
          <ul>
            <li>Our sales team will review your request within 24 hours</li>
            <li>You will be assigned a dedicated sales representative and designer</li>
            <li>We may schedule a site visit or consultation call</li>
            <li>You will receive design proposals for review</li>
          </ul>
        </section>
      </form>
    </main>
  );
}

type SelectedFilePreviewProps = {
  file: File;
  onRemove: () => void;
};

function SelectedFilePreview({ file, onRemove }: SelectedFilePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const isImage = file.type.startsWith('image/');

  useEffect(() => {
    if (!isImage) {
      setPreviewUrl(null);
      return undefined;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file, isImage]);

  return (
    <article className="customer-project-request-file-card">
      <div className="customer-project-request-file-thumb">
        {previewUrl ? (
          <img alt={file.name} src={previewUrl} />
        ) : isImage ? (
          <IconPhoto size={28} stroke={1.7} />
        ) : (
          <IconFileText size={28} stroke={1.7} />
        )}
      </div>
      <div className="customer-project-request-file-info">
        <strong title={file.name}>{file.name}</strong>
        <span>
          {getReadableFileType(file)} - {formatFileSize(file.size)}
        </span>
      </div>
      <button type="button" aria-label={`Remove ${file.name}`} onClick={onRemove}>
        <IconX size={16} stroke={1.8} />
      </button>
    </article>
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

function getReadableFileType(file: File) {
  if (file.type) {
    return file.type;
  }

  const extension = file.name.split('.').pop();

  return extension ? extension.toUpperCase() : 'Unknown file';
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}
