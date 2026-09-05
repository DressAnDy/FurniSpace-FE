import { type FormEvent, useMemo, useState } from 'react';
import { IconAlertCircle, IconPaperclip, IconPlus, IconX } from '@tabler/icons-react';

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

export function ProductIssuePanel({
  allowCreate = false,
  orderId,
  orderItems = [],
  projectId,
  title = 'Product issues',
}: Readonly<ProductIssuePanelProps>) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState('');
  const [orderItemId, setOrderItemId] = useState('');
  const [issueType, setIssueType] = useState<DeliveryProductIssueType>('DAMAGED');
  const [description, setDescription] = useState('');
  const [affectedQuantity, setAffectedQuantity] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState('');
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
  const eligibleItems = useMemo(
    () => orderItems.filter((item) => (item.deliveredQuantity ?? 0) > 0),
    [orderItems],
  );
  const selectedItem = eligibleItems.find((item) => item.orderItemId === orderItemId);

  function openCreate() {
    setOrderItemId(eligibleItems[0]?.orderItemId ?? '');
    setMessage('');
    setIsCreateOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!orderId || !orderItemId || !description.trim()) {
      setMessage('Product and description are required.');
      return;
    }

    const quantity = affectedQuantity ? Number(affectedQuantity) : null;
    if (quantity != null && (!Number.isInteger(quantity) || quantity <= 0)) {
      setMessage('Affected quantity must be a positive whole number.');
      return;
    }

    setMessage('');
    try {
      await createMutation.mutateAsync({
        affectedQuantity: quantity,
        description: description.trim(),
        files,
        issueType,
        orderId,
        orderItemId,
      });
      setDescription('');
      setAffectedQuantity('');
      setFiles([]);
      setIsCreateOpen(false);
    } catch (error) {
      setMessage(getProductIssueErrorMessage(error));
    }
  }

  const activeQuery = orderId ? orderQuery : projectQuery;

  return (
    <section className="product-issue-panel">
      <div className="product-issue-header">
        <div>
          <h3>{title}</h3>
          <p>Reported issues for physically delivered products.</p>
        </div>
        {allowCreate && eligibleItems.length > 0 ? (
          <button className="product-issue-primary" type="button" onClick={openCreate}>
            <IconPlus size={16} />
            Report an issue
          </button>
        ) : null}
      </div>

      {allowCreate && eligibleItems.length === 0 ? (
        <p className="product-issue-state">Issues can be reported after at least one product is physically delivered.</p>
      ) : null}
      {activeQuery.isLoading ? <p className="product-issue-state">Loading product issues...</p> : null}
      {activeQuery.isError ? (
        <p className="product-issue-state product-issue-error">
          {getProductIssueErrorMessage(activeQuery.error)}
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
              <small>{issue.productNameSnapshot ?? issue.orderItemId}</small>
            </span>
            <span>
              <strong>{issue.affectedQuantity ? `${issue.affectedQuantity} affected` : 'Quantity not specified'}</strong>
              <small>{formatDateTime(issue.reportedAt)}</small>
            </span>
          </button>
        ))}
      </div>

      {isCreateOpen ? (
        <div className="product-issue-modal-backdrop">
          <form className="product-issue-modal" onSubmit={handleSubmit}>
            <ModalTitle title="Report a delivered product issue" onClose={() => setIsCreateOpen(false)} />
            <label>
              <span>Delivered product</span>
              <select required value={orderItemId} onChange={(event) => setOrderItemId(event.target.value)}>
                {eligibleItems.map((item) => (
                  <option key={item.orderItemId} value={item.orderItemId}>
                    {getItemName(item)} ({item.deliveredQuantity ?? 0} delivered)
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Issue type</span>
              <select value={issueType} onChange={(event) => setIssueType(event.target.value as DeliveryProductIssueType)}>
                {issueTypes.map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}
              </select>
            </label>
            <label>
              <span>Affected quantity (optional)</span>
              <input
                inputMode="numeric"
                max={selectedItem?.deliveredQuantity ?? undefined}
                min={1}
                type="number"
                value={affectedQuantity}
                onChange={(event) => setAffectedQuantity(event.target.value)}
              />
            </label>
            <label>
              <span>Description</span>
              <textarea required rows={5} value={description} onChange={(event) => setDescription(event.target.value)} />
            </label>
            <label>
              <span>Evidence files (optional)</span>
              <input multiple type="file" accept="image/*,.pdf" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} />
            </label>
            {files.length > 0 ? <small><IconPaperclip size={14} /> {files.length} file(s) selected</small> : null}
            {message ? <p className="product-issue-error">{message}</p> : null}
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
}: Readonly<{
  isLoading: boolean;
  issue?: ProductIssueReportDto;
  onClose: () => void;
}>) {
  return (
    <div className="product-issue-modal-backdrop">
      <dialog className="product-issue-modal" open>
        <ModalTitle title="Product issue detail" onClose={onClose} />
        {isLoading || !issue ? <p>Loading issue...</p> : (
          <>
            <div className="product-issue-detail-grid">
              <Detail label="Product" value={issue.productNameSnapshot ?? issue.orderItemId} />
              <Detail label="Issue type" value={formatLabel(issue.issueType)} />
              <Detail label="Affected quantity" value={issue.affectedQuantity?.toString() ?? '-'} />
              <Detail label="Reporter" value={issue.reporterName ?? issue.reportedBy} />
              <Detail label="Reported at" value={formatDateTime(issue.reportedAt)} />
              <div className="product-issue-detail-wide"><Detail label="Description" value={issue.description} /></div>
            </div>
            {(issue.evidenceFiles?.length ?? 0) > 0 ? (
              <div className="product-issue-evidence">
                <strong>Evidence</strong>
                {issue.evidenceFiles?.map((file) => (
                  <a href={file.fileUrl} key={file.fileLinkId} rel="noreferrer" target="_blank">
                    {file.mimeType?.startsWith('image/') ? <img alt={file.originalFileName} src={file.fileUrl} /> : <IconPaperclip size={18} />}
                    <span>{file.originalFileName}</span>
                  </a>
                ))}
              </div>
            ) : <p className="product-issue-state">No evidence files.</p>}
          </>
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
