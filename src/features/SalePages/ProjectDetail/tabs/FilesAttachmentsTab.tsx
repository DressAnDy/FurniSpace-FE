import { IconDownload, IconEye, IconPaperclip, IconPhoto, IconUpload } from '@tabler/icons-react';

import { getMeasurementImageServiceResultMessage } from '@/services/api/measurementImages';
import { useProjectMeasurementImages } from '@/services/queries';
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
  const measurementImagesQuery = useProjectMeasurementImages(projectId, { page: 1, limit: 50 });
  const files = filesQuery.data?.items ?? [];
  const measurementImages = measurementImagesQuery.data?.items ?? [];

  return (
    <section className="project-detail-card project-detail-tab-panel project-detail-files-stack">
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
          No files have been uploaded for this project.
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
                <h4>{file.originalFileName}</h4>
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

      <section className="project-detail-measurement-gallery">
        <header>
          <div>
            <h3>Measurement Images</h3>
            <p>Read-only measurement photos linked from designer measurement sessions.</p>
          </div>
        </header>

        {measurementImagesQuery.isLoading ? <p className="project-detail-muted">Loading measurement images...</p> : null}
        {measurementImagesQuery.isError ? (
          <p className="project-detail-api-note">{getMeasurementImageServiceResultMessage(measurementImagesQuery.error)}</p>
        ) : null}
        {!measurementImagesQuery.isLoading && !measurementImagesQuery.isError && measurementImages.length === 0 ? (
          <p className="project-detail-muted">No measurement images have been uploaded yet.</p>
        ) : null}
        {measurementImages.length > 0 ? (
          <div className="project-detail-measurement-grid">
            {measurementImages.map((image) => {
              const imageUrl = image.url ?? image.publicUrl;

              return (
                <article className="project-detail-measurement-card" key={image.fileId}>
                  {imageUrl ? (
                    <button type="button" onClick={() => window.open(imageUrl, '_blank', 'noopener,noreferrer')}>
                      <img alt={image.originalFileName ?? 'Measurement'} src={imageUrl} />
                    </button>
                  ) : (
                    <span><IconPhoto size={24} /></span>
                  )}
                  <div>
                    <strong>{image.originalFileName ?? image.fileId}</strong>
                    <small>{image.areas?.length ? image.areas.map((area) => area.areaName ?? area.projectAreaId).join(', ') : 'Unassigned'}</small>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
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
