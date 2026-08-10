import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { IconAlertTriangle, IconClipboardCheck, IconClock, IconCurrencyDollar } from '@tabler/icons-react';
import { useSearchParams } from 'react-router-dom';

import { mockCustomizationRequests } from '@/features/ProductionPages/mock';
import {
  ProductionEmptyState,
  ProductionFilterBar,
  ProductionLayout,
  ProductionStatusBadge,
  ProductionSummaryCard,
} from '@/features/ProductionPages/productioncomponents';
import type { CustomizationStatus, MaterialAvailability, ProductionCustomizationRequest } from '@/features/ProductionPages/types';
import { formatDate, formatDimensions, formatMoney, getCustomizationStatusLabel } from '@/features/ProductionPages/utils';
import {
  type ProductionCustomizationRequestQueueItemDto,
  type ProductionReviewResult,
} from '@/services/api/customizationRequests';
import {
  useProductionCustomizationRequests,
  useProductionReviewCustomizationRequest,
} from '@/services/queries';

import './ProductionCustomizationRequests.css';

type StatusFilter = CustomizationStatus | 'ALL';
type MaterialFilter = MaterialAvailability | 'ALL';

type ReviewFormState = {
  additionalCostReason: string;
  estimatedAdditionalCost: string;
  estimatedProductionDays: string;
  feasibilityNote: string;
  materialAvailability: MaterialAvailability;
  productionRiskNote: string;
  result: ProductionReviewResult;
};

const initialReviewForm: ReviewFormState = {
  additionalCostReason: '',
  estimatedAdditionalCost: '0',
  estimatedProductionDays: '',
  feasibilityNote: '',
  materialAvailability: 'AVAILABLE',
  productionRiskNote: '',
  result: 'FEASIBLE',
};

const statusFilters: Array<{ label: string; value: StatusFilter }> = [
  { label: 'Production Reviewing', value: 'PRODUCTION_REVIEWING' },
  { label: 'Waiting Customer Approval', value: 'WAITING_FOR_CUSTOMER_FINAL_APPROVAL' },
  { label: 'Not Feasible', value: 'NOT_FEASIBLE' },
  { label: 'Accepted', value: 'ACCEPTED' },
  { label: 'All', value: 'ALL' },
];

const materialFilters: Array<{ label: string; value: MaterialFilter }> = [
  { label: 'All Material', value: 'ALL' },
  { label: 'Available', value: 'AVAILABLE' },
  { label: 'Unavailable', value: 'UNAVAILABLE' },
  { label: 'Unknown', value: 'UNKNOWN' },
];

export function ProductionCustomizationRequests() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestIdFromUrl = searchParams.get('requestId') ?? '';
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PRODUCTION_REVIEWING');
  const [materialFilter, setMaterialFilter] = useState<MaterialFilter>('ALL');
  const [searchText, setSearchText] = useState('');
  const [activeRequestId, setActiveRequestId] = useState(requestIdFromUrl);
  const [localRequests, setLocalRequests] = useState(mockCustomizationRequests);
  const [reviewForm, setReviewForm] = useState<ReviewFormState>(initialReviewForm);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const queueQuery = useProductionCustomizationRequests({
    status: statusFilter === 'ALL' ? null : statusFilter,
    materialAvailable: materialFilter === 'ALL' || materialFilter === 'UNKNOWN' ? null : materialFilter === 'AVAILABLE',
    page: 1,
    pageSize: 50,
  });
  const productionReviewMutation = useProductionReviewCustomizationRequest();
  const apiRequests = queueQuery.data?.items ?? [];
  const sourceRequests = apiRequests.length > 0 ? apiRequests.map(mapApiCustomizationRequest) : localRequests;
  const requests = useMemo(
    () => sourceRequests.filter((request) => matchesFilters(request, statusFilter, materialFilter, searchText)),
    [materialFilter, searchText, sourceRequests, statusFilter],
  );
  const selectedRequest = requests.find((request) => request.customizationRequestId === activeRequestId)
    ?? sourceRequests.find((request) => request.customizationRequestId === activeRequestId)
    ?? null;

  useEffect(() => {
    if (requestIdFromUrl) {
      setActiveRequestId(requestIdFromUrl);
    }
  }, [requestIdFromUrl]);

  useEffect(() => {
    if (!activeRequestId && requests.length > 0) {
      setActiveRequestId(requests[0].customizationRequestId);
    }
  }, [activeRequestId, requests]);

  useEffect(() => {
    if (!selectedRequest) return;

    setReviewForm({
      additionalCostReason: selectedRequest.additionalCostReason ?? '',
      estimatedAdditionalCost: String(selectedRequest.estimatedAdditionalCost ?? 0),
      estimatedProductionDays: selectedRequest.estimatedProductionDays ? String(selectedRequest.estimatedProductionDays) : '',
      feasibilityNote: selectedRequest.feasibilityNote ?? '',
      materialAvailability: selectedRequest.materialAvailability,
      productionRiskNote: selectedRequest.productionRiskNote ?? '',
      result: selectedRequest.status === 'NOT_FEASIBLE' ? 'NOT_FEASIBLE' : 'FEASIBLE',
    });
  }, [selectedRequest]);

  function selectRequest(requestId: string) {
    setActiveRequestId(requestId);
    setSearchParams({ requestId });
    setMessage(null);
  }

  async function submitReview(result: ProductionReviewResult) {
    if (!selectedRequest) return;

    const validationMessage = validateProductionReview({ ...reviewForm, result });

    if (validationMessage) {
      setMessage({ tone: 'error', text: validationMessage });
      return;
    }

    const nextStatus: CustomizationStatus = result === 'FEASIBLE' ? 'WAITING_FOR_CUSTOMER_FINAL_APPROVAL' : 'NOT_FEASIBLE';
    const nextRequest: ProductionCustomizationRequest = {
      ...selectedRequest,
      additionalCostReason: result === 'FEASIBLE' ? reviewForm.additionalCostReason : '',
      estimatedAdditionalCost: result === 'FEASIBLE' ? normalizeNumber(reviewForm.estimatedAdditionalCost) ?? 0 : undefined,
      estimatedProductionDays: result === 'FEASIBLE' ? normalizeNumber(reviewForm.estimatedProductionDays) ?? undefined : undefined,
      feasibilityNote: reviewForm.feasibilityNote,
      materialAvailable: reviewForm.materialAvailability === 'AVAILABLE',
      materialAvailability: reviewForm.materialAvailability,
      productionReviewBy: 'PD-MOCK-CURRENT',
      productionRiskNote: reviewForm.productionRiskNote,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (apiRequests.some((request) => request.customizationRequestId === selectedRequest.customizationRequestId)) {
        await productionReviewMutation.mutateAsync({
          customizationRequestId: selectedRequest.customizationRequestId,
          result,
          materialAvailable: reviewForm.materialAvailability === 'AVAILABLE',
          estimatedProductionDays: result === 'FEASIBLE' ? normalizeNumber(reviewForm.estimatedProductionDays) : null,
          estimatedAdditionalCost: result === 'FEASIBLE' ? normalizeNumber(reviewForm.estimatedAdditionalCost) ?? 0 : null,
          additionalCostReason: result === 'FEASIBLE' ? reviewForm.additionalCostReason : null,
          feasibilityNote: reviewForm.feasibilityNote,
          productionRiskNote: reviewForm.productionRiskNote,
        });
        void queueQuery.refetch();
        setMessage({ tone: 'success', text: result === 'FEASIBLE' ? 'Submitted as feasible.' : 'Marked as not feasible.' });
        return;
      }
    } catch {
      setMessage({ tone: 'success', text: 'API unavailable. Review saved in mock mode for UI validation.' });
    }

    setLocalRequests((current) => current.map((request) => (request.customizationRequestId === nextRequest.customizationRequestId ? nextRequest : request)));
    setMessage({ tone: 'success', text: result === 'FEASIBLE' ? 'Submitted as feasible.' : 'Marked as not feasible.' });
  }

  function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRequest) return;

    setLocalRequests((current) =>
      current.map((request) =>
        request.customizationRequestId === selectedRequest.customizationRequestId
          ? {
              ...request,
              additionalCostReason: reviewForm.additionalCostReason,
              estimatedAdditionalCost: normalizeNumber(reviewForm.estimatedAdditionalCost) ?? undefined,
              estimatedProductionDays: normalizeNumber(reviewForm.estimatedProductionDays) ?? undefined,
              feasibilityNote: reviewForm.feasibilityNote,
              materialAvailability: reviewForm.materialAvailability,
              productionRiskNote: reviewForm.productionRiskNote,
              updatedAt: new Date().toISOString(),
            }
          : request,
      ),
    );
    setMessage({ tone: 'success', text: 'Review draft saved in mock mode.' });
  }

  return (
    <ProductionLayout activeLabel="Customization Reviews" searchPlaceholder="Search customization reviews...">
      <div className="production-workspace-page">
        <section className="production-workspace-heading">
          <div>
            <span>Production Workspace</span>
            <h2>Customization Requests</h2>
            <p>Review item-level customization requests, check material availability, estimate production effort, and return feasibility results for customer approval.</p>
          </div>
        </section>

        <section className="production-workspace-filter-card">
          <ProductionFilterBar activeValue={statusFilter} filters={statusFilters} onChange={setStatusFilter} />
          <ProductionFilterBar activeValue={materialFilter} filters={materialFilters} onChange={setMaterialFilter} />
          <input
            className="production-workspace-search"
            placeholder="Search by request ID, project, or item"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </section>

        <section className="production-workspace-summary-grid">
          <ProductionSummaryCard icon={IconClipboardCheck} label="Total Queue" value={requests.length} />
          <ProductionSummaryCard icon={IconClock} label="Production Reviewing" value={sourceRequests.filter((request) => request.status === 'PRODUCTION_REVIEWING').length} />
          <ProductionSummaryCard icon={IconCurrencyDollar} label="Waiting Customer Approval" value={sourceRequests.filter((request) => request.status === 'WAITING_FOR_CUSTOMER_FINAL_APPROVAL').length} />
          <ProductionSummaryCard icon={IconAlertTriangle} label="Not Feasible" value={sourceRequests.filter((request) => request.status === 'NOT_FEASIBLE').length} />
        </section>

        {queueQuery.isError ? <section className="production-workspace-message production-workspace-message-error">Customization API is unavailable, showing mock review queue.</section> : null}
        {message ? <section className={`production-workspace-message production-workspace-message-${message.tone}`}>{message.text}</section> : null}

        <section className="production-workspace-grid">
          <article className="production-workspace-card">
            <header>
              <div>
                <h3>Review Queue</h3>
                <p>Open queue, select request, then submit feasibility result.</p>
              </div>
            </header>
            <div className="production-workspace-list">
              {requests.map((request) => (
                <button
                  className={`production-workspace-queue-card ${request.customizationRequestId === selectedRequest?.customizationRequestId ? 'is-active' : ''}`}
                  key={request.customizationRequestId}
                  type="button"
                  onClick={() => selectRequest(request.customizationRequestId)}
                >
                  <strong>{request.requestTitle}</strong>
                  <ProductionStatusBadge label={getCustomizationStatusLabel(request.status)} status={request.status} />
                  <small>{request.projectCode} - {request.projectName}</small>
                  <small>{request.itemName}</small>
                  <small>Material: {request.materialAvailability}</small>
                  <p>{request.requestedChangeNote || request.requestDescription}</p>
                  <small>Created {formatDate(request.createdAt)}</small>
                </button>
              ))}
            </div>
          </article>

          <article className="production-workspace-card">
            <header>
              <div>
                <h3>Request Detail & Feasibility Review</h3>
                <p>Production review is editable while the request is in Production Reviewing.</p>
              </div>
            </header>
            {selectedRequest ? (
              <>
                <RequestDetail request={selectedRequest} />
                {selectedRequest.status === 'PRODUCTION_REVIEWING' ? (
                  <form className="production-workspace-form production-customization-form" onSubmit={saveReview}>
                    <div className="production-workspace-form-grid">
                      <label>
                        <span>Material Available?</span>
                        <select
                          className="production-workspace-select"
                          value={reviewForm.materialAvailability}
                          onChange={(event) => setReviewForm((current) => ({ ...current, materialAvailability: event.target.value as MaterialAvailability }))}
                        >
                          <option value="AVAILABLE">Yes</option>
                          <option value="UNAVAILABLE">No</option>
                          <option value="UNKNOWN">Unknown</option>
                        </select>
                      </label>
                      <label>
                        <span>Feasibility Result</span>
                        <select
                          className="production-workspace-select"
                          value={reviewForm.result}
                          onChange={(event) => setReviewForm((current) => ({ ...current, result: event.target.value as ProductionReviewResult }))}
                        >
                          <option value="FEASIBLE">Feasible</option>
                          <option value="NOT_FEASIBLE">Not Feasible</option>
                        </select>
                      </label>
                    </div>
                    <label>
                      <span>Feasibility Note</span>
                      <textarea className="production-workspace-textarea" rows={3} value={reviewForm.feasibilityNote} onChange={(event) => setReviewForm((current) => ({ ...current, feasibilityNote: event.target.value }))} />
                    </label>
                    <label>
                      <span>Production Risk Note</span>
                      <textarea className="production-workspace-textarea" rows={3} value={reviewForm.productionRiskNote} onChange={(event) => setReviewForm((current) => ({ ...current, productionRiskNote: event.target.value }))} />
                    </label>
                    <div className="production-workspace-form-grid">
                      <label>
                        <span>Estimated Production Days</span>
                        <input className="production-workspace-input" disabled={reviewForm.result === 'NOT_FEASIBLE'} min="1" type="number" value={reviewForm.estimatedProductionDays} onChange={(event) => setReviewForm((current) => ({ ...current, estimatedProductionDays: event.target.value }))} />
                      </label>
                      <label>
                        <span>Estimated Additional Cost</span>
                        <input className="production-workspace-input" disabled={reviewForm.result === 'NOT_FEASIBLE'} min="0" type="number" value={reviewForm.estimatedAdditionalCost} onChange={(event) => setReviewForm((current) => ({ ...current, estimatedAdditionalCost: event.target.value }))} />
                      </label>
                    </div>
                    <label>
                      <span>Additional Cost Reason</span>
                      <textarea className="production-workspace-textarea" disabled={reviewForm.result === 'NOT_FEASIBLE'} rows={3} value={reviewForm.additionalCostReason} onChange={(event) => setReviewForm((current) => ({ ...current, additionalCostReason: event.target.value }))} />
                    </label>
                    <div className="production-workspace-actions">
                      <button className="production-workspace-button production-workspace-button-secondary" type="submit">Save Review</button>
                      <button className="production-workspace-button" disabled={productionReviewMutation.isPending} type="button" onClick={() => void submitReview('FEASIBLE')}>Submit as Feasible</button>
                      <button className="production-workspace-button production-workspace-button-secondary" disabled={productionReviewMutation.isPending} type="button" onClick={() => void submitReview('NOT_FEASIBLE')}>Mark as Not Feasible</button>
                    </div>
                  </form>
                ) : (
                  <p className="production-workspace-muted">This request is read-only for production at its current status.</p>
                )}
              </>
            ) : (
              <ProductionEmptyState message="Select a customization request from the queue to review feasibility." />
            )}
          </article>
        </section>
      </div>
    </ProductionLayout>
  );
}

function RequestDetail({ request }: { request: ProductionCustomizationRequest }) {
  return (
    <section className="production-workspace-detail-grid production-customization-detail">
      <Field label="Project" value={`${request.projectCode} - ${request.projectName}`} />
      <Field label="Proposal" value={request.proposalName} />
      <Field label="Proposal Item" value={request.itemName} />
      <Field label="Customer Request" value={request.requestDescription} />
      <Field label="Requested Width / Height / Depth" value={formatDimensions(request.requestedWidth, request.requestedHeight, request.requestedDepth)} />
      <Field label="Requested Material" value={request.requestedMaterial ?? '-'} />
      <Field label="Requested Color" value={request.requestedColor ?? '-'} />
      <Field label="Requested Change Note" value={request.requestedChangeNote ?? '-'} />
      <Field label="Designer Name" value={request.designerName ?? '-'} />
      <Field label="Designer Specification Note" value={request.designerSpecNote ?? '-'} />
      <Field label="Estimated Additional Cost" value={formatMoney(request.estimatedAdditionalCost)} />
      <Field label="Production Risk Note" value={request.productionRiskNote ?? '-'} />
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="production-workspace-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function validateProductionReview(form: ReviewFormState) {
  if (form.result === 'FEASIBLE') {
    if (form.materialAvailability === 'UNKNOWN') return 'Material availability is required for feasible reviews.';
    if (!normalizeNumber(form.estimatedProductionDays)) return 'Estimated production days is required.';
    if (normalizeNumber(form.estimatedAdditionalCost) === null) return 'Estimated additional cost is required.';
    if (!form.feasibilityNote.trim()) return 'Feasibility note is required.';
    return null;
  }

  if (!form.feasibilityNote.trim()) return 'Feasibility note is required.';
  if (!form.productionRiskNote.trim()) return 'Production risk note is required.';

  return null;
}

function normalizeNumber(value: string) {
  if (!value.trim()) return null;
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function matchesFilters(
  request: ProductionCustomizationRequest,
  statusFilter: StatusFilter,
  materialFilter: MaterialFilter,
  searchText: string,
) {
  const normalizedSearch = searchText.trim().toLowerCase();
  const statusMatches = statusFilter === 'ALL' || request.status === statusFilter;
  const materialMatches = materialFilter === 'ALL' || request.materialAvailability === materialFilter;
  const searchMatches = !normalizedSearch
    || request.customizationRequestId.toLowerCase().includes(normalizedSearch)
    || request.projectName.toLowerCase().includes(normalizedSearch)
    || request.projectCode.toLowerCase().includes(normalizedSearch)
    || request.itemName.toLowerCase().includes(normalizedSearch);

  return statusMatches && materialMatches && searchMatches;
}

function mapApiCustomizationRequest(request: ProductionCustomizationRequestQueueItemDto): ProductionCustomizationRequest {
  const materialAvailability: MaterialAvailability = request.materialAvailable === true
    ? 'AVAILABLE'
    : request.materialAvailable === false
      ? 'UNAVAILABLE'
      : 'UNKNOWN';

  return {
    customizationRequestId: request.customizationRequestId,
    projectId: request.projectId,
    projectCode: request.projectId,
    projectName: request.project?.projectName ?? request.projectId,
    proposalId: request.proposalId,
    proposalName: request.proposal?.proposalName ?? request.proposalId,
    proposalItemId: request.proposalItemId,
    itemName: request.proposalItem?.itemName ?? request.proposalItemId,
    requestedByCustomerName: request.project?.customerId ?? '-',
    requestTitle: request.requestTitle,
    requestDescription: request.requestDescription ?? '-',
    requestedWidth: request.requestedWidth ?? undefined,
    requestedHeight: request.requestedHeight ?? undefined,
    requestedDepth: request.requestedDepth ?? undefined,
    requestedMaterial: request.requestedMaterial ?? undefined,
    requestedColor: request.requestedColor ?? undefined,
    requestedChangeNote: request.requestedChangeNote ?? undefined,
    designerId: request.designerId ?? undefined,
    designerSpecNote: request.designerSpecNote ?? undefined,
    productionReviewBy: request.productionReviewBy ?? undefined,
    feasibilityNote: request.feasibilityNote ?? undefined,
    estimatedProductionDays: request.estimatedProductionDays ?? undefined,
    estimatedAdditionalCost: request.estimatedAdditionalCost ?? undefined,
    additionalCostReason: request.additionalCostReason ?? undefined,
    materialAvailable: request.materialAvailable ?? undefined,
    materialAvailability,
    productionRiskNote: request.productionRiskNote ?? undefined,
    approvedProductVersionId: request.approvedProductVersionId ?? undefined,
    status: request.status ?? 'PRODUCTION_REVIEWING',
    createdAt: request.createdAt ?? '',
    updatedAt: request.updatedAt ?? request.createdAt ?? '',
  };
}
