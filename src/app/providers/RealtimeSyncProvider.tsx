import { useCallback, useMemo, useState, type ReactNode } from 'react';

import { RealtimeSyncContext } from '@/app/providers/realtimeSyncContext';
import type { RealtimeNotificationPayload } from '@/services/api/notifications';
import { useCurrentUser, useNotificationRealtime, usePaymentRealtime } from '@/services/queries';

/**
 * Mounts Notification + Payment hubs once for the signed-in user.
 * NotificationsHub handles cross-role cache invalidation and the bell.
 * PaymentHub auto-joins user:{accountId}; JoinPayment remains optional on payment detail.
 */
export function RealtimeSyncProvider({ children }: Readonly<{ children: ReactNode }>) {
  const currentUserQuery = useCurrentUser();
  const enabled = Boolean(currentUserQuery.data);
  const [lastInAppNotification, setLastInAppNotification] = useState<RealtimeNotificationPayload | null>(null);

  const handleInAppNotification = useCallback((payload: RealtimeNotificationPayload) => {
    if (payload.notificationId) {
      setLastInAppNotification(payload);
    }
  }, []);

  useNotificationRealtime({
    enabled,
    onInAppNotification: handleInAppNotification,
  });

  usePaymentRealtime({ enabled });

  const acknowledgeInAppNotification = useCallback((notificationId: string) => {
    setLastInAppNotification((current) => (current?.notificationId === notificationId ? null : current));
  }, []);

  const value = useMemo(
    () => ({ acknowledgeInAppNotification, lastInAppNotification }),
    [acknowledgeInAppNotification, lastInAppNotification],
  );

  return <RealtimeSyncContext.Provider value={value}>{children}</RealtimeSyncContext.Provider>;
}
