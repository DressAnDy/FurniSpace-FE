import { AxiosError } from 'axios';
import axios from 'axios';

import type { AuthTokenData, CurrentUserData, RegisterData, ServiceResult } from './types';
import { getStoredAccessToken, removeStoredAccessToken, storeAccessToken } from './tokenStore';

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

authApiClient.interceptors.request.use((config) => {
  const token = getStoredAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
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

  storeAccessTokenFromAuthResponse(response.data, response.headers.authorization);

  return response.data;
}

export async function login(input: LoginInput) {
  const response = await authApiClient.post<ServiceResult<AuthTokenData>>('/auth/login', {
    email: normalizeEmail(input.email),
    password: input.password,
  });

  storeAccessTokenFromAuthResponse(response.data, response.headers.authorization);

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

function storeAccessTokenFromAuthResponse(responseData: unknown, authorizationHeader?: string) {
  const token = getTokenFromUnknown(responseData) ?? getTokenFromAuthorizationHeader(authorizationHeader);

  if (token) {
    storeAccessToken(token);
  }
}

function getTokenFromUnknown(value: unknown): string | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const token =
    getStringValue(record.access_token) ??
    getStringValue(record.accessToken) ??
    getStringValue(record.token) ??
    getStringValue(record.jwt);

  if (token) {
    return token;
  }

  return getTokenFromUnknown(record.data);
}

function getStringValue(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function getTokenFromAuthorizationHeader(value?: string) {
  if (!value) {
    return null;
  }

  return value.replace(/^Bearer\s+/i, '').trim() || null;
}

function getAuthApiBaseUrl() {
  const explicitAuthUrl = import.meta.env.VITE_AUTH_API_URL;
  const fallbackApiUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;

  if (explicitAuthUrl) {
    return explicitAuthUrl;
  }

  return fallbackApiUrl?.replace(/\/api\/?$/, '');
}
