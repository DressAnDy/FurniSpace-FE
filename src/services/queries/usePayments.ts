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
  const paymentIdRef = useRef(paymentId);
  const hubUrl = useMemo(() => getPaymentHubUrl(), []);

  useEffect(() => {
    onPaymentUpdatedRef.current = onPaymentUpdated;
  }, [onPaymentUpdated]);

  useEffect(() => {
    paymentIdRef.current = paymentId;
  }, [paymentId]);

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

    const joinPayment = async () => {
      if (connection.state !== signalR.HubConnectionState.Connected || !paymentIdRef.current) {
        return;
      }

      await connection.invoke('JoinPayment', paymentIdRef.current);
    };

    connection.on('payment.updated', (payload: PaymentUpdatedRealtimeDto) => {
      updatePaymentFromRealtime(queryClient, payload);
      onPaymentUpdatedRef.current?.(payload);
    });

    connection.onreconnected(() => {
      void joinPayment();
    });

    void connection.start().then(joinPayment).catch(() => undefined);

    return () => {
      const currentPaymentId = paymentIdRef.current;

      if (connection.state === signalR.HubConnectionState.Connected && currentPaymentId) {
        void connection.invoke('LeavePayment', currentPaymentId).catch(() => undefined);
      }

      connection.off('payment.updated');
      void connection.stop();
    };
  }, [enabled, hubUrl, paymentId, queryClient]);
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
