import { IconDownload, IconEye, IconPaperclip, IconUpload } from '@tabler/icons-react';

import type { ProjectDetailProject } from '../ProjectDetail';

type FilesAttachmentsTabProps = {
  project: ProjectDetailProject;
};

export function FilesAttachmentsTab({ project }: FilesAttachmentsTabProps) {
  return (
    <section className="project-detail-card project-detail-tab-panel">
      <header className="project-detail-card-toolbar">
        <div>
          <h3>Files & Attachments</h3>
          <p>Project documents and images uploaded by customer and team</p>
        </div>
        <button className="project-detail-primary-button" type="button">
          <IconUpload size={16} />
          Upload File
        </button>
      </header>
      <div className="project-detail-file-grid">
        {project.files.map((file) => (
          <article key={file.id} className="project-detail-file-card">
            <div className="project-detail-file-icon">
              <IconPaperclip size={22} />
            </div>
            <div className="project-detail-file-copy">
              <h4>{file.name}</h4>
              <p>
                {file.size} - {file.type}
              </p>
              <span>{file.createdDate}</span>
            </div>
            <div className="project-detail-file-actions">
              <button type="button" aria-label={`Preview ${file.name}`}>
                <IconEye size={17} />
              </button>
              <button type="button" aria-label={`Download ${file.name}`}>
                <IconDownload size={17} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
