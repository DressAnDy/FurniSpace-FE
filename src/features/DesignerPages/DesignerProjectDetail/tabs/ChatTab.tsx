import { IconFile, IconPaperclip, IconSend } from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { formatChatTime, formatFileSize, formatUnreadBadge, getChatParticipant, getInitials, getMessageContent } from '@/features/projectChat/chatUi';
import {
  getProjectChatServiceResultMessage,
  type ProjectChatListItem,
  type ProjectChatMessage,
  type ProjectChatMessageListResponse,
} from '@/services/api/projectChats';
import type { ProjectDto } from '@/services/api/projects';
import { useAccountDetail, useCurrentUser } from '@/services/queries';
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

type ChatTabProps = {
  project: ProjectDto;
};

export function ChatTab({ project }: ChatTabProps) {
  const queryClient = useQueryClient();
  const currentUserQuery = useCurrentUser();
  const customerQuery = useAccountDetail(project.customerId);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesListRef = useRef<HTMLDivElement | null>(null);
  const chatListQuery = useProjectChats({
    projectId: project.projectId,
    chatType: 'DESIGNER',
    page: 1,
    limit: 20,
  });
  const { refetch: refetchChats } = chatListQuery;
  const chats = useMemo(() => chatListQuery.data?.items ?? [], [chatListQuery.data?.items]);
  const activeChat = chats.find((chat) => chat.chatId === activeChatId) ?? chats[0] ?? null;
  const unreadCounts = useProjectChatUnreadCounts(chats, currentUserQuery.data?.accountId, activeChat?.chatId);
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
  const sendFileMutation = useSendProjectChatFileMessage();
  const activeParticipant = getChatParticipant(activeChat, {
    viewerRole: 'DESIGNER',
    customerName: customerQuery.data?.fullName,
    customerFallback: project.customerId,
  });

  useEffect(() => {
    if (chats.length === 0) {
      if (activeChatId) {
        setActiveChatId(null);
      }

      return;
    }

    if (!activeChatId || !chats.some((chat) => chat.chatId === activeChatId)) {
      setActiveChatId(chats[0].chatId);
    }
  }, [activeChatId, chats]);

  useEffect(() => {
    void refetchChats();
  }, [project.assignedDesignerId, project.status, refetchChats]);

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
  }, [messagesQuery.data?.items.length, activeChat?.chatId, statusMessage]);

  useProjectChatRealtime({
    projectId: project.projectId,
    activeChatId: activeChat?.chatId ?? null,
    enabled: Boolean(activeChat),
    onMessage: (event) => {
      void queryClient.invalidateQueries({ queryKey: projectChatQueryKeys.list({ projectId: project.projectId, chatType: 'DESIGNER', page: 1, limit: 20 }) });
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

    if (!activeChat || (!content && !selectedFile) || sendTextMutation.isPending || sendFileMutation.isPending) {
      return;
    }

    setDraft('');
    setStatusMessage('');

    try {
      const savedMessage = selectedFile
        ? await sendFileMutation.mutateAsync({
            chatId: activeChat.chatId,
            file: selectedFile,
            content,
          })
        : await sendTextMutation.mutateAsync({
            chatId: activeChat.chatId,
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
      setStatusMessage(getProjectChatServiceResultMessage(error));
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
    <section className="designer-card designer-project-chat-card">
      <div className="designer-project-chat-header">
        <div>
          <h3>{activeParticipant.name}</h3>
          <p>{activeParticipant.role}</p>
        </div>
        <span className="designer-project-chat-status">{activeChat?.status ?? 'No Chat'}</span>
      </div>

      {statusMessage ? <p className="designer-project-file-message designer-project-file-error">{statusMessage}</p> : null}
      <div className="designer-project-chat-layout">
        <aside className="designer-project-chat-selector">
          {chatListQuery.isLoading ? <p>Loading chat...</p> : null}
          {chatListQuery.isError ? <p>{getProjectChatServiceResultMessage(chatListQuery.error)}</p> : null}
          {!chatListQuery.isLoading && !chatListQuery.isError && chats.length === 0 ? <p>No chat is available for this project.</p> : null}
          {chats.map((chat) => (
            <ChatSelectorItem
              chat={chat}
              customerFallback={project.customerId}
              customerName={customerQuery.data?.fullName}
              isActive={chat.chatId === activeChat?.chatId}
              key={chat.chatId}
              onSelect={() => setActiveChatId(chat.chatId)}
              unreadCount={unreadCounts[chat.chatId] ?? 0}
            />
          ))}
        </aside>

        <div className="designer-project-chat-thread">
          <div className="designer-project-message-list" ref={messagesListRef}>
            {messagesQuery.isLoading ? <p className="designer-project-empty-text">Loading messages...</p> : null}
            {messagesQuery.isError ? <p className="designer-project-empty-text">{getProjectChatServiceResultMessage(messagesQuery.error)}</p> : null}
            {!messagesQuery.isLoading && !messagesQuery.isError && activeChat && (messagesQuery.data?.items.length ?? 0) === 0 ? (
              <p className="designer-project-empty-text">No messages yet.</p>
            ) : null}
            {messagesQuery.data?.items.map((message) => (
              <DesignerMessage currentUserId={currentUserQuery.data?.accountId} key={message.messageId} message={message} />
            ))}
          </div>
          <div className="designer-project-chat-input">
            <input ref={fileInputRef} hidden type="file" onChange={(event) => handleFileChange(event.target.files?.[0])} />
            <button className="designer-project-chat-attach" disabled={!activeChat || sendFileMutation.isPending} type="button" onClick={() => fileInputRef.current?.click()}>
              <IconPaperclip size={17} />
            </button>
            <div className="designer-project-chat-composer-main">
              {selectedFile ? (
                <div className="designer-project-chat-selected-file">
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
              <input
                disabled={!activeChat || sendTextMutation.isPending || sendFileMutation.isPending}
                placeholder={selectedFile ? 'Add a message for this file...' : 'Type a message...'}
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleSendText();
                  }
                }}
              />
            </div>
            <button disabled={!activeChat || (!draft.trim() && !selectedFile) || sendTextMutation.isPending || sendFileMutation.isPending} type="button" onClick={() => void handleSendText()}>
              <span>{sendTextMutation.isPending || sendFileMutation.isPending ? 'Sending...' : 'Send'}</span>
              <IconSend size={17} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ChatSelectorItem({
  chat,
  customerFallback,
  customerName,
  isActive,
  onSelect,
  unreadCount,
}: {
  chat: ProjectChatListItem;
  customerFallback: string;
  customerName?: string | null;
  isActive: boolean;
  onSelect: () => void;
  unreadCount: number;
}) {
  const participant = getChatParticipant(chat, {
    viewerRole: 'DESIGNER',
    customerName,
    customerFallback,
  });
  const unreadBadge = formatUnreadBadge(unreadCount);

  return (
    <button className={isActive ? 'is-active' : ''} type="button" onClick={onSelect}>
      <strong>{participant.name}</strong>
      <small>
        {participant.role}
        {chat.lastMessage?.contentPreview ? ` - ${chat.lastMessage.contentPreview}` : ''}
      </small>
      {unreadBadge ? <span className="designer-project-chat-unread-badge">{unreadBadge}</span> : null}
    </button>
  );
}

function DesignerMessage({ currentUserId, message }: { currentUserId?: string; message: ProjectChatMessage }) {
  const isMine = Boolean(currentUserId && message.senderId === currentUserId);

  if (message.messageType === 'SYSTEM') {
    return <p className="designer-project-empty-text">{getMessageContent(message)}</p>;
  }

  return (
    <div className={`designer-project-message ${isMine ? 'designer-project-message-mine' : ''}`}>
      <div className="designer-project-message-avatar">{getInitials(message.senderName, message.senderRole)}</div>
      <div className="designer-project-message-bubble">
        <div className="designer-project-message-meta">
          <strong>{message.senderName ?? message.senderRole ?? 'Unknown'}</strong>
          <span>{message.senderRole}</span>
          <span>{formatChatTime(message.createdAt)}</span>
        </div>
        <p>{message.content ?? (message.attachment ? 'Attachment' : 'Message deleted')}</p>
        {message.attachment ? (
          <a className="designer-project-message-attachment" href={message.attachment.fileUrl} rel="noreferrer" target="_blank">
            <IconFile size={15} />
            <span>{message.attachment.originalFileName}</span>
            <small>{formatFileSize(message.attachment.fileSizeBytes)}</small>
          </a>
        ) : null}
      </div>
    </div>
  );
}
