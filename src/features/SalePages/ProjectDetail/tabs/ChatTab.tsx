import type { ProjectDetailProject } from '../ProjectDetail';
import { ProjectChatPanel } from '@/features/projectChat/ProjectChatPanel';

type ChatTabProps = {
  project: ProjectDetailProject;
};

export function ChatTab({ project }: ChatTabProps) {
  return (
    <div className="project-detail-tab-panel">
      <ProjectChatPanel
        canClose
        preferredChatType="SALES"
        projectCode={project.projectCode}
        projectId={project.projectId}
        title="Sales Chat with Customer"
      />
    </div>
  );
}
