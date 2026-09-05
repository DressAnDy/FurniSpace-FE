import {
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

import { ProductionNavbar, ProductionSidebar } from '@/features/ProductionPages/productioncomponents';
import { getProductionRequestStatusLabel } from '@/features/ProductionPages/utils';
import {
  formatChatTime,
  formatFileSize,
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
import type { ProductionRequestQueueItemDto } from '@/services/api/production';
import {
  useCurrentUser,
  useProductionRequests,
} from '@/services/queries';
import {
  projectChatQueryKeys,
  upsertProjectChatMessage,
  useProjectChatMessages,
  useProjectChatRealtime,
  useProjectChats,
  useSendProjectChatTextMessage,
} from '@/services/queries/useProjectChats';

import './ProductionProjectChat.css';

const REQUEST_PAGE_SIZE = 4;

export function ProductionProjectChat() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUserQuery = useCurrentUser();
  const currentUser = currentUserQuery.data;
  const [requestSearch, setRequestSearch] = useState('');
  const [requestPage, setRequestPage] = useState(1);
  const [activeProjectId, setActiveProjectId] = useState(() => searchParams.get('projectId') ?? '');
  const [activeRequestId, setActiveRequestId] = useState(() => searchParams.get('productionRequestId') ?? '');
  const [activeChatId, setActiveChatId] = useState<string | null>(() => searchParams.get('chatId'));
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const messagesListRef = useRef<HTMLDivElement | null>(null);
  const activeProjectIdRef = useRef(activeProjectId);

  const requestsQuery = useProductionRequests({
    assignedTo: null,
    priority: null,
    status: null,
  });
  const requests = useMemo(() => requestsQuery.data?.items ?? [], [requestsQuery.data?.items]);
  const filteredRequests = useMemo(() => {
    const keyword = requestSearch.trim().toLowerCase();
    if (!keyword) return requests;

    return requests.filter((request) =>
      [request.productionCode, request.projectCode, request.projectName, request.orderCode]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword)),
    );
  }, [requestSearch, requests]);
  const totalRequestPages = Math.max(1, Math.ceil(filteredRequests.length / REQUEST_PAGE_SIZE));
  const currentRequestPage = Math.min(requestPage, totalRequestPages);
  const pagedRequests = useMemo(() => {
    const start = (currentRequestPage - 1) * REQUEST_PAGE_SIZE;
    return filteredRequests.slice(start, start + REQUEST_PAGE_SIZE);
  }, [currentRequestPage, filteredRequests]);
  const activeRequest = useMemo(() => {
    if (activeRequestId) {
      return requests.find((request) => request.productionRequestId === activeRequestId) ?? null;
    }

    return requests.find((request) => request.projectId === activeProjectId) ?? null;
  }, [activeProjectId, activeRequestId, requests]);
  const resolvedProjectId = activeRequest?.projectId || activeProjectId;

  const chatListQuery = useProjectChats(
    resolvedProjectId
      ? {
          projectId: resolvedProjectId,
          chatType: 'PRODUCTION',
          page: 1,
          limit: 20,
        }
      : undefined,
    { enabled: Boolean(resolvedProjectId) },
  );
  const chats = useMemo(
    () => (chatListQuery.data?.items ?? []).filter((chat) => chat.chatType === 'PRODUCTION'),
    [chatListQuery.data?.items],
  );
  const chatIdsKey = chats.map((chat) => chat.chatId).join('|');
  const activeChat = chats.find((chat) => chat.chatId === activeChatId) ?? chats[0] ?? null;
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
    viewerRole: 'PRODUCTION',
  });

  useEffect(() => {
    activeProjectIdRef.current = resolvedProjectId;
  }, [resolvedProjectId]);

  useEffect(() => {
    setRequestPage(1);
  }, [requestSearch]);

  useEffect(() => {
    if (requestPage > totalRequestPages) {
      setRequestPage(totalRequestPages);
    }
  }, [requestPage, totalRequestPages]);

  useEffect(() => {
    if (!activeRequest) return;

    const activeIndex = filteredRequests.findIndex(
      (request) => request.productionRequestId === activeRequest.productionRequestId,
    );
    if (activeIndex < 0) return;

    setRequestPage(Math.floor(activeIndex / REQUEST_PAGE_SIZE) + 1);
  }, [activeRequest, filteredRequests]);

  useEffect(() => {
    if (activeRequest) return;
    if (requests.length === 0) return;

    const next = requests[0];
    setActiveRequestId(next.productionRequestId);
    setActiveProjectId(next.projectId);
    setActiveChatId(null);
    setSearchParams(
      { projectId: next.projectId, productionRequestId: next.productionRequestId },
      { replace: true },
    );
  }, [activeRequest, requests, setSearchParams]);

  useEffect(() => {
    if (!resolvedProjectId || chats.length === 0) {
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
    if (!activeRequest) return;
    setSearchParams(
      {
        projectId: activeRequest.projectId,
        productionRequestId: activeRequest.productionRequestId,
        chatId: nextChatId,
      },
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatId, activeRequest, chatIdsKey, resolvedProjectId, setSearchParams]);

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
    projectId: resolvedProjectId || null,
    activeChatId: activeChat?.chatId ?? null,
    enabled: Boolean(resolvedProjectId),
    onMessage: (event) => {
      const projectId = activeProjectIdRef.current;
      if (!projectId) return;

      void queryClient.invalidateQueries({
        queryKey: projectChatQueryKeys.list({ projectId, chatType: 'PRODUCTION', page: 1, limit: 20 }),
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

  function selectRequest(request: ProductionRequestQueueItemDto) {
    if (request.productionRequestId === activeRequest?.productionRequestId) return;

    setActiveRequestId(request.productionRequestId);
    setActiveProjectId(request.projectId);
    setActiveChatId(null);
    setDraft('');
    setMessage(null);
    setSearchParams(
      {
        projectId: request.projectId,
        productionRequestId: request.productionRequestId,
      },
      { replace: true },
    );
  }

  return (
    <div className="production-project-chat-shell">
      <ProductionSidebar activeLabel="Production Chat" />
      <div className="production-project-chat-content">
        <ProductionNavbar searchPlaceholder="Search production features" />
        <main className="production-project-chat-main">
          <section className="production-project-chat-heading">
            <div>
              <h2>Production Chat</h2>
              <p>Select a production request to coordinate with Sales.</p>
            </div>
            <div className="production-project-chat-summary">
              <IconMessages size={16} />
              <span>
                {filteredRequests.length} request{filteredRequests.length === 1 ? '' : 's'}
              </span>
            </div>
          </section>

          <div className="production-project-chat-layout">
            <aside className="production-project-chat-projects">
              <div className="production-project-chat-projects-header">
                <strong>Production requests</strong>
                <small>
                  Page {currentRequestPage}/{totalRequestPages}
                </small>
              </div>

              <label className="production-project-chat-search">
                <IconSearch size={16} aria-hidden />
                <input
                  placeholder="Search by code"
                  type="search"
                  value={requestSearch}
                  onChange={(event) => setRequestSearch(event.target.value)}
                />
              </label>

              <div className="production-project-chat-project-list">
                {requestsQuery.isLoading ? <p className="production-project-chat-muted">Loading requests...</p> : null}
                {requestsQuery.isError ? <p className="production-project-chat-muted">Unable to load production requests.</p> : null}
                {!requestsQuery.isLoading && filteredRequests.length === 0 ? (
                  <p className="production-project-chat-muted">No production requests found.</p>
                ) : null}
                {pagedRequests.map((request) => (
                  <button
                    className={
                      request.productionRequestId === activeRequest?.productionRequestId ? 'is-active' : ''
                    }
                    key={request.productionRequestId}
                    type="button"
                    onClick={() => selectRequest(request)}
                  >
                    <strong>{request.projectName}</strong>
                    <small>
                      {request.projectCode || request.productionCode}
                      <span aria-hidden> · </span>
                      {getProductionRequestStatusLabel(request.status)}
                    </small>
                    <span className="production-project-chat-project-meta">{request.productionCode}</span>
                  </button>
                ))}
              </div>

              {filteredRequests.length > 0 ? (
                <div className="production-project-chat-pagination">
                  <button
                    aria-label="Previous requests page"
                    disabled={currentRequestPage <= 1}
                    type="button"
                    onClick={() => setRequestPage((current) => Math.max(1, current - 1))}
                  >
                    <IconChevronLeft size={16} />
                  </button>
                  <span>
                    {currentRequestPage} / {totalRequestPages}
                  </span>
                  <button
                    aria-label="Next requests page"
                    disabled={currentRequestPage >= totalRequestPages}
                    type="button"
                    onClick={() => setRequestPage((current) => Math.min(totalRequestPages, current + 1))}
                  >
                    <IconChevronRight size={16} />
                  </button>
                </div>
              ) : null}
            </aside>

            <section className="production-project-chat-panel">
              {!activeRequest ? (
                <div className="production-project-chat-empty">
                  <span className="production-project-chat-empty-icon">
                    <IconMessageCircle size={28} />
                  </span>
                  <h3>Select a request</h3>
                  <p>Choose a production request to open the Sales coordination chat.</p>
                </div>
              ) : (
                <>
                  <header className="production-project-chat-panel-header">
                    <div className="production-project-chat-panel-heading">
                      <h3>{activeRequest.projectName}</h3>
                      <p>
                        {activeRequest.projectCode}
                        <span aria-hidden> · </span>
                        {activeRequest.productionCode}
                      </p>
                    </div>

                    <div className="production-project-chat-panel-header-side">
                      <div className="production-project-chat-peer">
                        <span className="production-project-chat-avatar is-header">
                          {getInitials(activeParticipant.name, activeParticipant.role)}
                        </span>
                        <span className="production-project-chat-peer-body">
                          <strong>
                            {chatListQuery.isLoading
                              ? 'Loading chat...'
                              : chatListQuery.isError
                                ? getProjectChatServiceResultMessage(chatListQuery.error)
                                : activeChat
                                  ? activeParticipant.name
                                  : 'No chat available'}
                          </strong>
                          <span>
                            {activeParticipant.role}
                            {activeChat ? ` · ${getChatTypeLabel(activeChat.chatType)}` : ''}
                          </span>
                        </span>
                      </div>
                    </div>
                  </header>

                  {message ? <p className="production-project-chat-error">{message}</p> : null}

                  <div className="production-project-chat-thread">
                    <div className="production-project-chat-messages" ref={messagesListRef}>
                      {messagesQuery.isLoading ? (
                        <p className="production-project-chat-system">Loading messages...</p>
                      ) : null}
                      {messagesQuery.isError ? (
                        <p className="production-project-chat-system">
                          {getProjectChatServiceResultMessage(messagesQuery.error)}
                        </p>
                      ) : null}
                      {!messagesQuery.isLoading &&
                      !messagesQuery.isError &&
                      activeChat &&
                      (messagesQuery.data?.items.length ?? 0) === 0 ? (
                        <div className="production-project-chat-empty-thread">
                          <IconMessages size={22} />
                          <p>No messages yet. Start the conversation below.</p>
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

                    <div className="production-project-chat-input">
                      <input
                        disabled={!activeChat || sendTextMutation.isPending || activeChat.status !== 'OPEN'}
                        placeholder={
                          activeChat?.status === 'OPEN'
                            ? 'Type a message...'
                            : activeChat
                              ? 'This chat is closed'
                              : 'No production chat available'
                        }
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
                        disabled={
                          !activeChat ||
                          activeChat.status !== 'OPEN' ||
                          !draft.trim() ||
                          sendTextMutation.isPending
                        }
                        type="button"
                        onClick={() => void handleSendText()}
                      >
                        <span>{sendTextMutation.isPending ? 'Sending...' : 'Send'}</span>
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
    return <p className="production-project-chat-system">{getMessageContent(message)}</p>;
  }

  return (
    <article className={`production-project-chat-message${isMine ? ' is-mine' : ''}`}>
      <span className="production-project-chat-avatar">{getInitials(message.senderName, message.senderRole)}</span>
      <div className="production-project-chat-bubble">
        <div className="production-project-chat-meta">
          <strong>{message.senderName ?? message.senderRole ?? 'Unknown'}</strong>
          <span>{message.senderRole}</span>
          <span>{formatChatTime(message.createdAt)}</span>
        </div>
        <p>{message.content ?? (message.attachment ? 'Attachment' : 'Message deleted')}</p>
        {message.attachment ? (
          <a
            className="production-project-chat-attachment"
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
