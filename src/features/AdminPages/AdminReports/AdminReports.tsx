import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { IconChartBar, IconDownload, IconReportAnalytics } from '@tabler/icons-react';

import type {
  CatalogBestsellerMetric,
  CommercialTrendGranularity,
  ProjectAgingBucket,
  ProjectAgingReason,
  ProjectBucketCounts,
  ProductionCapacityState,
  ReportExportDomain,
  ReportFacetItem,
} from '@/services/api';
import { getReportServiceResultMessage } from '@/services/api';
import {
  useCatalogBestsellers,
  useCommercialTrend,
  useDeliveryReviews,
  useExportReportCsv,
  useProductionWorkloadReport,
  useProductionWorkloadSummaryReport,
  useProjectAgingReport,
  useReportBusiness,
  useReportCatalog,
  useReportCommercial,
  useReportDelivery,
  useReportOverview,
  useReportProduction,
  useReportProjects,
} from '@/services/queries';

import { AdminNavbar, AdminSidebar } from '../admincomponents';
import { FinancialPanel } from './AdminFinancialPanel';
import './AdminReports.css';

type ReportTabId = ReportExportDomain | 'financial';

const REPORT_TABS: Array<{ id: ReportTabId; title: string; description: string; exportable: boolean }> = [
  { id: 'overview', title: 'Overview', description: 'Cross-domain snapshot for the selected date range.', exportable: true },
  { id: 'business', title: 'Business', description: 'Accounts and soft-cap capacity for designers and sales.', exportable: true },
  { id: 'projects', title: 'Projects', description: 'Pipeline buckets, aging, and intake blockers.', exportable: true },
  { id: 'commercial', title: 'Commercial', description: 'Quotations, orders, payments, and trend chart.', exportable: true },
  { id: 'financial', title: 'Financial', description: 'Cash collection, receivables, payment ops, and exceptions.', exportable: false },
  { id: 'production', title: 'Production', description: 'Open requests and production staff workload.', exportable: true },
  { id: 'delivery', title: 'Delivery', description: 'Delivery pipeline and customer reviews.', exportable: true },
  { id: 'catalog', title: 'Catalog', description: 'Catalog readiness and bestsellers in range.', exportable: true },
];

function defaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 29);
  return {
    from: toDateInputValue(from),
    to: toDateInputValue(to),
  };
}

function isReportTabId(value: string | null): value is ReportTabId {
  return REPORT_TABS.some((tab) => tab.id === value);
}

export function AdminReports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRange = useMemo(() => defaultDateRange(), []);
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<ReportTabId>(isReportTabId(tabFromUrl) ? tabFromUrl : 'overview');
  const [fromDate, setFromDate] = useState(initialRange.from);
  const [toDate, setToDate] = useState(initialRange.to);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const dateParams = useMemo(
    () => ({
      from: toFinancialApiDateTime(fromDate),
      to: toFinancialApiDateTime(toDate),
    }),
    [fromDate, toDate],
  );

  const reportDateParams = useMemo(
    () => ({
      from: toApiDateTime(fromDate, 'start'),
      to: toApiDateTime(toDate, 'end'),
    }),
    [fromDate, toDate],
  );

  const exportMutation = useExportReportCsv();
  const activeMeta = REPORT_TABS.find((tab) => tab.id === activeTab) ?? REPORT_TABS[0];
  const generatedTime = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());

  const handleTabChange = (tab: ReportTabId) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    if (tab === 'overview') {
      next.delete('tab');
    } else {
      next.set('tab', tab);
    }
    setSearchParams(next, { replace: true });
  };

  const handleExport = async () => {
    if (activeTab === 'financial') return;
    setExportMessage(null);
    try {
      const result = await exportMutation.mutateAsync({
        domain: activeTab,
        from: reportDateParams.from,
        to: reportDateParams.to,
      });
      downloadBlob(result.blob, result.filename);
      setExportMessage(`Exported ${result.filename}`);
    } catch (error) {
      setExportMessage(getReportServiceResultMessage(error));
    }
  };

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <AdminSidebar activeLabel="Reports" />
        <section className="admin-main">
          <AdminNavbar activeLabel="Reports" />
          <div className="admin-content admin-reports-content">
            <section className="admin-page-heading admin-reports-heading">
              <div>
                <h2>Reports</h2>
                <p>Business, project, commercial, financial, production, delivery, and catalog analysis</p>
                <span className="admin-report-freshness">Generated {generatedTime}</span>
              </div>
              <div className="admin-reports-actions">
                <button
                  className="admin-button admin-button-secondary"
                  type="button"
                  disabled={exportMutation.isPending || !activeMeta.exportable}
                  onClick={() => void handleExport()}
                >
                  <IconDownload size={16} />
                  {exportMutation.isPending ? 'Exporting...' : 'Export CSV'}
                </button>
              </div>
            </section>

            <section className="admin-card admin-report-filters" aria-label="Shared report filters">
              <label className="admin-report-filter admin-report-date-filter">
                <span>From</span>
                <input
                  aria-label="Report start date"
                  type="date"
                  value={fromDate}
                  onChange={(event) => {
                    const nextFrom = event.target.value;
                    setFromDate(nextFrom);
                    setToDate((current) => (current && nextFrom && current < nextFrom ? nextFrom : current));
                  }}
                />
              </label>
              <label className="admin-report-filter admin-report-date-filter">
                <span>To</span>
                <input
                  aria-label="Report end date"
                  type="date"
                  min={fromDate}
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                />
              </label>
              <p className="admin-report-filter-note">
                Date range applies to overview, projects, commercial, financial, production, delivery, trend, reviews,
                bestsellers, and export. Soft caps are display-only (Designer 2 / Sales 5 / Production 5).
              </p>
            </section>

            {exportMessage ? (
              <div
                className={`user-management-state${exportMutation.isError ? ' user-management-state-error' : ''}`}
                style={{ marginBottom: 16 }}
              >
                {exportMessage}
              </div>
            ) : null}

            <section className="admin-report-tabs" aria-label="Report navigation">
              {REPORT_TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={`admin-report-tab${tab.id === activeTab ? ' admin-report-tab-active' : ''}`}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                >
                  {tab.title}
                </button>
              ))}
            </section>

            <section className="admin-report-overview">
              <div>
                <span>
                  <IconReportAnalytics size={16} /> Live admin reports
                </span>
                <h3>{activeMeta.title}</h3>
                <p>{activeMeta.description}</p>
              </div>
            </section>

            {activeTab === 'overview' ? <OverviewPanel dateParams={reportDateParams} /> : null}
            {activeTab === 'business' ? <BusinessPanel /> : null}
            {activeTab === 'projects' ? <ProjectsPanel dateParams={reportDateParams} /> : null}
            {activeTab === 'commercial' ? (
              <CommercialPanel dateParams={reportDateParams} fromDate={fromDate} toDate={toDate} />
            ) : null}
            {activeTab === 'financial' ? (
              <FinancialPanel dateParams={dateParams} fromDate={fromDate} toDate={toDate} />
            ) : null}
            {activeTab === 'production' ? <ProductionPanel dateParams={reportDateParams} /> : null}
            {activeTab === 'delivery' ? <DeliveryPanel dateParams={reportDateParams} /> : null}
            {activeTab === 'catalog' ? <CatalogPanel fromDate={fromDate} toDate={toDate} /> : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function OverviewPanel({ dateParams }: { dateParams: { from: string; to: string } }) {
  const query = useReportOverview(dateParams);
  const data = query.data;

  if (query.isLoading) return <StateBlock>Loading overview...</StateBlock>;
  if (query.isError) return <ErrorBlock error={query.error} />;
  if (!data) return <StateBlock>No overview data.</StateBlock>;

  return (
    <>
      <section className="admin-report-kpi-grid">
        <KpiCard label="Active accounts" value={data.business.totalActiveAccounts} />
        <KpiCard label="Unassigned intake" value={data.business.unassignedIntakeCount} />
        <KpiCard label="Non-terminal projects" value={data.projects.totalNonTerminal} />
        <KpiCard label="Completed in range" value={data.projects.completedInRange} />
        <KpiCard label="GMV in range" value={formatKpiMoney(data.commercial.gmvInRange)} title={formatMoney(data.commercial.gmvInRange)} />
        <KpiCard
          label="Collected in range"
          value={formatKpiMoney(data.commercial.collectedInRange)}
          title={formatMoney(data.commercial.collectedInRange)}
        />
        <KpiCard
          label="Outstanding"
          value={formatKpiMoney(data.commercial.outstandingAmount)}
          title={formatMoney(data.commercial.outstandingAmount)}
        />
        <KpiCard label="Open production" value={data.production.requestsOpen} note={`${data.production.blockedCount} blocked`} />
        <KpiCard label="Ready for delivery" value={data.delivery.readyForDelivery} />
        <KpiCard label="Active products" value={data.catalog.activeProducts} note={`${data.catalog.productsMissing3D} missing 3D`} />
      </section>

      <section className="admin-report-chart-grid">
        <article className="admin-card admin-report-chart-card">
          <div className="admin-report-card-title">
            <h3>Project buckets</h3>
            <IconChartBar size={18} />
          </div>
          <ColumnChart data={bucketToChart(data.projects.byBucket)} />
        </article>
        <article className="admin-card admin-report-chart-card">
          <div className="admin-report-card-title">
            <h3>Designer capacity</h3>
          </div>
          <DonutChart
            data={[
              { label: 'Available', value: data.business.designerAvailableCount },
              { label: 'Full', value: data.business.designerFullCount },
              { label: 'Over', value: data.business.designerOverCount },
            ]}
          />
        </article>
        <article className="admin-card admin-report-chart-card admin-report-chart-card-wide">
          <div className="admin-report-card-title">
            <h3>Sales capacity now</h3>
          </div>
          <StackedShareChart
            data={[
              { label: 'Available', value: data.business.salesAvailableNowCount, tone: 'good' },
              { label: 'Full', value: data.business.salesFullNowCount, tone: 'warn' },
              { label: 'Over', value: data.business.salesOverNowCount, tone: 'bad' },
              { label: 'High pressure', value: data.business.salesHighFuturePressureCount, tone: 'accent' },
            ]}
          />
        </article>
      </section>
    </>
  );
}

function BusinessPanel() {
  const query = useReportBusiness();
  const data = query.data;

  if (query.isLoading) return <StateBlock>Loading business report...</StateBlock>;
  if (query.isError) return <ErrorBlock error={query.error} />;
  if (!data) return <StateBlock>No business data.</StateBlock>;

  return (
    <>
      <section className="admin-report-kpi-grid">
        <KpiCard label="Active designers" value={data.designer.totalActiveDesigners} note={`Cap ${data.designer.maxActiveProjects}`} />
        <KpiCard label="Designer available" value={data.designer.availableCount} />
        <KpiCard label="Designer over" value={data.designer.overCount} />
        <KpiCard label="Active sales" value={data.sales.totalActiveSales} note={`Cap ${data.sales.maxActiveProjects}`} />
        <KpiCard label="Sales high pressure" value={data.sales.highFuturePressureCount} />
        <KpiCard label="Unassigned intake" value={data.sales.unassignedIntakeCount} />
      </section>

      <section className="admin-report-deeplink-row">
        <Link className="admin-button admin-button-secondary" to="/admin/users?tab=designer-workload">
          Open designer workload
        </Link>
        <Link className="admin-button admin-button-secondary" to="/admin/users?tab=sales-workload">
          Open sales workload
        </Link>
      </section>

      <section className="admin-report-chart-grid">
        <article className="admin-card admin-report-chart-card">
          <div className="admin-report-card-title">
            <h3>Accounts by role</h3>
          </div>
          <DonutChart data={facetsToChart(data.accountsByRole)} />
        </article>
        <article className="admin-card admin-report-chart-card">
          <div className="admin-report-card-title">
            <h3>Accounts by status</h3>
          </div>
          <ColumnChart data={facetsToChart(data.accountsByStatus)} />
        </article>
        <article className="admin-card admin-report-chart-card">
          <div className="admin-report-card-title">
            <h3>Designer soft-cap mix</h3>
          </div>
          <StackedShareChart
            data={[
              { label: 'Available', value: data.designer.availableCount, tone: 'good' },
              { label: 'Full', value: data.designer.fullCount, tone: 'warn' },
              { label: 'Over', value: data.designer.overCount, tone: 'bad' },
            ]}
          />
        </article>
        <article className="admin-card admin-report-chart-card">
          <div className="admin-report-card-title">
            <h3>Sales soft-cap mix</h3>
          </div>
          <DonutChart
            data={[
              { label: 'Available', value: data.sales.availableNowCount },
              { label: 'Full', value: data.sales.fullNowCount },
              { label: 'Over', value: data.sales.overNowCount },
            ]}
          />
        </article>
      </section>
    </>
  );
}

function ProjectsPanel({ dateParams }: { dateParams: { from: string; to: string } }) {
  const [thresholdDays, setThresholdDays] = useState(7);
  const [bucket, setBucket] = useState<'' | ProjectAgingBucket>('');
  const [reason, setReason] = useState<'' | ProjectAgingReason>('');
  const [page, setPage] = useState(1);

  const summaryQuery = useReportProjects(dateParams);
  const agingQuery = useProjectAgingReport({
    thresholdDays,
    bucket: bucket || null,
    reason: reason || null,
    page,
    pageSize: 20,
    sortBy: 'AgeDaysDesc',
  });

  const data = summaryQuery.data;
  const aging = agingQuery.data;

  return (
    <>
      {summaryQuery.isLoading ? <StateBlock>Loading project report...</StateBlock> : null}
      {summaryQuery.isError ? <ErrorBlock error={summaryQuery.error} /> : null}
      {data ? (
        <>
          <section className="admin-report-kpi-grid">
            <KpiCard label="Non-terminal" value={data.totalNonTerminal} />
            <KpiCard label="Unassigned intake" value={data.unassignedIntakeCount} />
            <KpiCard label="Waiting designer" value={data.waitingForDesignerCount} />
            <KpiCard label="Completed in range" value={data.completedInRange} />
            <KpiCard label="Rejected in range" value={data.rejectedInRange} />
            <KpiCard label="Aging > 7d" value={data.aging.over7Days} />
            <KpiCard label="Aging > 14d" value={data.aging.over14Days} />
            <KpiCard label="Aging > 30d" value={data.aging.over30Days} />
          </section>
          <section className="admin-report-chart-grid">
            <article className="admin-card admin-report-chart-card">
              <div className="admin-report-card-title">
                <h3>By bucket</h3>
              </div>
              <ColumnChart data={bucketToChart(data.byBucket)} />
            </article>
            <article className="admin-card admin-report-chart-card">
              <div className="admin-report-card-title">
                <h3>By status</h3>
              </div>
              <DonutChart data={facetsToChart(data.byStatus)} />
            </article>
            <article className="admin-card admin-report-chart-card admin-report-chart-card-wide">
              <div className="admin-report-card-title">
                <h3>Aging pressure</h3>
              </div>
              <ColumnChart
                data={[
                  { label: '> 7 days', value: data.aging.over7Days },
                  { label: '> 14 days', value: data.aging.over14Days },
                  { label: '> 30 days', value: data.aging.over30Days },
                ]}
              />
            </article>
          </section>
        </>
      ) : null}

      <section className="admin-card admin-report-table-card">
        <div className="admin-report-card-title">
          <h3>Project aging drill-down</h3>
          <span>{aging?.totalItems ?? 0} records</span>
        </div>
        <div className="admin-report-inline-filters">
          <label>
            Threshold days
            <input
              type="number"
              min={1}
              value={thresholdDays}
              onChange={(event) => {
                setThresholdDays(Math.max(1, Number(event.target.value) || 1));
                setPage(1);
              }}
            />
          </label>
          <label>
            Bucket
            <select
              value={bucket}
              onChange={(event) => {
                setBucket(event.target.value as '' | ProjectAgingBucket);
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="INTAKE">Intake</option>
              <option value="COMMERCIAL">Commercial</option>
              <option value="DESIGN_MONITOR">Design monitor</option>
              <option value="FULFILLMENT">Fulfillment</option>
            </select>
          </label>
          <label>
            Reason
            <select
              value={reason}
              onChange={(event) => {
                setReason(event.target.value as '' | ProjectAgingReason);
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="UNASSIGNED_INTAKE">Unassigned intake</option>
              <option value="WAITING_DESIGNER">Waiting designer</option>
              <option value="STUCK">Stuck</option>
            </select>
          </label>
        </div>

        {agingQuery.isLoading ? <StateBlock>Loading aging list...</StateBlock> : null}
        {agingQuery.isError ? <ErrorBlock error={agingQuery.error} /> : null}
        {aging && aging.items.length === 0 ? <StateBlock>No aging projects matched.</StateBlock> : null}
        {aging && aging.items.length > 0 ? (
          <>
            <div className="admin-table-wrap">
              <table className="admin-report-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Project</th>
                    <th>Status</th>
                    <th>Bucket</th>
                    <th>Reason</th>
                    <th>Age</th>
                    <th>Sales</th>
                    <th>Designer</th>
                  </tr>
                </thead>
                <tbody>
                  {aging.items.map((item) => (
                    <tr key={item.projectId}>
                      <td>{item.projectCode}</td>
                      <td>{item.projectName}</td>
                      <td>{item.status}</td>
                      <td>{formatLabel(item.bucket)}</td>
                      <td>{formatLabel(item.reason)}</td>
                      <td>{item.ageDays}d</td>
                      <td>{item.salesName ?? '-'}</td>
                      <td>{item.designerName ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={aging.page}
              totalPages={aging.totalPages}
              hasPreviousPage={aging.hasPreviousPage}
              hasNextPage={aging.hasNextPage}
              onPrevious={() => setPage((current) => Math.max(1, current - 1))}
              onNext={() => setPage((current) => current + 1)}
            />
          </>
        ) : null}
      </section>
    </>
  );
}

function CommercialPanel({
  dateParams,
  fromDate,
  toDate,
}: {
  dateParams: { from: string; to: string };
  fromDate: string;
  toDate: string;
}) {
  const [granularity, setGranularity] = useState<CommercialTrendGranularity>('day');
  const summaryQuery = useReportCommercial(dateParams);
  const trendQuery = useCommercialTrend({
    from: dateParams.from,
    to: dateParams.to,
    granularity,
  });
  const data = summaryQuery.data;
  const trend = trendQuery.data;

  return (
    <>
      {summaryQuery.isLoading ? <StateBlock>Loading commercial report...</StateBlock> : null}
      {summaryQuery.isError ? <ErrorBlock error={summaryQuery.error} /> : null}
      {data ? (
        <section className="admin-report-kpi-grid">
          <KpiCard label="Quotations sent" value={data.quotations.sentInRange} />
          <KpiCard label="Quotations accepted" value={data.quotations.acceptedInRange} />
          <KpiCard label="Orders open" value={data.orders.openCount} />
          <KpiCard label="GMV in range" value={formatKpiMoney(data.orders.gmvInRange)} title={formatMoney(data.orders.gmvInRange)} />
          <KpiCard
            label="Collected total"
            value={formatKpiMoney(data.orders.collectedTotal)}
            title={formatMoney(data.orders.collectedTotal)}
          />
          <KpiCard
            label="Outstanding"
            value={formatKpiMoney(data.orders.outstandingAmount)}
            title={formatMoney(data.orders.outstandingAmount)}
          />
          <KpiCard
            label="Paid in range"
            value={formatKpiMoney(data.payments.paidAmountInRange)}
            title={formatMoney(data.payments.paidAmountInRange)}
          />
          <KpiCard label="Deposits paid" value={data.conversion.depositsPaidInRange} />
        </section>
      ) : null}

      <section className="admin-card admin-report-table-card">
        <div className="admin-report-card-title">
          <h3>Commercial trend</h3>
          <label className="admin-report-inline-select">
            Granularity
            <select value={granularity} onChange={(event) => setGranularity(event.target.value as CommercialTrendGranularity)}>
              <option value="day">Day</option>
              <option value="week">Week</option>
            </select>
          </label>
        </div>
        <p className="admin-report-filter-note">
          Required range ≤ 90 days · current {fromDate} → {toDate}
        </p>
        {trendQuery.isLoading ? <StateBlock>Loading trend...</StateBlock> : null}
        {trendQuery.isError ? <ErrorBlock error={trendQuery.error} /> : null}
        {trend ? (
          <>
            <div className="admin-report-kpi-grid admin-report-kpi-grid-compact">
              <KpiCard label="Trend GMV" value={formatKpiMoney(trend.totals.gmv)} title={formatMoney(trend.totals.gmv)} />
              <KpiCard
                label="Trend collected"
                value={formatKpiMoney(trend.totals.collected)}
                title={formatMoney(trend.totals.collected)}
              />
              <KpiCard label="Orders created" value={trend.totals.ordersCreated} />
              <KpiCard label="Quotes accepted" value={trend.totals.quotationsAccepted} />
            </div>
            <MultiLineTrend
              points={trend.points.map((point) => ({
                label: formatShortDate(point.periodStart),
                gmv: point.gmv,
                collected: point.collected,
                orders: point.ordersCreated,
              }))}
            />
          </>
        ) : null}
      </section>

      {data ? (
        <section className="admin-report-chart-grid">
          <article className="admin-card admin-report-chart-card">
            <div className="admin-report-card-title">
              <h3>Quotations by status</h3>
            </div>
            <DonutChart data={facetsToChart(data.quotations.byStatus)} />
          </article>
          <article className="admin-card admin-report-chart-card">
            <div className="admin-report-card-title">
              <h3>Orders by status</h3>
            </div>
            <ColumnChart data={facetsToChart(data.orders.byStatus)} />
          </article>
          <article className="admin-card admin-report-chart-card admin-report-chart-card-wide">
            <div className="admin-report-card-title">
              <h3>Payments by type</h3>
            </div>
            <StackedShareChart
              data={data.payments.byType.map((item, index) => ({
                label: formatLabel(item.type),
                value: item.count,
                tone: (['accent', 'good', 'warn', 'bad'] as const)[index % 4],
              }))}
            />
          </article>
        </section>
      ) : null}
    </>
  );
}

function ProductionPanel({ dateParams }: { dateParams: { from: string; to: string } }) {
  const [search, setSearch] = useState('');
  const [capacityState, setCapacityState] = useState<'' | ProductionCapacityState>('');
  const [page, setPage] = useState(1);

  const reportQuery = useReportProduction(dateParams);
  const summaryQuery = useProductionWorkloadSummaryReport();
  const workloadQuery = useProductionWorkloadReport({
    page,
    pageSize: 20,
    search: search || null,
    capacityState: capacityState || null,
    sortBy: 'OpenRequestCountDesc',
  });

  const report = reportQuery.data;
  const summary = summaryQuery.data;
  const workload = workloadQuery.data;

  return (
    <>
      {reportQuery.isLoading ? <StateBlock>Loading production report...</StateBlock> : null}
      {reportQuery.isError ? <ErrorBlock error={reportQuery.error} /> : null}

      <section className="admin-report-kpi-groups">
        {report ? (
          <>
            <div className="admin-report-kpi-group">
              <h4>Request pipeline</h4>
              <div className="admin-report-kpi-grid admin-report-kpi-grid-4">
                <KpiCard label="Open requests" value={report.openRequestCount} />
                <KpiCard label="Blocked" value={report.blockedCount} />
                <KpiCard label="Pending review" value={report.pendingReviewCount} />
                <KpiCard label="Unassigned" value={report.unassignedCount} />
              </div>
            </div>

            <div className="admin-report-kpi-group">
              <h4>Period activity</h4>
              <div className="admin-report-kpi-grid admin-report-kpi-grid-3">
                <KpiCard label="Overdue" value={report.overdueCount} />
                <KpiCard label="Created in range" value={report.createdInRange} />
                <KpiCard label="Completed in range" value={report.completedInRange} />
              </div>
            </div>
          </>
        ) : null}

        <div className="admin-report-kpi-group">
          <h4>Staff capacity</h4>
          {summaryQuery.isError ? <ErrorBlock error={summaryQuery.error} /> : null}
          <div className="admin-report-kpi-grid admin-report-kpi-grid-4">
            <KpiCard label="Active staff" value={summary?.totalActiveStaff} />
            <KpiCard label="Open requests" value={summary?.totalOpenRequests} note={`Soft cap ${summary?.maxActiveRequests ?? 5}`} />
            <KpiCard label="Available staff" value={summary?.availableCount} />
            <KpiCard label="Overdue" value={summary?.overdueCount} />
          </div>
          {summary ? (
            <div className="admin-card admin-report-capacity-strip">
              <div className="admin-report-card-title">
                <h3>Capacity mix</h3>
              </div>
              <StackedShareChart
                data={[
                  { label: 'Available', value: summary.availableCount, tone: 'good' },
                  { label: 'Full', value: summary.fullCount, tone: 'warn' },
                  { label: 'Over', value: summary.overCount, tone: 'bad' },
                ]}
              />
            </div>
          ) : null}
        </div>
      </section>

      {report ? (
        <section className="admin-report-chart-grid">
          <article className="admin-card admin-report-chart-card">
            <div className="admin-report-card-title">
              <h3>Requests by status</h3>
            </div>
            <DonutChart data={facetsToChart(report.requestsByStatus)} />
          </article>
          <article className="admin-card admin-report-chart-card">
            <div className="admin-report-card-title">
              <h3>Items by status</h3>
            </div>
            <ColumnChart data={facetsToChart(report.itemsByStatus)} />
          </article>
          <article className="admin-card admin-report-chart-card admin-report-chart-card-wide">
            <div className="admin-report-card-title">
              <h3>Top assignees</h3>
            </div>
            <RankBarChart
              data={report.topAssignees.map((item) => ({
                label: item.fullName,
                value: item.openCount,
              }))}
            />
          </article>
        </section>
      ) : null}

      <section className="admin-card admin-report-table-card">
        <div className="admin-report-card-title">
          <h3>Production workload</h3>
          <span>{workload?.totalItems ?? 0} staff</span>
        </div>
        <div className="admin-report-inline-filters">
          <label>
            Search
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Name or email"
            />
          </label>
          <label>
            Capacity
            <select
              value={capacityState}
              onChange={(event) => {
                setCapacityState(event.target.value as '' | ProductionCapacityState);
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="AVAILABLE">Available</option>
              <option value="FULL">Full</option>
              <option value="OVER">Over</option>
            </select>
          </label>
        </div>
        {summaryQuery.isError ? <ErrorBlock error={summaryQuery.error} /> : null}
        {workloadQuery.isLoading ? <StateBlock>Loading workload...</StateBlock> : null}
        {workloadQuery.isError ? <ErrorBlock error={workloadQuery.error} /> : null}
        {workload && workload.items.length > 0 ? (
          <>
            <div className="admin-table-wrap">
              <table className="admin-report-table">
                <thead>
                  <tr>
                    <th>Staff</th>
                    <th>Email</th>
                    <th>Open</th>
                    <th>Overdue</th>
                    <th>Slots</th>
                    <th>Capacity</th>
                  </tr>
                </thead>
                <tbody>
                  {workload.items.map((item) => (
                    <tr key={item.accountId}>
                      <td>{item.fullName}</td>
                      <td>{item.email}</td>
                      <td>
                        {item.openRequestCount}/{item.maxActiveRequests}
                      </td>
                      <td>{item.overdueCount}</td>
                      <td>{item.availableSlot}</td>
                      <td>{formatLabel(item.capacityState)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={workload.page}
              totalPages={workload.totalPages}
              hasPreviousPage={workload.hasPreviousPage}
              hasNextPage={workload.hasNextPage}
              onPrevious={() => setPage((current) => Math.max(1, current - 1))}
              onNext={() => setPage((current) => current + 1)}
            />
          </>
        ) : null}
      </section>
    </>
  );
}

function DeliveryPanel({ dateParams }: { dateParams: { from: string; to: string } }) {
  const [page, setPage] = useState(1);
  const reportQuery = useReportDelivery(dateParams);
  const reviewsQuery = useDeliveryReviews({ ...dateParams, page, pageSize: 20 });
  const data = reportQuery.data;
  const reviews = reviewsQuery.data;

  return (
    <>
      {reportQuery.isLoading ? <StateBlock>Loading delivery report...</StateBlock> : null}
      {reportQuery.isError ? <ErrorBlock error={reportQuery.error} /> : null}
      {data ? (
        <section className="admin-report-kpi-grid">
          <KpiCard label="Ready for delivery" value={data.projects.readyForDelivery} />
          <KpiCard label="Delivering" value={data.projects.delivering} />
          <KpiCard label="Delivered in range" value={data.projects.deliveredInRange} />
          <KpiCard label="Customer confirmed" value={data.orders.customerConfirmedInRange} />
          <KpiCard label="Partial deliveries" value={data.orderItems.partialDeliveryCount} />
          <KpiCard label="Upcoming schedules" value={data.schedules.upcomingDeliveryOrHandover} />
          <KpiCard label="Overdue schedules" value={data.schedules.overdueDeliveryOrHandover} />
        </section>
      ) : null}

      {data ? (
        <section className="admin-report-chart-grid">
          <article className="admin-card admin-report-chart-card">
            <div className="admin-report-card-title">
              <h3>Delivery-related order status</h3>
            </div>
            <DonutChart data={facetsToChart(data.orders.deliveryRelatedByStatus)} />
          </article>
          <article className="admin-card admin-report-chart-card">
            <div className="admin-report-card-title">
              <h3>Delivery pipeline</h3>
            </div>
            <ColumnChart
              data={[
                { label: 'Ready', value: data.projects.readyForDelivery },
                { label: 'Delivering', value: data.projects.delivering },
                { label: 'Delivered', value: data.projects.deliveredInRange },
                { label: 'Upcoming', value: data.schedules.upcomingDeliveryOrHandover },
                { label: 'Overdue', value: data.schedules.overdueDeliveryOrHandover },
              ]}
            />
          </article>
        </section>
      ) : null}

      <section className="admin-card admin-report-table-card">
        <div className="admin-report-card-title">
          <h3>Delivery reviews</h3>
          <span>
            Avg overall {reviews?.summary.averageOverallRating?.toFixed(1) ?? '—'} · delivery{' '}
            {reviews?.summary.averageDeliveryRating?.toFixed(1) ?? '—'}
          </span>
        </div>
        {reviewsQuery.isLoading ? <StateBlock>Loading reviews...</StateBlock> : null}
        {reviewsQuery.isError ? <ErrorBlock error={reviewsQuery.error} /> : null}
        {reviews && reviews.items.length === 0 ? <StateBlock>No delivery reviews in range.</StateBlock> : null}
        {reviews && reviews.items.length > 0 ? (
          <>
            <div className="admin-table-wrap">
              <table className="admin-report-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Overall</th>
                    <th>Delivery</th>
                    <th>Comment</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.items.map((item) => (
                    <tr key={`${item.projectId}-${item.createdAt}`}>
                      <td>{item.projectCode}</td>
                      <td>{item.overallRating}</td>
                      <td>{item.deliveryRating}</td>
                      <td>{item.comment || '-'}</td>
                      <td>{formatDateTime(item.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={reviews.page}
              totalPages={reviews.totalPages}
              hasPreviousPage={reviews.hasPreviousPage}
              hasNextPage={reviews.hasNextPage}
              onPrevious={() => setPage((current) => Math.max(1, current - 1))}
              onNext={() => setPage((current) => current + 1)}
            />
          </>
        ) : null}
      </section>
    </>
  );
}

function CatalogPanel({ fromDate, toDate }: { fromDate: string; toDate: string }) {
  const [metric, setMetric] = useState<CatalogBestsellerMetric>('quantity');
  const catalogQuery = useReportCatalog();
  const bestsellersQuery = useCatalogBestsellers({
    from: toApiDateTime(fromDate, 'start'),
    to: toApiDateTime(toDate, 'end'),
    metric,
    limit: 20,
  });
  const data = catalogQuery.data;
  const bestsellers = bestsellersQuery.data;

  return (
    <>
      {catalogQuery.isLoading ? <StateBlock>Loading catalog report...</StateBlock> : null}
      {catalogQuery.isError ? <ErrorBlock error={catalogQuery.error} /> : null}
      {data ? (
        <>
          <section className="admin-report-kpi-grid">
            <KpiCard label="Missing active version" value={data.productsMissingActiveVersion} />
            <KpiCard label="Missing 3D" value={data.productsMissing3D} />
          </section>
          <section className="admin-report-chart-grid">
            <article className="admin-card admin-report-chart-card">
              <div className="admin-report-card-title">
                <h3>Products by status</h3>
              </div>
              <DonutChart data={facetsToChart(data.productsByStatus)} />
            </article>
            <article className="admin-card admin-report-chart-card">
              <div className="admin-report-card-title">
                <h3>By category</h3>
              </div>
              <ColumnChart
                data={data.productsByCategory.slice(0, 8).map((item) => ({
                  label: item.name,
                  value: item.count,
                }))}
              />
            </article>
            <article className="admin-card admin-report-chart-card admin-report-chart-card-wide">
              <div className="admin-report-card-title">
                <h3>By business type</h3>
              </div>
              <RankBarChart
                data={data.productsByBusinessType.slice(0, 8).map((item) => ({
                  label: item.name,
                  value: item.count,
                }))}
              />
            </article>
          </section>
        </>
      ) : null}

      <section className="admin-card admin-report-table-card">
        <div className="admin-report-card-title">
          <h3>Bestsellers</h3>
          <label className="admin-report-inline-select">
            Metric
            <select value={metric} onChange={(event) => setMetric(event.target.value as CatalogBestsellerMetric)}>
              <option value="quantity">Quantity</option>
              <option value="revenue">Revenue</option>
            </select>
          </label>
        </div>
        {bestsellersQuery.isLoading ? <StateBlock>Loading bestsellers...</StateBlock> : null}
        {bestsellersQuery.isError ? <ErrorBlock error={bestsellersQuery.error} /> : null}
        {bestsellers && bestsellers.items.length === 0 ? <StateBlock>No bestsellers in range.</StateBlock> : null}
        {bestsellers && bestsellers.items.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-report-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Qty sold</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {bestsellers.items.map((item) => (
                  <tr key={`${item.productId}-${item.productVersionId}`}>
                    <td>{item.productName}</td>
                    <td>{item.sku ?? '-'}</td>
                    <td>{item.quantitySold}</td>
                    <td>{formatMoney(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </>
  );
}

function KpiCard({
  label,
  value,
  note,
  title,
}: {
  label: string;
  value?: string | number | null;
  note?: string;
  title?: string;
}) {
  return (
    <article className="admin-report-kpi-card" title={title}>
      <span>{label}</span>
      <strong>{value ?? '—'}</strong>
      {note ? <p>{note}</p> : null}
    </article>
  );
}

function StateBlock({ children }: { children: ReactNode }) {
  return <div className="admin-report-state">{children}</div>;
}

function ErrorBlock({ error }: { error: unknown }) {
  return <div className="admin-report-state admin-report-state-error">{getReportServiceResultMessage(error)}</div>;
}

type ChartDatum = { label: string; value: number };
type ChartTone = 'good' | 'warn' | 'bad' | 'accent';

const CHART_COLORS = ['#8b6f47', '#c0954b', '#6f5636', '#d4a574', '#2a241f', '#b88746', '#9a7b52', '#e0c49a'];

function RankBarChart({ data }: { data: ChartDatum[] }) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  if (data.length === 0) {
    return <StateBlock>No chart data.</StateBlock>;
  }

  return (
    <div className="admin-report-bar-chart">
      {data.map((item, index) => (
        <div key={item.label} className="admin-report-bar-row">
          <span title={item.label}>
            <em>{index + 1}.</em> {item.label}
          </span>
          <div>
            <i style={{ width: `${Math.max((item.value / maxValue) * 100, 6)}%` }} />
          </div>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

function ColumnChart({ data }: { data: ChartDatum[] }) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  if (data.length === 0) {
    return <StateBlock>No chart data.</StateBlock>;
  }

  return (
    <div className="admin-report-column-chart">
      <div className="admin-report-column-plot">
        {data.map((item, index) => (
          <div key={item.label} className="admin-report-column-item" title={`${item.label}: ${item.value}`}>
            <strong>{item.value}</strong>
            <div className="admin-report-column-track">
              <i
                className={`admin-report-column-fill admin-report-palette-${index % CHART_COLORS.length}`}
                style={{ height: `${Math.max((item.value / maxValue) * 100, 4)}%` }}
              />
            </div>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ data }: { data: ChartDatum[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (data.length === 0 || total <= 0) {
    return <StateBlock>No chart data.</StateBlock>;
  }

  let cursor = 0;
  const stops = data.map((item, index) => {
    const start = cursor;
    const share = (item.value / total) * 100;
    cursor += share;
    return `${CHART_COLORS[index % CHART_COLORS.length]} ${start}% ${cursor}%`;
  });

  return (
    <div className="admin-report-donut-layout">
      <div
        className="admin-report-donut"
        style={{
          background: `radial-gradient(circle at center, #ffffff 0 48%, transparent 49%), conic-gradient(${stops.join(', ')})`,
        }}
        aria-label={`Total ${total}`}
      >
        <strong>{total}</strong>
        <span>Total</span>
      </div>
      <div className="admin-report-legend">
        {data.map((item, index) => (
          <div key={item.label}>
            <i className={`admin-report-legend-dot admin-report-palette-${index % CHART_COLORS.length}`} />
            <span>{item.label}</span>
            <strong>
              {item.value}
              <small>{Math.round((item.value / total) * 100)}%</small>
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function StackedShareChart({ data }: { data: Array<ChartDatum & { tone?: ChartTone }> }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (data.length === 0 || total <= 0) {
    return <StateBlock>No chart data.</StateBlock>;
  }

  return (
    <div className="admin-report-stacked-chart">
      <div className="admin-report-stacked-track" aria-hidden="true">
        {data.map((item) => (
          <i
            key={item.label}
            className={`admin-report-stacked-segment admin-report-tone-${item.tone ?? 'accent'}`}
            style={{ width: `${Math.max((item.value / total) * 100, item.value > 0 ? 2 : 0)}%` }}
            title={`${item.label}: ${item.value}`}
          />
        ))}
      </div>
      <div className="admin-report-stacked-legend">
        {data.map((item) => (
          <div key={item.label}>
            <i className={`admin-report-tone-${item.tone ?? 'accent'}`} />
            <span>{item.label}</span>
            <strong>
              {item.value}
              <small>{Math.round((item.value / total) * 100)}%</small>
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function MultiLineTrend({
  points,
}: {
  points: Array<{ label: string; gmv: number; collected: number; orders: number }>;
}) {
  if (points.length === 0) {
    return <StateBlock>No trend points.</StateBlock>;
  }

  const moneyValues = points.flatMap((point) => [point.gmv, point.collected]);
  const min = Math.min(...moneyValues, 0);
  const max = Math.max(...moneyValues, 1);
  const range = Math.max(max - min, 1);
  const pointCoord = (value: number, index: number) =>
    `${points.length <= 1 ? 50 : (index / (points.length - 1)) * 100},${10 + (1 - (value - min) / range) * 80}`;
  const axisTicks = pickAxisTicks(points, 7);

  return (
    <div className="admin-report-line-chart">
      <div className="admin-report-line-legend">
        <span>
          <i />
          GMV
        </span>
        <span>
          <i />
          Collected
        </span>
      </div>
      <div className="admin-report-line-plot">
        <div className="admin-report-line-y-axis" aria-hidden="true">
          <span>{formatCompactMoney(max)}</span>
          <span>{formatCompactMoney((max + min) / 2)}</span>
          <span>{formatCompactMoney(min)}</span>
        </div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Commercial trend">
          <polyline points={points.map((item, index) => pointCoord(item.gmv, index)).join(' ')} />
          <polyline points={points.map((item, index) => pointCoord(item.collected, index)).join(' ')} />
        </svg>
        <div className="admin-report-line-axis" aria-hidden="true">
          {axisTicks.map((tick) => {
            const edgeClass =
              tick.position <= 0 ? ' is-start' : tick.position >= 100 ? ' is-end' : '';
            return (
              <span
                key={`${tick.index}-${tick.label}`}
                className={`admin-report-line-tick${edgeClass}`}
                style={{ left: `${tick.position}%` }}
                title={tick.label}
              >
                {tick.label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function pickAxisTicks<T extends { label: string }>(points: T[], maxTicks: number) {
  if (points.length === 0) {
    return [] as Array<{ index: number; label: string; position: number }>;
  }

  if (points.length === 1) {
    return [{ index: 0, label: points[0].label, position: 50 }];
  }

  const tickCount = Math.min(maxTicks, points.length);
  const indices = Array.from({ length: tickCount }, (_, slot) =>
    Math.round((slot / (tickCount - 1)) * (points.length - 1)),
  );
  const uniqueIndices = [...new Set(indices)];

  return uniqueIndices.map((index) => ({
    index,
    label: points[index].label,
    position: (index / (points.length - 1)) * 100,
  }));
}

function Pagination({
  page,
  totalPages,
  hasPreviousPage,
  hasNextPage,
  onPrevious,
  onNext,
}: {
  page: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="admin-report-pagination">
      <button type="button" className="admin-button admin-button-secondary" disabled={!hasPreviousPage} onClick={onPrevious}>
        Previous
      </button>
      <span>
        Page {page} / {totalPages}
      </span>
      <button type="button" className="admin-button admin-button-secondary" disabled={!hasNextPage} onClick={onNext}>
        Next
      </button>
    </div>
  );
}

function facetsToChart(items: ReportFacetItem[] | undefined) {
  return (items ?? []).map((item) => ({
    label: item.label || formatLabel(item.key),
    value: item.count,
  }));
}

function bucketToChart(bucket: ProjectBucketCounts) {
  return [
    { label: 'Intake', value: bucket.intake },
    { label: 'Commercial', value: bucket.commercial },
    { label: 'Design', value: bucket.designMonitor },
    { label: 'Fulfillment', value: bucket.fulfillment },
    { label: 'Terminal', value: bucket.terminal },
    { label: 'Other', value: bucket.other },
  ];
}

function formatLabel(value: string) {
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

function formatCompactMoney(value: number) {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return String(Math.round(value));
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function toDateInputValue(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function toApiDateTime(dateInput: string, edge: 'start' | 'end') {
  if (!dateInput) return '';
  return edge === 'start' ? `${dateInput}T00:00:00` : `${dateInput}T23:59:59`;
}

function toFinancialApiDateTime(dateInput: string) {
  if (!dateInput) return '';
  return `${dateInput}T00:00:00+07:00`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default AdminReports;
