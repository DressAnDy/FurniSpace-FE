import axios, { AxiosError } from 'axios';

import { shouldRedirectUnauthorized } from '@/shared/config/authPreview';
import { getStoredAccessToken } from './tokenStore';

const projectReviewApiClient = axios.create({
  baseURL: getProjectReviewApiBaseUrl(),
  withCredentials: true,
});

projectReviewApiClient.interceptors.request.use((config) => {
  const token = getStoredAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

projectReviewApiClient.interceptors.response.use(
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
  message?: string | null;
  data: T;
  errors?: string[] | null;
  errorCode?: string | null;
};

export type ProjectReviewDto = {
  reviewId: string;
  projectId: string;
  orderId: string | null;
  customerId: string;
  rating: number;
  designQualityRating: number;
  serviceQualityRating: number;
  deliveryRating: number;
  comment: string | null;
  allowPublicDisplay: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateProjectReviewInput = {
  rating: number;
  designQualityRating: number;
  serviceQualityRating: number;
  deliveryRating: number;
  comment?: string | null;
};

export function getProjectReviewServiceResultMessage(error: unknown) {
  const result = getProjectReviewServiceResultFromError(error);
  if (!result) return 'Cannot connect to project review API.';
  if (result.errors?.length) return result.errors.join('\n');
  return result.message || 'Request failed.';
}

export function getProjectReviewServiceResultFromError(error: unknown) {
  if (!(error instanceof AxiosError)) return null;
  const data = error.response?.data;
  if (data && typeof data === 'object' && 'status' in data) {
    return data as ServiceResult<unknown>;
  }
  return null;
}

export async function getProjectReview(projectId: string) {
  try {
    const response = await projectReviewApiClient.get<ServiceResult<ProjectReviewDto>>(
      `/projects/${projectId}/review`,
    );
    return response.data.data;
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function createProjectReview(projectId: string, input: CreateProjectReviewInput) {
  const response = await projectReviewApiClient.post<ServiceResult<ProjectReviewDto>>(
    `/projects/${projectId}/review`,
    {
      rating: input.rating,
      designQualityRating: input.designQualityRating,
      serviceQualityRating: input.serviceQualityRating,
      deliveryRating: input.deliveryRating,
      comment: input.comment?.trim() || null,
    },
  );
  return response.data.data;
}

function getProjectReviewApiBaseUrl() {
  const configuredApiUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;
  return configuredApiUrl?.replace(/\/api\/?$/, '');
}
