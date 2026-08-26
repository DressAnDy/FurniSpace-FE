import { useEffect, useMemo, useState, type ReactNode } from 'react';
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

export type FinancialListView = 'receivables' | 'projects' | 'payments' | 'exceptions';

type FinancialPanelProps = {
  dateParams: DateParams;
  fromDate: string;
  toDate: string;
  activeList: FinancialListView;
};

type KpiTone = 'green' | 'amber' | 'blue' | 'red' | 'neutral';

const DEFAULT_LIST_PAGE_SIZE = 10;
const MIN_PAGE_SIZE = 1;
const MAX_PAGE_SIZE = 100;

export function FinancialPanel({ dateParams, fromDate, toDate, activeList }: FinancialPanelProps) {
  const { lang } = useLang();
  const t = financialCopy[lang];
  const [listPageSize, setListPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [receivablesPage, setReceivablesPage] = useState(1);
  const [projectsPage, setProjectsPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [exceptionsPage, setExceptionsPage] = useState(1);
  const [projectKeyword, setProjectKeyword] = useState('');
  const [paymentFailedOnly, setPaymentFailedOnly] = useState(false);

  const handlePageSizeChange = (nextSize: number) => {
    setListPageSize(nextSize);
    setReceivablesPage(1);
    setProjectsPage(1);
    setPaymentsPage(1);
    setExceptionsPage(1);
  };

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
  const receivablesQuery = useAdminFinancialReceivables(
    {
      page: receivablesPage,
      pageSize: listPageSize,
      sortBy: 'confirmedAt',
      sortDirection: 'desc',
    },
    { enabled: activeList === 'receivables' },
  );
  const projectsQuery = useAdminFinancialProjects(
    {
      keyword: projectKeyword.trim() || undefined,
      page: projectsPage,
      pageSize: listPageSize,
      sortBy: 'createdAt',
      sortDirection: 'desc',
    },
    { enabled: activeList === 'projects' },
  );
  const paymentsQuery = useAdminFinancialPayments(
    {
      page: paymentsPage,
      pageSize: listPageSize,
      currency: 'VND',
      hasFailedAttempt: paymentFailedOnly ? true : undefined,
      sortBy: 'createdAt',
      sortDirection: 'desc',
    },
    { enabled: activeList === 'payments' },
  );
  const exceptionsQuery = useAdminFinancialExceptions(
    {
      page: exceptionsPage,
      pageSize: listPageSize,
    },
    { enabled: activeList === 'exceptions' },
  );

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
            <CollectionTrendChart
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

      <section className="admin-card admin-financial-section-card admin-financial-active-list" aria-live="polite">
        {activeList === 'receivables' ? (
          <>
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
                  pageSize={listPageSize}
                  totalPages={receivablesQuery.data.totalPages}
                  totalItems={receivablesQuery.data.totalItems}
                  onChange={setReceivablesPage}
                  onPageSizeChange={handlePageSizeChange}
                />
              </>
            ) : null}
          </>
        ) : null}

        {activeList === 'projects' ? (
          <>
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
                  pageSize={listPageSize}
                  totalPages={projectsQuery.data.totalPages}
                  totalItems={projectsQuery.data.totalItems}
                  onChange={setProjectsPage}
                  onPageSizeChange={handlePageSizeChange}
                />
              </>
            ) : null}
          </>
        ) : null}

        {activeList === 'payments' ? (
          <>
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
                  pageSize={listPageSize}
                  totalPages={paymentsQuery.data.totalPages}
                  totalItems={paymentsQuery.data.totalItems}
                  onChange={setPaymentsPage}
                  onPageSizeChange={handlePageSizeChange}
                />
              </>
            ) : null}
          </>
        ) : null}

        {activeList === 'exceptions' ? (
          <>
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
                  pageSize={listPageSize}
                  totalPages={exceptionsQuery.data.totalPages}
                  totalItems={exceptionsQuery.data.totalItems}
                  onChange={setExceptionsPage}
                  onPageSizeChange={handlePageSizeChange}
                />
              </>
            ) : null}
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

const BAR_SERIES = [
  { key: 'startFee', color: '#5c4030' },
  { key: 'deposit', color: '#c4a574' },
  { key: 'remaining', color: '#b45309' },
] as const;

function CollectionTrendChart({
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
  const barValues = series.flatMap((item) => [item.projectStartFee, item.deposit, item.remainingPayment]);
  const yMax = niceAxisMax(Math.max(0, ...barValues));
  const ticks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];

  if (series.length === 0) {
    return <EmptyRow text={t.emptyTrend} />;
  }

  const labels = {
    startFee: t.startFee,
    deposit: t.deposit,
    remaining: t.remainingPayment,
  };

  return (
    <div className="admin-financial-trend-chart">
      <div className="admin-financial-trend-plot">
        <div className="admin-financial-trend-yaxis" aria-hidden="true">
          {[...ticks].reverse().map((tick) => (
            <span key={tick} title={formatMoney(lang, tick)}>
              {formatAxisMoney(lang, tick)}
            </span>
          ))}
        </div>

        <div className="admin-financial-trend-canvas admin-financial-trend-canvas-bars">
          <div className="admin-financial-trend-grid" aria-hidden="true">
            {ticks.map((tick) => (
              <span key={tick} />
            ))}
          </div>

          <div className="admin-financial-trend-groups" role="list">
            {series.map((item) => {
              const periodLabel = formatTrendPeriod(lang, item.label);
              const values = {
                startFee: item.projectStartFee,
                deposit: item.deposit,
                remaining: item.remainingPayment,
              } as const;

              return (
                <div className="admin-financial-trend-group" key={item.label} role="listitem">
                  <div className="admin-financial-trend-group-total" title={formatMoney(lang, item.total)}>
                    {item.total > 0 ? formatKpiMoney(lang, item.total) : '—'}
                  </div>
                  <div className="admin-financial-trend-group-bars">
                    {BAR_SERIES.map((bar) => {
                      const value = values[bar.key];
                      const heightPct = yMax > 0 ? Math.min((value / yMax) * 100, 100) : 0;
                      return (
                        <div
                          key={bar.key}
                          className="admin-financial-trend-bar-wrap"
                          title={`${periodLabel} · ${labels[bar.key]}: ${formatMoney(lang, value)}`}
                        >
                          <div
                            className={`admin-financial-trend-bar${value <= 0 ? ' is-empty' : ''}`}
                            style={{
                              height: `${Math.max(heightPct, value > 0 ? 3 : 0)}%`,
                              background: bar.color,
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <em>{periodLabel}</em>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ul className="admin-financial-bar-legend">
        {BAR_SERIES.map((bar) => (
          <li key={bar.key}>
            <i style={{ background: bar.color }} /> {labels[bar.key]}
          </li>
        ))}
      </ul>
    </div>
  );
}

function niceAxisMax(value: number) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const nice =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

function formatAxisMoney(lang: Lang, value: number) {
  if (value <= 0) return '0';
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    if (lang === 'vi') {
      return millions >= 10 ? `${Math.round(millions)}tr` : `${millions.toFixed(1).replace(/\.0$/, '')}tr`;
    }
    return millions >= 10 ? `${Math.round(millions)}M` : `${millions.toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${Math.round(value / 1_000)}k`;
  }
  return formatKpiMoney(lang, value);
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
  pageSize,
  totalPages,
  totalItems,
  onChange,
  onPageSizeChange,
}: {
  lang: Lang;
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  onChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const t = financialCopy[lang];
  const safeTotalPages = Math.max(totalPages, 1);
  const [pageDraft, setPageDraft] = useState(String(page));
  const [sizeDraft, setSizeDraft] = useState(String(pageSize));

  useEffect(() => {
    setPageDraft(String(page));
  }, [page]);

  useEffect(() => {
    setSizeDraft(String(pageSize));
  }, [pageSize]);

  const commitPage = () => {
    const parsed = Number.parseInt(pageDraft, 10);
    if (!Number.isFinite(parsed)) {
      setPageDraft(String(page));
      return;
    }
    const next = Math.min(Math.max(parsed, 1), safeTotalPages);
    setPageDraft(String(next));
    if (next !== page) onChange(next);
  };

  const commitPageSize = () => {
    const parsed = Number.parseInt(sizeDraft, 10);
    if (!Number.isFinite(parsed)) {
      setSizeDraft(String(pageSize));
      return;
    }
    const next = Math.min(Math.max(parsed, MIN_PAGE_SIZE), MAX_PAGE_SIZE);
    setSizeDraft(String(next));
    if (next !== pageSize) onPageSizeChange(next);
  };

  return (
    <div className="admin-financial-pager">
      <div className="admin-financial-pager-meta">
        <label className="admin-financial-pager-field">
          <span>{t.rowsPerPage}</span>
          <input
            aria-label={t.rowsPerPage}
            inputMode="numeric"
            min={MIN_PAGE_SIZE}
            max={MAX_PAGE_SIZE}
            type="number"
            value={sizeDraft}
            onBlur={commitPageSize}
            onChange={(event) => setSizeDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
              }
            }}
          />
        </label>
        <label className="admin-financial-pager-field">
          <span>{t.pageLabel}</span>
          <input
            aria-label={t.pageLabel}
            inputMode="numeric"
            min={1}
            max={safeTotalPages}
            type="number"
            value={pageDraft}
            onBlur={commitPage}
            onChange={(event) => setPageDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
              }
            }}
          />
          <span className="admin-financial-pager-of">/ {safeTotalPages}</span>
        </label>
        <span className="admin-financial-pager-total">{t.totalRows(totalItems)}</span>
      </div>
      <div className="admin-financial-pager-nav">
        <button disabled={page <= 1} type="button" onClick={() => onChange(page - 1)}>
          {t.prev}
        </button>
        <button disabled={page >= safeTotalPages} type="button" onClick={() => onChange(page + 1)}>
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
