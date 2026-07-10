import { useEffect, useState } from 'react';

import { getPaymentServiceResultMessage, type PaymentDetailDto, type SePayVietQrResponseDto } from '@/services/api/payments';
import {
  useCreatePayOsPaymentLink,
  useGenerateSePayVietQr,
  usePaymentDetail,
  usePaymentRealtime,
  usePaymentTransactions,
} from '@/services/queries';

import './PaymentCollectionPanel.css';

type PaymentCollectionPanelProps = {
  payment: PaymentDetailDto | null;
  onPaid?: () => void;
  returnPath?: string;
};

export function PaymentCollectionPanel({ onPaid, payment, returnPath }: PaymentCollectionPanelProps) {
  const [qr, setQr] = useState<SePayVietQrResponseDto | null>(null);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const paymentDetailQuery = usePaymentDetail(payment?.paymentId, { enabled: Boolean(payment?.paymentId) });
  const transactionsQuery = usePaymentTransactions(payment?.paymentId, { enabled: Boolean(payment?.paymentId) });
  const generateQrMutation = useGenerateSePayVietQr();
  const payOsMutation = useCreatePayOsPaymentLink();
  const activePayment = paymentDetailQuery.data ?? payment;
  const isCollectable =
    activePayment?.status === 'PENDING' ||
    activePayment?.status === 'PROCESSING' ||
    activePayment?.status === 'PARTIALLY_PAID';

  usePaymentRealtime({
    paymentId: activePayment?.paymentId,
    enabled: Boolean(activePayment?.paymentId),
    onPaymentUpdated: (payload) => {
      if (payload.status === 'PAID') {
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

  async function openPayOs() {
    if (!activePayment) return;

    setMessage(null);

    try {
      const origin = window.location.origin;
      const targetPath = returnPath ?? `${window.location.pathname}${window.location.search}`;
      const result = await payOsMutation.mutateAsync({
        paymentId: activePayment.paymentId,
        returnUrl: `${origin}${targetPath}${targetPath.includes('?') ? '&' : '?'}paymentCode=${activePayment.paymentCode}`,
        cancelUrl: `${origin}${targetPath}${targetPath.includes('?') ? '&' : '?'}paymentCode=${activePayment.paymentCode}&cancelled=1`,
      });
      window.open(result.checkoutUrl, '_blank', 'noopener,noreferrer');
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
        <strong className={`payment-collection-status payment-collection-status-${statusClass(activePayment.status)}`}>
          {formatEnumLabel(activePayment.status ?? 'UNKNOWN')}
        </strong>
      </header>

      {message ? <p className={`payment-collection-message payment-collection-message-${message.tone}`}>{message.text}</p> : null}

      <div className="payment-collection-grid">
        <PaymentValue label="Amount" value={formatMoney(activePayment.amount)} />
        <PaymentValue label="Paid" value={formatMoney(activePayment.paidAmount)} />
        <PaymentValue label="Remaining" value={formatMoney(activePayment.remainingAmount)} />
        <PaymentValue label="Type" value={formatEnumLabel(activePayment.paymentType ?? 'UNKNOWN')} />
      </div>

      {isCollectable ? (
        <div className="payment-collection-actions">
          <button disabled={generateQrMutation.isPending} type="button" onClick={() => void generateQr()}>
            {generateQrMutation.isPending ? 'Generating...' : 'Show SePay QR'}
          </button>
          <button disabled={payOsMutation.isPending} type="button" onClick={() => void openPayOs()}>
            {payOsMutation.isPending ? 'Creating...' : 'Open PayOS'}
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

      {transactionsQuery.data?.items.length ? (
        <section className="payment-collection-transactions">
          <h4>Transactions</h4>
          {transactionsQuery.data.items.slice(0, 4).map((transaction) => (
            <article key={transaction.paymentTransactionId}>
              <span>{transaction.transactionCode}</span>
              <strong>{formatMoney(transaction.amount)}</strong>
              <em>{formatEnumLabel(transaction.status ?? 'UNKNOWN')}</em>
            </article>
          ))}
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

function statusClass(value?: string | null) {
  return (value ?? 'unknown').toLowerCase().replace(/_/g, '-');
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatMoney(value?: number | null) {
  if (typeof value !== 'number') return '-';

  return `${new Intl.NumberFormat('vi-VN').format(value)} VND`;
}
