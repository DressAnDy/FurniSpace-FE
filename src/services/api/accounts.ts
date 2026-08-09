import axios, { AxiosError } from 'axios';

import { shouldRedirectUnauthorized } from '@/shared/config/authPreview';
import { getStoredAccessToken } from './tokenStore';

const accountApiClient = axios.create({
  baseURL: getAccountApiBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

accountApiClient.interceptors.request.use((config) => {
  const token = getStoredAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

accountApiClient.interceptors.response.use(
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
  errors?: string[];
};

export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type AccountRoleName = 'ADMIN' | 'SALES' | 'DESIGNER' | 'CUSTOMER';

export const ACCOUNT_ROLE_OPTIONS: Array<{
  roleId: string;
  roleName: AccountRoleName;
  description: string;
}> = [
  {
    roleId: '11111111-1111-1111-1111-111111111111',
    roleName: 'ADMIN',
    description: 'System administrator',
  },
  {
    roleId: '22222222-2222-2222-2222-222222222222',
    roleName: 'SALES',
    description: 'Sales consultant',
  },
  {
    roleId: '33333333-3333-3333-3333-333333333333',
    roleName: 'DESIGNER',
    description: 'Interior designer',
  },
  {
    roleId: '44444444-4444-4444-4444-444444444444',
    roleName: 'CUSTOMER',
    description: 'Customer account',
  },
];

export const ACCOUNT_STATUS_OPTIONS: AccountStatus[] = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];

export type AccountDto = {
  accountId: string;
  roleId: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  status: AccountStatus | null;
  createdAt: string | null;
  updatedAt: string | null;
  deletedAt: string | null;
};

export type AccountRoleDto = {
  roleId: string;
  roleName: AccountRoleName | string;
  description: string | null;
};

export type AdminAccountDetailDto = Omit<AccountDto, 'roleId'> & {
  role: AccountRoleDto;
};

export type AccountListData = {
  items: AccountDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type DesignerCapacityState = 'AVAILABLE' | 'FULL' | 'OVER';
export type SalesCapacityState = 'AVAILABLE_NOW' | 'FULL_NOW' | 'OVER_NOW';
export type SalesFuturePressureState = 'LOW' | 'MEDIUM' | 'HIGH';
export type DesignerProjectBucket = 'DESIGN_ACTIVE' | 'POST_DESIGN' | 'TERMINAL' | 'OTHER';
export type SalesProjectBucket =
  | 'CURRENT_ACTIVE'
  | 'INTAKE'
  | 'COMMERCIAL'
  | 'DESIGN_MONITOR'
  | 'FULFILLMENT'
  | 'TERMINAL'
  | 'OTHER'
  | 'HIGH_PRESSURE_SOURCE';

export type AvailableDesignerDto = Omit<AccountDto, 'roleId' | 'deletedAt'> & {
  designActiveCount: number;
  lifecycleAssignedCount: number;
  currentActiveProjectCount: number;
  maxActiveProjects: number;
  availableSlot: number;
  capacityState: DesignerCapacityState;
};

export type AvailableDesignerListData = {
  items: AvailableDesignerDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type DesignerWorkloadSummaryDto = {
  totalActiveDesigners: number;
  availableCount: number;
  fullCount: number;
  overCount: number;
  totalDesignActiveProjects: number;
  maxActiveProjects: number;
};

export type DesignerAssignedProjectDto = {
  projectId: string;
  projectCode: string;
  projectName: string;
  status: string;
  designerAssignedAt: string | null;
  customerId: string;
  customerName: string | null;
  assignedSalesId: string | null;
  salesName: string | null;
  bucket: DesignerProjectBucket;
};

export type DesignerAssignedProjectListData = {
  items: DesignerAssignedProjectDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type SalesFuturePressureBreakdownDto = {
  measurementRequiredCount: number;
  spaceVerifiedCount: number;
  proposalConsultingCount: number;
  inProductionCount: number;
  productionBlockedCount: number;
  readyForDeliveryCount: number;
  deliveringCount: number;
  deliveredCount: number;
};

export type SalesWorkloadDto = Omit<AccountDto, 'roleId' | 'deletedAt'> & {
  intakeCount: number;
  commercialCount: number;
  designMonitorCount: number;
  fulfillmentCount: number;
  salesActiveCount: number;
  lifecycleAssignedCount: number;
  maxActiveProjects: number;
  availableSlot: number;
  capacityState: SalesCapacityState;
  futurePressureScore: number;
  futurePressureState: SalesFuturePressureState;
  approachingCommercialCount: number;
  productionAttentionCount: number;
  deliveryAttentionCount: number;
  futurePressureBreakdown: SalesFuturePressureBreakdownDto;
};

export type SalesWorkloadListData = {
  items: SalesWorkloadDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type SalesWorkloadSummaryDto = {
  totalActiveSales: number;
  availableNowCount: number;
  fullNowCount: number;
  overNowCount: number;
  highFuturePressureCount: number;
  totalSalesActiveProjects: number;
  unassignedIntakeCount: number;
  maxActiveProjects: number;
};

export type SalesAssignedProjectDto = {
  projectId: string;
  projectCode: string;
  projectName: string;
  status: string;
  salesAssignedAt: string | null;
  customerId: string;
  customerName: string | null;
  assignedDesignerId: string | null;
  designerName: string | null;
  bucket: SalesProjectBucket;
  pressureWeight: number;
};

export type SalesAssignedProjectListData = {
  items: SalesAssignedProjectDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type UnassignedIntakeProjectDto = {
  projectId: string;
  projectCode: string;
  projectName: string;
  businessType: string | null;
  submittedAt: string | null;
  customerId: string;
  customerName: string | null;
};

export type UnassignedIntakeListData = {
  items: UnassignedIntakeProjectDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type AccountListParams = {
  page?: number;
  pageSize?: number;
  search?: string | null;
  status?: AccountStatus | null;
  includeDeleted?: boolean;
};

export type AvailableDesignerListParams = {
  page?: number;
  pageSize?: number;
  search?: string | null;
};

export type DesignerWorkloadListParams = {
  page?: number;
  pageSize?: number;
  search?: string | null;
  capacityState?: DesignerCapacityState | null;
  sortBy?: 'DesignActiveCountDesc' | 'AvailableSlotDesc' | null;
};

export type DesignerAssignedProjectListParams = {
  designerId: string;
  page?: number;
  pageSize?: number;
  bucket?: DesignerProjectBucket | null;
};

export type SalesWorkloadListParams = {
  page?: number;
  pageSize?: number;
  search?: string | null;
  capacityState?: SalesCapacityState | null;
  futurePressureState?: SalesFuturePressureState | null;
  sortBy?: 'FuturePressureScoreDesc' | 'SalesActiveCountDesc' | 'AvailableSlotAsc' | null;
};

export type SalesAssignedProjectListParams = {
  salesId: string;
  page?: number;
  pageSize?: number;
  bucket?: SalesProjectBucket | null;
};

export type UnassignedIntakeListParams = {
  page?: number;
  pageSize?: number;
};

export type CreateAccountInput = {
  roleId: string;
  email: string;
  password: string;
  fullName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  status?: AccountStatus | null;
};

export type UpdateAccountInput = Omit<CreateAccountInput, 'password'> & {
  accountId: string;
};

export function getAccountRoleName(roleId: string | null | undefined) {
  return ACCOUNT_ROLE_OPTIONS.find((role) => role.roleId === roleId)?.roleName ?? 'UNKNOWN';
}

export function getAccountServiceResultMessage(error: unknown) {
  const result = getAccountServiceResultFromError(error);

  if (!result) {
    return 'Cannot connect to account API. Please check backend and VITE_API_URL.';
  }

  if (result.errors?.length) {
    return result.errors.join('\n');
  }

  return result.message || 'Request failed. Please try again.';
}

export function getAccountServiceResultFromError(error: unknown) {
  if (!(error instanceof AxiosError)) {
    return null;
  }

  const data = error.response?.data;

  if (data && typeof data === 'object' && 'status' in data) {
    return data as ServiceResult<unknown>;
  }

  return null;
}

export function normalizeAccountRequiredText(value: FormDataEntryValue | string | null | undefined) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeAccountOptionalText(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeAccountEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function getAccounts(params: AccountListParams = {}) {
  const response = await accountApiClient.get<ServiceResult<AccountListData>>('/api/Accounts', {
    params: {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
      search: params.search?.trim() || undefined,
      status: params.status ?? undefined,
      includeDeleted: params.includeDeleted ?? false,
    },
  });

  return response.data.data;
}

export async function getAccountById(accountId: string) {
  const response = await accountApiClient.get<ServiceResult<AccountDto>>(`/api/Accounts/${accountId}`);

  return response.data.data;
}

export async function getAdminAccountDetail(accountId: string) {
  const response = await accountApiClient.get<ServiceResult<AdminAccountDetailDto>>(`/admin/accounts/${accountId}`);

  return response.data.data;
}

export async function getAvailableDesigners(params: AvailableDesignerListParams = {}) {
  const response = await accountApiClient.get<ServiceResult<AvailableDesignerListData>>('/accounts/designers/available', {
    params: {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
      search: params.search?.trim() || undefined,
    },
  });

  return response.data.data;
}

export async function getDesignerWorkload(params: DesignerWorkloadListParams = {}) {
  const response = await accountApiClient.get<ServiceResult<AvailableDesignerListData>>('/admin/designers/workload', {
    params: {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
      search: params.search?.trim() || undefined,
      capacityState: params.capacityState ?? undefined,
      sortBy: params.sortBy ?? undefined,
    },
  });

  return response.data.data;
}

export async function getDesignerWorkloadSummary() {
  const response = await accountApiClient.get<ServiceResult<DesignerWorkloadSummaryDto>>('/admin/designers/workload/summary');

  return response.data.data;
}

export async function getDesignerAssignedProjects(params: DesignerAssignedProjectListParams) {
  const response = await accountApiClient.get<ServiceResult<DesignerAssignedProjectListData>>(
    `/admin/designers/${params.designerId}/projects`,
    {
      params: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
        bucket: params.bucket ?? undefined,
      },
    },
  );

  return response.data.data;
}

export async function getSalesWorkload(params: SalesWorkloadListParams = {}) {
  const response = await accountApiClient.get<ServiceResult<SalesWorkloadListData>>('/admin/sales/workload', {
    params: {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
      search: params.search?.trim() || undefined,
      capacityState: params.capacityState ?? undefined,
      futurePressureState: params.futurePressureState ?? undefined,
      sortBy: params.sortBy ?? undefined,
    },
  });

  return response.data.data;
}

export async function getSalesWorkloadSummary() {
  const response = await accountApiClient.get<ServiceResult<SalesWorkloadSummaryDto>>('/admin/sales/workload/summary');

  return response.data.data;
}

export async function getSalesAssignedProjects(params: SalesAssignedProjectListParams) {
  const response = await accountApiClient.get<ServiceResult<SalesAssignedProjectListData>>(
    `/admin/sales/${params.salesId}/projects`,
    {
      params: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
        bucket: params.bucket ?? undefined,
      },
    },
  );

  return response.data.data;
}

export async function getUnassignedIntakeProjects(params: UnassignedIntakeListParams = {}) {
  const response = await accountApiClient.get<ServiceResult<UnassignedIntakeListData>>('/admin/sales/unassigned-intake', {
    params: {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
    },
  });

  return response.data.data;
}

export async function createAccount(input: CreateAccountInput) {
  const response = await accountApiClient.post<ServiceResult<AccountDto>>('/api/Accounts', {
    roleId: input.roleId,
    email: normalizeAccountEmail(input.email),
    password: input.password.trim(),
    fullName: input.fullName.trim(),
    phone: input.phone?.trim() || null,
    avatarUrl: input.avatarUrl?.trim() || null,
    status: input.status ?? 'ACTIVE',
  });

  return response.data.data;
}

export async function updateAccount(input: UpdateAccountInput) {
  const response = await accountApiClient.put<ServiceResult<AccountDto>>(`/api/Accounts/${input.accountId}`, {
    roleId: input.roleId,
    email: normalizeAccountEmail(input.email),
    fullName: input.fullName.trim(),
    phone: input.phone?.trim() || null,
    avatarUrl: input.avatarUrl?.trim() || null,
    status: input.status ?? 'ACTIVE',
  });

  return response.data.data;
}

export async function deleteAccount(accountId: string) {
  const response = await accountApiClient.delete<ServiceResult<null>>(`/api/Accounts/${accountId}`);

  return response.data;
}

function getAccountApiBaseUrl() {
  const configuredApiUrl = import.meta.env.VITE_ACCOUNT_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;

  return configuredApiUrl?.replace(/\/api\/?$/, '');
}
