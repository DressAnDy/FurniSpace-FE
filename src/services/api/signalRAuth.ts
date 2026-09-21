import type { HubConnection, IRetryPolicy, RetryContext } from '@microsoft/signalr';
import { HubConnectionState } from '@microsoft/signalr';

import { refresh } from './auth';
import { getStoredAccessToken } from './tokenStore';

/** Temporary: keep SignalR alive after idle / expired access token. */
const TOKEN_EXPIRY_SKEW_MS = 60_000;

let refreshInFlight: Promise<string | null> | null = null;

/**
 * Used by SignalR negotiate / reconnect.
 * Refreshes the access token when missing, unreadable, or near expiry.
 */
export async function getSignalRAccessToken(): Promise<string> {
  const existing = getStoredAccessToken();

  if (!existing) {
    return '';
  }

  if (!isAccessTokenExpiredOrNearExpiry(existing)) {
    return existing;
  }

  if (!refreshInFlight) {
    refreshInFlight = refresh()
      .then(() => getStoredAccessToken())
      .catch(() => getStoredAccessToken())
      .finally(() => {
        refreshInFlight = null;
      });
  }

  return (await refreshInFlight) ?? '';
}

export const signalRHttpConnectionOptions = {
  accessTokenFactory: getSignalRAccessToken,
  withCredentials: true,
} as const;

/**
 * Default SignalR policy stops after 4 attempts.
 * Keep retrying forever while the page stays open.
 */
export const infiniteSignalRRetryPolicy: IRetryPolicy = {
  nextRetryDelayInMilliseconds(retryContext: RetryContext) {
    if (retryContext.previousRetryCount === 0) {
      return 0;
    }

    if (retryContext.previousRetryCount === 1) {
      return 2_000;
    }

    if (retryContext.previousRetryCount === 2) {
      return 10_000;
    }

    return 30_000;
  },
};

/**
 * Restart if the hub landed in Disconnected (e.g. after stop/error),
 * and retry when the tab becomes visible again.
 */
export function attachSignalRRecovery(
  connection: HubConnection,
  isDisposed: () => boolean,
  onRestarted?: () => void,
) {
  const ensureConnected = () => {
    if (isDisposed() || connection.state !== HubConnectionState.Disconnected) {
      return;
    }

    void connection
      .start()
      .then(() => {
        if (!isDisposed()) {
          onRestarted?.();
        }
      })
      .catch(() => undefined);
  };

  connection.onclose(() => {
    window.setTimeout(ensureConnected, 1_000);
  });

  const onVisibleOrFocus = () => {
    if (document.visibilityState === 'hidden') {
      return;
    }

    ensureConnected();
  };

  document.addEventListener('visibilitychange', onVisibleOrFocus);
  window.addEventListener('focus', onVisibleOrFocus);

  return () => {
    document.removeEventListener('visibilitychange', onVisibleOrFocus);
    window.removeEventListener('focus', onVisibleOrFocus);
  };
}

function isAccessTokenExpiredOrNearExpiry(token: string) {
  try {
    const payloadSegment = token.split('.')[1];

    if (!payloadSegment) {
      return true;
    }

    const payload = JSON.parse(decodeJwtPayload(payloadSegment)) as { exp?: unknown };

    if (typeof payload.exp !== 'number') {
      return true;
    }

    return payload.exp * 1000 <= Date.now() + TOKEN_EXPIRY_SKEW_MS;
  } catch {
    return true;
  }
}

function decodeJwtPayload(segment: string) {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

  return window.atob(padded);
}
