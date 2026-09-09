import {
  IconArrowRight,
  IconRefresh
} from '@tabler/icons-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useLang } from '@/app/providers/useLang';
import { CustomerNavbar, customerCopy } from '@/features/CustomerPages/customercomponents';
import { formatCustomerMoney, getCustomerProjectStatusLabel } from '@/features/CustomerPages/utils';
import { type OrderListItemDto } from '@/services/api/orders';
import { getQuotationServiceResultMessage, type QuotationDto, type QuotationItemDto, type QuotationStatus } from '@/services/api/quotations';
import type { ProjectListItemDto } from '@/services/api/projects';
import {
  useAcceptQuotation,
  useProjectOrders,
  useProjectList,
  useProjectProposals,
  useProposalDetail,
  useProjectQuotations,
  useQuotationDetail,
  useRequestQuotationRevision,
} from '@/services/queries';

import './CustomerQuotationsPage.css';

const quotationProjectStatuses = new Set([
  'QUOTATION_SENT',
  'QUOTATION_REVISION_REQUESTED',
  'ORDER_CONFIRMED',
  'IN_PRODUCTION',
  'READY_FOR_DELIVERY',
  'DELIVERING',
  'AWAITING_CUSTOMER_CONFIRMATION',
  'DELIVERED',
  'COMPLETED',
]);
const QUOTATION_PROJECT_PAGE_SIZE = 5;

export function CustomerQuotationsPage() {
  const { lang } = useLang();
  const t = customerCopy[lang];
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedQuotationId, setSelectedQuotationId] = useState('');
  const [projectPage, setProjectPage] = useState(1);
  const [revisionReason, setRevisionReason] = useState('');
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const projectsQuery = useProjectList({ page: 1, limit: 50 });
  const projects = useMemo(() => projectsQuery.data?.items ?? [], [projectsQuery.data?.items]);
  const quotationProjects = useMemo(() => getQuotationProjects(projects), [projects]);
  const projectPageCount = Math.max(1, Math.ceil(quotationProjects.length / QUOTATION_PROJECT_PAGE_SIZE));
  const pagedQuotationProjects = useMemo(() => {
    const start = (projectPage - 1) * QUOTATION_PROJECT_PAGE_SIZE;

    return quotationProjects.slice(start, start + QUOTATION_PROJECT_PAGE_SIZE);
  }, [projectPage, quotationProjects]);
  const quotationsQuery = useProjectQuotations({ projectId: selectedProjectId }, { enabled: Boolean(selectedProjectId) });
  const ordersQuery = useProjectOrders(selectedProjectId, { enabled: Boolean(selectedProjectId) });
  const projectProposalsQuery = useProjectProposals(
    { projectId: selectedProjectId, limit: 50 },
    { enabled: Boolean(selectedProjectId) },
  );
  const quotations = useMemo(() => quotationsQuery.data?.items ?? [], [quotationsQuery.data?.items]);
  const orders = useMemo(() => ordersQuery.data?.items ?? [], [ordersQuery.data?.items]);
  const selectedQuotation = useQuotationDetail(selectedQuotationId, { enabled: Boolean(selectedQuotationId) }).data;
  const selectedQuotationOrder = useMemo(
    () => orders.find((order) => order.quotationId === selectedQuotation?.quotationId) ?? null,
    [orders, selectedQuotation?.quotationId],
  );
  const proposalNameById = useMemo(
    () => new Map((projectProposalsQuery.data?.items ?? []).map((proposal) => [proposal.proposalId, proposal.proposalName])),
    [projectProposalsQuery.data?.items],
  );
  const selectedProposalQuery = useProposalDetail(selectedQuotation?.proposalId, { enabled: Boolean(selectedQuotation?.proposalId) });
  const selectedProposalName = getProposalName(selectedQuotation?.proposalId, proposalNameById, selectedProposalQuery.data?.proposalName);
  const acceptMutation = useAcceptQuotation();
  const revisionMutation = useRequestQuotationRevision();

  useEffect(() => {
    if (!selectedProjectId && quotationProjects.length > 0) {
      setSelectedProjectId(quotationProjects[0].projectId);
    }
  }, [quotationProjects, selectedProjectId]);

  useEffect(() => {
    setProjectPage((currentPage) => Math.min(currentPage, projectPageCount));
  }, [projectPageCount]);

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
      setMessage({ tone: 'success', text: t.quotations.acceptedToast });
      void ordersQuery.refetch();
    } catch (error) {
      setMessage({ tone: 'error', text: getQuotationServiceResultMessage(error) });
    }
  }

  async function requestRevision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedQuotation) return;

    if (!revisionReason.trim()) {
      setMessage({ tone: 'error', text: t.quotations.revisionRequiredToast });
      return;
    }

    setMessage(null);

    try {
      await revisionMutation.mutateAsync({
        quotationId: selectedQuotation.quotationId,
        revisionReason,
      });
      setRevisionReason('');
      setMessage({ tone: 'success', text: t.quotations.revisionSentToast });
    } catch (error) {
      setMessage({ tone: 'error', text: getQuotationServiceResultMessage(error) });
    }
  }

  return (
    <main className="customer-quotations-page">
      <CustomerNavbar activeKey="quotations" classPrefix="customer-quotations" />

      <div className="customer-quotations-main">
        <section className="customer-quotations-heading">
          <div>
            <h1>{t.quotations.title}</h1>
          </div>
          <Link to="/customer/projects">
            {t.quotations.myProjects}
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
              <h2>{t.quotations.project}</h2>
            </header>
            {projectsQuery.isLoading ? <p className="customer-quotations-muted">{t.common.loading}</p> : null}
            {!projectsQuery.isLoading && quotationProjects.length === 0 ? (
              <p className="customer-quotations-muted">{t.quotations.empty}</p>
            ) : null}
            <div className="customer-quotations-project-list">
              {pagedQuotationProjects.map((project) => (
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
                  <em>{getCustomerProjectStatusLabel(project.status, lang)}</em>
                </button>
              ))}
            </div>
            {quotationProjects.length > QUOTATION_PROJECT_PAGE_SIZE ? (
              <footer className="customer-quotations-project-pagination">
                <button disabled={projectPage === 1} type="button" onClick={() => setProjectPage((page) => Math.max(page - 1, 1))}>
                  {t.common.previous}
                </button>
                <span>{projectPage} / {projectPageCount}</span>
                <button disabled={projectPage === projectPageCount} type="button" onClick={() => setProjectPage((page) => Math.min(page + 1, projectPageCount))}>
                  {t.common.next}
                </button>
              </footer>
            ) : null}
          </aside>

          <section className="customer-quotations-workspace">

            {selectedQuotation ? (
              <QuotationDetail
                acceptPending={acceptMutation.isPending}
                order={selectedQuotationOrder}
                quotation={selectedQuotation}
                proposalName={selectedProposalName}
                revisionPending={revisionMutation.isPending}
                revisionReason={revisionReason}
                onAccept={() => void acceptQuotation()}
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
  onRequestRevision,
  onRevisionReasonChange,
  quotation,
  order,
  proposalName,
  revisionPending,
  revisionReason,
}: {
  acceptPending: boolean;
  onAccept: () => void;
  onRequestRevision: (event: FormEvent<HTMLFormElement>) => void;
  onRevisionReasonChange: (value: string) => void;
  proposalName: string;
  quotation: QuotationDto & { items?: QuotationItemDto[] };
  order: OrderListItemDto | null;
  revisionPending: boolean;
  revisionReason: string;
}) {
  const { lang } = useLang();
  const t = customerCopy[lang];
  const canDecide = quotation.status === 'SENT' || quotation.status === 'REVISED';
  const quotationItems = useMemo(
    () => {
      return [...(quotation.items ?? [])].sort(
        (first, second) =>
          (first.displayOrder ?? Number.MAX_SAFE_INTEGER) - (second.displayOrder ?? Number.MAX_SAFE_INTEGER)
          || first.quotationItemId.localeCompare(second.quotationItemId),
      );
    },
    [quotation.items],
  );
  const depositAmount = getQuotationDepositAmount(quotation);

  return (
    <section className="customer-quotations-card customer-quotations-detail">
      <header>
        <div>
          <h2>{formatQuotationCode(quotation.quotationCode)}</h2>
          <p title={proposalName}>{proposalName} - {t.common.version} {quotation.versionNo ?? 1} - Valid until {quotation.validUntil ?? '-'}</p>
        </div>
        <span className={`customer-quotations-status customer-quotations-status-${statusClass(quotation.status)}`}>
          {formatEnumLabel(quotation.status ?? 'UNKNOWN')}
        </span>
      </header>

      <div className="customer-quotations-total-strip">
        <div>
          <span>{t.quotations.subtotal}</span>
          <strong>{formatCustomerMoney(quotation.subtotalAmount)}</strong>
        </div>
        <div>
          <span>{t.quotations.discount}</span>
          <strong>-{formatCustomerMoney(quotation.totalDiscountAmount)}</strong>
        </div>
        <div>
          <span>{t.quotations.beforeVat}</span>
          <strong>{formatCustomerMoney(quotation.preVatAmount)}</strong>
        </div>
        <div>
          <span>{t.quotations.vat} {formatPercentRate(quotation.vatRate)}</span>
          <strong>{formatCustomerMoney(quotation.vatAmount)}</strong>
        </div>
        <div>
          <span>{t.quotations.deposit}</span>
          <strong>{formatCustomerMoney(depositAmount)}</strong>
        </div>
        <div>
          <span>{t.quotations.total}</span>
          <strong>{formatCustomerMoney(quotation.totalAmount)}</strong>
        </div>
      </div>

      {order ? <p className="customer-quotations-muted">Deposit payment and delivery details are managed from Orders.</p> : null}

      <div className="customer-quotations-table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t.quotations.item}</th>
              <th>{t.quotations.qty}</th>
              <th>{t.quotations.unit}</th>
              <th>{t.quotations.gross}</th>
              <th>{t.quotations.discount}</th>
              <th>{t.quotations.lineTotal}</th>
            </tr>
          </thead>
          <tbody>
            {quotationItems.map((item) => (
              <tr key={item.quotationItemId}>
                <td>
                  <strong title={getQuotationItemName(item)}>{getQuotationItemName(item)}</strong>
                  {item.note || item.customizationNote ? <span>{item.note ?? item.customizationNote}</span> : null}
                </td>
                <td>{item.quantity ?? '-'}</td>
                <td>{formatCustomerMoney(item.unitPrice)}</td>
                <td>{formatCustomerMoney(item.grossAmount)}</td>
                <td>{formatCustomerMoney(item.discountAmount)}</td>
                <td>{formatCustomerMoney(item.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {quotation.salesNote || quotation.customerNote || quotation.revisionReason ? (
        <div className="customer-quotations-note-grid">
          <NoteBlock label={t.quotations.salesNote} value={quotation.salesNote} />
          <NoteBlock label={t.quotations.customerNote} value={quotation.customerNote} />
          <NoteBlock label={t.quotations.revisionReason} value={quotation.revisionReason} />
        </div>
      ) : null}

      {canDecide ? (
        <section className="customer-quotations-decision">
          <button disabled={acceptPending} type="button" onClick={onAccept}>
            {acceptPending ? t.common.confirming : t.quotations.acceptQuotation}
          </button>
          <form onSubmit={onRequestRevision}>
            <strong>{t.quotations.requestRevision}</strong>
            <textarea value={revisionReason} rows={2} placeholder={t.quotations.revisionPlaceholder} onChange={(event) => onRevisionReasonChange(event.target.value)} />
            <button disabled={revisionPending} type="submit">
              <IconRefresh size={15} stroke={1.8} />
              {revisionPending ? t.common.loading : t.quotations.requestRevision}
            </button>
          </form>
        </section>
      ) : (
        <p className="customer-quotations-muted">{t.quotations.readOnlyNote}</p>
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

function getQuotationDepositAmount(quotation: Pick<QuotationDto, 'depositAmount' | 'totalAmount'>) {
  if (typeof quotation.depositAmount === 'number' && Number.isFinite(quotation.depositAmount)) {
    return quotation.depositAmount;
  }

  return null;
}

function formatPercentRate(value?: number | null) {
  if (typeof value !== 'number') return '-';

  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value * 100)}%`;
}
