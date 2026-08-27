import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { IconLink, IconPhoto, IconRulerMeasure, IconUpload, IconX } from '@tabler/icons-react';

import { getMeasurementImageServiceResultMessage, type MeasurementImageDto } from '@/services/api/measurementImages';
import type { ProjectDto } from '@/services/api/projects';
import {
  useLinkMeasurementImageToArea,
  useProjectAreas,
  useProjectMeasurementImages,
  useProjectScheduleList,
  useRegisterMeasurementImage,
  useUploadProjectFile,
} from '@/services/queries';

type MeasurementImagesTabProps = {
  project: ProjectDto;
};

type MeasurementUploadStatus = 'pending' | 'uploading' | 'uploaded' | 'failed';

type MeasurementUploadItem = {
  errorMessage?: string;
  file: File;
  id: string;
  status: MeasurementUploadStatus;
};

export function MeasurementImagesTab({ project }: Readonly<MeasurementImagesTabProps>) {
  const [areaFilter, setAreaFilter] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [uploadItems, setUploadItems] = useState<MeasurementUploadItem[]>([]);
  const [uploadMessage, setUploadMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const imagesQuery = useProjectMeasurementImages(project.projectId, {
    assigned: assignmentFilter === 'all' ? null : assignmentFilter === 'assigned',
    projectAreaId: areaFilter || null,
    page: 1,
    limit: 80,
  });
  const areasQuery = useProjectAreas({ projectId: project.projectId });
  const schedulesQuery = useProjectScheduleList({
    projectId: project.projectId,
    scheduleType: 'MEASUREMENT',
    page: 1,
    limit: 100,
  }, { fetchAll: true, staleTime: 60_000 });
  const uploadProjectFileMutation = useUploadProjectFile();
  const registerImageMutation = useRegisterMeasurementImage();
  const linkImageMutation = useLinkMeasurementImageToArea();
  const images = imagesQuery.data?.items ?? [];
  const areas = useMemo(() => (areasQuery.data ?? []).filter((area) => area.status !== 'CANCELLED'), [areasQuery.data]);
  const measurementSchedules = schedulesQuery.data?.items ?? [];
  const eligibleSchedules = measurementSchedules.filter(isEligibleMeasurementSchedule);
  const isUploading = uploadProjectFileMutation.isPending || registerImageMutation.isPending || linkImageMutation.isPending;

  function addMeasurementFiles(fileList: FileList | null) {
    const nextFiles = Array.from(fileList ?? []).filter((file) => file.type.startsWith('image/'));

    if (nextFiles.length === 0) {
      return;
    }

    setUploadItems((currentItems) => [
      ...currentItems,
      ...nextFiles.map((file) => ({
        file,
        id: createUploadItemId(file),
        status: 'pending' as const,
      })),
    ]);
    setUploadMessage(null);
  }

  function removeUploadItem(itemId: string) {
    setUploadItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
    setUploadMessage(null);
  }

  async function uploadSingleMeasurementImage(item: MeasurementUploadItem, scheduleId: string, projectAreaId: string, note: string) {
    setUploadItems((currentItems) => currentItems.map((currentItem) => (
      currentItem.id === item.id
        ? { ...currentItem, status: 'uploading', errorMessage: undefined }
        : currentItem
    )));

    try {
      const uploadedFile = await uploadProjectFileMutation.mutateAsync({
        file: item.file,
        fileType: 'MEASUREMENT_REPORT',
        note,
        projectId: project.projectId,
        visibility: 'STAFF_ONLY',
      });
      const registeredImage = await registerImageMutation.mutateAsync({
        contentType: uploadedFile.mimeType,
        fileSizeBytes: uploadedFile.fileSize,
        originalFileName: uploadedFile.originalFileName,
        publicUrl: uploadedFile.publicUrl,
        scheduleId,
        storagePath: uploadedFile.storagePath,
        note,
      });

      await linkImageMutation.mutateAsync({
        fileId: registeredImage.fileId,
        projectAreaId,
      });

      setUploadItems((currentItems) => currentItems.map((currentItem) => (
        currentItem.id === item.id
          ? { ...currentItem, status: 'uploaded', errorMessage: undefined }
          : currentItem
      )));

      return true;
    } catch (error) {
      setUploadItems((currentItems) => currentItems.map((currentItem) => (
        currentItem.id === item.id
          ? { ...currentItem, status: 'failed', errorMessage: getMeasurementImageServiceResultMessage(error) }
          : currentItem
      )));

      return false;
    }
  }

  async function uploadMeasurementImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadMessage(null);

    const formData = new FormData(event.currentTarget);
    const scheduleId = String(formData.get('scheduleId') ?? '');
    const projectAreaId = String(formData.get('projectAreaId') ?? '');
    const note = String(formData.get('note') ?? '').trim();
    const uploadQueue = uploadItems.filter((item) => item.status !== 'uploaded');

    if (!scheduleId) {
      setUploadMessage({ tone: 'error', text: 'Select a confirmed measurement schedule first.' });
      return;
    }

    if (!projectAreaId) {
      setUploadMessage({ tone: 'error', text: 'Select a project area so the image can be referenced correctly.' });
      return;
    }

    if (uploadQueue.length === 0) {
      setUploadMessage({ tone: 'error', text: 'Select at least one measurement image.' });
      return;
    }

    try {
      let uploadedCount = 0;
      let failedCount = 0;

      for (const item of uploadQueue) {
        const uploaded = await uploadSingleMeasurementImage(item, scheduleId, projectAreaId, note);

        if (uploaded) {
          uploadedCount += 1;
        } else {
          failedCount += 1;
        }
      }

      if (uploadedCount > 0 && failedCount === 0) {
        event.currentTarget.reset();
        setUploadItems([]);
      } else {
        setUploadItems((currentItems) => currentItems.filter((item) => item.status === 'failed'));
      }

      setUploadMessage(failedCount > 0
        ? { tone: uploadedCount > 0 ? 'success' : 'error', text: `${uploadedCount}/${uploadQueue.length} image(s) uploaded, ${failedCount} failed. Please retry failed images.` }
        : { tone: 'success', text: `${uploadedCount} measurement image(s) uploaded and linked to area.` });
      void imagesQuery.refetch();
    } catch (error) {
      setUploadMessage({ tone: 'error', text: getMeasurementImageServiceResultMessage(error) });
    }
  }

  return (
    <section className="designer-card designer-project-section-card designer-project-measurement-section">
      <header className="designer-project-section-header">
        <h3>Measurement Images</h3>
        <p>Images captured from measurement schedules are synced from mobile and linked to project areas.</p>
      </header>

      <form className="designer-project-measurement-upload" onSubmit={(event) => void uploadMeasurementImage(event)}>
        <header>
          <div>
            <h4><IconUpload size={17} /> Upload Measurement Image</h4>
            <p>Register the image to a measurement schedule, then link it to the measured area.</p>
          </div>
        </header>
        <div className="designer-project-measurement-form-grid">
          <label>
            <span>Measurement schedule</span>
            <select name="scheduleId" disabled={isUploading || schedulesQuery.isLoading}>
              <option value="">{schedulesQuery.isLoading ? 'Loading schedules...' : 'Select schedule'}</option>
              {eligibleSchedules.map((schedule) => (
                <option key={schedule.scheduleId} value={schedule.scheduleId}>
                  {schedule.title ?? 'Measurement'} - {formatDateTime(schedule.scheduledStart)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Project area</span>
            <select name="projectAreaId" disabled={isUploading || areasQuery.isLoading}>
              <option value="">{areasQuery.isLoading ? 'Loading areas...' : 'Select area'}</option>
              {areas.map((area) => (
                <option key={area.projectAreaId} value={area.projectAreaId}>
                  {area.areaName}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="designer-project-measurement-form-grid">
          <label>
            <span>Note</span>
            <input name="note" placeholder="Optional measurement note" disabled={isUploading} />
          </label>
        </div>
        <div className="designer-project-measurement-file-picker">
          <label className={isUploading ? 'designer-project-measurement-dropzone is-disabled' : 'designer-project-measurement-dropzone'}>
            <input
              accept="image/*"
              multiple
              name="files"
              type="file"
              disabled={isUploading}
              onClick={(event) => {
                event.currentTarget.value = '';
              }}
              onChange={(event) => addMeasurementFiles(event.target.files)}
            />
            <span className="designer-project-measurement-dropzone-body">
              <IconUpload size={28} />
              <strong>{uploadItems.length > 0 ? `${uploadItems.length} image(s) ready` : 'Choose measurement images'}</strong>
              <small>You can choose multiple images at once, or add more before uploading.</small>
            </span>
          </label>
        </div>
        {uploadItems.length > 0 ? (
          <div className="designer-project-measurement-preview-grid">
            {uploadItems.map((item) => (
              <MeasurementUploadTile
                item={item}
                key={item.id}
                onRemove={() => removeUploadItem(item.id)}
              />
            ))}
          </div>
        ) : null}
        {areas.length === 0 ? (
          <p className="designer-project-file-message designer-project-file-error">Create at least one project area before linking measurement images.</p>
        ) : null}
        {eligibleSchedules.length === 0 && !schedulesQuery.isLoading ? (
          <p className="designer-project-file-message designer-project-file-error">No confirmed or completed measurement schedule is available for this project.</p>
        ) : null}
        {uploadMessage ? <p className={`designer-project-file-message designer-project-file-${uploadMessage.tone}`}>{uploadMessage.text}</p> : null}
        <div className="designer-project-measurement-actions">
          <button className="designer-project-primary-button" disabled={isUploading || areas.length === 0 || eligibleSchedules.length === 0} type="submit">
            {isUploading ? 'Uploading...' : 'Upload Images & Link'}
          </button>
        </div>
      </form>

      <div className="designer-project-measurement-filters">
        <label>
          <span>Area</span>
          <select value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)}>
            <option value="">All areas</option>
            {areas.map((area) => (
              <option key={area.projectAreaId} value={area.projectAreaId}>{area.areaName}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Link status</span>
          <select value={assignmentFilter} onChange={(event) => setAssignmentFilter(event.target.value as 'all' | 'assigned' | 'unassigned')}>
            <option value="all">All images</option>
            <option value="assigned">Linked to area</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </label>
      </div>

      {imagesQuery.isError ? (
        <p className="designer-project-file-message designer-project-file-error">{getMeasurementImageServiceResultMessage(imagesQuery.error)}</p>
      ) : null}
      {areasQuery.isError ? (
        <p className="designer-project-file-message designer-project-file-error">Cannot load project areas.</p>
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

function MeasurementUploadTile({ item, onRemove }: { item: MeasurementUploadItem; onRemove: () => void }) {
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    const objectUrl = URL.createObjectURL(item.file);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [item.file]);

  return (
    <article className={`designer-project-measurement-pending-item is-${item.status}`}>
      {previewUrl ? <img alt={item.file.name} src={previewUrl} /> : <IconPhoto size={28} />}
      <div>
        <span title={item.file.name}>{item.file.name}</span>
        <small>{formatUploadStatus(item.status)}</small>
        {item.errorMessage ? <em>{item.errorMessage}</em> : null}
      </div>
      <div className="designer-project-measurement-pending-actions">
        <button aria-label={`Remove ${item.file.name}`} disabled={item.status === 'uploading'} type="button" onClick={onRemove}>
          <IconX size={14} />
        </button>
      </div>
    </article>
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
          <IconLink size={13} /> Areas: {image.areas?.length ? image.areas.map((area) => area.areaName ?? area.projectAreaId).join(', ') : '-'}
        </p>
      </div>
    </article>
  );
}

function isEligibleMeasurementSchedule(schedule: { status?: string | null }) {
  const status = normalizeStatus(schedule.status);

  return status === 'CONFIRMED' || status === 'MEASUREMENT_CONFIRMED' || status === 'COMPLETED';
}

function normalizeStatus(value?: string | null) {
  return (value ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toUpperCase();
}

function createUploadItemId(file: Pick<File, 'lastModified' | 'name' | 'size'>) {
  return `${file.name}-${file.size}-${file.lastModified}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatUploadStatus(status: MeasurementUploadStatus) {
  if (status === 'uploading') return 'Uploading';
  if (status === 'uploaded') return 'Uploaded';
  if (status === 'failed') return 'Failed';

  return 'Pending';
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
