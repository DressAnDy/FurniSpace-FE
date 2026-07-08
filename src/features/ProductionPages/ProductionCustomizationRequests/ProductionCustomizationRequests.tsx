import { FormEvent, useEffect, useState } from 'react';
import {
  IconAlertTriangle,
  IconClipboardCheck,
  IconClock,
  IconCurrencyDollar,
  IconSearch,
} from '@tabler/icons-react';
import { useSearchParams } from 'react-router-dom';

import { ProductionLayout } from '@/features/ProductionPages/productioncomponents';
import {
  getCustomizationRequestServiceResultMessage,
  type CustomizationRequestDetailDto,
  type CustomizationStatus,
  type ProductionCustomizationRequestQueueItemDto,
  type ProductionReviewResult,
} from '@/services/api/customizationRequests';
import {
  useCustomizationRequestDetail,
  useProductionCustomizationRequests,
  useProductionReviewCustomizationRequest,
} from '@/services/queries';

import './ProductionCustomizationRequests.css';

type ReviewFormState = {
  additionalCostReason: string;
  estimatedAdditionalCost: string;
  estimatedProductionDays: string;
  feasibilityNote: string;
  materialAvailable: boolean;
  productionRiskNote: string;
  result: ProductionReviewResult;
};

const initialReviewForm: ReviewFormState = {
  additionalCostReason: '',
  estimatedAdditionalCost: '0',
  estimatedProductionDays: '',
  feasibilityNote: '',
  materialAvailable: true,
  productionRiskNote: '',
  result: 'FEASIBLE',
};

const queueStatusFilters: Array<{ label: string; value: CustomizationStatus }> = [
  { label: 'Production Review', value: 'PRODUCTION_REVIEWING' },
  { label: 'Waiting Customer', value: 'WAITING_FOR_CUSTOMER_FINAL_APPROVAL' },
  { label: 'Not Feasible', value: 'NOT_FEASIBLE' },
  { label: 'Accepted', value: 'ACCEPTED' },
];

const materialFilters: Array<{ label: string; value: boolean | null }> = [
  { label: 'All Material', value: null },
  { label: 'Available', value: true },
  { label: 'Unavailable', value: false },
];

export function ProductionCustomizationRequests() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestIdFromUrl = searchParams.get('requestId') ?? '';
  const statusFromUrl = normalizeStatus(searchParams.get('status')) ?? 'PRODUCTION_REVIEWING';
  const [requestIdInput, setRequestIdInput] = useState(requestIdFromUrl);
  const [activeRequestId, setActiveRequestId] = useState(requestIdFromUrl);
  const [statusFilter, setStatusFilter] = useState<CustomizationStatus>(statusFromUrl);
  const [materialFilter, setMaterialFilter] = useState<boolean | null>(null);
  const [reviewForm, setReviewForm] = useState<ReviewFormState>(initialReviewForm);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const queueQuery = useProductionCustomizationRequests({ status: statusFilter, materialAvailable: materialFilter, page: 1, pageSize: 50 });
  const requestQuery = useCustomizationRequestDetail(activeRequestId, { enabled: Boolean(activeRequestId) });
  const productionReviewMutation = useProductionReviewCustomizationRequest();
  const requests = queueQuery.data?.items ?? [];
  const request = requestQuery.data ?? null;

  useEffect(() => {
    if (requestIdFromUrl && requestIdFromUrl !== activeRequestId) {
      setActiveRequestId(requestIdFromUrl);
      setRequestIdInput(requestIdFromUrl);
      setReviewForm(initialReviewForm);
      setMessage(null);
    }
  }, [activeRequestId, requestIdFromUrl]);

  useEffect(() => {
    if (!request || request.status !== 'PRODUCTION_REVIEWING') {
      return;
    }

    setReviewForm({
      additionalCostReason: request.additionalCostReason ?? '',
      estimatedAdditionalCost: typeof request.estimatedAdditionalCost === 'number' ? String(request.estimatedAdditionalCost) : '0',
      estimatedProductionDays: typeof request.estimatedProductionDays === 'number' ? String(request.estimatedProductionDays) : '',
      feasibilityNote: request.feasibilityNote ?? '',
      materialAvailable: request.materialAvailable ?? true,
      productionRiskNote: request.productionRiskNote ?? '',
      result: 'FEASIBLE',
    });
  }, [request]);

  function loadRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedRequestId = requestIdInput.trim();

    if (!trimmedRequestId) {
      setMessage({ tone: 'error', text: 'Customization request ID is required.' });
      return;
    }

    setSearchParams(getProductionSearchParams(trimmedRequestId, statusFilter));
    setActiveRequestId(trimmedRequestId);
    setReviewForm(initialReviewForm);
    setMessage(null);
  }

  function selectQueueRequest(customizationRequestId: string) {
    setSearchParams(getProductionSearchParams(customizationRequestId, statusFilter));
    setActiveRequestId(customizationRequestId);
    setRequestIdInput(customizationRequestId);
    setReviewForm(initialReviewForm);
    setMessage(null);
  }

  function changeStatusFilter(status: CustomizationStatus) {
    setStatusFilter(status);
    setSearchParams(getProductionSearchParams(activeRequestId, status));
  }

  async function submitProductionReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!request) return;

    const validationMessage = validateProductionReview(reviewForm);

    if (validationMessage) {
      setMessage({ tone: 'error', text: validationMessage });
      return;
    }

    setMessage(null);

    try {
      await productionReviewMutation.mutateAsync({
        customizationRequestId: request.customizationRequestId,
        result: reviewForm.result,
        materialAvailable: reviewForm.result === 'FEASIBLE' ? true : reviewForm.materialAvailable,
        estimatedProductionDays: reviewForm.result === 'FEASIBLE' ? normalizeNumber(reviewForm.estimatedProductionDays) : null,
        estimatedAdditionalCost: reviewForm.result === 'FEASIBLE' ? normalizeNumber(reviewForm.estimatedAdditionalCost) ?? 0 : null,
        additionalCostReason: reviewForm.additionalCostReason,
        feasibilityNote: reviewForm.feasibilityNote,
        productionRiskNote: reviewForm.productionRiskNote,
      });
      setReviewForm(initialReviewForm);
      setMessage({
        tone: 'success',
        text: reviewForm.result === 'FEASIBLE'
          ? 'Production review submitted. Customer can now approve the final customization cost.'
          : 'Production review submitted as not feasible.',
      });
      void requestQuery.refetch();
      void queueQuery.refetch();
    } catch (error) {
      setMessage({ tone: 'error', text: getCustomizationRequestServiceResultMessage(error) });
    }
  }

  return (
    <ProductionLayout activeLabel="Customization Requests" searchPlaceholder="Search production requests...">
      <section className="production-page-heading">
        <div>
          <span>Production Workspace</span>
          <h2>Customization Requests</h2>
          <p>Production reviews item-level customization requests after designer handoff and sends feasibility back to customer approval.</p>
        </div>
      </section>

      <section className="production-controls-card">
        <div className="production-filter-list" aria-label="Production request status filter">
          {queueStatusFilters.map((filter) => (
            <button
              className={statusFilter === filter.value ? 'is-active' : ''}
              key={filter.label}
              type="button"
              onClick={() => changeStatusFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="production-filter-list production-filter-list-secondary" aria-label="Production material availability filter">
          {materialFilters.map((filter) => (
            <button
              className={materialFilter === filter.value ? 'is-active' : ''}
              key={filter.label}
              type="button"
              onClick={() => setMaterialFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <form onSubmit={loadRequest}>
          <label>
            <span>Customization Request ID</span>
            <input
              value={requestIdInput}
              placeholder="Paste customizationRequestId from notification or handoff"
              onChange={(event) => setRequestIdInput(event.target.value)}
            />
          </label>
          <button type="submit">
            <IconSearch size={16} />
            Load Request
          </button>
        </form>
      </section>

      {message ? <section className={`production-message production-message-${message.tone}`}>{message.text}</section> : null}
      {queueQuery.isError ? (
        <section className="production-message production-message-error">{getCustomizationRequestServiceResultMessage(queueQuery.error)}</section>
      ) : null}
      {requestQuery.isError ? (
        <section className="production-message production-message-error">{getCustomizationRequestServiceResultMessage(requestQuery.error)}</section>
      ) : null}

      <section className="production-metrics-grid">
        <MetricCard icon={IconClipboardCheck} label="Queue" value={String(requests.length)} />
        <MetricCard icon={IconClock} label="Pending Review" value={String(countByStatus(requests, 'PRODUCTION_REVIEWING'))} />
        <MetricCard icon={IconCurrencyDollar} label="Waiting Customer" value={String(countByStatus(requests, 'WAITING_FOR_CUSTOMER_FINAL_APPROVAL'))} />
        <MetricCard icon={IconAlertTriangle} label="Not Feasible" value={String(countByStatus(requests, 'NOT_FEASIBLE'))} />
      </section>

      <section className="production-requests-layout">
        <article className="production-card">
          <header>
            <h3>Review Queue</h3>
            <p>
              Loaded from production queue API. Showing {requests.length} of {queueQuery.data?.total ?? requests.length} request(s).
            </p>
          </header>
          {queueQuery.isLoading ? <p className="production-muted">Loading production queue...</p> : null}
          {!queueQuery.isLoading && requests.length === 0 ? <p className="production-muted">No customization requests found for this filter.</p> : null}
          <div className="production-request-list">
            {requests.map((queueRequest) => (
              <QueueRequestButton
                isActive={activeRequestId === queueRequest.customizationRequestId}
                key={queueRequest.customizationRequestId}
                request={queueRequest}
                onSelect={selectQueueRequest}
              />
            ))}
          </div>
        </article>

        <article className="production-card production-review-card">
          <header>
            <h3>Feasibility Review</h3>
            <p>Production can submit a review only while the request status is Production Reviewing.</p>
          </header>

          {!activeRequestId ? <p className="production-muted">Paste a customization request ID to start reviewing.</p> : null}
          {requestQuery.isLoading ? <p className="production-muted">Loading customization request detail...</p> : null}

          {request ? (
            <>
              <RequestSummary request={request} />

              {request.status === 'PRODUCTION_REVIEWING' ? (
                <form className="production-review-form" onSubmit={submitProductionReview}>
                  <label>
                    <span>Review Result</span>
                    <select
                      value={reviewForm.result}
                      onChange={(event) =>
                        setReviewForm((current) => ({
                          ...current,
                          materialAvailable: event.target.value === 'FEASIBLE',
                          result: event.target.value as ProductionReviewResult,
                        }))
                      }
                    >
                      <option value="FEASIBLE">Feasible</option>
                      <option value="NOT_FEASIBLE">Not feasible</option>
                    </select>
                  </label>

                  <label className="production-check-field">
                    <input
                      checked={reviewForm.materialAvailable}
                      disabled={reviewForm.result === 'FEASIBLE'}
                      type="checkbox"
                      onChange={(event) => setReviewForm((current) => ({ ...current, materialAvailable: event.target.checked }))}
                    />
                    <span>Material available</span>
                  </label>

                  <div className="production-review-grid">
                    <label>
                      <span>Production Days</span>
                      <input
                        min="1"
                        type="number"
                        value={reviewForm.estimatedProductionDays}
                        disabled={reviewForm.result === 'NOT_FEASIBLE'}
                        onChange={(event) => setReviewForm((current) => ({ ...current, estimatedProductionDays: event.target.value }))}
                      />
                    </label>
                    <label>
                      <span>Additional Cost</span>
                      <input
                        min="0"
                        type="number"
                        value={reviewForm.estimatedAdditionalCost}
                        disabled={reviewForm.result === 'NOT_FEASIBLE'}
                        onChange={(event) => setReviewForm((current) => ({ ...current, estimatedAdditionalCost: event.target.value }))}
                      />
                    </label>
                  </div>

                  <label>
                    <span>Additional Cost Reason</span>
                    <textarea
                      rows={3}
                      value={reviewForm.additionalCostReason}
                      disabled={reviewForm.result === 'NOT_FEASIBLE'}
                      onChange={(event) => setReviewForm((current) => ({ ...current, additionalCostReason: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Feasibility Note</span>
                    <textarea
                      rows={4}
                      value={reviewForm.feasibilityNote}
                      onChange={(event) => setReviewForm((current) => ({ ...current, feasibilityNote: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Production Risk Note</span>
                    <textarea
                      rows={4}
                      value={reviewForm.productionRiskNote}
                      onChange={(event) => setReviewForm((current) => ({ ...current, productionRiskNote: event.target.value }))}
                    />
                  </label>

                  <button disabled={productionReviewMutation.isPending} type="submit">
                    {productionReviewMutation.isPending ? 'Submitting...' : 'Submit Production Review'}
                  </button>
                </form>
              ) : (
                <p className="production-muted">This customization request is read-only for production at its current status.</p>
              )}
            </>
          ) : null}
        </article>
      </section>
    </ProductionLayout>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof IconClipboardCheck; label: string; value: string }) {
  return (
    <article className="production-metric-card">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <Icon size={24} />
    </article>
  );
}

function QueueRequestButton({
  isActive,
  onSelect,
  request,
}: {
  isActive: boolean;
  onSelect: (customizationRequestId: string) => void;
  request: ProductionCustomizationRequestQueueItemDto;
}) {
  return (
    <button className={isActive ? 'is-active' : ''} type="button" onClick={() => onSelect(request.customizationRequestId)}>
      <strong>{request.requestTitle}</strong>
      <span className={`production-status production-status-${toCssStatus(request.status)}`}>{formatEnumLabel(request.status ?? 'UNKNOWN')}</span>
      <small>{request.project?.projectName ?? request.projectId}</small>
      <small>{request.proposal?.proposalName ?? request.proposalId}</small>
      <small>{request.proposalItem?.itemName ?? `Proposal item ${request.proposalItemId}`}</small>
      <p>{request.designerSpecNote || request.requestedChangeNote || request.requestDescription || 'No note provided.'}</p>
    </button>
  );
}

function RequestSummary({ request }: { request: CustomizationRequestDetailDto }) {
  return (
    <section className="production-request-summary">
      <div>
        <span>Request</span>
        <strong>{request.requestTitle}</strong>
      </div>
      <div>
        <span>Status</span>
        <strong>{formatEnumLabel(request.status ?? 'UNKNOWN')}</strong>
      </div>
      <div>
        <span>Item</span>
        <strong>{request.proposalItem?.itemName ?? request.proposalItemId}</strong>
      </div>
      <div>
        <span>Original Material / Color</span>
        <strong>{request.proposalItem ? `${request.proposalItem.material ?? '-'} / ${request.proposalItem.color ?? '-'}` : '-'}</strong>
      </div>
      <div>
        <span>Requested Material</span>
        <strong>{request.requestedMaterial ?? '-'}</strong>
      </div>
      <div>
        <span>Requested Color</span>
        <strong>{request.requestedColor ?? '-'}</strong>
      </div>
      <div>
        <span>Requested Dimensions</span>
        <strong>{formatDimensions(request.requestedWidth, request.requestedHeight, request.requestedDepth)}</strong>
      </div>
      <div>
        <span>Designer Spec</span>
        <strong>{request.designerSpecNote ?? '-'}</strong>
      </div>
      <div className="production-request-summary-wide">
        <span>Customer Note</span>
        <strong>{request.requestedChangeNote || request.requestDescription || '-'}</strong>
      </div>
    </section>
  );
}

function validateProductionReview(form: ReviewFormState) {
  const estimatedAdditionalCost = normalizeNumber(form.estimatedAdditionalCost);

  if (form.result === 'NOT_FEASIBLE') {
    return form.materialAvailable ? 'Material available cannot be true when result is Not Feasible.' : null;
  }

  if (!form.materialAvailable) return 'Material must be available for a feasible result.';
  if (!normalizeNumber(form.estimatedProductionDays)) return 'Estimated production days is required for a feasible result.';
  if (estimatedAdditionalCost === null) return 'Estimated additional cost is required for a feasible result.';
  if (estimatedAdditionalCost > 0 && !form.additionalCostReason.trim()) return 'Additional cost reason is required when cost is greater than 0.';

  return null;
}

function normalizeNumber(value: string) {
  if (!value.trim()) return null;
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDimensions(width?: number | null, height?: number | null, depth?: number | null) {
  const values = [
    width ? `W ${width}` : null,
    height ? `H ${height}` : null,
    depth ? `D ${depth}` : null,
  ].filter(Boolean);

  return values.length > 0 ? `${values.join(' x ')} cm` : '-';
}

function formatMoney(value?: number | null) {
  if (typeof value !== 'number') return '-';

  return `${new Intl.NumberFormat('vi-VN').format(value)} VND`;
}

function formatNullableNumber(value?: number | null) {
  return typeof value === 'number' ? String(value) : '-';
}

function formatMaterial(value?: boolean | null) {
  if (typeof value !== 'boolean') return '-';

  return value ? 'Available' : 'Unavailable';
}

function normalizeStatus(value: string | null): CustomizationStatus | null {
  const statuses: CustomizationStatus[] = [
    'PRODUCTION_REVIEWING',
    'WAITING_FOR_CUSTOMER_FINAL_APPROVAL',
    'NOT_FEASIBLE',
    'ACCEPTED',
  ];

  return statuses.find((status) => status === value) ?? null;
}

function getProductionSearchParams(requestId: string, status: CustomizationStatus) {
  const params: Record<string, string> = {};

  if (requestId) params.requestId = requestId;
  params.status = status;

  return params;
}

function countByStatus(requests: ProductionCustomizationRequestQueueItemDto[], status: CustomizationStatus) {
  return requests.filter((request) => request.status === status).length;
}

function toCssStatus(status?: CustomizationStatus | null) {
  return (status ?? 'UNKNOWN').toLowerCase().replace(/_/g, '-');
}
