import { IconCheck, IconCurrencyDollar, IconFileText, IconPlus } from '@tabler/icons-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import { SaleNavbar, SaleSidebar } from '@/features/SalePages/salecomponents';
import { getQuotationServiceResultMessage, type QuotationDto, type QuotationStatus } from '@/services/api/quotations';
import type { ProjectListItemDto, ProjectStatus } from '@/services/api/projects';
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

const pendingQuotationProjectStatuses = new Set<ProjectStatus>(['PROPOSAL_SELECTED']);

const finalizedQuotationProjectStatuses = new Set<ProjectStatus>([
  'QUOTATION_SENT',
  'QUOTATION_REVISION_REQUESTED',
  'ORDER_CONFIRMED',
  'IN_PRODUCTION',
  'PRODUCTION_BLOCKED',
  'READY_FOR_DELIVERY',
  'DELIVERING',
  'DELIVERED',
  'COMPLETED',
]);

type QuotationProjectView = 'pending' | 'finalized';

export function SaleQuotations() {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<QuotationStatus | null>(null);
  const [selectedQuotationId, setSelectedQuotationId] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [taxAmount, setTaxAmount] = useState('0');
  const [salesNote, setSalesNote] = useState('');
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [projectView, setProjectView] = useState<QuotationProjectView>('pending');
  const currentUserQuery = useCurrentUser();
  const currentUser = currentUserQuery.data;
  const projectsQuery = useProjectList(
    {
      assignedSalesId: currentUser?.accountId,
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
  const pendingQuotationProjects = useMemo(
    () => projects.filter((project) => pendingQuotationProjectStatuses.has(project.status)),
    [projects],
  );
  const finalizedQuotationProjects = useMemo(
    () => projects.filter((project) => finalizedQuotationProjectStatuses.has(project.status)),
    [projects],
  );
  const quotationProjects = useMemo(
    () => [...pendingQuotationProjects, ...finalizedQuotationProjects],
    [finalizedQuotationProjects, pendingQuotationProjects],
  );
  const visibleProjectGroup = projectView === 'pending' ? pendingQuotationProjects : finalizedQuotationProjects;
  const visibleProjectGroupTitle = projectView === 'pending' ? 'Waiting for quotation' : 'Quotation finalized';
  const visibleProjectGroupEmptyText =
    projectView === 'pending' ? 'No project is waiting for quotation.' : 'No project has a finalized quotation yet.';
  const quotations = useMemo(() => quotationsQuery.data?.items ?? [], [quotationsQuery.data?.items]);
  const selectedProject = quotationProjects.find((project) => project.projectId === selectedProjectId);
  const canCreateDraftForSelectedProject = selectedProject?.status === 'PROPOSAL_SELECTED';
  const selectedQuotation = quotationDetailQuery.data;

  useEffect(() => {
    if (!selectedProjectId && quotationProjects.length > 0) {
      setSelectedProjectId(quotationProjects[0].projectId);
    }
  }, [quotationProjects, selectedProjectId]);

  useEffect(() => {
    if (projectView === 'pending' && pendingQuotationProjects.length === 0 && finalizedQuotationProjects.length > 0) {
      setProjectView('finalized');
      setSelectedProjectId(finalizedQuotationProjects[0].projectId);
      setSelectedQuotationId('');
      return;
    }

    if (projectView === 'finalized' && finalizedQuotationProjects.length === 0 && pendingQuotationProjects.length > 0) {
      setProjectView('pending');
      setSelectedProjectId(pendingQuotationProjects[0].projectId);
      setSelectedQuotationId('');
    }
  }, [finalizedQuotationProjects, pendingQuotationProjects, projectView]);

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

    if (!canCreateDraftForSelectedProject) {
      setMessage({ tone: 'error', text: 'Draft quotations can only be created for projects waiting for quotation.' });
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
            <button disabled={!canCreateDraftForSelectedProject || createDraftMutation.isPending} type="button" onClick={() => void createDraft()}>
              <IconPlus size={16} />
              {createDraftMutation.isPending ? 'Creating...' : 'Create Draft'}
            </button>
          </section>

          {message ? <section className={`sale-quotations-message sale-quotations-message-${message.tone}`}>{message.text}</section> : null}
          {currentUserQuery.isError ? <section className="sale-quotations-message sale-quotations-message-error">Cannot load current sales account.</section> : null}
          {projectsQuery.isError ? <section className="sale-quotations-message sale-quotations-message-error">Cannot load projects ready for quotation.</section> : null}
          {quotationsQuery.isError ? (
            <section className="sale-quotations-message sale-quotations-message-error">{getQuotationServiceResultMessage(quotationsQuery.error)}</section>
          ) : null}

          <section className="sale-quotations-layout">
            <aside className="sale-quotations-project-panel">
              <header>
                <h3>Projects</h3>
                <p>Select a project to manage quotations.</p>
              </header>
              <div className="sale-quotations-project-tabs" role="tablist" aria-label="Quotation project lists">
                <button
                  className={projectView === 'pending' ? 'is-active' : ''}
                  type="button"
                  role="tab"
                  aria-selected={projectView === 'pending'}
                  onClick={() => {
                    setProjectView('pending');
                    setSelectedProjectId(pendingQuotationProjects[0]?.projectId ?? '');
                    setSelectedQuotationId('');
                    setMessage(null);
                  }}
                >
                  Waiting
                  <span>{pendingQuotationProjects.length}</span>
                </button>
                <button
                  className={projectView === 'finalized' ? 'is-active' : ''}
                  type="button"
                  role="tab"
                  aria-selected={projectView === 'finalized'}
                  onClick={() => {
                    setProjectView('finalized');
                    setSelectedProjectId(finalizedQuotationProjects[0]?.projectId ?? '');
                    setSelectedQuotationId('');
                    setMessage(null);
                  }}
                >
                  Finalized
                  <span>{finalizedQuotationProjects.length}</span>
                </button>
              </div>
              <ProjectGroup
                emptyText={visibleProjectGroupEmptyText}
                projects={visibleProjectGroup}
                selectedProjectId={selectedProjectId}
                title={visibleProjectGroupTitle}
                onSelect={(projectId) => {
                  setSelectedProjectId(projectId);
                  setSelectedQuotationId('');
                  setMessage(null);
                }}
              />
            </aside>

            <section className="sale-quotations-workspace">
              <section className="sale-quotations-toolbar">
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

              <section className="sale-quotations-metrics">
                <MetricCard icon={IconFileText} label="Total" value={String(metrics.total)} />
                <MetricCard icon={IconFileText} label="Sent" value={String(metrics.sent)} />
                <MetricCard icon={IconCheck} label="Accepted" value={String(metrics.accepted)} />
                <MetricCard icon={IconCurrencyDollar} label="Value" value={formatMoney(metrics.value)} />
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
                        <tr><td colSpan={8}>{selectedProjectId ? 'No quotation found for this project.' : 'Select a project to load quotations.'}</td></tr>
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
                <button
                  disabled={!canSend(selectedQuotation) || sendQuotationMutation.isPending}
                  title={getSendBlockedReason(selectedQuotation) ?? 'Send this quotation to the customer.'}
                  type="button"
                  onClick={() => void runQuotationAction('send')}
                >
                  {sendQuotationMutation.isPending ? 'Sending...' : 'Send to Customer'}
                </button>
                <button disabled={selectedQuotation.status !== 'REVISION_REQUESTED' || reviseQuotationMutation.isPending} type="button" onClick={() => void runQuotationAction('revise')}>
                  {reviseQuotationMutation.isPending ? 'Revising...' : 'Revise'}
                </button>
                <button disabled={!canCancel(selectedQuotation.status) || cancelQuotationMutation.isPending} type="button" onClick={() => void runQuotationAction('cancel')}>
                  {cancelQuotationMutation.isPending ? 'Cancelling...' : 'Cancel'}
                </button>
              </div>
              {getSendBlockedReason(selectedQuotation) ? (
                <p className="sale-quotations-action-hint">{getSendBlockedReason(selectedQuotation)}</p>
              ) : null}
            </section>
              ) : null}
            </section>
          </section>
        </main>
      </div>
    </div>
  );
}

function ProjectGroup({
  emptyText,
  onSelect,
  projects,
  selectedProjectId,
  title,
}: {
  emptyText: string;
  onSelect: (projectId: string) => void;
  projects: ProjectListItemDto[];
  selectedProjectId: string;
  title: string;
}) {
  return (
    <section className="sale-quotations-project-group">
      <div>
        <strong>{title}</strong>
        <span>{projects.length}</span>
      </div>
      {projects.length === 0 ? <p>{emptyText}</p> : null}
      {projects.map((project) => (
        <button
          className={project.projectId === selectedProjectId ? 'is-active' : ''}
          key={project.projectId}
          type="button"
          onClick={() => onSelect(project.projectId)}
        >
          <strong>{project.projectName}</strong>
          <span>{project.projectCode}</span>
          <em>{formatEnumLabel(project.status)}</em>
        </button>
      ))}
    </section>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof IconFileText; label: string; value: string }) {
  return (
    <article>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <Icon size={20} />
    </article>
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
  return !getSendBlockedReason(quotation);
}

function getSendBlockedReason(quotation: QuotationDto & { items?: unknown[] }) {
  if (quotation.status === 'REVISION_REQUESTED') {
    return 'Click Revise first, then update the quotation before sending it back to the customer.';
  }

  if (quotation.status !== 'DRAFT' && quotation.status !== 'REVISED') {
    return `Only Draft or Revised quotations can be sent. Current status: ${formatEnumLabel(quotation.status ?? 'UNKNOWN')}.`;
  }

  if (!quotation.validUntil) {
    return 'Set and save a valid-until date before sending this quotation.';
  }

  if ((quotation.items?.length ?? 0) === 0) {
    return 'Add at least one quotation item before sending this quotation.';
  }

  if ((quotation.totalAmount ?? 0) <= 0) {
    return 'Quotation total must be greater than 0 before sending.';
  }

  return null;
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
