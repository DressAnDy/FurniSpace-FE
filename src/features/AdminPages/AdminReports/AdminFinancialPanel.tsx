import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  IconAlertTriangle,
  IconCash,
  IconChartBar,
  IconChevronRight,
  IconClock,
  IconCreditCard,
  IconExternalLink,
  IconFolder,
  IconReceipt,
  IconSearch,
  IconWorld,
  IconX,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import { useLang, type Lang } from '@/app/providers/useLang';
import {
  getAdminFinancialServiceResultMessage,
  type AdminFinancialDrilldownBreakdownItemDto,
  type AdminFinancialDrilldownItemDto,
  type AdminFinancialDrilldownMetric,
  type AdminFinancialCollectionState,
  type AdminFinancialProjectStatementDto,
  type AdminFinancialReceivableOrderDetailDto,
  type AdminFinancialSummaryDrilldownDto,
} from '@/services/api/adminFinancial';
import {
  useAdminFinancialCollectionTrend,
  useAdminFinancialExceptions,
  useAdminFinancialPaymentBreakdown,
  useAdminFinancialPayments,
  useAdminFinancialProjectStatement,
  useAdminFinancialProjects,
  useAdminFinancialReceivableOrderDetail,
  useAdminFinancialReceivables,
  useAdminFinancialSummary,
  useAdminFinancialSummaryDrilldown,
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

export type FinancialListView = 'receivables' | 'projects' | 'payments';

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
  const [receivableKeyword, setReceivableKeyword] = useState('');
  const [receivableCollectionState, setReceivableCollectionState] = useState<AdminFinancialCollectionState | ''>('');
  const [selectedReceivableOrderId, setSelectedReceivableOrderId] = useState<string | null>(null);
  const [projectKeyword, setProjectKeyword] = useState('');
  const [selectedStatementProjectId, setSelectedStatementProjectId] = useState<string | null>(null);
  const [statementPage, setStatementPage] = useState(1);
  const [statementPageSize, setStatementPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [paymentFailedOnly, setPaymentFailedOnly] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<AdminFinancialDrilldownMetric | null>(null);
  const [drilldownPage, setDrilldownPage] = useState(1);
  const [drilldownPageSize, setDrilldownPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);

  useEffect(() => {
    setDrilldownPage(1);
    setReceivablesPage(1);
    setProjectsPage(1);
    setPaymentsPage(1);
    setStatementPage(1);
  }, [dateParams.from, dateParams.to]);

  useEffect(() => {
    if (activeList !== 'receivables') setSelectedReceivableOrderId(null);
    if (activeList !== 'projects') setSelectedStatementProjectId(null);
  }, [activeList]);

  useEffect(() => {
    if (!selectedMetric) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById('admin-financial-drilldown')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedMetric]);

  const handlePageSizeChange = (nextSize: number) => {
    setListPageSize(nextSize);
    setReceivablesPage(1);
    setProjectsPage(1);
    setPaymentsPage(1);
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
  const drilldownQuery = useAdminFinancialSummaryDrilldown(
    selectedMetric ?? 'COLLECTED',
    {
      from: dateParams.from,
      to: dateParams.to,
      currency: 'VND',
      groupBy: selectedMetric === 'COLLECTED' ? 'PROJECT' : undefined,
      page: drilldownPage,
      pageSize: drilldownPageSize,
      sortBy: selectedMetric === 'COLLECTED' ? 'totalCollectedAmount' : 'occurredAt',
      sortDirection: 'desc',
    },
    { enabled: selectedMetric != null },
  );
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
      keyword: receivableKeyword.trim() || undefined,
      collectionState: receivableCollectionState || undefined,
      confirmedFrom: dateParams.from,
      confirmedTo: dateParams.to,
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
      from: dateParams.from,
      to: dateParams.to,
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
      createdFrom: dateParams.from,
      createdTo: dateParams.to,
      hasFailedAttempt: paymentFailedOnly ? true : undefined,
      sortBy: 'createdAt',
      sortDirection: 'desc',
    },
    { enabled: activeList === 'payments' },
  );
  const receivableDetailQuery = useAdminFinancialReceivableOrderDetail(selectedReceivableOrderId ?? '', {
    enabled: activeList === 'receivables' && Boolean(selectedReceivableOrderId),
  });
  const statementQuery = useAdminFinancialProjectStatement(
    selectedStatementProjectId ?? '',
    {
      from: dateParams.from,
      to: dateParams.to,
      page: statementPage,
      pageSize: statementPageSize,
      sortDirection: 'desc',
    },
    { enabled: activeList === 'projects' && Boolean(selectedStatementProjectId) },
  );

  const summary = summaryQuery.data;
  const handleKpiClick = (metric: AdminFinancialDrilldownMetric) => {
    setSelectedMetric((current) => (current === metric ? null : metric));
    setDrilldownPage(1);
  };

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
            active={selectedMetric === 'COLLECTED'}
            onClick={() => handleKpiClick('COLLECTED')}
            tone="green"
            icon={<IconCreditCard size={18} />}
            label={t.collected}
            value={<VndText lang={lang} value={summary.collectedAmount} compact />}
            title={formatMoney(lang, summary.collectedAmount)}
            note={t.failedInRange(summary.failedTransactionCount)}
          />
          <KpiCard
            active={selectedMetric === 'OUTSTANDING'}
            onClick={() => handleKpiClick('OUTSTANDING')}
            tone="amber"
            icon={<IconClock size={18} />}
            label={t.outstanding}
            value={<VndText lang={lang} value={summary.outstandingPaymentAmount} compact />}
            title={formatMoney(lang, summary.outstandingPaymentAmount)}
            note={t.openItems(summary.activePaymentCount)}
          />
          <KpiCard
            active={selectedMetric === 'CONTRACTED_RECEIVABLE'}
            onClick={() => handleKpiClick('CONTRACTED_RECEIVABLE')}
            tone="amber"
            icon={<IconReceipt size={18} />}
            label={t.contracted}
            value={<VndText lang={lang} value={summary.contractedReceivableAmount} compact />}
            title={formatMoney(lang, summary.contractedReceivableAmount)}
            note={t.activeOrdersRemaining}
          />
          <KpiCard
            active={selectedMetric === 'ORDER_VALUE'}
            onClick={() => handleKpiClick('ORDER_VALUE')}
            tone="blue"
            icon={<IconCash size={18} />}
            label={t.orderValue}
            value={<VndText lang={lang} value={summary.orderCommercialValue} compact />}
            title={formatMoney(lang, summary.orderCommercialValue)}
            note={t.inSelectedRange}
          />
          <KpiCard
            active={selectedMetric === 'FAILED_TRANSACTIONS'}
            onClick={() => handleKpiClick('FAILED_TRANSACTIONS')}
            tone="red"
            icon={<IconAlertTriangle size={18} />}
            label={t.failedTx}
            value={summary.failedTransactionCount}
            note={t.failedAttempts}
          />
          <KpiCard
            active={selectedMetric === 'ACTIVE_PAYMENTS'}
            onClick={() => handleKpiClick('ACTIVE_PAYMENTS')}
            tone="neutral"
            icon={<IconCreditCard size={18} />}
            label={t.activePayments}
            value={summary.activePaymentCount}
            note={t.waitingCustomer}
          />
        </section>
      ) : null}

      {selectedMetric ? (
        <FinancialKpiDrilldown
          data={drilldownQuery.data}
          error={drilldownQuery.isError ? drilldownQuery.error : null}
          isLoading={drilldownQuery.isLoading || drilldownQuery.isFetching}
          lang={lang}
          metric={selectedMetric}
          page={drilldownPage}
          pageSize={drilldownPageSize}
          onClose={() => setSelectedMetric(null)}
          onPageChange={setDrilldownPage}
          onPageSizeChange={(nextSize) => {
            setDrilldownPageSize(nextSize);
            setDrilldownPage(1);
          }}
          onRetry={() => void drilldownQuery.refetch()}
        />
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
                <div className="admin-financial-list-filters">
                  <label className="admin-financial-search">
                    <IconSearch size={15} />
                    <input
                      aria-label={t.searchReceivables}
                      placeholder={t.searchOrderPlaceholder}
                      value={receivableKeyword}
                      onChange={(event) => {
                        setReceivableKeyword(event.target.value);
                        setReceivablesPage(1);
                      }}
                    />
                  </label>
                  <select
                    aria-label={t.collectionState}
                    value={receivableCollectionState}
                    onChange={(event) => {
                      setReceivableCollectionState(event.target.value as AdminFinancialCollectionState | '');
                      setReceivablesPage(1);
                    }}
                  >
                    <option value="">{t.allCollectionStates}</option>
                    {(['NOT_CREATED', 'PENDING', 'PROCESSING', 'EXPIRED', 'FAILED'] as const).map((state) => (
                      <option key={state} value={state}>
                        {formatEnumLabel(lang, state)}
                      </option>
                    ))}
                  </select>
                </div>
              }
            />
            {receivablesQuery.data ? (
              <div className="admin-financial-stat-pills">
                <span>{t.waitingAmount(formatKpiMoney(lang, receivablesQuery.data.outstandingPaymentAmount))}</span>
                <span>{t.byOrderAmount(formatKpiMoney(lang, receivablesQuery.data.contractedReceivableAmount))}</span>
                <span>{t.withoutPayment(receivablesQuery.data.withoutPaymentCount ?? 0)}</span>
                <span>{t.activeCollections(receivablesQuery.data.activeCollectionCount ?? 0)}</span>
              </div>
            ) : null}
            {receivablesQuery.isLoading ? <StateBlock>{t.loadingReceivables}</StateBlock> : null}
            {receivablesQuery.isError ? <ErrorBlock error={receivablesQuery.error} /> : null}
            {receivablesQuery.data ? (
              <>
                <div className="admin-report-table-wrap admin-financial-table-wrap">
                  <table className="admin-report-table admin-financial-table admin-financial-table-receivables">
                    <thead>
                      <tr>
                        <th>{t.order}</th>
                        <th>{t.projectCustomer}</th>
                        <th>{t.paymentProgress}</th>
                        <th>{t.remaining}</th>
                        <th>{t.collectionState}</th>
                        <th>{t.receivableAge}</th>
                        <th>{t.lastPaid}</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {receivablesQuery.data.items.length === 0 ? (
                        <tr>
                          <td colSpan={8}>
                            <EmptyRow text={t.emptyReceivables} />
                          </td>
                        </tr>
                      ) : (
                        receivablesQuery.data.items.map((item) => (
                          <tr key={item.orderId} className={selectedReceivableOrderId === item.orderId ? 'is-selected' : undefined}>
                            <td>
                              <button
                                type="button"
                                className="admin-financial-table-link"
                                onClick={() => setSelectedReceivableOrderId(item.orderId)}
                              >
                                {item.orderCode}
                              </button>
                              <div className="admin-report-cell-sub">{formatEnumLabel(lang, item.orderStatus || '')}</div>
                              <div className="admin-report-cell-sub">{formatDateTime(lang, item.confirmedAt)}</div>
                            </td>
                            <td>
                              <Link className="admin-financial-code-link" to={`/admin/projects?projectId=${item.projectId}`}>
                                {item.projectCode || item.projectName}
                              </Link>
                              <div className="admin-report-cell-sub">{item.customerName || item.projectName}</div>
                            </td>
                            <td>
                              <PaymentProgress
                                lang={lang}
                                paid={item.paidAmount}
                                percentage={item.paymentProgressPercentage}
                                total={item.finalTotalAmount}
                              />
                            </td>
                            <td className="admin-financial-money is-warn">{formatKpiMoney(lang, item.remainingAmount)}</td>
                            <td>
                              <CollectionStatePill lang={lang} state={item.collectionState} />
                              <div className="admin-report-cell-sub">
                                {item.activePaymentAmount != null ? formatKpiMoney(lang, item.activePaymentAmount) : t.noActivePayment}
                              </div>
                            </td>
                            <td>
                              {item.receivableAgeDays != null ? t.days(item.receivableAgeDays) : '—'}
                              {item.lastPaymentFailureReason ? (
                                <div className="admin-report-cell-sub is-bad">{item.lastPaymentFailureReason}</div>
                              ) : null}
                            </td>
                            <td>{formatDateTime(lang, item.lastPaidAt)}</td>
                            <td>
                              <button
                                type="button"
                                className="admin-financial-row-open"
                                onClick={() => setSelectedReceivableOrderId(item.orderId)}
                                aria-label={t.openOrderDetail}
                              >
                                <IconChevronRight size={16} />
                              </button>
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
                {selectedReceivableOrderId ? (
                  <ReceivableOrderDetailPanel
                    data={receivableDetailQuery.data}
                    error={receivableDetailQuery.isError ? receivableDetailQuery.error : null}
                    isLoading={receivableDetailQuery.isLoading}
                    lang={lang}
                    onClose={() => setSelectedReceivableOrderId(null)}
                    onRetry={() => void receivableDetailQuery.refetch()}
                  />
                ) : null}
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
                          <tr key={item.projectId} className={selectedStatementProjectId === item.projectId ? 'is-selected' : undefined}>
                            <td>
                              <button
                                type="button"
                                className="admin-financial-table-link"
                                onClick={() => {
                                  setSelectedStatementProjectId(item.projectId);
                                  setStatementPage(1);
                                }}
                              >
                                {item.projectCode || item.projectName}
                              </button>
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
                {selectedStatementProjectId ? (
                  <ProjectStatementPanel
                    data={statementQuery.data}
                    error={statementQuery.isError ? statementQuery.error : null}
                    isLoading={statementQuery.isLoading}
                    lang={lang}
                    page={statementPage}
                    pageSize={statementPageSize}
                    onClose={() => setSelectedStatementProjectId(null)}
                    onPageChange={setStatementPage}
                    onPageSizeChange={(nextSize) => {
                      setStatementPageSize(nextSize);
                      setStatementPage(1);
                    }}
                    onRetry={() => void statementQuery.refetch()}
                  />
                ) : null}
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
      </section>
    </div>
  );
}

function PaymentProgress({
  lang,
  paid,
  percentage,
  total,
}: {
  lang: Lang;
  paid: number | null;
  percentage: number | null | undefined;
  total: number;
}) {
  const safePercentage = Math.min(
    Math.max(percentage ?? (total > 0 ? ((paid ?? 0) / total) * 100 : 0), 0),
    100,
  );

  return (
    <div className="admin-financial-payment-progress">
      <div>
        <strong>{formatKpiMoney(lang, paid)}</strong>
        <span>{safePercentage.toFixed(0)}%</span>
      </div>
      <i>
        <b style={{ width: `${safePercentage}%` }} />
      </i>
      <small>{formatMoney(lang, total)}</small>
    </div>
  );
}

function CollectionStatePill({
  lang,
  state,
}: {
  lang: Lang;
  state: AdminFinancialCollectionState | null | undefined;
}) {
  const normalized = state ?? 'NOT_CREATED';
  return (
    <span className={`admin-financial-collection-state state-${normalized.toLowerCase().replace('_', '-')}`}>
      {formatEnumLabel(lang, normalized)}
    </span>
  );
}

function ReceivableOrderDetailPanel({
  data,
  error,
  isLoading,
  lang,
  onClose,
  onRetry,
}: {
  data: AdminFinancialReceivableOrderDetailDto | undefined;
  error: unknown;
  isLoading: boolean;
  lang: Lang;
  onClose: () => void;
  onRetry: () => void;
}) {
  const t = financialCopy[lang];

  return (
    <section className="admin-financial-inline-detail" aria-label={t.orderReceivableDetail}>
      <header>
        <div>
          <span>{t.orderReceivableDetail}</span>
          <h4>{data?.order.orderCode ?? t.loadingReceivableDetail}</h4>
          <p>{data ? `${data.project.projectCode || data.project.projectName} · ${data.customer.customerName || '—'}` : ''}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={t.closeOrderDetail}>
          <IconX size={16} />
        </button>
      </header>

      {isLoading ? <StateBlock>{t.loadingReceivableDetail}</StateBlock> : null}
      {error ? (
        <>
          <ErrorBlock error={error} />
          <button type="button" className="admin-button admin-button-ghost" onClick={onRetry}>
            {t.retryDrilldown}
          </button>
        </>
      ) : null}

      {data && !isLoading ? (
        <>
          <div className="admin-financial-detail-summary">
            <DetailMetric label={t.finalTotal} value={formatMoney(lang, data.summary.finalTotalAmount ?? data.order.finalTotalAmount)} />
            <DetailMetric label={t.paid} value={formatMoney(lang, data.summary.paidAmount)} tone="good" />
            <DetailMetric label={t.remaining} value={formatMoney(lang, data.summary.remainingAmount)} tone="warn" />
            <DetailMetric label={t.paymentProgress} value={`${data.summary.paymentProgressPercentage.toFixed(1)}%`} />
            <DetailMetric label={t.receivableAge} value={t.days(data.summary.receivableAgeDays)} />
            <DetailMetric label={t.collectionState} value={formatEnumLabel(lang, data.summary.collectionState)} />
          </div>

          {data.suggestedAction ? (
            <div className="admin-financial-suggested-action">
              <span>{t.suggestedAction}</span>
              <strong>{data.suggestedAction}</strong>
            </div>
          ) : null}

          <div className="admin-financial-payment-rounds">
            {data.paymentRounds.map((round) => (
              <article key={`${round.paymentType}-${round.paymentId ?? 'empty'}`}>
                <header>
                  <strong>{formatEnumLabel(lang, round.paymentType)}</strong>
                  <StatusPill lang={lang} status={round.status} />
                </header>
                <b>{formatMoney(lang, round.amount)}</b>
                <dl>
                  <div>
                    <dt>{t.payment}</dt>
                    <dd>{round.paymentCode || t.notCreated}</dd>
                  </div>
                  <div>
                    <dt>{t.provider}</dt>
                    <dd>{round.provider ? formatEnumLabel(lang, round.provider) : '—'}</dd>
                  </div>
                  <div>
                    <dt>{t.paidAt}</dt>
                    <dd>{formatDateTime(lang, round.paidAt)}</dd>
                  </div>
                  <div>
                    <dt>{t.expiredAt}</dt>
                    <dd>{formatDateTime(lang, round.expiredAt)}</dd>
                  </div>
                </dl>
                {round.lastFailureReason ? <p className="is-bad">{round.lastFailureReason}</p> : null}
              </article>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

function ProjectStatementPanel({
  data,
  error,
  isLoading,
  lang,
  page,
  pageSize,
  onClose,
  onPageChange,
  onPageSizeChange,
  onRetry,
}: {
  data: AdminFinancialProjectStatementDto | undefined;
  error: unknown;
  isLoading: boolean;
  lang: Lang;
  page: number;
  pageSize: number;
  onClose: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onRetry: () => void;
}) {
  const t = financialCopy[lang];

  return (
    <section className="admin-financial-inline-detail admin-financial-statement" aria-label={t.projectStatement}>
      <header>
        <div>
          <span>{t.projectStatement}</span>
          <h4>{data?.project.projectCode ?? t.loadingStatement}</h4>
          <p>{data ? `${data.project.projectName} · ${data.project.customerName || '—'}` : ''}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={t.closeStatement}>
          <IconX size={16} />
        </button>
      </header>

      {isLoading ? <StateBlock>{t.loadingStatement}</StateBlock> : null}
      {error ? (
        <>
          <ErrorBlock error={error} />
          <button type="button" className="admin-button admin-button-ghost" onClick={onRetry}>
            {t.retryDrilldown}
          </button>
        </>
      ) : null}

      {data && !isLoading ? (
        <>
          <div className="admin-financial-detail-summary statement-summary">
            <DetailMetric label={t.openingBalance} value={formatMoney(lang, data.summary.openingBalance)} />
            <DetailMetric label={t.totalCollected} value={formatMoney(lang, data.summary.totalCollected)} tone="good" />
            <DetailMetric label={t.totalRefunded} value={formatMoney(lang, data.summary.totalRefunded)} tone="bad" />
            <DetailMetric label={t.netCollected} value={formatMoney(lang, data.summary.netCollected)} />
            <DetailMetric label={t.closingBalance} value={formatMoney(lang, data.summary.closingBalance)} />
          </div>

          <div className="admin-report-table-wrap admin-financial-table-wrap">
            <table className="admin-report-table admin-financial-table admin-financial-statement-table">
              <thead>
                <tr>
                  <th>{t.transactionDate}</th>
                  <th>{t.statementContent}</th>
                  <th>{t.reference}</th>
                  <th>{t.type}</th>
                  <th>{t.moneyIn}</th>
                  <th>{t.moneyOut}</th>
                  <th>{t.runningBalance}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyRow text={t.emptyStatement} />
                    </td>
                  </tr>
                ) : (
                  data.items.map((item) => (
                    <tr key={item.entryId}>
                      <td>{formatDateTime(lang, item.occurredAt)}</td>
                      <td>
                        <strong>{item.description}</strong>
                        <div className="admin-report-cell-sub">
                          {item.provider ? formatEnumLabel(lang, item.provider) : '—'}
                          {item.status ? ` · ${formatEnumLabel(lang, item.status)}` : ''}
                        </div>
                      </td>
                      <td>
                        <span className="admin-financial-mono">{item.referenceCode || '—'}</span>
                        <div className="admin-report-cell-sub">{item.orderCode || '—'}</div>
                      </td>
                      <td>{formatEnumLabel(lang, item.paymentType || item.entryType)}</td>
                      <td className="admin-financial-money is-good">
                        {item.direction === 'CREDIT' ? formatKpiMoney(lang, item.amount) : '—'}
                      </td>
                      <td className="admin-financial-money is-bad">
                        {item.direction === 'DEBIT' ? formatKpiMoney(lang, item.amount) : '—'}
                      </td>
                      <td className="admin-financial-money">
                        <strong>{formatKpiMoney(lang, item.runningBalance)}</strong>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pager
            lang={lang}
            page={data.page || page}
            pageSize={pageSize}
            totalPages={data.totalPages}
            totalItems={data.totalItems}
            onChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </>
      ) : null}
    </section>
  );
}

function DetailMetric({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: 'good' | 'warn' | 'bad';
  value: ReactNode;
}) {
  return (
    <div className={tone ? `tone-${tone}` : undefined}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function FinancialExceptionsPanel({
  enabled = true,
  onSelectProject,
}: {
  enabled?: boolean;
  onSelectProject?: (projectId: string) => void;
}) {
  const { lang } = useLang();
  const t = financialCopy[lang];
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);

  const exceptionsQuery = useAdminFinancialExceptions(
    {
      page,
      pageSize,
    },
    { enabled },
  );

  return (
    <section className="admin-card admin-financial-section-card admin-pr-money-exceptions" aria-live="polite">
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
                  exceptionsQuery.data.items.map((item, index) => {
                    const canOpen = Boolean(item.projectId && onSelectProject);
                    return (
                      <tr
                        key={`${item.exceptionType}-${item.targetResourceId ?? index}`}
                        className={canOpen ? 'is-clickable' : undefined}
                        onClick={() => {
                          if (item.projectId && onSelectProject) onSelectProject(item.projectId);
                        }}
                      >
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
                          {item.projectId && !onSelectProject ? (
                            <div className="admin-report-cell-sub">
                              <Link
                                className="admin-financial-code-link"
                                to={`/admin/projects?projectId=${item.projectId}`}
                              >
                                {t.openProject}
                              </Link>
                            </div>
                          ) : null}
                          {canOpen ? (
                            <div className="admin-report-cell-sub admin-pr-exception-hint">{t.openInAttention}</div>
                          ) : null}
                        </td>
                        <td className="admin-financial-money">{formatKpiMoney(lang, item.amount)}</td>
                        <td>{item.age != null ? t.days(item.age) : '—'}</td>
                        <td className="admin-financial-action">{item.recommendedAction || '—'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <Pager
            lang={lang}
            page={exceptionsQuery.data.page}
            pageSize={pageSize}
            totalPages={exceptionsQuery.data.totalPages}
            totalItems={exceptionsQuery.data.totalItems}
            onChange={setPage}
            onPageSizeChange={(nextSize) => {
              setPageSize(nextSize);
              setPage(1);
            }}
          />
        </>
      ) : null}
    </section>
  );
}

function FinancialKpiDrilldown({
  data,
  error,
  isLoading,
  lang,
  metric,
  page,
  pageSize,
  onClose,
  onPageChange,
  onPageSizeChange,
  onRetry,
}: {
  data: AdminFinancialSummaryDrilldownDto | undefined;
  error: unknown;
  isLoading: boolean;
  lang: Lang;
  metric: AdminFinancialDrilldownMetric;
  page: number;
  pageSize: number;
  onClose: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onRetry: () => void;
}) {
  const t = financialCopy[lang];
  const metricLabel = financialMetricLabel(lang, metric);

  return (
    <section
      id="admin-financial-drilldown"
      className="admin-card admin-financial-drilldown"
      aria-labelledby="admin-financial-drilldown-title"
    >
      <header className="admin-financial-drilldown-header">
        <div>
          <span>{t.drilldownEyebrow}</span>
          <h3 id="admin-financial-drilldown-title">{metricLabel}</h3>
          <p>{t.drilldownSubtitle}</p>
        </div>
        <button type="button" className="admin-financial-drilldown-close" onClick={onClose} aria-label={t.closeDrilldown}>
          <IconX size={17} />
        </button>
      </header>

      {isLoading ? <StateBlock>{t.loadingDrilldown}</StateBlock> : null}
      {error ? <ErrorBlock error={error} /> : null}

      {data && !isLoading ? (
        <>
          <div className="admin-financial-drilldown-total">
            <span>{t.drilldownTotal}</span>
            <strong>
              {data.totalAmount != null ? (
                <VndText lang={lang} value={data.totalAmount} />
              ) : (
                t.drilldownCount(data.totalCount)
              )}
            </strong>
            <small>{t.drilldownPeriod(data.period.from, data.period.to)}</small>
          </div>

          <div className="admin-financial-drilldown-breakdowns" aria-label={t.breakdownAria}>
            {data.breakdowns.map((breakdown) => (
              <section key={breakdown.dimension} className="admin-financial-drilldown-breakdown">
                <h4>{formatEnumLabel(lang, breakdown.dimension)}</h4>
                <ul>
                  {breakdown.items.map((item) => (
                    <li key={`${breakdown.dimension}-${item.key}`}>
                      <div>
                        <span>{financialBreakdownItemLabel(lang, breakdown.dimension, item)}</span>
                        <strong>
                          {item.amount != null ? formatKpiMoney(lang, item.amount) : t.drilldownCount(item.count)}
                        </strong>
                      </div>
                      <div className="admin-financial-drilldown-bar" aria-hidden="true">
                        <i style={{ width: `${Math.min(Math.max(item.percentage, 0), 100)}%` }} />
                      </div>
                      <small>{t.drilldownShare(item.percentage, item.count)}</small>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <FinancialDrilldownTable data={data} lang={lang} metric={metric} />

          <Pager
            lang={lang}
            page={data.page || page}
            pageSize={pageSize}
            totalPages={data.totalPages}
            totalItems={data.totalItems}
            onChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </>
      ) : null}

      {error ? (
        <button type="button" className="admin-button admin-button-ghost" onClick={onRetry}>
          {t.retryDrilldown}
        </button>
      ) : null}
    </section>
  );
}

function FinancialDrilldownTable({
  data,
  lang,
  metric,
}: {
  data: AdminFinancialSummaryDrilldownDto;
  lang: Lang;
  metric: AdminFinancialDrilldownMetric;
}) {
  const t = financialCopy[lang];
  const isCollectedByProject = metric === 'COLLECTED';

  return (
    <div className="admin-report-table-wrap admin-financial-table-wrap">
      <table className="admin-report-table admin-financial-table admin-financial-drilldown-table">
        <thead>
          {isCollectedByProject ? (
            <tr>
              <th>{t.project}</th>
              <th>{t.customer}</th>
              <th>{t.startFee}</th>
              <th>{t.deposit}</th>
              <th>{t.remainingPayment}</th>
              <th>{t.needToCollect}</th>
              <th>{t.totalCollected}</th>
              <th>{t.paymentCount}</th>
              <th>{t.lastPaid}</th>
            </tr>
          ) : (
            <tr>
              <th>{t.project}</th>
              <th>{t.drilldownResource}</th>
              <th>{t.type}</th>
              <th>{t.drilldownValue}</th>
              <th>{t.drilldownOccurred}</th>
              <th>{t.drilldownDetails}</th>
            </tr>
          )}
        </thead>
        <tbody>
          {data.items.length === 0 ? (
            <tr>
              <td colSpan={isCollectedByProject ? 9 : 6}>
                <EmptyRow text={t.emptyDrilldown} />
              </td>
            </tr>
          ) : isCollectedByProject ? (
            data.items.map((item, index) => (
              <CollectedProjectRow key={financialDrilldownItemKey(item, index)} item={item} lang={lang} />
            ))
          ) : (
            data.items.map((item, index) => (
              <FinancialDrilldownRow key={financialDrilldownItemKey(item, index)} item={item} lang={lang} />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function CollectedProjectRow({ item, lang }: { item: AdminFinancialDrilldownItemDto; lang: Lang }) {
  const t = financialCopy[lang];

  return (
    <tr>
      <td>
        {item.projectId ? (
          <Link className="admin-financial-code-link" to={`/admin/projects?projectId=${item.projectId}`}>
            {item.projectCode || item.projectName || t.openProject}
            <IconExternalLink size={13} />
          </Link>
        ) : (
          item.projectCode || item.projectName || '—'
        )}
        {item.projectCode && item.projectName ? <div className="admin-report-cell-sub">{item.projectName}</div> : null}
      </td>
      <td>{item.customerName || '—'}</td>
      <MoneyCell lang={lang} value={item.projectStartFeeAmount} />
      <MoneyCell lang={lang} value={item.depositAmount} />
      <MoneyCell lang={lang} value={item.remainingPaymentAmount} />
      <MoneyCell lang={lang} value={item.orderRemainingAmount} tone="warn" />
      <td className="admin-financial-money is-good" title={formatMoney(lang, item.totalCollectedAmount)}>
        <strong>{formatKpiMoney(lang, item.totalCollectedAmount)}</strong>
      </td>
      <td>{item.paymentCount ?? 0}</td>
      <td>{formatDateTime(lang, item.lastPaidAt ?? item.occurredAt)}</td>
    </tr>
  );
}

function MoneyCell({
  lang,
  value,
  tone,
}: {
  lang: Lang;
  value: number | null | undefined;
  tone?: 'warn';
}) {
  return (
    <td className={`admin-financial-money${tone ? ` is-${tone}` : ''}`} title={formatMoney(lang, value)}>
      {formatKpiMoney(lang, value)}
    </td>
  );
}

function FinancialDrilldownRow({ item, lang }: { item: AdminFinancialDrilldownItemDto; lang: Lang }) {
  const t = financialCopy[lang];
  const resourceCode = item.paymentCode || item.orderCode || item.transactionId || '—';
  const mainAmount = item.amount ?? item.remainingAmount ?? item.paidAmount;

  return (
    <tr>
      <td>
        {item.projectId ? (
          <Link className="admin-financial-code-link" to={`/admin/projects?projectId=${item.projectId}`}>
            {item.projectCode || item.projectName || t.openProject}
            <IconExternalLink size={13} />
          </Link>
        ) : (
          item.projectCode || item.projectName || '—'
        )}
        {item.projectCode && item.projectName ? <div className="admin-report-cell-sub">{item.projectName}</div> : null}
      </td>
      <td>
        <strong className="admin-financial-code">{resourceCode}</strong>
        <div className="admin-report-cell-sub">{formatEnumLabel(lang, item.resourceType)}</div>
      </td>
      <td>
        {item.paymentType ? formatEnumLabel(lang, item.paymentType) : '—'}
        <div className="admin-report-cell-sub">
          {item.status ? <StatusPill lang={lang} status={item.status} /> : null}
          {item.provider ? ` · ${formatEnumLabel(lang, item.provider)}` : null}
        </div>
      </td>
      <td className="admin-financial-money" title={formatMoney(lang, mainAmount)}>
        {formatKpiMoney(lang, mainAmount)}
        {item.paidAmount != null || item.remainingAmount != null ? (
          <div className="admin-report-cell-sub">
            {t.drilldownPaidRemaining(
              formatKpiMoney(lang, item.paidAmount),
              formatKpiMoney(lang, item.remainingAmount),
            )}
          </div>
        ) : null}
      </td>
      <td>
        {formatDateTime(lang, item.occurredAt)}
        {item.ageDays != null ? <div className="admin-report-cell-sub">{t.days(item.ageDays)}</div> : null}
      </td>
      <td>
        {item.failureReason || '—'}
        {item.expiredAt ? <div className="admin-report-cell-sub">{t.drilldownExpires(formatDateTime(lang, item.expiredAt))}</div> : null}
      </td>
    </tr>
  );
}

function financialMetricLabel(lang: Lang, metric: AdminFinancialDrilldownMetric) {
  const t = financialCopy[lang];
  switch (metric) {
    case 'COLLECTED':
      return t.collected;
    case 'OUTSTANDING':
      return t.outstanding;
    case 'CONTRACTED_RECEIVABLE':
      return t.contracted;
    case 'ORDER_VALUE':
      return t.orderValue;
    case 'FAILED_TRANSACTIONS':
      return t.failedTx;
    case 'ACTIVE_PAYMENTS':
      return t.activePayments;
  }
}

function financialDrilldownItemKey(item: AdminFinancialDrilldownItemDto, index: number) {
  return item.transactionId || item.paymentId || item.orderId || `${item.resourceType}-${item.projectId ?? index}`;
}

function financialBreakdownItemLabel(
  lang: Lang,
  dimension: string,
  item: AdminFinancialDrilldownBreakdownItemDto,
) {
  if (dimension === 'PROJECT' || dimension === 'FAILURE_REASON') {
    return item.label || item.key;
  }
  return formatEnumLabel(lang, item.key);
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
  active,
  icon,
  label,
  note,
  onClick,
  title,
  tone,
  value,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  note?: string;
  onClick: () => void;
  title?: string;
  tone: KpiTone;
  value: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`admin-financial-kpi admin-financial-kpi-${tone}${active ? ' is-active' : ''}`}
      title={title}
      onClick={onClick}
    >
      <span className="admin-financial-kpi-icon">{icon}</span>
      <div>
        <small>{label}</small>
        <strong className="admin-financial-kpi-value">{value}</strong>
        {note ? <p>{note}</p> : null}
      </div>
    </button>
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
