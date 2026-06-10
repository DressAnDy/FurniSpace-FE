import { IconPaperclip, IconSend } from '@tabler/icons-react';

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
          <p>Direct communication with Michael Chen</p>
        </div>
        <span className="project-detail-chat-badge">Sales Chat</span>
      </header>
      <div className="project-detail-message-list">
        {project.messages.map((message) =>
          message.isSystem ? (
            <div key={message.id} className="project-detail-system-message">
              {message.text}
            </div>
          ) : (
            <div key={message.id} className="project-detail-message-row">
              <div className="project-detail-message-avatar">{message.avatar}</div>
              <div className="project-detail-message-bubble">
                <div className="project-detail-message-meta">
                  <strong>{message.sender}</strong>
                  <span>{message.role}</span>
                  <span>{message.time}</span>
                </div>
                <p>{message.text}</p>
              </div>
            </div>
          ),
        )}
      </div>
      <div className="project-detail-chat-input">
        <button className="project-detail-attach-button" type="button" aria-label="Attach file">
          <IconPaperclip size={18} />
        </button>
        <input placeholder="Type your message..." />
        <button type="button">
          <IconSend size={18} />
          Send
        </button>
      </div>
    </section>
  );
}
