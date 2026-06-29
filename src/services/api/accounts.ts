import axios, { AxiosError } from 'axios';

import { shouldRedirectUnauthorized } from '@/shared/config/authPreview';

const accountApiClient = axios.create({
  baseURL: getAccountApiBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
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

export type AvailableDesignerDto = Omit<AccountDto, 'roleId' | 'deletedAt'> & {
  currentActiveProjectCount: number;
  maxActiveProjects: number;
  availableSlot: number;
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

export type CreateAccountInput = {
  roleId: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  status?: AccountStatus | null;
};

export type UpdateAccountInput = Omit<CreateAccountInput, 'passwordHash'> & {
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
      pageSize: params.pageSize ?? 10,
      search: params.search?.trim() || undefined,
    },
  });

  return response.data.data;
}

export async function createAccount(input: CreateAccountInput) {
  const response = await accountApiClient.post<ServiceResult<AccountDto>>('/api/Accounts', {
    roleId: input.roleId,
    email: normalizeAccountEmail(input.email),
    passwordHash: input.passwordHash.trim(),
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
