import { useEffect, useState } from 'react';

import { getPaymentServiceResultMessage, type PaymentDetailDto, type SePayVietQrResponseDto } from '@/services/api/payments';
import {
  useGenerateSePayVietQr,
  usePaymentDetail,
  usePaymentRealtime,
} from '@/services/queries';

import './PaymentCollectionPanel.css';

type PaymentCollectionPanelProps = {
  payment: PaymentDetailDto | null;
  onPaid?: () => void;
};

export function PaymentCollectionPanel({ onPaid, payment }: PaymentCollectionPanelProps) {
  const [qr, setQr] = useState<SePayVietQrResponseDto | null>(null);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const paymentDetailQuery = usePaymentDetail(payment?.paymentId, { enabled: Boolean(payment?.paymentId) });
  const generateQrMutation = useGenerateSePayVietQr();
  const activePayment = paymentDetailQuery.data ?? payment;
  const activeStatus = normalizePaymentStatus(activePayment?.status);
  const activeType = normalizePaymentType(activePayment?.paymentType);
  const isCollectable = isCollectablePaymentStatus(activeStatus);

  usePaymentRealtime({
    paymentId: activePayment?.paymentId,
    enabled: Boolean(activePayment?.paymentId),
    onPaymentUpdated: (payload) => {
      if (normalizePaymentStatus(payload.status) === 'PAID') {
        setMessage({ tone: 'success', text: 'Payment confirmed.' });
        onPaid?.();
      }
    },
  });

  useEffect(() => {
    setQr(null);
    setMessage(null);
  }, [payment?.paymentId]);

  if (!activePayment) {
    return null;
  }

  async function generateQr() {
    if (!activePayment) return;

    setMessage(null);

    try {
      const result = await generateQrMutation.mutateAsync(activePayment.paymentId);
      setQr(result);
    } catch (error) {
      setMessage({ tone: 'error', text: getPaymentServiceResultMessage(error) });
    }
  }

  return (
    <section className="payment-collection-panel">
      <header>
        <div>
          <span>Payment</span>
          <h3>{activePayment.paymentCode}</h3>
        </div>
        <strong className={`payment-collection-status payment-collection-status-${statusClass(activeStatus)}`}>
          {formatEnumLabel(activeStatus)}
        </strong>
      </header>

      {message ? <p className={`payment-collection-message payment-collection-message-${message.tone}`}>{message.text}</p> : null}

      <div className="payment-collection-grid">
        <PaymentValue label="Amount" value={formatMoney(activePayment.amount)} />
        <PaymentValue label="Paid" value={formatMoney(activePayment.paidAmount)} />
        <PaymentValue label="Remaining" value={formatMoney(activePayment.remainingAmount)} />
        <PaymentValue label="Type" value={formatEnumLabel(activeType)} />
      </div>

      {isCollectable ? (
        <div className="payment-collection-actions">
          <button disabled={generateQrMutation.isPending} type="button" onClick={() => void generateQr()}>
            {generateQrMutation.isPending ? 'Generating...' : 'Show SePay QR'}
          </button>
        </div>
      ) : (
        <p className="payment-collection-muted">This payment is not collectable at its current status.</p>
      )}

      {qr ? (
        <section className="payment-collection-qr">
          <img src={qr.vietQrUrl} alt={`VietQR for ${qr.paymentCode}`} />
          <div>
            <PaymentValue label="Bank" value={qr.bankCode} />
            <PaymentValue label="Account" value={qr.accountNo} />
            <PaymentValue label="Account Name" value={qr.accountName} />
            <PaymentValue label="Transfer Content" value={qr.transferContent} />
          </div>
        </section>
      ) : null}
    </section>
  );
}

function PaymentValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="payment-collection-value">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const paymentStatusByNumber: Record<number, string> = {
  0: 'PENDING',
  1: 'PROCESSING',
  2: 'PARTIALLY_PAID',
  3: 'PAID',
  4: 'FAILED',
  5: 'CANCELLED',
  6: 'EXPIRED',
  7: 'REFUNDED',
};

const paymentTypeByNumber: Record<number, string> = {
  0: 'PROJECT_START_FEE',
  1: 'DEPOSIT',
  2: 'REMAINING_PAYMENT',
  3: 'FULL_PAYMENT',
  4: 'REFUND',
  5: 'OTHER',
};

function statusClass(value?: string | null) {
  return (value ?? 'UNKNOWN').toLowerCase().replace(/_/g, '-');
}

function formatEnumLabel(value?: string | null) {
  if (!value) return '-';

  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function isCollectablePaymentStatus(status?: string | null) {
  return status === 'PENDING' || status === 'PROCESSING' || status === 'PARTIALLY_PAID';
}

function normalizePaymentStatus(value: unknown) {
  return normalizeEnumValue(value, paymentStatusByNumber, 'PENDING');
}

function normalizePaymentType(value: unknown) {
  return normalizeEnumValue(value, paymentTypeByNumber, 'OTHER');
}

function normalizeEnumValue(value: unknown, numberMap: Record<number, string>, fallback: string) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const numeric = Number(trimmed);

    if (trimmed && Number.isInteger(numeric) && numeric in numberMap) {
      return numberMap[numeric];
    }

    return trimmed ? trimmed.toUpperCase() : fallback;
  }

  if (typeof value === 'number' && Number.isInteger(value) && value in numberMap) {
    return numberMap[value];
  }

  if (value && typeof value === 'object') {
    const candidate = value as { name?: unknown; value?: unknown; status?: unknown };

    return normalizeEnumValue(candidate.name ?? candidate.value ?? candidate.status, numberMap, fallback);
  }

  return fallback;
}

function formatMoney(value?: number | null) {
  if (typeof value !== 'number') return '-';

  return `${new Intl.NumberFormat('vi-VN').format(value)} VND`;
}
