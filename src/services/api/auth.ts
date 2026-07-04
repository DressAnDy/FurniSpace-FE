import { AxiosError } from 'axios';
import axios from 'axios';

import type { AuthTokenData, CurrentUserData, RegisterData, ServiceResult } from './types';
import { removeStoredAccessToken, storeAccessToken } from './tokenStore';

export const AUTH_PENDING_EMAIL_KEY = 'auth.pendingEmail';

export type RegisterInput = {
  email: string;
  password: string;
  fullName: string;
  phone?: string | null;
};

export type VerifyEmailInput = {
  email: string;
  otpCode: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

const authApiClient = axios.create({
  baseURL: getAuthApiBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string) {
  const value = phone.trim();

  return value.length > 0 ? value : null;
}

export function getServiceResultMessage(error: unknown) {
  const result = getServiceResultFromError(error);

  if (!result) {
    return 'Không thể kết nối đến hệ thống. Vui lòng thử lại sau.';
  }

  if (result.errors?.length) {
    return result.errors.join('\n');
  }

  return result.message || 'Yêu cầu không thành công. Vui lòng thử lại.';
}

export async function register(input: RegisterInput) {
  const response = await authApiClient.post<ServiceResult<RegisterData>>('/auth/register', {
    email: normalizeEmail(input.email),
    password: input.password,
    fullName: input.fullName.trim(),
    phone: input.phone ? normalizePhone(input.phone) : null,
  });

  return response.data;
}

export async function verifyEmail(input: VerifyEmailInput) {
  const response = await authApiClient.post<ServiceResult<AuthTokenData>>('/auth/verify-email', {
    email: normalizeEmail(input.email),
    otpCode: input.otpCode.trim(),
  });

  if (response.data.data?.access_token) {
    storeAccessToken(response.data.data.access_token);
  }

  return response.data;
}

export async function login(input: LoginInput) {
  const response = await authApiClient.post<ServiceResult<AuthTokenData>>('/auth/login', {
    email: normalizeEmail(input.email),
    password: input.password,
  });

  if (response.data.data?.access_token) {
    storeAccessToken(response.data.data.access_token);
  }

  return response.data;
}

export async function getCurrentUser() {
  const response = await authApiClient.get<ServiceResult<CurrentUserData>>('/auth/me');

  return response.data;
}

export async function logout() {
  const response = await authApiClient.post<ServiceResult<null>>('/auth/logout', {});

  removeStoredAccessToken();

  return response.data;
}

function getServiceResultFromError(error: unknown) {
  if (!(error instanceof AxiosError)) {
    return null;
  }

  return error.response?.data as ServiceResult<unknown> | undefined;
}

function getAuthApiBaseUrl() {
  const explicitAuthUrl = import.meta.env.VITE_AUTH_API_URL;
  const fallbackApiUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;

  if (explicitAuthUrl) {
    return explicitAuthUrl;
  }

  return fallbackApiUrl?.replace(/\/api\/?$/, '');
}
