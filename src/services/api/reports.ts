import axios, { AxiosError } from 'axios';

import { shouldRedirectUnauthorized } from '@/shared/config/authPreview';
import { getStoredAccessToken } from './tokenStore';

const reportApiClient = axios.create({
  baseURL: getReportApiBaseUrl(),
  withCredentials: true,
});

reportApiClient.interceptors.request.use((config) => {
  const token = getStoredAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

reportApiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && shouldRedirectUnauthorized()) {
      window.location.assign('/login');
    }

    return Promise.reject(error);
  },
);

export type ServiceResult<T> = {
  status: number;
  message?: string;
  data: T;
  errors?: string[] | null;
  errorCode?: string | null;
};

export type ReportFacetItem = {
  key: string;
  count: number;
  label?: string | null;
};

export type ReportNamedCountItem = {
  id: string;
  name: string;
  code?: string | null;
  count: number;
};

export type ReportPaymentTypeFacet = {
  type: string;
  count: number;
  amount: number;
};

export type ProjectBucketCounts = {
  intake: number;
  commercial: number;
  designMonitor: number;
  fulfillment: number;
  terminal: number;
  other: number;
};

export type ReportDateRangeParams = {
  from?: string | null;
  to?: string | null;
};

export type ReportExportDomain =
  | 'overview'
  | 'business'
  | 'projects'
  | 'commercial'
  | 'production'
  | 'delivery'
  | 'catalog';

export type ReportOverviewDto = {
  business: {
    totalActiveAccounts: number;
    designerAvailableCount: number;
    designerFullCount: number;
    designerOverCount: number;
    salesAvailableNowCount: number;
    salesFullNowCount: number;
    salesOverNowCount: number;
    salesHighFuturePressureCount: number;
    unassignedIntakeCount: number;
  };
  projects: {
    totalNonTerminal: number;
    byBucket: ProjectBucketCounts;
    completedInRange: number;
    rejectedInRange: number;
  };
  commercial: {
    quotationsSentInRange: number;
    quotationsAcceptedInRange: number;
    ordersOpen: number;
    gmvInRange: number;
    collectedInRange: number;
    outstandingAmount: number;
  };
  production: {
    requestsOpen: number;
    blockedCount: number;
    overdueCount: number;
  };
  delivery: {
    readyForDelivery: number;
    delivering: number;
    deliveredInRange: number;
    upcomingSchedules: number;
  };
  catalog: {
    activeProducts: number;
    productsMissingActiveVersion: number;
    productsMissing3D: number;
    activeBusinessTypes: number;
  };
};

export type ReportBusinessDto = {
  accountsByRole: ReportFacetItem[];
  accountsByStatus: ReportFacetItem[];
  designer: {
    totalActiveDesigners: number;
    availableCount: number;
    fullCount: number;
    overCount: number;
    totalDesignActiveProjects: number;
    maxActiveProjects: number;
  };
  sales: {
    totalActiveSales: number;
    availableNowCount: number;
    fullNowCount: number;
    overNowCount: number;
    highFuturePressureCount: number;
    totalSalesActiveProjects: number;
    unassignedIntakeCount: number;
    maxActiveProjects: number;
  };
};

export type ReportProjectsDto = {
  byStatus: ReportFacetItem[];
  byBucket: ProjectBucketCounts;
  unassignedIntakeCount: number;
  waitingForDesignerCount: number;
  completedInRange: number;
  rejectedInRange: number;
  totalNonTerminal: number;
  aging: {
    over7Days: number;
    over14Days: number;
    over30Days: number;
  };
};

export type ReportCommercialDto = {
  quotations: {
    byStatus: ReportFacetItem[];
    sentInRange: number;
    acceptedInRange: number;
    revisionRequestedCount: number;
    revisedCount: number;
  };
  orders: {
    byStatus: ReportFacetItem[];
    openCount: number;
    gmvInRange: number;
    collectedTotal: number;
    outstandingAmount: number;
    createdInRange: number;
  };
  payments: {
    byStatus: ReportFacetItem[];
    byType: ReportPaymentTypeFacet[];
    paidAmountInRange: number;
    expiredCount: number;
    cancelledCount: number;
  };
  conversion: {
    projectsInCommercialBucket: number;
    ordersCreatedInRange: number;
    depositsPaidInRange: number;
  };
};

export type ReportProductionDto = {
  requestsByStatus: ReportFacetItem[];
  itemsByStatus: ReportFacetItem[];
  openRequestCount: number;
  blockedCount: number;
  pendingReviewCount: number;
  unassignedCount: number;
  overdueCount: number;
  createdInRange: number;
  completedInRange: number;
  topAssignees: Array<{
    accountId: string;
    fullName: string;
    openCount: number;
    overdueCount: number;
  }>;
};

export type ReportDeliveryDto = {
  projects: {
    readyForDelivery: number;
    delivering: number;
    deliveredInRange: number;
  };
  orders: {
    deliveryRelatedByStatus: ReportFacetItem[];
    customerConfirmedInRange: number;
  };
  orderItems: {
    partialDeliveryCount: number;
  };
  schedules: {
    upcomingDeliveryOrHandover: number;
    overdueDeliveryOrHandover: number;
  };
};

export type ReportCatalogDto = {
  productsByStatus: ReportFacetItem[];
  categoriesByStatus: ReportFacetItem[];
  businessTypesByStatus: ReportFacetItem[];
  versionsByStatus: ReportFacetItem[];
  productsMissingActiveVersion: number;
  productsMissing3D: number;
  productsByCategory: ReportNamedCountItem[];
  productsByBusinessType: ReportNamedCountItem[];
};

export type ProjectAgingBucket = 'INTAKE' | 'COMMERCIAL' | 'DESIGN_MONITOR' | 'FULFILLMENT';
export type ProjectAgingReason = 'UNASSIGNED_INTAKE' | 'WAITING_DESIGNER' | 'STUCK';
export type ProjectAgingSortBy = 'AgeDaysDesc' | 'SubmittedAtAsc';

export type ProjectAgingItemDto = {
  projectId: string;
  projectCode: string;
  projectName: string;
  status: string;
  bucket: string;
  reason: ProjectAgingReason | string;
  submittedAt: string | null;
  ageDays: number;
  customerId: string;
  customerName: string | null;
  assignedSalesId: string | null;
  salesName: string | null;
  assignedDesignerId: string | null;
  designerName: string | null;
};

export type ProjectAgingListData = {
  items: ProjectAgingItemDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type ProjectAgingParams = {
  thresholdDays?: number;
  bucket?: ProjectAgingBucket | null;
  reason?: ProjectAgingReason | null;
  page?: number;
  pageSize?: number;
  sortBy?: ProjectAgingSortBy | null;
};

export type CommercialTrendGranularity = 'day' | 'week';

export type CommercialTrendPointDto = {
  periodStart: string;
  periodEnd: string;
  quotationsSent: number;
  quotationsAccepted: number;
  ordersCreated: number;
  gmv: number;
  collected: number;
};

export type CommercialTrendDto = {
  granularity: CommercialTrendGranularity;
  from: string;
  to: string;
  points: CommercialTrendPointDto[];
  totals: {
    quotationsSent: number;
    quotationsAccepted: number;
    ordersCreated: number;
    gmv: number;
    collected: number;
  };
};

export type CommercialTrendParams = {
  from: string;
  to: string;
  granularity?: CommercialTrendGranularity;
};

export type DeliveryReviewItemDto = {
  projectId: string;
  projectCode: string;
  overallRating: number;
  deliveryRating: number;
  comment: string | null;
  createdAt: string;
};

export type DeliveryReviewsDto = {
  summary: {
    reviewCount: number;
    averageOverallRating: number;
    averageDeliveryRating: number;
  };
  items: DeliveryReviewItemDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type DeliveryReviewsParams = ReportDateRangeParams & {
  page?: number;
  pageSize?: number;
};

export type CatalogBestsellerMetric = 'quantity' | 'revenue';

export type CatalogBestsellerItemDto = {
  productId: string;
  productName: string;
  productVersionId: string;
  sku: string | null;
  quantitySold: number;
  revenue: number;
};

export type CatalogBestsellersDto = {
  metric: CatalogBestsellerMetric;
  from: string;
  to: string;
  items: CatalogBestsellerItemDto[];
};

export type CatalogBestsellersParams = {
  from: string;
  to: string;
  metric?: CatalogBestsellerMetric;
  limit?: number;
};

export type ReportExportParams = ReportDateRangeParams & {
  domain: ReportExportDomain;
  format?: 'csv';
};

export function getReportServiceResultMessage(error: unknown) {
  const result = getReportServiceResultFromError(error);

  if (!result) {
    return 'Cannot connect to report API. Please check backend and VITE_API_URL.';
  }

  if (Array.isArray(result.errors) && result.errors.length > 0) {
    return result.errors.join('\n');
  }

  return result.message || 'Request failed. Please try again.';
}

export function getReportServiceResultFromError(error: unknown) {
  if (!(error instanceof AxiosError)) {
    return null;
  }

  const data = error.response?.data;

  if (data && typeof data === 'object' && 'status' in data) {
    return data as ServiceResult<unknown>;
  }

  return null;
}

export async function getReportOverview(params: ReportDateRangeParams = {}) {
  const response = await reportApiClient.get<ServiceResult<ReportOverviewDto>>('/admin/reports/overview', {
    params: cleanDateParams(params),
  });

  return response.data.data;
}

export async function getReportBusiness() {
  const response = await reportApiClient.get<ServiceResult<ReportBusinessDto>>('/admin/reports/business');

  return response.data.data;
}

export async function getReportProjects(params: ReportDateRangeParams = {}) {
  const response = await reportApiClient.get<ServiceResult<ReportProjectsDto>>('/admin/reports/projects', {
    params: cleanDateParams(params),
  });

  return response.data.data;
}

export async function getReportCommercial(params: ReportDateRangeParams = {}) {
  const response = await reportApiClient.get<ServiceResult<ReportCommercialDto>>('/admin/reports/commercial', {
    params: cleanDateParams(params),
  });

  return response.data.data;
}

export async function getReportProduction(params: ReportDateRangeParams = {}) {
  const response = await reportApiClient.get<ServiceResult<ReportProductionDto>>('/admin/reports/production', {
    params: cleanDateParams(params),
  });

  return response.data.data;
}

export async function getReportDelivery(params: ReportDateRangeParams = {}) {
  const response = await reportApiClient.get<ServiceResult<ReportDeliveryDto>>('/admin/reports/delivery', {
    params: cleanDateParams(params),
  });

  return response.data.data;
}

export async function getReportCatalog() {
  const response = await reportApiClient.get<ServiceResult<ReportCatalogDto>>('/admin/reports/catalog');

  return response.data.data;
}

export async function getProjectAgingReport(params: ProjectAgingParams = {}) {
  const response = await reportApiClient.get<ServiceResult<ProjectAgingListData>>('/admin/reports/projects/aging', {
    params: {
      thresholdDays: params.thresholdDays ?? 7,
      bucket: params.bucket ?? undefined,
      reason: params.reason ?? undefined,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
      sortBy: params.sortBy ?? undefined,
    },
  });

  return response.data.data;
}

export async function getCommercialTrend(params: CommercialTrendParams) {
  const response = await reportApiClient.get<ServiceResult<CommercialTrendDto>>('/admin/reports/commercial/trend', {
    params: {
      from: params.from,
      to: params.to,
      granularity: params.granularity ?? 'day',
    },
  });

  return response.data.data;
}

export async function getDeliveryReviews(params: DeliveryReviewsParams = {}) {
  const response = await reportApiClient.get<ServiceResult<DeliveryReviewsDto>>('/admin/reports/delivery/reviews', {
    params: {
      ...cleanDateParams(params),
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
    },
  });

  return response.data.data;
}

export async function getCatalogBestsellers(params: CatalogBestsellersParams) {
  const response = await reportApiClient.get<ServiceResult<CatalogBestsellersDto>>('/admin/reports/catalog/bestsellers', {
    params: {
      from: params.from,
      to: params.to,
      metric: params.metric ?? 'quantity',
      limit: params.limit ?? 20,
    },
  });

  return response.data.data;
}

export async function exportReportCsv(params: ReportExportParams) {
  try {
    const response = await reportApiClient.get<Blob>('/admin/reports/export', {
      params: {
        domain: params.domain,
        format: params.format ?? 'csv',
        ...cleanDateParams(params),
      },
      responseType: 'blob',
    });

    const contentType = String(response.headers['content-type'] ?? '');
    if (contentType.includes('application/json')) {
      const text = await response.data.text();
      const parsed = JSON.parse(text) as ServiceResult<unknown>;
      throw Object.assign(new Error(parsed.message || 'Export failed.'), { response: { data: parsed, status: parsed.status } });
    }

    const disposition = String(response.headers['content-disposition'] ?? '');
    const match = /filename="?([^"]+)"?/i.exec(disposition);
    const filename = match?.[1] ?? `report-${params.domain}-${formatExportDateStamp()}.csv`;

    const rawText = await response.data.text();
    const tabularCsv = normalizeReportExportCsv(rawText, {
      domain: params.domain,
      from: params.from,
      to: params.to,
    });

    // UTF-8 BOM helps Excel open Vietnamese characters correctly.
    const blob = new Blob([`\uFEFF${tabularCsv}`], { type: 'text/csv;charset=utf-8;' });

    return { blob, filename };
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const parsed = JSON.parse(text) as ServiceResult<unknown>;
        throw Object.assign(new AxiosError(parsed.message || 'Export failed.', error.code, error.config, error.request, {
          ...error.response,
          data: parsed,
        }), { response: { ...error.response, data: parsed } });
      } catch (parseError) {
        if (parseError instanceof AxiosError) {
          throw parseError;
        }
      }
    }

    throw error;
  }
}

/**
 * BE currently returns a dump CSV with columns:
 * domain,exportedAtUtc,payloadJson
 * where payloadJson is the whole report DTO as escaped JSON.
 * Flatten that into spreadsheet-friendly rows for Excel.
 */
export function normalizeReportExportCsv(
  rawCsv: string,
  meta: { domain: ReportExportDomain; from?: string | null; to?: string | null },
) {
  const dump = parseReportExportDump(rawCsv);

  if (!dump) {
    return rawCsv.replace(/^\uFEFF/, '');
  }

  const rows: string[][] = [
    ['Domain', dump.domain || meta.domain],
    ['Exported At (UTC)', dump.exportedAtUtc || ''],
    ['From', meta.from || ''],
    ['To', meta.to || ''],
    [],
    ['Section', 'Field', 'Key', 'Label', 'Count', 'Amount', 'Value'],
  ];

  flattenReportPayload(dump.payload, '', rows);

  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}

function parseReportExportDump(rawCsv: string) {
  const text = rawCsv.replace(/^\uFEFF/, '').trim();
  if (!text) return null;

  const lines = splitCsvLines(text);
  if (lines.length < 2) return null;

  const header = parseCsvLine(lines[0]).map((cell) => cell.trim().toLowerCase());
  const domainIdx = header.indexOf('domain');
  const exportedIdx = header.indexOf('exportedatutc');
  const payloadIdx = header.indexOf('payloadjson');

  if (domainIdx < 0 || payloadIdx < 0) {
    return null;
  }

  const dataRow = parseCsvLine(lines[1]);
  const payloadRaw = dataRow[payloadIdx] ?? '';

  try {
    const payload = JSON.parse(payloadRaw) as unknown;
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    return {
      domain: dataRow[domainIdx] ?? '',
      exportedAtUtc: exportedIdx >= 0 ? dataRow[exportedIdx] ?? '' : '',
      payload,
    };
  } catch {
    return null;
  }
}

function flattenReportPayload(value: unknown, path: string, rows: string[][]) {
  if (value == null) {
    return;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      rows.push([sectionOf(path), fieldOf(path), '', '', '0', '', '']);
      return;
    }

    value.forEach((item, index) => {
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        const key = String(record.key ?? record.type ?? record.id ?? record.code ?? index);
        const label = record.label ?? record.name ?? '';
        const count = record.count ?? record.openCount;
        const amount = record.amount ?? record.revenue;
        const hasFacetShape = 'count' in record || 'amount' in record || 'type' in record || 'key' in record;

        if (hasFacetShape) {
          rows.push([
            sectionOf(path),
            fieldOf(path),
            key,
            label == null ? '' : String(label),
            count == null ? '' : String(count),
            amount == null ? '' : String(amount),
            '',
          ]);

          // Keep extra fields from nested assignee-like rows.
          for (const [extraKey, extraValue] of Object.entries(record)) {
            if (['key', 'type', 'id', 'code', 'label', 'name', 'count', 'openCount', 'amount', 'revenue'].includes(extraKey)) {
              continue;
            }
            if (extraValue == null || typeof extraValue === 'object') continue;
            rows.push([
              sectionOf(path),
              `${fieldOf(path)}.${extraKey}`,
              key,
              label == null ? '' : String(label),
              '',
              '',
              String(extraValue),
            ]);
          }
          return;
        }
      }

      flattenReportPayload(item, path ? `${path}[${index}]` : `[${index}]`, rows);
    });
    return;
  }

  if (typeof value === 'object') {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      const nextPath = path ? `${path}.${key}` : key;
      flattenReportPayload(nested, nextPath, rows);
    }
    return;
  }

  rows.push([sectionOf(path), fieldOf(path), '', '', '', '', String(value)]);
}

function sectionOf(path: string) {
  if (!path) return 'root';
  return path.split('.')[0] ?? 'root';
}

function fieldOf(path: string) {
  if (!path) return '';
  const parts = path.split('.');
  return parts.length <= 1 ? parts[0] ?? '' : parts.slice(1).join('.');
}

function splitCsvLines(text: string) {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
      continue;
    }

    if (!inQuotes && (char === '\n' || (char === '\r' && next === '\n'))) {
      lines.push(current);
      current = '';
      if (char === '\r' && next === '\n') i += 1;
      continue;
    }

    if (!inQuotes && char === '\r') {
      lines.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  if (current.length > 0) {
    lines.push(current);
  }

  return lines;
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

function escapeCsvCell(value: string) {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function cleanDateParams(params: ReportDateRangeParams) {
  return {
    from: params.from?.trim() || undefined,
    to: params.to?.trim() || undefined,
  };
}

function formatExportDateStamp() {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

function getReportApiBaseUrl() {
  const configuredApiUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;

  return configuredApiUrl?.replace(/\/api\/?$/, '');
}
