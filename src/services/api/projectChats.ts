import axios, { AxiosError } from 'axios';

import { getStoredAccessToken } from './tokenStore';
import type { FileType, FileVisibility } from './projects';

const projectChatApiClient = axios.create({
  baseURL: getProjectChatApiBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

projectChatApiClient.interceptors.request.use((config) => {
  const token = getStoredAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

projectChatApiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      window.location.assign('/login');
    }

    return Promise.reject(error);
  },
);

export type ProjectChatType = 'SALES' | 'DESIGNER' | 'PRODUCTION' | 'DELIVERY' | 'GENERAL' | 'INTERNAL';
export type ProjectChatStatus = 'OPEN' | 'CLOSED' | 'ARCHIVED';
export type ProjectChatMessageType = 'TEXT' | 'FILE' | 'SYSTEM';

export type ProjectChatServiceResult<T> = {
  status: number;
  message?: string;
  data: T;
  errors?: string[];
  errorCode?: string;
};

export type ProjectChatLastMessage = {
  messageId: string;
  senderId: string | null;
  senderName: string | null;
  messageType: ProjectChatMessageType;
  contentPreview: string | null;
  createdAt: string | null;
};

export type ProjectChatListItem = {
  chatId: string;
  projectId: string;
  chatType: ProjectChatType;
  staffId: string | null;
  staffName: string | null;
  title: string | null;
  status: ProjectChatStatus;
  lastMessage: ProjectChatLastMessage | null;
  createdAt: string | null;
  closedAt: string | null;
};

export type ProjectChatListResponse = {
  items: ProjectChatListItem[];
  page: number;
  limit: number;
  total: number;
};

export type ProjectChatAttachment = {
  fileId: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  fileUrl: string;
};

export type ProjectChatMessage = {
  messageId: string;
  chatId: string;
  senderId: string | null;
  senderName: string | null;
  senderRole: string | null;
  messageType: ProjectChatMessageType;
  content: string | null;
  attachment: ProjectChatAttachment | null;
  createdAt: string | null;
  editedAt: string | null;
  deletedAt: string | null;
  readAt: string | null;
};

export type ProjectChatMessageListResponse = {
  items: ProjectChatMessage[];
  page: number;
  limit: number;
  total: number;
};

export type ProjectChatListParams = {
  projectId: string;
  status?: ProjectChatStatus | null;
  chatType?: ProjectChatType | null;
  page?: number;
  limit?: number;
};

export type ProjectChatMessageParams = {
  chatId: string;
  page?: number;
  limit?: number;
  sort?: 'ASC' | 'DESC';
};

export type ProjectChatSummary = {
  chatId: string;
  projectId: string;
  chatType: ProjectChatType;
  staffId: string | null;
  title: string | null;
  status: ProjectChatStatus;
  closedAt: string | null;
};

export type ProjectChatMessageSentEvent = {
  projectId: string;
  chatId: string;
  message: ProjectChatMessage;
};

export async function getProjectChats(params: ProjectChatListParams) {
  const response = await projectChatApiClient.get<ProjectChatServiceResult<ProjectChatListResponse>>(`/projects/${params.projectId}/chats`, {
    params: {
      status: params.status ?? undefined,
      chatType: params.chatType ?? undefined,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
  });

  return response.data.data;
}

export async function getProjectChatMessages(params: ProjectChatMessageParams) {
  const response = await projectChatApiClient.get<ProjectChatServiceResult<ProjectChatMessageListResponse>>(
    `/project-chats/${params.chatId}/messages`,
    {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? 30,
        sort: params.sort ?? 'ASC',
      },
    },
  );

  return response.data.data;
}

export async function sendProjectChatTextMessage(chatId: string, content: string) {
  const response = await projectChatApiClient.post<ProjectChatServiceResult<ProjectChatMessage>>(`/project-chats/${chatId}/messages`, {
    messageType: 'TEXT',
    content: content.trim(),
  });

  return response.data.data;
}

export async function sendProjectChatFileMessage(
  chatId: string,
  input: {
    file: File;
    content?: string | null;
    fileType?: FileType;
    visibility?: FileVisibility;
  },
) {
  const formData = new FormData();
  formData.append('file', input.file);

  if (input.content?.trim()) {
    formData.append('content', input.content.trim());
  }

  if (input.fileType) {
    formData.append('fileType', input.fileType);
  }

  if (input.visibility) {
    formData.append('visibility', input.visibility);
  }

  const response = await projectChatApiClient.post<ProjectChatServiceResult<ProjectChatMessage>>(
    `/project-chats/${chatId}/messages/files`,
    formData,
  );

  return response.data.data;
}

export async function closeProjectChat(chatId: string) {
  const response = await projectChatApiClient.patch<ProjectChatServiceResult<ProjectChatSummary>>(`/project-chats/${chatId}/status`, {
    status: 'CLOSED',
  });

  return response.data.data;
}

export function getProjectChatServiceResultMessage(error: unknown) {
  const result = getProjectChatServiceResultFromError(error);
  const status = error instanceof AxiosError ? error.response?.status : undefined;

  if (!result) {
    return 'Cannot connect to project chat API. Please check backend and VITE_API_URL.';
  }

  if (status === 413) {
    return 'File is too large for chat upload.';
  }

  if (status === 415) {
    return 'This file type is not supported for chat upload.';
  }

  if (result.errors?.length) {
    return result.errors.join('\n');
  }

  return result.message || 'Chat request failed. Please try again.';
}

export function getProjectChatHubUrl() {
  return `${getProjectChatApiBaseUrl() ?? ''}/hubs/project-chat`;
}

function getProjectChatServiceResultFromError(error: unknown) {
  if (!(error instanceof AxiosError)) {
    return null;
  }

  const data = error.response?.data;

  if (data && typeof data === 'object' && 'status' in data) {
    return data as ProjectChatServiceResult<unknown>;
  }

  return null;
}

function getProjectChatApiBaseUrl() {
  const configuredApiUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;

  return configuredApiUrl?.replace(/\/api\/?$/, '');
}
