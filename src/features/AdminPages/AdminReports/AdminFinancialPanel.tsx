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

import { useLang, type Lang } from '@/app/providers/useLang';
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

import {
  financialCopy,
  formatDateTime,
  formatEnumLabel,
  formatKpiMoney,
  formatMoney,
  formatSeverityLabel,
  formatTrendPeriod,
  getMoneyParts,
} from './adminReportsI18n';

type DateParams = { from: string; to: string };

type FinancialPanelProps = {
  dateParams: DateParams;
  fromDate: string;
  toDate: string;
};

type KpiTone = 'green' | 'amber' | 'blue' | 'red' | 'neutral';

export function FinancialPanel({ dateParams, fromDate, toDate }: FinancialPanelProps) {
  const { lang } = useLang();
  const t = financialCopy[lang];
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
    pageSize: 4,
    sortBy: 'confirmedAt',
    sortDirection: 'desc',
  });
  const projectsQuery = useAdminFinancialProjects({
    keyword: projectKeyword.trim() || undefined,
    page: projectsPage,
    pageSize: 4,
    sortBy: 'createdAt',
    sortDirection: 'desc',
  });
  const paymentsQuery = useAdminFinancialPayments({
    page: paymentsPage,
    pageSize: 4,
    currency: 'VND',
    hasFailedAttempt: paymentFailedOnly ? true : undefined,
    sortBy: 'createdAt',
    sortDirection: 'desc',
  });
  const exceptionsQuery = useAdminFinancialExceptions({
    page: exceptionsPage,
    pageSize: 4,
  });

  const summary = summaryQuery.data;

  return (
    <div className="admin-financial-panel">
      <section className="admin-financial-hero" aria-label={t.heroAria}>
        <div>
          <span className="admin-financial-hero-eyebrow">{t.eyebrow}</span>
          <h3>{t.heroTitle}</h3>
          <p>{t.heroBody}</p>
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

      {summaryQuery.isLoading ? <StateBlock>{t.loadingSummary}</StateBlock> : null}
      {summaryQuery.isError ? <ErrorBlock error={summaryQuery.error} /> : null}

      {summary ? (
        <section className="admin-financial-kpi-grid" aria-label={t.kpiAria}>
          <KpiCard
            tone="green"
            icon={<IconCreditCard size={18} />}
            label={t.collected}
            value={<VndText lang={lang} value={summary.collectedAmount} compact />}
            title={formatMoney(lang, summary.collectedAmount)}
            note={t.failedInRange(summary.failedTransactionCount)}
          />
          <KpiCard
            tone="amber"
            icon={<IconClock size={18} />}
            label={t.outstanding}
            value={<VndText lang={lang} value={summary.outstandingPaymentAmount} compact />}
            title={formatMoney(lang, summary.outstandingPaymentAmount)}
            note={t.openItems(summary.activePaymentCount)}
          />
          <KpiCard
            tone="amber"
            icon={<IconReceipt size={18} />}
            label={t.contracted}
            value={<VndText lang={lang} value={summary.contractedReceivableAmount} compact />}
            title={formatMoney(lang, summary.contractedReceivableAmount)}
            note={t.activeOrdersRemaining}
          />
          <KpiCard
            tone="blue"
            icon={<IconCash size={18} />}
            label={t.orderValue}
            value={<VndText lang={lang} value={summary.orderCommercialValue} compact />}
            title={formatMoney(lang, summary.orderCommercialValue)}
            note={t.inSelectedRange}
          />
          <KpiCard
            tone="red"
            icon={<IconAlertTriangle size={18} />}
            label={t.failedTx}
            value={summary.failedTransactionCount}
            note={t.failedAttempts}
          />
          <KpiCard
            tone="neutral"
            icon={<IconCreditCard size={18} />}
            label={t.activePayments}
            value={summary.activePaymentCount}
            note={t.waitingCustomer}
          />
        </section>
      ) : null}

      <section className="admin-financial-chart-grid">
        <article className="admin-card admin-financial-section-card admin-financial-section-wide">
          <SectionHeader
            icon={<IconChartBar size={18} />}
            title={t.trendTitle}
            subtitle={t.trendSubtitle}
          />
          {trendQuery.isLoading ? <StateBlock>{t.loadingTrend}</StateBlock> : null}
          {trendQuery.isError ? <ErrorBlock error={trendQuery.error} /> : null}
          {trendQuery.data ? (
            <CollectionBars
              lang={lang}
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
            title={t.typeTitle}
            subtitle={t.typeSubtitle}
          />
          {breakdownQuery.isLoading ? <StateBlock>{t.loadingBreakdown}</StateBlock> : null}
          {breakdownQuery.isError ? <ErrorBlock error={breakdownQuery.error} /> : null}
          {breakdownQuery.data ? (
            <div className="admin-financial-breakdown-cards">
              {breakdownQuery.data.items.map((item) => (
                <article className="admin-financial-breakdown-card" key={item.paymentType}>
                  <header>
                    <strong>{formatEnumLabel(lang, item.paymentType)}</strong>
                    <span className="admin-financial-pill">{t.paidCount(item.paidCount)}</span>
                  </header>
                  <div className="admin-financial-breakdown-metrics">
                    <div>
                      <small>{t.collected}</small>
                      <em title={formatMoney(lang, item.collectedAmount)}>{formatKpiMoney(lang, item.collectedAmount)}</em>
                    </div>
                    <div>
                      <small>{t.waiting}</small>
                      <em title={formatMoney(lang, item.outstandingAmount)}>{formatKpiMoney(lang, item.outstandingAmount)}</em>
                    </div>
                    <div>
                      <small>{t.openExpired}</small>
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
          title={t.receivablesTitle}
          subtitle={t.receivablesSubtitle}
          aside={
            receivablesQuery.data ? (
              <div className="admin-financial-stat-pills">
                <span>{t.waitingAmount(formatKpiMoney(lang, receivablesQuery.data.outstandingPaymentAmount))}</span>
                <span>{t.byOrderAmount(formatKpiMoney(lang, receivablesQuery.data.contractedReceivableAmount))}</span>
              </div>
            ) : null
          }
        />
        {receivablesQuery.isLoading ? <StateBlock>{t.loadingReceivables}</StateBlock> : null}
        {receivablesQuery.isError ? <ErrorBlock error={receivablesQuery.error} /> : null}
        {receivablesQuery.data ? (
          <>
            <div className="admin-report-table-wrap admin-financial-table-wrap">
              <table className="admin-report-table admin-financial-table admin-financial-table-receivables">
                <thead>
                  <tr>
                    <th>{t.project}</th>
                    <th>{t.order}</th>
                    <th>{t.finalTotal}</th>
                    <th>{t.paid}</th>
                    <th>{t.remaining}</th>
                    <th>{t.activePayment}</th>
                    <th>{t.paymentCreated}</th>
                  </tr>
                </thead>
                <tbody>
                  {receivablesQuery.data.items.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <EmptyRow text={t.emptyReceivables} />
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
                          <div className="admin-report-cell-sub">{formatEnumLabel(lang, item.orderStatus || '')}</div>
                        </td>
                        <td className="admin-financial-money">{formatKpiMoney(lang, item.finalTotalAmount)}</td>
                        <td className="admin-financial-money">{formatKpiMoney(lang, item.paidAmount)}</td>
                        <td className="admin-financial-money is-warn">{formatKpiMoney(lang, item.remainingAmount)}</td>
                        <td>
                          {item.activePaymentType ? formatEnumLabel(lang, item.activePaymentType) : '—'}
                          <div className="admin-report-cell-sub">
                            {item.activePaymentStatus ? (
                              <StatusPill lang={lang} status={item.activePaymentStatus} />
                            ) : null}{' '}
                            {item.activePaymentAmount != null ? formatKpiMoney(lang, item.activePaymentAmount) : ''}
                          </div>
                        </td>
                        <td>
                          <span className={`admin-financial-flag ${item.isPaymentCreated ? 'is-yes' : 'is-no'}`}>
                            {item.isPaymentCreated ? t.yes : t.no}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pager
              lang={lang}
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
          title={t.projectsTitle}
          subtitle={t.projectsSubtitle}
          aside={
            <label className="admin-financial-search">
              <IconSearch size={15} />
              <input
                aria-label={t.searchProjects}
                placeholder={t.searchPlaceholder}
                value={projectKeyword}
                onChange={(event) => {
                  setProjectKeyword(event.target.value);
                  setProjectsPage(1);
                }}
              />
            </label>
          }
        />
        {projectsQuery.isLoading ? <StateBlock>{t.loadingProjects}</StateBlock> : null}
        {projectsQuery.isError ? <ErrorBlock error={projectsQuery.error} /> : null}
        {projectsQuery.data ? (
          <>
            <div className="admin-report-table-wrap admin-financial-table-wrap">
              <table className="admin-report-table admin-financial-table">
                <thead>
                  <tr>
                    <th>{t.project}</th>
                    <th>{t.customer}</th>
                    <th>{t.order}</th>
                    <th>{t.collected}</th>
                    <th>{t.remaining}</th>
                    <th>{t.activePayment}</th>
                    <th>{t.lastPaid}</th>
                  </tr>
                </thead>
                <tbody>
                  {projectsQuery.data.items.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <EmptyRow text={t.emptyProjects} />
                      </td>
                    </tr>
                  ) : (
                    projectsQuery.data.items.map((item) => (
                      <tr key={item.projectId}>
                        <td>
                          <strong className="admin-financial-code">{item.projectCode || item.projectName}</strong>
                          <div className="admin-report-cell-sub">
                            {item.projectName} · {formatEnumLabel(lang, item.projectStatus || '')}
                          </div>
                        </td>
                        <td>{item.customerName || '—'}</td>
                        <td>
                          {item.orderCode || '—'}
                          <div className="admin-report-cell-sub">{formatEnumLabel(lang, item.orderStatus || '')}</div>
                        </td>
                        <td className="admin-financial-money is-good" title={formatMoney(lang, item.totalProjectCashCollected)}>
                          {formatKpiMoney(lang, item.totalProjectCashCollected)}
                        </td>
                        <td className="admin-financial-money is-warn">{formatKpiMoney(lang, item.orderRemainingAmount)}</td>
                        <td>
                          {item.activePaymentType ? formatEnumLabel(lang, item.activePaymentType) : '—'}
                          <div className="admin-report-cell-sub">
                            {item.activePaymentStatus ? <StatusPill lang={lang} status={item.activePaymentStatus} /> : null}
                          </div>
                        </td>
                        <td>{formatDateTime(lang, item.lastPaidAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pager
              lang={lang}
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
          title={t.paymentsTitle}
          subtitle={t.paymentsSubtitle}
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
              {t.failedOnly}
            </label>
          }
        />
        {paymentsQuery.isLoading ? <StateBlock>{t.loadingPayments}</StateBlock> : null}
        {paymentsQuery.isError ? <ErrorBlock error={paymentsQuery.error} /> : null}
        {paymentsQuery.data ? (
          <>
            <div className="admin-report-table-wrap admin-financial-table-wrap">
              <table className="admin-report-table admin-financial-table">
                <thead>
                  <tr>
                    <th>{t.payment}</th>
                    <th>{t.projectOrder}</th>
                    <th>{t.type}</th>
                    <th>{t.amount}</th>
                    <th>{t.status}</th>
                    <th>{t.provider}</th>
                    <th>{t.attempts}</th>
                    <th>{t.lastFailure}</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentsQuery.data.items.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <EmptyRow text={t.emptyPayments} />
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
                        <td>{item.paymentType ? formatEnumLabel(lang, item.paymentType) : '—'}</td>
                        <td className="admin-financial-money">{formatKpiMoney(lang, item.amount)}</td>
                        <td>{item.status ? <StatusPill lang={lang} status={item.status} /> : '—'}</td>
                        <td>
                          <span className="admin-financial-pill">{item.lastProvider || '—'}</span>
                        </td>
                        <td>
                          <div className="admin-financial-attempt-cell">
                            <strong>{t.attemptTried(item.attemptCount)}</strong>
                            <span className={item.failedAttemptCount > 0 ? 'is-bad' : 'is-ok'}>
                              {item.failedAttemptCount > 0 ? t.attemptFailed(item.failedAttemptCount) : t.attemptOk}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="admin-financial-attempt-cell">
                            <strong className={item.lastFailureReason ? 'is-bad' : undefined}>
                              {item.lastFailureReason || t.noFailureReason}
                            </strong>
                            <span>
                              {item.lastAttemptAt
                                ? `${t.lastTriedAt}: ${formatDateTime(lang, item.lastAttemptAt)}`
                                : t.neverTried}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pager
              lang={lang}
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
          title={t.exceptionsTitle}
          subtitle={t.exceptionsSubtitle}
        />
        {exceptionsQuery.isLoading ? <StateBlock>{t.loadingExceptions}</StateBlock> : null}
        {exceptionsQuery.isError ? <ErrorBlock error={exceptionsQuery.error} /> : null}
        {exceptionsQuery.data ? (
          <>
            <div className="admin-report-table-wrap admin-financial-table-wrap">
              <table className="admin-report-table admin-financial-table">
                <thead>
                  <tr>
                    <th>{t.severity}</th>
                    <th>{t.type}</th>
                    <th>{t.content}</th>
                    <th>{t.amount}</th>
                    <th>{t.age}</th>
                    <th>{t.action}</th>
                  </tr>
                </thead>
                <tbody>
                  {exceptionsQuery.data.items.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <EmptyRow text={t.emptyExceptions} />
                      </td>
                    </tr>
                  ) : (
                    exceptionsQuery.data.items.map((item, index) => (
                      <tr key={`${item.exceptionType}-${item.targetResourceId ?? index}`}>
                        <td>
                          <span
                            className={`admin-financial-severity admin-financial-severity-${(item.severity || 'medium').toLowerCase()}`}
                          >
                            {formatSeverityLabel(lang, item.severity)}
                          </span>
                        </td>
                        <td>{formatEnumLabel(lang, item.exceptionType)}</td>
                        <td>
                          <strong>{item.title}</strong>
                          <div className="admin-report-cell-sub">{item.reason}</div>
                        </td>
                        <td className="admin-financial-money">{formatKpiMoney(lang, item.amount)}</td>
                        <td>{item.age != null ? t.days(item.age) : '—'}</td>
                        <td className="admin-financial-action">{item.recommendedAction || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pager
              lang={lang}
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
  value: ReactNode;
}) {
  return (
    <article className={`admin-financial-kpi admin-financial-kpi-${tone}`} title={title}>
      <span className="admin-financial-kpi-icon">{icon}</span>
      <div>
        <small>{label}</small>
        <strong className="admin-financial-kpi-value">{value}</strong>
        {note ? <p>{note}</p> : null}
      </div>
    </article>
  );
}

function VndText({
  lang,
  value,
  compact = false,
}: {
  lang: Lang;
  value: number | null | undefined;
  compact?: boolean;
}) {
  const parts = getMoneyParts(lang, value, compact);
  if (!parts) return '—';

  return (
    <span className="admin-vnd">
      <span className="admin-vnd-amount">{parts.amount}</span>
      <span className="admin-vnd-symbol" aria-hidden="true">
        ₫
      </span>
    </span>
  );
}

function CollectionBars({
  lang,
  series,
}: {
  lang: Lang;
  series: Array<{
    label: string;
    projectStartFee: number;
    deposit: number;
    remainingPayment: number;
    total: number;
  }>;
}) {
  const t = financialCopy[lang];
  const max = Math.max(1, ...series.map((item) => item.total));

  if (series.length === 0) {
    return <EmptyRow text={t.emptyTrend} />;
  }

  return (
    <div className="admin-financial-trend">
      <ul className="admin-financial-trend-list">
        {series.map((item) => {
          const widthPct = Math.max((item.total / max) * 100, item.total > 0 ? 8 : 0);
          const parts = [
            { key: 'start', label: t.startFee, amount: item.projectStartFee, color: '#5c4030' },
            { key: 'deposit', label: t.deposit, amount: item.deposit, color: '#c4a574' },
            { key: 'remaining', label: t.remainingPayment, amount: item.remainingPayment, color: '#b45309' },
          ].filter((part) => part.amount > 0);

          return (
            <li className="admin-financial-trend-row" key={item.label}>
              <div className="admin-financial-trend-row-head">
                <strong>{formatTrendPeriod(lang, item.label)}</strong>
                <span title={formatMoney(lang, item.total)}>{formatKpiMoney(lang, item.total)}</span>
              </div>

              <div className="admin-financial-trend-track" aria-hidden={item.total <= 0}>
                <div className="admin-financial-trend-fill" style={{ width: `${widthPct}%` }}>
                  {parts.length > 0
                    ? parts.map((part) => (
                        <span
                          key={part.key}
                          style={{
                            flexGrow: part.amount,
                            background: part.color,
                          }}
                          title={`${part.label}: ${formatMoney(lang, part.amount)}`}
                        />
                      ))
                    : null}
                </div>
              </div>

              <div className="admin-financial-trend-parts">
                {parts.length === 0 ? (
                  <em>{t.noCollectionMonth}</em>
                ) : (
                  parts.map((part) => (
                    <span key={part.key}>
                      <i style={{ background: part.color }} />
                      {part.label}: <b title={formatMoney(lang, part.amount)}>{formatKpiMoney(lang, part.amount)}</b>
                    </span>
                  ))
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <ul className="admin-financial-bar-legend">
        <li>
          <i style={{ background: '#5c4030' }} /> {t.startFee}
        </li>
        <li>
          <i style={{ background: '#c4a574' }} /> {t.deposit}
        </li>
        <li>
          <i style={{ background: '#b45309' }} /> {t.remainingPayment}
        </li>
      </ul>
    </div>
  );
}

function StatusPill({ lang, status }: { lang: Lang; status: string }) {
  const tone = statusTone(status);
  return <span className={`admin-financial-status admin-financial-status-${tone}`}>{formatEnumLabel(lang, status)}</span>;
}

function statusTone(status: string) {
  const value = status.toUpperCase();
  if (value === 'PAID') return 'good';
  if (value === 'PENDING' || value === 'PROCESSING') return 'warn';
  if (value === 'EXPIRED' || value === 'CANCELLED' || value === 'REFUNDED') return 'bad';
  return 'neutral';
}

function Pager({
  lang,
  page,
  totalPages,
  totalItems,
  onChange,
}: {
  lang: Lang;
  page: number;
  totalPages: number;
  totalItems: number;
  onChange: (page: number) => void;
}) {
  const t = financialCopy[lang];
  return (
    <div className="admin-financial-pager">
      <span>{t.pageItems(page, totalPages, totalItems)}</span>
      <div>
        <button disabled={page <= 1} type="button" onClick={() => onChange(page - 1)}>
          {t.prev}
        </button>
        <button disabled={page >= totalPages} type="button" onClick={() => onChange(page + 1)}>
          {t.next}
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

function shortenCode(value: string | null | undefined, keep = 6) {
  if (!value) return '—';
  if (value.length <= keep * 2 + 1) return value;
  return `${value.slice(0, keep)}…${value.slice(-keep)}`;
}
