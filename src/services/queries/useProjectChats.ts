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

  useEffect(() => {
    if (!activeChatId) {
      return;
    }

    const activeChatIndex = chats.findIndex((chat) => chat.chatId === activeChatId);
    const activeMessages = activeChatIndex >= 0 ? messageQueries[activeChatIndex]?.data?.items : undefined;

    if (!activeMessages?.length) {
      return;
    }

    const incomingMessages = activeMessages.filter(
      (message) =>
        message.messageType !== 'SYSTEM' &&
        !message.deletedAt &&
        Boolean(message.senderId && message.senderId !== currentUserId && message.createdAt),
    );
    const latestIncomingMessage = incomingMessages[incomingMessages.length - 1];

    const latestIncomingCreatedAt = latestIncomingMessage?.createdAt;

    if (!latestIncomingCreatedAt) {
      return;
    }

    setReadThroughByChatId((current) => {
      const currentReadThrough = current[activeChatId];

      if (currentReadThrough && new Date(currentReadThrough).getTime() >= new Date(latestIncomingCreatedAt).getTime()) {
        return current;
      }

      return {
        ...current,
        [activeChatId]: latestIncomingCreatedAt,
      };
    });
  }, [activeChatId, chats, currentUserId, messageQueries]);

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

        lookup[chat.chatId] = messages.filter(
          (message) =>
            message.messageType !== 'SYSTEM' &&
            !message.deletedAt &&
            !message.readAt &&
            Boolean(message.senderId && message.senderId !== currentUserId),
        ).filter(
          (message) =>
            !readThroughTime ||
            !message.createdAt ||
            new Date(message.createdAt).getTime() > readThroughTime,
        ).length;

        return lookup;
      }, {}),
    [activeChatId, chats, currentUserId, messageQueries, readThroughByChatId],
  );
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
      .withAutomaticReconnect()
      .build();
    connectionRef.current = connection;

    const joinGroups = async () => {
      if (connection.state !== signalR.HubConnectionState.Connected) {
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

    void connection.start().then(joinGroups).catch(() => undefined);

    return () => {
      connection.off('project_chat.message_sent');
      connectionRef.current = null;
      void connection.stop();
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
