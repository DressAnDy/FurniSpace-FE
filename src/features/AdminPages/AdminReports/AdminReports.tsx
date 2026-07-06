import { useMemo, useState } from 'react';
import {
  IconChartBar,
  IconChevronDown,
  IconDownload,
  IconFileSpreadsheet,
  IconFileTypePdf,
  IconReportAnalytics,
} from '@tabler/icons-react';

import { AdminNavbar, AdminSidebar } from '../admincomponents';
import './AdminReports.css';

type Kpi = {
  label: string;
  value: string;
  note?: string;
};

type ChartDatum = {
  label: string;
  value: number;
  secondaryValue?: number;
  secondaryLabel?: string;
};

type ReportChart = {
  title: string;
  type: 'bars' | 'line' | 'donut';
  data: ChartDatum[];
  valueLabel?: string;
  secondaryValueLabel?: string;
};

type ReportRow = Record<string, string | number>;

type ReportDefinition = {
  id: string;
  title: string;
  description: string;
  kpis: Kpi[];
  charts: ReportChart[];
  columns: string[];
  rows: ReportRow[];
};

const reportTabs: ReportDefinition[] = [
  {
    id: 'projects',
    title: 'Project Performance',
    description: 'Project lifecycle movement, duration, and completion quality.',
    kpis: [
      { label: 'Total Projects', value: '186', note: '+14 vs previous period' },
      { label: 'New Projects', value: '32', note: 'This period' },
      { label: 'Completed Projects', value: '58', note: '31% of total' },
      { label: 'Cancelled Projects', value: '7', note: '3.8% cancellation' },
      { label: 'Average Project Duration', value: '42 days', note: '-5 days' },
      { label: 'On-time Completion Rate', value: '87%', note: '+4.2%' },
    ],
    charts: [
      {
        title: 'Project Created vs Completed',
        type: 'line',
        valueLabel: 'Created',
        secondaryValueLabel: 'Completed',
        data: [
          { label: 'Jan', value: 18, secondaryValue: 12 },
          { label: 'Feb', value: 22, secondaryValue: 16 },
          { label: 'Mar', value: 28, secondaryValue: 20 },
          { label: 'Apr', value: 24, secondaryValue: 21 },
          { label: 'May', value: 34, secondaryValue: 27 },
          { label: 'Jun', value: 32, secondaryValue: 29 },
        ],
      },
      {
        title: 'Project Status Breakdown',
        type: 'donut',
        data: [
          { label: 'Consultation', value: 24 },
          { label: 'Design', value: 36 },
          { label: 'Production', value: 31 },
          { label: 'Installation', value: 18 },
          { label: 'Completed', value: 58 },
          { label: 'Cancelled', value: 7 },
        ],
      },
    ],
    columns: ['Project ID', 'Customer', 'Type', 'Status', 'Designer', 'Duration', 'On Time'],
    rows: [
      { 'Project ID': 'PRJ-2026-184', Customer: 'Avery Nguyen', Type: 'Apartment', Status: 'Completed', Designer: 'Linh Tran', Duration: '36 days', 'On Time': 'Yes' },
      { 'Project ID': 'PRJ-2026-176', Customer: 'Maison Co.', Type: 'Office', Status: 'Production', Designer: 'Minh Do', Duration: '49 days', 'On Time': 'At risk' },
      { 'Project ID': 'PRJ-2026-169', Customer: 'Noah Pham', Type: 'Villa', Status: 'Design', Designer: 'Hanh Le', Duration: '22 days', 'On Time': 'Yes' },
      { 'Project ID': 'PRJ-2026-151', Customer: 'Eden Studio', Type: 'Retail', Status: 'Cancelled', Designer: 'Linh Tran', Duration: '14 days', 'On Time': 'No' },
    ],
  },
  {
    id: 'sales',
    title: 'Sales & Quotation',
    description: 'Quotation volume, conversion, revenue, and sales ownership.',
    kpis: [
      { label: 'Total Quotations', value: '143', note: '+19 this period' },
      { label: 'Confirmed Quotations', value: '74', note: '51.7% confirmed' },
      { label: 'Rejected Quotations', value: '21', note: '14.6% rejected' },
      { label: 'Conversion Rate', value: '52%', note: '+6.1%' },
      { label: 'Average Quotation Value', value: '$8.4K', note: '+$620' },
      { label: 'Total Revenue', value: '$621K', note: '+18.4%' },
    ],
    charts: [
      {
        title: 'Revenue by Month',
        type: 'bars',
        data: [
          { label: 'Jan', value: 82 },
          { label: 'Feb', value: 94 },
          { label: 'Mar', value: 88 },
          { label: 'Apr', value: 112 },
          { label: 'May', value: 121 },
          { label: 'Jun', value: 124 },
        ],
      },
      {
        title: 'Quotation Status',
        type: 'donut',
        data: [
          { label: 'Draft', value: 18 },
          { label: 'Sent', value: 30 },
          { label: 'Confirmed', value: 74 },
          { label: 'Rejected', value: 21 },
        ],
      },
      {
        title: 'Top Sales by Confirmed Quotations',
        type: 'bars',
        data: [
          { label: 'Mai', value: 24 },
          { label: 'Quang', value: 18 },
          { label: 'Nhi', value: 16 },
          { label: 'Khoa', value: 11 },
        ],
      },
    ],
    columns: ['Quotation ID', 'Project', 'Sales Staff', 'Status', 'Value', 'Sent Date', 'Decision'],
    rows: [
      { 'Quotation ID': 'QT-8291', Project: 'PRJ-2026-184', 'Sales Staff': 'Mai Nguyen', Status: 'Confirmed', Value: '$12,800', 'Sent Date': '2026-06-18', Decision: '2026-06-22' },
      { 'Quotation ID': 'QT-8284', Project: 'PRJ-2026-176', 'Sales Staff': 'Quang Vo', Status: 'Sent', Value: '$7,420', 'Sent Date': '2026-06-20', Decision: 'Pending' },
      { 'Quotation ID': 'QT-8276', Project: 'PRJ-2026-169', 'Sales Staff': 'Nhi Pham', Status: 'Rejected', Value: '$5,900', 'Sent Date': '2026-06-12', Decision: '2026-06-16' },
      { 'Quotation ID': 'QT-8265', Project: 'PRJ-2026-151', 'Sales Staff': 'Mai Nguyen', Status: 'Confirmed', Value: '$18,250', 'Sent Date': '2026-06-04', Decision: '2026-06-07' },
    ],
  },
  {
    id: 'designers',
    title: 'Designer Performance',
    description: 'Designer workload, proposal throughput, approvals, and revision pressure.',
    kpis: [
      { label: 'Assigned Projects', value: '68', note: 'Across 9 designers' },
      { label: 'Proposals Created', value: '121', note: '+17' },
      { label: 'Approved Proposals', value: '83', note: '68.6%' },
      { label: 'Revision Requests', value: '29', note: '-8%' },
      { label: 'Average Proposal Time', value: '5.4 days', note: '-1.1 days' },
    ],
    charts: [
      {
        title: 'Proposal Status Breakdown',
        type: 'donut',
        data: [
          { label: 'Drafting', value: 22 },
          { label: 'Review', value: 16 },
          { label: 'Approved', value: 83 },
          { label: 'Revision', value: 29 },
        ],
      },
      {
        title: 'Proposals by Designer',
        type: 'bars',
        data: [
          { label: 'Linh', value: 27 },
          { label: 'Minh', value: 22 },
          { label: 'Hanh', value: 19 },
          { label: 'Vy', value: 17 },
          { label: 'Son', value: 14 },
        ],
      },
    ],
    columns: ['Designer', 'Assigned', 'Proposals', 'Approved', 'Revisions', 'Avg Time', 'Utilization'],
    rows: [
      { Designer: 'Linh Tran', Assigned: 12, Proposals: 27, Approved: 19, Revisions: 4, 'Avg Time': '4.8 days', Utilization: '91%' },
      { Designer: 'Minh Do', Assigned: 10, Proposals: 22, Approved: 16, Revisions: 5, 'Avg Time': '5.2 days', Utilization: '84%' },
      { Designer: 'Hanh Le', Assigned: 9, Proposals: 19, Approved: 13, Revisions: 3, 'Avg Time': '5.0 days', Utilization: '78%' },
      { Designer: 'Vy Hoang', Assigned: 8, Proposals: 17, Approved: 11, Revisions: 6, 'Avg Time': '6.1 days', Utilization: '73%' },
    ],
  },
  {
    id: 'production',
    title: 'Production & Installation',
    description: 'Production queue health, delays, category load, and installation completion.',
    kpis: [
      { label: 'Production Requests', value: '96', note: '+11' },
      { label: 'Items In Production', value: '41', note: 'Active queue' },
      { label: 'Completed Production Items', value: '138', note: '+22%' },
      { label: 'Delayed Items', value: '12', note: '8 material delays' },
      { label: 'Installation Completed', value: '52', note: 'This period' },
      { label: 'Average Production Time', value: '13.8 days', note: '-2.3 days' },
    ],
    charts: [
      {
        title: 'Production Status',
        type: 'donut',
        data: [
          { label: 'Queued', value: 18 },
          { label: 'In Production', value: 41 },
          { label: 'Quality Check', value: 15 },
          { label: 'Completed', value: 42 },
        ],
      },
      {
        title: 'Production Items by Category',
        type: 'bars',
        data: [
          { label: 'Cabinet', value: 44 },
          { label: 'Sofa', value: 26 },
          { label: 'Table', value: 21 },
          { label: 'Bed', value: 18 },
          { label: 'Shelving', value: 16 },
        ],
      },
      {
        title: 'Delay Reasons',
        type: 'bars',
        data: [
          { label: 'Material', value: 8 },
          { label: 'QC', value: 3 },
          { label: 'Capacity', value: 2 },
          { label: 'Install', value: 1 },
        ],
      },
    ],
    columns: ['Request ID', 'Project', 'Category', 'Status', 'Factory Owner', 'Due Date', 'Delay Reason'],
    rows: [
      { 'Request ID': 'PRD-6104', Project: 'PRJ-2026-184', Category: 'Cabinet', Status: 'Completed', 'Factory Owner': 'Workshop A', 'Due Date': '2026-06-25', 'Delay Reason': '-' },
      { 'Request ID': 'PRD-6097', Project: 'PRJ-2026-176', Category: 'Sofa', Status: 'In Production', 'Factory Owner': 'Workshop B', 'Due Date': '2026-07-09', 'Delay Reason': 'Material' },
      { 'Request ID': 'PRD-6088', Project: 'PRJ-2026-169', Category: 'Table', Status: 'Quality Check', 'Factory Owner': 'Workshop A', 'Due Date': '2026-07-05', 'Delay Reason': '-' },
      { 'Request ID': 'PRD-6079', Project: 'PRJ-2026-151', Category: 'Shelving', Status: 'Delayed', 'Factory Owner': 'Workshop C', 'Due Date': '2026-06-28', 'Delay Reason': 'QC' },
    ],
  },
  {
    id: 'products',
    title: 'Product & Customization',
    description: 'Catalog health, version depth, and customization feasibility.',
    kpis: [
      { label: 'Total Products', value: '342', note: '44 categories' },
      { label: 'Active Products', value: '286', note: '83.6% active' },
      { label: 'Product Versions', value: '718', note: '2.1 avg per product' },
      { label: 'Customization Requests', value: '93', note: '+12' },
      { label: 'Feasible Requests', value: '71', note: '76.3%' },
      { label: 'Infeasible Requests', value: '13', note: '14.0%' },
    ],
    charts: [
      {
        title: 'Customization Request Status',
        type: 'donut',
        data: [
          { label: 'Pending', value: 9 },
          { label: 'Feasible', value: 71 },
          { label: 'Infeasible', value: 13 },
        ],
      },
      {
        title: 'Top Customized Products',
        type: 'bars',
        data: [
          { label: 'Modular Sofa', value: 18 },
          { label: 'Wardrobe', value: 15 },
          { label: 'Dining Table', value: 12 },
          { label: 'TV Console', value: 9 },
        ],
      },
      {
        title: 'Product Versions by Type',
        type: 'bars',
        data: [
          { label: 'Material', value: 288 },
          { label: 'Size', value: 176 },
          { label: 'Color', value: 154 },
          { label: '3D Model', value: 100 },
        ],
      },
    ],
    columns: ['Product', 'Category', 'Status', 'Versions', 'Customization Requests', 'Feasible', 'Last Updated'],
    rows: [
      { Product: 'Modular Sofa S2', Category: 'Sofa', Status: 'Active', Versions: 8, 'Customization Requests': 18, Feasible: 15, 'Last Updated': '2026-06-27' },
      { Product: 'Oak Wardrobe W4', Category: 'Storage', Status: 'Active', Versions: 6, 'Customization Requests': 15, Feasible: 11, 'Last Updated': '2026-06-22' },
      { Product: 'Nord Dining Table', Category: 'Table', Status: 'Active', Versions: 5, 'Customization Requests': 12, Feasible: 10, 'Last Updated': '2026-06-19' },
      { Product: 'Luna Lounge Chair', Category: 'Chair', Status: 'Inactive', Versions: 3, 'Customization Requests': 4, Feasible: 2, 'Last Updated': '2026-05-30' },
    ],
  },
  {
    id: 'customers',
    title: 'Customer & Feedback',
    description: 'Customer growth, retention, review quality, and low-rating monitoring.',
    kpis: [
      { label: 'Total Customers', value: '1,284', note: '+86' },
      { label: 'New Customers', value: '148', note: 'This period' },
      { label: 'Returning Customers', value: '312', note: '24.3%' },
      { label: 'Average Rating', value: '4.6/5', note: '+0.2' },
      { label: 'Total Reviews', value: '418', note: '+37' },
      { label: 'Low Rating Count', value: '16', note: 'Needs follow-up' },
    ],
    charts: [
      {
        title: 'Customer Growth',
        type: 'line',
        valueLabel: 'New',
        secondaryValueLabel: 'Returning',
        data: [
          { label: 'Jan', value: 88, secondaryValue: 34 },
          { label: 'Feb', value: 96, secondaryValue: 38 },
          { label: 'Mar', value: 113, secondaryValue: 44 },
          { label: 'Apr', value: 121, secondaryValue: 51 },
          { label: 'May', value: 137, secondaryValue: 58 },
          { label: 'Jun', value: 148, secondaryValue: 63 },
        ],
      },
      {
        title: 'Rating Distribution',
        type: 'bars',
        data: [
          { label: '5 stars', value: 244 },
          { label: '4 stars', value: 112 },
          { label: '3 stars', value: 46 },
          { label: '1-2 stars', value: 16 },
        ],
      },
      {
        title: 'Reviews by Project Type',
        type: 'donut',
        data: [
          { label: 'Apartment', value: 186 },
          { label: 'Villa', value: 88 },
          { label: 'Office', value: 79 },
          { label: 'Retail', value: 65 },
        ],
      },
    ],
    columns: ['Customer', 'Project Type', 'Project ID', 'Rating', 'Review Sentiment', 'Issue Type', 'Date'],
    rows: [
      { Customer: 'Avery Nguyen', 'Project Type': 'Apartment', 'Project ID': 'PRJ-2026-184', Rating: '5.0', 'Review Sentiment': 'Excellent', 'Issue Type': '-', Date: '2026-06-29' },
      { Customer: 'Maison Co.', 'Project Type': 'Office', 'Project ID': 'PRJ-2026-176', Rating: '4.5', 'Review Sentiment': 'Positive', 'Issue Type': 'Schedule', Date: '2026-06-26' },
      { Customer: 'Noah Pham', 'Project Type': 'Villa', 'Project ID': 'PRJ-2026-169', Rating: '3.0', 'Review Sentiment': 'Mixed', 'Issue Type': 'Revision time', Date: '2026-06-21' },
      { Customer: 'Eden Studio', 'Project Type': 'Retail', 'Project ID': 'PRJ-2026-151', Rating: '2.0', 'Review Sentiment': 'Low', 'Issue Type': 'Installation', Date: '2026-06-17' },
    ],
  },
];

const filterOptions = {
  projectTypes: ['All types', 'Apartment', 'Villa', 'Office', 'Retail', 'Restaurant'],
  projectStatuses: ['All statuses', 'Consultation', 'Design', 'Production', 'Installation', 'Completed', 'Cancelled'],
  salesStaff: ['All sales staff', 'Mai Nguyen', 'Quang Vo', 'Nhi Pham', 'Khoa Le'],
  designers: ['All designers', 'Linh Tran', 'Minh Do', 'Hanh Le', 'Vy Hoang', 'Son Nguyen'],
  productionStatuses: ['All production', 'Queued', 'In Production', 'Quality Check', 'Completed', 'Delayed'],
};

export function AdminReports() {
  const [activeReportId, setActiveReportId] = useState(reportTabs[0].id);
  const activeReport = useMemo(
    () => reportTabs.find((report) => report.id === activeReportId) ?? reportTabs[0],
    [activeReportId],
  );

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <AdminSidebar activeLabel="Reports" />

        <section className="admin-main">
          <AdminNavbar activeLabel="Reports" />
          <div className="admin-content admin-reports-content">
            <div className="admin-page-heading admin-reports-heading">
              <div>
                <h2>Admin Reports</h2>
                <p>Analyze project, sales, production, product, and customer performance.</p>
              </div>
              <div className="admin-reports-actions">
                <button className="admin-button admin-button-secondary" type="button">
                  <IconFileTypePdf size={16} />
                  Export PDF
                </button>
                <button className="admin-button admin-button-primary" type="button">
                  <IconFileSpreadsheet size={16} />
                  Export Excel
                </button>
              </div>
            </div>

            <section className="admin-card admin-report-filters" aria-label="Report filters">
              <ReportFilter label="Date range" type="dateRange" />
              <ReportFilter label="Project type" options={filterOptions.projectTypes} />
              <ReportFilter label="Project status" options={filterOptions.projectStatuses} />
              <ReportFilter label="Sales staff" options={filterOptions.salesStaff} />
              <ReportFilter label="Designer" options={filterOptions.designers} />
              <ReportFilter label="Production status" options={filterOptions.productionStatuses} />
            </section>

            <section className="admin-report-tabs" aria-label="Report sections">
              {reportTabs.map((report) => (
                <button
                  key={report.id}
                  className={`admin-report-tab${report.id === activeReport.id ? ' admin-report-tab-active' : ''}`}
                  type="button"
                  onClick={() => setActiveReportId(report.id)}
                >
                  {report.title}
                </button>
              ))}
            </section>

            <section className="admin-report-overview">
              <div>
                <span>
                  <IconReportAnalytics size={16} />
                  Detailed analysis
                </span>
                <h3>{activeReport.title}</h3>
                <p>{activeReport.description}</p>
              </div>
              <button className="admin-report-export-link" type="button">
                <IconDownload size={16} />
                Export this report
              </button>
            </section>

            <section className="admin-report-kpi-grid" aria-label={`${activeReport.title} KPI summaries`}>
              {activeReport.kpis.map((kpi) => (
                <article key={kpi.label} className="admin-report-kpi-card">
                  <span>{kpi.label}</span>
                  <strong>{kpi.value}</strong>
                  {kpi.note ? <p>{kpi.note}</p> : null}
                </article>
              ))}
            </section>

            <section className="admin-report-chart-grid" aria-label={`${activeReport.title} charts`}>
              {activeReport.charts.map((chart) => (
                <article key={chart.title} className="admin-card admin-report-chart-card">
                  <div className="admin-report-card-title">
                    <h3>{chart.title}</h3>
                    <IconChartBar size={18} />
                  </div>
                  <ReportChartView chart={chart} />
                </article>
              ))}
            </section>

            <section className="admin-card admin-report-table-card">
              <div className="admin-report-card-title">
                <h3>{activeReport.title} List</h3>
                <span>{activeReport.rows.length} records</span>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-report-table">
                  <thead>
                    <tr>
                      {activeReport.columns.map((column) => (
                        <th key={column}>{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeReport.rows.map((row, rowIndex) => (
                      <tr key={`${activeReport.id}-${rowIndex}`}>
                        {activeReport.columns.map((column) => (
                          <td key={column}>{formatCell(row[column])}</td>
                        ))}
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

function ReportFilter({ label, options, type }: { label: string; options?: string[]; type?: 'dateRange' }) {
  if (type === 'dateRange') {
    return (
      <div className="admin-report-filter admin-report-date-filter">
        <span>{label}</span>
        <div>
          <input aria-label="Report start date" defaultValue="2026-01-01" type="date" />
          <input aria-label="Report end date" defaultValue="2026-06-30" type="date" />
        </div>
      </div>
    );
  }

  return (
    <label className="admin-report-filter">
      <span>{label}</span>
      <div>
        <select defaultValue={options?.[0]}>
          {options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <IconChevronDown size={16} />
      </div>
    </label>
  );
}

function ReportChartView({ chart }: { chart: ReportChart }) {
  if (chart.type === 'donut') {
    return <DonutChart data={chart.data} />;
  }

  if (chart.type === 'line') {
    return <LineChart chart={chart} />;
  }

  return <BarChart data={chart.data} />;
}

function BarChart({ data }: { data: ChartDatum[] }) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="admin-report-bar-chart">
      {data.map((item) => (
        <div key={item.label} className="admin-report-bar-row">
          <span>{item.label}</span>
          <div>
            <i style={{ width: `${Math.max((item.value / maxValue) * 100, 6)}%` }} />
          </div>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ data }: { data: ChartDatum[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="admin-report-donut-layout">
      <div className="admin-report-donut" aria-label={`Total ${total}`}>
        <strong>{total}</strong>
        <span>Total</span>
      </div>
      <div className="admin-report-legend">
        {data.map((item, index) => (
          <div key={item.label}>
            <i className={`admin-report-legend-dot admin-report-legend-dot-${index % 6}`} />
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function LineChart({ chart }: { chart: ReportChart }) {
  const allValues = chart.data.flatMap((item) => [item.value, item.secondaryValue ?? 0]);
  const maxValue = Math.max(...allValues, 1);
  const primaryPoints = chart.data.map((item, index) => `${(index / (chart.data.length - 1)) * 100},${100 - (item.value / maxValue) * 82}`);
  const secondaryPoints = chart.data.map((item, index) => `${(index / (chart.data.length - 1)) * 100},${100 - ((item.secondaryValue ?? 0) / maxValue) * 82}`);

  return (
    <div className="admin-report-line-chart">
      <div className="admin-report-line-legend">
        <span><i />{chart.valueLabel ?? 'Primary'}</span>
        <span><i />{chart.secondaryValueLabel ?? 'Secondary'}</span>
      </div>
      <svg viewBox="0 0 100 112" preserveAspectRatio="none" role="img" aria-label={chart.title}>
        <polyline points={primaryPoints.join(' ')} />
        <polyline points={secondaryPoints.join(' ')} />
      </svg>
      <div className="admin-report-line-axis">
        {chart.data.map((item) => (
          <span key={item.label}>{item.label}</span>
        ))}
      </div>
    </div>
  );
}

function formatCell(value: string | number | undefined) {
  return value ?? '-';
}

export default AdminReports;
