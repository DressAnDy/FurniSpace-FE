import {
  IconFile,
  IconMessageCircle,
  IconSend,
} from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { formatUnreadBadge } from '@/features/projectChat/chatUi';
import {
  getProjectChatServiceResultMessage,
  type ProjectChatListItem,
  type ProjectChatMessage,
  type ProjectChatMessageListResponse,
  type ProjectChatType,
} from '@/services/api/projectChats';
import { useCurrentUser } from '@/services/queries/useAuth';
import {
  projectChatQueryKeys,
  replaceProjectChatTempMessage,
  upsertProjectChatMessage,
  useProjectChatMessages,
  useProjectChats,
  useProjectChatRealtime,
  useProjectChatUnreadCounts,
  useSendProjectChatTextMessage,
} from '@/services/queries/useProjectChats';

import './ProjectChatPanel.css';

type ProjectChatPanelProps = {
  projectId: string;
  projectCode?: string | null;
  title?: string;
  preferredChatType?: ProjectChatType;
  compact?: boolean;
};

type PendingMessage = ProjectChatMessage & {
  pending?: boolean;
};

export function ProjectChatPanel({
  compact = false,
  preferredChatType,
  projectCode,
  projectId,
  title = 'Project Chat',
}: ProjectChatPanelProps) {
  const queryClient = useQueryClient();
  const currentUserQuery = useCurrentUser();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const chatListQuery = useProjectChats({
    projectId,
    chatType: preferredChatType ?? null,
    page: 1,
    limit: 20,
  });
  const chats = useMemo(() => chatListQuery.data?.items ?? [], [chatListQuery.data?.items]);
  const activeChat = useMemo(() => {
    if (activeChatId) {
      return chats.find((chat) => chat.chatId === activeChatId) ?? null;
    }

    return chats[0] ?? null;
  }, [activeChatId, chats]);
  const messagesQueryParams = activeChat
    ? {
        chatId: activeChat.chatId,
        page: 1,
        limit: 50,
        sort: 'ASC' as const,
      }
    : undefined;
  const messagesQuery = useProjectChatMessages(messagesQueryParams);
  const messages = (messagesQuery.data?.items ?? []) as PendingMessage[];
  const sendTextMutation = useSendProjectChatTextMessage();
  const isReadonly = !activeChat || activeChat.status !== 'OPEN';
  const currentUserId = currentUserQuery.data?.accountId;
  const unreadCounts = useProjectChatUnreadCounts(chats, currentUserId, activeChat?.chatId);

  useEffect(() => {
    if (!activeChatId && chats.length > 0) {
      setActiveChatId(chats[0].chatId);
    }
  }, [activeChatId, chats]);

  useEffect(() => {
    messageListRef.current?.scrollTo({
      top: messageListRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages.length, activeChat?.chatId]);

  useProjectChatRealtime({
    projectId,
    activeChatId: activeChat?.chatId ?? null,
    enabled: Boolean(activeChat),
    onMessage: (event) => {
      void queryClient.invalidateQueries({ queryKey: projectChatQueryKeys.list({ projectId, chatType: preferredChatType ?? null, page: 1, limit: 20 }) });

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

  const handleSendText = async () => {
    const content = draft.trim();

    if (!activeChat || !content || content.length > 4000 || sendTextMutation.isPending) {
      return;
    }

    const tempMessage: PendingMessage = {
      messageId: `temp-${Date.now()}`,
      chatId: activeChat.chatId,
      senderId: currentUserId ?? null,
      senderName: currentUserQuery.data?.fullName ?? 'You',
      senderRole: currentUserQuery.data?.role ?? null,
      messageType: 'TEXT',
      content,
      attachment: null,
      createdAt: new Date().toISOString(),
      editedAt: null,
      deletedAt: null,
      readAt: null,
      pending: true,
    };

    setErrorMessage(null);
    setDraft('');
    if (messagesQueryParams) {
      queryClient.setQueryData(projectChatQueryKeys.messages(messagesQueryParams), (current: ProjectChatMessageListResponse | undefined) =>
        upsertProjectChatMessage(current, tempMessage),
      );
    }

    try {
      const savedMessage = await sendTextMutation.mutateAsync({
        chatId: activeChat.chatId,
        content,
      });

      if (messagesQueryParams) {
        queryClient.setQueryData(projectChatQueryKeys.messages(messagesQueryParams), (currentData: ProjectChatMessageListResponse | undefined) => {
          return replaceProjectChatTempMessage(currentData, tempMessage.messageId, savedMessage);
        });
      }
      void queryClient.invalidateQueries({ queryKey: projectChatQueryKeys.list({ projectId, chatType: preferredChatType ?? null, page: 1, limit: 20 }) });
    } catch (error) {
      setErrorMessage(getProjectChatServiceResultMessage(error));
      void messagesQuery.refetch();
      void chatListQuery.refetch();
    }
  };

  return (
    <section className={`project-chat-panel${compact ? ' project-chat-panel-compact' : ''}`}>
      <header className="project-chat-panel-header">
        <div className="project-chat-panel-heading">
          <span className="project-chat-panel-heading-icon">
            <IconMessageCircle size={19} stroke={1.8} />
          </span>
          <div>
            <h3>{title}</h3>
            {projectCode ? <p>{projectCode}</p> : null}
          </div>
        </div>
        <span className={`project-chat-panel-status project-chat-panel-status-${activeChat?.status.toLowerCase() ?? 'idle'}`}>
          {formatChatStatusLabel(activeChat?.status)}
        </span>
      </header>

      {errorMessage ? <p className="project-chat-panel-error">{errorMessage}</p> : null}

      <div className="project-chat-panel-layout">
        <aside className="project-chat-panel-list" aria-label="Project chat channels">
          {chatListQuery.isLoading ? <p>Loading chats...</p> : null}
          {chatListQuery.isError ? <p>{getProjectChatServiceResultMessage(chatListQuery.error)}</p> : null}
          {!chatListQuery.isLoading && !chatListQuery.isError && chats.length === 0 ? (
            <EmptyState message="No chat is available for this project yet." />
          ) : null}
          {chats.map((chat) => (
            <ChatListButton
              chat={chat}
              isActive={chat.chatId === activeChat?.chatId}
              key={chat.chatId}
              onClick={() => {
                setActiveChatId(chat.chatId);
                setErrorMessage(null);
              }}
              unreadCount={unreadCounts[chat.chatId] ?? 0}
            />
          ))}
        </aside>

        <div className="project-chat-panel-thread">
          <div className="project-chat-panel-thread-header">
            <div>
              <strong>{getChatTitle(activeChat)}</strong>
              <span>{activeChat?.staffName ?? getChatTypeLabel(activeChat?.chatType)}</span>
            </div>
          </div>

          <div className="project-chat-panel-messages" ref={messageListRef}>
            {messagesQuery.isLoading ? <p className="project-chat-panel-state">Loading messages...</p> : null}
            {messagesQuery.isError ? <p className="project-chat-panel-state">{getProjectChatServiceResultMessage(messagesQuery.error)}</p> : null}
            {!messagesQuery.isLoading && !messagesQuery.isError && activeChat && messages.length === 0 ? (
              <EmptyState message="No messages yet. Say hello to start the conversation." />
            ) : null}
            {!activeChat ? <EmptyState message="Select a project chat to start." /> : null}
            {messages.map((message) => (
              <MessageBubble currentUserId={currentUserId} key={message.messageId} message={message} />
            ))}
          </div>

          <div className="project-chat-panel-composer">
            <input
              disabled={isReadonly || sendTextMutation.isPending}
              maxLength={4000}
              placeholder={isReadonly ? 'This chat is read-only' : 'Write a message...'}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void handleSendText();
                }
              }}
            />
            <button disabled={isReadonly || !draft.trim() || sendTextMutation.isPending} type="button" onClick={() => void handleSendText()}>
              <IconSend size={17} />
              {sendTextMutation.isPending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="project-chat-panel-empty">
      <span className="project-chat-panel-empty-icon">
        <IconMessageCircle size={22} stroke={1.7} />
      </span>
      <p>{message}</p>
    </div>
  );
}

function ChatListButton({ chat, isActive, onClick, unreadCount }: { chat: ProjectChatListItem; isActive: boolean; onClick: () => void; unreadCount: number }) {
  const unreadBadge = formatUnreadBadge(unreadCount);

  return (
    <button className={`${isActive ? 'is-active' : ''}${unreadBadge ? ' has-unread' : ''}`.trim()} type="button" onClick={onClick}>
      <span>
        <IconMessageCircle size={16} />
        <strong>{getChatTitle(chat)}</strong>
      </span>
      <small>{chat.lastMessage?.contentPreview ?? `${getChatTypeLabel(chat.chatType)} conversation`}</small>
      {unreadBadge ? <span className="project-chat-panel-unread-badge">{unreadBadge}</span> : null}
    </button>
  );
}

function MessageBubble({ currentUserId, message }: { currentUserId?: string; message: PendingMessage }) {
  const isMine = Boolean(currentUserId && message.senderId === currentUserId);
  const isSystem = message.messageType === 'SYSTEM';

  if (isSystem) {
    return <div className="project-chat-panel-system-message">{message.content ?? 'System update'}</div>;
  }

  return (
    <article className={`project-chat-panel-message${isMine ? ' is-mine' : ''}${message.pending ? ' is-pending' : ''}`}>
      <div className="project-chat-panel-avatar">{getInitials(message.senderName, message.senderRole)}</div>
      <div className="project-chat-panel-bubble">
        <div className="project-chat-panel-meta">
          <strong>{message.senderName ?? message.senderRole ?? 'Unknown'}</strong>
          <span>{message.createdAt ? formatDateTime(message.createdAt) : ''}</span>
          {message.pending ? <span>Sending</span> : null}
        </div>
        {message.content ? <p>{message.content}</p> : null}
        {message.attachment ? (
          <a className="project-chat-panel-attachment" href={message.attachment.fileUrl} rel="noreferrer" target="_blank">
            <IconFile size={16} />
            <span>{message.attachment.originalFileName}</span>
            <small>{formatFileSize(message.attachment.fileSizeBytes)}</small>
          </a>
        ) : null}
        {!message.content && !message.attachment ? <p className="project-chat-panel-deleted">Message deleted</p> : null}
      </div>
    </article>
  );
}

function getChatTitle(chat: ProjectChatListItem | null) {
  if (!chat) {
    return 'Select chat';
  }

  return chat.title || getChatTypeLabel(chat.chatType);
}

function formatChatStatusLabel(status?: ProjectChatListItem['status']) {
  if (!status) {
    return 'No chat';
  }

  return status.charAt(0) + status.slice(1).toLowerCase();
}

function getChatTypeLabel(chatType?: ProjectChatType) {
  const labels: Record<ProjectChatType, string> = {
    SALES: 'Sales Chat',
    DESIGNER: 'Designer Chat',
    PRODUCTION: 'Production Chat',
    DELIVERY: 'Delivery Chat',
    GENERAL: 'General Chat',
    INTERNAL: 'Internal Chat',
  };

  return chatType ? labels[chatType] : 'Project Chat';
}

function getInitials(name?: string | null, fallback?: string | null) {
  const source = name || fallback || 'U';
  const parts = source.trim().split(/\s+/).slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase()).join('') || 'U';
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
