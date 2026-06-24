import {
  IconFile,
  IconMessageCircle,
  IconPaperclip,
  IconSend,
  IconX,
} from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

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
  upsertProjectChatMessage,
  useCloseProjectChat,
  useProjectChatMessages,
  useProjectChats,
  useProjectChatRealtime,
  useSendProjectChatFileMessage,
  useSendProjectChatTextMessage,
} from '@/services/queries/useProjectChats';

import './ProjectChatPanel.css';

type ProjectChatPanelProps = {
  projectId: string;
  projectCode?: string | null;
  title?: string;
  preferredChatType?: ProjectChatType;
  canClose?: boolean;
  compact?: boolean;
};

type PendingMessage = ProjectChatMessage & {
  pending?: boolean;
};

export function ProjectChatPanel({
  canClose = false,
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
  const [caption, setCaption] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const chatListQuery = useProjectChats({
    projectId,
    chatType: preferredChatType ?? null,
    page: 1,
    limit: 20,
  });
  const chats = chatListQuery.data?.items ?? [];
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
  const sendFileMutation = useSendProjectChatFileMessage();
  const closeChatMutation = useCloseProjectChat();
  const isReadonly = !activeChat || activeChat.status !== 'OPEN';
  const currentUserId = currentUserQuery.data?.accountId;

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
          if (!currentData) return currentData;

          return {
            ...currentData,
            items: currentData.items.filter((item) => item.messageId !== tempMessage.messageId).concat(savedMessage),
          };
        });
      }
      void queryClient.invalidateQueries({ queryKey: projectChatQueryKeys.list({ projectId, chatType: preferredChatType ?? null, page: 1, limit: 20 }) });
    } catch (error) {
      setErrorMessage(getProjectChatServiceResultMessage(error));
      void messagesQuery.refetch();
      void chatListQuery.refetch();
    }
  };

  const handleFileChange = async (file: File | undefined) => {
    if (!file || !activeChat || sendFileMutation.isPending) {
      return;
    }

    setErrorMessage(null);

    try {
      const savedMessage = await sendFileMutation.mutateAsync({
        chatId: activeChat.chatId,
        file,
        content: caption,
      });

      setCaption('');
      if (messagesQueryParams) {
        queryClient.setQueryData(projectChatQueryKeys.messages(messagesQueryParams), (current: ProjectChatMessageListResponse | undefined) =>
          upsertProjectChatMessage(current, savedMessage),
        );
      }
      void chatListQuery.refetch();
    } catch (error) {
      setErrorMessage(getProjectChatServiceResultMessage(error));
      void chatListQuery.refetch();
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCloseChat = async () => {
    if (!activeChat || closeChatMutation.isPending) {
      return;
    }

    setErrorMessage(null);

    try {
      await closeChatMutation.mutateAsync(activeChat.chatId);
      await chatListQuery.refetch();
    } catch (error) {
      setErrorMessage(getProjectChatServiceResultMessage(error));
    }
  };

  return (
    <section className={`project-chat-panel${compact ? ' project-chat-panel-compact' : ''}`}>
      <header className="project-chat-panel-header">
        <div>
          <h3>{title}</h3>
          {projectCode ? <p>{projectCode}</p> : null}
        </div>
        <span className={`project-chat-panel-status project-chat-panel-status-${activeChat?.status.toLowerCase() ?? 'idle'}`}>
          {activeChat?.status ?? 'No chat'}
        </span>
      </header>

      {errorMessage ? <p className="project-chat-panel-error">{errorMessage}</p> : null}

      <div className="project-chat-panel-layout">
        <aside className="project-chat-panel-list" aria-label="Project chat channels">
          {chatListQuery.isLoading ? <p>Loading chats...</p> : null}
          {chatListQuery.isError ? <p>{getProjectChatServiceResultMessage(chatListQuery.error)}</p> : null}
          {!chatListQuery.isLoading && !chatListQuery.isError && chats.length === 0 ? <p>No chat is available for this project yet.</p> : null}
          {chats.map((chat) => (
            <ChatListButton
              chat={chat}
              isActive={chat.chatId === activeChat?.chatId}
              key={chat.chatId}
              onClick={() => {
                setActiveChatId(chat.chatId);
                setErrorMessage(null);
              }}
            />
          ))}
        </aside>

        <div className="project-chat-panel-thread">
          <div className="project-chat-panel-thread-header">
            <div>
              <strong>{getChatTitle(activeChat)}</strong>
              <span>{activeChat?.staffName ?? getChatTypeLabel(activeChat?.chatType)}</span>
            </div>
            {canClose && activeChat?.status === 'OPEN' ? (
              <button type="button" disabled={closeChatMutation.isPending} onClick={handleCloseChat}>
                <IconX size={15} />
                {closeChatMutation.isPending ? 'Closing...' : 'Close'}
              </button>
            ) : null}
          </div>

          <div className="project-chat-panel-messages" ref={messageListRef}>
            {messagesQuery.isLoading ? <p className="project-chat-panel-state">Loading messages...</p> : null}
            {messagesQuery.isError ? <p className="project-chat-panel-state">{getProjectChatServiceResultMessage(messagesQuery.error)}</p> : null}
            {!messagesQuery.isLoading && !messagesQuery.isError && activeChat && messages.length === 0 ? (
              <p className="project-chat-panel-state">No messages yet.</p>
            ) : null}
            {!activeChat ? <p className="project-chat-panel-state">Select a project chat to start.</p> : null}
            {messages.map((message) => (
              <MessageBubble currentUserId={currentUserId} key={message.messageId} message={message} />
            ))}
          </div>

          <div className="project-chat-panel-caption-row">
            <input
              disabled={isReadonly || sendFileMutation.isPending}
              maxLength={4000}
              placeholder="Optional file caption"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
            />
          </div>

          <div className="project-chat-panel-composer">
            <input
              ref={fileInputRef}
              disabled={isReadonly}
              hidden
              type="file"
              onChange={(event) => void handleFileChange(event.target.files?.[0])}
            />
            <button
              aria-label="Attach file"
              disabled={isReadonly || sendFileMutation.isPending}
              title="Attach file"
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              <IconPaperclip size={18} />
            </button>
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

function ChatListButton({ chat, isActive, onClick }: { chat: ProjectChatListItem; isActive: boolean; onClick: () => void }) {
  return (
    <button className={isActive ? 'is-active' : ''} type="button" onClick={onClick}>
      <span>
        <IconMessageCircle size={16} />
        <strong>{getChatTitle(chat)}</strong>
      </span>
      <small>{chat.lastMessage?.contentPreview ?? `${getChatTypeLabel(chat.chatType)} conversation`}</small>
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
