import {
  IconArrowLeft,
  IconDotsVertical,
  IconFile,
  IconPaperclip,
  IconPhone,
  IconSearch,
  IconSend,
  IconVideo,
} from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { CustomerNavbar } from '@/features/CustomerPages/customercomponents';
import { formatChatTime, formatFileSize, formatUnreadBadge, getChatParticipant, getInitials, getMessageContent } from '@/features/projectChat/chatUi';
import {
  getProjectChatServiceResultMessage,
  type ProjectChatListItem,
  type ProjectChatMessage,
  type ProjectChatMessageListResponse,
} from '@/services/api/projectChats';
import { useCurrentUser, useProjectList } from '@/services/queries';
import {
  projectChatQueryKeys,
  upsertProjectChatMessage,
  useProjectChatMessages,
  useProjectChatRealtime,
  useProjectChatUnreadCounts,
  useProjectChats,
  useSendProjectChatFileMessage,
  useSendProjectChatTextMessage,
} from '@/services/queries/useProjectChats';

import './CustomerChatPage.css';

export function CustomerChatPage() {
  const queryClient = useQueryClient();
  const currentUserQuery = useCurrentUser();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [activeProjectId, setActiveProjectId] = useState('');
  const [activeChatId, setActiveChatId] = useState('');
  const [draft, setDraft] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesListRef = useRef<HTMLDivElement | null>(null);
  const projectsQuery = useProjectList({ page: 1, limit: 50 });
  const projects = useMemo(() => projectsQuery.data?.items ?? [], [projectsQuery.data?.items]);
  const activeProject = projects.find((project) => project.projectId === activeProjectId) ?? projects[0] ?? null;
  const activeProjectAssignedDesignerId = activeProject?.assignedDesignerId;
  const activeProjectProjectId = activeProject?.projectId;
  const activeProjectStatus = activeProject?.status;
  const chatListQuery = useProjectChats(
    activeProject
      ? {
          projectId: activeProject.projectId,
          page: 1,
          limit: 20,
        }
      : undefined,
    { enabled: Boolean(activeProject) },
  );
  const { refetch: refetchChats } = chatListQuery;
  const chats = useMemo(() => chatListQuery.data?.items ?? [], [chatListQuery.data?.items]);
  const filteredConversations = useMemo(() => {
    const normalizedKeyword = searchKeyword.trim().toLowerCase();

    if (!normalizedKeyword) {
      return chats;
    }

    return chats.filter((conversation) => {
      const searchable = [
        getChatParticipant(conversation, { viewerRole: 'CUSTOMER' }).name,
        conversation.staffName ?? '',
        conversation.chatType,
        conversation.lastMessage?.contentPreview ?? '',
      ];

      return searchable.some((value) => value.toLowerCase().includes(normalizedKeyword));
    });
  }, [chats, searchKeyword]);
  const activeConversation = filteredConversations.find((chat) => chat.chatId === activeChatId) ?? filteredConversations[0] ?? null;
  const unreadCounts = useProjectChatUnreadCounts(chats, currentUserQuery.data?.accountId, activeConversation?.chatId);
  const messagesQueryParams = activeConversation
    ? {
        chatId: activeConversation.chatId,
        page: 1,
        limit: 50,
        sort: 'ASC' as const,
      }
    : undefined;
  const messagesQuery = useProjectChatMessages(messagesQueryParams);
  const sendTextMutation = useSendProjectChatTextMessage();
  const sendFileMutation = useSendProjectChatFileMessage();

  useEffect(() => {
    if (!activeProjectId && projects.length > 0) {
      setActiveProjectId(projects[0].projectId);
    }
  }, [activeProjectId, projects]);

  useEffect(() => {
    if (activeConversation && activeConversation.chatId !== activeChatId) {
      setActiveChatId(activeConversation.chatId);
    }
  }, [activeChatId, activeConversation]);

  useEffect(() => {
    if (!activeProjectProjectId) {
      return;
    }

    void refetchChats();
  }, [activeProjectAssignedDesignerId, activeProjectProjectId, activeProjectStatus, refetchChats]);

  useEffect(() => {
    const messageList = messagesListRef.current;

    if (!messageList) {
      return;
    }

    requestAnimationFrame(() => {
      messageList.scrollTo({
        top: messageList.scrollHeight,
        behavior: 'smooth',
      });
    });
  }, [messagesQuery.data?.items.length, activeConversation?.chatId, errorMessage]);

  useProjectChatRealtime({
    projectId: activeProject?.projectId,
    activeChatId: activeConversation?.chatId,
    enabled: Boolean(activeProject && activeConversation),
    onMessage: (event) => {
      if (!activeProject) return;

      void queryClient.invalidateQueries({ queryKey: projectChatQueryKeys.list({ projectId: activeProject.projectId, page: 1, limit: 20 }) });
      queryClient.setQueryData(
        projectChatQueryKeys.messages({
          chatId: event.chatId,
          page: 1,
          limit: 50,
          sort: 'ASC',
        }),
        (current: ProjectChatMessageListResponse | undefined) => upsertProjectChatMessage(current, event.message),
      );
    },
  });

  async function handleSendText() {
    const content = draft.trim();

    if (!activeConversation || (!content && !selectedFile) || sendTextMutation.isPending || sendFileMutation.isPending) {
      return;
    }

    setDraft('');
    setErrorMessage('');

    try {
      const savedMessage = selectedFile
        ? await sendFileMutation.mutateAsync({
            chatId: activeConversation.chatId,
            file: selectedFile,
            content,
          })
        : await sendTextMutation.mutateAsync({
            chatId: activeConversation.chatId,
            content,
          });

      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (messagesQueryParams) {
        queryClient.setQueryData(projectChatQueryKeys.messages(messagesQueryParams), (current: ProjectChatMessageListResponse | undefined) =>
          upsertProjectChatMessage(current, savedMessage),
        );
      }

      void chatListQuery.refetch();
    } catch (error) {
      setErrorMessage(getProjectChatServiceResultMessage(error));
      void messagesQuery.refetch();
      void chatListQuery.refetch();
    }
  }

  function handleFileChange(file?: File) {
    if (file) {
      setSelectedFile(file);
    }
  }

  return (
    <main className="customer-chat-page">
      <CustomerNavbar activeLabel="Project Chat" classPrefix="customer-chat" />

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
              <label className="customer-chat-project-select">
                <span>Project</span>
                <select
                  value={activeProject?.projectId ?? ''}
                  onChange={(event) => {
                    setActiveProjectId(event.target.value);
                    setActiveChatId('');
                  }}
                >
                  {projects.map((project) => (
                    <option key={project.projectId} value={project.projectId}>
                      {project.projectName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="customer-chat-search">
                <IconSearch size={16} stroke={1.8} />
                <input type="search" placeholder="Search chats..." value={searchKeyword} onChange={(event) => setSearchKeyword(event.target.value)} />
              </label>
            </div>

            <ul className="customer-chat-list">
              {projectsQuery.isLoading ? <li className="customer-chat-list-state">Loading projects...</li> : null}
              {chatListQuery.isLoading ? <li className="customer-chat-list-state">Loading chats...</li> : null}
              {chatListQuery.isError ? <li className="customer-chat-list-state">{getProjectChatServiceResultMessage(chatListQuery.error)}</li> : null}
              {!chatListQuery.isLoading && !chatListQuery.isError && filteredConversations.length === 0 ? (
                <li className="customer-chat-list-state">No chat is available for this project.</li>
              ) : null}
              {filteredConversations.map((conversation) => (
                <ConversationItem
                  conversation={conversation}
                  isActive={conversation.chatId === activeConversation?.chatId}
                  key={conversation.chatId}
                  onSelect={() => setActiveChatId(conversation.chatId)}
                  unreadCount={unreadCounts[conversation.chatId] ?? 0}
                />
              ))}
            </ul>
          </aside>

          <section className="customer-chat-main" aria-label="Chat messages">
            <div className="customer-chat-conversation-header">
              <div className="customer-chat-conversation-identity">
                <span className="customer-chat-avatar">{getInitials(getChatParticipant(activeConversation, { viewerRole: 'CUSTOMER' }).name, activeConversation?.chatType)}</span>
                <div>
                  <strong>{getChatParticipant(activeConversation, { viewerRole: 'CUSTOMER' }).name}</strong>
                  <span>{getChatParticipant(activeConversation, { viewerRole: 'CUSTOMER' }).role}</span>
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

            <div className="customer-chat-messages" aria-live="polite" ref={messagesListRef}>
              {errorMessage ? <div className="customer-chat-message customer-chat-message-system">{errorMessage}</div> : null}
              {messagesQuery.isLoading ? <div className="customer-chat-message customer-chat-message-system">Loading messages...</div> : null}
              {messagesQuery.isError ? (
                <div className="customer-chat-message customer-chat-message-system">{getProjectChatServiceResultMessage(messagesQuery.error)}</div>
              ) : null}
              {!messagesQuery.isLoading && !messagesQuery.isError && activeConversation && (messagesQuery.data?.items.length ?? 0) === 0 ? (
                <div className="customer-chat-message customer-chat-message-system">No messages yet.</div>
              ) : null}
              {messagesQuery.data?.items.map((message) => (
                <CustomerMessage currentUserId={currentUserQuery.data?.accountId} key={message.messageId} message={message} />
              ))}
            </div>
            <div className="customer-chat-input-area">
              <input ref={fileInputRef} hidden type="file" onChange={(event) => handleFileChange(event.target.files?.[0])} />
              <button className="customer-chat-attach" disabled={!activeConversation || sendFileMutation.isPending} type="button" aria-label="Attach file" onClick={() => fileInputRef.current?.click()}>
                <IconPaperclip size={20} stroke={1.8} />
              </button>
              <div className="customer-chat-composer-main">
                {selectedFile ? (
                  <div className="customer-chat-selected-file">
                    <IconFile size={15} />
                    <span>{selectedFile.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ) : null}
                <textarea
                  className="customer-chat-textarea"
                  disabled={!activeConversation || sendTextMutation.isPending || sendFileMutation.isPending}
                  placeholder={selectedFile ? 'Add a message for this file...' : 'Type your message...'}
                  rows={2}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void handleSendText();
                    }
                  }}
                />
              </div>
              <button className="customer-chat-send" disabled={!activeConversation || (!draft.trim() && !selectedFile) || sendTextMutation.isPending || sendFileMutation.isPending} type="button" aria-label="Send message" onClick={() => void handleSendText()}>
                <IconSend size={20} stroke={1.8} />
              </button>
            </div>
          </section>

          <aside className="customer-chat-info-panel">
            <h2>Project Information</h2>

            <div className="customer-chat-info-cards">
              <div className="customer-chat-info-card">
                <span>Project</span>
                <strong>{activeProject?.projectName ?? 'No project selected'}</strong>
              </div>

              <div className="customer-chat-info-card">
                <span>Status</span>
                <strong>{activeProject?.status ? formatEnumLabel(activeProject.status) : '-'}</strong>
              </div>

              <div className="customer-chat-info-card">
                <span>Active Chat</span>
                <strong>{activeConversation ? `${getChatParticipant(activeConversation, { viewerRole: 'CUSTOMER' }).name} - ${activeConversation.status}` : '-'}</strong>
              </div>
            </div>

            <div className="customer-chat-quick-links">
              <p>Quick Links</p>
              <ul>
                <li>
                  <a href="/customer/projects">View Project Details</a>
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

function ConversationItem({
  conversation,
  isActive,
  onSelect,
  unreadCount,
}: {
  conversation: ProjectChatListItem;
  isActive: boolean;
  onSelect: () => void;
  unreadCount: number;
}) {
  const participant = getChatParticipant(conversation, { viewerRole: 'CUSTOMER' });
  const unreadBadge = formatUnreadBadge(unreadCount);

  return (
    <li className={`customer-chat-list-item${isActive ? ' customer-chat-list-item-active' : ''}`}>
      <button type="button" onClick={onSelect}>
        <span className="customer-chat-avatar">{getInitials(participant.name, conversation.chatType)}</span>

        <div className="customer-chat-list-info">
          <div className="customer-chat-list-name-row">
            <span className="customer-chat-list-name">{participant.name}</span>
            {unreadBadge ? <span className="customer-chat-badge">{unreadBadge}</span> : null}
          </div>

          <div className="customer-chat-list-role-row">
            <span className={`customer-chat-role-tag customer-chat-role-tag-${conversation.chatType.toLowerCase()}`}>
              {conversation.chatType}
            </span>
            <span className="customer-chat-role-label">{participant.role}</span>
          </div>

          <p className="customer-chat-list-preview">{conversation.lastMessage?.contentPreview ?? 'No messages yet'}</p>
          <time className="customer-chat-list-time">{formatChatTime(conversation.lastMessage?.createdAt ?? conversation.createdAt)}</time>
        </div>
      </button>
    </li>
  );
}

function CustomerMessage({ currentUserId, message }: { currentUserId?: string; message: ProjectChatMessage }) {
  const isMine = Boolean(currentUserId && message.senderId === currentUserId);
  const senderClass = message.messageType === 'SYSTEM' ? 'system' : isMine ? 'self' : 'other';

  return (
    <article className={`customer-chat-message customer-chat-message-${senderClass}`}>
      <p>{message.content ?? (message.attachment ? 'Attachment' : getMessageContent(message))}</p>
      {message.attachment ? (
        <a className="customer-chat-attachment" href={message.attachment.fileUrl} rel="noreferrer" target="_blank">
          <IconFile size={15} />
          <span>{message.attachment.originalFileName}</span>
          <small>{formatFileSize(message.attachment.fileSizeBytes)}</small>
        </a>
      ) : null}
      <time>{formatChatTime(message.createdAt)}</time>
    </article>
  );
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
