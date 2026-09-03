import { IconDownload, IconEye, IconPaperclip, IconPhoto, IconUpload } from '@tabler/icons-react';
import { useMemo } from 'react';

import { getMeasurementImageServiceResultMessage, type MeasurementImageDto } from '@/services/api/measurementImages';
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
  const measurementImages = useMemo(() => measurementImagesQuery.data?.items ?? [], [measurementImagesQuery.data?.items]);
  const measurementImageGroups = useMemo(() => groupMeasurementImagesByArea(measurementImages), [measurementImages]);

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
          </div>
        </header>

        {measurementImagesQuery.isLoading ? <p className="project-detail-muted">Loading measurement images...</p> : null}
        {measurementImagesQuery.isError ? (
          <p className="project-detail-api-note">{getMeasurementImageServiceResultMessage(measurementImagesQuery.error)}</p>
        ) : null}
        {!measurementImagesQuery.isLoading && !measurementImagesQuery.isError && measurementImages.length === 0 ? (
          <p className="project-detail-muted">No measurement images have been uploaded yet.</p>
        ) : null}
        {measurementImageGroups.length > 0 ? (
          <div className="project-detail-measurement-area-list">
            {measurementImageGroups.map((group) => (
              <section className="project-detail-measurement-area" key={group.areaKey}>
                <header>
                  <div>
                    <h4>{group.areaName}</h4>
                    <span>{group.images.length} image{group.images.length > 1 ? 's' : ''}</span>
                  </div>
                </header>
                <div className="project-detail-measurement-grid">
                  {group.images.map((image, imageIndex) => {
                    const imageUrl = image.url ?? image.publicUrl;
                    const imageName = getMeasurementImageName(image, imageIndex);

                    return (
                      <article className="project-detail-measurement-card" key={image.fileId}>
                        {imageUrl ? (
                          <button type="button" aria-label={`Preview ${imageName}`} onClick={() => window.open(imageUrl, '_blank', 'noopener,noreferrer')}>
                            <img alt={imageName} src={imageUrl} />
                          </button>
                        ) : (
                          <span><IconPhoto size={20} /></span>
                        )}
                        <div>
                          <strong title={imageName}>{imageName}</strong>
                          <small>{image.uploadedAt ? formatDate(image.uploadedAt) : 'Measurement photo'}</small>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
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

type MeasurementImageAreaGroup = {
  areaKey: string;
  areaName: string;
  images: MeasurementImageDto[];
};

function groupMeasurementImagesByArea(images: MeasurementImageDto[]): MeasurementImageAreaGroup[] {
  const groups = new Map<string, MeasurementImageAreaGroup>();

  images.forEach((image) => {
    const area = image.areas?.find((item) => item.areaName?.trim()) ?? image.areas?.[0] ?? null;
    const areaName = area?.areaName?.trim() || 'Unassigned Area';
    const areaKey = areaName.toLowerCase();
    const currentGroup = groups.get(areaKey);

    if (currentGroup) {
      currentGroup.images.push(image);
      return;
    }

    groups.set(areaKey, {
      areaKey,
      areaName,
      images: [image],
    });
  });

  return Array.from(groups.values()).sort((first, second) => {
    if (first.areaName === 'Unassigned Area') return 1;
    if (second.areaName === 'Unassigned Area') return -1;

    return first.areaName.localeCompare(second.areaName);
  });
}

function getMeasurementImageName(image: MeasurementImageDto, index: number) {
  return image.originalFileName?.trim() || `Measurement image ${index + 1}`;
}
