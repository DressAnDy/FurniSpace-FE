import { IconDownload, IconEye, IconFileText } from '@tabler/icons-react';

import { useLang } from '@/app/providers/useLang';
import { designerCopy } from '@/features/DesignerPages/designercomponents';
import type { ProjectDto } from '@/services/api/projects';
import { useProjectFiles } from '@/services/queries/useProjects';

type SpaceFilesTabProps = {
  project: ProjectDto;
};

export function SpaceFilesTab({ project }: SpaceFilesTabProps) {
  const { lang } = useLang();
  const t = designerCopy[lang].spaceFilesTab;
  const filesQuery = useProjectFiles({
    projectId: project.projectId,
    fileType: null,
    page: 1,
    limit: 50,
  });
  const files = filesQuery.data?.items ?? [];

  return (
    <section className="designer-card designer-project-section-card">
      <div className="designer-project-section-toolbar">
        <div>
          <h3>{t.title}</h3>
          <p>
            {filesQuery.isLoading ? t.loading : t.count(files.length, project.projectCode)}
          </p>
        </div>
      </div>

      {filesQuery.isLoading ? <p className="designer-project-empty-text">{t.loading}</p> : null}
      {filesQuery.isError ? (
        <p className="designer-project-file-message designer-project-file-error">
          {t.error}
        </p>
      ) : null}
      {!filesQuery.isLoading && !filesQuery.isError && files.length === 0 ? (
        <p className="designer-project-file-message">
          {t.empty}
        </p>
      ) : null}

      {files.length > 0 ? (
        <div className="designer-project-file-grid">
          {files.map((file) => {
            const fileName = getDisplayFileName(file.originalFileName, t.projectFile);

            return (
              <article className="designer-project-file-card" key={file.fileLinkId}>
                <div className="designer-project-file-icon">
                  <IconFileText size={22} stroke={1.8} />
                </div>
                <div className="designer-project-file-content">
                  <div className="designer-project-file-heading">
                    <div className="designer-project-file-name">
                      <h4>{fileName}</h4>
                      <p>{formatEnumLabel(file.fileType)}</p>
                    </div>
                    <span className="designer-project-status designer-project-status-new">{formatEnumLabel(file.visibility)}</span>
                  </div>
                  <p className="designer-project-file-meta">{formatFileSize(file.fileSize)} - {formatDate(file.uploadedAt)}</p>
                  <div className="designer-project-file-actions">
                    <button className="designer-project-icon-button" type="button" aria-label={t.preview(fileName)} onClick={() => window.open(file.publicUrl, '_blank', 'noopener,noreferrer')}>
                      <IconEye size={17} />
                    </button>
                    <button className="designer-project-icon-button" type="button" aria-label={t.download(fileName)} onClick={() => window.open(file.publicUrl, '_blank', 'noopener,noreferrer')}>
                      <IconDownload size={17} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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

function getDisplayFileName(value: string | null | undefined, fallback: string) {
  const normalizedValue = value?.trim();

  if (!normalizedValue || isTechnicalId(normalizedValue)) {
    return fallback;
  }

  return normalizedValue;
}

function isTechnicalId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    || /^[0-9a-f]{24}$/i.test(value);
}
