import {
  IconArrowRight,
  IconChevronRight,
  IconHome,
  IconRefresh
} from '@tabler/icons-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { CustomerNavbar } from '@/features/CustomerPages/customercomponents';
import { getQuotationServiceResultMessage, type QuotationDto, type QuotationItemDto, type QuotationStatus } from '@/services/api/quotations';
import type { ProjectListItemDto } from '@/services/api/projects';
import {
  useAcceptQuotation,
  useProjectList,
  useProjectProposals,
  useProposalDetail,
  useProjectQuotations,
  useQuotationDetail,
  useRejectQuotation,
  useRequestQuotationRevision,
} from '@/services/queries';
import { aggregateDuplicateItems } from '@/shared/utils/itemAggregation';

import './CustomerQuotationsPage.css';

const quotationProjectStatuses = new Set([
  'QUOTATION_SENT',
  'QUOTATION_REVISION_REQUESTED',
  'ORDER_CONFIRMED',
  'IN_PRODUCTION',
  'READY_FOR_DELIVERY',
  'DELIVERING',
  'DELIVERED',
  'COMPLETED',
]);

export function CustomerQuotationsPage() {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedQuotationId, setSelectedQuotationId] = useState('');
  const [revisionReason, setRevisionReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const projectsQuery = useProjectList({ page: 1, limit: 50 });
  const projects = useMemo(() => projectsQuery.data?.items ?? [], [projectsQuery.data?.items]);
  const quotationProjects = useMemo(() => getQuotationProjects(projects), [projects]);
  const quotationsQuery = useProjectQuotations({ projectId: selectedProjectId }, { enabled: Boolean(selectedProjectId) });
  const projectProposalsQuery = useProjectProposals(
    { projectId: selectedProjectId, limit: 50 },
    { enabled: Boolean(selectedProjectId) },
  );
  const quotations = useMemo(() => quotationsQuery.data?.items ?? [], [quotationsQuery.data?.items]);
  const selectedQuotation = useQuotationDetail(selectedQuotationId, { enabled: Boolean(selectedQuotationId) }).data;
  const proposalNameById = useMemo(
    () => new Map((projectProposalsQuery.data?.items ?? []).map((proposal) => [proposal.proposalId, proposal.proposalName])),
    [projectProposalsQuery.data?.items],
  );
  const selectedProposalQuery = useProposalDetail(selectedQuotation?.proposalId, { enabled: Boolean(selectedQuotation?.proposalId) });
  const selectedProposalName = getProposalName(selectedQuotation?.proposalId, proposalNameById, selectedProposalQuery.data?.proposalName);
  const acceptMutation = useAcceptQuotation();
  const revisionMutation = useRequestQuotationRevision();
  const rejectMutation = useRejectQuotation();

  useEffect(() => {
    if (!selectedProjectId && quotationProjects.length > 0) {
      setSelectedProjectId(quotationProjects[0].projectId);
    }
  }, [quotationProjects, selectedProjectId]);

  useEffect(() => {
    if (!selectedQuotationId && quotations.length > 0) {
      setSelectedQuotationId(quotations[0].quotationId);
      return;
    }

    if (selectedQuotationId && !quotations.some((quotation) => quotation.quotationId === selectedQuotationId)) {
      setSelectedQuotationId(quotations[0]?.quotationId ?? '');
    }
  }, [quotations, selectedQuotationId]);

  async function acceptQuotation() {
    if (!selectedQuotation) return;

    setMessage(null);

    try {
      await acceptMutation.mutateAsync(selectedQuotation.quotationId);
      setMessage({ tone: 'success', text: 'Quotation accepted. Your order is being created from this quotation.' });
    } catch (error) {
      setMessage({ tone: 'error', text: getQuotationServiceResultMessage(error) });
    }
  }

  async function requestRevision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedQuotation) return;

    if (!revisionReason.trim()) {
      setMessage({ tone: 'error', text: 'Please tell us what needs to be revised.' });
      return;
    }

    setMessage(null);

    try {
      await revisionMutation.mutateAsync({
        quotationId: selectedQuotation.quotationId,
        revisionReason,
      });
      setRevisionReason('');
      setMessage({ tone: 'success', text: 'Revision request sent to Sales.' });
    } catch (error) {
      setMessage({ tone: 'error', text: getQuotationServiceResultMessage(error) });
    }
  }

  async function rejectQuotation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedQuotation) return;

    if (!rejectReason.trim()) {
      setMessage({ tone: 'error', text: 'Please provide a reason before rejecting this quotation.' });
      return;
    }

    setMessage(null);

    try {
      await rejectMutation.mutateAsync({
        quotationId: selectedQuotation.quotationId,
        rejectReason,
      });
      setRejectReason('');
      setMessage({ tone: 'success', text: 'Quotation rejected.' });
    } catch (error) {
      setMessage({ tone: 'error', text: getQuotationServiceResultMessage(error) });
    }
  }

  return (
    <main className="customer-quotations-page">
      <CustomerNavbar activeLabel="Quotations" classPrefix="customer-quotations" />

      <div className="customer-quotations-main">
        <div className="customer-quotations-breadcrumb">
          <Link to="/customer/dashboard">
            <IconHome size={16} stroke={1.8} />
          </Link>
          <IconChevronRight size={16} stroke={1.8} />
          <span>Quotations</span>
        </div>

        <section className="customer-quotations-heading">
          <div>
            <h1>Quotations</h1>
            <p>Review pricing, request changes, or confirm the quotation to start order processing.</p>
          </div>
          <Link to="/customer/projects">
            My Projects
            <IconArrowRight size={16} stroke={1.8} />
          </Link>
        </section>

        {message ? <section className={`customer-quotations-message customer-quotations-message-${message.tone}`}>{message.text}</section> : null}
        {projectsQuery.isError ? <section className="customer-quotations-message customer-quotations-message-error">Cannot load your projects.</section> : null}
        {quotationsQuery.isError ? (
          <section className="customer-quotations-message customer-quotations-message-error">{getQuotationServiceResultMessage(quotationsQuery.error)}</section>
        ) : null}

        <section className="customer-quotations-grid">
          <aside className="customer-quotations-project-panel">
            <header>
              <h2>Projects With Quotations</h2>
            </header>
            {projectsQuery.isLoading ? <p className="customer-quotations-muted">Loading projects...</p> : null}
            {!projectsQuery.isLoading && quotationProjects.length === 0 ? (
              <p className="customer-quotations-muted">No quotation is available yet. Once Sales sends a quotation, it will appear here.</p>
            ) : null}
            <div className="customer-quotations-project-list">
              {quotationProjects.map((project) => (
                <button
                  className={project.projectId === selectedProjectId ? 'is-active' : ''}
                  key={project.projectId}
                  type="button"
                  onClick={() => {
                    setSelectedProjectId(project.projectId);
                    setSelectedQuotationId('');
                    setMessage(null);
                  }}
                >
                  <strong>{project.projectName}</strong>
                  <span>{project.projectCode}</span>
                  <em>{formatEnumLabel(project.status)}</em>
                </button>
              ))}
            </div>
          </aside>

          <section className="customer-quotations-workspace">

            {selectedQuotation ? (
              <QuotationDetail
                acceptPending={acceptMutation.isPending}
                quotation={selectedQuotation}
                proposalName={selectedProposalName}
                rejectPending={rejectMutation.isPending}
                rejectReason={rejectReason}
                revisionPending={revisionMutation.isPending}
                revisionReason={revisionReason}
                onAccept={() => void acceptQuotation()}
                onReject={(event) => void rejectQuotation(event)}
                onRejectReasonChange={setRejectReason}
                onRequestRevision={(event) => void requestRevision(event)}
                onRevisionReasonChange={setRevisionReason}
              />
            ) : null}
          </section>
        </section>
      </div>
    </main>
  );
}

function QuotationDetail({
  acceptPending,
  onAccept,
  onReject,
  onRejectReasonChange,
  onRequestRevision,
  onRevisionReasonChange,
  quotation,
  proposalName,
  rejectPending,
  rejectReason,
  revisionPending,
  revisionReason,
}: {
  acceptPending: boolean;
  onAccept: () => void;
  onReject: (event: FormEvent<HTMLFormElement>) => void;
  onRejectReasonChange: (value: string) => void;
  onRequestRevision: (event: FormEvent<HTMLFormElement>) => void;
  onRevisionReasonChange: (value: string) => void;
  proposalName: string;
  quotation: QuotationDto & { items?: QuotationItemDto[] };
  rejectPending: boolean;
  rejectReason: string;
  revisionPending: boolean;
  revisionReason: string;
}) {
  const canDecide = quotation.status === 'SENT' || quotation.status === 'REVISED';
  const quotationItems = useMemo(() => aggregateDuplicateItems(quotation.items ?? []), [quotation.items]);

  return (
    <section className="customer-quotations-card customer-quotations-detail">
      <header>
        <div>
          <h2>{formatQuotationCode(quotation.quotationCode)}</h2>
          <p title={proposalName}>{proposalName} - Version {quotation.versionNo ?? 1} - Valid until {quotation.validUntil ?? '-'}</p>
        </div>
        <span className={`customer-quotations-status customer-quotations-status-${statusClass(quotation.status)}`}>
          {formatEnumLabel(quotation.status ?? 'UNKNOWN')}
        </span>
      </header>

      <div className="customer-quotations-total-strip">
        <div>
          <span>Subtotal</span>
          <strong>{formatMoney(quotation.subtotalAmount)}</strong>
        </div>
        <div>
          <span>Discount</span>
          <strong>-{formatMoney(getQuotationDiscountTotal(quotation))}</strong>
        </div>
        <div>
          <span>Taxable</span>
          <strong>{formatMoney(quotation.taxableAmount)}</strong>
        </div>
        <div>
          <span>Tax</span>
          <strong>{formatMoney(quotation.taxAmount)}</strong>
        </div>
        <div>
          <span>Total</span>
          <strong>{formatMoney(quotation.totalAmount)}</strong>
        </div>
      </div>

      <div className="customer-quotations-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Type</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Customization</th>
              <th>Gross</th>
              <th>Discount</th>
              <th>Taxable</th>
              <th>Tax %</th>
              <th>Tax</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {quotationItems.map((item) => (
              <tr key={item.quotationItemId}>
                <td>
                  <strong title={getQuotationItemName(item)}>{getQuotationItemName(item)}</strong>
                  {item.note || item.customizationNote ? <span>{item.note ?? item.customizationNote}</span> : null}
                </td>
                <td>{formatEnumLabel(item.itemType ?? 'UNKNOWN')}</td>
                <td>{item.quantity ?? '-'}</td>
                <td>{formatMoney(item.unitPrice)}</td>
                <td>{formatMoney(getCustomizationUnitAdditionalCost(item))}</td>
                <td>{formatMoney(item.grossAmount ?? item.subtotalAmount)}</td>
                <td>{formatMoney(item.discountAmount)}</td>
                <td>{formatMoney(item.taxableAmount)}</td>
                <td>{formatPercent(item.taxRate)}</td>
                <td>{formatMoney(item.taxAmount)}</td>
                <td>{formatMoney(item.totalAmount ?? item.subtotalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {quotation.salesNote || quotation.customerNote || quotation.revisionReason || quotation.rejectReason ? (
        <div className="customer-quotations-note-grid">
          <NoteBlock label="Sales Note" value={quotation.salesNote} />
          <NoteBlock label="Customer Note" value={quotation.customerNote} />
          <NoteBlock label="Revision Reason" value={quotation.revisionReason} />
          <NoteBlock label="Reject Reason" value={quotation.rejectReason} />
        </div>
      ) : null}

      {canDecide ? (
        <section className="customer-quotations-decision">
          <button disabled={acceptPending} type="button" onClick={onAccept}>
            {acceptPending ? 'Accepting...' : 'Accept Quotation'}
          </button>
          <form onSubmit={onRequestRevision}>
            <strong>Request Revision</strong>
            <textarea value={revisionReason} rows={2} placeholder="What should Sales revise?" onChange={(event) => onRevisionReasonChange(event.target.value)} />
            <button disabled={revisionPending} type="submit">
              <IconRefresh size={15} stroke={1.8} />
              {revisionPending ? 'Sending...' : 'Request Revision'}
            </button>
          </form>
          <form onSubmit={onReject}>
            <strong>Reject Quotation</strong>
            <textarea value={rejectReason} rows={2} placeholder="Reason for rejecting this quotation" onChange={(event) => onRejectReasonChange(event.target.value)} />
            <button disabled={rejectPending} type="submit">
              {rejectPending ? 'Rejecting...' : 'Reject Quotation'}
            </button>
          </form>
        </section>
      ) : (
        <p className="customer-quotations-muted">This quotation is read-only at its current status.</p>
      )}
    </section>
  );
}

function NoteBlock({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;

  return (
    <div>
      <span>{label}</span>
      <p>{value}</p>
    </div>
  );
}

function getQuotationProjects(projects: ProjectListItemDto[]) {
  const preferred = projects.filter((project) => quotationProjectStatuses.has(project.status));

  return preferred.length > 0 ? preferred : projects.filter((project) => project.status === 'PROPOSAL_SELECTED');
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

function getCustomizationUnitAdditionalCost(item: Pick<QuotationItemDto, 'customizationUnitAdditionalCost' | 'customizationAdditionalCost'>) {
  return item.customizationUnitAdditionalCost ?? item.customizationAdditionalCost ?? null;
}

function getQuotationDiscountTotal(quotation: Pick<QuotationDto, 'totalDiscountAmount' | 'discountAmount'>) {
  return quotation.totalDiscountAmount ?? quotation.discountAmount ?? null;
}

function statusClass(status?: QuotationStatus | null) {
  return (status ?? 'UNKNOWN').toLowerCase().replace(/_/g, '-');
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatMoney(value?: number | null) {
  if (typeof value !== 'number') return '-';

  return `${new Intl.NumberFormat('vi-VN').format(value)} VND`;
}

function formatPercent(value?: number | null) {
  if (typeof value !== 'number') return '-';

  return `${new Intl.NumberFormat('vi-VN').format(value)}%`;
}
