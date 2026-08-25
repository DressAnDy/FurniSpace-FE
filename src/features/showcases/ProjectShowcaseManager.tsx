import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  IconArchive,
  IconCheck,
  IconPhotoPlus,
  IconSend,
  IconStar,
  IconTrash,
  IconUpload,
} from '@tabler/icons-react';

import {
  getShowcaseServiceResultMessage,
  type ProjectShowcaseDto,
  type ProjectShowcaseMediaType,
} from '@/services/api/showcases';
import type { ProjectStatus } from '@/services/api/projects';
import {
  useArchiveProjectShowcase,
  useCreateProjectShowcase,
  useCreateProjectShowcaseMedia,
  useDeleteProjectShowcaseMedia,
  useProjectShowcase,
  usePublishProjectShowcase,
  useSetProjectShowcaseMediaCover,
  useSubmitProjectShowcase,
  useUpdateProjectShowcase,
  useUploadProjectFile,
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

const mediaTypes: ProjectShowcaseMediaType[] = ['BEFORE', 'AFTER', 'FINAL', 'DETAIL', 'OTHER'];

export function ProjectShowcaseManager({ projectId, projectName, projectStatus, role }: ProjectShowcaseManagerProps) {
  const showcaseQuery = useProjectShowcase(projectId);
  const showcase = showcaseQuery.data ?? null;
  const [draft, setDraft] = useState<ShowcaseDraft>(() => createEmptyDraft(projectName));
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaType, setMediaType] = useState<ProjectShowcaseMediaType>('FINAL');
  const [mediaTitle, setMediaTitle] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');
  const [mediaCover, setMediaCover] = useState(false);

  const createMutation = useCreateProjectShowcase();
  const updateMutation = useUpdateProjectShowcase();
  const submitMutation = useSubmitProjectShowcase();
  const publishMutation = usePublishProjectShowcase();
  const archiveMutation = useArchiveProjectShowcase();
  const uploadProjectFileMutation = useUploadProjectFile();
  const createMediaMutation = useCreateProjectShowcaseMedia();
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
  const readiness = useMemo(() => getPublishReadiness(showcase, projectStatus), [projectStatus, showcase]);
  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    submitMutation.isPending ||
    publishMutation.isPending ||
    archiveMutation.isPending ||
    uploadProjectFileMutation.isPending ||
    createMediaMutation.isPending ||
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

    try {
      for (const [index, file] of mediaFiles.entries()) {
        const uploadedFile = await uploadProjectFileMutation.mutateAsync({
          file,
          fileType: 'REVIEW_IMAGE',
          note: 'Project showcase media',
          projectId,
          visibility: 'CUSTOMER_VISIBLE',
        });

        await createMediaMutation.mutateAsync({
          caption: mediaCaption,
          fileId: uploadedFile.fileId,
          mediaType,
          setAsCover: mediaCover && index === 0,
          showcaseId: showcase.showcaseId,
          title: mediaTitle || stripFileExtension(file.name),
        });
      }

      setMediaFiles([]);
      setMediaTitle('');
      setMediaCaption('');
      setMediaCover(false);
      setMessage({ tone: 'success', text: `${mediaFiles.length} showcase media file(s) added.` });
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
      await setCoverMutation.mutateAsync({ showcaseId: showcase.showcaseId, showcaseMediaId });
      setMessage({ tone: 'success', text: 'Cover media updated.' });
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
          <span>Portfolio CMS</span>
          <h3>Project Showcase</h3>
          <p>{isAdmin ? 'Review and decide whether this project appears on the public portfolio.' : 'Prepare the project story and submit it for admin review.'}</p>
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
        <form className="project-showcase-card project-showcase-form" onSubmit={(event) => void saveDraft(event)}>
          <div className="project-showcase-section-title">
            <h4>Draft Content</h4>
            <p>Title, summary, and slug are used on public pages.</p>
          </div>
          <label>
            <span>Title</span>
            <input value={draft.title} disabled={!canEditDraft || isMutating} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label>
            <span>Slug</span>
            <input placeholder="bee-chang-hiang-office" value={draft.slug} disabled={!canEditDraft || isMutating} onChange={(event) => setDraft((current) => ({ ...current, slug: event.target.value }))} />
          </label>
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

        <aside className="project-showcase-card project-showcase-readiness">
          <div className="project-showcase-section-title">
            <h4>Publish Readiness</h4>
            <p>Admin can publish only after every rule passes.</p>
          </div>
          <ul>
            {readiness.map((item) => (
              <li className={item.ready ? 'is-ready' : ''} key={item.label}>
                <span>{item.ready ? 'OK' : 'Need'}</span>
                {item.label}
              </li>
            ))}
          </ul>
          {coverMedia ? (
            <div className="project-showcase-cover-preview">
              <img alt={coverMedia.caption ?? 'Showcase cover'} src={coverMedia.url ?? coverMedia.publicUrl ?? ''} />
              <span>Cover media</span>
            </div>
          ) : null}
          <div className="project-showcase-actions">
            {canPublish ? (
              <button disabled={isMutating} type="button" onClick={() => void runShowcaseAction('publish')}>
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

      {showcase ? (
        <div className="project-showcase-card project-showcase-media-card">
          <div className="project-showcase-section-title">
            <h4>Showcase Media</h4>
            <p>Add final photos, before images, and details. Select one as cover.</p>
          </div>

          {canEditDraft ? (
            <form className="project-showcase-media-form" onSubmit={(event) => void uploadMedia(event)}>
              <label>
                <span>Image files</span>
                <input
                  accept="image/*"
                  multiple
                  type="file"
                  onChange={(event) => {
                    setMediaFiles((current) => mergeSelectedFiles(current, event.target.files));
                    event.target.value = '';
                  }}
                />
              </label>
              <label>
                <span>Type</span>
                <select value={mediaType} onChange={(event) => setMediaType(event.target.value as ProjectShowcaseMediaType)}>
                  {mediaTypes.map((type) => <option key={type} value={type}>{formatEnumLabel(type)}</option>)}
                </select>
              </label>
              <label>
                <span>Title</span>
                <input value={mediaTitle} onChange={(event) => setMediaTitle(event.target.value)} />
              </label>
              <label>
                <span>Caption</span>
                <input value={mediaCaption} onChange={(event) => setMediaCaption(event.target.value)} />
              </label>
              <label className="project-showcase-checkbox">
                <input checked={mediaCover} type="checkbox" onChange={(event) => setMediaCover(event.target.checked)} />
                <span>Set as cover</span>
              </label>
              <button disabled={mediaFiles.length === 0 || isMutating} type="submit">
                <IconUpload size={16} />
                Upload {mediaFiles.length > 0 ? `${mediaFiles.length} File(s)` : 'Media'}
              </button>
            </form>
          ) : null}

          {mediaFiles.length > 0 ? (
            <div className="project-showcase-selected-files">
              {mediaFiles.map((file) => (
                <div key={`${file.name}-${file.size}-${file.lastModified}`}>
                  <span>{file.name}</span>
                  <button type="button" onClick={() => setMediaFiles((current) => current.filter((item) => getFileKey(item) !== getFileKey(file)))}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {(showcase.media?.length ?? 0) === 0 ? (
            <div className="project-showcase-empty-media">
              <IconPhotoPlus size={24} />
              <span>No media yet.</span>
            </div>
          ) : null}

          <div className="project-showcase-media-grid">
            {showcase.media?.map((media) => {
              const mediaUrl = media.url ?? media.publicUrl;

              return (
                <article key={media.showcaseMediaId}>
                  {mediaUrl ? <img alt={media.caption ?? media.mediaType} src={mediaUrl} /> : <div className="project-showcase-media-placeholder" />}
                  <div>
                    <strong>{media.title || formatEnumLabel(media.mediaType)}</strong>
                    <span>{media.caption || formatEnumLabel(media.mediaType)}</span>
                  </div>
                  <div className="project-showcase-media-actions">
                    <button className={media.isCover ? 'is-active' : ''} disabled={!canEditDraft || isMutating || Boolean(media.isCover)} type="button" onClick={() => void setCover(media.showcaseMediaId)}>
                      <IconStar size={15} />
                      {media.isCover ? 'Cover' : 'Set Cover'}
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

function stripFileExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '');
}

function getPublishReadiness(showcase: ProjectShowcaseDto | null, projectStatus?: string | null) {
  return [
    { label: 'Project completed', ready: projectStatus === 'COMPLETED' },
    { label: 'Title added', ready: Boolean(showcase?.title?.trim()) },
    { label: 'Summary added', ready: Boolean(showcase?.summary?.trim()) },
    { label: 'Cover media selected', ready: Boolean(showcase?.coverMedia || showcase?.media?.some((item) => item.isCover)) },
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
