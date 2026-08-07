import { useMemo, useState } from 'react';
import {
  IconChartBar,
  IconChevronDown,
  IconDownload,
  IconFileSpreadsheet,
  IconFileTypePdf,
  IconInfoCircle,
  IconPrinter,
  IconReportAnalytics,
} from '@tabler/icons-react';

import { AdminNavbar, AdminSidebar } from '../admincomponents';
import './AdminReports.css';

type Kpi = {
  definition: string;
  label: string;
  note: string;
  value: string;
};

type ChartDatum = {
  label: string;
  secondaryValue?: number;
  value: number;
};

type ReportChart = {
  data: ChartDatum[];
  title: string;
  type: 'bars' | 'line' | 'donut';
};

type ReportRow = Record<string, string | number>;

type ReportDefinition = {
  charts: ReportChart[];
  columns: string[];
  description: string;
  id: string;
  kpis: Kpi[];
  rows: ReportRow[];
  title: string;
};

// Mocked until admin historical reporting endpoints are available.
const reportTabs: ReportDefinition[] = [
  makeReport('overview', 'Overview', 'Cross-functional historical trend and performance summary.', [
    ['Projects created', '142', '+18 vs previous', 'Projects submitted in selected period'],
    ['Projects completed', '58', '41% completion rate', 'Projects completed in selected period'],
    ['Quotation acceptance rate', '52%', '+6.1%', 'Accepted quotations divided by sent quotations'],
    ['Accepted quotation value', '$86.4k', 'Operational commercial value', 'Sum of accepted quotation totals'],
    ['Amount collected', '$72.6k', 'Verified payments only', 'Start fee, deposit, remaining payment paid'],
    ['Avg customer rating', '4.6/5', '+0.2', 'Average rating from project reviews'],
  ]),
  makeReport('projects', 'Projects', 'Project creation, completion, lifecycle, delay, owner and status analysis.', [
    ['Projects created', '142', '+18 vs previous', 'Submitted projects in period'],
    ['Approved / rejected', '91 / 7', '6.9% rejection', 'Project intake decisions'],
    ['Average lifecycle', '42d', '-5d', 'Request submitted to project completion'],
    ['Overdue rate', '12%', '+2.3%', 'Projects exceeding configured phase due date'],
    ['Revision rate', '31%', 'Proposal revisions', 'Projects with at least one proposal revision'],
  ]),
  makeReport('sales', 'Sales', 'Sales operational performance, response, quotation and payment follow-up.', [
    ['Requests handled', '86', '+12', 'Requests reviewed or assigned by Sales'],
    ['First response time', '3.8h', '-1.2h', 'Average request to first Sales action'],
    ['Quotations sent', '74', '+9', 'Quotations sent to customers'],
    ['Acceptance rate', '52%', '+6.1%', 'Accepted divided by sent quotations'],
    ['Payment follow-ups', '24', '6 overdue', 'Pending payment actions owned by Sales'],
  ]),
  makeReport('designer', 'Designer', 'Designer assignments, measurements, proposals, room planner and customization output.', [
    ['Projects assigned', '68', '9 designers', 'Projects assigned to designers'],
    ['Measurements completed', '41', '+7', 'Completed measurement schedules'],
    ['Proposals published', '83', '+11', 'Published proposal records'],
    ['First draft turnaround', '2.4d', '-0.6d', 'Assignment to first proposal draft'],
    ['Overdue design tasks', '9', '3 high priority', 'Tasks beyond design due date'],
  ]),
  makeReport('production', 'Production', 'Production request duration, completion, blocking, unavailable and workload trends.', [
    ['Requests received', '96', '+11', 'Production requests created'],
    ['Requests completed', '42', '+8', 'Production requests completed'],
    ['On-time rate', '84%', '+4%', 'Completed before due date'],
    ['Blocked rate', '8%', 'watchlist', 'Blocked items divided by active items'],
    ['Feasibility turnaround', '1.6d', '-0.3d', 'Customization review response duration'],
  ]),
  makeReport('quotations', 'Quotations', 'Quotation status, value, revision, decision time and additional cost analysis.', [
    ['Draft / sent', '18 / 30', 'Active pipeline', 'Quotation status counts'],
    ['Accepted / rejected', '74 / 21', '52% accepted', 'Customer decision outcomes'],
    ['Average value', '$8.4k', '+$620', 'Average quotation final total'],
    ['Decision time', '2.8d', '-0.4d', 'Sent date to customer decision'],
    ['Customization cost', '$7.2k', 'Included totals', 'Additional cost from customization lines'],
  ]),
  makeReport('orders', 'Orders & Payments', 'Order totals, canonical payment phases, failures and completion readiness.', [
    ['Orders created', '52', '+8', 'Orders created in selected period'],
    ['Final total', '$118.2k', 'After adjustments', 'Order final total amount'],
    ['Amount paid', '$72.6k', 'Verified only', 'Paid amount from payment records'],
    ['Outstanding', '$45.6k', 'Remaining actions', 'Final total minus amount paid'],
    ['Failed transactions', '3', 'Provider check', 'Failed or unresolved payment transactions'],
  ]),
  makeReport('delivery', 'Delivery', 'Production-to-delivery timing, schedule, delivered quantity and confirmation delays.', [
    ['Delivery schedules', '31', '+6', 'Project schedules with delivery type'],
    ['On-time delivery', '88%', '+3%', 'Completed delivery within scheduled window'],
    ['Delivered quantity', '426', 'order items', 'Delivered quantities from order item records'],
    ['Confirmation pending', '9', 'customer side', 'Items delivered but not confirmed'],
    ['Delivery exceptions', '5', '2 production-caused', 'Delivery blocked or delayed cases'],
  ]),
  makeReport('schedules', 'Schedules', 'Schedule type distribution, confirmation, overdue and workload by staff.', [
    ['Total schedules', '184', '+22', 'Schedules created in selected period'],
    ['Confirmed', '139', '75.5%', 'Schedules with confirmed status'],
    ['Awaiting confirmation', '31', 'customer/staff', 'Schedules pending confirmation'],
    ['Overdue', '11', 'needs action', 'Schedules past due'],
    ['Delivery schedules', '31', '+6', 'Delivery schedule count'],
  ]),
  makeReport('catalog', 'Catalog', 'Product, version, model, preview, dimension and usage analysis.', [
    ['Active products', '286', '83.6%', 'Products active in catalog'],
    ['Product versions', '718', '2.1 avg/product', 'Product version records'],
    ['Missing preview', '21', 'cleanup needed', 'Versions without preview image'],
    ['Missing 3D model', '15', 'planner risk', 'Versions without 3D model file'],
    ['Most customized', 'Modular Sofa', '18 requests', 'Product with highest customization request count'],
  ]),
  makeReport('customer-experience', 'Customer Experience', 'Revision, rejection, delivery confirmation, ratings and duration by customer segment.', [
    ['Proposal revision frequency', '31%', '-4%', 'Projects with proposal revision request'],
    ['Quotation rejection rate', '14.6%', '+1%', 'Rejected quotations divided by decided quotations'],
    ['Delivery confirmation delay', '1.2d', '-0.2d', 'Delivery completion to customer confirmation'],
    ['Average rating', '4.6/5', '+0.2', 'Average project review rating'],
    ['Repeat customers', '24%', 'identity-supported', 'Customers with more than one project'],
  ]),
];

const filterOptions = {
  businessTypes: ['All business types', 'Cafe', 'Office', 'Retail', 'Restaurant'],
  designers: ['All designers', 'Linh Tran', 'Minh Do', 'Hanh Le', 'Vy Hoang'],
  production: ['All production', 'Minh Tran', 'Huy Pham', 'Lan Ho'],
  sales: ['All sales', 'Mai Nguyen', 'Quang Vo', 'Nhi Pham', 'Khoa Le'],
  status: ['All statuses', 'Consultation', 'Design', 'Quotation', 'Production', 'Delivery', 'Completed'],
};

export function AdminReports() {
  const [activeReportId, setActiveReportId] = useState('overview');
  const now = useMemo(() => new Date(), []);
  const generatedTime = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(now);
  const activeReport = reportTabs.find((report) => report.id === activeReportId) ?? reportTabs[0];

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
                <p>Business, project, commercial, production, delivery, and catalog analysis</p>
                <span className="admin-report-freshness">Generated {generatedTime} / Data freshness: visual prototype</span>
              </div>
              <div className="admin-reports-actions">
                <button className="admin-button admin-button-secondary" disabled type="button"><IconDownload size={16} /> CSV mock</button>
                <button className="admin-button admin-button-secondary" disabled type="button"><IconFileTypePdf size={16} /> PDF mock</button>
                <button className="admin-button admin-button-primary" disabled type="button"><IconPrinter size={16} /> Print mock</button>
              </div>
            </section>

            <section className="admin-card admin-report-filters" aria-label="Shared report filters">
              <ReportFilter label="Report date range" type="dateRange" />
              <ReportFilter label="Business type" options={filterOptions.businessTypes} />
              <ReportFilter label="Project status" options={filterOptions.status} />
              <ReportFilter label="Sales" options={filterOptions.sales} />
              <ReportFilter label="Designer" options={filterOptions.designers} />
              <ReportFilter label="Production" options={filterOptions.production} />
              <label className="admin-report-compare"><input defaultChecked type="checkbox" /> Compare previous period</label>
            </section>

            <section className="admin-report-tabs" aria-label="Report navigation">
              {reportTabs.map((report) => (
                <button key={report.id} className={`admin-report-tab${report.id === activeReport.id ? ' admin-report-tab-active' : ''}`} type="button" onClick={() => setActiveReportId(report.id)}>
                  {report.title}
                </button>
              ))}
            </section>

            <section className="admin-report-overview">
              <div>
                <span><IconReportAnalytics size={16} /> Historical analysis</span>
                <h3>{activeReport.title}</h3>
                <p>{activeReport.description}</p>
              </div>
              <button className="admin-report-export-link" disabled type="button"><IconFileSpreadsheet size={16} /> Export current result mock</button>
            </section>

            <section className="admin-report-kpi-grid">
              {activeReport.kpis.map((kpi) => (
                <article className="admin-report-kpi-card" key={kpi.label} title={kpi.definition}>
                  <span>{kpi.label} <IconInfoCircle size={13} /></span>
                  <strong>{kpi.value}</strong>
                  <p>{kpi.note}</p>
                </article>
              ))}
            </section>

            <section className="admin-report-chart-grid">
              {activeReport.charts.slice(0, 3).map((chart) => (
                <article key={chart.title} className={`admin-card admin-report-chart-card admin-report-chart-card-${chart.type}`}>
                  <div className="admin-report-card-title"><h3>{chart.title}</h3><IconChartBar size={18} /></div>
                  <ReportChartView chart={chart} />
                </article>
              ))}
            </section>

            <section className="admin-card admin-report-table-card">
              <div className="admin-report-card-title"><h3>{activeReport.title} Drill-down Table</h3><span>{activeReport.rows.length} records / sorting, pagination, column visibility mocked</span></div>
              <div className="admin-table-wrap">
                <table className="admin-report-table">
                  <thead><tr>{activeReport.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
                  <tbody>
                    {activeReport.rows.map((row, rowIndex) => (
                      <tr key={`${activeReport.id}-${rowIndex}`}>
                        {activeReport.columns.map((column) => <td key={column}>{row[column] ?? '-'}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function makeReport(id: string, title: string, description: string, rawKpis: Array<[string, string, string, string]>): ReportDefinition {
  const seed = title.length;
  const columns = getColumns(title);

  return {
    charts: [
      { data: monthData(seed), title: `${title} trend`, type: 'line' },
      { data: phaseData(seed), title: `${title} distribution`, type: 'donut' },
      { data: riskData(seed), title: `${title} top risks`, type: 'bars' },
    ],
    columns,
    description,
    id,
    kpis: rawKpis.map(([label, value, note, definition]) => ({ definition, label, note, value })),
    rows: sampleRows(columns, title),
    title,
  };
}

function getColumns(title: string) {
  if (title === 'Quotations') return ['Code', 'Project', 'Customer', 'Owner', 'Date', 'Value', 'Status', 'Delay'];
  if (title === 'Orders & Payments') return ['Order', 'Project', 'Payment Phase', 'Final Total', 'Paid', 'Outstanding', 'Status', 'Action'];
  if (title === 'Catalog') return ['Product', 'Category', 'Versions', 'Missing Preview', 'Missing Model', 'Usage', 'Status', 'Updated'];
  if (title === 'Customer Experience') return ['Customer', 'Project', 'Business Type', 'Rating', 'Revision Count', 'Confirmation Delay', 'Status', 'Date'];
  return ['Entity', 'Project', 'Business Type', 'Owner', 'Created', 'Duration', 'Status', 'Delay'];
}

function sampleRows(columns: string[], title: string): ReportRow[] {
  const base = ['PRJ-2026-184', 'PRJ-2026-176', 'PRJ-2026-169', 'PRJ-2026-151'];
  return base.map((code, index) => {
    const row: ReportRow = {};
    columns.forEach((column) => {
      row[column] = valueForColumn(column, title, code, index);
    });
    return row;
  });
}

function valueForColumn(column: string, title: string, code: string, index: number) {
  const names = ['Bean & Brew', 'Nova Work Lounge', 'Urban Threads', 'Northline Office'];
  const owners = ['Mai Nguyen', 'Linh Tran', 'Minh Tran', 'Quang Vo'];
  if (column === 'Entity') return `${title.slice(0, 3).toUpperCase()}-${8200 + index}`;
  if (column === 'Project') return `${code} ${names[index]}`;
  if (column === 'Business Type') return ['Cafe', 'Office', 'Retail', 'Office'][index];
  if (column === 'Owner') return owners[index];
  if (column === 'Created' || column === 'Date' || column === 'Updated') return `2026-0${6 + (index % 2)}-${18 + index}`;
  if (column === 'Duration') return `${18 + index * 6}d`;
  if (column === 'Status') return ['Completed', 'In Progress', 'At Risk', 'Pending'][index];
  if (column === 'Delay') return ['-', '1d', '3d', '-'][index];
  if (column === 'Code') return `QT-${8290 + index}`;
  if (column === 'Customer') return ['Avery Nguyen', 'Maison Co.', 'Noah Pham', 'Eden Studio'][index];
  if (column === 'Value' || column === 'Final Total') return ['$12,800', '$7,420', '$5,900', '$18,250'][index];
  if (column === 'Order') return `ORD-${112 + index}`;
  if (column === 'Payment Phase') return ['Deposit', 'Remaining', 'Start Fee', 'Final'][index];
  if (column === 'Paid') return ['$8,200', '$4,000', '$1,200', '$18,250'][index];
  if (column === 'Outstanding') return ['$4,600', '$3,420', '$4,700', '$0'][index];
  if (column === 'Action') return ['Prepare payment', 'Follow up', 'Verify callback', 'Complete project'][index];
  if (column === 'Product') return ['Modular Sofa', 'Oak Wardrobe', 'Nord Table', 'Luna Chair'][index];
  if (column === 'Category') return ['Sofa', 'Storage', 'Table', 'Chair'][index];
  if (column === 'Versions') return [8, 6, 5, 3][index];
  if (column === 'Missing Preview' || column === 'Missing Model') return ['No', 'Yes', 'No', 'Yes'][index];
  if (column === 'Usage') return [18, 15, 12, 4][index];
  if (column === 'Rating') return ['5.0', '4.5', '3.0', '2.0'][index];
  if (column === 'Revision Count') return [0, 2, 3, 1][index];
  if (column === 'Confirmation Delay') return ['0.4d', '1.2d', '2.0d', '3.1d'][index];
  return '-';
}

function monthData(seed: number): ChartDatum[] {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((label, index) => ({
    label,
    secondaryValue: 10 + ((seed + index * 3) % 20),
    value: 16 + ((seed + index * 5) % 28),
  }));
}

function phaseData(seed: number): ChartDatum[] {
  return ['Request', 'Design', 'Quotation', 'Production', 'Delivery', 'Complete'].map((label, index) => ({
    label,
    value: 8 + ((seed + index * 7) % 24),
  }));
}

function riskData(seed: number): ChartDatum[] {
  return ['Overdue', 'Blocked', 'Pending', 'Missing data', 'Failed'].map((label, index) => ({
    label,
    value: 2 + ((seed + index * 4) % 12),
  }));
}

function ReportFilter({ label, options, type }: { label: string; options?: string[]; type?: 'dateRange' }) {
  if (type === 'dateRange') {
    return <div className="admin-report-filter admin-report-date-filter"><span>{label}</span><div><input aria-label="Report start date" defaultValue="2026-01-01" type="date" /><input aria-label="Report end date" defaultValue="2026-06-30" type="date" /></div></div>;
  }
  return <label className="admin-report-filter"><span>{label}</span><div><select defaultValue={options?.[0]}>{options?.map((option) => <option key={option} value={option}>{option}</option>)}</select><IconChevronDown size={16} /></div></label>;
}

function ReportChartView({ chart }: { chart: ReportChart }) {
  if (chart.type === 'donut') return <DonutChart data={chart.data} />;
  if (chart.type === 'line') return <LineChart data={chart.data} title={chart.title} />;
  return <BarChart data={chart.data} />;
}

function BarChart({ data }: { data: ChartDatum[] }) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  return <div className="admin-report-bar-chart">{data.map((item) => <div key={item.label} className="admin-report-bar-row"><span>{item.label}</span><div><i style={{ width: `${Math.max((item.value / maxValue) * 100, 6)}%` }} /></div><strong>{item.value}</strong></div>)}</div>;
}

function DonutChart({ data }: { data: ChartDatum[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return <div className="admin-report-donut-layout"><div className="admin-report-donut" aria-label={`Total ${total}`}><strong>{total}</strong><span>Total</span></div><div className="admin-report-legend">{data.map((item, index) => <div key={item.label}><i className={`admin-report-legend-dot admin-report-legend-dot-${index % 6}`} /><span>{item.label}</span><strong>{item.value}</strong></div>)}</div></div>;
}

function LineChart({ data, title }: { data: ChartDatum[]; title: string }) {
  const values = data.flatMap((item) => [item.value, item.secondaryValue ?? item.value]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const point = (value: number, index: number) => `${data.length <= 1 ? 50 : (index / (data.length - 1)) * 100},${10 + (1 - (value - min) / range) * 80}`;
  return (
    <div className="admin-report-line-chart">
      <div className="admin-report-line-legend"><span><i />Current</span><span><i />Previous</span></div>
      <div className="admin-report-line-plot">
        <div className="admin-report-line-y-axis" aria-hidden="true"><span>{max}</span><span>{Math.round((max + min) / 2)}</span><span>{min}</span></div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={title}><polyline points={data.map((item, index) => point(item.value, index)).join(' ')} /><polyline points={data.map((item, index) => point(item.secondaryValue ?? item.value, index)).join(' ')} /></svg>
        <div className="admin-report-line-axis">{data.map((item) => <span key={item.label}>{item.label}</span>)}</div>
      </div>
    </div>
  );
}

export default AdminReports;
