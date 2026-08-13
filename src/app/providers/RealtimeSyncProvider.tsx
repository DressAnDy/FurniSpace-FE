import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { RealtimeNotificationPayload } from '@/services/api/notifications';
import { useCurrentUser, useNotificationRealtime, usePaymentRealtime } from '@/services/queries';

type RealtimeSyncContextValue = {
  lastInAppNotification: RealtimeNotificationPayload | null;
};

const RealtimeSyncContext = createContext<RealtimeSyncContextValue>({
  lastInAppNotification: null,
});

export function useRealtimeInAppNotification() {
  return useContext(RealtimeSyncContext).lastInAppNotification;
}

/**
 * Mounts Notification + Payment hubs once for the signed-in user.
 * NotificationsHub handles cross-role cache invalidation and the bell.
 * PaymentHub auto-joins user:{accountId}; JoinPayment remains optional on payment detail.
 */
export function RealtimeSyncProvider({ children }: { children: ReactNode }) {
  const currentUserQuery = useCurrentUser();
  const enabled = Boolean(currentUserQuery.data);
  const [lastInAppNotification, setLastInAppNotification] = useState<RealtimeNotificationPayload | null>(null);

  useNotificationRealtime({
    enabled,
    onInAppNotification: (payload) => {
      if (payload.notificationId) {
        setLastInAppNotification(payload);
      }
    },
  });

  usePaymentRealtime({ enabled });

  const value = useMemo(() => ({ lastInAppNotification }), [lastInAppNotification]);

  return <RealtimeSyncContext.Provider value={value}>{children}</RealtimeSyncContext.Provider>;
}
