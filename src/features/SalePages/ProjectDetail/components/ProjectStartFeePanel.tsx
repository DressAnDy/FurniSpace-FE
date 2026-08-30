import { useState } from 'react';
import { IconCash, IconSend } from '@tabler/icons-react';

import { getPaymentServiceResultMessage } from '@/services/api/payments';
import {
  useCreateProjectStartFeePayment,
  usePaymentDetail,
  useProjectStartFeeStatus,
} from '@/services/queries';
import { getDefaultPaymentExpiredAt } from '@/shared/utils/dateValidation';

type ProjectStartFeePanelProps = {
  projectId: string;
  enabled?: boolean;
};

const PROJECT_START_FEE_MIN_AMOUNT = 5_000;

export function ProjectStartFeePanel({ projectId, enabled = true }: ProjectStartFeePanelProps) {
  const [startFeeMessage, setStartFeeMessage] = useState('');
  const [startFeeAmount, setStartFeeAmount] = useState('');
  const [startFeeAmountError, setStartFeeAmountError] = useState<string | null>(null);
  const startFeeStatusQuery = useProjectStartFeeStatus(projectId, { enabled });
  const startFeeStatus = startFeeStatusQuery.data;
  const existingStartFeePaymentQuery = usePaymentDetail(startFeeStatus?.paymentId ?? undefined, {
    enabled: Boolean(startFeeStatus?.paymentId),
  });
  const existingStartFeePayment = existingStartFeePaymentQuery.data;
  const createStartFeePaymentMutation = useCreateProjectStartFeePayment();
  const isStartFeeBlocking = Boolean(startFeeStatus?.requiresProjectStartFee && !startFeeStatus.isEligibleForDesignerAssignment);
  const shouldShowPanel = enabled && (startFeeStatusQuery.isLoading || startFeeStatusQuery.isError || Boolean(startFeeStatus?.requiresProjectStartFee));

  async function handleCreateStartFeePayment() {
    setStartFeeMessage('');

    const amountError = getFeeAmountError(startFeeAmount, { required: true });
    if (amountError) {
      setStartFeeAmountError(amountError);
      return;
    }

    const amount = normalizePositiveAmount(startFeeAmount);
    if (!amount) {
      setStartFeeAmountError(`Fee amount must be at least ${PROJECT_START_FEE_MIN_AMOUNT.toLocaleString('en-US')}.`);
      return;
    }

    try {
      const payment = await createStartFeePaymentMutation.mutateAsync({
        projectId,
        amount,
        expiredAt: getDefaultPaymentExpiredAt(),
        note: 'Project start fee created before designer assignment.',
      });
      setStartFeeMessage(`Start fee request ${payment.paymentCode} was created and sent to the customer.`);
      setStartFeeAmount('');
      setStartFeeAmountError(null);
      void startFeeStatusQuery.refetch();
    } catch (error) {
      setStartFeeMessage(getPaymentServiceResultMessage(error));
    }
  }

  if (!shouldShowPanel) {
    return null;
  }

  return (
    <section className={isStartFeeBlocking ? 'project-detail-start-fee-card project-detail-start-fee-card-blocking' : 'project-detail-start-fee-card'}>
      <div className="project-detail-start-fee-copy">
        <span className="project-detail-start-fee-icon" aria-hidden="true">
          <IconCash size={18} stroke={1.8} />
        </span>
        <div>
          <div className="project-detail-start-fee-title-row">
            <h4>Project Start Fee</h4>
            <span className={`project-detail-start-fee-status project-detail-start-fee-status-${(startFeeStatus?.projectStartFeeStatus ?? (startFeeStatus?.isEligibleForDesignerAssignment ? 'PAID' : 'IDLE')).toLowerCase()}`}>
              {formatStatusLabel(startFeeStatus?.projectStartFeeStatus ?? (startFeeStatus?.isEligibleForDesignerAssignment ? 'PAID' : null))}
            </span>
          </div>
          <p>{getStartFeeCopy(startFeeStatusQuery.isLoading, startFeeStatusQuery.isError, startFeeStatus)}</p>
        </div>
      </div>
      {isStartFeeBlocking ? (
        <div className="project-detail-start-fee-actions">
          {startFeeStatus?.paymentId ? (
            <div className="project-detail-start-fee-existing">
              <strong>Existing request found</strong>
              <span>{existingStartFeePaymentQuery.isLoading ? 'Loading payment detail...' : formatExistingStartFee(existingStartFeePayment)}</span>
            </div>
          ) : (
            <div className="project-detail-start-fee-create">
              <label className={startFeeAmountError ? 'has-error' : undefined}>
                <span>Fee amount</span>
                <div className="project-detail-start-fee-field-row">
                  {startFeeAmountError ? <small className="project-detail-field-error">{startFeeAmountError}</small> : null}
                  <div className={`project-detail-start-fee-input-wrap${startFeeAmountError ? ' is-invalid' : ''}`}>
                    <input
                      aria-invalid={Boolean(startFeeAmountError)}
                      disabled={createStartFeePaymentMutation.isPending}
                      inputMode="decimal"
                      placeholder="e.g. 5000"
                      type="text"
                      value={startFeeAmount}
                      onChange={(event) => {
                        const nextValue = sanitizePositiveAmountInput(event.currentTarget.value);
                        setStartFeeAmount(nextValue);
                        setStartFeeAmountError(getFeeAmountError(nextValue));
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'e' || event.key === 'E' || event.key === '+' || event.key === '-') {
                          event.preventDefault();
                        }
                      }}
                    />
                    <em aria-hidden="true">VND</em>
                  </div>
                </div>
              </label>
              <button
                type="button"
                disabled={createStartFeePaymentMutation.isPending || !normalizePositiveAmount(startFeeAmount)}
                onClick={() => void handleCreateStartFeePayment()}
              >
                <IconSend size={15} stroke={1.9} />
                {createStartFeePaymentMutation.isPending ? 'Creating...' : 'Create Start Fee'}
              </button>
            </div>
          )}
        </div>
      ) : null}
      {startFeeMessage ? (
        <p className={`project-detail-form-message ${startFeeMessage.toLowerCase().includes('created') ? '' : 'project-detail-form-message-error'}`}>{startFeeMessage}</p>
      ) : null}
    </section>
  );
}

function getStartFeeCopy(
  isLoading: boolean,
  isError: boolean,
  status: ReturnType<typeof useProjectStartFeeStatus>['data'],
) {
  if (isLoading) return 'Checking whether this project needs a start fee before designer assignment.';
  if (isError) return 'Cannot load start fee status. You can retry by refreshing this project detail.';
  if (!status?.requiresProjectStartFee) return 'No start fee is required for this project.';
  if (status.isEligibleForDesignerAssignment) return 'Start fee is paid. Designer assignment can continue.';
  if (status.paymentId) return 'A start fee request already exists. Waiting for customer payment confirmation.';

  return 'Create the start fee payment before assigning a designer.';
}

function formatStatusLabel(value?: string | null) {
  if (!value) return 'Not created';

  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function sanitizePositiveAmountInput(value: string) {
  const cleaned = value.replace(/[^\d.]/g, '');
  const [whole = '', ...fractionParts] = cleaned.split('.');
  const fraction = fractionParts.join('').slice(0, 2);

  if (fractionParts.length === 0) {
    return whole;
  }

  return `${whole}.${fraction}`;
}

function getFeeAmountError(value: string, options?: { required?: boolean }) {
  const normalized = value.trim();
  if (!normalized) {
    return options?.required ? 'Fee amount is required.' : null;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return 'Fee amount must contain numbers only.';
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) {
    return `Fee amount must be at least ${PROJECT_START_FEE_MIN_AMOUNT.toLocaleString('en-US')}.`;
  }

  if (amount < PROJECT_START_FEE_MIN_AMOUNT) {
    return `Fee amount must be at least ${PROJECT_START_FEE_MIN_AMOUNT.toLocaleString('en-US')}.`;
  }

  return null;
}

function normalizePositiveAmount(value: string) {
  if (getFeeAmountError(value)) {
    return null;
  }

  const amount = Number(value.trim());

  return Number.isFinite(amount) && amount >= PROJECT_START_FEE_MIN_AMOUNT ? amount : null;
}

function formatDateOnly(value: string | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatExistingStartFee(payment?: { amount: number; currency: string; expiredAt?: string | null } | null) {
  if (!payment) return 'A collectable payment request already exists.';

  const amount = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: payment.currency || 'VND',
    maximumFractionDigits: 0,
  }).format(payment.amount);
  const dueDate = payment.expiredAt ? formatDateOnly(payment.expiredAt) : 'No due date';

  return `${amount} - Due ${dueDate}`;
}
