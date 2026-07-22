import { createContext, type PropsWithChildren, useContext, useEffect, useState } from 'react';

import type { RealtimeNotificationPayload } from '@/services/api/notifications';
import { useCurrentUser, useNotificationRealtime } from '@/services/queries';

const NotificationRealtimeContext = createContext<RealtimeNotificationPayload | null>(null);

export function NotificationRealtimeProvider({ children }: Readonly<PropsWithChildren>) {
  const { data: user } = useCurrentUser();
  const [realtimeMessage, setRealtimeMessage] = useState<RealtimeNotificationPayload | null>(null);

  useNotificationRealtime({
    enabled: Boolean(user),
    onInAppNotification: setRealtimeMessage,
    onRealtimeOnlyNotification: setRealtimeMessage,
  });

  useEffect(() => {
    if (!realtimeMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setRealtimeMessage(null), 4500);
    return () => window.clearTimeout(timeoutId);
  }, [realtimeMessage]);

  return <NotificationRealtimeContext.Provider value={realtimeMessage}>{children}</NotificationRealtimeContext.Provider>;
}

export function useRealtimeNotificationMessage() {
  return useContext(NotificationRealtimeContext);
}
