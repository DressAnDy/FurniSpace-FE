import { IconPhoto, IconRulerMeasure } from '@tabler/icons-react';

import { getMeasurementImageServiceResultMessage, type MeasurementImageDto } from '@/services/api/measurementImages';
import type { ProjectDto } from '@/services/api/projects';
import { useProjectMeasurementImages } from '@/services/queries';

type MeasurementImagesTabProps = {
  project: ProjectDto;
};

export function MeasurementImagesTab({ project }: Readonly<MeasurementImagesTabProps>) {
  const imagesQuery = useProjectMeasurementImages(project.projectId);
  const images = imagesQuery.data?.items ?? [];

  return (
    <section className="designer-card designer-project-section-card">
      <header className="designer-project-section-header">
        <h3>Measurement Images</h3>
        <p>Images captured from measurement schedules are synced from mobile and linked to project areas.</p>
      </header>

      {imagesQuery.isError ? (
        <p className="designer-project-file-message designer-project-file-error">{getMeasurementImageServiceResultMessage(imagesQuery.error)}</p>
      ) : null}

      {imagesQuery.isLoading ? <p className="designer-project-empty-text">Loading measurement images...</p> : null}
      {!imagesQuery.isLoading && images.length === 0 ? (
        <div className="designer-project-custom-empty-state">
          <IconRulerMeasure size={24} />
          <strong>No measurement images yet</strong>
          <span>Photos uploaded from mobile measurement sessions will appear here.</span>
        </div>
      ) : null}

      <div className="designer-project-measurement-grid">
        {images.map((image) => <MeasurementImageCard image={image} key={image.fileId} />)}
      </div>
    </section>
  );
}

function MeasurementImageCard({ image }: { image: MeasurementImageDto }) {
  const imageUrl = image.url ?? image.publicUrl;

  return (
    <article className="designer-project-file-card">
      {imageUrl ? (
        <a href={imageUrl} rel="noreferrer" target="_blank">
          <img alt={image.originalFileName ?? 'Measurement'} className="designer-project-measurement-image" src={imageUrl} />
        </a>
      ) : (
        <div className="designer-project-measurement-placeholder"><IconPhoto size={28} /></div>
      )}
      <div className="designer-project-file-content">
        <div className="designer-project-file-name">
          <h4>{image.originalFileName ?? image.fileId}</h4>
          <p>{image.uploadedAt ? formatDateTime(image.uploadedAt) : 'No upload time'}</p>
        </div>
        <p className="designer-project-file-meta">
          Schedule: {image.measurementSchedule?.scheduledStart ? formatDateTime(image.measurementSchedule.scheduledStart) : '-'}
          <br />
          Areas: {image.areas?.length ? image.areas.map((area) => area.areaName ?? area.projectAreaId).join(', ') : '-'}
        </p>
      </div>
    </article>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}
