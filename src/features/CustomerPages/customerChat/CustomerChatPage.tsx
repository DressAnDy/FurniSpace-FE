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

import { CustomerUserSummary } from '@/shared/components/CustomerUserSummary';

import './CustomerChatPage.css';

type RoleBadge = 'sales' | 'designer' | 'general';

type ConversationItem = {
  id: string;
  initials: string;
  name: string;
  role: RoleBadge;
  roleLabel: string;
  lastMessage: string;
  timestamp: string;
  unread?: number;
};

const navigation = [
  { icon: <IconHome size={15} stroke={1.8} />, label: 'My Projects' },
  { icon: <IconFileText size={15} stroke={1.8} />, label: 'Design Proposals' },
  { icon: <IconSparkles size={15} stroke={1.8} />, label: '2D/3D Review' },
  { icon: <IconReceipt size={15} stroke={1.8} />, label: 'Quotations' },
  { active: true, icon: <IconMessageCircle size={15} stroke={1.8} />, label: 'Project Chat' },
  { icon: <IconBox size={15} stroke={1.8} />, label: 'Handover' },
];

const conversations: ConversationItem[] = [
  {
    id: 'sc',
    initials: 'SC',
    lastMessage: "I've reviewed your budget. Let me prepare a detailed breakdown.",
    name: 'Sarah Chen',
    role: 'sales',
    roleLabel: 'Sales Representative',
    timestamp: '15:30:00 6/6/2026',
    unread: 2,
  },
  {
    id: 'mt',
    initials: 'MT',
    lastMessage: "I've published the new proposal. Please take a look!",
    name: 'Michael Torres',
    role: 'designer',
    roleLabel: 'Interior Designer',
    timestamp: '23:45:00 5/6/2026',
    unread: 1,
  },
  {
    id: 'pt',
    initials: 'PT',
    lastMessage: "Thank you for your patience. We're working on the updates.",
    name: 'Project Team',
    role: 'general',
    roleLabel: 'General Discussion',
    timestamp: '21:20:00 4/6/2026',
  },
];

const activeConversation = conversations[0];

const roleBadgeLabels: Record<RoleBadge, string> = {
  designer: 'DESIGNER',
  general: 'GENERAL',
  sales: 'SALES',
};

export function CustomerChatPage() {
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
                <input type="search" placeholder="Search chats..." />
              </label>
            </div>

            <ul className="customer-chat-list">
              {conversations.map((conv) => (
                <li
                  key={conv.id}
                  className={`customer-chat-list-item${conv.id === activeConversation.id ? ' customer-chat-list-item-active' : ''}`}
                >
                  <button type="button">
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
                <span className="customer-chat-avatar">{activeConversation.initials}</span>
                <div>
                  <strong>{activeConversation.name}</strong>
                  <span>{activeConversation.roleLabel}</span>
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

            <div className="customer-chat-messages" aria-live="polite" />

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
