export type DashboardKpiMock = {
  comparison: string;
  label: 'Active Order Value' | 'Amount Collected' | 'Outstanding Amount';
  note: string;
  path: string;
  trend: 'up' | 'down' | 'flat';
  value: string;
  warning: string;
};

export type MonthlyRequestDatum = {
  month: string;
  previous: number;
  requests: number;
};

export type CommercialTrendDatum = {
  collected: number;
  month: string;
  orderValue: number;
  outstanding: number;
};

export type RevenuePeriodDatum = {
  completedOrders: number;
  label: string;
  profit: number;
  retail: number;
  wholesale: number;
};

export type PaymentHealthItem = {
  label: string;
  path: string;
  progress: number;
  tone: 'critical' | 'warning' | 'success' | 'neutral';
  value: string;
};

export type BottleneckItem = {
  action: string;
  count: number;
  issue: string;
  module: string;
  oldest: string;
  path: string;
  role: string;
};

export type RoleWorkload = {
  label: 'Sales' | 'Designer' | 'Production';
  metrics: Array<{ label: string; value: string }>;
  path: string;
  utilization: number;
};

export type ActivityItem = {
  entity: string;
  event: string;
  module: string;
  path: string;
  status: 'Critical' | 'Warning' | 'Done' | 'Info';
  time: string;
};

export type AssetUploadItem = {
  fileName: string;
  product: string;
  status: 'Ready' | 'Missing preview' | 'Needs model';
  uploadedAt: string;
  uploadedBy: string;
};

// Mocked until Admin operational dashboard aggregate endpoints are available.
export const dashboardKpiMocks: DashboardKpiMock[] = [
  { comparison: '+8.4%', label: 'Active Order Value', note: 'Operational order value, not profit', path: '/admin/reports', trend: 'up', value: '$118.2k', warning: '$14.7k due soon' },
  { comparison: '+12.1%', label: 'Amount Collected', note: 'Verified start fee, deposit, remaining payment', path: '/admin/reports', trend: 'up', value: '$72.6k', warning: '3 failed transactions' },
  { comparison: '-4.2%', label: 'Outstanding Amount', note: 'Pending payment actions', path: '/admin/reports', trend: 'down', value: '$45.6k', warning: '5 remaining payments' },
];

export const monthlyProjectRequests: MonthlyRequestDatum[] = [
  { month: 'Mar', previous: 14, requests: 18 },
  { month: 'Apr', previous: 18, requests: 21 },
  { month: 'May', previous: 16, requests: 24 },
  { month: 'Jun', previous: 20, requests: 28 },
  { month: 'Jul', previous: 23, requests: 31 },
  { month: 'Aug', previous: 19, requests: 26 },
];

export const commercialTrend: CommercialTrendDatum[] = [
  { collected: 34, month: 'Mar', orderValue: 58, outstanding: 24 },
  { collected: 41, month: 'Apr', orderValue: 66, outstanding: 25 },
  { collected: 48, month: 'May', orderValue: 78, outstanding: 30 },
  { collected: 57, month: 'Jun', orderValue: 92, outstanding: 35 },
  { collected: 68, month: 'Jul', orderValue: 108, outstanding: 40 },
  { collected: 73, month: 'Aug', orderValue: 118, outstanding: 46 },
];

/** Revenue figures are stored in triệu VNĐ (1 unit = 1,000,000 VND). */
export const monthlyRevenue: RevenuePeriodDatum[] = [
  { label: 'Mar', wholesale: 38, retail: 24, completedOrders: 16, profit: 18 },
  { label: 'Apr', wholesale: 44, retail: 27, completedOrders: 19, profit: 21 },
  { label: 'May', wholesale: 51, retail: 31, completedOrders: 22, profit: 25 },
  { label: 'Jun', wholesale: 58, retail: 36, completedOrders: 26, profit: 29 },
  { label: 'Jul', wholesale: 64, retail: 41, completedOrders: 30, profit: 33 },
  { label: 'Aug', wholesale: 72, retail: 45, completedOrders: 34, profit: 38 },
];

export const paymentHealth: PaymentHealthItem[] = [
  { label: 'Start Fee pending', path: '/admin/reports', progress: 24, tone: 'warning', value: '$2.1k' },
  { label: 'Deposit pending', path: '/admin/reports', progress: 39, tone: 'warning', value: '$18.4k' },
  { label: 'Remaining Payment pending', path: '/admin/reports', progress: 61, tone: 'critical', value: '$45.6k' },
  { label: 'Failed transactions', path: '/admin/reports', progress: 14, tone: 'critical', value: '3' },
  { label: 'Orders ready for completion', path: '/admin/reports', progress: 35, tone: 'success', value: '7' },
];

export const bottlenecks: BottleneckItem[] = [
  { action: 'View queue', count: 7, issue: 'Project Requests waiting too long', module: 'Projects', oldest: '22h', path: '/admin/projects', role: 'Sales' },
  { action: 'Assign designer', count: 4, issue: 'Waiting for Designer Assignment', module: 'Projects', oldest: '18h', path: '/admin/projects', role: 'Sales Manager' },
  { action: 'Review revisions', count: 6, issue: 'Proposal revision pending', module: 'Proposal', oldest: '3d', path: '/admin/reports', role: 'Designer' },
  { action: 'Review quotation', count: 5, issue: 'Quotation expiring or missing', module: 'Quotation', oldest: '2d', path: '/admin/reports', role: 'Sales' },
  { action: 'Resolve blocker', count: 7, issue: 'Blocked Production Item', module: 'Production', oldest: '4d', path: '/admin/reports', role: 'Production' },
  { action: 'Check delivery', count: 9, issue: 'Delivery confirmation pending', module: 'Delivery', oldest: '2d', path: '/admin/reports', role: 'Sales / Customer' },
];

export const roleWorkload: RoleWorkload[] = [
  {
    label: 'Sales',
    metrics: [
      { label: 'Active Projects', value: '46' },
      { label: 'Pending Requests', value: '7' },
      { label: 'Pending Quotations', value: '14' },
      { label: 'At-risk Projects', value: '9' },
    ],
    path: '/admin/projects',
    utilization: 82,
  },
  {
    label: 'Designer',
    metrics: [
      { label: 'Assigned Projects', value: '24' },
      { label: 'Draft Proposals', value: '10' },
      { label: 'Revision Requests', value: '6' },
      { label: 'Overdue Design Work', value: '5' },
    ],
    path: '/admin/reports',
    utilization: 74,
  },
  {
    label: 'Production',
    metrics: [
      { label: 'Active Requests', value: '18' },
      { label: 'Active Items', value: '42' },
      { label: 'Blocked Items', value: '7' },
      { label: 'Due Work', value: '14' },
    ],
    path: '/admin/reports',
    utilization: 88,
  },
];

export const recentActivities: ActivityItem[] = [
  { entity: 'PRJ-2026-184', event: 'Start Fee paid, designer assignment pending', module: 'Project', path: '/admin/projects', status: 'Critical', time: '18m ago' },
  { entity: 'QT-8291', event: 'Quotation accepted by customer', module: 'Quotation', path: '/admin/reports', status: 'Done', time: '1h ago' },
  { entity: 'PROD-2026-080', event: 'Production item blocked by material issue', module: 'Production', path: '/admin/reports', status: 'Warning', time: '2h ago' },
  { entity: 'ORD-2026-112', event: 'Delivery completed, remaining payment pending', module: 'Payment', path: '/admin/reports', status: 'Info', time: 'Yesterday' },
  { entity: 'PV-4472', event: 'Product version missing preview flagged', module: 'Catalog', path: '/admin/products', status: 'Warning', time: 'Yesterday' },
];

export const latestAssetUploads: AssetUploadItem[] = [
  { fileName: 'oak-counter.glb', product: 'Custom Oak Counter', status: 'Ready', uploadedAt: 'Today 10:12', uploadedBy: 'Admin' },
  { fileName: 'round-sofa-v3.glb', product: 'Round Modular Sofa', status: 'Missing preview', uploadedAt: 'Yesterday', uploadedBy: 'Designer' },
  { fileName: 'reception-desk-preview.jpg', product: 'Reception Desk', status: 'Needs model', uploadedAt: 'Aug 5', uploadedBy: 'Admin' },
];
