import axios, { AxiosError } from 'axios';
import axiosRetry from 'axios-retry';

import { notifyError } from '@/shared/lib/toast';

import { removeLegacyAccessToken } from './tokenStore';

removeLegacyAccessToken();

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;

    if (status === 401 && window.location.pathname !== '/login') {
      window.location.assign('/login');
    }

    if (status === 500) {
      notifyError('Something went wrong. Please try again later.');
    }

    return Promise.reject(error);
  },
);

axiosRetry(apiClient, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) =>
    axiosRetry.isNetworkOrIdempotentRequestError(error) ||
    error.response?.status === 429,
});
