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
import type { ProductIssueReportDto, ProductIssueReportListDto } from '@/services/api/productIssues';
import {
  attachSignalRRecovery,
  infiniteSignalRRetryPolicy,
  signalRHttpConnectionOptions,
} from '@/services/api/signalRAuth';
import { dashboardQueryKeys } from './useDashboard';
import { customizationRequestQueryKeys } from './useCustomizationRequests';
import { measurementImageQueryKeys } from './useMeasurementImages';
import { orderQueryKeys } from './useOrders';
import { operationalDelayQueryKeys } from './useOperationalDelayReports';
import { paymentQueryKeys } from './usePayments';
import { productIssueQueryKeys } from './useProductIssues';
import { productionQueryKeys } from './useProduction';
import { projectAreaQueryKeys } from './useProjectAreas';
import { projectChatQueryKeys } from './useProjectChats';
import { projectQueryKeys } from './useProjects';
import { proposalQueryKeys } from './useProposals';
import { quotationQueryKeys } from './useQuotations';
import { projectScheduleQueryKeys } from './useSchedules';
import { showcaseQueryKeys } from './useShowcases';

export const notificationQueryKeys = {
  all: ['notifications'] as const,
  list: (params?: NotificationListParams) => ['notifications', 'list', params] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
};

/** In-app events (may persist to bell). Invalidate always runs even if notificationId is null. */
const inAppNotificationEvents = [
  'notification.created',
  'project.request.submitted',
  'project.request.accepted',
  'project.more_information.requested',
  'project.basic_information.updated',
  'project.designer.assigned',
  'project.proposal.reopened',
  'proposal.published',
  'proposal.selected',
  'proposal.revision.requested',
  'proposal.reopened_for_editing',
  'quotation.sent',
  'quotation.revised',
  'quotation.revision_requested',
  'quotation.rejected',
  'quotation.accepted',
  'customization_request.submitted',
  'customization_request.designer_reviewed',
  'customization.version.submitted_for_review',
  'customization.version.production_reviewed',
  'customization.version.accepted',
  'project_schedule.created',
  'project_schedule.confirmed',
  'project_schedule.change_requested',
  'project_showcase.submitted',
  'payment.created',
  'payment.updated',
  'payment.processing',
  'payment.expired',
  'payment.cancelled',
  'payment.transaction.failed',
  'payment.transaction.cancelled',
  'order.deposit.paid',
  'order.updated',
  'order.delivered',
  'order.completed',
  'order.delivery.completed',
  'production.request.created',
  'production.request.assigned',
  'production.request.completed',
  'production_item.cancelled',
  'production.delay.reported',
  'delivery.delay.reported',
  'product_issue.reported',
  'product_issue.resolved',
  'project_chat.message_sent',
] as const;

/** Realtime-only events (no bell row). Still invalidate domain caches. */
const realtimeOnlyNotificationEvents = [
  'project.status.changed',
  'project_schedule.updated',
  'project_schedule.completed',
  'order.item.delivery_updated',
  'order.item.delivery_confirmed',
  'measurement_image.uploaded',
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
      .withUrl(hubUrl, signalRHttpConnectionOptions)
      .withAutomaticReconnect(infiniteSignalRRetryPolicy)
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    const handleInAppNotification = (eventName: string, payload: RealtimeNotificationPayload) => {
      if (payload.notificationId) {
        upsertRealtimeNotification(queryClient, payload);
      }

      invalidateBusinessQueries(queryClient, payload, eventName);
      onInAppNotificationRef.current?.(payload);
    };

    const handleRealtimeOnlyNotification = (eventName: string, payload: RealtimeNotificationPayload) => {
      invalidateBusinessQueries(queryClient, payload, eventName);
      onRealtimeOnlyNotificationRef.current?.(payload);
    };

    inAppNotificationEvents.forEach((eventName) => {
      connection.on(eventName, (payload: RealtimeNotificationPayload) => {
        handleInAppNotification(eventName, payload);
      });
    });

    realtimeOnlyNotificationEvents.forEach((eventName) => {
      connection.on(eventName, (payload: RealtimeNotificationPayload) => {
        handleRealtimeOnlyNotification(eventName, payload);
      });
    });

    let isDisposed = false;
    let lastKnownUnreadCount: number | null = null;

    const catchUpFromRest = () => {
      void queryClient.invalidateQueries({ queryKey: notificationQueryKeys.unreadCount });
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] });
      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: paymentQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: orderQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all });
    };

    const detachRecovery = attachSignalRRecovery(connection, () => isDisposed, () => {
      catchUpFromRest();
    });

    connection.onreconnected(() => {
      catchUpFromRest();
    });

    const startPromise = connection
      .start()
      .then(async () => {
        // Seed unread baseline, then poll as a safety net when WS looks alive but pushes are dropped
        // (common on free-tier hosts / cross-origin cookie gaps).
        try {
          const unread = await getNotificationUnreadCount();
          lastKnownUnreadCount = unread.unreadCount;
          queryClient.setQueryData(notificationQueryKeys.unreadCount, unread);
        } catch {
          lastKnownUnreadCount = null;
        }
      })
      .catch((error) => {
        if (import.meta.env.DEV) {
          console.warn('[SignalR] notifications start failed', error);
        }
      });

    const onVisibleCatchUp = () => {
      if (document.visibilityState === 'hidden') {
        return;
      }

      catchUpFromRest();
    };

    document.addEventListener('visibilitychange', onVisibleCatchUp);
    window.addEventListener('focus', onVisibleCatchUp);

    const pollId = window.setInterval(() => {
      if (isDisposed || document.visibilityState === 'hidden') {
        return;
      }

      void getNotificationUnreadCount()
        .then((unread) => {
          const previous = lastKnownUnreadCount;
          lastKnownUnreadCount = unread.unreadCount;
          queryClient.setQueryData(notificationQueryKeys.unreadCount, unread);

          if (previous !== null && unread.unreadCount > previous) {
            catchUpFromRest();
          }
        })
        .catch(() => undefined);
    }, 15_000);

    return () => {
      isDisposed = true;
      detachRecovery();
      window.clearInterval(pollId);
      document.removeEventListener('visibilitychange', onVisibleCatchUp);
      window.removeEventListener('focus', onVisibleCatchUp);
      inAppNotificationEvents.forEach((eventName) => {
        connection.off(eventName);
      });
      realtimeOnlyNotificationEvents.forEach((eventName) => {
        connection.off(eventName);
      });

      void startPromise.finally(() => {
        if (!isDisposed) {
          return;
        }

        if (
          connection.state === signalR.HubConnectionState.Connected
          || connection.state === signalR.HubConnectionState.Connecting
          || connection.state === signalR.HubConnectionState.Reconnecting
        ) {
          void connection.stop();
        }
      });
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

function invalidateBusinessQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  payload: RealtimeNotificationPayload,
  eventName = '',
) {
  const metadata = payload.metadata ?? {};
  const referenceType = payload.referenceType ?? '';
  const notificationType = payload.notificationType ?? '';
  const projectId =
    payload.projectId
    ?? asId(metadata.projectId)
    ?? asId(referenceType === 'PROJECT' ? payload.referenceId : null);

  const isPaymentEvent = matchesDomain(eventName, referenceType, notificationType, {
    eventPrefix: 'payment.',
    referenceType: 'PAYMENT',
    notificationNeedle: 'payment',
  });
  const isOrderEvent =
    matchesDomain(eventName, referenceType, notificationType, {
      eventPrefix: 'order.',
      referenceType: 'ORDER',
      notificationNeedle: 'order',
    })
    || eventName.startsWith('order.delivery.')
    || eventName.startsWith('order.item.');
  const isScheduleEvent = matchesDomain(eventName, referenceType, notificationType, {
    eventPrefix: 'project_schedule.',
    referenceType: 'PROJECT_SCHEDULE',
    notificationNeedle: 'schedule',
  });
  const isProposalEvent =
    matchesDomain(eventName, referenceType, notificationType, {
      eventPrefix: 'proposal.',
      referenceType: 'PROPOSAL',
      notificationNeedle: 'proposal',
    })
    || eventName === 'project.proposal.reopened';
  const isQuotationEvent = matchesDomain(eventName, referenceType, notificationType, {
    eventPrefix: 'quotation.',
    referenceType: 'QUOTATION',
    notificationNeedle: 'quotation',
  });
  const isProductionEvent =
    eventName.startsWith('production.')
    || eventName.startsWith('production_item.')
    || eventName.startsWith('delivery.delay.')
    || referenceType === 'PRODUCTION_REQUEST'
    || referenceType === 'OPERATIONAL_DELAY_REPORT'
    || notificationType.toLowerCase().includes('production')
    || notificationType.toLowerCase().includes('delayreported');
  const isCustomizationEvent =
    eventName.startsWith('customization.')
    || eventName.startsWith('customization_request.')
    || referenceType === 'CUSTOMIZATION_REQUEST'
    || referenceType === 'CUSTOMIZATION_VERSION'
    || notificationType.toLowerCase().includes('customization');
  const isProductIssueEvent =
    eventName.startsWith('product_issue.')
    || referenceType === 'DELIVERY_PRODUCT_ISSUE_REPORT'
    || notificationType === 'ProductIssueReported'
    || notificationType === 'ProductIssueResolved'
    || notificationType.toLowerCase().includes('productissue')
    || notificationType.toLowerCase().includes('product_issue');
  const isShowcaseEvent =
    eventName.startsWith('project_showcase.')
    || referenceType === 'PROJECT_SHOWCASE'
    || notificationType.toLowerCase().includes('showcase');
  const isMeasurementEvent =
    eventName.startsWith('measurement_image.')
    || notificationType.toLowerCase().includes('measurement');
  const isChatEvent =
    eventName.startsWith('project_chat.')
    || referenceType === 'PROJECT_CHAT_MESSAGE'
    || notificationType === 'ProjectChatMessageSent';
  const isProjectEvent =
    eventName.startsWith('project.')
    || referenceType === 'PROJECT'
    || notificationType.toLowerCase().includes('project');

  const ids = {
    orderId:
      asId(metadata.orderId)
      ?? asId(isOrderEvent || referenceType === 'ORDER' ? payload.referenceId : null),
    quotationId:
      asId(metadata.quotationId)
      ?? asId(isQuotationEvent || referenceType === 'QUOTATION' ? payload.referenceId : null),
    proposalId:
      asId(metadata.proposalId)
      ?? asId(isProposalEvent || referenceType === 'PROPOSAL' ? payload.referenceId : null),
    scheduleId:
      asId(metadata.scheduleId)
      ?? asId(isScheduleEvent || referenceType === 'PROJECT_SCHEDULE' ? payload.referenceId : null),
    paymentId:
      asId(metadata.paymentId)
      ?? asId(isPaymentEvent || referenceType === 'PAYMENT' ? payload.referenceId : null),
    productionRequestId:
      asId(metadata.productionRequestId)
      ?? asId(referenceType === 'PRODUCTION_REQUEST' || eventName.startsWith('production.request.') ? payload.referenceId : null),
    operationalDelayReportId:
      asId(metadata.operationalDelayReportId)
      ?? asId(referenceType === 'OPERATIONAL_DELAY_REPORT' ? payload.referenceId : null),
    productIssueId:
      asId(metadata.issueId)
      ?? asId(metadata.deliveryProductIssueReportId)
      ?? asId(isProductIssueEvent || referenceType === 'DELIVERY_PRODUCT_ISSUE_REPORT' ? payload.referenceId : null),
    customizationRequestId:
      asId(metadata.customizationRequestId)
      ?? asId(referenceType === 'CUSTOMIZATION_REQUEST' ? payload.referenceId : null),
    customizationRequestVersionId:
      asId(metadata.customizationRequestVersionId)
      ?? asId(referenceType === 'CUSTOMIZATION_VERSION' ? payload.referenceId : null),
    showcaseId:
      asId(metadata.showcaseId)
      ?? asId(referenceType === 'PROJECT_SHOWCASE' ? payload.referenceId : null),
    projectAreaId: asId(metadata.projectAreaId),
    deliveryId: asId(metadata.deliveryId),
    chatId: asId(metadata.chatId),
  };

  void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all });
  void queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });

  if (projectId || isProjectEvent) {
    void queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });

    if (projectId) {
      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.detail(projectId) });
      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.workflow(projectId) });
    }
  }

  if (isPaymentEvent) {
    void queryClient.invalidateQueries({ queryKey: paymentQueryKeys.all });

    if (ids.paymentId) {
      void queryClient.invalidateQueries({ queryKey: paymentQueryKeys.detail(ids.paymentId) });
      void queryClient.invalidateQueries({ queryKey: paymentQueryKeys.transactions(ids.paymentId) });
    }

    if (projectId) {
      void queryClient.invalidateQueries({ queryKey: paymentQueryKeys.projectStartFeeStatus(projectId) });
    }

    void queryClient.invalidateQueries({ queryKey: orderQueryKeys.all });
  }

  if (isOrderEvent) {
    void queryClient.invalidateQueries({ queryKey: orderQueryKeys.all });

    if (ids.orderId) {
      void queryClient.invalidateQueries({ queryKey: orderQueryKeys.detail(ids.orderId) });
      void queryClient.invalidateQueries({ queryKey: orderQueryKeys.deliveries(ids.orderId) });
      void queryClient.invalidateQueries({ queryKey: orderQueryKeys.deliveryTracking(ids.orderId) });
      void queryClient.invalidateQueries({ queryKey: orderQueryKeys.paymentHistory(ids.orderId) });

      if (ids.deliveryId) {
        void queryClient.invalidateQueries({ queryKey: orderQueryKeys.delivery(ids.orderId, ids.deliveryId) });
      }
    }

    if (projectId) {
      void queryClient.invalidateQueries({ queryKey: orderQueryKeys.byProject(projectId) });
      // Delivery completion often completes linked schedules too.
      void queryClient.invalidateQueries({ queryKey: projectScheduleQueryKeys.all });
    }
  }

  if (isScheduleEvent) {
    void queryClient.invalidateQueries({ queryKey: projectScheduleQueryKeys.all });

    if (ids.scheduleId) {
      void queryClient.invalidateQueries({ queryKey: projectScheduleQueryKeys.detail(ids.scheduleId) });
    }

    // Reschedule / delivery schedule changes affect tracking + production ready boards.
    if (
      ids.orderId
      || eventName.includes('delivery')
      || (typeof metadata.scheduleType === 'string' && metadata.scheduleType.toUpperCase() === 'DELIVERY')
    ) {
      void queryClient.invalidateQueries({ queryKey: orderQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: productionQueryKeys.all });

      if (ids.orderId) {
        void queryClient.invalidateQueries({ queryKey: orderQueryKeys.deliveryTracking(ids.orderId) });
        void queryClient.invalidateQueries({ queryKey: orderQueryKeys.deliveries(ids.orderId) });
      }
    }
  }

  if (isProposalEvent) {
    void queryClient.invalidateQueries({ queryKey: proposalQueryKeys.all });

    if (ids.proposalId) {
      void queryClient.invalidateQueries({ queryKey: proposalQueryKeys.detail(ids.proposalId) });
      void queryClient.invalidateQueries({ queryKey: ['proposals', ids.proposalId] });
    }

    // Select / reopen / publish also reshapes quotations & orders path.
    if (
      eventName === 'proposal.selected'
      || eventName === 'proposal.published'
      || eventName === 'project.proposal.reopened'
      || eventName === 'proposal.reopened_for_editing'
      || notificationType.toLowerCase().includes('selected')
      || notificationType.toLowerCase().includes('reopened')
    ) {
      void queryClient.invalidateQueries({ queryKey: quotationQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: orderQueryKeys.all });
    }
  }

  if (isQuotationEvent) {
    void queryClient.invalidateQueries({ queryKey: quotationQueryKeys.all });

    if (ids.quotationId) {
      void queryClient.invalidateQueries({ queryKey: quotationQueryKeys.detail(ids.quotationId) });
    }

    if (eventName === 'quotation.accepted' || notificationType === 'QuotationAccepted') {
      void queryClient.invalidateQueries({ queryKey: orderQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: paymentQueryKeys.all });

      if (projectId) {
        void queryClient.invalidateQueries({ queryKey: orderQueryKeys.byProject(projectId) });
      }
    }
  }

  if (isProductionEvent) {
    void queryClient.invalidateQueries({ queryKey: productionQueryKeys.all });
    void queryClient.invalidateQueries({ queryKey: operationalDelayQueryKeys.all });

    if (ids.productionRequestId) {
      void queryClient.invalidateQueries({ queryKey: productionQueryKeys.detail(ids.productionRequestId) });
    }

    if (ids.operationalDelayReportId) {
      void queryClient.invalidateQueries({ queryKey: operationalDelayQueryKeys.detail(ids.operationalDelayReportId) });
    }
  }

  if (isCustomizationEvent) {
    void queryClient.invalidateQueries({ queryKey: customizationRequestQueryKeys.all });
    void queryClient.invalidateQueries({ queryKey: ['customization-versions'] });
    // Accepted / reviewed versions can change proposal items.
    void queryClient.invalidateQueries({ queryKey: proposalQueryKeys.all });

    if (ids.proposalId) {
      void queryClient.invalidateQueries({ queryKey: proposalQueryKeys.detail(ids.proposalId) });
      void queryClient.invalidateQueries({ queryKey: ['proposals', ids.proposalId] });
    }
  }

  if (isProductIssueEvent) {
    void queryClient.invalidateQueries({ queryKey: productIssueQueryKeys.all });

    if (ids.productIssueId) {
      void queryClient.invalidateQueries({ queryKey: productIssueQueryKeys.detail(ids.productIssueId) });
      applyProductIssueResolvedToCaches(queryClient, {
        issueId: ids.productIssueId,
        orderId: ids.orderId,
        projectId,
        isResolved: eventName === 'product_issue.resolved' || notificationType === 'ProductIssueResolved',
        resolutionNote: typeof metadata.resolutionNote === 'string' ? metadata.resolutionNote : null,
        resolvedAt: payload.occurredAt ?? payload.createdAt ?? new Date().toISOString(),
      });
    }

    if (ids.orderId) {
      void queryClient.invalidateQueries({ queryKey: productIssueQueryKeys.order(ids.orderId) });
      void queryClient.invalidateQueries({ queryKey: orderQueryKeys.detail(ids.orderId) });
      void queryClient.invalidateQueries({ queryKey: orderQueryKeys.deliveryTracking(ids.orderId) });
    }

    if (projectId) {
      void queryClient.invalidateQueries({ queryKey: productIssueQueryKeys.project(projectId) });
    }
  }

  if (isShowcaseEvent) {
    void queryClient.invalidateQueries({ queryKey: showcaseQueryKeys.all });

    if (ids.showcaseId) {
      void queryClient.invalidateQueries({ queryKey: showcaseQueryKeys.adminDetail(ids.showcaseId) });
    }

    if (projectId) {
      void queryClient.invalidateQueries({ queryKey: showcaseQueryKeys.project(projectId) });
    }
  }

  if (isMeasurementEvent) {
    void queryClient.invalidateQueries({ queryKey: measurementImageQueryKeys.all });
    void queryClient.invalidateQueries({ queryKey: projectAreaQueryKeys.all });

    if (projectId) {
      void queryClient.invalidateQueries({ queryKey: measurementImageQueryKeys.project(projectId) });
    }

    if (ids.scheduleId) {
      void queryClient.invalidateQueries({ queryKey: measurementImageQueryKeys.schedule(ids.scheduleId) });
      void queryClient.invalidateQueries({ queryKey: projectScheduleQueryKeys.detail(ids.scheduleId) });
    }

    if (ids.projectAreaId) {
      void queryClient.invalidateQueries({ queryKey: measurementImageQueryKeys.area(ids.projectAreaId) });
    }
  }

  if (isChatEvent) {
    void queryClient.invalidateQueries({ queryKey: projectChatQueryKeys.all });

    if (ids.chatId) {
      void queryClient.invalidateQueries({
        queryKey: projectChatQueryKeys.messages({ chatId: ids.chatId, page: 1, limit: 50, sort: 'ASC' }),
      });
    }
  }

  if (isPaymentEvent && ids.orderId) {
    void queryClient.invalidateQueries({ queryKey: orderQueryKeys.detail(ids.orderId) });
  }
}

function matchesDomain(
  eventName: string,
  referenceType: string,
  notificationType: string,
  options: {
    eventPrefix: string;
    referenceType: string;
    notificationNeedle: string;
  },
) {
  return (
    eventName.startsWith(options.eventPrefix)
    || referenceType === options.referenceType
    || notificationType.toLowerCase().includes(options.notificationNeedle)
  );
}

function applyProductIssueResolvedToCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  input: {
    issueId: string;
    orderId: string | null;
    projectId: string | null;
    isResolved: boolean;
    resolutionNote: string | null;
    resolvedAt: string;
  },
) {
  if (!input.isResolved) {
    return;
  }

  const patchIssue = (issue: ProductIssueReportDto): ProductIssueReportDto => {
    if (issue.deliveryProductIssueReportId !== input.issueId) {
      return issue;
    }

    return {
      ...issue,
      status: 'RESOLVED',
      resolvedAt: input.resolvedAt,
      resolutionNote: input.resolutionNote ?? issue.resolutionNote ?? null,
    };
  };

  queryClient.setQueriesData<ProductIssueReportListDto>(
    { queryKey: productIssueQueryKeys.all },
    (current) => {
      if (!current?.items) {
        return current;
      }

      return {
        ...current,
        items: current.items.map(patchIssue),
      };
    },
  );

  queryClient.setQueryData<ProductIssueReportDto>(productIssueQueryKeys.detail(input.issueId), (current) =>
    current ? patchIssue(current) : current,
  );
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
    metadata: payload.metadata ?? null,
  };
}
