import { IconChevronLeft, IconFileText, IconPhoto, IconUpload, IconX } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { CustomerNavbar } from '@/features/CustomerPages/customercomponents';
import {
  getProjectServiceResultMessage,
  normalizeOptionalNumber,
  normalizeOptionalText,
  normalizeRequiredText,
} from '@/services/api/projects';
import { useProjectDetail, useUpdateProjectBasicInformation, useUploadProjectFile } from '@/services/queries/useProjects';
import { getLocalDateInputValue, validateOptionalFutureDate } from '@/shared/utils/dateValidation';

import '../customerProjectRequest/CustomerProjectRequestPage.css';

export function CustomerProjectInformationPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const projectQuery = useProjectDetail(projectId);
  const updateProjectMutation = useUpdateProjectBasicInformation();
  const uploadProjectFileMutation = useUploadProjectFile();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const project = projectQuery.data;
  const isSubmitting = updateProjectMutation.isPending || uploadProjectFileMutation.isPending;
  const canEdit = project?.status === 'NEED_BASIC_INFORMATION' || project?.status === 'SUBMITTED' || project?.status === 'IN_CONSULTATION';

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

  function handleFileDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingFiles(false);

    if (!canEdit || isSubmitting) {
      return;
    }

    addSelectedFiles(event.dataTransfer.files);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormMessage(null);

    if (!projectId) {
      setFormMessage('Project id is missing.');
      return;
    }

    const formData = new FormData(event.currentTarget);
    const targetDate = validateOptionalFutureDate(
      normalizeOptionalText(formData.get('targetCompletionDate')),
      'Target completion date',
    );
    if (!targetDate.ok) {
      setFormMessage(targetDate.message);
      return;
    }

    try {
      const uploads = await Promise.allSettled(
        selectedFiles.map((file) =>
          uploadProjectFileMutation.mutateAsync({
            projectId,
            file,
            note: 'Customer updated project information attachment',
          }),
        ),
      );
      const failedUploads = uploads.filter((upload) => upload.status === 'rejected').length;

      if (failedUploads > 0) {
        setFormMessage(`${failedUploads} file(s) could not be uploaded. Please remove or retry those files before submitting updated information.`);
        return;
      }

      await updateProjectMutation.mutateAsync({
        projectId,
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
        targetCompletionDate: targetDate.value,
      });

      setSelectedFiles([]);
      navigate('/customer/projects');
    } catch (error) {
      setFormMessage(getProjectServiceResultMessage(error));
    }
  }

  return (
    <main className="customer-project-request-page">
      <CustomerNavbar activeLabel="My Projects" classPrefix="customer-project-request" />

      <div className="customer-project-request-shell">
        <div className="customer-project-request-main">
          <header className="customer-project-request-header">
            <a href="/customer/projects">
              <IconChevronLeft size={16} stroke={1.8} />
              Back to Projects
            </a>
            <h1>Update Project Information</h1>
            <p>{project?.projectCode ?? 'Refresh the project details requested by FurniSpace'}</p>
          </header>

          {projectQuery.isLoading ? <p className="customer-project-request-message">Loading project information...</p> : null}
          {projectQuery.isError ? <p className="customer-project-request-message">{getProjectServiceResultMessage(projectQuery.error)}</p> : null}
          {project && !canEdit ? (
            <p className="customer-project-request-message">This project is not editable in its current status.</p>
          ) : null}

          {project ? (
            <form className="customer-project-request-form" onSubmit={handleSubmit}>
              <FormSection title="Basic Information">
                <div className="customer-project-request-grid">
                  <Field label="Project Name *">
                    <input defaultValue={project.projectName} disabled={!canEdit || isSubmitting} name="projectName" required type="text" />
                  </Field>
                  <Field label="Business Type *">
                    <select defaultValue={project.businessType} disabled={!canEdit || isSubmitting} name="businessType" required>
                      <option value="Cafe">Cafe</option>
                      <option value="Retail">Retail</option>
                      <option value="Office">Office</option>
                      <option value="Restaurant">Restaurant</option>
                      <option value="Showroom">Showroom</option>
                    </select>
                  </Field>
                </div>

                <Field label="Business Purpose">
                  <input defaultValue={project.businessPurpose ?? ''} disabled={!canEdit || isSubmitting} name="businessPurpose" type="text" />
                </Field>

                <Field label="Project Address">
                  <input defaultValue={project.projectAddress ?? ''} disabled={!canEdit || isSubmitting} name="projectAddress" type="text" />
                </Field>

                <Field label="Furniture Requirement *">
                  <textarea defaultValue={project.furnitureRequirement} disabled={!canEdit || isSubmitting} name="furnitureRequirement" required rows={3} />
                </Field>

                <Field label="Additional Description">
                  <textarea defaultValue={project.description ?? ''} disabled={!canEdit || isSubmitting} name="description" rows={4} />
                </Field>
              </FormSection>

              <FormSection title="Space Details">
                <div className="customer-project-request-grid">
                  <Field label="Total Area (sqm)">
                    <input defaultValue={project.totalAreaSqm ?? ''} disabled={!canEdit || isSubmitting} min="0" name="totalAreaSqm" step="0.1" type="number" />
                  </Field>
                  <Field label="Number of Floors">
                    <input defaultValue={project.numberOfFloors ?? ''} disabled={!canEdit || isSubmitting} min="0" name="numberOfFloors" step="1" type="number" />
                  </Field>
                </div>
              </FormSection>

              <FormSection title="Budget & Timeline">
                <div className="customer-project-request-grid">
                  <Field label="Minimum Budget">
                    <input defaultValue={project.budgetMin ?? ''} disabled={!canEdit || isSubmitting} min="0" name="budgetMin" type="number" />
                  </Field>
                  <Field label="Maximum Budget">
                    <input defaultValue={project.budgetMax ?? ''} disabled={!canEdit || isSubmitting} min="0" name="budgetMax" type="number" />
                  </Field>
                </div>

                <Field label="Target Completion Date">
                  <input defaultValue={toDateInputValue(project.targetCompletionDate)} disabled={!canEdit || isSubmitting} min={getLocalDateInputValue()} name="targetCompletionDate" type="date" />
                </Field>
              </FormSection>

              <FormSection description="Add new floor plans, reference images, or documents requested by Sales" title="Additional Files">
                <div
                  className={`customer-project-request-upload ${isDraggingFiles ? 'customer-project-request-upload-active' : ''}`}
                  role="button"
                  tabIndex={canEdit && !isSubmitting ? 0 : -1}
                  onClick={() => fileInputRef.current?.click()}
                  onDragLeave={() => setIsDraggingFiles(false)}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (canEdit && !isSubmitting) {
                      setIsDraggingFiles(true);
                    }
                  }}
                  onDrop={handleFileDrop}
                  onKeyDown={(event) => {
                    if ((event.key === 'Enter' || event.key === ' ') && canEdit && !isSubmitting) {
                      event.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                >
                  <IconUpload size={48} stroke={1.7} />
                  <strong>{selectedFiles.length > 0 ? `${selectedFiles.length} file(s) ready to upload` : 'Click to upload or drag and drop'}</strong>
                  <span>{isDraggingFiles ? 'Drop files here' : 'Images, PDFs, 3D files, documents up to backend limit'}</span>
                  <input
                    ref={fileInputRef}
                    disabled={!canEdit || isSubmitting}
                    multiple
                    type="file"
                    onChange={(event) => {
                      addSelectedFiles(event.target.files);
                      event.currentTarget.value = '';
                    }}
                  />
                </div>
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
                <button disabled={!canEdit || isSubmitting} type="submit">
                  {isSubmitting ? 'Submitting...' : 'Submit Updated Information'}
                </button>
                <a href="/customer/projects">Cancel</a>
              </div>
            </form>
          ) : null}
        </div>
      </div>
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
          {file.type || 'Unknown file'} - {formatFileSize(file.size)}
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

function toDateInputValue(value: string | null) {
  if (!value) {
    return '';
  }

  return value.slice(0, 10);
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

export default CustomerProjectInformationPage;
