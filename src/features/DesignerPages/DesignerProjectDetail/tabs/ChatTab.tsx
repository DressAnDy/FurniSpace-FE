import { IconFile, IconSend } from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';

import { useLang } from '@/app/providers/useLang';
import { designerCopy } from '@/features/DesignerPages/designercomponents';
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
  useSendProjectChatTextMessage,
} from '@/services/queries/useProjectChats';

type ChatTabProps = {
  project: ProjectDto;
};

type DesignerChatActor = 'CUSTOMER' | 'SALES';
type DesignerChatEntry = {
  actor: DesignerChatActor;
  chat: ProjectChatListItem;
  key: string;
};

export function ChatTab({ project }: ChatTabProps) {
  const { lang } = useLang();
  const t = designerCopy[lang].chatTab;
  const queryClient = useQueryClient();
  const location = useLocation();
  const currentUserQuery = useCurrentUser();
  const customerQuery = useAccountDetail(project.customerId);
  const salesQuery = useAccountDetail(project.assignedSalesId ?? undefined);
  const [activeChatKey, setActiveChatKey] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const messagesListRef = useRef<HTMLDivElement | null>(null);
  const customerChatQuery = useProjectChats({
    projectId: project.projectId,
    chatType: 'DESIGNER',
    page: 1,
    limit: 20,
  });
  const salesChatQuery = useProjectChats({
    projectId: project.projectId,
    chatType: 'DESIGNER_SALES',
    page: 1,
    limit: 20,
  });
  const chatEntries = useMemo(
    () => buildDesignerChatEntries(customerChatQuery.data?.items, salesChatQuery.data?.items),
    [customerChatQuery.data?.items, salesChatQuery.data?.items],
  );
  const isChatListLoading = customerChatQuery.isLoading || salesChatQuery.isLoading;
  const chatListError = customerChatQuery.error ?? salesChatQuery.error ?? null;
  const requestedChatId = new URLSearchParams(location.search).get('chatId');
  const activeChatEntry = chatEntries.find((entry) => entry.key === activeChatKey) ?? chatEntries[0] ?? null;
  const activeChat = activeChatEntry?.chat ?? null;
  const unreadChats = useMemo(() => dedupeChats(chatEntries.map((entry) => entry.chat)), [chatEntries]);
  const unreadCounts = useProjectChatUnreadCounts(unreadChats, currentUserQuery.data?.accountId, activeChat?.chatId);
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
  const participantOptions = {
    customerFallback: project.customerId,
    customerName: customerQuery.data?.fullName,
    salesFallback: project.assignedSalesId,
    salesName: salesQuery.data?.fullName,
  };
  const activeParticipant = getDesignerChatParticipant(activeChatEntry, participantOptions, t);

  useEffect(() => {
    if (chatEntries.length === 0) {
      if (activeChatKey) {
        setActiveChatKey(null);
      }

      return;
    }

    const requestedEntry = requestedChatId ? chatEntries.find((entry) => entry.chat.chatId === requestedChatId) : null;

    if (requestedEntry) {
      setActiveChatKey(requestedEntry.key);
      return;
    }

    if (!activeChatKey || !chatEntries.some((entry) => entry.key === activeChatKey)) {
      setActiveChatKey(chatEntries[0].key);
    }
  }, [activeChatKey, chatEntries, requestedChatId]);

  useEffect(() => {
    void customerChatQuery.refetch();
    void salesChatQuery.refetch();
  }, [customerChatQuery, project.assignedDesignerId, project.status, salesChatQuery]);

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
      void queryClient.invalidateQueries({ queryKey: projectChatQueryKeys.list({ projectId: project.projectId, chatType: 'DESIGNER_SALES', page: 1, limit: 20 }) });
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

    setDraft('');
    setStatusMessage('');

    try {
      const savedMessage = await sendTextMutation.mutateAsync({
        chatId: activeChat.chatId,
        content,
      });

      if (messagesQueryParams) {
        queryClient.setQueryData(projectChatQueryKeys.messages(messagesQueryParams), (current: ProjectChatMessageListResponse | undefined) =>
          upsertProjectChatMessage(current, savedMessage),
        );
      }

      void customerChatQuery.refetch();
      void salesChatQuery.refetch();
    } catch (error) {
      setStatusMessage(getProjectChatServiceResultMessage(error));
      void messagesQuery.refetch();
      void customerChatQuery.refetch();
      void salesChatQuery.refetch();
    }
  }

  return (
    <section className="designer-card designer-project-chat-card">
      <div className="designer-project-chat-header">
        <div>
          <h3>{activeParticipant.name}</h3>
          <p>{activeParticipant.role}</p>
        </div>
        <span className="designer-project-chat-status">{activeChat?.status ?? t.noChat}</span>
      </div>

      {statusMessage ? <p className="designer-project-file-message designer-project-file-error">{statusMessage}</p> : null}
      <div className="designer-project-chat-layout">
        <aside className="designer-project-chat-selector">
          {isChatListLoading ? <p>{t.loadingChat}</p> : null}
          {chatListError ? <p>{getProjectChatServiceResultMessage(chatListError)}</p> : null}
          {!isChatListLoading && !chatListError && chatEntries.length === 0 ? (
            <p>{t.noThreads}</p>
          ) : null}
          {chatEntries.map((entry) => (
            <ChatSelectorItem
              actor={entry.actor}
              chat={entry.chat}
              customerFallback={project.customerId}
              customerName={customerQuery.data?.fullName}
              isActive={entry.key === activeChatEntry?.key}
              key={entry.key}
              onSelect={() => setActiveChatKey(entry.key)}
              salesFallback={project.assignedSalesId}
              salesName={salesQuery.data?.fullName}
              t={t}
              unreadCount={unreadCounts[entry.chat.chatId] ?? 0}
            />
          ))}
        </aside>

        <div className="designer-project-chat-thread">
          <div className="designer-project-message-list" ref={messagesListRef}>
            {messagesQuery.isLoading ? <p className="designer-project-empty-text">{t.loadingMessages}</p> : null}
            {messagesQuery.isError ? <p className="designer-project-empty-text">{getProjectChatServiceResultMessage(messagesQuery.error)}</p> : null}
            {!messagesQuery.isLoading && !messagesQuery.isError && activeChat && (messagesQuery.data?.items.length ?? 0) === 0 ? (
              <p className="designer-project-empty-text">{t.noMessages}</p>
            ) : null}
            {messagesQuery.data?.items.map((message) => (
              <DesignerMessage currentUserId={currentUserQuery.data?.accountId} key={message.messageId} message={message} t={t} />
            ))}
          </div>
          <div className="designer-project-chat-input">
            <div className="designer-project-chat-composer-main">
              <input
                disabled={!activeChat || sendTextMutation.isPending}
                placeholder={t.typeMessage}
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
            <button disabled={!activeChat || !draft.trim() || sendTextMutation.isPending} type="button" onClick={() => void handleSendText()}>
              <span>{sendTextMutation.isPending ? t.sending : t.send}</span>
              <IconSend size={17} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ChatSelectorItem({
  actor,
  chat,
  customerFallback,
  customerName,
  isActive,
  onSelect,
  salesFallback,
  salesName,
  t,
  unreadCount,
}: {
  actor: DesignerChatActor;
  chat: ProjectChatListItem;
  customerFallback: string;
  customerName?: string | null;
  isActive: boolean;
  onSelect: () => void;
  salesFallback?: string | null;
  salesName?: string | null;
  t: typeof designerCopy.en.chatTab;
  unreadCount: number;
}) {
  const participant = getDesignerChatParticipant(
    { actor, chat, key: '' },
    { customerFallback, customerName, salesFallback, salesName },
    t,
  );
  const unreadBadge = formatUnreadBadge(unreadCount);

  return (
    <button className={`${isActive ? 'is-active' : ''}${unreadBadge ? ' has-unread' : ''}`.trim()} type="button" onClick={onSelect}>
      <strong>{participant.name}</strong>
      <small>
        {participant.role}
        {chat.lastMessage?.contentPreview ? ` · ${chat.lastMessage.contentPreview}` : ''}
      </small>
      {unreadBadge ? <span className="designer-project-chat-unread-badge">{unreadBadge}</span> : null}
    </button>
  );
}

function getDesignerChatParticipant(
  entry: DesignerChatEntry | null,
  options: {
    customerFallback: string;
    customerName?: string | null;
    salesFallback?: string | null;
    salesName?: string | null;
  },
  t: typeof designerCopy.en.chatTab,
) {
  if (!entry) {
    return {
      name: t.selectChat,
      role: t.projectChat,
    };
  }

  if (entry.actor === 'SALES') {
    return {
      name: options.salesName || options.salesFallback || t.sales,
      role: t.sales,
    };
  }

  return getChatParticipant(entry.chat, {
    viewerRole: 'DESIGNER',
    customerName: options.customerName,
    customerFallback: options.customerFallback,
  });
}

function buildDesignerChatEntries(
  customerChats: ProjectChatListItem[] | undefined,
  salesChats: ProjectChatListItem[] | undefined,
) {
  const designerChat = customerChats?.find((chat) => chat.chatType === 'DESIGNER') ?? null;
  const designerSalesChat = salesChats?.find((chat) => chat.chatType === 'DESIGNER_SALES') ?? null;
  const entries: DesignerChatEntry[] = [];

  if (designerChat) {
    entries.push({
      actor: 'CUSTOMER',
      chat: designerChat,
      key: `${designerChat.chatId}:customer`,
    });
  }

  if (designerSalesChat) {
    entries.push({
      actor: 'SALES',
      chat: designerSalesChat,
      key: `${designerSalesChat.chatId}:sales`,
    });
  }

  return entries;
}

function dedupeChats(chats: ProjectChatListItem[]) {
  const chatsById = new Map<string, ProjectChatListItem>();

  chats.forEach((chat) => chatsById.set(chat.chatId, chat));

  return Array.from(chatsById.values());
}

function DesignerMessage({ currentUserId, message, t }: { currentUserId?: string; message: ProjectChatMessage; t: typeof designerCopy.en.chatTab }) {
  const isMine = Boolean(currentUserId && message.senderId === currentUserId);

  if (message.messageType === 'SYSTEM') {
    return <p className="designer-project-empty-text">{getMessageContent(message)}</p>;
  }

  return (
    <div className={`designer-project-message ${isMine ? 'designer-project-message-mine' : ''}`}>
      <div className="designer-project-message-avatar">{getInitials(message.senderName, message.senderRole)}</div>
      <div className="designer-project-message-bubble">
        <div className="designer-project-message-meta">
          <strong>{message.senderName ?? message.senderRole ?? t.unknown}</strong>
          <span>{message.senderRole}</span>
          <span>{formatChatTime(message.createdAt)}</span>
        </div>
        <p>{message.content ?? (message.attachment ? t.attachment : t.messageDeleted)}</p>
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
