import { createContext, useContext } from 'react';

import type { RealtimeNotificationPayload } from '@/services/api/notifications';

export type RealtimeSyncContextValue = {
  acknowledgeInAppNotification: (notificationId: string) => void;
  lastInAppNotification: RealtimeNotificationPayload | null;
};

export const RealtimeSyncContext = createContext<RealtimeSyncContextValue>({
  acknowledgeInAppNotification: () => undefined,
  lastInAppNotification: null,
});

export function useRealtimeInAppNotification() {
  return useContext(RealtimeSyncContext).lastInAppNotification;
}

/** Clears the pending payload so remounting consumers do not replay the same toast. */
export function useAcknowledgeInAppNotification() {
  return useContext(RealtimeSyncContext).acknowledgeInAppNotification;
}
