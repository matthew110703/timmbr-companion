import type { ApiErrorPayload, ValidationErrorItem } from './types';

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly errors: ValidationErrorItem[] | null;
  readonly validationErrors: string[];
  readonly requestId?: string;
  readonly path?: string;
  readonly method?: string;
  readonly details?: Record<string, unknown>;

  constructor(
    payload: Partial<ApiErrorPayload> & { message: string | string[]; statusCode: number },
  ) {
    const resolvedMessage = Array.isArray(payload.message)
      ? payload.message.join(', ')
      : payload.message || 'An unexpected error occurred';

    super(resolvedMessage);
    this.name = 'ApiError';
    this.statusCode = payload.statusCode;
    this.code =
      payload.code ||
      (payload.statusCode === 401
        ? 'UNAUTHORIZED'
        : payload.statusCode === 403
          ? 'FORBIDDEN'
          : 'UNKNOWN');
    this.requestId = payload.requestId;
    this.path = payload.path;
    this.method = payload.method;
    this.details = payload.details;

    if (Array.isArray(payload.errors)) {
      this.errors = payload.errors as ValidationErrorItem[];
      this.validationErrors = payload.errors.map((e): string => {
        if (typeof e === 'string') return e;
        if (typeof e === 'object' && e !== null && 'message' in e) {
          const msg = (e as Record<string, unknown>).message;
          if (typeof msg === 'string') return msg;
        }
        return JSON.stringify(e);
      });
    } else if (Array.isArray(payload.message)) {
      this.errors = payload.message.map((msg) => ({ message: msg }));
      this.validationErrors = payload.message;
    } else {
      this.errors = null;
      this.validationErrors = [];
    }
  }

  isUnauthorized(): boolean {
    return this.statusCode === 401;
  }

  isForbidden(): boolean {
    return this.statusCode === 403;
  }

  isCancellationRestricted(): boolean {
    return (
      this.statusCode === 409 ||
      this.statusCode === 422 ||
      this.code === 'ORDER_CANCELLATION_RESTRICTED'
    );
  }
}

/**
 * Network failures, timeouts and 5xx responses say nothing about whether the
 * session is still valid, so callers must not discard tokens because of them.
 */
export function isTransientError(err: unknown): boolean {
  if (err instanceof ApiError) {
    return err.code === 'REQUEST_TIMEOUT' || err.statusCode >= 500;
  }
  // fetch rejects with a TypeError when the network is unreachable.
  return err instanceof TypeError;
}
