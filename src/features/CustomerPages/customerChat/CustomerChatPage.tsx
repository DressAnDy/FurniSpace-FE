import {
  IconArrowLeft,
  IconBox,
  IconDotsVertical,
  IconFileText,
  IconHome,
  IconMessageCircle,
  IconPaperclip,
  IconPhone,
  IconPlus,
  IconReceipt,
  IconSearch,
  IconSend,
  IconSparkles,
  IconVideo,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';

import { mockConversations, mockConversationMessages, type ChatRoleBadge } from '@/features/CustomerPages/mockData';
import { CustomerUserSummary } from '@/shared/components/CustomerUserSummary';

import './CustomerChatPage.css';

const navigation = [
  { icon: <IconHome size={15} stroke={1.8} />, label: 'My Projects' },
  { icon: <IconFileText size={15} stroke={1.8} />, label: 'Design Proposals' },
  { icon: <IconSparkles size={15} stroke={1.8} />, label: '2D/3D Review' },
  { icon: <IconReceipt size={15} stroke={1.8} />, label: 'Quotations' },
  { active: true, icon: <IconMessageCircle size={15} stroke={1.8} />, label: 'Project Chat' },
  { icon: <IconBox size={15} stroke={1.8} />, label: 'Handover' },
];

const roleBadgeLabels: Record<ChatRoleBadge, string> = {
  designer: 'DESIGNER',
  general: 'GENERAL',
  sales: 'SALES',
};

export function CustomerChatPage() {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [activeConversationId, setActiveConversationId] = useState(mockConversations[0]?.id ?? '');

  const filteredConversations = useMemo(() => {
    const normalizedKeyword = searchKeyword.trim().toLowerCase();

    if (!normalizedKeyword) {
      return mockConversations;
    }

    return mockConversations.filter((conversation) => {
      return (
        conversation.name.toLowerCase().includes(normalizedKeyword) ||
        conversation.lastMessage.toLowerCase().includes(normalizedKeyword) ||
        conversation.roleLabel.toLowerCase().includes(normalizedKeyword)
      );
    });
  }, [searchKeyword]);

  const activeConversation = filteredConversations.find((conversation) => conversation.id === activeConversationId) ?? filteredConversations[0];
  const activeMessages = activeConversation ? (mockConversationMessages[activeConversation.id] ?? []) : [];

  return (
    <main className="customer-chat-page">
      <TopNavigation />

      <div className="customer-chat-body">
        <header className="customer-chat-page-header">
          <a className="customer-chat-back-link" href="/customer/projects">
            <IconArrowLeft size={16} stroke={1.8} />
            Back to Project
          </a>
          <h1>Project Chat</h1>
        </header>

        <div className="customer-chat-layout">
          <aside className="customer-chat-sidebar">
            <div className="customer-chat-search-wrapper">
              <label className="customer-chat-search">
                <IconSearch size={16} stroke={1.8} />
                <input type="search" placeholder="Search chats..." value={searchKeyword} onChange={(event) => setSearchKeyword(event.target.value)} />
              </label>
            </div>

            <ul className="customer-chat-list">
              {filteredConversations.map((conv) => (
                <li
                  key={conv.id}
                  className={`customer-chat-list-item${conv.id === activeConversation?.id ? ' customer-chat-list-item-active' : ''}`}
                >
                  <button type="button" onClick={() => setActiveConversationId(conv.id)}>
                    <span className="customer-chat-avatar">{conv.initials}</span>

                    <div className="customer-chat-list-info">
                      <div className="customer-chat-list-name-row">
                        <span className="customer-chat-list-name">{conv.name}</span>
                        {conv.unread ? (
                          <span className="customer-chat-badge">{conv.unread}</span>
                        ) : null}
                      </div>

                      <div className="customer-chat-list-role-row">
                        <span className={`customer-chat-role-tag customer-chat-role-tag-${conv.role}`}>
                          {roleBadgeLabels[conv.role]}
                        </span>
                        <span className="customer-chat-role-label">{conv.roleLabel}</span>
                      </div>

                      <p className="customer-chat-list-preview">{conv.lastMessage}</p>
                      <time className="customer-chat-list-time">{conv.timestamp}</time>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <section className="customer-chat-main" aria-label="Chat messages">
            <div className="customer-chat-conversation-header">
              <div className="customer-chat-conversation-identity">
                <span className="customer-chat-avatar">{activeConversation?.initials ?? '--'}</span>
                <div>
                  <strong>{activeConversation?.name ?? 'No conversation selected'}</strong>
                  <span>{activeConversation?.roleLabel ?? 'Choose a conversation on the left panel'}</span>
                </div>
              </div>
              <div className="customer-chat-conversation-actions">
                <button type="button" aria-label="Voice call">
                  <IconPhone size={20} stroke={1.8} />
                </button>
                <button type="button" aria-label="Video call">
                  <IconVideo size={20} stroke={1.8} />
                </button>
                <button type="button" aria-label="More options">
                  <IconDotsVertical size={20} stroke={1.8} />
                </button>
              </div>
            </div>

            <div className="customer-chat-messages" aria-live="polite">
              {activeMessages.map((message) => (
                <article className={`customer-chat-message customer-chat-message-${message.sender}`} key={message.id}>
                  <p>{message.text}</p>
                  <time>{message.timestamp}</time>
                </article>
              ))}
            </div>

            <div className="customer-chat-input-area">
              <button className="customer-chat-attach" type="button" aria-label="Attach file">
                <IconPaperclip size={20} stroke={1.8} />
              </button>
              <textarea
                className="customer-chat-textarea"
                placeholder="Type your message..."
                rows={2}
              />
              <button className="customer-chat-send" type="button" aria-label="Send message">
                <IconSend size={20} stroke={1.8} />
              </button>
            </div>
          </section>

          <aside className="customer-chat-info-panel">
            <h2>Project Information</h2>

            <div className="customer-chat-info-cards">
              <div className="customer-chat-info-card">
                <span>Project</span>
                <strong>Brew &amp; Bean Café Interior</strong>
              </div>

              <div className="customer-chat-info-card">
                <span>Status</span>
                <strong>Waiting for Customer Review</strong>
              </div>
            </div>

            <div className="customer-chat-quick-links">
              <p>Quick Links</p>
              <ul>
                <li>
                  <a href="/projects/detail">View Project Details</a>
                </li>
                <li>
                  <a href="/customer/proposals">View Proposals</a>
                </li>
                <li>
                  <a href="#">View Quotations</a>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function TopNavigation() {
  return (
    <header className="customer-chat-topnav">
      <a className="customer-chat-logo" href="/">
        <span>
          <IconBox size={19} stroke={1.8} />
        </span>
        <strong>FurniSpace</strong>
      </a>

      <nav aria-label="Customer navigation">
        {navigation.map((item) => (
          <a
            className={item.active ? 'customer-chat-nav-active' : undefined}
            href={`#${item.label}`}
            key={item.label}
          >
            {item.icon}
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      <div className="customer-chat-userbar">
        <button className="customer-chat-create" type="button">
          <IconPlus size={15} stroke={2} />
          Create Project Request
        </button>
        <CustomerUserSummary classPrefix="customer-chat" />
      </div>
    </header>
  );
}
