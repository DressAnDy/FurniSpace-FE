import type { ProjectDetailProject } from '../ProjectDetail';

type ChatTabProps = {
  project: ProjectDetailProject;
};

export function ChatTab({ project }: ChatTabProps) {
  return (
    <section className="project-detail-card project-detail-tab-panel project-detail-chat-card">
      <header className="project-detail-chat-header-row">
        <div>
          <h3>Sales Chat with Customer</h3>
          <p>{project.projectCode}</p>
        </div>
        <span className="project-detail-chat-badge">Not Connected</span>
      </header>
      <p className="project-detail-api-note">
        Missing API in current guide: chat/message endpoints are not documented for project detail, so this tab does not render mock messages.
      </p>
    </section>
  );
}
