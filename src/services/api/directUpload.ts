import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';

export type DirectUploadPrepareResponse = {
  contentType?: string | null;
  expiresAt?: string | null;
  fileId: string;
  uploadUrl: string;
};

export type DirectUploadServiceResult<T> = {
  status?: number;
  message?: string | null;
  data: T;
  errors?: Array<string | { code?: string; message?: string; field?: string }> | null;
  errorCode?: string | null;
};

export type DirectUploadOptions<TPrepareBody extends Record<string, unknown>, TCompleteBody extends Record<string, unknown>> = {
  apiClient: AxiosInstance;
  completeBody?: TCompleteBody | ((prepared: DirectUploadPrepareResponse) => TCompleteBody);
  completeEndpoint: string;
  file: File;
  onUploadProgress?: (progressPercent: number) => void;
  prepareBody?: TPrepareBody;
  prepareEndpoint: string;
  requestConfig?: AxiosRequestConfig;
};

const DIRECT_UPLOAD_RETRYABLE_CODES = new Set([
  'FILE_UPLOAD_OBJECT_MISSING',
  'FILE_UPLOAD_SIZE_MISMATCH',
  'FILE_UPLOAD_CONTENT_TYPE_MISMATCH',
  'PROJECT_FILE_UPLOAD_OBJECT_MISSING',
  'PROJECT_FILE_UPLOAD_SIZE_MISMATCH',
  'PROJECT_FILE_UPLOAD_CONTENT_TYPE_MISMATCH',
]);

const DIRECT_UPLOAD_TERMINAL_CODES = new Set([
  'FILE_UPLOAD_NOT_PENDING',
  'FILE_UPLOAD_FORBIDDEN',
  'FILE_UPLOAD_NOT_FOUND',
  'PROJECT_FILE_UPLOAD_NOT_PENDING',
  'PROJECT_FILE_UPLOAD_FORBIDDEN',
  'PROJECT_FILE_UPLOAD_NOT_FOUND',
]);

const FILE_EXTENSION_CONTENT_TYPES: Record<string, string> = {
  bmp: 'image/bmp',
  gif: 'image/gif',
  glb: 'model/gltf-binary',
  gltf: 'model/gltf+json',
  heic: 'image/heic',
  heif: 'image/heif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  pdf: 'application/pdf',
  png: 'image/png',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  zip: 'application/zip',
};

export class DirectUploadStorageError extends Error {
  constructor(message = 'Cannot upload file to storage. Please try again.') {
    super(message);
    this.name = 'DirectUploadStorageError';
  }
}

export function resolveDirectUploadContentType(file: Pick<File, 'name' | 'type'>) {
  const pickedContentType = file.type.trim();

  if (pickedContentType) {
    return pickedContentType === 'image/jpg' ? 'image/jpeg' : pickedContentType;
  }

  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

  return FILE_EXTENSION_CONTENT_TYPES[extension] ?? 'application/octet-stream';
}

export async function directUploadFile<
  TCompleteResponse,
  TPrepareBody extends Record<string, unknown> = Record<string, unknown>,
  TCompleteBody extends Record<string, unknown> = Record<string, unknown>,
>(options: DirectUploadOptions<TPrepareBody, TCompleteBody>): Promise<TCompleteResponse> {
  const prepared = await prepareDirectUpload(options);

  return finalizeDirectUpload<TCompleteResponse, TPrepareBody, TCompleteBody>(options, prepared);
}

async function prepareDirectUpload<TPrepareBody extends Record<string, unknown>, TCompleteBody extends Record<string, unknown>>(
  options: DirectUploadOptions<TPrepareBody, TCompleteBody>,
) {
  const contentType = resolveDirectUploadContentType(options.file);
  const response = await options.apiClient.post<DirectUploadServiceResult<DirectUploadPrepareResponse>>(
    options.prepareEndpoint,
    {
      originalFileName: options.file.name,
      contentType,
      fileSizeBytes: options.file.size,
      ...options.prepareBody,
    },
    options.requestConfig,
  );

  return response.data.data;
}

async function finalizeDirectUpload<
  TCompleteResponse,
  TPrepareBody extends Record<string, unknown>,
  TCompleteBody extends Record<string, unknown>,
>(
  options: DirectUploadOptions<TPrepareBody, TCompleteBody>,
  prepared: DirectUploadPrepareResponse,
  canRestart = true,
): Promise<TCompleteResponse> {
  try {
    return await uploadPreparedFile<TCompleteResponse, TPrepareBody, TCompleteBody>(options, prepared);
  } catch (error) {
    if (!canRestart || !isRetryableDirectUploadConflict(error)) {
      throw error;
    }
  }

  const restarted = await prepareDirectUpload(options);

  return finalizeDirectUpload<TCompleteResponse, TPrepareBody, TCompleteBody>(options, restarted, false);
}

async function uploadPreparedFile<
  TCompleteResponse,
  TPrepareBody extends Record<string, unknown>,
  TCompleteBody extends Record<string, unknown>,
>(
  options: DirectUploadOptions<TPrepareBody, TCompleteBody>,
  prepared: DirectUploadPrepareResponse,
) {
  const contentType = prepared.contentType || resolveDirectUploadContentType(options.file);

  await putFileToSignedUrl(prepared.uploadUrl, options.file, contentType, options.onUploadProgress);

  try {
    return await completeDirectUpload<TCompleteResponse, TPrepareBody, TCompleteBody>(options, prepared);
  } catch (error) {
    if (!isRetryableDirectUploadConflict(error)) {
      throw error;
    }
  }

  await putFileToSignedUrl(prepared.uploadUrl, options.file, contentType, options.onUploadProgress);

  return completeDirectUpload<TCompleteResponse, TPrepareBody, TCompleteBody>(options, prepared);
}

async function completeDirectUpload<
  TCompleteResponse,
  TPrepareBody extends Record<string, unknown>,
  TCompleteBody extends Record<string, unknown>,
>(
  options: DirectUploadOptions<TPrepareBody, TCompleteBody>,
  prepared: DirectUploadPrepareResponse,
) {
  const extraBody = typeof options.completeBody === 'function'
    ? options.completeBody(prepared)
    : options.completeBody;
  const response = await options.apiClient.post<DirectUploadServiceResult<TCompleteResponse>>(
    options.completeEndpoint,
    {
      fileId: prepared.fileId,
      ...extraBody,
    },
    options.requestConfig,
  );

  options.onUploadProgress?.(100);

  return response.data.data;
}

function putFileToSignedUrl(
  uploadUrl: string,
  file: File,
  contentType: string,
  onUploadProgress?: (progressPercent: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('PUT', uploadUrl);
    request.setRequestHeader('Content-Type', contentType);

    request.upload.onprogress = (event) => {
      if (!onUploadProgress || !event.lengthComputable || event.total <= 0) {
        return;
      }

      onUploadProgress(Math.min(95, Math.round((event.loaded / event.total) * 95)));
    };

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
        return;
      }

      reject(new DirectUploadStorageError(`Storage upload failed (${request.status}).`));
    };

    request.onerror = () => {
      reject(new DirectUploadStorageError());
    };

    request.send(file);
  });
}

function isRetryableDirectUploadConflict(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const errorCode = getFirstDirectUploadErrorCode(error.response?.data);

  if (errorCode && DIRECT_UPLOAD_TERMINAL_CODES.has(errorCode)) {
    return false;
  }

  if (errorCode && DIRECT_UPLOAD_RETRYABLE_CODES.has(errorCode)) {
    return true;
  }

  return error.response?.status === 409;
}

function getFirstDirectUploadErrorCode(data: unknown) {
  if (!data || typeof data !== 'object') {
    return undefined;
  }

  const result = data as DirectUploadServiceResult<unknown>;
  const objectError = result.errors?.find((item): item is { code?: string } => (
    typeof item === 'object' && item !== null && Boolean(item.code)
  ));

  return objectError?.code ?? result.errorCode ?? undefined;
}
