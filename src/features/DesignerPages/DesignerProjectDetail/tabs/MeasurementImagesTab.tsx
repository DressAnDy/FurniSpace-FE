import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { IconLink, IconPhoto, IconRulerMeasure, IconUpload } from '@tabler/icons-react';

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

export function MeasurementImagesTab({ project }: Readonly<MeasurementImagesTabProps>) {
  const measurementFileInputRef = useRef<HTMLInputElement | null>(null);
  const [areaFilter, setAreaFilter] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
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
    limit: 20,
  });
  const uploadProjectFileMutation = useUploadProjectFile();
  const registerImageMutation = useRegisterMeasurementImage();
  const linkImageMutation = useLinkMeasurementImageToArea();
  const images = imagesQuery.data?.items ?? [];
  const areas = useMemo(() => (areasQuery.data ?? []).filter((area) => area.status !== 'CANCELLED'), [areasQuery.data]);
  const measurementSchedules = schedulesQuery.data?.items ?? [];
  const eligibleSchedules = measurementSchedules.filter(isEligibleMeasurementSchedule);
  const isUploading = uploadProjectFileMutation.isPending || registerImageMutation.isPending || linkImageMutation.isPending;
  const selectedFilePreviews = useMemo(
    () => selectedFiles.map((file) => ({
      key: getFileSelectionKey(file),
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      size: file.size,
    })),
    [selectedFiles],
  );

  useEffect(() => () => {
    selectedFilePreviews.forEach((file) => URL.revokeObjectURL(file.previewUrl));
  }, [selectedFilePreviews]);

  async function uploadMeasurementImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadMessage(null);

    const formData = new FormData(event.currentTarget);
    const scheduleId = String(formData.get('scheduleId') ?? '');
    const projectAreaId = String(formData.get('projectAreaId') ?? '');
    const note = String(formData.get('note') ?? '').trim();
    const files = selectedFiles;

    if (!scheduleId) {
      setUploadMessage({ tone: 'error', text: 'Select a confirmed measurement schedule first.' });
      return;
    }

    if (!projectAreaId) {
      setUploadMessage({ tone: 'error', text: 'Select a project area so the image can be referenced correctly.' });
      return;
    }

    if (files.length === 0) {
      setUploadMessage({ tone: 'error', text: 'Select at least one measurement image.' });
      return;
    }

    try {
      const uploadResults = await Promise.allSettled(
        files.map(async (measurementFile) => {
          const uploadedFile = await uploadProjectFileMutation.mutateAsync({
            file: measurementFile,
            fileType: 'MEASUREMENT_REPORT',
            note,
            projectId: project.projectId,
            visibility: 'CUSTOMER_VISIBLE',
          });
          const registeredImage = await registerImageMutation.mutateAsync({
            contentType: uploadedFile.mimeType,
            fileSizeBytes: uploadedFile.fileSize,
            originalFileName: uploadedFile.originalFileName,
            publicUrl: uploadedFile.publicUrl,
            scheduleId,
            storagePath: uploadedFile.storagePath,
            visibility: 'PROJECT',
            note,
          });

          await linkImageMutation.mutateAsync({
            fileId: registeredImage.fileId,
            projectAreaId,
          });

          return measurementFile.name;
        }),
      );
      const uploadedCount = uploadResults.filter((result) => result.status === 'fulfilled').length;
      const uploadErrors = uploadResults
        .map((result, index) => (
          result.status === 'rejected'
            ? `${files[index].name}: ${getMeasurementImageServiceResultMessage(result.reason)}`
            : null
        ))
        .filter((message): message is string => Boolean(message));

      if (uploadedCount > 0) {
        event.currentTarget.reset();
        setSelectedFiles([]);
      }

      setUploadMessage(uploadErrors.length > 0
        ? { tone: uploadedCount > 0 ? 'success' : 'error', text: `${uploadedCount}/${files.length} image(s) uploaded. ${uploadErrors.join(' ')}` }
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
          <span>Image files</span>
          <input
            ref={measurementFileInputRef}
            accept="image/*"
            multiple
            name="files"
            type="file"
            disabled={isUploading}
            onChange={(event) => {
              setSelectedFiles((currentFiles) => mergeSelectedFiles(currentFiles, Array.from(event.target.files ?? [])));
              event.target.value = '';
            }}
          />
          <button type="button" disabled={isUploading} onClick={() => measurementFileInputRef.current?.click()}>
            <IconPhoto size={18} /> Choose measurement images
          </button>
          <small>{selectedFiles.length > 0 ? `${selectedFiles.length} image(s) selected. Choose more files to add to this list.` : 'You can select multiple images at once, or add more after each selection.'}</small>
        </div>
        {selectedFilePreviews.length > 0 ? (
          <div className="designer-project-measurement-preview-grid">
            {selectedFilePreviews.map((file) => (
              <article key={`${file.name}-${file.size}`}>
                <img alt={file.name} src={file.previewUrl} />
                <span>{file.name}</span>
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => setSelectedFiles((currentFiles) => currentFiles.filter((selectedFile) => getFileSelectionKey(selectedFile) !== file.key))}
                >
                  Remove
                </button>
              </article>
            ))}
          </div>
        ) : null}
        {areas.length === 0 ? (
          <p className="designer-project-file-message designer-project-file-error">Create at least one project area before linking measurement images.</p>
        ) : null}
        {eligibleSchedules.length === 0 && !schedulesQuery.isLoading ? (
          <p className="designer-project-file-message designer-project-file-error">No confirmed measurement schedule has reached its start time yet.</p>
        ) : null}
        {uploadMessage ? <p className={`designer-project-file-message designer-project-file-${uploadMessage.tone}`}>{uploadMessage.text}</p> : null}
        <div className="designer-project-measurement-actions">
          <button className="designer-project-primary-button" disabled={isUploading || areas.length === 0 || eligibleSchedules.length === 0} type="submit">
            {isUploading ? 'Uploading...' : 'Upload & Link'}
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

function isEligibleMeasurementSchedule(schedule: { scheduledStart: string; status?: string | null }) {
  const status = normalizeStatus(schedule.status);
  const startTime = new Date(schedule.scheduledStart).getTime();

  return (status === 'CONFIRMED' || status === 'MEASUREMENT_CONFIRMED') && Number.isFinite(startTime) && Date.now() >= startTime;
}

function normalizeStatus(value?: string | null) {
  return (value ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toUpperCase();
}

function mergeSelectedFiles(currentFiles: File[], nextFiles: File[]) {
  const filesByKey = new Map(currentFiles.map((file) => [getFileSelectionKey(file), file]));

  nextFiles.forEach((file) => {
    filesByKey.set(getFileSelectionKey(file), file);
  });

  return Array.from(filesByKey.values());
}

function getFileSelectionKey(file: Pick<File, 'lastModified' | 'name' | 'size'>) {
  return `${file.name}-${file.size}-${file.lastModified}`;
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
