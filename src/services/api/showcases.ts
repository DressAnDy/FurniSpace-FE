import axios, { AxiosError } from 'axios';

import { shouldRedirectUnauthorized } from '@/shared/config/authPreview';
import { getStoredAccessToken } from './tokenStore';

const showcaseApiClient = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
});

showcaseApiClient.interceptors.request.use((config) => {
  const token = getStoredAccessToken();
  const shouldSkipAuth = Boolean((config as { skipAuth?: boolean }).skipAuth);

  if (token && !shouldSkipAuth) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.data instanceof FormData) {
    clearMultipartContentType(config.headers);
  }

  return config;
});

showcaseApiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const shouldSkipAuthRedirect = Boolean((error.config as { skipAuthRedirect?: boolean } | undefined)?.skipAuthRedirect);

    if (error.response?.status === 401 && !shouldSkipAuthRedirect && shouldRedirectUnauthorized()) {
      window.location.assign('/login');
    }

    return Promise.reject(error);
  },
);

export type ServiceResult<T> = {
  status: number;
  message?: string;
  data: T;
  errors?: Array<string | { code?: string; message?: string; field?: string }>;
  errorCode?: string;
};

export type ProjectShowcaseStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'ARCHIVED';
export type ProjectShowcaseMediaType = 'BEFORE' | 'AFTER' | 'FINAL' | 'DETAIL' | 'OTHER';

export type ProjectShowcaseMediaDto = {
  projectShowcaseMediaId?: string | null;
  showcaseMediaId: string;
  mediaId?: string | null;
  fileId?: string | null;
  fileUrl?: string | null;
  url?: string | null;
  publicUrl?: string | null;
  originalFileName?: string | null;
  mimeType?: string | null;
  title?: string | null;
  mediaType: ProjectShowcaseMediaType;
  caption?: string | null;
  displayOrder?: number | null;
  isCover?: boolean | null;
  createdAt?: string | null;
};

export type ProjectShowcaseDto = {
  projectShowcaseId?: string | null;
  showcaseId: string;
  projectId?: string | null;
  featuredReviewId?: string | null;
  featuredReviewAllowPublicDisplay?: boolean | null;
  slug?: string | null;
  title?: string | null;
  summary?: string | null;
  description?: string | null;
  status: ProjectShowcaseStatus;
  projectName?: string | null;
  businessType?: string | null;
  projectStatus?: string | null;
  completedDate?: string | null;
  totalAreaSqm?: number | null;
  numberOfFloors?: number | null;
  implementationDurationDays?: number | null;
  projectAddress?: string | null;
  completionYear?: number | null;
  media?: ProjectShowcaseMediaDto[];
  coverMedia?: ProjectShowcaseMediaDto | null;
  coverUrl?: string | null;
  review?: {
    reviewId: string;
    rating?: number | null;
    designQualityRating?: number | null;
    serviceQualityRating?: number | null;
    deliveryRating?: number | null;
    comment?: string | null;
  } | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  approvedAt?: string | null;
  publishedAt?: string | null;
  archivedAt?: string | null;
};

export type ProjectShowcaseListData = {
  items: ProjectShowcaseDto[];
  page: number;
  pageSize: number;
  total?: number;
  totalCount: number;
};

export type UpdateProjectShowcaseInput = {
  showcaseId: string;
  title?: string | null;
  summary?: string | null;
  description?: string | null;
  slug?: string | null;
  featuredReviewId?: string | null;
};

export type CreateProjectShowcaseInput = {
  projectId: string;
  title?: string | null;
  summary?: string | null;
  description?: string | null;
};

export type CreateProjectShowcaseMediaInput = {
  showcaseId: string;
  fileId: string;
  mediaType: ProjectShowcaseMediaType;
  title?: string | null;
  caption?: string | null;
  setAsCover?: boolean | null;
};

export type UploadProjectShowcaseMediaInput = {
  showcaseId: string;
  file: File;
  mediaType?: ProjectShowcaseMediaType | null;
  title?: string | null;
  caption?: string | null;
  setAsCover?: boolean | null;
};

export type ReorderProjectShowcaseMediaInput = {
  mediaIds: string[];
  showcaseId: string;
};

const SHOWCASE_ERROR_MESSAGES: Record<string, string> = {
  PROJECT_SHOWCASE_ALREADY_EXISTS: 'This project already has a showcase.',
  PROJECT_SHOWCASE_PUBLISH_REQUIREMENTS_NOT_MET: 'Publish requires a completed project, title, summary, and cover media.',
  PROJECT_SHOWCASE_SLUG_DUPLICATE: 'This showcase slug is already in use.',
  PROJECT_SHOWCASE_ARCHIVED_READ_ONLY: 'Archived showcases cannot be edited.',
  PROJECT_SHOWCASE_COVER_CONFLICT: 'Another showcase cover update conflicted. Please retry.',
  PROJECT_SHOWCASE_FILE_NOT_ALLOWED: 'This file cannot be used for showcase media.',
  PROJECT_SHOWCASE_FILE_NOT_IN_PROJECT: 'This file does not belong to the showcase project.',
  PROJECT_SHOWCASE_MEDIA_NOT_FOUND: 'Showcase media was not found.',
  PROJECT_REVIEW_CONSENT_FORBIDDEN: 'You cannot update public display consent for this review.',
};

export function getShowcaseServiceResultMessage(error: unknown) {
  const result = getShowcaseServiceResultFromError(error);

  if (!result) {
    return 'Cannot connect to showcase API. Please check backend and VITE_API_URL.';
  }

  const errorCode = getFirstShowcaseErrorCode(result);

  if (errorCode && SHOWCASE_ERROR_MESSAGES[errorCode]) {
    return SHOWCASE_ERROR_MESSAGES[errorCode];
  }

  const errorMessages = getShowcaseErrorMessages(result);

  if (errorMessages.length) {
    return errorMessages.join('\n');
  }

  return result.message || 'Request failed. Please try again.';
}

export function getShowcaseServiceResultFromError(error: unknown) {
  if (!(error instanceof AxiosError)) {
    return null;
  }

  const data = error.response?.data;

  if (data && typeof data === 'object') {
    const result = data as ServiceResult<unknown> & {
      detail?: string;
      title?: string;
    };

    return {
      ...result,
      status: error.response?.status ?? result.status ?? 500,
      message: result.message ?? result.detail ?? result.title,
    };
  }

  return null;
}

export async function getProjectShowcase(projectId: string) {
  const response = await showcaseApiClient.get<ServiceResult<ProjectShowcaseDto>>(`/projects/${projectId}/showcase`);

  return normalizeProjectShowcase(response.data.data);
}

export async function createProjectShowcase(input: string | CreateProjectShowcaseInput) {
  const projectId = typeof input === 'string' ? input : input.projectId;
  const body = typeof input === 'string'
    ? undefined
    : {
        title: input.title?.trim() || null,
        summary: input.summary?.trim() || null,
        description: input.description?.trim() || null,
      };
  const response = await showcaseApiClient.post<ServiceResult<ProjectShowcaseDto>>(`/projects/${projectId}/showcase`, body);

  return normalizeProjectShowcase(response.data.data);
}

export async function updateProjectShowcase(input: UpdateProjectShowcaseInput) {
  const response = await showcaseApiClient.patch<ServiceResult<ProjectShowcaseDto>>(`/project-showcases/${input.showcaseId}`, {
    title: input.title?.trim() || null,
    summary: input.summary?.trim() || null,
    description: input.description?.trim() || null,
    slug: input.slug?.trim() || null,
    featuredReviewId: input.featuredReviewId?.trim() || null,
  });

  return normalizeProjectShowcase(response.data.data);
}

export async function submitProjectShowcase(showcaseId: string) {
  const response = await showcaseApiClient.patch<ServiceResult<ProjectShowcaseDto>>(`/project-showcases/${showcaseId}/submit`);

  return normalizeProjectShowcase(response.data.data);
}

export async function publishProjectShowcase(showcaseId: string) {
  const response = await showcaseApiClient.patch<ServiceResult<ProjectShowcaseDto>>(`/project-showcases/${showcaseId}/publish`);

  return normalizeProjectShowcase(response.data.data);
}

export async function archiveProjectShowcase(showcaseId: string) {
  const response = await showcaseApiClient.patch<ServiceResult<ProjectShowcaseDto>>(`/project-showcases/${showcaseId}/archive`);

  return normalizeProjectShowcase(response.data.data);
}

export async function createProjectShowcaseMedia(input: CreateProjectShowcaseMediaInput) {
  const response = await showcaseApiClient.post<ServiceResult<ProjectShowcaseMediaDto>>(
    `/project-showcases/${input.showcaseId}/media`,
    {
      fileId: input.fileId,
      mediaType: input.mediaType,
      title: input.title?.trim() || null,
      caption: input.caption?.trim() || null,
      setAsCover: Boolean(input.setAsCover),
    },
  );

  return normalizeProjectShowcaseMedia(response.data.data);
}

export async function uploadProjectShowcaseMedia(input: UploadProjectShowcaseMediaInput) {
  const formData = new FormData();
  formData.append('file', input.file);

  if (input.mediaType) {
    formData.append('mediaType', input.mediaType);
  }

  if (input.title?.trim()) {
    formData.append('title', input.title.trim());
  }

  if (input.caption?.trim()) {
    formData.append('caption', input.caption.trim());
  }

  formData.append('setAsCover', String(Boolean(input.setAsCover)));

  const response = await showcaseApiClient.post<ServiceResult<ProjectShowcaseMediaDto>>(
    `/project-showcases/${input.showcaseId}/media/upload`,
    formData,
  );

  return normalizeProjectShowcaseMedia(response.data.data);
}

export async function reorderProjectShowcaseMedia(input: ReorderProjectShowcaseMediaInput) {
  const response = await showcaseApiClient.patch<ServiceResult<ProjectShowcaseDto>>(
    `/project-showcases/${input.showcaseId}/media/reorder`,
    { mediaIds: input.mediaIds },
  );

  return normalizeProjectShowcase(response.data.data);
}

export async function setProjectShowcaseMediaCover(showcaseId: string, showcaseMediaId: string) {
  const response = await showcaseApiClient.patch<ServiceResult<ProjectShowcaseDto>>(
    `/project-showcases/${showcaseId}/media/${showcaseMediaId}/cover`,
  );

  return normalizeProjectShowcase(response.data.data);
}

export async function deleteProjectShowcaseMedia(showcaseId: string, showcaseMediaId: string) {
  const response = await showcaseApiClient.delete<ServiceResult<{ showcaseMediaId: string }>>(
    `/project-showcases/${showcaseId}/media/${showcaseMediaId}`,
  );

  return response.data.data;
}

export async function updateProjectReviewPublicConsent(reviewId: string, allowPublicDisplay: boolean) {
  const response = await showcaseApiClient.patch<ServiceResult<{ reviewId: string; allowPublicDisplay: boolean }>>(
    `/project-reviews/${reviewId}/public-consent`,
    { allowPublicDisplay },
  );

  return response.data.data;
}

export async function getPublicShowcases(params: { page?: number; pageSize?: number } = {}) {
  const response = await showcaseApiClient.get<ServiceResult<ProjectShowcaseListData>>('/public/showcases', {
    params: {
      page: params.page ?? 1,
      pageSize: Math.min(params.pageSize ?? 12, 50),
    },
    skipAuth: true,
    skipAuthRedirect: true,
    withCredentials: false,
  });

  return normalizeProjectShowcaseList(response.data.data);
}

function normalizeProjectShowcase(showcase: ProjectShowcaseDto): ProjectShowcaseDto {
  const media = showcase.media?.map(normalizeProjectShowcaseMedia) ?? [];
  const showcaseId = showcase.showcaseId ?? showcase.projectShowcaseId ?? '';
  const coverMedia =
    showcase.coverMedia
      ? normalizeProjectShowcaseMedia(showcase.coverMedia)
      : media.find((item) => item.isCover) ?? (showcase.coverUrl ? {
          showcaseMediaId: 'cover',
          mediaId: 'cover',
          mediaType: 'FINAL',
          url: showcase.coverUrl,
          publicUrl: showcase.coverUrl,
          isCover: true,
        } : null);

  return {
    ...showcase,
    projectShowcaseId: showcase.projectShowcaseId ?? showcaseId,
    showcaseId,
    media,
    coverMedia,
    coverUrl: showcase.coverUrl ?? coverMedia?.url ?? coverMedia?.publicUrl ?? null,
  };
}

function normalizeProjectShowcaseMedia(media: ProjectShowcaseMediaDto): ProjectShowcaseMediaDto {
  const showcaseMediaId = media.showcaseMediaId ?? media.projectShowcaseMediaId ?? media.mediaId ?? '';
  const url = media.url ?? media.publicUrl ?? media.fileUrl ?? null;

  return {
    ...media,
    projectShowcaseMediaId: media.projectShowcaseMediaId ?? showcaseMediaId,
    showcaseMediaId,
    mediaId: media.mediaId ?? showcaseMediaId,
    publicUrl: media.publicUrl ?? url,
    url,
  };
}

function normalizeProjectShowcaseList(data: ProjectShowcaseListData): ProjectShowcaseListData {
  return {
    ...data,
    totalCount: data.totalCount ?? data.total ?? data.items.length,
    total: data.total ?? data.totalCount ?? data.items.length,
    items: data.items.map(normalizeProjectShowcase),
  };
}

function getFirstShowcaseErrorCode(result: ServiceResult<unknown>) {
  const objectError = result.errors?.find((item): item is { code?: string } => typeof item === 'object' && item !== null && Boolean(item.code));

  return objectError?.code ?? result.errorCode;
}

function getShowcaseErrorMessages(result: ServiceResult<unknown>) {
  return (result.errors ?? [])
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item.code && SHOWCASE_ERROR_MESSAGES[item.code]) return SHOWCASE_ERROR_MESSAGES[item.code];
      return item.message ?? item.code ?? null;
    })
    .filter((message): message is string => Boolean(message));
}

export async function getPublicShowcase(slug: string) {
  const response = await showcaseApiClient.get<ServiceResult<ProjectShowcaseDto>>(`/public/showcases/${slug}`, {
    skipAuth: true,
    skipAuthRedirect: true,
    withCredentials: false,
  });

  return normalizeProjectShowcase(response.data.data);
}

function getApiBaseUrl() {
  const configuredApiUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;

  return configuredApiUrl?.replace(/\/api\/?$/, '');
}

function clearMultipartContentType(headers: unknown) {
  const headerBag = headers as {
    delete?: (name: string) => boolean;
    set?: (name: string, value?: string | false) => void;
    [key: string]: unknown;
  };

  if (typeof headerBag.delete === 'function') {
    headerBag.delete('Content-Type');
    headerBag.delete('content-type');
    return;
  }

  if (typeof headerBag.set === 'function') {
    headerBag.set('Content-Type', false);
    return;
  }

  delete headerBag['Content-Type'];
  delete headerBag['content-type'];
}
