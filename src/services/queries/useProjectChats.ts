import { useEffect, useMemo, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  closeProjectChat,
  getProjectChatHubUrl,
  getProjectChatMessages,
  getProjectChats,
  sendProjectChatFileMessage,
  sendProjectChatTextMessage,
  type ProjectChatListItem,
  type ProjectChatListParams,
  type ProjectChatMessage,
  type ProjectChatMessageListResponse,
  type ProjectChatMessageParams,
  type ProjectChatMessageSentEvent,
} from '@/services/api/projectChats';
import { getStoredAccessToken } from '@/services/api/tokenStore';

export const projectChatQueryKeys = {
  all: ['project-chats'] as const,
  list: (params?: ProjectChatListParams) => ['project-chats', 'list', params] as const,
  messages: (params?: ProjectChatMessageParams) => ['project-chats', 'messages', params] as const,
};

export function useProjectChats(params?: ProjectChatListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: projectChatQueryKeys.list(params),
    queryFn: () => getProjectChats(params as ProjectChatListParams),
    enabled: Boolean(params?.projectId) && (options?.enabled ?? true),
  });
}

export function useProjectChatMessages(params?: ProjectChatMessageParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: projectChatQueryKeys.messages(params),
    queryFn: () => getProjectChatMessages(params as ProjectChatMessageParams),
    enabled: Boolean(params?.chatId) && (options?.enabled ?? true),
  });
}

export function useProjectChatUnreadCounts(
  chats: ProjectChatListItem[],
  currentUserId?: string | null,
  activeChatId?: string | null,
) {
  const [readThroughByChatId, setReadThroughByChatId] = useState<Record<string, string>>({});
  const messageQueries = useQueries({
    queries: chats.map((chat) => {
      const params = {
        chatId: chat.chatId,
        page: 1,
        limit: 50,
        sort: 'ASC' as const,
      };

      return {
        queryKey: projectChatQueryKeys.messages(params),
        queryFn: () => getProjectChatMessages(params),
        enabled: Boolean(chat.chatId && currentUserId),
        staleTime: 15 * 1000,
      };
    }),
  });
  const chatIdsKey = chats.map((chat) => chat.chatId).join('|');
  const messagesVersionKey = messageQueries
    .map((query) => {
      const items = query.data?.items ?? [];
      const lastMessageId = items.length > 0 ? items[items.length - 1]?.messageId ?? '' : '';
      return `${query.dataUpdatedAt}:${lastMessageId}`;
    })
    .join('|');

  useEffect(() => {
    setReadThroughByChatId((current) => {
      let next = current;
      let changed = false;

      chats.forEach((chat, index) => {
        const messages = messageQueries[index]?.data?.items ?? [];
        const latestIncomingCreatedAt = getLatestIncomingMessageCreatedAt(messages, currentUserId);

        if (!latestIncomingCreatedAt) {
          return;
        }

        const currentReadThrough = next[chat.chatId];
        const shouldInitializeChat = !currentReadThrough;
        const shouldReadActiveChat =
          chat.chatId === activeChatId &&
          (!currentReadThrough || new Date(currentReadThrough).getTime() < new Date(latestIncomingCreatedAt).getTime());

        if (!shouldInitializeChat && !shouldReadActiveChat) {
          return;
        }

        if (currentReadThrough === latestIncomingCreatedAt) {
          return;
        }

        changed = true;
        next = {
          ...next,
          [chat.chatId]: latestIncomingCreatedAt,
        };
      });

      return changed ? next : current;
    });
    // messageQueries is intentionally represented by messagesVersionKey to avoid render loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatId, chatIdsKey, currentUserId, messagesVersionKey]);

  return useMemo(
    () =>
      chats.reduce<Record<string, number>>((lookup, chat, index) => {
        if (chat.chatId === activeChatId) {
          lookup[chat.chatId] = 0;
          return lookup;
        }

        const messages = messageQueries[index]?.data?.items ?? [];
        const readThrough = readThroughByChatId[chat.chatId];
        const readThroughTime = readThrough ? new Date(readThrough).getTime() : null;

        if (!readThroughTime) {
          lookup[chat.chatId] = 0;
          return lookup;
        }

        lookup[chat.chatId] = messages
          .filter(
            (message) =>
              message.messageType !== 'SYSTEM' &&
              !message.deletedAt &&
              Boolean(message.senderId && message.senderId !== currentUserId),
          )
          .filter((message) => {
            if (!message.createdAt) {
              return false;
            }

            return new Date(message.createdAt).getTime() > readThroughTime;
          }).length;

        return lookup;
      }, {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeChatId, chatIdsKey, currentUserId, messagesVersionKey, readThroughByChatId],
  );
}

function getLatestIncomingMessageCreatedAt(messages: ProjectChatMessage[], currentUserId?: string | null) {
  const incomingMessages = messages.filter(
    (message) =>
      message.messageType !== 'SYSTEM' &&
      !message.deletedAt &&
      Boolean(message.senderId && message.senderId !== currentUserId && message.createdAt),
  );

  return incomingMessages[incomingMessages.length - 1]?.createdAt ?? null;
}

export function useSendProjectChatTextMessage() {
  return useMutation({
    mutationFn: (input: { chatId: string; content: string }) => sendProjectChatTextMessage(input.chatId, input.content),
  });
}

export function useSendProjectChatFileMessage() {
  return useMutation({
    mutationFn: (input: Parameters<typeof sendProjectChatFileMessage>[1] & { chatId: string }) =>
      sendProjectChatFileMessage(input.chatId, input),
  });
}

export function useCloseProjectChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chatId: string) => closeProjectChat(chatId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectChatQueryKeys.all });
    },
  });
}

export function useProjectChatRealtime(input: {
  projectId?: string | null;
  activeChatId?: string | null;
  enabled?: boolean;
  onMessage?: (event: ProjectChatMessageSentEvent) => void;
}) {
  const { activeChatId, enabled = true, onMessage, projectId } = input;
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const activeChatIdRef = useRef(activeChatId);
  const onMessageRef = useRef(onMessage);
  const projectIdRef = useRef(projectId);
  const hubUrl = useMemo(() => getProjectChatHubUrl(), []);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    projectIdRef.current = projectId;
  }, [projectId]);

  useEffect(() => {
    if (!enabled || !projectId) {
      return undefined;
    }

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => getStoredAccessToken() ?? '',
        withCredentials: true,
      })
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .build();
    connectionRef.current = connection;

    let isDisposed = false;

    const joinGroups = async () => {
      if (isDisposed || connection.state !== signalR.HubConnectionState.Connected) {
        return;
      }

      const currentProjectId = projectIdRef.current;
      const currentChatId = activeChatIdRef.current;

      if (!currentProjectId) {
        return;
      }

      await connection.invoke('JoinProject', currentProjectId);

      if (currentChatId) {
        await connection.invoke('JoinChat', currentChatId);
      }
    };

    connection.on('project_chat.message_sent', (event: ProjectChatMessageSentEvent) => {
      onMessageRef.current?.(event);
    });

    connection.onreconnected(() => {
      void joinGroups();
    });

    const startPromise = connection.start().then(joinGroups).catch(() => undefined);

    return () => {
      isDisposed = true;
      connection.off('project_chat.message_sent');
      connectionRef.current = null;
      void startPromise.finally(() => {
        void connection.stop().catch(() => undefined);
      });
    };
  }, [enabled, hubUrl, projectId]);

  useEffect(() => {
    const connection = connectionRef.current;

    if (!enabled || !activeChatId || !connection || connection.state !== signalR.HubConnectionState.Connected) {
      return;
    }

    void connection.invoke('JoinChat', activeChatId).catch(() => undefined);
  }, [activeChatId, enabled]);
}

export function upsertProjectChatMessage(
  current: ProjectChatMessageListResponse | undefined,
  message: ProjectChatMessage,
): ProjectChatMessageListResponse | undefined {
  if (!current) {
    return current;
  }

  const existingIndex = current.items.findIndex((item) => item.messageId === message.messageId);

  if (existingIndex >= 0) {
    const items = [...current.items];
    items[existingIndex] = message;

    return {
      ...current,
      items,
    };
  }

  const matchingPendingIndex = current.items.findIndex((item) => isMatchingPendingMessage(item, message));

  if (matchingPendingIndex >= 0) {
    const items = [...current.items];
    items[matchingPendingIndex] = message;

    return {
      ...current,
      items,
    };
  }

  return {
    ...current,
    items: [...current.items, message],
    total: current.total + 1,
  };
}

export function replaceProjectChatTempMessage(
  current: ProjectChatMessageListResponse | undefined,
  tempMessageId: string,
  savedMessage: ProjectChatMessage,
): ProjectChatMessageListResponse | undefined {
  if (!current) {
    return current;
  }

  const items = current.items.filter((item) => item.messageId !== tempMessageId && item.messageId !== savedMessage.messageId);

  return {
    ...current,
    items: [...items, savedMessage],
  };
}

function isMatchingPendingMessage(currentMessage: ProjectChatMessage, savedMessage: ProjectChatMessage) {
  if (!currentMessage.messageId.startsWith('temp-') || currentMessage.chatId !== savedMessage.chatId) {
    return false;
  }

  if (currentMessage.senderId !== savedMessage.senderId || currentMessage.messageType !== savedMessage.messageType) {
    return false;
  }

  if ((currentMessage.content ?? '') !== (savedMessage.content ?? '')) {
    return false;
  }

  if (currentMessage.attachment?.originalFileName !== savedMessage.attachment?.originalFileName) {
    return false;
  }

  return true;
}
