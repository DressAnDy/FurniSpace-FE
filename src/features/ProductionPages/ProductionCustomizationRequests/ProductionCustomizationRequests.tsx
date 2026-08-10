import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { IconAlertTriangle, IconClipboardCheck, IconClock, IconCurrencyDollar } from '@tabler/icons-react';
import { useSearchParams } from 'react-router-dom';

import {
  ProductionEmptyState,
  ProductionFilterBar,
  ProductionLayout,
  ProductionStatusBadge,
  ProductionSummaryCard,
} from '@/features/ProductionPages/productioncomponents';
import type { MaterialAvailability } from '@/features/ProductionPages/types';
import { formatDate, formatDimensions, formatMoney, getCustomizationStatusLabel } from '@/features/ProductionPages/utils';
import {
  getCustomizationRequestServiceResultMessage,
  type CustomizationVersionStatus,
  type ProductionCustomizationVersionQueueItemDto,
  type ProductionFeasibilityStatus,
  type ProductionReviewResult,
} from '@/services/api/customizationRequests';
import {
  useProductionCustomizationVersions,
  useProductionReviewCustomizationVersion,
} from '@/services/queries';

import './ProductionCustomizationRequests.css';

type StatusFilter = CustomizationVersionStatus | 'ALL';
type FeasibilityFilter = ProductionFeasibilityStatus | 'ALL';
type MaterialFilter = MaterialAvailability | 'ALL';

type ReviewFormState = {
  additionalCostReason: string;
  alternativeMaterialNote: string;
  estimatedAdditionalCost: string;
  estimatedProductionDays: string;
  feasibilityNote: string;
  materialAvailability: MaterialAvailability;
  productionRiskNote: string;
  result: ProductionReviewResult;
};

const initialReviewForm: ReviewFormState = {
  additionalCostReason: '',
  alternativeMaterialNote: '',
  estimatedAdditionalCost: '0',
  estimatedProductionDays: '',
  feasibilityNote: '',
  materialAvailability: 'AVAILABLE',
  productionRiskNote: '',
  result: 'FEASIBLE',
};

const statusFilters: Array<{ label: string; value: StatusFilter }> = [
  { label: 'Reviewing', value: 'REVIEWING' },
  { label: 'Production Rejected', value: 'PRODUCTION_REJECTED' },
  { label: 'Accepted', value: 'ACCEPTED' },
  { label: 'All', value: 'ALL' },
];

const feasibilityFilters: Array<{ label: string; value: FeasibilityFilter }> = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Feasible', value: 'FEASIBLE' },
  { label: 'Not Feasible', value: 'NOT_FEASIBLE' },
  { label: 'All Feasibility', value: 'ALL' },
];

const materialFilters: Array<{ label: string; value: MaterialFilter }> = [
  { label: 'All Material', value: 'ALL' },
  { label: 'Available', value: 'AVAILABLE' },
  { label: 'Unavailable', value: 'UNAVAILABLE' },
  { label: 'Unknown', value: 'UNKNOWN' },
];

export function ProductionCustomizationRequests() {
  const [searchParams, setSearchParams] = useSearchParams();
  const versionIdFromUrl = searchParams.get('versionId') ?? searchParams.get('requestId') ?? '';
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('REVIEWING');
  const [feasibilityFilter, setFeasibilityFilter] = useState<FeasibilityFilter>('PENDING');
  const [materialFilter, setMaterialFilter] = useState<MaterialFilter>('ALL');
  const [searchText, setSearchText] = useState('');
  const [activeVersionId, setActiveVersionId] = useState(versionIdFromUrl);
  const [reviewForm, setReviewForm] = useState<ReviewFormState>(initialReviewForm);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const queueQuery = useProductionCustomizationVersions({
    status: statusFilter === 'ALL' ? null : statusFilter,
    feasibilityStatus: feasibilityFilter === 'ALL' ? null : feasibilityFilter,
    materialAvailable: materialFilter === 'ALL' || materialFilter === 'UNKNOWN' ? null : materialFilter === 'AVAILABLE',
    page: 1,
    pageSize: 50,
  });
  const productionReviewMutation = useProductionReviewCustomizationVersion();
  const sourceItems = queueQuery.data?.items ?? [];
  const items = useMemo(
    () => sourceItems.filter((item) => matchesFilters(item, materialFilter, searchText)),
    [materialFilter, searchText, sourceItems],
  );
  const selectedItem = items.find((item) => item.version.customizationRequestVersionId === activeVersionId)
    ?? sourceItems.find((item) => item.version.customizationRequestVersionId === activeVersionId)
    ?? null;

  useEffect(() => {
    if (versionIdFromUrl) {
      setActiveVersionId(versionIdFromUrl);
    }
  }, [versionIdFromUrl]);

  useEffect(() => {
    if (!activeVersionId && items.length > 0) {
      setActiveVersionId(items[0].version.customizationRequestVersionId);
    }
  }, [activeVersionId, items]);

  useEffect(() => {
    if (!selectedItem) return;

    setReviewForm({
      additionalCostReason: selectedItem.version.additionalCostReason ?? '',
      alternativeMaterialNote: selectedItem.version.alternativeMaterialNote ?? '',
      estimatedAdditionalCost: String(selectedItem.version.estimatedAdditionalCost ?? 0),
      estimatedProductionDays: selectedItem.version.estimatedProductionDays ? String(selectedItem.version.estimatedProductionDays) : '',
      feasibilityNote: selectedItem.version.feasibilityNote ?? '',
      materialAvailability: getMaterialAvailability(selectedItem.version.materialAvailable),
      productionRiskNote: selectedItem.version.productionRiskNote ?? '',
      result: selectedItem.version.feasibilityStatus === 'NOT_FEASIBLE' ? 'NOT_FEASIBLE' : 'FEASIBLE',
    });
  }, [selectedItem]);

  function selectVersion(versionId: string) {
    setActiveVersionId(versionId);
    setSearchParams({ versionId });
    setMessage(null);
  }

  async function submitReview(result: ProductionReviewResult) {
    if (!selectedItem) return;

    const validationMessage = validateProductionReview({ ...reviewForm, result });

    if (validationMessage) {
      setMessage({ tone: 'error', text: validationMessage });
      return;
    }

    try {
      await productionReviewMutation.mutateAsync({
        customizationRequestVersionId: selectedItem.version.customizationRequestVersionId,
        result,
        materialAvailable: reviewForm.materialAvailability === 'AVAILABLE',
        estimatedProductionDays: result === 'FEASIBLE' ? normalizeNumber(reviewForm.estimatedProductionDays) : null,
        estimatedAdditionalCost: result === 'FEASIBLE' ? normalizeNumber(reviewForm.estimatedAdditionalCost) ?? 0 : null,
        additionalCostReason: result === 'FEASIBLE' ? reviewForm.additionalCostReason : null,
        feasibilityNote: reviewForm.feasibilityNote,
        productionRiskNote: reviewForm.productionRiskNote,
        alternativeMaterialNote: reviewForm.alternativeMaterialNote,
      });
      void queueQuery.refetch();
      setMessage({ tone: 'success', text: result === 'FEASIBLE' ? 'Submitted as feasible.' : 'Marked as not feasible.' });
    } catch (error) {
      setMessage({ tone: 'error', text: getCustomizationRequestServiceResultMessage(error) });
    }
  }

  function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage({ tone: 'success', text: 'Draft review kept locally until you submit a feasibility result.' });
  }

  return (
    <ProductionLayout activeLabel="Customization Reviews" searchPlaceholder="Search customization reviews...">
      <div className="production-workspace-page">
        <section className="production-workspace-heading">
          <div>
            <span>Production Workspace</span>
            <h2>Customization Versions</h2>
            <p>Review custom product versions, check material availability, estimate production effort, and return feasibility results.</p>
          </div>
        </section>

        <section className="production-workspace-filter-card">
          <ProductionFilterBar activeValue={statusFilter} filters={statusFilters} onChange={setStatusFilter} />
          <ProductionFilterBar activeValue={feasibilityFilter} filters={feasibilityFilters} onChange={setFeasibilityFilter} />
          <ProductionFilterBar activeValue={materialFilter} filters={materialFilters} onChange={setMaterialFilter} />
          <input
            className="production-workspace-search"
            placeholder="Search by version, request, project, or source product"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </section>

        <section className="production-workspace-summary-grid">
          <ProductionSummaryCard icon={IconClipboardCheck} label="Total Queue" value={items.length} />
          <ProductionSummaryCard icon={IconClock} label="Pending Review" value={sourceItems.filter((item) => item.version.status === 'REVIEWING' && item.version.feasibilityStatus === 'PENDING').length} />
          <ProductionSummaryCard icon={IconCurrencyDollar} label="Feasible" value={sourceItems.filter((item) => item.version.feasibilityStatus === 'FEASIBLE').length} />
          <ProductionSummaryCard icon={IconAlertTriangle} label="Not Feasible" value={sourceItems.filter((item) => item.version.feasibilityStatus === 'NOT_FEASIBLE').length} />
        </section>

        {queueQuery.isError ? (
          <section className="production-workspace-message production-workspace-message-error">
            {getCustomizationRequestServiceResultMessage(queueQuery.error)}
          </section>
        ) : null}
        {message ? <section className={`production-workspace-message production-workspace-message-${message.tone}`}>{message.text}</section> : null}

        <section className="production-workspace-grid">
          <article className="production-workspace-card">
            <header>
              <div>
                <h3>Version Review Queue</h3>
                <p>Open a custom version, then submit feasibility result.</p>
              </div>
            </header>
            <div className="production-workspace-list">
              {items.map((item) => (
                <button
                  className={`production-workspace-queue-card ${item.version.customizationRequestVersionId === selectedItem?.version.customizationRequestVersionId ? 'is-active' : ''}`}
                  key={item.version.customizationRequestVersionId}
                  type="button"
                  onClick={() => selectVersion(item.version.customizationRequestVersionId)}
                >
                  <strong>{item.version.productVersion?.versionName ?? item.version.versionTitle ?? item.request.requestTitle}</strong>
                  <ProductionStatusBadge label={getCustomizationStatusLabel(`${item.version.status}_${item.version.feasibilityStatus}`)} status={item.version.feasibilityStatus} />
                  <small>{item.project.projectId} - {item.project.projectName}</small>
                  <small>{item.sourceProductVersion.productName ?? item.sourceProductVersion.productVersionId}</small>
                  <small>Material: {getMaterialAvailability(item.version.materialAvailable)}</small>
                  <p>{item.version.designerNote || item.request.requestDescription || item.request.requestedChangeNote}</p>
                  <small>Updated {formatDate(item.version.updatedAt)}</small>
                </button>
              ))}
              {!queueQuery.isLoading && items.length === 0 ? <ProductionEmptyState message="No customization versions match the current filters." /> : null}
            </div>
          </article>

          <article className="production-workspace-card">
            <header>
              <div>
                <h3>Version Detail & Feasibility Review</h3>
                <p>Production review is editable while status is Reviewing and feasibility is Pending.</p>
              </div>
            </header>
            {selectedItem ? (
              <>
                <VersionDetail item={selectedItem} />
                {selectedItem.version.status === 'REVIEWING' && selectedItem.version.feasibilityStatus === 'PENDING' ? (
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
                    <label>
                      <span>Alternative Material Note</span>
                      <textarea className="production-workspace-textarea" rows={2} value={reviewForm.alternativeMaterialNote} onChange={(event) => setReviewForm((current) => ({ ...current, alternativeMaterialNote: event.target.value }))} />
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
                      <button className="production-workspace-button production-workspace-button-secondary" type="submit">Save Draft</button>
                      <button className="production-workspace-button" disabled={productionReviewMutation.isPending} type="button" onClick={() => void submitReview('FEASIBLE')}>Submit as Feasible</button>
                      <button className="production-workspace-button production-workspace-button-secondary" disabled={productionReviewMutation.isPending} type="button" onClick={() => void submitReview('NOT_FEASIBLE')}>Mark as Not Feasible</button>
                    </div>
                  </form>
                ) : (
                  <p className="production-workspace-muted">This version is read-only for production at its current status.</p>
                )}
              </>
            ) : (
              <ProductionEmptyState message="Select a customization version from the queue to review feasibility." />
            )}
          </article>
        </section>
      </div>
    </ProductionLayout>
  );
}

function VersionDetail({ item }: { item: ProductionCustomizationVersionQueueItemDto }) {
  const productVersion = item.version.productVersion ?? {};

  return (
    <section className="production-workspace-detail-grid production-customization-detail">
      <Field label="Project" value={`${item.project.projectId} - ${item.project.projectName}`} />
      <Field label="Proposal" value={item.proposal.proposalName} />
      <Field label="Request" value={item.request.requestTitle} />
      <Field label="Source Product Version" value={item.sourceProductVersion.versionName ?? item.sourceProductVersion.productVersionId} />
      <Field label="Custom Version" value={productVersion.versionName ?? item.version.versionTitle ?? item.version.customizationRequestVersionId} />
      <Field label="Requested Change" value={item.request.requestDescription ?? item.request.requestedChangeNote ?? '-'} />
      <Field label="Custom Dimensions" value={formatDimensions(productVersion.width, productVersion.height, productVersion.depth)} />
      <Field label="Custom Material" value={productVersion.material ?? '-'} />
      <Field label="Custom Color" value={productVersion.color ?? '-'} />
      <Field label="Designer Note" value={item.version.designerNote ?? '-'} />
      <Field label="Estimated Price" value={formatMoney(productVersion.estimatedPrice ?? productVersion.price)} />
      <Field label="Estimated Additional Cost" value={formatMoney(item.version.estimatedAdditionalCost)} />
      <Field label="Production Risk Note" value={item.version.productionRiskNote ?? '-'} />
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
    if (form.materialAvailability !== 'AVAILABLE') return 'Material availability must be available for feasible reviews.';
    if (!normalizeNumber(form.estimatedProductionDays)) return 'Estimated production days is required.';
    if (normalizeNumber(form.estimatedAdditionalCost) === null) return 'Estimated additional cost is required.';
    if ((normalizeNumber(form.estimatedAdditionalCost) ?? 0) > 0 && !form.additionalCostReason.trim()) return 'Additional cost reason is required when additional cost is greater than zero.';
    if (!form.feasibilityNote.trim()) return 'Feasibility note is required.';
    return null;
  }

  if (form.materialAvailability === 'AVAILABLE') return 'Material availability cannot be available when marking not feasible.';
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
  item: ProductionCustomizationVersionQueueItemDto,
  materialFilter: MaterialFilter,
  searchText: string,
) {
  const normalizedSearch = searchText.trim().toLowerCase();
  const materialMatches = materialFilter === 'ALL' || getMaterialAvailability(item.version.materialAvailable) === materialFilter;
  const searchMatches = !normalizedSearch
    || item.version.customizationRequestVersionId.toLowerCase().includes(normalizedSearch)
    || item.request.customizationRequestId.toLowerCase().includes(normalizedSearch)
    || item.project.projectName.toLowerCase().includes(normalizedSearch)
    || item.project.projectId.toLowerCase().includes(normalizedSearch)
    || (item.sourceProductVersion.productName ?? '').toLowerCase().includes(normalizedSearch)
    || (item.sourceProductVersion.versionName ?? '').toLowerCase().includes(normalizedSearch);

  return materialMatches && searchMatches;
}

function getMaterialAvailability(value?: boolean | null): MaterialAvailability {
  if (value === true) return 'AVAILABLE';
  if (value === false) return 'UNAVAILABLE';
  return 'UNKNOWN';
}
