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
import { orderQueryKeys } from './useOrders';
import { paymentQueryKeys } from './usePayments';
import { productionQueryKeys } from './useProduction';
import { projectQueryKeys } from './useProjects';
import { proposalQueryKeys } from './useProposals';
import { quotationQueryKeys } from './useQuotations';
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
  'proposal.published',
  'proposal.selected',
  'quotation.sent',
  'quotation.revised',
  'quotation.revision_requested',
  'quotation.rejected',
  'quotation.accepted',
  'payment.created',
  'payment.updated',
  'payment.processing',
  'payment.expired',
  'payment.cancelled',
  'payment.transaction.failed',
  'payment.transaction.cancelled',
  'order.updated',
  'order.delivered',
  'order.completed',
  'production.request.created',
  'production.request.assigned',
  'production.request.completed',
] as const;

const realtimeOnlyNotificationEvents = [
  'project.status.changed',
  'project_schedule.created',
  'project_schedule.updated',
  'project_schedule.confirmed',
  'project_schedule.completed',
  'order.item.delivery_updated',
  'order.item.delivery_confirmed',
] as const;

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

  if (!notification) {
    return;
  }

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
  const metadata = payload.metadata ?? {};
  const referenceType = payload.referenceType ?? '';
  const projectId = payload.projectId ?? asId(metadata.projectId);
  const ids = {
    orderId: asId(metadata.orderId) ?? asId(referenceType === 'ORDER' ? payload.referenceId : null),
    quotationId: asId(metadata.quotationId) ?? asId(referenceType === 'QUOTATION' ? payload.referenceId : null),
    proposalId: asId(metadata.proposalId) ?? asId(referenceType === 'PROPOSAL' ? payload.referenceId : null),
    scheduleId: asId(metadata.scheduleId) ?? asId(referenceType === 'PROJECT_SCHEDULE' ? payload.referenceId : null),
    paymentId: asId(referenceType === 'PAYMENT' ? payload.referenceId : null),
    productionRequestId:
      asId(metadata.productionRequestId) ?? asId(referenceType === 'PRODUCTION_REQUEST' ? payload.referenceId : null),
  };

  if (projectId) {
    void queryClient.invalidateQueries({ queryKey: projectQueryKeys.detail(projectId) });
    void queryClient.invalidateQueries({ queryKey: projectQueryKeys.workflow(projectId) });
    void queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
  }

  if (referenceType === 'PROJECT' || payload.notificationType?.includes('ProjectStatus')) {
    void queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
  }

  invalidateByReference(queryClient, payload, projectId, ids);
}

function invalidateByReference(
  queryClient: ReturnType<typeof useQueryClient>,
  payload: RealtimeNotificationPayload,
  projectId: string | null,
  ids: {
    orderId: string | null;
    quotationId: string | null;
    proposalId: string | null;
    scheduleId: string | null;
    paymentId: string | null;
    productionRequestId: string | null;
  },
) {
  const referenceType = payload.referenceType ?? '';
  const notificationType = payload.notificationType ?? '';

  if (referenceType === 'PROJECT_SCHEDULE' || notificationType.includes('Schedule')) {
    void queryClient.invalidateQueries({ queryKey: projectScheduleQueryKeys.all });

    if (ids.scheduleId) {
      void queryClient.invalidateQueries({ queryKey: projectScheduleQueryKeys.detail(ids.scheduleId) });
    }
  }

  if (referenceType === 'PROPOSAL' || notificationType.includes('Proposal')) {
    void queryClient.invalidateQueries({ queryKey: proposalQueryKeys.all });

    if (ids.proposalId) {
      void queryClient.invalidateQueries({ queryKey: proposalQueryKeys.detail(ids.proposalId) });
    }
  }

  if (referenceType === 'QUOTATION' || notificationType.includes('Quotation')) {
    void queryClient.invalidateQueries({ queryKey: quotationQueryKeys.all });

    if (ids.quotationId) {
      void queryClient.invalidateQueries({ queryKey: quotationQueryKeys.detail(ids.quotationId) });
    }
  }

  if (referenceType === 'PAYMENT' || notificationType.includes('Payment')) {
    void queryClient.invalidateQueries({ queryKey: paymentQueryKeys.all });

    if (ids.paymentId) {
      void queryClient.invalidateQueries({ queryKey: paymentQueryKeys.detail(ids.paymentId) });
      void queryClient.invalidateQueries({ queryKey: paymentQueryKeys.transactions(ids.paymentId) });
    }

    if (projectId) {
      void queryClient.invalidateQueries({ queryKey: paymentQueryKeys.projectStartFeeStatus(projectId) });
    }

    if (ids.orderId) {
      void queryClient.invalidateQueries({ queryKey: orderQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: orderQueryKeys.detail(ids.orderId) });

      if (projectId) {
        void queryClient.invalidateQueries({ queryKey: orderQueryKeys.byProject(projectId) });
      }
    }
  }

  if (referenceType === 'ORDER' || notificationType.includes('Order')) {
    void queryClient.invalidateQueries({ queryKey: orderQueryKeys.all });

    if (ids.orderId) {
      void queryClient.invalidateQueries({ queryKey: orderQueryKeys.detail(ids.orderId) });
    }

    if (projectId) {
      void queryClient.invalidateQueries({ queryKey: orderQueryKeys.byProject(projectId) });
    }
  }

  if (referenceType === 'PRODUCTION_REQUEST' || notificationType.includes('Production')) {
    void queryClient.invalidateQueries({ queryKey: productionQueryKeys.all });

    if (ids.productionRequestId) {
      void queryClient.invalidateQueries({ queryKey: productionQueryKeys.detail(ids.productionRequestId) });
    }
  }
}

function asId(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function mapRealtimePayloadToNotification(payload: RealtimeNotificationPayload): NotificationDto | null {
  if (!payload.notificationId) {
    return null;
  }

  return {
    notificationId: payload.notificationId,
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
