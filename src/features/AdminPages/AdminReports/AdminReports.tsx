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
  makeReport('overview', 'Overview', 'Business health, orders, payments, project flow, and fulfilment summary.', [
    ['Projects created', '142', '+18 vs previous', 'Projects submitted in selected period'],
    ['Projects completed', '58', '41% completion rate', 'Projects completed in selected period'],
    ['Orders created', '52', '+8 vs previous', 'Orders created from accepted quotations'],
    ['Order final total', '$118.2k', 'After adjustments', 'Sum of order final totals'],
    ['Amount collected', '$72.6k', 'Verified payments only', 'Start fee, deposit, remaining payment paid'],
    ['Outstanding amount', '$45.6k', 'Needs follow-up', 'Order final total minus verified paid amount'],
  ]),
  makeReport('sales-orders', 'Sales & Orders', 'Quotation conversion, order volume, order value, and sales follow-up.', [
    ['Quotations sent', '74', '+9 vs previous', 'Quotations sent to customers'],
    ['Accepted quotations', '38', '+6 accepted', 'Customer accepted quotations'],
    ['Acceptance rate', '52%', '+6.1%', 'Accepted divided by sent quotations'],
    ['Orders created', '52', '+8', 'Orders created in selected period'],
    ['Order final total', '$118.2k', 'Operational order value', 'Sum of final order totals'],
    ['Average order value', '$8.4k', '+$620', 'Average final total per order'],
  ]),
  makeReport('payments', 'Payments', 'Canonical payment phases, collected amount, outstanding amount, and failed transactions.', [
    ['Start Fee paid / pending', '$9.8k / $2.1k', 'Intake payment', 'Start fee payment phase status'],
    ['Deposit paid / pending', '$42.6k / $18.4k', 'Production gate', 'Deposit payment phase status'],
    ['Remaining paid / pending', '$30.2k / $45.6k', 'Completion gate', 'Remaining payment phase status'],
    ['Amount paid', '$72.6k', 'Verified only', 'Paid amount from payment records'],
    ['Outstanding', '$45.6k', 'Remaining actions', 'Final total minus amount paid'],
    ['Failed transactions', '3', 'Provider check', 'Failed or unresolved payment transactions'],
  ]),
  makeReport('projects', 'Projects', 'Project creation, completion, lifecycle, status, bottleneck, and overdue analysis.', [
    ['Projects created', '142', '+18 vs previous', 'Submitted projects in period'],
    ['Projects completed', '58', '41% completion rate', 'Completed projects in period'],
    ['Approved / rejected', '91 / 7', '6.9% rejection', 'Project intake decisions'],
    ['Average lifecycle', '42d', '-5d', 'Request submitted to project completion'],
    ['Overdue projects', '17', '+3', 'Projects exceeding configured phase due date'],
    ['Bottleneck phase', 'Proposal', '3.6d avg age', 'Phase with highest average age'],
  ]),
  makeReport('production-delivery', 'Production & Delivery', 'Production completion, blocked items, delivery schedules, and customer confirmation.', [
    ['Production requests', '96', '+11 received', 'Production requests created in period'],
    ['Production completed', '42', '+8 completed', 'Production requests completed in period'],
    ['Production on-time rate', '84%', '+4%', 'Completed before estimated due date'],
    ['Blocked / unavailable items', '7 / 3', 'needs action', 'Blocked and unavailable production item counts'],
    ['Delivery schedules', '31', '+6', 'Project schedules with delivery type'],
    ['Confirmation pending', '9', 'customer side', 'Delivered items awaiting customer confirmation'],
  ]),
];

const filterOptions = {
  businessTypes: ['All business types', 'Cafe', 'Office', 'Retail', 'Restaurant'],
  sales: ['All sales', 'Mai Nguyen', 'Quang Vo', 'Nhi Pham', 'Khoa Le'],
  status: ['All statuses', 'Request', 'Quotation', 'Order', 'Production', 'Delivery', 'Completed'],
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
                <p>Business performance, orders, payments, project flow, and fulfilment analysis</p>
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
  if (title === 'Sales & Orders') return ['Order', 'Project', 'Customer', 'Sales', 'Quotation Status', 'Final Total', 'Status', 'Action'];
  if (title === 'Payments') return ['Order', 'Project', 'Payment Phase', 'Final Total', 'Paid', 'Outstanding', 'Status', 'Action'];
  if (title === 'Production & Delivery') return ['Production Request', 'Project', 'Items', 'Blocked Items', 'Delivery Schedule', 'Customer Confirmation', 'Status', 'Delay'];
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
  if (column === 'Sales') return ['Mai Nguyen', 'Quang Vo', 'Nhi Pham', 'Khoa Le'][index];
  if (column === 'Created' || column === 'Date' || column === 'Updated') return `2026-0${6 + (index % 2)}-${18 + index}`;
  if (column === 'Duration') return `${18 + index * 6}d`;
  if (column === 'Status') return ['Completed', 'In Progress', 'At Risk', 'Pending'][index];
  if (column === 'Delay') return ['-', '1d', '3d', '-'][index];
  if (column === 'Code') return `QT-${8290 + index}`;
  if (column === 'Customer') return ['Avery Nguyen', 'Maison Co.', 'Noah Pham', 'Eden Studio'][index];
  if (column === 'Quotation Status') return ['Accepted', 'Sent', 'Revision requested', 'Accepted'][index];
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
  if (column === 'Production Request') return `PROD-${90 - index}`;
  if (column === 'Items') return [12, 16, 15, 18][index];
  if (column === 'Blocked Items') return [0, 1, 3, 0][index];
  if (column === 'Delivery Schedule') return ['Missing', 'Aug 9', 'Not scheduled', 'Completed'][index];
  if (column === 'Customer Confirmation') return ['Pending', 'Not started', 'Blocked', 'Confirmed'][index];
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
