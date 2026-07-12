import { FormEvent, useMemo, useState } from 'react';

import {
  getCustomizationRequestServiceResultMessage,
  type CustomizationRequestDto,
  type CustomizationRequestDetailDto,
  type CustomizationStatus,
} from '@/services/api/customizationRequests';
import type { ProjectDto } from '@/services/api/projects';
import {
  useCancelCustomizationRequest,
  useCustomizationRequestDetail,
  useDesignerReviewCustomizationRequest,
  useProjectCustomizationRequests,
} from '@/services/queries';

type CustomizationTabProps = {
  project: ProjectDto;
};

const statusFilters: Array<{ label: string; value: CustomizationStatus | null }> = [
  { label: 'All', value: null },
  { label: 'Design Review', value: 'SUBMITTED' },
  { label: 'Production', value: 'PRODUCTION_REVIEWING' },
  { label: 'Customer Approval', value: 'WAITING_FOR_CUSTOMER_FINAL_APPROVAL' },
  { label: 'Accepted', value: 'ACCEPTED' },
];

export function CustomizationTab({ project }: CustomizationTabProps) {
  const [statusFilter, setStatusFilter] = useState<CustomizationStatus | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [designerSpecNote, setDesignerSpecNote] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const requestsQuery = useProjectCustomizationRequests({
    projectId: project.projectId,
    status: statusFilter,
  });
  const detailQuery = useCustomizationRequestDetail(activeRequestId ?? undefined, { enabled: Boolean(activeRequestId) });
  const designerReviewMutation = useDesignerReviewCustomizationRequest();
  const cancelMutation = useCancelCustomizationRequest();
  const requests = useMemo(() => requestsQuery.data?.items ?? [], [requestsQuery.data?.items]);
  const activeDetail = detailQuery.data;
  const activeRequest = requests.find((request) => request.customizationRequestId === activeRequestId) ?? null;

  function selectRequest(requestId: string | null) {
    setActiveRequestId(requestId);
    setDesignerSpecNote('');
    setCancelReason('');
    setMessage(null);
  }

  async function submitDesignerReview(event: FormEvent<HTMLFormElement>, request: CustomizationRequestDto) {
    event.preventDefault();
    setMessage(null);

    if (!designerSpecNote.trim()) {
      setMessage({ tone: 'error', text: 'Designer spec note is required before sending to production.' });
      return;
    }

    try {
      await designerReviewMutation.mutateAsync({
        customizationRequestId: request.customizationRequestId,
        designerSpecNote,
      });
      setDesignerSpecNote('');
      setActiveRequestId(null);
      setMessage({ tone: 'success', text: 'Customization request moved to production review.' });
    } catch (error) {
      setMessage({ tone: 'error', text: getCustomizationRequestServiceResultMessage(error) });
    }
  }

  async function cancelRequest(event: FormEvent<HTMLFormElement>, request: CustomizationRequestDto) {
    event.preventDefault();
    setMessage(null);

    if (!cancelReason.trim()) {
      setMessage({ tone: 'error', text: 'Cancel reason is required.' });
      return;
    }

    try {
      await cancelMutation.mutateAsync({
        customizationRequestId: request.customizationRequestId,
        cancelReason,
      });
      setCancelReason('');
      setActiveRequestId(null);
      setMessage({ tone: 'success', text: 'Customization request cancelled.' });
    } catch (error) {
      setMessage({ tone: 'error', text: getCustomizationRequestServiceResultMessage(error) });
    }
  }

  return (
    <section className="designer-card designer-project-section-card">
      <div className="designer-project-section-toolbar">
        <div>
          <h3>Customization</h3>
          <p>Requests are item-level changes on published proposal items.</p>
        </div>
        <div className="designer-project-filter-list">
          {statusFilters.map((filter) => (
            <button
              className={`designer-project-filter ${statusFilter === filter.value ? 'designer-project-filter-active' : ''}`}
              key={filter.label}
              type="button"
              onClick={() => {
                setStatusFilter(filter.value);
                selectRequest(null);
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {message ? (
        <p className={`designer-project-schedule-message ${message.tone === 'success' ? 'designer-project-message-success' : 'designer-project-file-error'}`}>
          {message.text}
        </p>
      ) : null}
      {requestsQuery.isLoading ? <p className="designer-project-empty-text">Loading customization requests...</p> : null}
      {requestsQuery.isError ? (
        <p className="designer-project-file-message designer-project-file-error">
          {getCustomizationRequestServiceResultMessage(requestsQuery.error)}
        </p>
      ) : null}
      {!requestsQuery.isLoading && requests.length === 0 ? (
        <p className="designer-project-empty-text">No customization requests found for this project.</p>
      ) : null}

      {requests.length > 0 ? (
        <div className="designer-project-custom-layout">
          <div className="designer-project-custom-list">
            {requests.map((request) => {
              const isActive = activeRequestId === request.customizationRequestId;

              return (
                <button
                  className={`designer-project-custom-card ${isActive ? 'designer-project-custom-card-active' : ''}`}
                  key={request.customizationRequestId}
                  type="button"
                  onClick={() => selectRequest(isActive ? null : request.customizationRequestId)}
                >
                  <div className="designer-project-custom-main">
                    <div className="designer-project-custom-title">
                      <h4>{request.requestTitle}</h4>
                      <span className={`designer-project-status designer-project-status-${getStatusTone(request.status)}`}>
                        {formatEnumLabel(request.status ?? 'UNKNOWN')}
                      </span>
                    </div>
                    <p className="designer-project-custom-subtitle">
                      Created {request.createdAt ? formatDate(request.createdAt) : '-'}
                    </p>

                    <p className="designer-project-custom-note-preview">
                      {request.requestedChangeNote || request.requestDescription || request.designerSpecNote || 'No note provided.'}
                    </p>

                    <div className="designer-project-custom-specs">
                      <div className="designer-project-custom-spec">
                        <span>Material</span>
                        <p>{request.requestedMaterial ?? '-'}</p>
                      </div>
                      <div className="designer-project-custom-spec">
                        <span>Color</span>
                        <p>{request.requestedColor ?? '-'}</p>
                      </div>
                      <div className="designer-project-custom-spec designer-project-custom-price">
                        <span>Price Impact</span>
                        <p>{formatMoney(request.estimatedAdditionalCost)}</p>
                      </div>
                    </div>

                    <div className="designer-project-dimensions">
                      <span className="designer-project-dimension">W {formatDimension(request.requestedWidth)}</span>
                      <span className="designer-project-dimension">H {formatDimension(request.requestedHeight)}</span>
                      <span className="designer-project-dimension">D {formatDimension(request.requestedDepth)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <aside className="designer-project-custom-review-panel">
            {activeRequest ? (
              <CustomizationReviewPanel
                cancelMutationPending={cancelMutation.isPending}
                cancelReason={cancelReason}
                designerReviewMutationPending={designerReviewMutation.isPending}
                designerSpecNote={designerSpecNote}
                detail={activeDetail?.customizationRequestId === activeRequest.customizationRequestId ? activeDetail : null}
                detailLoading={detailQuery.isLoading}
                request={activeRequest}
                onCancelReasonChange={setCancelReason}
                onClose={() => selectRequest(null)}
                onDesignerSpecNoteChange={setDesignerSpecNote}
                onSubmitCancel={(event) => void cancelRequest(event, activeRequest)}
                onSubmitDesignerReview={(event) => void submitDesignerReview(event, activeRequest)}
              />
            ) : (
              <div className="designer-project-custom-empty-panel">
                <span>Review Panel</span>
                <h4>Select a customization request</h4>
                <p>Details, production notes, and review actions will appear here.</p>
              </div>
            )}
          </aside>
        </div>
      ) : null}
    </section>
  );
}

function CustomizationReviewPanel({
  cancelMutationPending,
  cancelReason,
  designerReviewMutationPending,
  designerSpecNote,
  detail,
  detailLoading,
  onCancelReasonChange,
  onClose,
  onDesignerSpecNoteChange,
  onSubmitCancel,
  onSubmitDesignerReview,
  request,
}: {
  cancelMutationPending: boolean;
  cancelReason: string;
  designerReviewMutationPending: boolean;
  designerSpecNote: string;
  detail: CustomizationRequestDetailDto | null;
  detailLoading: boolean;
  onCancelReasonChange: (value: string) => void;
  onClose: () => void;
  onDesignerSpecNoteChange: (value: string) => void;
  onSubmitCancel: (event: FormEvent<HTMLFormElement>) => void;
  onSubmitDesignerReview: (event: FormEvent<HTMLFormElement>) => void;
  request: CustomizationRequestDto;
}) {
  const canDesignerReview = request.status === 'SUBMITTED' || request.status === 'DESIGN_REVIEWING';
  const canCancel = request.status !== 'ACCEPTED' && request.status !== 'CANCELLED';

  return (
    <>
      <div className="designer-project-custom-review-header">
        <div>
          <span>Selected Request</span>
          <h4>{request.requestTitle}</h4>
        </div>
        <button className="designer-project-detail-button" type="button" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="designer-project-note">
        <span>Request Note</span>
        <p>{request.requestedChangeNote || request.requestDescription || request.designerSpecNote || 'No note provided.'}</p>
      </div>

      <CustomizationDetailPanel isLoading={detailLoading} request={detail ?? request} />

      {canDesignerReview ? (
        <form className="designer-project-custom-action-form" onSubmit={onSubmitDesignerReview}>
          <label>
            <span>Designer specification</span>
            <textarea
              required
              rows={4}
              value={designerSpecNote}
              placeholder="Designer specification for production review"
              onChange={(event) => onDesignerSpecNoteChange(event.target.value)}
            />
          </label>
          <button className="designer-project-detail-button designer-project-detail-button-primary" disabled={designerReviewMutationPending} type="submit">
            {designerReviewMutationPending ? 'Sending...' : 'Send to Production'}
          </button>
        </form>
      ) : null}

      {!canDesignerReview && canCancel ? (
        <form className="designer-project-custom-action-form" onSubmit={onSubmitCancel}>
          <label>
            <span>Cancel reason</span>
            <textarea
              required
              rows={3}
              value={cancelReason}
              placeholder="Cancel reason"
              onChange={(event) => onCancelReasonChange(event.target.value)}
            />
          </label>
          <button className="designer-project-detail-button" disabled={cancelMutationPending} type="submit">
            {cancelMutationPending ? 'Cancelling...' : 'Cancel Request'}
          </button>
        </form>
      ) : null}
    </>
  );
}

function CustomizationDetailPanel({
  isLoading,
  request,
}: {
  isLoading: boolean;
  request: CustomizationRequestDto | CustomizationRequestDetailDto;
}) {
  const proposalItem = 'proposalItem' in request ? request.proposalItem : null;

  return (
    <div className="designer-project-custom-detail">
      {isLoading ? <p>Loading request detail...</p> : null}
      <div className="designer-project-custom-detail-section">
        <span>Proposal Item Snapshot</span>
        <strong>{proposalItem?.itemName ?? `Item ${request.proposalItemId}`}</strong>
        <p>
          Qty {proposalItem?.quantity ?? '-'} - {proposalItem?.material ?? '-'} / {proposalItem?.color ?? '-'}
        </p>
        <p>
          {formatDimension(proposalItem?.width)} x {formatDimension(proposalItem?.height)} x {formatDimension(proposalItem?.depth)}
        </p>
        <p>{formatMoney(proposalItem?.totalPriceSnapshot ?? proposalItem?.unitPriceSnapshot)}</p>
      </div>

      <div className="designer-project-custom-detail-grid">
        <DetailValue label="Designer Note" value={request.designerSpecNote} />
        <DetailValue label="Production Days" value={formatNumber(request.estimatedProductionDays)} />
        <DetailValue label="Material Available" value={formatBoolean(request.materialAvailable)} />
        <DetailValue label="Cost Impact" value={formatMoney(request.estimatedAdditionalCost)} />
      </div>

      <DetailValue label="Production Feasibility" value={request.feasibilityNote} />
      <DetailValue label="Cost Reason" value={request.additionalCostReason} />
      <DetailValue label="Risk Note" value={request.productionRiskNote} />
      <DetailValue label="Customer Decision" value={getCustomerDecisionText(request)} />
    </div>
  );
}

function DetailValue({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="designer-project-custom-detail-value">
      <span>{label}</span>
      <p>{value || '-'}</p>
    </div>
  );
}

function getStatusTone(status?: CustomizationStatus | null) {
  if (status === 'ACCEPTED' || status === 'WAITING_FOR_CUSTOMER_FINAL_APPROVAL') return 'feasible';
  if (status === 'SUBMITTED' || status === 'DESIGN_REVIEWING' || status === 'PRODUCTION_REVIEWING') return 'pending';
  if (status === 'NOT_FEASIBLE' || status === 'REJECTED_BY_CUSTOMER' || status === 'CANCELLED') return 'missing';

  return 'new';
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDimension(value?: number | null) {
  return typeof value === 'number' ? `${value} cm` : '-';
}

function formatMoney(value?: number | null) {
  if (typeof value !== 'number') return '-';

  return `${new Intl.NumberFormat('vi-VN').format(value)} VND`;
}

function formatNumber(value?: number | null) {
  return typeof value === 'number' ? String(value) : '-';
}

function formatBoolean(value?: boolean | null) {
  if (typeof value !== 'boolean') return '-';

  return value ? 'Yes' : 'No';
}

function getCustomerDecisionText(request: CustomizationRequestDto | CustomizationRequestDetailDto) {
  if (request.customerAcceptedAt) return `Accepted on ${formatDate(request.customerAcceptedAt)}`;
  if (request.customerRejectedAt) return `Rejected on ${formatDate(request.customerRejectedAt)}`;
  if (request.status === 'WAITING_FOR_CUSTOMER_FINAL_APPROVAL') return 'Waiting for customer final approval';

  return '-';
}
