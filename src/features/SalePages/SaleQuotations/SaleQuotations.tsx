import { IconCheck, IconCurrencyDollar, IconFileText, IconPlus } from '@tabler/icons-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import { SaleNavbar, SaleSidebar } from '@/features/SalePages/salecomponents';
import { getQuotationServiceResultMessage, type QuotationDto, type QuotationStatus } from '@/services/api/quotations';
import {
  useCancelQuotation,
  useCreateDraftQuotation,
  useCurrentUser,
  useProjectList,
  useProjectQuotations,
  useQuotationDetail,
  useReviseQuotation,
  useSendQuotation,
  useUpdateQuotation,
} from '@/services/queries';

import './SaleQuotations.css';

const statusOptions: Array<{ label: string; value: QuotationStatus | null }> = [
  { label: 'All', value: null },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Sent', value: 'SENT' },
  { label: 'Revision', value: 'REVISION_REQUESTED' },
  { label: 'Revised', value: 'REVISED' },
  { label: 'Accepted', value: 'ACCEPTED' },
];

export function SaleQuotations() {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<QuotationStatus | null>(null);
  const [selectedQuotationId, setSelectedQuotationId] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [taxAmount, setTaxAmount] = useState('0');
  const [salesNote, setSalesNote] = useState('');
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const currentUserQuery = useCurrentUser();
  const currentUser = currentUserQuery.data;
  const projectsQuery = useProjectList(
    {
      assignedSalesId: currentUser?.accountId,
      status: 'PROPOSAL_SELECTED',
      page: 1,
      limit: 50,
    },
    { enabled: Boolean(currentUser?.accountId) },
  );
  const quotationsQuery = useProjectQuotations(
    {
      projectId: selectedProjectId,
      status: selectedStatus,
    },
    { enabled: Boolean(selectedProjectId) },
  );
  const createDraftMutation = useCreateDraftQuotation();
  const updateQuotationMutation = useUpdateQuotation();
  const sendQuotationMutation = useSendQuotation();
  const reviseQuotationMutation = useReviseQuotation();
  const cancelQuotationMutation = useCancelQuotation();
  const quotationDetailQuery = useQuotationDetail(selectedQuotationId, { enabled: Boolean(selectedQuotationId) });
  const projects = projectsQuery.data?.items ?? [];
  const quotations = useMemo(() => quotationsQuery.data?.items ?? [], [quotationsQuery.data?.items]);
  const selectedProject = projects.find((project) => project.projectId === selectedProjectId);
  const selectedQuotation = quotationDetailQuery.data;

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].projectId);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (!selectedQuotationId && quotations.length > 0) {
      setSelectedQuotationId(quotations[0].quotationId);
    }

    if (selectedQuotationId && !quotations.some((quotation) => quotation.quotationId === selectedQuotationId)) {
      setSelectedQuotationId(quotations[0]?.quotationId ?? '');
    }
  }, [quotations, selectedQuotationId]);

  useEffect(() => {
    if (selectedQuotation) {
      setValidUntil(selectedQuotation.validUntil ?? '');
      setDiscountAmount(String(selectedQuotation.discountAmount ?? 0));
      setTaxAmount(String(selectedQuotation.taxAmount ?? 0));
      setSalesNote(selectedQuotation.salesNote ?? '');
    }
  }, [selectedQuotation]);

  async function createDraft() {
    if (!selectedProjectId) {
      setMessage({ tone: 'error', text: 'Choose a project before creating a quotation.' });
      return;
    }

    setMessage(null);

    try {
      const quotation = await createDraftMutation.mutateAsync(selectedProjectId);
      setSelectedQuotationId(quotation.quotationId);
      setMessage({ tone: 'success', text: 'Draft quotation created from the selected proposal items.' });
    } catch (error) {
      setMessage({ tone: 'error', text: getQuotationServiceResultMessage(error) });
    }
  }

  async function updateHeader(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedQuotation) return;

    setMessage(null);

    try {
      await updateQuotationMutation.mutateAsync({
        quotationId: selectedQuotation.quotationId,
        validUntil,
        discountAmount: normalizeNumber(discountAmount),
        taxAmount: normalizeNumber(taxAmount),
        customerNote: selectedQuotation.customerNote ?? null,
        salesNote,
        revisionReason: selectedQuotation.revisionReason ?? null,
      });
      setMessage({ tone: 'success', text: 'Quotation header updated.' });
    } catch (error) {
      setMessage({ tone: 'error', text: getQuotationServiceResultMessage(error) });
    }
  }

  async function runQuotationAction(action: 'send' | 'revise' | 'cancel') {
    if (!selectedQuotation) return;

    setMessage(null);

    try {
      if (action === 'send') {
        await sendQuotationMutation.mutateAsync(selectedQuotation.quotationId);
        setMessage({ tone: 'success', text: 'Quotation sent to customer.' });
      } else if (action === 'revise') {
        await reviseQuotationMutation.mutateAsync(selectedQuotation.quotationId);
        setMessage({ tone: 'success', text: 'Quotation moved to revised version.' });
      } else {
        await cancelQuotationMutation.mutateAsync(selectedQuotation.quotationId);
        setMessage({ tone: 'success', text: 'Quotation cancelled.' });
      }
    } catch (error) {
      setMessage({ tone: 'error', text: getQuotationServiceResultMessage(error) });
    }
  }

  const metrics = getMetrics(quotations);

  return (
    <div className="sale-quotations-shell">
      <SaleSidebar activeLabel="Quotations" />
      <div className="sale-quotations-content">
        <SaleNavbar />
        <main className="sale-quotations-main">
          <section className="sale-quotations-heading">
            <div>
              <h2>Quotations</h2>
              <p>Create quotations for assigned projects after the customer selects a final proposal</p>
            </div>
            <button disabled={!selectedProjectId || createDraftMutation.isPending} type="button" onClick={() => void createDraft()}>
              <IconPlus size={16} />
              {createDraftMutation.isPending ? 'Creating...' : 'Create Draft'}
            </button>
          </section>

          <section className="sale-quotations-toolbar">
            <label>
              <span>Project</span>
              <select
                value={selectedProjectId}
                onChange={(event) => {
                  setSelectedProjectId(event.target.value);
                  setSelectedQuotationId('');
                  setMessage(null);
                }}
              >
                <option value="">Select project</option>
                {projects.map((project) => (
                  <option key={project.projectId} value={project.projectId}>
                    {project.projectCode} - {project.projectName} - {formatEnumLabel(project.status)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Status</span>
              <select value={selectedStatus ?? ''} onChange={(event) => setSelectedStatus((event.target.value || null) as QuotationStatus | null)}>
                {statusOptions.map((status) => (
                  <option key={status.label} value={status.value ?? ''}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <span>Selected Project</span>
              <strong>{selectedProject ? `${selectedProject.projectCode} - ${formatEnumLabel(selectedProject.status)}` : 'No project selected'}</strong>
            </div>
          </section>

          {message ? <section className={`sale-quotations-message sale-quotations-message-${message.tone}`}>{message.text}</section> : null}
          {currentUserQuery.isError ? <section className="sale-quotations-message sale-quotations-message-error">Cannot load current sales account.</section> : null}
          {projectsQuery.isError ? <section className="sale-quotations-message sale-quotations-message-error">Cannot load projects ready for quotation.</section> : null}
          {quotationsQuery.isError ? (
            <section className="sale-quotations-message sale-quotations-message-error">{getQuotationServiceResultMessage(quotationsQuery.error)}</section>
          ) : null}

          <section className="sale-quotations-metrics">
            <article>
              <div>
                <span>Total Quotations</span>
                <strong>{metrics.total}</strong>
              </div>
              <IconFileText size={26} />
            </article>
            <article>
              <div>
                <span>Sent</span>
                <strong>{metrics.sent}</strong>
              </div>
              <IconFileText size={26} />
            </article>
            <article>
              <div>
                <span>Accepted</span>
                <strong>{metrics.accepted}</strong>
              </div>
              <IconCheck size={26} />
            </article>
            <article>
              <div>
                <span>Total Value</span>
                <strong>{formatMoney(metrics.value)}</strong>
              </div>
              <IconCurrencyDollar size={30} />
            </article>
          </section>

          <section className="sale-quotations-card">
            <header>
              <h3>Project Quotations</h3>
              <p>Quotation items are copied from selected proposal items; service fees must be manual items.</p>
            </header>
            <div className="sale-quotations-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Quotation Code</th>
                    <th>Project</th>
                    <th>Proposal</th>
                    <th>Version</th>
                    <th>Total Amount</th>
                    <th>Status</th>
                    <th>Valid Until</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quotationsQuery.isLoading ? (
                    <tr><td colSpan={8}>Loading quotations...</td></tr>
                  ) : null}
                  {!quotationsQuery.isLoading && quotations.length === 0 ? (
                    <tr><td colSpan={8}>{selectedProjectId ? 'No quotation found for this project.' : 'Select a project with Proposal Selected status to load quotations.'}</td></tr>
                  ) : null}
                  {quotations.map((quotation) => (
                    <tr key={quotation.quotationId}>
                      <td className="sale-quotations-code">{quotation.quotationCode}</td>
                      <td>
                        <strong>{selectedProject?.projectCode ?? quotation.projectId}</strong>
                        <span>{selectedProject?.projectName ?? '-'}</span>
                      </td>
                      <td>{quotation.proposalId}</td>
                      <td>
                        <span className="sale-quotations-version">v{quotation.versionNo ?? 1}</span>
                      </td>
                      <td>{formatMoney(quotation.totalAmount)}</td>
                      <td>
                        <span className={`sale-quotations-status sale-quotations-status-${statusClass(quotation.status)}`}>{formatEnumLabel(quotation.status ?? 'UNKNOWN')}</span>
                      </td>
                      <td>{quotation.validUntil ?? '-'}</td>
                      <td>
                        <button className="sale-quotations-link-button" type="button" onClick={() => setSelectedQuotationId(quotation.quotationId)}>
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {selectedQuotation ? (
            <section className="sale-quotations-card sale-quotations-detail">
              <header className="sale-quotations-detail-header">
                <div>
                  <h3>Quotation Detail - {selectedQuotation.quotationCode}</h3>
                  <p>{selectedProject ? `${selectedProject.projectCode} - ${selectedProject.projectName}` : selectedQuotation.projectId}</p>
                </div>
                <span className={`sale-quotations-status sale-quotations-status-${statusClass(selectedQuotation.status)}`}>
                  {formatEnumLabel(selectedQuotation.status ?? 'UNKNOWN')}
                </span>
              </header>

              <div className="sale-quotations-detail-grid">
                <div>
                  <span>Proposal</span>
                  <strong>{selectedQuotation.proposalId}</strong>
                </div>
                <div>
                  <span>Valid Until</span>
                  <strong>{selectedQuotation.validUntil ?? '-'}</strong>
                </div>
                <div>
                  <span>Sent Date</span>
                  <strong>{selectedQuotation.sentAt ? formatDate(selectedQuotation.sentAt) : '-'}</strong>
                </div>
                <div>
                  <span>Version</span>
                  <strong>Version {selectedQuotation.versionNo ?? 1}</strong>
                </div>
              </div>

              {canEditHeader(selectedQuotation.status) ? (
                <form className="sale-quotations-edit-form" onSubmit={updateHeader}>
                  <label>
                    <span>Valid Until</span>
                    <input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} />
                  </label>
                  <label>
                    <span>Discount</span>
                    <input min="0" type="number" value={discountAmount} onChange={(event) => setDiscountAmount(event.target.value)} />
                  </label>
                  <label>
                    <span>Tax</span>
                    <input min="0" type="number" value={taxAmount} onChange={(event) => setTaxAmount(event.target.value)} />
                  </label>
                  <label>
                    <span>Sales Note</span>
                    <input type="text" value={salesNote} onChange={(event) => setSalesNote(event.target.value)} />
                  </label>
                  <button disabled={updateQuotationMutation.isPending} type="submit">
                    {updateQuotationMutation.isPending ? 'Saving...' : 'Save Header'}
                  </button>
                </form>
              ) : null}

              <div className="sale-quotations-divider" />

              <h4>Quotation Items</h4>
              <div className="sale-quotations-table-scroll">
                <table className="sale-quotations-items-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Type</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Customization</th>
                      <th>Discount</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedQuotation.items.map((item) => (
                      <tr key={item.quotationItemId}>
                        <td>{item.itemName ?? item.productNameSnapshot ?? item.productVersionNameSnapshot ?? '-'}</td>
                        <td>{formatEnumLabel(item.itemType ?? 'UNKNOWN')}</td>
                        <td>{item.quantity ?? '-'}</td>
                        <td>{formatMoney(item.unitPrice)}</td>
                        <td>{formatMoney(item.customizationAdditionalCost)}</td>
                        <td>{formatMoney(item.discountAmount)}</td>
                        <td>{formatMoney(item.subtotalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="sale-quotations-total-list">
                <div>
                  <span>Subtotal</span>
                  <strong>{formatMoney(selectedQuotation.subtotalAmount)}</strong>
                </div>
                <div>
                  <span>Discount</span>
                  <strong className="sale-quotations-discount">-{formatMoney(selectedQuotation.discountAmount)}</strong>
                </div>
                <div>
                  <span>Tax</span>
                  <strong>{formatMoney(selectedQuotation.taxAmount)}</strong>
                </div>
                <div className="sale-quotations-total">
                  <span>Total Amount</span>
                  <strong>{formatMoney(selectedQuotation.totalAmount)}</strong>
                </div>
              </div>

              <div className="sale-quotations-actions">
                <button disabled={!canSend(selectedQuotation) || sendQuotationMutation.isPending} type="button" onClick={() => void runQuotationAction('send')}>
                  {sendQuotationMutation.isPending ? 'Sending...' : 'Send to Customer'}
                </button>
                <button disabled={selectedQuotation.status !== 'REVISION_REQUESTED' || reviseQuotationMutation.isPending} type="button" onClick={() => void runQuotationAction('revise')}>
                  {reviseQuotationMutation.isPending ? 'Revising...' : 'Revise'}
                </button>
                <button disabled={!canCancel(selectedQuotation.status) || cancelQuotationMutation.isPending} type="button" onClick={() => void runQuotationAction('cancel')}>
                  {cancelQuotationMutation.isPending ? 'Cancelling...' : 'Cancel'}
                </button>
              </div>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function getMetrics(quotations: QuotationDto[]) {
  return {
    total: quotations.length,
    sent: quotations.filter((quotation) => quotation.status === 'SENT').length,
    accepted: quotations.filter((quotation) => quotation.status === 'ACCEPTED').length,
    value: quotations.reduce((sum, quotation) => sum + (quotation.totalAmount ?? 0), 0),
  };
}

function canEditHeader(status?: QuotationStatus | null) {
  return status === 'DRAFT' || status === 'REVISION_REQUESTED' || status === 'REVISED';
}

function canCancel(status?: QuotationStatus | null) {
  return status === 'DRAFT' || status === 'REVISION_REQUESTED' || status === 'REVISED';
}

function canSend(quotation: QuotationDto & { items?: unknown[] }) {
  return (
    (quotation.status === 'DRAFT' || quotation.status === 'REVISED') &&
    Boolean(quotation.validUntil) &&
    (quotation.totalAmount ?? 0) > 0 &&
    (quotation.items?.length ?? 0) > 0
  );
}

function normalizeNumber(value: string) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function statusClass(status?: string | null) {
  return (status ?? 'unknown').toLowerCase().replace(/_/g, '-');
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

function formatMoney(value?: number | null) {
  if (typeof value !== 'number') return '-';

  return `${new Intl.NumberFormat('vi-VN').format(value)} VND`;
}
