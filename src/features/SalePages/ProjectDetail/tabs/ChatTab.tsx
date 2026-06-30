import { IconFile, IconPaperclip, IconSend } from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { formatChatTime, formatFileSize, getChatParticipant, getInitials, getMessageContent } from '@/features/projectChat/chatUi';
import {
  getProjectChatServiceResultMessage,
  type ProjectChatListItem,
  type ProjectChatMessage,
  type ProjectChatMessageListResponse,
} from '@/services/api/projectChats';
import { useAccountDetail, useCurrentUser } from '@/services/queries';
import {
  projectChatQueryKeys,
  upsertProjectChatMessage,
  useProjectChatMessages,
  useProjectChatRealtime,
  useProjectChats,
  useSendProjectChatFileMessage,
  useSendProjectChatTextMessage,
} from '@/services/queries/useProjectChats';

import type { ProjectDetailProject } from '../ProjectDetail';

type ChatTabProps = {
  project: ProjectDetailProject;
};

export function ChatTab({ project }: ChatTabProps) {
  const queryClient = useQueryClient();
  const currentUserQuery = useCurrentUser();
  const customerQuery = useAccountDetail(project.customerId);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesListRef = useRef<HTMLDivElement | null>(null);
  const chatListQuery = useProjectChats({
    projectId: project.projectId,
    chatType: 'SALES',
    page: 1,
    limit: 20,
  });
  const { refetch: refetchChats } = chatListQuery;
  const chats = useMemo(() => chatListQuery.data?.items ?? [], [chatListQuery.data?.items]);
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
  const sendFileMutation = useSendProjectChatFileMessage();
  const activeParticipant = getChatParticipant(activeChat, {
    viewerRole: 'SALES',
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
  }, [messagesQuery.data?.items.length, activeChat?.chatId, message]);

  useProjectChatRealtime({
    projectId: project.projectId,
    activeChatId: activeChat?.chatId ?? null,
    enabled: Boolean(activeChat),
    onMessage: (event) => {
      void queryClient.invalidateQueries({ queryKey: projectChatQueryKeys.list({ projectId: project.projectId, chatType: 'SALES', page: 1, limit: 20 }) });
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

    setMessage(null);
    setDraft('');

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
      setMessage(getProjectChatServiceResultMessage(error));
      void chatListQuery.refetch();
      void messagesQuery.refetch();
    }
  }

  function handleFileChange(file?: File) {
    if (file) {
      setSelectedFile(file);
    }
  }

  return (
    <section className="project-detail-card project-detail-tab-panel project-detail-chat-card">
      <header className="project-detail-chat-header-row">
        <div>
          <h3>Project Chat</h3>
          <p>{project.projectCode} - Sales and customer</p>
        </div>
        <span className="project-detail-chat-badge">{activeChat?.status ?? 'No Chat'}</span>
      </header>

      {message ? <p className="project-detail-api-note">{message}</p> : null}

      <div className="project-detail-chat-layout">
        <aside className="project-detail-chat-selector">
          {chatListQuery.isLoading ? <span>Loading chats...</span> : null}
          {chatListQuery.isError ? <span>{getProjectChatServiceResultMessage(chatListQuery.error)}</span> : null}
          {!chatListQuery.isLoading && !chatListQuery.isError && chats.length === 0 ? <span>No chat is available for this project.</span> : null}
          {chats.map((chat) => (
            <ChatSelectorItem
              chat={chat}
              customerFallback={project.customerId}
              customerName={customerQuery.data?.fullName}
              isActive={chat.chatId === activeChat?.chatId}
              key={chat.chatId}
              onSelect={() => setActiveChatId(chat.chatId)}
            />
          ))}
        </aside>

        <div className="project-detail-chat-thread">
          <div className="project-detail-chat-thread-header">
            <strong>{activeParticipant.name}</strong>
            <span>{activeParticipant.role}</span>
          </div>

          <div className="project-detail-message-list" ref={messagesListRef}>
            {messagesQuery.isLoading ? <p className="project-detail-system-message">Loading messages...</p> : null}
            {messagesQuery.isError ? <p className="project-detail-system-message">{getProjectChatServiceResultMessage(messagesQuery.error)}</p> : null}
            {!messagesQuery.isLoading && !messagesQuery.isError && activeChat && (messagesQuery.data?.items.length ?? 0) === 0 ? (
              <p className="project-detail-system-message">No messages yet.</p>
            ) : null}
            {messagesQuery.data?.items.map((chatMessage) => (
              <MessageRow currentUserId={currentUserQuery.data?.accountId} key={chatMessage.messageId} message={chatMessage} />
            ))}
          </div>

          <div className="project-detail-chat-input">
            <input ref={fileInputRef} hidden type="file" onChange={(event) => handleFileChange(event.target.files?.[0])} />
            <button className="project-detail-attach-button" disabled={!activeChat || sendFileMutation.isPending} type="button" onClick={() => fileInputRef.current?.click()}>
              <IconPaperclip size={17} />
            </button>
            <div className="project-detail-chat-composer-main">
              {selectedFile ? (
                <div className="project-detail-chat-selected-file">
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
}: {
  chat: ProjectChatListItem;
  customerFallback: string;
  customerName?: string | null;
  isActive: boolean;
  onSelect: () => void;
}) {
  const participant = getChatParticipant(chat, {
    viewerRole: 'SALES',
    customerName,
    customerFallback,
  });

  return (
    <button className={isActive ? 'project-detail-chat-channel-active' : undefined} type="button" onClick={onSelect}>
      <strong>{participant.name}</strong>
      <small>
        {participant.role}
        {chat.lastMessage?.contentPreview ? ` - ${chat.lastMessage.contentPreview}` : ''}
      </small>
    </button>
  );
}

function MessageRow({ currentUserId, message }: { currentUserId?: string; message: ProjectChatMessage }) {
  const isMine = Boolean(currentUserId && message.senderId === currentUserId);

  if (message.messageType === 'SYSTEM') {
    return <p className="project-detail-system-message">{getMessageContent(message)}</p>;
  }

  return (
    <article className={`project-detail-message-row${isMine ? ' project-detail-message-row-mine' : ''}`}>
      <span className="project-detail-message-avatar">{getInitials(message.senderName, message.senderRole)}</span>
      <div className="project-detail-message-bubble">
        <div className="project-detail-message-meta">
          <strong>{message.senderName ?? message.senderRole ?? 'Unknown'}</strong>
          <span>{message.senderRole}</span>
          <span>{formatChatTime(message.createdAt)}</span>
        </div>
        <p>{message.content ?? (message.attachment ? 'Attachment' : 'Message deleted')}</p>
        {message.attachment ? (
          <a className="project-detail-message-attachment" href={message.attachment.fileUrl} rel="noreferrer" target="_blank">
            <IconFile size={15} />
            <span>{message.attachment.originalFileName}</span>
            <small>{formatFileSize(message.attachment.fileSizeBytes)}</small>
          </a>
        ) : null}
      </div>
    </article>
  );
}
