import { type Dispatch, FormEvent, type SetStateAction, useEffect, useMemo, useState } from 'react';
import { IconAlertTriangle } from '@tabler/icons-react';

import { SaleNavbar, SaleSidebar } from '@/features/SalePages/salecomponents';
import { getQuotationServiceResultMessage, type QuotationDto, type QuotationItemDto, type QuotationStatus } from '@/services/api/quotations';
import type { ProjectListItemDto, ProjectStatus } from '@/services/api/projects';
import {
  useCancelQuotation,
  useBulkUpdateQuotationItemFinancials,
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

type QuotationItemGroup = {
  groupId: string;
  items: QuotationItemDto[];
  representative: QuotationItemDto;
  displayOrder?: number | null;
  quantity: number;
  unitPrice: number;
  grossAmount: number;
  discountAmount: number;
  totalAmount: number;
};

type SavedQuotationHeaderSnapshot = {
  quotationId: string;
  validUntil?: string | null;
  depositAmount?: number | null;
  salesNote?: string | null;
};

export function SaleQuotations() {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<QuotationStatus | null>(null);
  const [selectedQuotationId, setSelectedQuotationId] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [salesNote, setSalesNote] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [savedHeaderSnapshot, setSavedHeaderSnapshot] = useState<SavedQuotationHeaderSnapshot | null>(null);
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
  const selectedQuotationForActions = useMemo(
    () => getSavedQuotationSnapshot(selectedQuotation, savedHeaderSnapshot),
    [savedHeaderSnapshot, selectedQuotation],
  );
  const selectedProposalQuery = useProposalDetail(selectedQuotation?.proposalId, { enabled: Boolean(selectedQuotation?.proposalId) });
  const selectedProposalName = getProposalName(selectedQuotation?.proposalId, proposalNameById, selectedProposalQuery.data?.proposalName);
  const selectedQuotationItems = useMemo(
    () => {
      const sortedItems = [...(selectedQuotation?.items ?? [])].sort(
        (first, second) =>
          (first.displayOrder ?? Number.MAX_SAFE_INTEGER) - (second.displayOrder ?? Number.MAX_SAFE_INTEGER)
          || first.quotationItemId.localeCompare(second.quotationItemId),
      );

      return sortedItems;
    },
    [selectedQuotation?.items],
  );
  const selectedQuotationItemGroups = useMemo(
    () => getGroupedQuotationItems(selectedQuotationItems, financialDrafts),
    [financialDrafts, selectedQuotationItems],
  );
  const financialValidationMessage = useMemo(
    () => validateFinancialDrafts(selectedQuotation?.items ?? [], financialDrafts),
    [financialDrafts, selectedQuotation?.items],
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
      const savedHeader =
        savedHeaderSnapshot?.quotationId === selectedQuotation.quotationId
          ? savedHeaderSnapshot
          : {
            quotationId: selectedQuotation.quotationId,
            validUntil: selectedQuotation.validUntil ?? null,
            depositAmount: getQuotationDepositAmount(selectedQuotation),
            salesNote: selectedQuotation.salesNote ?? null,
          };

      setValidUntil(toDateInputValue(savedHeader.validUntil));
      setSalesNote(savedHeader.salesNote ?? '');
      setDepositAmount(String(savedHeader.depositAmount ?? ''));
      setSavedHeaderSnapshot(savedHeader);
    }
  }, [savedHeaderSnapshot, selectedQuotation]);

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

    const depositValidation = validateDepositAmount(depositAmount, selectedQuotation.totalAmount);
    if (!depositValidation.ok) {
      setMessage({ tone: 'error', text: depositValidation.message });
      return;
    }

    try {
      const updatedQuotation = await updateQuotationMutation.mutateAsync({
        quotationId: selectedQuotation.quotationId,
        validUntil: validUntilResult.value,
        customerNote: selectedQuotation.customerNote ?? null,
        salesNote,
        revisionReason: selectedQuotation.revisionReason ?? null,
        depositAmount: depositValidation.value,
      });
      const savedDepositAmount = updatedQuotation.depositAmount ?? depositValidation.value;
      const savedValidUntil = updatedQuotation.validUntil ?? validUntilResult.value;
      const savedSalesNote = updatedQuotation.salesNote ?? salesNote;

      setSavedHeaderSnapshot({
        quotationId: selectedQuotation.quotationId,
        validUntil: savedValidUntil,
        depositAmount: savedDepositAmount,
        salesNote: savedSalesNote,
      });
      setDepositAmount(String(savedDepositAmount));
      setValidUntil(toDateInputValue(savedValidUntil));
      setSalesNote(savedSalesNote);
      void quotationDetailQuery.refetch();
      setMessage({ tone: 'success', text: 'Quotation header updated.' });
    } catch (error) {
      setMessage({ tone: 'error', text: getQuotationServiceResultMessage(error) });
    }
  }

  async function saveFinancials() {
    if (!selectedQuotation || !canEditFinancials(selectedQuotation.status)) return;

    const items = selectedQuotation.items ?? [];

    if (items.length === 0) {
      setMessage({ tone: 'error', text: 'Quotation must have at least one item before saving financials.' });
      return;
    }

    const validationMessage = financialValidationMessage;

    if (validationMessage) {
      setMessage({ tone: 'error', text: validationMessage });
      return;
    }

    setMessage(null);

    try {
      await bulkFinancialsMutation.mutateAsync({
        quotationId: selectedQuotation.quotationId,
        items: items.map((item) => {
          const draft = financialDrafts[item.quotationItemId] ?? getFinancialDraft(item);

          return {
            quotationItemId: item.quotationItemId,
            discountAmount: normalizeNumber(draft.discountAmount),
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
        const quotationForAction = getSavedQuotationSnapshot(selectedQuotation, savedHeaderSnapshot) ?? selectedQuotation;
        const blockedReason = getSendBlockedReason(quotationForAction);
        if (blockedReason) {
          setMessage({ tone: 'error', text: blockedReason });
          return;
        }

        const validUntilResult = validateRequiredFutureDate(quotationForAction.validUntil, 'Quotation valid-until date');
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
              <p>Review auto-created draft quotations from selected proposals, then adjust pricing and deposit before sending.</p>
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

              <div className="sale-quotations-divider" />

              <h4>Quotation Items</h4>
              {canEditFinancials(selectedQuotation.status) ? (
                <div className="sale-quotations-item-toolbar">
                  <span>Matching items are grouped for review. Sales can update discounts in one bulk save.</span>
                  <button disabled={bulkFinancialsMutation.isPending || Boolean(financialValidationMessage)} type="button" onClick={() => void saveFinancials()}>
                    {bulkFinancialsMutation.isPending ? 'Saving...' : 'Save Discounts'}
                  </button>
                </div>
              ) : null}
              {canEditFinancials(selectedQuotation.status) && financialValidationMessage ? (
                <p className="sale-quotations-inline-error" role="alert">
                  <IconAlertTriangle aria-hidden="true" size={16} stroke={2} />
                  <span>{financialValidationMessage}</span>
                </p>
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
                    {selectedQuotationItemGroups.map((group) => {
                      const item = group.representative;
                      const editable = canEditFinancials(selectedQuotation.status);
                      const groupValidationMessage = editable ? validateFinancialDrafts(group.items, financialDrafts) : null;

                      return (
                      <tr key={group.groupId}>
                        <td>
                          {group.displayOrder ?? '-'}
                        </td>
                        <td className="sale-quotations-item-name" title={getQuotationItemGroupTitle(group)}>
                          {getQuotationItemName(item)}
                          {group.items.length > 1 ? <span>{group.items.length} matching lines merged</span> : null}
                        </td>
                        <td>{formatNumberValue(group.quantity)}</td>
                        <td>{formatMoney(group.unitPrice)}</td>
                        <td>{formatMoney(group.grossAmount)}</td>
                        <td>
                          {editable ? (
                            <GroupLineInput
                              group={group}
                              name="discountAmount"
                              value={getGroupFinancialInputValue(group, 'discountAmount', financialDrafts)}
                              error={groupValidationMessage}
                              onChange={setFinancialDrafts}
                            />
                          ) : formatMoney(group.discountAmount)}
                        </td>
                        <td>{formatMoney(group.totalAmount)}</td>
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
                <div>
                  <span>Deposit</span>
                  <strong>{formatMoney(selectedQuotationForActions?.depositAmount ?? getQuotationDepositAmount(selectedQuotation))}</strong>
                </div>
                <div className="sale-quotations-total">
                  <span>Total Amount</span>
                  <strong>{formatMoney(selectedQuotation.totalAmount)}</strong>
                </div>
              </div>

              {canEditHeader(selectedQuotation.status) ? (
                <form className="sale-quotations-edit-form" onSubmit={updateHeader}>
                  <label>
                    <span>Quotation Valid Until</span>
                    <input min={getLocalDateInputValue()} required type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} />
                  </label>
                  <label>
                    <span>Sales Note</span>
                    <input type="text" value={salesNote} onChange={(event) => setSalesNote(event.target.value)} placeholder="Note shown with the quotation" />
                  </label>
                  <label>
                    <span>Deposit Amount</span>
                    <input inputMode="decimal" value={depositAmount} onChange={(event) => setDepositAmount(event.target.value)} placeholder="Auto 30% of total if unavailable" />
                  </label>
                  <button disabled={updateQuotationMutation.isPending} type="submit">
                    {updateQuotationMutation.isPending ? 'Saving...' : 'Save Quotation Details'}
                  </button>
                </form>
              ) : null}

              <div className="sale-quotations-actions">
                <button
                  disabled={!selectedQuotationForActions || !canSend(selectedQuotationForActions) || sendQuotationMutation.isPending}
                  title={selectedQuotationForActions ? getSendBlockedReason(selectedQuotationForActions) ?? 'Send this quotation to the customer.' : undefined}
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
              {selectedQuotationForActions && getSendBlockedReason(selectedQuotationForActions) ? (
                <p className="sale-quotations-action-hint">{getSendBlockedReason(selectedQuotationForActions)}</p>
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

function GroupLineInput({
  error,
  group,
  name,
  onChange,
  small,
  value,
}: {
  error?: string | null;
  group: QuotationItemGroup;
  name: keyof FinancialDraft;
  onChange: Dispatch<SetStateAction<Record<string, FinancialDraft>>>;
  small?: boolean;
  value: string;
}) {
  return (
    <span className="sale-quotations-line-field">
      <input
        aria-invalid={error ? true : undefined}
        className={`sale-quotations-line-input${small ? ' sale-quotations-line-input-small' : ''}${error ? ' sale-quotations-line-input-error' : ''}`}
        inputMode="decimal"
        min={0}
        value={value}
        onChange={(event) => setFinancialGroupDraft(group, name, event.target.value, onChange)}
        onKeyDown={(event) => {
          if (name !== 'discountAmount') return;
          if (event.key === '-' || event.key === 'e' || event.key === 'E' || event.key === '+') {
            event.preventDefault();
          }
        }}
      />
    </span>
  );
}

function canCancel(status?: QuotationStatus | null) {
  return status === 'DRAFT' || status === 'REVISION_REQUESTED' || status === 'REVISED';
}

function getSavedQuotationSnapshot(
  quotation: (QuotationDto & { items?: unknown[] }) | undefined,
  snapshot: SavedQuotationHeaderSnapshot | null,
) {
  if (!quotation) {
    return quotation;
  }

  if (snapshot?.quotationId !== quotation.quotationId) {
    return {
      ...quotation,
      depositAmount: getQuotationDepositAmount(quotation),
    };
  }

  return {
    ...quotation,
    validUntil: snapshot.validUntil ?? quotation.validUntil,
    depositAmount: snapshot.depositAmount ?? getQuotationDepositAmount(quotation),
  };
}

function canSend(quotation: QuotationDto & { items?: unknown[] }) {
  return !getSendBlockedReason(quotation);
}

function getSendBlockedReason(quotation: QuotationDto & { items?: unknown[] }) {
  if (quotation.status === 'REVISION_REQUESTED') {
    return 'Click Revise first, then update the quotation before sending it back to the customer.';
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

  const depositValidation = validateDepositAmount(quotation.depositAmount, quotation.totalAmount);
  if (!depositValidation.ok) {
    return depositValidation.message;
  }

  return null;
}

function validateDepositAmount(value: string | number | null | undefined, totalAmount?: number | null) {
  const deposit = typeof value === 'number' ? value : normalizeMoneyInput(value ?? '');
  const total = totalAmount ?? 0;

  if (!Number.isFinite(deposit) || deposit <= 0) {
    return { ok: false as const, message: 'Deposit amount must be greater than 0 before sending this quotation.' };
  }

  if (deposit > total) {
    return { ok: false as const, message: 'Deposit amount cannot be greater than quotation total.' };
  }

  return { ok: true as const, value: deposit };
}

function getQuotationDepositAmount(quotation: Pick<QuotationDto, 'depositAmount' | 'totalAmount'>) {
  if (typeof quotation.depositAmount === 'number' && Number.isFinite(quotation.depositAmount) && quotation.depositAmount > 0) {
    return quotation.depositAmount;
  }

  return calculateDefaultDepositAmount(quotation.totalAmount);
}

function calculateDefaultDepositAmount(totalAmount?: number | null) {
  if (typeof totalAmount !== 'number' || !Number.isFinite(totalAmount) || totalAmount <= 0) {
    return null;
  }

  return Math.ceil((totalAmount * 0.3) / 1000) * 1000;
}

function normalizeNumber(value: string) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function parseFinancialInput(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return { ok: false as const, message: 'Discount is required.' };
  }

  if (!/^\d+([.,]\d+)?$/.test(trimmedValue)) {
    return { ok: false as const, message: 'Discount must be a non-negative number.' };
  }

  const parsedValue = Number(trimmedValue.replace(',', '.'));

  if (!Number.isFinite(parsedValue)) {
    return { ok: false as const, message: 'Discount must be a non-negative number.' };
  }

  if (parsedValue < 0) {
    return { ok: false as const, message: 'Discount cannot be negative.' };
  }

  return { ok: true as const, value: parsedValue };
}

function isAllowedNonNegativeNumberDraft(value: string) {
  return value === '' || /^\d*([.,]\d*)?$/.test(value);
}

function normalizeMoneyInput(value: string) {
  const parsed = Number(value.trim().replace(/\./g, '').replace(',', '.'));

  return Number.isFinite(parsed) ? parsed : 0;
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

function getGroupedQuotationItems(items: QuotationItemDto[], drafts: Record<string, FinancialDraft>) {
  const groupsByKey = new Map<string, QuotationItemDto[]>();

  for (const item of items) {
    const key = getQuotationItemGroupKey(item);
    const groupItems = groupsByKey.get(key);

    if (groupItems) {
      groupItems.push(item);
    } else {
      groupsByKey.set(key, [item]);
    }
  }

  return Array.from(groupsByKey.entries()).map(([groupId, groupItems]) => {
    const representative = groupItems[0];
    const totals = groupItems.reduce(
      (current, item) => {
        const draft = drafts[item.quotationItemId] ?? getFinancialDraft(item);
        const quantity = normalizeNumber(draft.quantity);
        const unitPrice = normalizeNumber(draft.unitPrice);
        const discountAmount = normalizeNumber(draft.discountAmount);
        const grossAmount = quantity * unitPrice;

        return {
          quantity: current.quantity + quantity,
          grossAmount: current.grossAmount + grossAmount,
          discountAmount: current.discountAmount + discountAmount,
          totalAmount: current.totalAmount + Math.max(grossAmount - discountAmount, 0),
        };
      },
      { quantity: 0, grossAmount: 0, discountAmount: 0, totalAmount: 0 },
    );

    return {
      groupId,
      items: groupItems,
      representative,
      displayOrder: representative.displayOrder,
      quantity: totals.quantity,
      unitPrice: normalizeNumber((drafts[representative.quotationItemId] ?? getFinancialDraft(representative)).unitPrice),
      grossAmount: totals.grossAmount,
      discountAmount: totals.discountAmount,
      totalAmount: totals.totalAmount,
    };
  });
}

function getQuotationItemGroupKey(item: QuotationItemDto) {
  const itemIdentity =
    item.productVersionId ??
    item.productVersionCodeSnapshot ??
    item.productVersionNameSnapshot ??
    item.productNameSnapshot ??
    item.itemName ??
    'UNKNOWN_ITEM';

  return [
    itemIdentity,
    item.productNameSnapshot ?? 'NO_PRODUCT',
    item.productVersionNameSnapshot ?? 'NO_VERSION',
    item.itemName ?? 'NO_ITEM_NAME',
    item.description ?? 'NO_DESCRIPTION',
    item.isCustomized ? 'CUSTOMIZED' : 'STANDARD',
    item.customizationNote ?? 'NO_CUSTOMIZATION_NOTE',
    item.note ?? 'NO_NOTE',
    item.unitPrice ?? 'NO_UNIT_PRICE',
  ].join('|');
}

function setFinancialGroupDraft(
  group: QuotationItemGroup,
  name: keyof FinancialDraft,
  value: string,
  setFinancialDrafts: Dispatch<SetStateAction<Record<string, FinancialDraft>>>,
) {
  setFinancialDrafts((current) => {
    const nextDrafts = { ...current };

    if (name === 'quantity') {
      const quantities = distributeTotalAcrossItems(normalizeNumber(value), group.items.length);
      group.items.forEach((item, index) => {
        nextDrafts[item.quotationItemId] = {
          ...getCurrentFinancialDraft(item, nextDrafts),
          quantity: formatDraftNumber(quantities[index] ?? 0),
        };
      });

      return nextDrafts;
    }

    if (name === 'unitPrice') {
      group.items.forEach((item) => {
        nextDrafts[item.quotationItemId] = {
          ...getCurrentFinancialDraft(item, nextDrafts),
          unitPrice: value,
        };
      });

      return nextDrafts;
    }

    if (!isAllowedNonNegativeNumberDraft(value)) {
      return current;
    }

    const parsedDiscount = parseFinancialInput(value);
    if (!parsedDiscount.ok) {
      group.items.forEach((item) => {
        nextDrafts[item.quotationItemId] = {
          ...getCurrentFinancialDraft(item, nextDrafts),
          discountAmount: value,
        };
      });

      return nextDrafts;
    }

    const discounts = distributeDiscountAcrossItems(parsedDiscount.value, group.items, nextDrafts);
    group.items.forEach((item, index) => {
      nextDrafts[item.quotationItemId] = {
        ...getCurrentFinancialDraft(item, nextDrafts),
        discountAmount: formatDraftNumber(discounts[index] ?? 0),
      };
    });

    return nextDrafts;
  });
}

function getCurrentFinancialDraft(item: QuotationItemDto, drafts: Record<string, FinancialDraft>) {
  return drafts[item.quotationItemId] ?? getFinancialDraft(item);
}

function getGroupFinancialInputValue(
  group: QuotationItemGroup,
  name: keyof FinancialDraft,
  drafts: Record<string, FinancialDraft>,
) {
  if (group.items.length === 1) {
    return getCurrentFinancialDraft(group.representative, drafts)[name];
  }

  if (name === 'quantity') return formatDraftNumber(group.quantity);
  if (name === 'unitPrice') return formatDraftNumber(group.unitPrice);

  const discountDrafts = group.items.map((item) => getCurrentFinancialDraft(item, drafts).discountAmount);
  const invalidDiscountDraft = discountDrafts.find((discountDraft) => !parseFinancialInput(discountDraft).ok);

  if (invalidDiscountDraft !== undefined) {
    return invalidDiscountDraft;
  }

  return formatDraftNumber(group.discountAmount);
}

function distributeTotalAcrossItems(total: number, itemCount: number) {
  if (itemCount <= 0) return [];
  if (itemCount === 1) return [total];
  if (total <= 0) return Array(itemCount).fill(0);

  if (!Number.isInteger(total) || total < itemCount) {
    return Array(itemCount).fill(total / itemCount);
  }

  const baseQuantity = Math.floor(total / itemCount);
  const remainder = total - baseQuantity * itemCount;

  return Array.from({ length: itemCount }, (_, index) => {
    if (index === 0) return baseQuantity + remainder;

    return baseQuantity;
  });
}

function distributeDiscountAcrossItems(totalDiscount: number, items: QuotationItemDto[], drafts: Record<string, FinancialDraft>) {
  const grossAmounts = items.map((item) => {
    const draft = getCurrentFinancialDraft(item, drafts);

    return normalizeNumber(draft.quantity) * normalizeNumber(draft.unitPrice);
  });
  const totalGross = grossAmounts.reduce((sum, grossAmount) => sum + grossAmount, 0);

  if (items.length === 0) return [];
  if (items.length === 1 || totalGross <= 0) return [totalDiscount, ...Array(Math.max(items.length - 1, 0)).fill(0)];

  let assignedDiscount = 0;

  return grossAmounts.map((grossAmount, index) => {
    if (index === grossAmounts.length - 1) {
      return Math.max(totalDiscount - assignedDiscount, 0);
    }

    const discount = Math.min((totalDiscount * grossAmount) / totalGross, grossAmount);
    assignedDiscount += discount;

    return discount;
  });
}

function validateFinancialDrafts(items: QuotationItemDto[], drafts: Record<string, FinancialDraft>) {
  const seenIds = new Set<string>();

  for (const item of items) {
    if (seenIds.has(item.quotationItemId)) {
      return 'Duplicate quotation item detected. Please reload before saving.';
    }

    seenIds.add(item.quotationItemId);
    const draft = drafts[item.quotationItemId] ?? getFinancialDraft(item);
    const quantity = item.quantity ?? 0;
    const unitPrice = item.unitPrice ?? 0;
    const discountResult = parseFinancialInput(draft.discountAmount);
    const grossAmount = quantity * unitPrice;
    const itemName = getQuotationItemName(item);

    if (quantity <= 0) return `${itemName}: current quantity must be greater than 0 before discount can be saved.`;
    if (unitPrice <= 0) return `${itemName}: current unit price must be greater than 0 before discount can be saved.`;
    if (!discountResult.ok) return `${itemName}: ${discountResult.message}`;
    const discountAmount = discountResult.value;
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

function getQuotationItemGroupTitle(group: QuotationItemGroup) {
  const itemName = getQuotationItemName(group.representative);

  if (group.items.length === 1) return itemName;

  return `${itemName} - ${group.items.length} matching quotation lines`;
}

function formatDraftNumber(value: number) {
  if (!Number.isFinite(value)) return '0';

  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function formatNumberValue(value?: number | null) {
  if (typeof value !== 'number') return '-';

  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value);
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
