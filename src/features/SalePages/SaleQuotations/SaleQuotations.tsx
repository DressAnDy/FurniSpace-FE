import { type Dispatch, FormEvent, type SetStateAction, useEffect, useMemo, useState } from 'react';

import { SaleNavbar, SaleSidebar } from '@/features/SalePages/salecomponents';
import { getQuotationServiceResultMessage, type QuotationDto, type QuotationItemDto, type QuotationStatus } from '@/services/api/quotations';
import type { ProjectListItemDto, ProjectStatus } from '@/services/api/projects';
import {
  useCancelQuotation,
  useBulkUpdateQuotationItemFinancials,
  useCreateDraftQuotation,
  useCurrentUser,
  useProjectList,
  useProjectProposals,
  useProposalDetail,
  useProjectQuotations,
  useQuotationDetail,
  useReviseQuotation,
  useSendQuotation,
  useUpdateQuotation,
} from '@/services/queries';

import './SaleQuotations.css';
import { getLocalDateInputValue, validateRequiredFutureDate } from '@/shared/utils/dateValidation';

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

type FinancialDraft = {
  quantity: string;
  unitPrice: string;
  discountAmount: string;
};

export function SaleQuotations() {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<QuotationStatus | null>(null);
  const [selectedQuotationId, setSelectedQuotationId] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [salesNote, setSalesNote] = useState('');
  const [financialDrafts, setFinancialDrafts] = useState<Record<string, FinancialDraft>>({});
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
  const updateQuotationMutation = useUpdateQuotation();
  const createDraftQuotationMutation = useCreateDraftQuotation();
  const bulkFinancialsMutation = useBulkUpdateQuotationItemFinancials();
  const sendQuotationMutation = useSendQuotation();
  const reviseQuotationMutation = useReviseQuotation();
  const cancelQuotationMutation = useCancelQuotation();
  const quotationDetailQuery = useQuotationDetail(selectedQuotationId, { enabled: Boolean(selectedQuotationId) });
  const projectProposalsQuery = useProjectProposals(
    { projectId: selectedProjectId, limit: 50 },
    { enabled: Boolean(selectedProjectId) },
  );
  const projects = useMemo(() => projectsQuery.data?.items ?? [], [projectsQuery.data?.items]);
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
  const proposalNameById = useMemo(
    () => new Map((projectProposalsQuery.data?.items ?? []).map((proposal) => [proposal.proposalId, proposal.proposalName])),
    [projectProposalsQuery.data?.items],
  );
  const selectedProject = quotationProjects.find((project) => project.projectId === selectedProjectId);
  const selectedQuotation = quotationDetailQuery.data;
  const selectedProposalQuery = useProposalDetail(selectedQuotation?.proposalId, { enabled: Boolean(selectedQuotation?.proposalId) });
  const selectedProposalName = getProposalName(selectedQuotation?.proposalId, proposalNameById, selectedProposalQuery.data?.proposalName);
  const selectedQuotationItems = useMemo(
    () =>
      [...(selectedQuotation?.items ?? [])].sort(
        (first, second) =>
          (first.displayOrder ?? Number.MAX_SAFE_INTEGER) - (second.displayOrder ?? Number.MAX_SAFE_INTEGER)
          || first.quotationItemId.localeCompare(second.quotationItemId),
      ),
    [selectedQuotation?.items],
  );

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
      setValidUntil(toDateInputValue(selectedQuotation.validUntil));
      setSalesNote(selectedQuotation.salesNote ?? '');
    }
  }, [selectedQuotation]);

  useEffect(() => {
    setFinancialDrafts(getFinancialDrafts(selectedQuotation?.items ?? []));
  }, [selectedQuotation?.items, selectedQuotation?.quotationId]);

  async function updateHeader(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedQuotation) return;

    setMessage(null);

    const validUntilResult = validateRequiredFutureDate(validUntil, 'Quotation valid-until date');
    if (!validUntilResult.ok) {
      setMessage({ tone: 'error', text: validUntilResult.message });
      return;
    }

    try {
      await updateQuotationMutation.mutateAsync({
        quotationId: selectedQuotation.quotationId,
        validUntil: validUntilResult.value,
        customerNote: selectedQuotation.customerNote ?? null,
        salesNote,
        revisionReason: selectedQuotation.revisionReason ?? null,
      });
      setMessage({ tone: 'success', text: 'Quotation header updated.' });
    } catch (error) {
      setMessage({ tone: 'error', text: getQuotationServiceResultMessage(error) });
    }
  }

  async function createDraftQuotationForSelectedProject() {
    if (!selectedProject || selectedProject.status !== 'PROPOSAL_SELECTED') return;

    setMessage(null);

    try {
      const quotation = await createDraftQuotationMutation.mutateAsync(selectedProject.projectId);
      setSelectedQuotationId(quotation.quotationId);
      setSelectedStatus(null);
      setProjectView('finalized');
      setMessage({ tone: 'success', text: 'Draft quotation created from the selected proposal.' });
    } catch (error) {
      setMessage({ tone: 'error', text: getQuotationServiceResultMessage(error) });
    }
  }

  async function saveFinancials() {
    if (!selectedQuotation || !canEditFinancials(selectedQuotation.status)) return;

    const validationMessage = validateFinancialDrafts(selectedQuotation.items ?? [], financialDrafts);

    if (validationMessage) {
      setMessage({ tone: 'error', text: validationMessage });
      return;
    }

    setMessage(null);

    try {
      await bulkFinancialsMutation.mutateAsync({
        quotationId: selectedQuotation.quotationId,
        items: (selectedQuotation.items ?? []).map((item) => {
          const draft = financialDrafts[item.quotationItemId];

          return {
            quotationItemId: item.quotationItemId,
            quantity: normalizeNumber(draft?.quantity),
            unitPrice: normalizeNumber(draft?.unitPrice),
            discountAmount: normalizeNumber(draft?.discountAmount),
          };
        }),
      });
      setMessage({ tone: 'success', text: 'Quotation item financials updated.' });
    } catch (error) {
      setMessage({ tone: 'error', text: getQuotationServiceResultMessage(error) });
    }
  }

  async function runQuotationAction(action: 'send' | 'revise' | 'cancel') {
    if (!selectedQuotation) return;

    setMessage(null);

    try {
      if (action === 'send') {
        const validUntilResult = validateRequiredFutureDate(selectedQuotation.validUntil, 'Quotation valid-until date');
        if (!validUntilResult.ok) {
          setMessage({ tone: 'error', text: validUntilResult.message });
          return;
        }
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


  return (
    <div className="sale-quotations-shell">
      <SaleSidebar activeLabel="Quotations" />
      <div className="sale-quotations-content">
        <SaleNavbar />
        <main className="sale-quotations-main">
          <section className="sale-quotations-heading">
            <div>
              <h2>Quotations</h2>
              <p>Create official quotations from customer-selected proposals, then review pricing before sending.</p>
            </div>
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
                <button
                  disabled={
                    !selectedProject
                    || selectedProject.status !== 'PROPOSAL_SELECTED'
                    || quotations.length > 0
                    || createDraftQuotationMutation.isPending
                    || quotationsQuery.isLoading
                  }
                  title={getCreateDraftBlockedReason(selectedProject, quotations.length, quotationsQuery.isLoading)}
                  type="button"
                  onClick={() => void createDraftQuotationForSelectedProject()}
                >
                  {createDraftQuotationMutation.isPending ? 'Creating...' : 'Create Draft Quotation'}
                </button>
              </section>

              <section className="sale-quotations-card">
                <header>
                  <h3>Project Quotations</h3>
                  <p>Quotation items are copied from selected proposal items; adjust item financials before sending.</p>
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
                      </tr>
                    </thead>
                    <tbody>
                      {quotationsQuery.isLoading ? (
                        <tr><td colSpan={7}>Loading quotations...</td></tr>
                      ) : null}
                      {!quotationsQuery.isLoading && quotations.length === 0 ? (
                        <tr><td colSpan={7}>{selectedProjectId ? 'No quotation found for this project.' : 'Select a project to load quotations.'}</td></tr>
                      ) : null}
                      {quotations.map((quotation) => (
                        <tr key={quotation.quotationId}>
                          <td className="sale-quotations-code" title={quotation.quotationCode}>{formatQuotationCode(quotation.quotationCode)}</td>
                          <td>
                            <strong>{selectedProject?.projectCode ?? quotation.projectId}</strong>
                            <span>{selectedProject?.projectName ?? '-'}</span>
                          </td>
                          <td className="sale-quotations-truncate" title={getProposalName(quotation.proposalId, proposalNameById)}>{getProposalName(quotation.proposalId, proposalNameById)}</td>
                          <td>
                            <span className="sale-quotations-version">v{quotation.versionNo ?? 1}</span>
                          </td>
                          <td>{formatMoney(quotation.totalAmount)}</td>
                          <td>
                            <span className={`sale-quotations-status sale-quotations-status-${statusClass(quotation.status)}`}>{formatEnumLabel(quotation.status ?? 'UNKNOWN')}</span>
                          </td>
                          <td>{quotation.validUntil ?? '-'}</td>
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
                  <h3>Quotation Detail - {formatQuotationCode(selectedQuotation.quotationCode)}</h3>
                  <p>{selectedProject ? `${selectedProject.projectCode} - ${selectedProject.projectName}` : selectedQuotation.projectId}</p>
                </div>
                <span className={`sale-quotations-status sale-quotations-status-${statusClass(selectedQuotation.status)}`}>
                  {formatEnumLabel(selectedQuotation.status ?? 'UNKNOWN')}
                </span>
              </header>

              <div className="sale-quotations-detail-grid">
                <div>
                  <span>Proposal</span>
                  <strong title={selectedProposalName}>{selectedProposalName}</strong>
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
                    <input min={getLocalDateInputValue()} required type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} />
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
              {canEditFinancials(selectedQuotation.status) ? (
                <div className="sale-quotations-item-toolbar">
                  <span>Financial inputs are editable; calculated amounts are read-only from backend.</span>
                  <button disabled={bulkFinancialsMutation.isPending} type="button" onClick={() => void saveFinancials()}>
                    {bulkFinancialsMutation.isPending ? 'Saving...' : 'Save Item Financials'}
                  </button>
                </div>
              ) : null}
              <div className="sale-quotations-table-scroll">
                <table className="sale-quotations-items-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Item</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Gross</th>
                      <th>Discount</th>
                      <th>Line Total (before VAT)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedQuotationItems.map((item) => {
                      const draft = financialDrafts[item.quotationItemId] ?? getFinancialDraft(item);
                      const editable = canEditFinancials(selectedQuotation.status);

                      return (
                      <tr key={item.quotationItemId}>
                        <td>
                          {item.displayOrder ?? '-'}
                        </td>
                        <td className="sale-quotations-item-name" title={getQuotationItemName(item)}>{getQuotationItemName(item)}</td>
                        <td>{editable ? <LineInput itemId={item.quotationItemId} name="quantity" value={draft.quantity} onChange={setFinancialDrafts} /> : item.quantity ?? '-'}</td>
                        <td>{editable ? <LineInput itemId={item.quotationItemId} name="unitPrice" value={draft.unitPrice} onChange={setFinancialDrafts} /> : formatMoney(item.unitPrice)}</td>
                        <td>{formatMoney(item.grossAmount)}</td>
                        <td>{editable ? <LineInput itemId={item.quotationItemId} name="discountAmount" value={draft.discountAmount} onChange={setFinancialDrafts} /> : formatMoney(item.discountAmount)}</td>
                        <td>{formatMoney(item.totalAmount)}</td>
                      </tr>
                    );
                    })}
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
                  <strong className="sale-quotations-discount">-{formatMoney(selectedQuotation.totalDiscountAmount)}</strong>
                </div>
                <div>
                  <span>Before VAT</span>
                  <strong>{formatMoney(selectedQuotation.preVatAmount)}</strong>
                </div>
                <div>
                  <span>VAT {formatPercentRate(selectedQuotation.vatRate)}</span>
                  <strong>{formatMoney(selectedQuotation.vatAmount)}</strong>
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

function canEditHeader(status?: QuotationStatus | null) {
  return status === 'DRAFT' || status === 'REVISION_REQUESTED' || status === 'REVISED';
}

function canEditFinancials(status?: QuotationStatus | null) {
  return canEditHeader(status);
}

function LineInput({
  itemId,
  name,
  onChange,
  small,
  value,
}: {
  itemId: string;
  name: keyof FinancialDraft;
  onChange: Dispatch<SetStateAction<Record<string, FinancialDraft>>>;
  small?: boolean;
  value: string;
}) {
  return (
    <input
      className={`sale-quotations-line-input${small ? ' sale-quotations-line-input-small' : ''}`}
      inputMode="decimal"
      value={value}
      onChange={(event) => setFinancialDraft(itemId, name, event.target.value, onChange)}
    />
  );
}

function canCancel(status?: QuotationStatus | null) {
  return status === 'DRAFT' || status === 'REVISION_REQUESTED' || status === 'REVISED';
}

function canSend(quotation: QuotationDto & { items?: unknown[] }) {
  return !getSendBlockedReason(quotation);
}

function getCreateDraftBlockedReason(project: ProjectListItemDto | undefined, quotationCount: number, isLoading: boolean) {
  if (isLoading) return 'Loading existing quotations for this project.';
  if (!project) return 'Select a project waiting for quotation.';
  if (project.status !== 'PROPOSAL_SELECTED') return 'Draft quotation can only be created after the customer selects a final proposal.';
  if (quotationCount > 0) return 'This project already has a quotation.';

  return 'Create a Sales-owned draft quotation from the selected proposal.';
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

function getFinancialDrafts(items: QuotationItemDto[]) {
  return Object.fromEntries(items.map((item) => [item.quotationItemId, getFinancialDraft(item)]));
}

function getFinancialDraft(item: QuotationItemDto): FinancialDraft {
  return {
    quantity: String(item.quantity ?? 0),
    unitPrice: String(item.unitPrice ?? 0),
    discountAmount: String(item.discountAmount ?? 0),
  };
}

function setFinancialDraft(
  quotationItemId: string,
  name: keyof FinancialDraft,
  value: string,
  setFinancialDrafts: Dispatch<SetStateAction<Record<string, FinancialDraft>>>,
) {
  setFinancialDrafts((current) => ({
    ...current,
    [quotationItemId]: {
      ...(current[quotationItemId] ?? {
        quantity: '0',
        unitPrice: '0',
        discountAmount: '0',
      }),
      [name]: value,
    },
  }));
}

function validateFinancialDrafts(items: QuotationItemDto[], drafts: Record<string, FinancialDraft>) {
  const seenIds = new Set<string>();

  for (const item of items) {
    if (seenIds.has(item.quotationItemId)) {
      return 'Duplicate quotation item detected. Please reload before saving.';
    }

    seenIds.add(item.quotationItemId);
    const draft = drafts[item.quotationItemId] ?? getFinancialDraft(item);
    const quantity = normalizeNumber(draft.quantity);
    const unitPrice = normalizeNumber(draft.unitPrice);
    const discountAmount = normalizeNumber(draft.discountAmount);
    const grossAmount = quantity * unitPrice;
    const itemName = getQuotationItemName(item);

    if (quantity <= 0) return `${itemName}: quantity must be greater than 0.`;
    if (unitPrice < 0) return `${itemName}: unit price cannot be negative.`;
    if (discountAmount < 0) return `${itemName}: discount cannot be negative.`;
    if (discountAmount > grossAmount) return `${itemName}: discount cannot exceed gross amount.`;
  }

  return null;
}

function formatQuotationCode(value?: string | null) {
  if (!value) return '-';

  const [, suffix] = value.split('-', 2);
  return (suffix || value).slice(0, 6);
}

function getProposalName(proposalId?: string | null, proposalNameById?: Map<string, string>, fallbackName?: string | null) {
  if (!proposalId) return '-';

  return proposalNameById?.get(proposalId) ?? fallbackName ?? proposalId;
}

function getQuotationItemName(item: Pick<QuotationItemDto, 'itemName' | 'productNameSnapshot' | 'productVersionNameSnapshot'>) {
  return item.itemName ?? item.productNameSnapshot ?? item.productVersionNameSnapshot ?? '-';
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

function toDateInputValue(value?: string | null) {
  if (!value) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  return parsedDate.toISOString().slice(0, 10);
}

function formatMoney(value?: number | null) {
  if (typeof value !== 'number') return '-';

  return `${new Intl.NumberFormat('vi-VN').format(value)} VND`;
}

function formatPercentRate(value?: number | null) {
  if (typeof value !== 'number') return '-';

  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value * 100)}%`;
}
