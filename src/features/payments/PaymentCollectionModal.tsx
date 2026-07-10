import { IconCircleCheck, IconQrcode, IconRefresh, IconX } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';

import {
  getPaymentServiceResultMessage,
  type PaymentDetailDto,
  type SePayVietQrResponseDto,
} from '@/services/api/payments';
import {
  useGenerateSePayVietQr,
  usePaymentDetail,
  usePaymentRealtime,
  usePaymentTransactions,
} from '@/services/queries';

import './PaymentCollectionModal.css';

type PaymentCollectionModalProps = {
  payment: PaymentDetailDto | null;
  title?: string;
  completionTitle?: string;
  completionDescription?: string;
  continueLabel?: string;
  onClose: () => void;
  onContinue?: (payment: PaymentDetailDto) => void;
  onPaid?: (payment: PaymentDetailDto) => void;
};

export function PaymentCollectionModal({
  payment,
  title = 'Collect Payment',
  completionTitle = 'Payment completed',
  completionDescription = 'The payment has been confirmed. You can continue to the next step.',
  continueLabel = 'Continue',
  onClose,
  onContinue,
  onPaid,
}: PaymentCollectionModalProps) {
  const paymentId = payment?.paymentId;
  const [sePayQr, setSePayQr] = useState<SePayVietQrResponseDto | null>(null);
  const [message, setMessage] = useState('');
  const paymentQuery = usePaymentDetail(paymentId, { enabled: Boolean(paymentId) });
  const transactionsQuery = usePaymentTransactions(paymentId, { enabled: Boolean(paymentId) });
  const generateQrMutation = useGenerateSePayVietQr();
  const currentPayment = paymentQuery.data ?? payment;
  const isCollectable = Boolean(currentPayment && isCollectablePaymentStatus(currentPayment.status));
  const isPaid = currentPayment?.status === 'PAID';

  usePaymentRealtime({
    paymentId,
    enabled: Boolean(paymentId),
    onPaymentUpdated: (payload) => {
      setMessage(`Payment ${formatStatusLabel(payload.status)}. Latest paid amount: ${formatMoney(payload.paidAmount, currentPayment?.currency)}.`);

      if (payload.status === 'PAID') {
        void paymentQuery.refetch().then((result) => {
          if (result.data) {
            onPaid?.(result.data);
          }
        });
      }
    },
  });

  useEffect(() => {
    setSePayQr(null);
    setMessage('');
  }, [paymentId]);

  const transactions = useMemo(() => transactionsQuery.data?.items ?? [], [transactionsQuery.data?.items]);

  if (!currentPayment) {
    return null;
  }

  async function handleGenerateQr() {
    if (!paymentId) return;

    setMessage('');

    try {
      const result = await generateQrMutation.mutateAsync(paymentId);
      setSePayQr(result);
      setMessage('SePay VietQR is ready.');
    } catch (error) {
      setMessage(getPaymentServiceResultMessage(error));
    }
  }

  return (
    <div className="payment-modal-overlay">
      <section className="payment-modal" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title">
        <header className="payment-modal-header">
          <div>
            <h3 id="payment-modal-title">{title}</h3>
            <p>{currentPayment.paymentCode}</p>
          </div>
          <button aria-label="Close payment modal" type="button" onClick={onClose}>
            <IconX size={18} />
          </button>
        </header>

        <div className="payment-modal-status-row">
          <span className={`payment-status-badge payment-status-${(currentPayment.status ?? 'PENDING').toLowerCase()}`}>
            {formatStatusLabel(currentPayment.status)}
          </span>
          <button type="button" onClick={() => void paymentQuery.refetch()} disabled={paymentQuery.isFetching}>
            <IconRefresh size={16} />
            <span>{paymentQuery.isFetching ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>

        <div className="payment-summary-grid">
          <SummaryItem label="Amount" value={formatMoney(currentPayment.amount, currentPayment.currency)} />
          <SummaryItem label="Paid" value={formatMoney(currentPayment.paidAmount, currentPayment.currency)} />
          <SummaryItem label="Remaining" value={formatMoney(currentPayment.remainingAmount, currentPayment.currency)} />
          <SummaryItem label="Type" value={formatStatusLabel(currentPayment.paymentType)} />
        </div>

        {isPaid ? (
          <section className="payment-complete-panel">
            <IconCircleCheck size={44} />
            <div>
              <h4>{completionTitle}</h4>
              <p>{completionDescription}</p>
            </div>
            <button type="button" onClick={() => (onContinue ? onContinue(currentPayment) : onClose())}>
              {continueLabel}
            </button>
          </section>
        ) : null}

        {!isPaid && !isCollectable ? (
          <p className="payment-modal-note">This payment is not collectable in its current status.</p>
        ) : null}

        {!isPaid && isCollectable ? (
          <div className="payment-method-grid payment-method-grid-single">
            <section className="payment-method-panel">
              <div>
                <h4>SePay VietQR</h4>
                <p>Generate and show the transfer QR for the current remaining amount.</p>
              </div>
              <button type="button" onClick={handleGenerateQr} disabled={generateQrMutation.isPending}>
                <IconQrcode size={17} />
                <span>{generateQrMutation.isPending ? 'Generating...' : 'Generate QR'}</span>
              </button>
              {sePayQr ? (
                <div className="payment-qr-box">
                  <img src={sePayQr.vietQrUrl} alt={`VietQR for ${sePayQr.paymentCode}`} />
                  <dl>
                    <div>
                      <dt>Amount</dt>
                      <dd>{formatMoney(sePayQr.amount, currentPayment.currency)}</dd>
                    </div>
                    <div>
                      <dt>Content</dt>
                      <dd>{sePayQr.transferContent}</dd>
                    </div>
                    <div>
                      <dt>Account</dt>
                      <dd>{sePayQr.accountNo}</dd>
                    </div>
                  </dl>
                </div>
              ) : null}
            </section>
          </div>
        ) : null}

        {message ? <p className={message.toLowerCase().includes('ready') || message.toLowerCase().includes('paid') ? 'payment-modal-message' : 'payment-modal-message payment-modal-message-error'}>{message}</p> : null}

        <section className="payment-transactions">
          <h4>Transactions</h4>
          {transactionsQuery.isLoading ? <p>Loading transactions...</p> : null}
          {!transactionsQuery.isLoading && transactions.length === 0 ? <p>No transaction yet.</p> : null}
          {transactions.map((transaction) => (
            <article key={transaction.paymentTransactionId}>
              <div>
                <strong>{transaction.transactionCode}</strong>
                <span>{formatStatusLabel(transaction.paymentProvider)} - {formatStatusLabel(transaction.paymentMethod)}</span>
              </div>
              <div>
                <strong>{formatMoney(transaction.amount, transaction.currency)}</strong>
                <span>{formatStatusLabel(transaction.status)}</span>
              </div>
            </article>
          ))}
        </section>
      </section>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="payment-summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function isCollectablePaymentStatus(status?: string | null) {
  return status === 'PENDING' || status === 'PROCESSING' || status === 'PARTIALLY_PAID';
}

function formatMoney(value?: number | null, currency = 'VND') {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: currency || 'VND',
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatStatusLabel(value?: string | null) {
  if (!value) return '-';

  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
