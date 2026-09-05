import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconFile,
  IconMessageCircle,
  IconMessages,
  IconSearch,
  IconSend,
} from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

import { useLang } from '@/app/providers/useLang';
import { SaleNavbar, SaleSidebar, saleCopy } from '@/features/SalePages/salecomponents';
import {
  formatChatTime,
  formatFileSize,
  formatUnreadBadge,
  getChatParticipant,
  getChatTypeLabel,
  getInitials,
  getMessageContent,
} from '@/features/projectChat/chatUi';
import {
  getProjectChatServiceResultMessage,
  type ProjectChatMessage,
  type ProjectChatMessageListResponse,
} from '@/services/api/projectChats';
import type { ProjectListItemDto } from '@/services/api/projects';
import { useAccountDetail, useCurrentUser, useProjectList } from '@/services/queries';
import {
  projectChatQueryKeys,
  upsertProjectChatMessage,
  useProjectChatMessages,
  useProjectChatRealtime,
  useProjectChatUnreadCounts,
  useProjectChats,
  useSendProjectChatTextMessage,
} from '@/services/queries/useProjectChats';

import './SaleProjectChat.css';

const PROJECT_PAGE_SIZE = 5;

export function SaleProjectChat() {
  const { lang } = useLang();
  const t = saleCopy[lang];
  const c = t.projectChat;
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUserQuery = useCurrentUser();
  const currentUser = currentUserQuery.data;
  const [projectSearch, setProjectSearch] = useState('');
  const [projectPage, setProjectPage] = useState(1);
  const [activeProjectId, setActiveProjectId] = useState(() => searchParams.get('projectId') ?? '');
  const [activeChatId, setActiveChatId] = useState<string | null>(() => searchParams.get('chatId'));
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isChannelMenuOpen, setIsChannelMenuOpen] = useState(false);
  const messagesListRef = useRef<HTMLDivElement | null>(null);
  const channelSelectRef = useRef<HTMLDivElement | null>(null);
  const activeProjectIdRef = useRef(activeProjectId);

  const assignedProjectsQuery = useProjectList(
    {
      assignedSalesId: currentUser?.accountId,
      page: 1,
      limit: 100,
    },
    { enabled: Boolean(currentUser?.accountId) },
  );
  const projects = useMemo(
    () => assignedProjectsQuery.data?.items ?? [],
    [assignedProjectsQuery.data?.items],
  );
  const filteredProjects = useMemo(() => {
    const keyword = projectSearch.trim().toLowerCase();

    if (!keyword) return projects;

    return projects.filter((project) =>
      (project.projectCode ?? '').toLowerCase().includes(keyword),
    );
  }, [projectSearch, projects]);
  const totalProjectPages = Math.max(1, Math.ceil(filteredProjects.length / PROJECT_PAGE_SIZE));
  const currentProjectPage = Math.min(projectPage, totalProjectPages);
  const pagedProjects = useMemo(() => {
    const start = (currentProjectPage - 1) * PROJECT_PAGE_SIZE;
    return filteredProjects.slice(start, start + PROJECT_PAGE_SIZE);
  }, [currentProjectPage, filteredProjects]);
  const activeProject = useMemo(
    () => projects.find((project) => project.projectId === activeProjectId) ?? null,
    [activeProjectId, projects],
  );
  const customerQuery = useAccountDetail(activeProject?.customerId);
  const chatListQuery = useProjectChats(
    activeProjectId
      ? {
          projectId: activeProjectId,
          page: 1,
          limit: 20,
        }
      : undefined,
    { enabled: Boolean(activeProjectId) },
  );
  const chats = useMemo(
    () => (chatListQuery.data?.items ?? []).filter((chat) => chat.chatType === 'SALES' || chat.chatType === 'PRODUCTION'),
    [chatListQuery.data?.items],
  );
  const chatIdsKey = chats.map((chat) => chat.chatId).join('|');
  const activeChat = chats.find((chat) => chat.chatId === activeChatId) ?? null;
  const unreadCounts = useProjectChatUnreadCounts(chats, currentUser?.accountId, activeChat?.chatId);
  const messagesQueryParams = activeChat
    ? {
        chatId: activeChat.chatId,
        page: 1,
        limit: 50,
        sort: 'ASC' as const,
      }
    : undefined;
  const messagesQuery = useProjectChatMessages(messagesQueryParams);
  const sendTextMutation = useSendProjectChatTextMessage();
  const activeParticipant = getChatParticipant(activeChat, {
    viewerRole: 'SALES',
    customerName: customerQuery.data?.fullName,
    customerFallback: activeProject?.customerId,
  });

  useEffect(() => {
    activeProjectIdRef.current = activeProjectId;
  }, [activeProjectId]);

  useEffect(() => {
    setProjectPage(1);
  }, [projectSearch]);

  useEffect(() => {
    if (projectPage > totalProjectPages) {
      setProjectPage(totalProjectPages);
    }
  }, [projectPage, totalProjectPages]);

  useEffect(() => {
    if (!activeProjectId) return;

    const activeIndex = filteredProjects.findIndex((project) => project.projectId === activeProjectId);
    if (activeIndex < 0) return;

    setProjectPage(Math.floor(activeIndex / PROJECT_PAGE_SIZE) + 1);
  }, [activeProjectId, filteredProjects]);

  useEffect(() => {
    if (activeProjectId && projects.some((project) => project.projectId === activeProjectId)) {
      return;
    }

    if (projects.length === 0) {
      return;
    }

    const nextProjectId = projects[0].projectId;
    setActiveProjectId(nextProjectId);
    setActiveChatId(null);
    setSearchParams({ projectId: nextProjectId }, { replace: true });
  }, [activeProjectId, projects, setSearchParams]);

  useEffect(() => {
    if (!activeProjectId || chats.length === 0) {
      if (activeChatId && chats.length === 0) {
        setActiveChatId(null);
      }
      return;
    }

    if (activeChatId && chats.some((chat) => chat.chatId === activeChatId)) {
      return;
    }

    const nextChatId = chats[0].chatId;
    setActiveChatId(nextChatId);
    setSearchParams({ projectId: activeProjectId, chatId: nextChatId }, { replace: true });
    // chats is keyed by chatIdsKey to avoid identity churn from filtered arrays.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatId, activeProjectId, chatIdsKey, setSearchParams]);

  useEffect(() => {
    const messageList = messagesListRef.current;
    if (!messageList) return;

    requestAnimationFrame(() => {
      messageList.scrollTo({
        top: messageList.scrollHeight,
        behavior: 'smooth',
      });
    });
  }, [messagesQuery.data?.items.length, activeChat?.chatId, message]);

  useProjectChatRealtime({
    projectId: activeProjectId || null,
    activeChatId: activeChat?.chatId ?? null,
    enabled: Boolean(activeProjectId),
    onMessage: (event) => {
      const projectId = activeProjectIdRef.current;
      if (!projectId) return;

      void queryClient.invalidateQueries({
        queryKey: projectChatQueryKeys.list({ projectId, page: 1, limit: 20 }),
      });
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

  useEffect(() => {
    if (!isChannelMenuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!channelSelectRef.current?.contains(event.target as Node)) {
        setIsChannelMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsChannelMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isChannelMenuOpen]);

  useEffect(() => {
    setIsChannelMenuOpen(false);
  }, [activeProjectId, activeChatId]);

  async function handleSendText() {
    const content = draft.trim();

    if (!activeChat || !content || sendTextMutation.isPending) {
      return;
    }

    setMessage(null);
    setDraft('');

    try {
      const savedMessage = await sendTextMutation.mutateAsync({
        chatId: activeChat.chatId,
        content,
      });

      if (messagesQueryParams) {
        queryClient.setQueryData(
          projectChatQueryKeys.messages(messagesQueryParams),
          (current: ProjectChatMessageListResponse | undefined) => upsertProjectChatMessage(current, savedMessage),
        );
      }

      void chatListQuery.refetch();
    } catch (error) {
      setMessage(getProjectChatServiceResultMessage(error));
      void chatListQuery.refetch();
      void messagesQuery.refetch();
    }
  }

  function selectProject(project: ProjectListItemDto) {
    if (project.projectId === activeProjectId) return;

    setActiveProjectId(project.projectId);
    setActiveChatId(null);
    setDraft('');
    setMessage(null);
    setSearchParams({ projectId: project.projectId }, { replace: true });
  }

  function selectChat(chatId: string) {
    if (chatId === activeChatId) {
      setIsChannelMenuOpen(false);
      return;
    }

    setActiveChatId(chatId);
    setIsChannelMenuOpen(false);
    if (!activeProjectId) return;
    setSearchParams({ projectId: activeProjectId, chatId }, { replace: true });
  }

  return (
    <div className="sale-project-chat-shell">
      <SaleSidebar activeKey="projectChat" />
      <div className="sale-project-chat-content">
        <SaleNavbar />
        <main className="sale-project-chat-main">
          <section className="sale-project-chat-heading">
            <div>
              <h2>{c.title}</h2>
              <p>{c.subtitle}</p>
            </div>
            <div className="sale-project-chat-summary">
              <IconMessages size={16} />
              <span>{c.projectCount(filteredProjects.length)}</span>
            </div>
          </section>

          <div className="sale-project-chat-layout">
            <aside className="sale-project-chat-projects">
              <div className="sale-project-chat-projects-header">
                <strong>{c.assignedProjects}</strong>
                <small>
                  {t.common.page} {currentProjectPage}/{totalProjectPages}
                </small>
              </div>

              <label className="sale-project-chat-search">
                <IconSearch size={16} aria-hidden />
                <input
                  placeholder={c.searchByCode}
                  type="search"
                  value={projectSearch}
                  onChange={(event) => setProjectSearch(event.target.value)}
                />
              </label>

              {assignedProjectsQuery.isLoading ? <p className="sale-project-chat-muted">{c.loadingProjects}</p> : null}
              {assignedProjectsQuery.isError ? <p className="sale-project-chat-muted">{c.unableLoadProjects}</p> : null}
              {!assignedProjectsQuery.isLoading && filteredProjects.length === 0 ? (
                <p className="sale-project-chat-muted">{c.noProjects}</p>
              ) : null}

              <div className="sale-project-chat-project-list">
                {pagedProjects.map((project) => (
                  <button
                    className={project.projectId === activeProjectId ? 'is-active' : ''}
                    key={project.projectId}
                    type="button"
                    onClick={() => selectProject(project)}
                  >
                    <strong>{project.projectName}</strong>
                    <small>
                      {project.projectCode}
                      <span aria-hidden> · </span>
                      {formatStatusLabel(project.status)}
                    </small>
                    <span className="sale-project-chat-project-meta">{project.businessType || t.common.noBusinessType}</span>
                  </button>
                ))}
              </div>

              {filteredProjects.length > 0 ? (
                <div className="sale-project-chat-pagination">
                  <button
                    aria-label={t.common.previous}
                    disabled={currentProjectPage <= 1}
                    type="button"
                    onClick={() => setProjectPage((current) => Math.max(1, current - 1))}
                  >
                    <IconChevronLeft size={16} />
                  </button>
                  <span>
                    {currentProjectPage} / {totalProjectPages}
                  </span>
                  <button
                    aria-label={t.common.next}
                    disabled={currentProjectPage >= totalProjectPages}
                    type="button"
                    onClick={() => setProjectPage((current) => Math.min(totalProjectPages, current + 1))}
                  >
                    <IconChevronRight size={16} />
                  </button>
                </div>
              ) : null}
            </aside>

            <section className="sale-project-chat-panel">
              {!activeProject ? (
                <div className="sale-project-chat-empty">
                  <span className="sale-project-chat-empty-icon">
                    <IconMessageCircle size={28} />
                  </span>
                  <h3>{c.selectProjectTitle}</h3>
                  <p>{c.selectProjectHint}</p>
                </div>
              ) : (
                <>
                  <header className="sale-project-chat-panel-header">
                    <div className="sale-project-chat-panel-heading">
                      <h3>{activeProject.projectName}</h3>
                      <p>{activeProject.projectCode}</p>
                    </div>

                    <div className="sale-project-chat-panel-header-side">
                      <div className="sale-project-chat-channel-select" ref={channelSelectRef}>
                        {chatListQuery.isLoading || chatListQuery.isError || chats.length === 0 ? (
                          <div className="sale-project-chat-channel-trigger is-static">
                            <span className="sale-project-chat-avatar is-header">
                              {getInitials(activeParticipant.name, activeParticipant.role)}
                            </span>
                            <span className="sale-project-chat-channel-select-body">
                              <strong>
                                {chatListQuery.isLoading
                                  ? c.loadingChats
                                  : chatListQuery.isError
                                    ? getProjectChatServiceResultMessage(chatListQuery.error)
                                    : c.noChatAvailable}
                              </strong>
                              <span>{activeParticipant.role}</span>
                            </span>
                          </div>
                        ) : (
                          <>
                            <button
                              aria-expanded={isChannelMenuOpen}
                              aria-haspopup="listbox"
                              className="sale-project-chat-channel-trigger"
                              type="button"
                              onClick={() => {
                                if (chats.length <= 1) return;
                                setIsChannelMenuOpen((open) => !open);
                              }}
                            >
                              <span className="sale-project-chat-avatar is-header">
                                {getInitials(activeParticipant.name, activeParticipant.role)}
                              </span>
                              <span className="sale-project-chat-channel-select-body">
                                <strong>{activeParticipant.name}</strong>
                                <span>
                                  {activeParticipant.role}
                                  {activeChat ? ` · ${getChatTypeLabel(activeChat.chatType)}` : ''}
                                </span>
                              </span>
                              <IconChevronDown
                                className={isChannelMenuOpen ? 'is-open' : undefined}
                                size={16}
                                aria-hidden
                              />
                            </button>

                            {isChannelMenuOpen ? (
                              <div className="sale-project-chat-channel-menu" role="listbox">
                                {chats.map((chat) => {
                                  const participant = getChatParticipant(chat, {
                                    viewerRole: 'SALES',
                                    customerName: customerQuery.data?.fullName,
                                    customerFallback: activeProject.customerId,
                                  });
                                  const unreadBadge = formatUnreadBadge(unreadCounts[chat.chatId] ?? 0);
                                  const isActive = chat.chatId === activeChat?.chatId;

                                  return (
                                    <button
                                      aria-selected={isActive}
                                      className={isActive ? 'is-active' : undefined}
                                      key={chat.chatId}
                                      role="option"
                                      type="button"
                                      onClick={() => selectChat(chat.chatId)}
                                    >
                                      <span className="sale-project-chat-channel-menu-copy">
                                        <strong>{participant.name}</strong>
                                        <small>
                                          {participant.role}
                                          {` · ${getChatTypeLabel(chat.chatType)}`}
                                        </small>
                                      </span>
                                      {unreadBadge ? (
                                        <span className="sale-project-chat-channel-menu-unread">{unreadBadge}</span>
                                      ) : null}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : null}
                          </>
                        )}
                      </div>
                    </div>
                  </header>

                  {message ? <p className="sale-project-chat-error">{message}</p> : null}

                  <div className="sale-project-chat-thread">
                    <div className="sale-project-chat-messages" ref={messagesListRef}>
                      {messagesQuery.isLoading ? <p className="sale-project-chat-system">{c.loadingMessages}</p> : null}
                      {messagesQuery.isError ? (
                        <p className="sale-project-chat-system">{getProjectChatServiceResultMessage(messagesQuery.error)}</p>
                      ) : null}
                      {!messagesQuery.isLoading &&
                      !messagesQuery.isError &&
                      activeChat &&
                      (messagesQuery.data?.items.length ?? 0) === 0 ? (
                        <div className="sale-project-chat-empty-thread">
                          <IconMessages size={22} />
                          <p>{c.noMessages}</p>
                        </div>
                      ) : null}
                      {messagesQuery.data?.items.map((chatMessage) => (
                        <MessageRow
                          currentUserId={currentUser?.accountId}
                          key={chatMessage.messageId}
                          message={chatMessage}
                        />
                      ))}
                    </div>

                    <div className="sale-project-chat-input">
                      <input
                        disabled={!activeChat || sendTextMutation.isPending}
                        placeholder={activeChat ? c.typeMessage : c.selectChatToStart}
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            void handleSendText();
                          }
                        }}
                      />
                      <button
                        disabled={!activeChat || !draft.trim() || sendTextMutation.isPending}
                        type="button"
                        onClick={() => void handleSendText()}
                      >
                        <span>{sendTextMutation.isPending ? t.common.sending : t.common.send}</span>
                        <IconSend size={17} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function MessageRow({
  currentUserId,
  message,
}: Readonly<{ currentUserId?: string; message: ProjectChatMessage }>) {
  const isMine = Boolean(currentUserId && message.senderId === currentUserId);

  if (message.messageType === 'SYSTEM') {
    return <p className="sale-project-chat-system">{getMessageContent(message)}</p>;
  }

  return (
    <article className={`sale-project-chat-message${isMine ? ' is-mine' : ''}`}>
      <span className="sale-project-chat-avatar">{getInitials(message.senderName, message.senderRole)}</span>
      <div className="sale-project-chat-bubble">
        <div className="sale-project-chat-meta">
          <strong>{message.senderName ?? message.senderRole ?? 'Unknown'}</strong>
          <span>{message.senderRole}</span>
          <span>{formatChatTime(message.createdAt)}</span>
        </div>
        <p>{message.content ?? (message.attachment ? 'Attachment' : 'Message deleted')}</p>
        {message.attachment ? (
          <a
            className="sale-project-chat-attachment"
            href={message.attachment.fileUrl}
            rel="noreferrer"
            target="_blank"
          >
            <IconFile size={15} />
            <span>{message.attachment.originalFileName}</span>
            <small>{formatFileSize(message.attachment.fileSizeBytes)}</small>
          </a>
        ) : null}
      </div>
    </article>
  );
}

function formatStatusLabel(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
