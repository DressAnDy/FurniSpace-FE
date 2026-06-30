import { useEffect, useMemo, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getMyNotifications,
  getNotificationHubUrl,
  getNotificationUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationDto,
  type NotificationListParams,
  type NotificationListResponse,
  type RealtimeNotificationPayload,
} from '@/services/api/notifications';
import { getStoredAccessToken } from '@/services/api/tokenStore';
import { projectQueryKeys } from './useProjects';
import { projectScheduleQueryKeys } from './useSchedules';

export const notificationQueryKeys = {
  all: ['notifications'] as const,
  list: (params?: NotificationListParams) => ['notifications', 'list', params] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
};

const inAppNotificationEvents = [
  'notification.created',
  'project.request.submitted',
  'project.request.accepted',
  'project.more_information.requested',
  'project.basic_information.updated',
  'project.designer.assigned',
] as const;

const realtimeOnlyNotificationEvents = ['project.status.changed', 'project_schedule.completed'] as const;

export function useNotifications(params: NotificationListParams = {}) {
  return useQuery({
    queryKey: notificationQueryKeys.list(params),
    queryFn: () => getMyNotifications(params),
  });
}

export function useNotificationUnreadCount() {
  return useQuery({
    queryKey: notificationQueryKeys.unreadCount,
    queryFn: getNotificationUnreadCount,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => markNotificationAsRead(notificationId),
    onSuccess: (data) => {
      updateNotificationReadState(queryClient, data.notificationId, data.readAt);
      void queryClient.invalidateQueries({ queryKey: notificationQueryKeys.unreadCount });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.setQueriesData<NotificationListResponse>(
        { queryKey: ['notifications', 'list'] },
        (current) =>
          current
            ? {
                ...current,
                items: current.items.map((item) => ({
                  ...item,
                  isRead: true,
                  readAt: item.readAt ?? new Date().toISOString(),
                })),
              }
            : current,
      );
      queryClient.setQueryData(notificationQueryKeys.unreadCount, { unreadCount: 0 });
    },
  });
}

export function useNotificationRealtime(input: {
  enabled?: boolean;
  onInAppNotification?: (payload: RealtimeNotificationPayload) => void;
  onRealtimeOnlyNotification?: (payload: RealtimeNotificationPayload) => void;
} = {}) {
  const { enabled = true, onInAppNotification, onRealtimeOnlyNotification } = input;
  const queryClient = useQueryClient();
  const onInAppNotificationRef = useRef(onInAppNotification);
  const onRealtimeOnlyNotificationRef = useRef(onRealtimeOnlyNotification);
  const hubUrl = useMemo(() => getNotificationHubUrl(), []);

  useEffect(() => {
    onInAppNotificationRef.current = onInAppNotification;
  }, [onInAppNotification]);

  useEffect(() => {
    onRealtimeOnlyNotificationRef.current = onRealtimeOnlyNotification;
  }, [onRealtimeOnlyNotification]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => getStoredAccessToken() ?? '',
        withCredentials: true,
      })
      .withAutomaticReconnect()
      .build();

    const handleInAppNotification = (payload: RealtimeNotificationPayload) => {
      if (payload.notificationId) {
        upsertRealtimeNotification(queryClient, payload);
      }

      invalidateBusinessQueries(queryClient, payload);
      onInAppNotificationRef.current?.(payload);
    };

    const handleRealtimeOnlyNotification = (payload: RealtimeNotificationPayload) => {
      invalidateBusinessQueries(queryClient, payload);
      onRealtimeOnlyNotificationRef.current?.(payload);
    };

    inAppNotificationEvents.forEach((eventName) => {
      connection.on(eventName, handleInAppNotification);
    });

    realtimeOnlyNotificationEvents.forEach((eventName) => {
      connection.on(eventName, handleRealtimeOnlyNotification);
    });

    let isDisposed = false;

    const stopConnection = () => {
      if (connection.state === signalR.HubConnectionState.Connected || connection.state === signalR.HubConnectionState.Reconnecting) {
        void connection.stop();
      }
    };

    const startPromise = connection.start().catch(() => undefined);

    return () => {
      isDisposed = true;
      inAppNotificationEvents.forEach((eventName) => {
        connection.off(eventName, handleInAppNotification);
      });
      realtimeOnlyNotificationEvents.forEach((eventName) => {
        connection.off(eventName, handleRealtimeOnlyNotification);
      });

      if (connection.state === signalR.HubConnectionState.Connecting) {
        void startPromise.finally(() => {
          if (isDisposed) {
            stopConnection();
          }
        });
        return;
      }

      stopConnection();
    };
  }, [enabled, hubUrl, queryClient]);
}

function upsertRealtimeNotification(queryClient: ReturnType<typeof useQueryClient>, payload: RealtimeNotificationPayload) {
  const notification = mapRealtimePayloadToNotification(payload);

  queryClient.setQueriesData<NotificationListResponse>(
    { queryKey: ['notifications', 'list'] },
    (current) => {
      if (!current) {
        return current;
      }

      if (current.items.some((item) => item.notificationId === notification.notificationId)) {
        return current;
      }

      return {
        ...current,
        items: [notification, ...current.items].slice(0, current.limit),
        total: current.total + 1,
      };
    },
  );

  queryClient.setQueryData<{ unreadCount: number }>(notificationQueryKeys.unreadCount, (current) => ({
    unreadCount: (current?.unreadCount ?? 0) + 1,
  }));
}

function updateNotificationReadState(queryClient: ReturnType<typeof useQueryClient>, notificationId: string, readAt: string | null) {
  queryClient.setQueriesData<NotificationListResponse>(
    { queryKey: ['notifications', 'list'] },
    (current) =>
      current
        ? {
            ...current,
            items: current.items.map((item) =>
              item.notificationId === notificationId
                ? {
                    ...item,
                    isRead: true,
                    readAt,
                  }
                : item,
            ),
          }
        : current,
  );
}

function invalidateBusinessQueries(queryClient: ReturnType<typeof useQueryClient>, payload: RealtimeNotificationPayload) {
  void queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });

  if (payload.projectId) {
    void queryClient.invalidateQueries({ queryKey: projectQueryKeys.detail(payload.projectId) });
  }

  if (payload.referenceType === 'PROJECT_SCHEDULE') {
    void queryClient.invalidateQueries({ queryKey: projectScheduleQueryKeys.all });

    if (payload.referenceId) {
      void queryClient.invalidateQueries({ queryKey: projectScheduleQueryKeys.detail(payload.referenceId) });
    }
  }

  if (payload.notificationType === 'ProjectScheduleCompleted') {
    void queryClient.invalidateQueries({ queryKey: projectScheduleQueryKeys.all });
  }
}

function mapRealtimePayloadToNotification(payload: RealtimeNotificationPayload): NotificationDto {
  return {
    notificationId: payload.notificationId ?? crypto.randomUUID(),
    receiverId: '',
    projectId: payload.projectId ?? null,
    title: payload.title,
    message: payload.message ?? null,
    notificationType: payload.notificationType ?? null,
    referenceType: payload.referenceType ?? null,
    referenceId: payload.referenceId ?? null,
    isRead: false,
    createdAt: payload.createdAt ?? payload.occurredAt ?? new Date().toISOString(),
    readAt: null,
  };
}
