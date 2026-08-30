import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  IconArchive,
  IconArrowDown,
  IconArrowUp,
  IconBuildingSkyscraper,
  IconCalendar,
  IconCheck,
  IconMapPin,
  IconPhoto,
  IconPhotoPlus,
  IconRulerMeasure,
  IconSend,
  IconStar,
  IconTrash,
  IconUpload,
  IconX,
} from '@tabler/icons-react';

import {
  getShowcaseServiceResultFromError,
  getShowcaseServiceResultMessage,
  type ProjectShowcaseDto,
} from '@/services/api/showcases';
import type { ProjectStatus } from '@/services/api/projects';
import {
  useArchiveProjectShowcase,
  useCreateProjectShowcase,
  useDeleteProjectShowcaseMedia,
  useProjectShowcase,
  usePublishProjectShowcase,
  useReorderProjectShowcaseMedia,
  useSetProjectShowcaseMediaCover,
  useSubmitProjectShowcase,
  useUpdateProjectShowcase,
  useUploadProjectShowcaseMedia,
} from '@/services/queries';

import './ProjectShowcaseManager.css';

type ProjectShowcaseManagerRole = 'sales' | 'admin';

type ProjectShowcaseManagerProps = {
  projectId: string;
  projectName?: string | null;
  projectStatus?: ProjectStatus | string | null;
  role: ProjectShowcaseManagerRole;
};

type ShowcaseDraft = {
  description: string;
  slug: string;
  summary: string;
  title: string;
};

const allowedImageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const allowedImageExtensions = new Set(['jpg', 'jpeg', 'png', 'webp']);

export function ProjectShowcaseManager({ projectId, projectName, projectStatus, role }: ProjectShowcaseManagerProps) {
  const showcaseQuery = useProjectShowcase(projectId);
  const showcase = showcaseQuery.data ?? null;
  const [draft, setDraft] = useState<ShowcaseDraft>(() => createEmptyDraft(projectName));
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaTitle, setMediaTitle] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');

  const createMutation = useCreateProjectShowcase();
  const updateMutation = useUpdateProjectShowcase();
  const submitMutation = useSubmitProjectShowcase();
  const publishMutation = usePublishProjectShowcase();
  const archiveMutation = useArchiveProjectShowcase();
  const uploadShowcaseMediaMutation = useUploadProjectShowcaseMedia();
  const reorderMediaMutation = useReorderProjectShowcaseMedia();
  const setCoverMutation = useSetProjectShowcaseMediaCover();
  const deleteMediaMutation = useDeleteProjectShowcaseMedia();
  const isAdmin = role === 'admin';
  const isDraft = showcase?.status === 'DRAFT';
  const isArchived = showcase?.status === 'ARCHIVED';
  const canEditDraft = !showcase || isDraft;
  const canSubmit = Boolean(showcase && isDraft);
  const canPublish = Boolean(isAdmin && showcase && showcase.status === 'PENDING_REVIEW');
  const canArchive = Boolean(isAdmin && showcase && !isArchived);
  const coverMedia = showcase?.coverMedia ?? showcase?.media?.find((item) => item.isCover) ?? null;
  const sortedMedia = useMemo(
    () => [...(showcase?.media ?? [])].sort((first, second) =>
      (first.displayOrder ?? Number.MAX_SAFE_INTEGER) - (second.displayOrder ?? Number.MAX_SAFE_INTEGER)
      || first.showcaseMediaId.localeCompare(second.showcaseMediaId),
    ),
    [showcase?.media],
  );
  const readiness = useMemo(() => getPublishReadiness(showcase, projectStatus), [projectStatus, showcase]);
  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    submitMutation.isPending ||
    publishMutation.isPending ||
    archiveMutation.isPending ||
    uploadShowcaseMediaMutation.isPending ||
    reorderMediaMutation.isPending ||
    setCoverMutation.isPending ||
    deleteMediaMutation.isPending;

  useEffect(() => {
    if (!showcase) {
      setDraft(createEmptyDraft(projectName));
      return;
    }

    setDraft({
      description: showcase.description ?? '',
      slug: showcase.slug ?? '',
      summary: showcase.summary ?? '',
      title: showcase.title ?? projectName ?? '',
    });
  }, [projectName, showcase]);

  async function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    try {
      if (!showcase) {
        const createdShowcase = await createMutation.mutateAsync({
          description: draft.description,
          projectId,
          summary: draft.summary,
          title: draft.title,
        });

        if (draft.slug.trim()) {
          await updateMutation.mutateAsync({
            description: draft.description,
            showcaseId: createdShowcase.showcaseId,
            slug: draft.slug,
            summary: draft.summary,
            title: draft.title,
          });
        }

        setMessage({ tone: 'success', text: 'Showcase draft created.' });
      } else {
        await updateMutation.mutateAsync({
          description: draft.description,
          showcaseId: showcase.showcaseId,
          slug: draft.slug,
          summary: draft.summary,
          title: draft.title,
        });
        setMessage({ tone: 'success', text: 'Showcase draft saved.' });
      }

      void showcaseQuery.refetch();
    } catch (error) {
      setMessage({ tone: 'error', text: getShowcaseServiceResultMessage(error) });
    }
  }

  async function uploadMedia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!showcase || mediaFiles.length === 0) return;
    setMessage(null);

    const invalidFile = mediaFiles.find((file) => !isSupportedShowcaseImage(file));
    if (invalidFile) {
      setMessage({ tone: 'error', text: `${invalidFile.name} is not a supported showcase image. Use JPG, PNG, or WEBP.` });
      return;
    }

    try {
      const normalizedTitle = mediaTitle.trim() || null;
      const normalizedCaption = mediaCaption.trim() || null;

      for (const [index, file] of mediaFiles.entries()) {
        await uploadShowcaseMediaMutation.mutateAsync({
          caption: normalizedCaption,
          file,
          mediaType: 'FINAL',
          setAsCover: index === 0,
          showcaseId: showcase.showcaseId,
          title: normalizedTitle,
        });
      }

      setMediaFiles([]);
      setMediaTitle('');
      setMediaCaption('');
      setMessage({ tone: 'success', text: `${mediaFiles.length} showcase media file(s) added.` });
      void showcaseQuery.refetch();
    } catch (error) {
      setMessage({ tone: 'error', text: getShowcaseServiceResultMessage(error) });
    }
  }

  async function moveMedia(showcaseMediaId: string, direction: -1 | 1) {
    if (!showcase) return;

    const currentIndex = sortedMedia.findIndex((media) => media.showcaseMediaId === showcaseMediaId);
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= sortedMedia.length) {
      return;
    }

    const nextMedia = [...sortedMedia];
    [nextMedia[currentIndex], nextMedia[nextIndex]] = [nextMedia[nextIndex], nextMedia[currentIndex]];

    try {
      await reorderMediaMutation.mutateAsync({
        mediaIds: nextMedia.map((media) => media.showcaseMediaId),
        showcaseId: showcase.showcaseId,
      });
      setMessage({ tone: 'success', text: 'Showcase media order updated.' });
      void showcaseQuery.refetch();
    } catch (error) {
      setMessage({ tone: 'error', text: getShowcaseServiceResultMessage(error) });
    }
  }

  async function runShowcaseAction(action: 'submit' | 'publish' | 'archive') {
    if (!showcase) return;
    setMessage(null);

    try {
      if (action === 'submit') {
        await submitMutation.mutateAsync(showcase.showcaseId);
        setMessage({ tone: 'success', text: 'Showcase submitted for admin review.' });
      } else if (action === 'publish') {
        await publishMutation.mutateAsync(showcase.showcaseId);
        setMessage({ tone: 'success', text: 'Showcase published to the public portfolio.' });
      } else {
        await archiveMutation.mutateAsync(showcase.showcaseId);
        setMessage({ tone: 'success', text: 'Showcase archived.' });
      }

      void showcaseQuery.refetch();
    } catch (error) {
      setMessage({ tone: 'error', text: getShowcaseServiceResultMessage(error) });
    }
  }

  async function setCover(showcaseMediaId: string) {
    if (!showcase) return;
    setMessage(null);

    try {
      try {
        await setCoverMutation.mutateAsync({ showcaseId: showcase.showcaseId, showcaseMediaId });
      } catch (error) {
        const result = getShowcaseServiceResultFromError(error);

        if (result?.errorCode !== 'PROJECT_SHOWCASE_COVER_CONFLICT') {
          throw error;
        }

        await showcaseQuery.refetch();
        await setCoverMutation.mutateAsync({ showcaseId: showcase.showcaseId, showcaseMediaId });
      }
      setMessage({ tone: 'success', text: 'Primary media updated.' });
      void showcaseQuery.refetch();
    } catch (error) {
      setMessage({ tone: 'error', text: getShowcaseServiceResultMessage(error) });
    }
  }

  async function deleteMedia(showcaseMediaId: string) {
    if (!showcase) return;
    setMessage(null);

    try {
      await deleteMediaMutation.mutateAsync({ showcaseId: showcase.showcaseId, showcaseMediaId });
      setMessage({ tone: 'success', text: 'Showcase media removed.' });
      void showcaseQuery.refetch();
    } catch (error) {
      setMessage({ tone: 'error', text: getShowcaseServiceResultMessage(error) });
    }
  }

  return (
    <section className="project-showcase-manager">
      <div className="project-showcase-manager-header">
        <div>
          <span>Portfolio Showcase</span>
          <h3>{draft.title || projectName || 'Project Showcase'}</h3>
          <p>{isAdmin ? 'Review the public story, primary image, and gallery before publishing.' : 'Prepare the public story, primary image, and gallery for admin review.'}</p>
        </div>
        <div className="project-showcase-status-stack">
          <strong>{showcase ? formatEnumLabel(showcase.status) : 'No Draft'}</strong>
          {showcase?.publishedAt ? <span>Published {formatDate(showcase.publishedAt)}</span> : null}
        </div>
      </div>

      {showcaseQuery.isLoading ? <p className="project-showcase-state">Loading showcase...</p> : null}
      {showcaseQuery.isError && !showcase ? <p className="project-showcase-state">No showcase has been created for this project yet.</p> : null}
      {message ? <p className={`project-showcase-message project-showcase-message-${message.tone}`}>{message.text}</p> : null}

      <div className="project-showcase-grid">
        <section className="project-showcase-card project-showcase-overview">
          <div className="project-showcase-cover-stage">
            {coverMedia ? (
              <img alt={coverMedia.caption ?? coverMedia.title ?? 'Showcase primary'} src={coverMedia.url ?? coverMedia.publicUrl ?? ''} />
            ) : (
              <div className="project-showcase-cover-empty">
                <IconPhotoPlus size={28} />
                <span>No primary selected</span>
              </div>
            )}
            <span>{coverMedia ? 'Current Primary' : 'Primary Required'}</span>
          </div>
          <div className="project-showcase-live-facts">
            <ShowcaseFact icon={<IconBuildingSkyscraper size={17} />} label="Business" value={showcase?.businessType} />
            <ShowcaseFact icon={<IconCalendar size={17} />} label="Completed" value={showcase?.completedDate ? formatDate(showcase.completedDate) : null} />
            <ShowcaseFact icon={<IconRulerMeasure size={17} />} label="Area" value={typeof showcase?.totalAreaSqm === 'number' ? `${formatNumber(showcase.totalAreaSqm)} m2` : null} />
            <ShowcaseFact icon={<IconMapPin size={17} />} label="Address" value={showcase?.projectAddress} />
          </div>
        </section>

        <aside className="project-showcase-card project-showcase-readiness">
          <div className="project-showcase-section-title">
            <h4>Publish Readiness</h4>
            <p>{readiness.filter((item) => item.ready).length} of {readiness.length} ready</p>
          </div>
          <ul>
            {readiness.map((item) => (
              <li className={item.ready ? 'is-ready' : ''} key={item.label}>
                <span>{item.ready ? 'OK' : 'Need'}</span>
                {item.label}
              </li>
            ))}
          </ul>
          <div className="project-showcase-actions">
            {canPublish ? (
              <button disabled={isMutating || !readiness.every((item) => item.ready)} type="button" onClick={() => void runShowcaseAction('publish')}>
                <IconStar size={16} />
                Publish
              </button>
            ) : null}
            {canArchive ? (
              <button className="is-secondary" disabled={isMutating} type="button" onClick={() => void runShowcaseAction('archive')}>
                <IconArchive size={16} />
                Archive
              </button>
            ) : null}
            {showcase?.status === 'PUBLISHED' && showcase.slug ? (
              <a href={`/public/showcases/${showcase.slug}`} target="_blank" rel="noreferrer">View public page</a>
            ) : null}
          </div>
        </aside>
      </div>

      <form className="project-showcase-card project-showcase-form" onSubmit={(event) => void saveDraft(event)}>
        <div className="project-showcase-section-title">
          <h4>Story Content</h4>
          <p>Title, slug, summary, and description.</p>
        </div>
        <div className="project-showcase-form-grid">
          <label>
            <span>Title</span>
            <input value={draft.title} disabled={!canEditDraft || isMutating} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label>
            <span>Slug</span>
            <input placeholder="bee-chang-hiang-office" value={draft.slug} disabled={!canEditDraft || isMutating} onChange={(event) => setDraft((current) => ({ ...current, slug: event.target.value }))} />
          </label>
        </div>
        <label>
          <span>Summary</span>
          <textarea value={draft.summary} disabled={!canEditDraft || isMutating} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))} />
        </label>
        <label>
          <span>Description</span>
          <textarea value={draft.description} disabled={!canEditDraft || isMutating} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
        </label>
        <div className="project-showcase-actions">
          <button disabled={!canEditDraft || isMutating} type="submit">
            <IconCheck size={16} />
            {showcase ? 'Save Draft' : 'Create Showcase'}
          </button>
          {canSubmit ? (
            <button className="is-secondary" disabled={isMutating} type="button" onClick={() => void runShowcaseAction('submit')}>
              <IconSend size={16} />
              Submit Review
            </button>
          ) : null}
        </div>
      </form>

      {showcase ? (
        <div className="project-showcase-card project-showcase-media-card">
          <div className="project-showcase-section-title">
            <h4>Showcase Media</h4>
            <p>{sortedMedia.length} curated image{sortedMedia.length === 1 ? '' : 's'}</p>
          </div>

          {canEditDraft ? (
            <div className="project-showcase-media-forms">
              <form className="project-showcase-media-form" onSubmit={(event) => void uploadMedia(event)}>
                <label className="project-showcase-upload-dropzone">
                  <input
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    multiple
                    type="file"
                    onChange={(event) => {
                      setMediaFiles((current) => mergeSelectedFiles(current, event.target.files));
                      event.target.value = '';
                    }}
                  />
                  <span className="project-showcase-upload-dropzone-body">
                    <IconUpload size={28} />
                    <strong>{mediaFiles.length > 0 ? `${mediaFiles.length} image(s) ready` : 'Choose showcase images'}</strong>
                    <small>You can choose multiple images at once. The first image becomes primary.</small>
                  </span>
                </label>
                <label>
                  <span>Title</span>
                  <input value={mediaTitle} onChange={(event) => setMediaTitle(event.target.value)} />
                </label>
                <label>
                  <span>Caption</span>
                  <input value={mediaCaption} onChange={(event) => setMediaCaption(event.target.value)} />
                </label>
                <button disabled={mediaFiles.length === 0 || isMutating} type="submit">
                  <IconUpload size={16} />
                  Upload {mediaFiles.length > 0 ? `${mediaFiles.length} File(s)` : 'Media'}
                </button>
              </form>
            </div>
          ) : null}

          {mediaFiles.length > 0 ? (
            <div className="project-showcase-selected-files">
              <p>{mediaFiles.length} image{mediaFiles.length === 1 ? '' : 's'} selected</p>
              <div className="project-showcase-selected-file-grid">
                {mediaFiles.map((file, index) => (
                  <ShowcaseSelectedFilePreview
                    file={file}
                    isPrimary={index === 0}
                    key={`${file.name}-${file.size}-${file.lastModified}`}
                    onRemove={() => setMediaFiles((current) => current.filter((item) => getFileKey(item) !== getFileKey(file)))}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {(showcase.media?.length ?? 0) === 0 ? (
            <div className="project-showcase-empty-media">
              <IconPhotoPlus size={24} />
              <span>No media yet.</span>
            </div>
          ) : null}

          <div className="project-showcase-media-grid">
            {sortedMedia.map((media, index) => {
              const mediaUrl = media.url ?? media.publicUrl ?? media.fileUrl;

              return (
                <article key={media.showcaseMediaId}>
                  <div className="project-showcase-media-thumb">
                    {mediaUrl ? <img alt={media.caption ?? media.mediaType} src={mediaUrl} /> : <div className="project-showcase-media-placeholder" />}
                    {media.isCover ? <span>Primary</span> : null}
                  </div>
                  <div>
                    <strong>{media.title || formatEnumLabel(media.mediaType)}</strong>
                    <span>{media.caption || formatEnumLabel(media.mediaType)}</span>
                  </div>
                  <div className="project-showcase-media-actions">
                    <button disabled={!canEditDraft || isMutating || index === 0} type="button" aria-label="Move media up" onClick={() => void moveMedia(media.showcaseMediaId, -1)}>
                      <IconArrowUp size={15} />
                    </button>
                    <button disabled={!canEditDraft || isMutating || index === sortedMedia.length - 1} type="button" aria-label="Move media down" onClick={() => void moveMedia(media.showcaseMediaId, 1)}>
                      <IconArrowDown size={15} />
                    </button>
                    <button className={media.isCover ? 'is-active' : ''} disabled={!canEditDraft || isMutating || Boolean(media.isCover)} type="button" onClick={() => void setCover(media.showcaseMediaId)}>
                      <IconStar size={15} />
                      {media.isCover ? 'Primary' : 'Set Primary'}
                    </button>
                    <button disabled={!canEditDraft || isMutating} type="button" onClick={() => void deleteMedia(media.showcaseMediaId)}>
                      <IconTrash size={15} />
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ShowcaseFact({ icon, label, value }: { icon: ReactNode; label: string; value?: string | number | null }) {
  return (
    <div>
      {icon}
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}

function ShowcaseSelectedFilePreview({ file, isPrimary, onRemove }: { file: File; isPrimary: boolean; onRemove: () => void }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <article className="project-showcase-selected-file-card">
      <div className="project-showcase-selected-file-thumb">
        {previewUrl ? <img alt={file.name} src={previewUrl} /> : <IconPhoto size={28} />}
        {isPrimary ? <span>Primary</span> : null}
      </div>
      <div className="project-showcase-selected-file-info">
        <strong title={file.name}>{file.name}</strong>
        <span>{file.type || 'Image'} - {formatFileSize(file.size)}</span>
      </div>
      <button type="button" aria-label={`Remove ${file.name}`} onClick={onRemove}>
        <IconX size={16} />
      </button>
    </article>
  );
}

function createEmptyDraft(projectName?: string | null): ShowcaseDraft {
  return {
    description: '',
    slug: '',
    summary: '',
    title: projectName ?? '',
  };
}

function mergeSelectedFiles(currentFiles: File[], fileList: FileList | null | undefined) {
  const nextFiles = [...currentFiles];
  const existingKeys = new Set(currentFiles.map(getFileKey));

  Array.from(fileList ?? []).forEach((file) => {
    const key = getFileKey(file);

    if (!existingKeys.has(key)) {
      nextFiles.push(file);
      existingKeys.add(key);
    }
  });

  return nextFiles;
}

function getFileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function isSupportedShowcaseImage(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const hasValidExtension = allowedImageExtensions.has(extension);
  const hasValidMimeType = !file.type || allowedImageMimeTypes.has(file.type);

  return hasValidExtension && hasValidMimeType;
}

function getPublishReadiness(showcase: ProjectShowcaseDto | null, projectStatus?: string | null) {
  return [
    { label: 'Project completed', ready: projectStatus === 'COMPLETED' },
    { label: 'Title added', ready: Boolean(showcase?.title?.trim()) },
    { label: 'Summary added', ready: Boolean(showcase?.summary?.trim()) },
    { label: 'Primary media selected', ready: Boolean(showcase?.coverMedia || showcase?.media?.some((item) => item.isCover)) },
  ];
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value);
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
