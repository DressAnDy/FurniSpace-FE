export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export type ServiceResult<T> = {
  status: number;
  message: string;
  data: T | null;
  errors?: string[];
};

export type AuthTokenData = {
  access_token?: string;
  accessToken?: string;
  token?: string;
  jwt?: string;
  access_token_expires_at: string;
  token_type: 'Bearer';
  expires_in: number;
};

export type CurrentUserData = {
  accountId: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  status: string;
  role: string;
};

export type RegisterData = {
  accountId: string;
  email: string;
};

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Asset {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  mimeType?: string;
  thumbnailUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
