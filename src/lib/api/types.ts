export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginatedMeta;
}

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  code: string;
  message: string;
  path: string;
  method: string;
  timestamp: string;
  data: T;
  meta?: PaginatedMeta;
}

export interface ValidationErrorItem {
  field?: string;
  message: string;
  [key: string]: unknown;
}

export interface ApiErrorPayload {
  success: false;
  statusCode: number;
  code: string;
  message: string | string[];
  errors?: ValidationErrorItem[] | Record<string, unknown>[] | null;
  details?: Record<string, unknown>;
  requestId: string;
  path: string;
  method: string;
  timestamp: string;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  skipAuth?: boolean;
}
