import { useEffect, useMemo, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createPayOsPaymentLink,
  createProjectStartFeePayment,
  generateSePayVietQr,
  getPaymentById,
  getPaymentHubUrl,
  getPayments,
  getPaymentStatusByCode,
  getPaymentTransactions,
  getProjectStartFeeStatus,
  type CreatePayOsPaymentLinkInput,
  type CreateProjectStartFeePaymentInput,
  type PaymentDetailDto,
  type PaymentListParams,
  type PaymentUpdatedRealtimeDto,
} from '@/services/api/payments';
import { getStoredAccessToken } from '@/services/api/tokenStore';

export const paymentQueryKeys = {
  all: ['payments'] as const,
  list: (params?: PaymentListParams) => ['payments', 'list', params] as const,
  detail: (paymentId: string) => ['payments', 'detail', paymentId] as const,
  transactions: (paymentId: string) => ['payments', 'transactions', paymentId] as const,
  statusByCode: (paymentCode: string) => ['payments', 'status-by-code', paymentCode] as const,
  projectStartFeeStatus: (projectId: string) => ['payments', 'project-start-fee-status', projectId] as const,
};

export function usePaymentDetail(paymentId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: paymentQueryKeys.detail(paymentId ?? ''),
    queryFn: () => getPaymentById(paymentId ?? ''),
    enabled: Boolean(paymentId) && (options?.enabled ?? true),
  });
}

export function usePayments(params?: PaymentListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: paymentQueryKeys.list(params),
    queryFn: () => getPayments(params),
    enabled: options?.enabled ?? true,
  });
}

export function usePaymentTransactions(paymentId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: paymentQueryKeys.transactions(paymentId ?? ''),
    queryFn: () => getPaymentTransactions(paymentId ?? ''),
    enabled: Boolean(paymentId) && (options?.enabled ?? true),
  });
}

export function usePaymentStatusByCode(paymentCode?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: paymentQueryKeys.statusByCode(paymentCode ?? ''),
    queryFn: () => getPaymentStatusByCode(paymentCode ?? ''),
    enabled: Boolean(paymentCode) && (options?.enabled ?? true),
  });
}

export function useProjectStartFeeStatus(projectId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: paymentQueryKeys.projectStartFeeStatus(projectId ?? ''),
    queryFn: () => getProjectStartFeeStatus(projectId ?? ''),
    enabled: Boolean(projectId) && (options?.enabled ?? true),
  });
}

export function useGenerateSePayVietQr() {
  return useMutation({
    mutationFn: (paymentId: string) => generateSePayVietQr(paymentId),
  });
}

export function useCreatePayOsPaymentLink() {
  return useMutation({
    mutationFn: (input: CreatePayOsPaymentLinkInput) => createPayOsPaymentLink(input),
  });
}

export function useCreateProjectStartFeePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProjectStartFeePaymentInput) => createProjectStartFeePayment(input),
    onSuccess: (payment) => {
      void queryClient.invalidateQueries({ queryKey: paymentQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: paymentQueryKeys.detail(payment.paymentId) });
      void queryClient.invalidateQueries({ queryKey: paymentQueryKeys.projectStartFeeStatus(payment.projectId) });
      void queryClient.invalidateQueries({ queryKey: ['projects', 'detail', payment.projectId] });
    },
  });
}

export function usePaymentRealtime(input: {
  paymentId?: string | null;
  enabled?: boolean;
  onPaymentUpdated?: (payload: PaymentUpdatedRealtimeDto) => void;
} = {}) {
  const { enabled = true, onPaymentUpdated, paymentId } = input;
  const queryClient = useQueryClient();
  const onPaymentUpdatedRef = useRef(onPaymentUpdated);
  const hubUrl = useMemo(() => getPaymentHubUrl(), []);

  useEffect(() => {
    onPaymentUpdatedRef.current = onPaymentUpdated;
  }, [onPaymentUpdated]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const listener: PaymentRealtimeListener = (payload) => {
      onPaymentUpdatedRef.current?.(payload);
    };

    const hub = acquirePaymentHub(hubUrl, queryClient);
    hub.listeners.add(listener);
    void joinSharedPayment(hub, paymentId);

    return () => {
      hub.listeners.delete(listener);
      void leaveSharedPayment(hub, paymentId);
      releasePaymentHub(hub);
    };
  }, [enabled, hubUrl, paymentId, queryClient]);
}

type PaymentRealtimeListener = (payload: PaymentUpdatedRealtimeDto) => void;

type SharedPaymentHub = {
  connection: signalR.HubConnection;
  holderCount: number;
  joinedPaymentIds: Map<string, number>;
  listeners: Set<PaymentRealtimeListener>;
  startPromise: Promise<void>;
};

let sharedPaymentHub: SharedPaymentHub | null = null;

function acquirePaymentHub(hubUrl: string, queryClient: ReturnType<typeof useQueryClient>) {
  if (sharedPaymentHub) {
    sharedPaymentHub.holderCount += 1;
    return sharedPaymentHub;
  }

  const connection = new signalR.HubConnectionBuilder()
    .withUrl(hubUrl, {
      accessTokenFactory: () => getStoredAccessToken() ?? '',
      withCredentials: true,
    })
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Warning)
    .build();

  const listeners = new Set<PaymentRealtimeListener>();

  connection.on('payment.updated', (payload: PaymentUpdatedRealtimeDto) => {
    updatePaymentFromRealtime(queryClient, payload);
    listeners.forEach((listener) => listener(payload));
  });

  connection.onreconnected(() => {
    if (!sharedPaymentHub) {
      return;
    }

    for (const joinedPaymentId of sharedPaymentHub.joinedPaymentIds.keys()) {
      void connection.invoke('JoinPayment', joinedPaymentId).catch(() => undefined);
    }
  });

  sharedPaymentHub = {
    connection,
    holderCount: 1,
    joinedPaymentIds: new Map(),
    listeners,
    startPromise: connection.start().catch(() => undefined),
  };

  return sharedPaymentHub;
}

function releasePaymentHub(hub: SharedPaymentHub) {
  hub.holderCount -= 1;

  if (hub.holderCount > 0 || sharedPaymentHub !== hub) {
    return;
  }

  sharedPaymentHub = null;
  hub.connection.off('payment.updated');
  void hub.startPromise.finally(() => {
    void hub.connection.stop();
  });
}

async function joinSharedPayment(hub: SharedPaymentHub, paymentId?: string | null) {
  if (!paymentId) {
    return;
  }

  const nextCount = (hub.joinedPaymentIds.get(paymentId) ?? 0) + 1;
  hub.joinedPaymentIds.set(paymentId, nextCount);

  if (nextCount > 1) {
    return;
  }

  await hub.startPromise;

  if (hub.connection.state === signalR.HubConnectionState.Connected) {
    await hub.connection.invoke('JoinPayment', paymentId).catch(() => undefined);
  }
}

async function leaveSharedPayment(hub: SharedPaymentHub, paymentId?: string | null) {
  if (!paymentId) {
    return;
  }

  const currentCount = hub.joinedPaymentIds.get(paymentId) ?? 0;

  if (currentCount <= 1) {
    hub.joinedPaymentIds.delete(paymentId);

    if (hub.connection.state === signalR.HubConnectionState.Connected) {
      await hub.connection.invoke('LeavePayment', paymentId).catch(() => undefined);
    }

    return;
  }

  hub.joinedPaymentIds.set(paymentId, currentCount - 1);
}

function updatePaymentFromRealtime(queryClient: ReturnType<typeof useQueryClient>, payload: PaymentUpdatedRealtimeDto) {
  queryClient.setQueryData<PaymentDetailDto>(paymentQueryKeys.detail(payload.paymentId), (current) =>
    current
      ? {
          ...current,
          status: payload.status,
          paidAmount: payload.paidAmount,
          remainingAmount: payload.remainingAmount,
          paidAt: payload.paidAt ?? current.paidAt,
          updatedAt: payload.occurredAt,
        }
      : current,
  );

  void queryClient.invalidateQueries({ queryKey: paymentQueryKeys.transactions(payload.paymentId) });
  void queryClient.invalidateQueries({ queryKey: paymentQueryKeys.all });
  void queryClient.invalidateQueries({ queryKey: paymentQueryKeys.projectStartFeeStatus(payload.projectId) });
  void queryClient.invalidateQueries({ queryKey: ['orders'] });
  void queryClient.invalidateQueries({ queryKey: ['projects', 'detail', payload.projectId] });
}
