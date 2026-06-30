import axios, { AxiosError } from 'axios';

const categoryApiClient = axios.create({
  baseURL: getCategoryApiBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

categoryApiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      window.location.assign('/login');
    }

    return Promise.reject(error);
  },
);

type ServiceResult<T> = {
  status: number;
  message?: string;
  data: T;
  errors?: string[];
};

export type CategoryStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export type CategoryDto = {
  categoryId: string;
  categoryName: string;
  description: string | null;
  status: CategoryStatus;
};

export type CategoryListData = {
  items: CategoryDto[];
  page: number;
  limit: number;
  total: number;
};

export type CategoryListParams = {
  page?: number;
  limit?: number;
};

export type CreateCategoryInput = {
  categoryName: string;
  description?: string | null;
};

export type UpdateCategoryInput = CreateCategoryInput & {
  categoryId: string;
};

export function getCategoryServiceResultMessage(error: unknown) {
  const result = getCategoryServiceResultFromError(error);

  if (!result) {
    return 'Cannot connect to category API. Please check backend and VITE_API_URL.';
  }

  if (result.errors?.length) {
    return result.errors.join('\n');
  }

  return result.message || 'Request failed. Please try again.';
}

export function getCategoryServiceResultFromError(error: unknown) {
  if (!(error instanceof AxiosError)) {
    return null;
  }

  const data = error.response?.data;

  if (data && typeof data === 'object' && 'status' in data) {
    return data as ServiceResult<unknown>;
  }

  return null;
}

export function normalizeCategoryRequiredText(value: FormDataEntryValue | string | null | undefined) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeCategoryOptionalText(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

export async function getCategories(params: CategoryListParams = {}) {
  const response = await categoryApiClient.get<ServiceResult<CategoryListData>>('/categories', {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
  });

  return response.data.data;
}

export async function createCategory(input: CreateCategoryInput) {
  const response = await categoryApiClient.post<ServiceResult<CategoryDto>>('/categories', {
    categoryName: input.categoryName.trim(),
    description: input.description?.trim() || null,
  });

  return response.data.data;
}

export async function updateCategory(input: UpdateCategoryInput) {
  const response = await categoryApiClient.put<ServiceResult<CategoryDto>>(`/categories/${input.categoryId}`, {
    categoryName: input.categoryName.trim(),
    description: input.description?.trim() || null,
  });

  return response.data.data;
}

function getCategoryApiBaseUrl() {
  const configuredApiUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;

  return configuredApiUrl?.replace(/\/api\/?$/, '');
}
