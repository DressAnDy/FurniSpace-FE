import { IconDownload, IconEye, IconPaperclip, IconUpload } from '@tabler/icons-react';

import { useProjectFiles } from '@/services/queries/useProjects';

type FilesAttachmentsTabProps = {
  projectId: string;
};

export function FilesAttachmentsTab({ projectId }: FilesAttachmentsTabProps) {
  const filesQuery = useProjectFiles({
    projectId,
    page: 1,
    limit: 50,
  });
  const files = filesQuery.data?.items ?? [];

  return (
    <section className="project-detail-card project-detail-tab-panel">
      <header className="project-detail-card-toolbar">
        <div>
          <h3>Files & Attachments</h3>
        </div>
        <button className="project-detail-primary-button" type="button" disabled>
          <IconUpload size={16} />
          Upload File
        </button>
      </header>

      {filesQuery.isLoading ? <p className="project-detail-muted">Loading project files...</p> : null}
      {filesQuery.isError ? (
        <p className="project-detail-api-note">
          Could not load files. Project file access depends on participant/admin permissions.
        </p>
      ) : null}
      {!filesQuery.isLoading && !filesQuery.isError && files.length === 0 ? (
        <p className="project-detail-muted">No files have been uploaded for this project.</p>
      ) : null}

      {files.length > 0 ? (
        <div className="project-detail-file-grid">
          {files.map((file) => (
            <article key={file.fileId} className="project-detail-file-card">
              <div className="project-detail-file-icon">
                <IconPaperclip size={22} />
              </div>
              <div className="project-detail-file-copy">
                <p>{formatFileSize(file.fileSize)}</p>
                <span>{formatDate(file.uploadedAt)}</span>
              </div>
              <div className="project-detail-file-actions">
                <button type="button" aria-label={`Preview ${file.originalFileName}`} onClick={() => window.open(file.publicUrl, '_blank', 'noopener,noreferrer')}>
                  <IconEye size={17} />
                </button>
                <button type="button" aria-label={`Download ${file.originalFileName}`} onClick={() => window.open(file.publicUrl, '_blank', 'noopener,noreferrer')}>
                  <IconDownload size={17} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}
