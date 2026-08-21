import {
  IconAlertCircle,
  IconArrowLeft,
  IconCircleCheck,
  IconClock,
  IconRefresh,
} from '@tabler/icons-react';
import { Link, useLocation } from 'react-router-dom';

import type { PaymentDetailDto, PaymentStatus, PaymentStatusByCodeDto } from '@/services/api/payments';
import { usePaymentDetail, usePaymentStatusByCode } from '@/services/queries';

import { resolvePayOsReturnLink } from './payOsReturnStore';
import './PaymentRedirectResultPage.css';

type PaymentRedirectMode = 'result' | 'cancel';
type RedirectUiState = 'success' | 'cancelled' | 'failed' | 'processing' | 'unknown';
type RedirectPayment = PaymentDetailDto | PaymentStatusByCodeDto;

export function PaymentResultPage() {
  return <PaymentRedirectResultPage mode="result" />;
}

export function PaymentCancelPage() {
  return <PaymentRedirectResultPage mode="cancel" />;
}

function PaymentRedirectResultPage({ mode }: Readonly<{ mode: PaymentRedirectMode }>) {
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const queryLookup = {
    orderCode: firstQueryValue(query, ['orderCode', 'order_code', 'ordercode']),
    paymentId: firstQueryValue(query, ['paymentId', 'payment_id']),
    paymentCode: firstQueryValue(query, ['paymentCode', 'payment_code']),
  };
  const storedLink = resolvePayOsReturnLink(queryLookup);
  const paymentId = queryLookup.paymentId ?? storedLink?.paymentId ?? null;
  const paymentCode = queryLookup.paymentCode ?? storedLink?.paymentCode ?? null;
  const paymentDetailQuery = usePaymentDetail(paymentId ?? undefined, { enabled: Boolean(paymentId) });
  const paymentStatusQuery = usePaymentStatusByCode(paymentCode ?? undefined, {
    enabled: Boolean(paymentCode) && !paymentId,
  });
  const payment = paymentDetailQuery.data ?? paymentStatusQuery.data ?? null;
  const providerStatus = firstQueryValue(query, ['status', 'code']);
  const providerCancel = firstQueryValue(query, ['cancel'])?.toLowerCase() === 'true';
  const normalizedStatus = normalizePaymentStatus(payment?.status);
  const uiState = resolveRedirectUiState({
    mode,
    providerCancel,
    providerStatus,
    status: normalizedStatus,
    payment,
  });
  const isLoading = paymentDetailQuery.isLoading || paymentStatusQuery.isLoading;
  const isFetching = paymentDetailQuery.isFetching || paymentStatusQuery.isFetching;
  const isError = paymentDetailQuery.isError || paymentStatusQuery.isError;
  const copy = getRedirectCopy(uiState, mode, Boolean(payment));
  const StatusIcon = getRedirectIcon(uiState);

  function handleRefresh() {
    if (paymentId) {
      void paymentDetailQuery.refetch();
    }

    if (!paymentId && paymentCode) {
      void paymentStatusQuery.refetch();
    }
  }

  return (
    <main className="payment-redirect-page">
      <section className={`payment-redirect-panel payment-redirect-${uiState}`}>
        <div className="payment-redirect-icon">
          <StatusIcon size={42} stroke={1.8} />
        </div>

        <div className="payment-redirect-copy">
          <p className="payment-redirect-eyebrow">PayOS Checkout</p>
          <h1>{isLoading ? 'Checking payment...' : copy.title}</h1>
          <p>{copy.description}</p>
        </div>

        <dl className="payment-redirect-details">
          <PaymentRedirectDetail label="Order Code" value={queryLookup.orderCode ?? storedLink?.orderCode} />
          <PaymentRedirectDetail label="Payment Code" value={payment?.paymentCode ?? paymentCode} />
          <PaymentRedirectDetail label="Status" value={normalizedStatus ? formatStatusLabel(normalizedStatus) : copy.statusLabel} />
          <PaymentRedirectDetail label="Paid Amount" value={formatMoney(payment?.paidAmount, getPaymentCurrency(payment))} />
          <PaymentRedirectDetail label="Remaining" value={formatMoney(payment?.remainingAmount, getPaymentCurrency(payment))} />
        </dl>

        {isError ? (
          <p className="payment-redirect-warning">
            Cannot load the latest payment status. Please sign in again or refresh after the backend webhook finishes.
          </p>
        ) : null}

        {!paymentId && !paymentCode ? (
          <p className="payment-redirect-warning">
            This browser cannot match the PayOS return to a saved payment yet. Please open your orders page and refresh the payment.
          </p>
        ) : null}

        <div className="payment-redirect-actions">
          <button disabled={isFetching || (!paymentId && !paymentCode)} type="button" onClick={handleRefresh}>
            <IconRefresh className={isFetching ? 'payment-redirect-spin' : undefined} size={16} stroke={2} />
            <span>{isFetching ? 'Refreshing...' : 'Refresh Status'}</span>
          </button>
          <Link to="/customer/orders">
            <IconArrowLeft size={16} stroke={2} />
            <span>Back to Orders</span>
          </Link>
          {getPaymentProjectId(payment) ? <Link to={`/customer/projects/${getPaymentProjectId(payment)}`}>Project Detail</Link> : null}
        </div>
      </section>
    </main>
  );
}

function PaymentRedirectDetail({ label, value }: Readonly<{ label: string; value?: string | number | null }>) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || '-'}</dd>
    </div>
  );
}

function firstQueryValue(query: URLSearchParams, keys: string[]) {
  for (const key of keys) {
    const value = query.get(key)?.trim();

    if (value) {
      return value;
    }
  }

  return null;
}

function resolveRedirectUiState(input: {
  mode: PaymentRedirectMode;
  providerCancel: boolean;
  providerStatus?: string | null;
  status?: PaymentStatus | null;
  payment: RedirectPayment | null;
}): RedirectUiState {
  if (input.status === 'PAID' || isFullyPaidByAmounts(input.payment)) {
    return 'success';
  }

  if (input.status === 'CANCELLED' || input.providerCancel || input.mode === 'cancel') {
    return 'cancelled';
  }

  if (input.status === 'FAILED' || input.status === 'EXPIRED') {
    return 'failed';
  }

  const providerStatus = input.providerStatus?.trim().toUpperCase();

  if (providerStatus === 'PAID' || providerStatus === 'SUCCESS' || providerStatus === '00') {
    return 'processing';
  }

  if (!input.payment) {
    return 'unknown';
  }

  return 'processing';
}

function getRedirectCopy(state: RedirectUiState, mode: PaymentRedirectMode, hasPayment: boolean) {
  if (state === 'success') {
    return {
      title: 'Payment completed',
      description: 'The backend has confirmed this payment. Your order status will update automatically.',
      statusLabel: 'Paid',
    };
  }

  if (state === 'cancelled') {
    return {
      title: 'Payment cancelled',
      description: 'The checkout was cancelled or returned without completion. You can create a new payment link when needed.',
      statusLabel: 'Cancelled',
    };
  }

  if (state === 'failed') {
    return {
      title: 'Payment failed',
      description: 'The payment provider did not complete this transaction. Please try again or choose another payment method.',
      statusLabel: 'Failed',
    };
  }

  if (state === 'unknown') {
    return {
      title: mode === 'cancel' ? 'Checkout cancelled' : 'Payment status unavailable',
      description: hasPayment
        ? 'We found the payment but are waiting for the latest backend status.'
        : 'We need a saved payment reference from this browser or a payment code from the redirect URL.',
      statusLabel: 'Unknown',
    };
  }

  return {
    title: 'Payment is processing',
    description: 'PayOS redirected back successfully, but the system is still waiting for backend confirmation.',
    statusLabel: 'Processing',
  };
}

function getRedirectIcon(state: RedirectUiState) {
  if (state === 'success') return IconCircleCheck;
  if (state === 'processing') return IconClock;

  return IconAlertCircle;
}

function isFullyPaidByAmounts(payment?: RedirectPayment | null) {
  if (!payment) return false;

  if (typeof payment.remainingAmount === 'number' && payment.remainingAmount <= 0) {
    return true;
  }

  return typeof payment.paidAmount === 'number' && payment.paidAmount >= payment.amount && payment.amount > 0;
}

function getPaymentCurrency(payment?: RedirectPayment | null) {
  if (payment && 'currency' in payment) {
    return payment.currency;
  }

  return 'VND';
}

function getPaymentProjectId(payment?: RedirectPayment | null) {
  if (payment && 'projectId' in payment) {
    return payment.projectId;
  }

  return null;
}

function normalizePaymentStatus(value: unknown): PaymentStatus | null {
  if (typeof value === 'string') {
    const status = value.trim().toUpperCase();

    return isPaymentStatus(status) ? status : null;
  }

  if (typeof value === 'number') {
    return paymentStatusByNumber[value] ?? null;
  }

  if (value && typeof value === 'object') {
    const candidate = value as { name?: unknown; value?: unknown; status?: unknown };

    return normalizePaymentStatus(candidate.name ?? candidate.value ?? candidate.status);
  }

  return null;
}

const paymentStatusByNumber: Record<number, PaymentStatus> = {
  0: 'PENDING',
  1: 'PROCESSING',
  2: 'PAID',
  3: 'FAILED',
  4: 'CANCELLED',
  5: 'EXPIRED',
  6: 'REFUNDED',
};

function isPaymentStatus(value: string): value is PaymentStatus {
  return value in paymentStatusLabels;
}

const paymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  PAID: 'Paid',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
  REFUNDED: 'Refunded',
};

function formatStatusLabel(value: PaymentStatus) {
  return paymentStatusLabels[value];
}

function formatMoney(value?: number | null, currency = 'VND') {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: currency || 'VND',
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}
