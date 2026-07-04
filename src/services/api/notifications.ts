import axios, { AxiosError } from 'axios';

import { shouldRedirectUnauthorized } from '@/shared/config/authPreview';

export type NotificationReferenceType = 'PROJECT' | 'PROJECT_SCHEDULE' | string;

export type NotificationType =
  | 'ProjectRequestSubmitted'
  | 'ProjectRequestAccepted'
  | 'ProjectMoreInformationRequested'
  | 'ProjectBasicInformationUpdated'
  | 'ProjectStatusChanged'
  | 'ProjectDesignerAssigned'
  | 'ProjectScheduleCreated'
  | 'ProjectScheduleUpdated'
  | 'ProjectScheduleConfirmed'
  | 'ProjectScheduleCompleted'
  | 'ProjectScheduleCancelled'
  | string;

export type ServiceResult<T> = {
  status: number;
  message?: string;
  data: T;
  errors?: string[];
};

export type NotificationDto = {
  notificationId: string;
  receiverId: string;
  projectId: string | null;
  title: string;
  message: string | null;
  notificationType: NotificationType | null;
  referenceType: NotificationReferenceType | null;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string | null;
  readAt: string | null;
};

export type NotificationListResponse = {
  items: NotificationDto[];
  page: number;
  limit: number;
  total: number;
};

export type NotificationListParams = {
  isUnread?: boolean | null;
  page?: number;
  limit?: number;
};

export type NotificationUnreadCountResponse = {
  unreadCount: number;
};

export type MarkNotificationReadResponse = {
  notificationId: string;
  isRead: boolean;
  readAt: string | null;
};

export type RealtimeNotificationPayload = {
  notificationId?: string;
  title: string;
  message?: string | null;
  notificationType?: NotificationType | null;
  projectId?: string | null;
  referenceType?: NotificationReferenceType | null;
  referenceId?: string | null;
  createdAt?: string | null;
  occurredAt?: string | null;
};

const notificationApiClient = axios.create({
  baseURL: getNotificationApiBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

notificationApiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && shouldRedirectUnauthorized()) {
      window.location.assign('/login');
    }

    return Promise.reject(error);
  },
);

export async function getMyNotifications(params: NotificationListParams = {}) {
  const response = await notificationApiClient.get<ServiceResult<NotificationListResponse>>('/notifications/me', {
    params: {
      isUnread: params.isUnread ?? undefined,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
  });

  return response.data.data;
}

export async function getNotificationUnreadCount() {
  const response = await notificationApiClient.get<ServiceResult<NotificationUnreadCountResponse>>('/notifications/me/unread-count');

  return response.data.data;
}

export async function markNotificationAsRead(notificationId: string) {
  const response = await notificationApiClient.patch<ServiceResult<MarkNotificationReadResponse>>(`/notifications/${notificationId}/read`);

  return response.data.data;
}

export async function markAllNotificationsAsRead() {
  const response = await notificationApiClient.patch<ServiceResult<Record<string, never>>>('/notifications/me/read-all');

  return response.data.data;
}

export function getNotificationHubUrl() {
  const baseUrl = getNotificationApiBaseUrl()?.replace(/\/$/, '') ?? '';

  return `${baseUrl}/hubs/notifications`;
}

export function getNotificationServiceResultMessage(error: unknown) {
  const result = getNotificationServiceResultFromError(error);

  if (!result) {
    return 'Cannot connect to notification API. Please check backend and VITE_API_URL.';
  }

  if (result.errors?.length) {
    return result.errors.join('\n');
  }

  return result.message || 'Notification request failed. Please try again.';
}

function getNotificationServiceResultFromError(error: unknown) {
  if (!(error instanceof AxiosError)) {
    return null;
  }

  const data = error.response?.data;

  if (data && typeof data === 'object' && 'status' in data) {
    return data as ServiceResult<unknown>;
  }

  return null;
}

function getNotificationApiBaseUrl() {
  const configuredApiUrl = import.meta.env.VITE_NOTIFICATION_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;

  return configuredApiUrl?.replace(/\/api\/?$/, '');
}
