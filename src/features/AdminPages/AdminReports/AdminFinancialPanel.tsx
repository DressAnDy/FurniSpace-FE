import { useMemo, useState, type ReactNode } from 'react';
import {
  IconAlertTriangle,
  IconCash,
  IconChartBar,
  IconClock,
  IconCreditCard,
  IconFolder,
  IconReceipt,
  IconSearch,
  IconWorld,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import { getAdminFinancialServiceResultMessage } from '@/services/api/adminFinancial';
import {
  useAdminFinancialCollectionTrend,
  useAdminFinancialExceptions,
  useAdminFinancialPaymentBreakdown,
  useAdminFinancialPayments,
  useAdminFinancialProjects,
  useAdminFinancialReceivables,
  useAdminFinancialSummary,
} from '@/services/queries';

type DateParams = { from: string; to: string };

type FinancialPanelProps = {
  dateParams: DateParams;
  fromDate: string;
  toDate: string;
};

type KpiTone = 'green' | 'amber' | 'blue' | 'red' | 'neutral';

export function FinancialPanel({ dateParams, fromDate, toDate }: FinancialPanelProps) {
  const [receivablesPage, setReceivablesPage] = useState(1);
  const [projectsPage, setProjectsPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [exceptionsPage, setExceptionsPage] = useState(1);
  const [projectKeyword, setProjectKeyword] = useState('');
  const [paymentFailedOnly, setPaymentFailedOnly] = useState(false);

  const summaryParams = useMemo(
    () => ({
      period: 'CUSTOM' as const,
      from: dateParams.from,
      to: dateParams.to,
      currency: 'VND',
    }),
    [dateParams],
  );

  const summaryQuery = useAdminFinancialSummary(summaryParams);
  const trendQuery = useAdminFinancialCollectionTrend({
    from: dateParams.from,
    to: dateParams.to,
    granularity: 'MONTH',
    currency: 'VND',
  });
  const breakdownQuery = useAdminFinancialPaymentBreakdown({
    from: dateParams.from,
    to: dateParams.to,
    currency: 'VND',
  });
  const receivablesQuery = useAdminFinancialReceivables({
    page: receivablesPage,
    pageSize: 10,
    sortBy: 'confirmedAt',
    sortDirection: 'desc',
  });
  const projectsQuery = useAdminFinancialProjects({
    keyword: projectKeyword.trim() || undefined,
    page: projectsPage,
    pageSize: 10,
    sortBy: 'createdAt',
    sortDirection: 'desc',
  });
  const paymentsQuery = useAdminFinancialPayments({
    page: paymentsPage,
    pageSize: 10,
    currency: 'VND',
    hasFailedAttempt: paymentFailedOnly ? true : undefined,
    sortBy: 'createdAt',
    sortDirection: 'desc',
  });
  const exceptionsQuery = useAdminFinancialExceptions({
    page: exceptionsPage,
    pageSize: 10,
  });

  const summary = summaryQuery.data;

  return (
    <div className="admin-financial-panel">
      <section className="admin-financial-hero" aria-label="Financial report context">
        <div>
          <span className="admin-financial-hero-eyebrow">Cash & receivables</span>
          <h3>Financial command view</h3>
          <p>
            Canonical collected cash only (start fee, deposit, remaining). Outstanding payments and contracted
            receivable stay separate — do not sum them.
          </p>
        </div>
        <ul className="admin-financial-chips">
          <li>
            <IconWorld size={14} /> Asia/Ho_Chi_Minh
          </li>
          <li>
            <IconCash size={14} /> VND
          </li>
          <li>
            <IconClock size={14} /> {fromDate} → {toDate}
          </li>
        </ul>
      </section>

      {summaryQuery.isLoading ? <StateBlock>Loading financial summary...</StateBlock> : null}
      {summaryQuery.isError ? <ErrorBlock error={summaryQuery.error} /> : null}

      {summary ? (
        <section className="admin-financial-kpi-grid" aria-label="Financial KPIs">
          <KpiCard
            tone="green"
            icon={<IconCreditCard size={18} />}
            label="Collected"
            value={formatKpiMoney(summary.collectedAmount)}
            title={formatMoney(summary.collectedAmount)}
            note={`${summary.failedTransactionCount} failed attempts in range`}
          />
          <KpiCard
            tone="amber"
            icon={<IconClock size={18} />}
            label="Outstanding payments"
            value={formatKpiMoney(summary.outstandingPaymentAmount)}
            title={formatMoney(summary.outstandingPaymentAmount)}
            note={`${summary.activePaymentCount} active obligations`}
          />
          <KpiCard
            tone="amber"
            icon={<IconReceipt size={18} />}
            label="Contracted receivable"
            value={formatKpiMoney(summary.contractedReceivableAmount)}
            title={formatMoney(summary.contractedReceivableAmount)}
            note="Active orders with remaining amount"
          />
          <KpiCard
            tone="blue"
            icon={<IconCash size={18} />}
            label="Order commercial value"
            value={formatKpiMoney(summary.orderCommercialValue)}
            title={formatMoney(summary.orderCommercialValue)}
            note="Confirmed in selected range"
          />
          <KpiCard
            tone="red"
            icon={<IconAlertTriangle size={18} />}
            label="Failed transactions"
            value={summary.failedTransactionCount}
            note="Payment attempts"
          />
          <KpiCard
            tone="neutral"
            icon={<IconCreditCard size={18} />}
            label="Active payments"
            value={summary.activePaymentCount}
            note="Current collectible"
          />
        </section>
      ) : null}

      <section className="admin-financial-chart-grid">
        <article className="admin-card admin-financial-section-card admin-financial-section-wide">
          <SectionHeader
            icon={<IconChartBar size={18} />}
            title="Collection trend"
            subtitle="Monthly stacked cash by canonical payment type."
          />
          {trendQuery.isLoading ? <StateBlock>Loading collection trend...</StateBlock> : null}
          {trendQuery.isError ? <ErrorBlock error={trendQuery.error} /> : null}
          {trendQuery.data ? (
            <CollectionBars
              series={trendQuery.data.series.map((bucket) => ({
                label: bucket.period,
                projectStartFee: bucket.projectStartFee,
                deposit: bucket.deposit,
                remainingPayment: bucket.remainingPayment,
                total: bucket.total,
              }))}
            />
          ) : null}
        </article>

        <article className="admin-card admin-financial-section-card">
          <SectionHeader
            icon={<IconReceipt size={18} />}
            title="Type breakdown"
            subtitle="Collected vs outstanding by payment type."
          />
          {breakdownQuery.isLoading ? <StateBlock>Loading breakdown...</StateBlock> : null}
          {breakdownQuery.isError ? <ErrorBlock error={breakdownQuery.error} /> : null}
          {breakdownQuery.data ? (
            <div className="admin-financial-breakdown-cards">
              {breakdownQuery.data.items.map((item) => (
                <article className="admin-financial-breakdown-card" key={item.paymentType}>
                  <header>
                    <strong>{formatLabel(item.paymentType)}</strong>
                    <span className="admin-financial-pill">{item.paidCount} paid</span>
                  </header>
                  <div className="admin-financial-breakdown-metrics">
                    <div>
                      <small>Collected</small>
                      <em title={formatMoney(item.collectedAmount)}>{formatKpiMoney(item.collectedAmount)}</em>
                    </div>
                    <div>
                      <small>Outstanding</small>
                      <em title={formatMoney(item.outstandingAmount)}>{formatKpiMoney(item.outstandingAmount)}</em>
                    </div>
                    <div>
                      <small>Open / Expired</small>
                      <em>
                        {item.outstandingCount} / {item.expiredCount}
                      </em>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </article>
      </section>

      <section className="admin-card admin-financial-section-card">
        <SectionHeader
          icon={<IconReceipt size={18} />}
          title="Receivables"
          subtitle="Current outstanding obligations and contracted order receivables."
          aside={
            receivablesQuery.data ? (
              <div className="admin-financial-stat-pills">
                <span>Outstanding {formatKpiMoney(receivablesQuery.data.outstandingPaymentAmount)}</span>
                <span>Contracted {formatKpiMoney(receivablesQuery.data.contractedReceivableAmount)}</span>
              </div>
            ) : null
          }
        />
        {receivablesQuery.isLoading ? <StateBlock>Loading receivables...</StateBlock> : null}
        {receivablesQuery.isError ? <ErrorBlock error={receivablesQuery.error} /> : null}
        {receivablesQuery.data ? (
          <>
            <div className="admin-report-table-wrap admin-financial-table-wrap">
              <table className="admin-report-table admin-financial-table admin-financial-table-receivables">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Order</th>
                    <th>Final total</th>
                    <th>Paid</th>
                    <th>Remaining</th>
                    <th>Active payment</th>
                    <th>Created?</th>
                  </tr>
                </thead>
                <tbody>
                  {receivablesQuery.data.items.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <EmptyRow text="No receivable rows." />
                      </td>
                    </tr>
                  ) : (
                    receivablesQuery.data.items.map((item) => (
                      <tr key={item.orderId}>
                        <td>
                          <Link className="admin-financial-code-link" to="/admin/projects">
                            {item.projectCode || item.projectName}
                          </Link>
                          <div className="admin-report-cell-sub">{item.projectName}</div>
                        </td>
                        <td>
                          <span className="admin-financial-mono" title={item.orderCode}>
                            {shortenCode(item.orderCode)}
                          </span>
                          <div className="admin-report-cell-sub">{formatLabel(item.orderStatus || '')}</div>
                        </td>
                        <td className="admin-financial-money">{formatKpiMoney(item.finalTotalAmount)}</td>
                        <td className="admin-financial-money">{formatKpiMoney(item.paidAmount)}</td>
                        <td className="admin-financial-money is-warn">{formatKpiMoney(item.remainingAmount)}</td>
                        <td>
                          {item.activePaymentType ? formatLabel(item.activePaymentType) : '—'}
                          <div className="admin-report-cell-sub">
                            {item.activePaymentStatus ? (
                              <StatusPill status={item.activePaymentStatus} />
                            ) : null}{' '}
                            {item.activePaymentAmount != null ? formatKpiMoney(item.activePaymentAmount) : ''}
                          </div>
                        </td>
                        <td>
                          <span className={`admin-financial-flag ${item.isPaymentCreated ? 'is-yes' : 'is-no'}`}>
                            {item.isPaymentCreated ? 'Yes' : 'No'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pager
              page={receivablesQuery.data.page}
              totalPages={receivablesQuery.data.totalPages}
              totalItems={receivablesQuery.data.totalItems}
              onChange={setReceivablesPage}
            />
          </>
        ) : null}
      </section>

      <section className="admin-card admin-financial-section-card">
        <SectionHeader
          icon={<IconFolder size={18} />}
          title="Projects financial overview"
          subtitle="Use totalProjectCashCollected — not start fee + order paid."
          aside={
            <label className="admin-financial-search">
              <IconSearch size={15} />
              <input
                aria-label="Search projects"
                placeholder="Code, name, customer"
                value={projectKeyword}
                onChange={(event) => {
                  setProjectKeyword(event.target.value);
                  setProjectsPage(1);
                }}
              />
            </label>
          }
        />
        {projectsQuery.isLoading ? <StateBlock>Loading projects...</StateBlock> : null}
        {projectsQuery.isError ? <ErrorBlock error={projectsQuery.error} /> : null}
        {projectsQuery.data ? (
          <>
            <div className="admin-report-table-wrap admin-financial-table-wrap">
              <table className="admin-report-table admin-financial-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Customer</th>
                    <th>Order</th>
                    <th>Collected</th>
                    <th>Remaining</th>
                    <th>Active payment</th>
                    <th>Last paid</th>
                  </tr>
                </thead>
                <tbody>
                  {projectsQuery.data.items.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <EmptyRow text="No projects found." />
                      </td>
                    </tr>
                  ) : (
                    projectsQuery.data.items.map((item) => (
                      <tr key={item.projectId}>
                        <td>
                          <strong className="admin-financial-code">{item.projectCode || item.projectName}</strong>
                          <div className="admin-report-cell-sub">
                            {item.projectName} · {formatLabel(item.projectStatus || '')}
                          </div>
                        </td>
                        <td>{item.customerName || '—'}</td>
                        <td>
                          {item.orderCode || '—'}
                          <div className="admin-report-cell-sub">{formatLabel(item.orderStatus || '')}</div>
                        </td>
                        <td className="admin-financial-money is-good" title={formatMoney(item.totalProjectCashCollected)}>
                          {formatKpiMoney(item.totalProjectCashCollected)}
                        </td>
                        <td className="admin-financial-money is-warn">{formatKpiMoney(item.orderRemainingAmount)}</td>
                        <td>
                          {item.activePaymentType ? formatLabel(item.activePaymentType) : '—'}
                          <div className="admin-report-cell-sub">
                            {item.activePaymentStatus ? <StatusPill status={item.activePaymentStatus} /> : null}
                          </div>
                        </td>
                        <td>{formatDateTime(item.lastPaidAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pager
              page={projectsQuery.data.page}
              totalPages={projectsQuery.data.totalPages}
              totalItems={projectsQuery.data.totalItems}
              onChange={setProjectsPage}
            />
          </>
        ) : null}
      </section>

      <section className="admin-card admin-financial-section-card">
        <SectionHeader
          icon={<IconCreditCard size={18} />}
          title="Payments operations"
          subtitle="Provider attempts and failure diagnostics (no webhook secrets)."
          aside={
            <label className="admin-financial-toggle">
              <input
                checked={paymentFailedOnly}
                type="checkbox"
                onChange={(event) => {
                  setPaymentFailedOnly(event.target.checked);
                  setPaymentsPage(1);
                }}
              />
              Failed attempts only
            </label>
          }
        />
        {paymentsQuery.isLoading ? <StateBlock>Loading payments...</StateBlock> : null}
        {paymentsQuery.isError ? <ErrorBlock error={paymentsQuery.error} /> : null}
        {paymentsQuery.data ? (
          <>
            <div className="admin-report-table-wrap admin-financial-table-wrap">
              <table className="admin-report-table admin-financial-table">
                <thead>
                  <tr>
                    <th>Payment</th>
                    <th>Project / Order</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Provider</th>
                    <th>Attempts</th>
                    <th>Last failure</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentsQuery.data.items.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <EmptyRow text="No payments found." />
                      </td>
                    </tr>
                  ) : (
                    paymentsQuery.data.items.map((item) => (
                      <tr key={item.paymentId}>
                        <td>
                          <strong className="admin-financial-code">{item.paymentCode}</strong>
                          <div className="admin-report-cell-sub">{item.customerName || '—'}</div>
                        </td>
                        <td>
                          {item.projectCode || '—'}
                          <div className="admin-report-cell-sub">{item.orderCode || '—'}</div>
                        </td>
                        <td>{item.paymentType ? formatLabel(item.paymentType) : '—'}</td>
                        <td className="admin-financial-money">{formatKpiMoney(item.amount)}</td>
                        <td>{item.status ? <StatusPill status={item.status} /> : '—'}</td>
                        <td>
                          <span className="admin-financial-pill">{item.lastProvider || '—'}</span>
                        </td>
                        <td>
                          {item.attemptCount}
                          {item.failedAttemptCount > 0 ? (
                            <div className="admin-report-cell-sub is-bad">{item.failedAttemptCount} failed</div>
                          ) : (
                            <div className="admin-report-cell-sub">0 failed</div>
                          )}
                        </td>
                        <td>
                          {item.lastFailureReason || '—'}
                          <div className="admin-report-cell-sub">{formatDateTime(item.lastAttemptAt)}</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pager
              page={paymentsQuery.data.page}
              totalPages={paymentsQuery.data.totalPages}
              totalItems={paymentsQuery.data.totalItems}
              onChange={setPaymentsPage}
            />
          </>
        ) : null}
      </section>

      <section className="admin-card admin-financial-section-card">
        <SectionHeader
          icon={<IconAlertTriangle size={18} />}
          title="Exceptions inbox"
          subtitle="Operational issues needing admin attention."
        />
        {exceptionsQuery.isLoading ? <StateBlock>Loading exceptions...</StateBlock> : null}
        {exceptionsQuery.isError ? <ErrorBlock error={exceptionsQuery.error} /> : null}
        {exceptionsQuery.data ? (
          <>
            <div className="admin-report-table-wrap admin-financial-table-wrap">
              <table className="admin-report-table admin-financial-table">
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Type</th>
                    <th>Title</th>
                    <th>Amount</th>
                    <th>Age</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {exceptionsQuery.data.items.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <EmptyRow text="No exceptions." />
                      </td>
                    </tr>
                  ) : (
                    exceptionsQuery.data.items.map((item, index) => (
                      <tr key={`${item.exceptionType}-${item.targetResourceId ?? index}`}>
                        <td>
                          <span
                            className={`admin-financial-severity admin-financial-severity-${(item.severity || 'medium').toLowerCase()}`}
                          >
                            {item.severity || '—'}
                          </span>
                        </td>
                        <td>{formatLabel(item.exceptionType)}</td>
                        <td>
                          <strong>{item.title}</strong>
                          <div className="admin-report-cell-sub">{item.reason}</div>
                        </td>
                        <td className="admin-financial-money">{formatKpiMoney(item.amount)}</td>
                        <td>{item.age != null ? `${item.age}d` : '—'}</td>
                        <td className="admin-financial-action">{item.recommendedAction || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pager
              page={exceptionsQuery.data.page}
              totalPages={exceptionsQuery.data.totalPages}
              totalItems={exceptionsQuery.data.totalItems}
              onChange={setExceptionsPage}
            />
          </>
        ) : null}
      </section>
    </div>
  );
}

function SectionHeader({
  aside,
  icon,
  subtitle,
  title,
}: {
  aside?: ReactNode;
  icon: ReactNode;
  subtitle: string;
  title: string;
}) {
  return (
    <header className="admin-financial-section-header">
      <div className="admin-financial-section-heading">
        <span className="admin-financial-section-icon">{icon}</span>
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>
      {aside}
    </header>
  );
}

function KpiCard({
  icon,
  label,
  note,
  title,
  tone,
  value,
}: {
  icon: ReactNode;
  label: string;
  note?: string;
  title?: string;
  tone: KpiTone;
  value: string | number;
}) {
  return (
    <article className={`admin-financial-kpi admin-financial-kpi-${tone}`} title={title}>
      <span className="admin-financial-kpi-icon">{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        {note ? <p>{note}</p> : null}
      </div>
    </article>
  );
}

function CollectionBars({
  series,
}: {
  series: Array<{
    label: string;
    projectStartFee: number;
    deposit: number;
    remainingPayment: number;
    total: number;
  }>;
}) {
  const max = Math.max(1, ...series.map((item) => item.total));

  if (series.length === 0) {
    return <EmptyRow text="No collection buckets in range." />;
  }

  return (
    <div className="admin-financial-bars">
      <div className="admin-financial-bars-plot">
        {series.map((item) => (
          <div className="admin-financial-bar-col" key={item.label} title={`${item.label}: ${formatMoney(item.total)}`}>
            <div className="admin-financial-bar-stack" style={{ height: `${Math.max((item.total / max) * 100, 4)}%` }}>
              <span style={{ flexGrow: item.remainingPayment || 0.0001, background: '#b45309' }} />
              <span style={{ flexGrow: item.deposit || 0.0001, background: '#c4a574' }} />
              <span style={{ flexGrow: item.projectStartFee || 0.0001, background: '#5c4030' }} />
            </div>
            <em>{item.label}</em>
            <small>{formatKpiMoney(item.total)}</small>
          </div>
        ))}
      </div>
      <ul className="admin-financial-bar-legend">
        <li>
          <i style={{ background: '#5c4030' }} /> Start fee
        </li>
        <li>
          <i style={{ background: '#c4a574' }} /> Deposit
        </li>
        <li>
          <i style={{ background: '#b45309' }} /> Remaining
        </li>
      </ul>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone = statusTone(status);
  return <span className={`admin-financial-status admin-financial-status-${tone}`}>{formatLabel(status)}</span>;
}

function statusTone(status: string) {
  const value = status.toUpperCase();
  if (value === 'PAID') return 'good';
  if (value === 'PENDING' || value === 'PROCESSING') return 'warn';
  if (value === 'EXPIRED' || value === 'CANCELLED' || value === 'REFUNDED') return 'bad';
  return 'neutral';
}

function Pager({
  page,
  totalPages,
  totalItems,
  onChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="admin-financial-pager">
      <span>
        Page {page} / {Math.max(totalPages, 1)} · {totalItems} items
      </span>
      <div>
        <button disabled={page <= 1} type="button" onClick={() => onChange(page - 1)}>
          Previous
        </button>
        <button disabled={page >= totalPages} type="button" onClick={() => onChange(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <div className="admin-financial-empty">{text}</div>;
}

function StateBlock({ children }: { children: ReactNode }) {
  return <div className="user-management-state">{children}</div>;
}

function ErrorBlock({ error }: { error: unknown }) {
  return (
    <div className="user-management-state user-management-state-error">
      {getAdminFinancialServiceResultMessage(error)}
    </div>
  );
}

function formatLabel(value: string) {
  if (!value) return '—';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatMoney(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
}

function formatKpiMoney(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ ₫`;
  }
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} triệu ₫`;
  }
  return formatMoney(value);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

function shortenCode(value: string | null | undefined, keep = 9) {
  if (!value) return '—';
  if (value.length <= keep * 2 + 1) return value;
  return `${value.slice(0, keep)}…${value.slice(-keep)}`;
}
