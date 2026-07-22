import { IconBell, IconCheck, IconLoader2 } from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  getNotificationServiceResultMessage,
  type NotificationDto,
} from '@/services/api/notifications';
import {
  useCurrentUser,
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotificationUnreadCount,
  useNotifications,
} from '@/services/queries';
import { useRealtimeNotificationMessage } from './NotificationRealtimeProvider';

import './NotificationBell.css';

type NotificationBellProps = {
  buttonClassName?: string;
  className?: string;
};

export function NotificationBell({ buttonClassName, className }: NotificationBellProps) {
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const realtimeMessage = useRealtimeNotificationMessage();
  const notificationsQuery = useNotifications({ page: 1, limit: 10 });
  const unreadCountQuery = useNotificationUnreadCount();
  const markReadMutation = useMarkNotificationAsRead();
  const markAllReadMutation = useMarkAllNotificationsAsRead();
  const { data: user } = useCurrentUser();
  const unreadCount = unreadCountQuery.data?.unreadCount ?? 0;
  const notifications = notificationsQuery.data?.items ?? [];
  const formattedUnreadCount = unreadCount > 99 ? '99+' : unreadCount.toString();

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const errorMessage = useMemo(() => {
    if (notificationsQuery.error) {
      return getNotificationServiceResultMessage(notificationsQuery.error);
    }

    if (unreadCountQuery.error) {
      return getNotificationServiceResultMessage(unreadCountQuery.error);
    }

    return null;
  }, [notificationsQuery.error, unreadCountQuery.error]);

  async function handleNotificationClick(notification: NotificationDto) {
    if (!notification.isRead) {
      await markReadMutation.mutateAsync(notification.notificationId).catch(() => undefined);
    }

    setIsOpen(false);
    navigate(getNotificationTargetPath(notification, user?.role));
  }

  function handleMarkAllRead() {
    markAllReadMutation.mutate();
  }

  return (
    <div className={`notification-bell ${className ?? ''}`} ref={wrapRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        className={`notification-bell-button ${buttonClassName ?? ''}`}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <IconBell size={20} stroke={1.8} />
        {unreadCount > 0 ? <span className="notification-bell-badge">{formattedUnreadCount}</span> : null}
      </button>

      {realtimeMessage ? (
        <div className="notification-bell-toast" role="status">
          <strong>{realtimeMessage.title}</strong>
          {realtimeMessage.message ? <span>{realtimeMessage.message}</span> : null}
        </div>
      ) : null}

      {isOpen ? (
        <section className="notification-bell-panel" aria-label="Notifications">
          <header className="notification-bell-panel-header">
            <div>
              <h2>Notifications</h2>
              <span>{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</span>
            </div>
            <button disabled={unreadCount === 0 || markAllReadMutation.isPending} onClick={handleMarkAllRead} type="button">
              <IconCheck size={15} stroke={2} />
              Mark all read
            </button>
          </header>

          <div className="notification-bell-list">
            {notificationsQuery.isLoading || unreadCountQuery.isLoading ? (
              <div className="notification-bell-state">
                <IconLoader2 className="notification-bell-spin" size={18} stroke={1.8} />
                Loading notifications...
              </div>
            ) : null}

            {errorMessage ? <div className="notification-bell-state notification-bell-state-error">{errorMessage}</div> : null}

            {!notificationsQuery.isLoading && !errorMessage && notifications.length === 0 ? (
              <div className="notification-bell-state">No notifications yet.</div>
            ) : null}

            {notifications.map((notification) => (
              <button
                className={`notification-bell-item ${notification.isRead ? 'notification-bell-item-read' : ''}`}
                key={notification.notificationId}
                onClick={() => void handleNotificationClick(notification)}
                type="button"
              >
                <span className="notification-bell-item-dot" />
                <span className="notification-bell-item-body">
                  <strong>{notification.title}</strong>
                  {notification.message ? <span>{notification.message}</span> : null}
                  <small>{formatNotificationTime(notification.createdAt)}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function getNotificationTargetPath(notification: NotificationDto, role?: string) {
  const normalizedRole = normalizeRole(role);

  if (notification.referenceType === 'PROJECT_SCHEDULE') {
    if (normalizedRole === 'DESIGNER') {
      return notification.projectId ? `/designer/assigned-projects/${notification.projectId}` : '/designer/schedules';
    }

    if (normalizedRole === 'SALES') {
      return notification.projectId ? `/sales/assigned-projects/${notification.projectId}` : '/sales/schedules';
    }

    return notification.referenceId ? `/customer/schedules?scheduleId=${encodeURIComponent(notification.referenceId)}` : '/customer/schedules';
  }

  const projectId = notification.referenceType === 'PROJECT' ? notification.referenceId : notification.projectId;

  if (projectId) {
    if (normalizedRole === 'DESIGNER') {
      return `/designer/assigned-projects/${projectId}`;
    }

    if (normalizedRole === 'SALES') {
      return `/sales/assigned-projects/${projectId}`;
    }
  }

  if (normalizedRole === 'ADMIN') {
    return '/admin/dashbroad';
  }

  if (normalizedRole === 'DESIGNER') {
    return '/designer/assigned-projects';
  }

  if (normalizedRole === 'SALES') {
    return '/sales/assigned-projects';
  }

  return '/customer/projects';
}

function normalizeRole(role?: string) {
  if (!role) {
    return 'CUSTOMER';
  }

  const normalized = role.trim().toUpperCase();

  return normalized === 'SALE' ? 'SALES' : normalized;
}

function formatNotificationTime(value: string | null) {
  if (!value) {
    return 'Just now';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Just now';
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60_000));

  if (diffMinutes < 1) {
    return 'Just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
  });
}
