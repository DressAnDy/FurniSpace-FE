import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { IconAlertCircle, IconChevronDown, IconPaperclip, IconPlus, IconX } from '@tabler/icons-react';
import { useSearchParams } from 'react-router-dom';

import type { OrderItemDto } from '@/services/api/orders';
import {
  getProductIssueErrorMessage,
  type DeliveryProductIssueType,
  type ProductIssueReportDto,
} from '@/services/api/productIssues';
import {
  useCreateProductIssue,
  useOrderProductIssues,
  useProductIssue,
  useProjectProductIssues,
} from '@/services/queries';

import './ProductIssuePanel.css';

const issueTypes: DeliveryProductIssueType[] = [
  'DAMAGED',
  'WRONG_ITEM',
  'WRONG_SPECIFICATION',
  'MISSING_PART',
  'QUALITY_DEFECT',
  'INSTALLATION_ISSUE',
  'QUANTITY_MISMATCH',
  'OTHER',
];

type ProductIssuePanelProps = {
  orderId?: string;
  projectId?: string;
  orderItems?: OrderItemDto[];
  allowCreate?: boolean;
  title?: string;
};

type CreateFormErrors = {
  product?: string;
  quantity?: string;
  description?: string;
};

export function ProductIssuePanel({
  allowCreate = false,
  orderId,
  orderItems = [],
  projectId,
  title = 'Product issues',
}: Readonly<ProductIssuePanelProps>) {
  const [searchParams] = useSearchParams();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState('');
  const [selectedOrderItemId, setSelectedOrderItemId] = useState('');
  const [issueType, setIssueType] = useState<DeliveryProductIssueType>('DAMAGED');
  const [description, setDescription] = useState('');
  const [affectedQuantity, setAffectedQuantity] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [fieldErrors, setFieldErrors] = useState<CreateFormErrors>({});
  const [formError, setFormError] = useState('');
  const orderQuery = useOrderProductIssues(orderId, { enabled: Boolean(orderId) });
  const projectQuery = useProjectProductIssues(projectId, {
    enabled: !orderId && Boolean(projectId),
  });
  const detailQuery = useProductIssue(selectedIssueId);
  const createMutation = useCreateProductIssue();
  const issues = useMemo(
    () => orderQuery.data?.items ?? projectQuery.data?.items ?? [],
    [orderQuery.data?.items, projectQuery.data?.items],
  );
  const eligibleOrderItems = useMemo(
    () => orderItems.filter((item) => (item.deliveredQuantity ?? 0) > 0),
    [orderItems],
  );
  const selectedOrderItem = eligibleOrderItems.find((item) => item.orderItemId === selectedOrderItemId) ?? null;
  const hasEligibleProducts = eligibleOrderItems.length > 0;
  const deliveredMax = selectedOrderItem?.deliveredQuantity ?? 0;
  const productNameByOrderItemId = useMemo(() => {
    const names = new Map<string, string>();
    for (const item of orderItems) {
      names.set(item.orderItemId, getItemName(item));
    }
    return names;
  }, [orderItems]);

  useEffect(() => {
    const issueId = searchParams.get('issueId');

    if (issueId) {
      setSelectedIssueId(issueId);
    }
  }, [searchParams]);

  function openCreate() {
    setSelectedOrderItemId('');
    setAffectedQuantity('');
    setFieldErrors({});
    setFormError('');
    setIsCreateOpen(true);
  }

  function handleOrderItemChange(item: OrderItemDto) {
    setSelectedOrderItemId(item.orderItemId);
    setAffectedQuantity('');
    setFieldErrors((current) => ({ ...current, product: undefined, quantity: undefined }));
    setFormError('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: CreateFormErrors = {};

    if (!selectedOrderItem) {
      nextErrors.product = 'Please select a delivered product.';
    }

    const quantity = Number(affectedQuantity);
    if (!affectedQuantity.trim()) {
      nextErrors.quantity = 'Enter how many units are affected.';
    } else if (!Number.isInteger(quantity) || quantity <= 0) {
      nextErrors.quantity = 'Affected quantity must be a positive whole number.';
    } else if (selectedOrderItem && quantity > deliveredMax) {
      nextErrors.quantity = `Value must be less than or equal to ${deliveredMax}.`;
    }

    if (!description.trim()) {
      nextErrors.description = 'Description is required.';
    }

    if (Object.keys(nextErrors).length > 0 || !orderId || !selectedOrderItem) {
      setFieldErrors(nextErrors);
      setFormError('');
      return;
    }

    setFieldErrors({});
    setFormError('');
    try {
      await createMutation.mutateAsync({
        affectedQuantity: quantity,
        description: description.trim(),
        files,
        issueType,
        orderId,
        orderItemId: selectedOrderItem.orderItemId,
      });
      setDescription('');
      setAffectedQuantity('');
      setFiles([]);
      setSelectedOrderItemId('');
      setIsCreateOpen(false);
    } catch (error) {
      setFormError(getProductIssueErrorMessage(error, 'Unable to submit the product issue.'));
    }
  }

  const activeQuery = orderId ? orderQuery : projectQuery;

  return (
    <section className={`product-issue-panel${isExpanded ? ' is-open' : ''}`}>
      <div className="product-issue-header">
        <button
          aria-expanded={isExpanded}
          className="product-issue-toggle"
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
        >
          <span>
            <strong>{title}</strong>
            <small>Reported issues for physically delivered products.</small>
          </span>
          <IconChevronDown size={18} />
        </button>
        {isExpanded && allowCreate && hasEligibleProducts ? (
          <button className="product-issue-primary" type="button" onClick={openCreate}>
            <IconPlus size={16} />
            Report an issue
          </button>
        ) : null}
      </div>

      {isExpanded ? (
        <div className="product-issue-body">
          {allowCreate && !hasEligibleProducts ? (
            <p className="product-issue-state">Issues can be reported after at least one product is physically delivered.</p>
          ) : null}
          {activeQuery.isLoading ? <p className="product-issue-state">Loading product issues...</p> : null}
          {activeQuery.isError ? (
            <p className="product-issue-state product-issue-error">
              {getProductIssueErrorMessage(activeQuery.error, 'Unable to load product issues.')}
            </p>
          ) : null}
          {!activeQuery.isLoading && !activeQuery.isError && issues.length === 0 ? (
            <p className="product-issue-state">No product issues reported.</p>
          ) : null}

          <div className="product-issue-list">
            {issues.map((issue) => (
              <button
                className="product-issue-row"
                key={issue.deliveryProductIssueReportId}
                type="button"
                onClick={() => setSelectedIssueId(issue.deliveryProductIssueReportId)}
              >
                <IconAlertCircle size={20} />
                <span>
                  <strong>{formatLabel(issue.issueType)}</strong>
                </span>
                <span>
                  <strong>{issue.affectedQuantity ? `${issue.affectedQuantity} affected` : 'Quantity not specified'}</strong>
                  <small>{formatDateTime(issue.reportedAt)}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {isCreateOpen ? (
        <div className="product-issue-modal-backdrop">
          <form className="product-issue-modal" noValidate onSubmit={handleSubmit}>
            <ModalTitle title="Report a delivered product issue" onClose={() => setIsCreateOpen(false)} />

            <section className={`product-issue-field-block product-issue-product-block${fieldErrors.product ? ' has-error' : ''}`}>
              <div className="product-issue-field-heading">
                <strong>Delivered product</strong>
                <span>Choose one product</span>
              </div>
              <div className="product-issue-product-options" role="radiogroup" aria-label="Delivered product">
                {eligibleOrderItems.map((item) => {
                  const isSelected = item.orderItemId === selectedOrderItemId;
                  return (
                    <label
                      className={`product-issue-product-option${isSelected ? ' is-selected' : ''}`}
                      key={item.orderItemId}
                    >
                      <input
                        checked={isSelected}
                        name="product-issue-product-group"
                        type="radio"
                        value={item.orderItemId}
                        onChange={() => handleOrderItemChange(item)}
                      />
                      <span>
                        <strong>{getItemName(item)}</strong>
                        <em>{item.deliveredQuantity ?? 0} delivered</em>
                      </span>
                    </label>
                  );
                })}
              </div>
              {fieldErrors.product ? <p className="product-issue-field-error">{fieldErrors.product}</p> : null}
            </section>

            <label className={`product-issue-field-block${fieldErrors.quantity ? ' has-error' : ''}`}>
              <div className="product-issue-field-heading">
                <strong>Affected quantity</strong>
                <span>{selectedOrderItem ? `Max ${deliveredMax}` : 'Select a product first'}</span>
              </div>
              <input
                aria-invalid={Boolean(fieldErrors.quantity)}
                inputMode="numeric"
                placeholder={selectedOrderItem ? `Enter 1 - ${deliveredMax}` : 'Select a product first'}
                type="number"
                value={affectedQuantity}
                onChange={(event) => {
                  setAffectedQuantity(event.target.value);
                  setFieldErrors((current) => ({ ...current, quantity: undefined }));
                  setFormError('');
                }}
              />
              {fieldErrors.quantity ? <p className="product-issue-field-error">{fieldErrors.quantity}</p> : null}
            </label>

            <label className="product-issue-field-block">
              <div className="product-issue-field-heading">
                <strong>Issue type</strong>
              </div>
              <select value={issueType} onChange={(event) => setIssueType(event.target.value as DeliveryProductIssueType)}>
                {issueTypes.map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}
              </select>
            </label>

            <label className={`product-issue-field-block product-issue-desc-block${fieldErrors.description ? ' has-error' : ''}`}>
              <div className="product-issue-field-heading">
                <strong>Description</strong>
              </div>
              <textarea
                aria-invalid={Boolean(fieldErrors.description)}
                rows={2}
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  setFieldErrors((current) => ({ ...current, description: undefined }));
                  setFormError('');
                }}
              />
              {fieldErrors.description ? <p className="product-issue-field-error">{fieldErrors.description}</p> : null}
            </label>

            <label className="product-issue-field-block product-issue-evidence-field">
              <div className="product-issue-field-heading">
                <strong>Evidence files</strong>
                <span>Optional</span>
              </div>
              <input multiple type="file" accept="image/*,.pdf" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} />
              {files.length > 0 ? (
                <small className="product-issue-field-hint">
                  <IconPaperclip size={14} /> {files.length} file(s) selected
                </small>
              ) : null}
            </label>

            {formError ? <p className="product-issue-form-error">{formError}</p> : null}

            <div className="product-issue-modal-actions">
              <button type="button" onClick={() => setIsCreateOpen(false)}>Cancel</button>
              <button className="product-issue-primary" disabled={createMutation.isPending} type="submit">
                {createMutation.isPending ? 'Submitting...' : 'Submit report'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {selectedIssueId ? (
        <ProductIssueDetail
          isLoading={detailQuery.isLoading}
          issue={detailQuery.data}
          productNameFallback={
            detailQuery.data
              ? productNameByOrderItemId.get(detailQuery.data.orderItemId)
              : undefined
          }
          onClose={() => setSelectedIssueId('')}
        />
      ) : null}
    </section>
  );
}

function ProductIssueDetail({
  isLoading,
  issue,
  onClose,
  productNameFallback,
}: Readonly<{
  isLoading: boolean;
  issue?: ProductIssueReportDto;
  onClose: () => void;
  productNameFallback?: string;
}>) {
  return (
    <div className="product-issue-modal-backdrop">
      <dialog className="product-issue-modal product-issue-detail-modal" open>
        <ModalTitle title="Product issue detail" onClose={onClose} />
        {isLoading || !issue ? (
          <p className="product-issue-detail-loading">Loading issue...</p>
        ) : (
          <div className="product-issue-detail-body">
            <header className="product-issue-detail-hero">
              <div>
                <span>Product</span>
                <strong>{issue.productNameSnapshot ?? productNameFallback ?? issue.orderItemId}</strong>
              </div>
              <em className="product-issue-detail-type">{formatLabel(issue.issueType)}</em>
            </header>

            <div className="product-issue-detail-meta">
              <Detail label="Affected quantity" value={issue.affectedQuantity?.toString() ?? '—'} />
              <Detail label="Reporter" value={issue.reporterName ?? issue.reportedBy} />
              <Detail label="Reported at" value={formatDateTime(issue.reportedAt)} />
            </div>

            <section className="product-issue-detail-section">
              <span>Description</span>
              <p>{issue.description}</p>
            </section>

            <section className="product-issue-detail-section">
              <span>Evidence</span>
              {(issue.evidenceFiles?.length ?? 0) > 0 ? (
                <div className="product-issue-evidence">
                  {issue.evidenceFiles?.map((file) => (
                    <a href={file.fileUrl} key={file.fileLinkId} rel="noreferrer" target="_blank">
                      {file.mimeType?.startsWith('image/') ? (
                        <img alt={file.originalFileName} src={file.fileUrl} />
                      ) : (
                        <IconPaperclip size={18} />
                      )}
                      <span>{file.originalFileName}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="product-issue-detail-empty">No evidence files.</p>
              )}
            </section>
          </div>
        )}
      </dialog>
    </div>
  );
}

function ModalTitle({ onClose, title }: Readonly<{ onClose: () => void; title: string }>) {
  return <div className="product-issue-modal-title"><h3>{title}</h3><button aria-label="Close" type="button" onClick={onClose}><IconX size={18} /></button></div>;
}

function Detail({ label, value }: Readonly<{ label: string; value: string }>) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function getItemName(item: OrderItemDto) {
  return item.productNameSnapshot ?? item.itemName ?? item.productVersionNameSnapshot ?? item.orderItemId;
}

function formatLabel(value: string) {
  return value.toLowerCase().split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
