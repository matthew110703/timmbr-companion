import { env, resolveDevApiUrl } from '@/config/env';
import { ApiError, isTransientError } from './errors';
import { tokenStorage } from './token-storage';
import type { PaginatedResult, RequestOptions } from './types';

function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export type UnauthorizedHandler = () => void;

export class ApiClient {
  private baseUrl: string;
  private timeoutMs: number;
  private refreshPromise: Promise<string | null> | null = null;
  private unauthorizedHandlers = new Set<UnauthorizedHandler>();

  constructor(baseUrl?: string, timeoutMs?: number) {
    this.baseUrl = baseUrl || env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    this.timeoutMs = timeoutMs ?? env.EXPO_PUBLIC_REQUEST_TIMEOUT_MS;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  onUnauthorized(handler: UnauthorizedHandler): () => void {
    this.unauthorizedHandlers.add(handler);
    return () => this.unauthorizedHandlers.delete(handler);
  }

  setUnauthorizedHandler(handler: UnauthorizedHandler): () => void {
    return this.onUnauthorized(handler);
  }

  private notifyUnauthorized() {
    this.unauthorizedHandlers.forEach((handler) => {
      try {
        handler();
      } catch {}
    });
  }

  private buildUrl(
    path: string,
    params?: Record<string, string | number | boolean | undefined | null>,
  ): { url: string; cleanPath: string } {
    const activeBase = resolveDevApiUrl(this.baseUrl, env.EXPO_PUBLIC_APP_ENV);
    const cleanBase = activeBase.replace(/\/+$/, '');
    let cleanPath = path.startsWith('/') ? path : `/${path}`;

    if (cleanBase.endsWith('/api/v1') && cleanPath.startsWith('/api/v1/')) {
      cleanPath = cleanPath.slice('/api/v1'.length);
    }

    const queryParts: string[] = [];
    if (params) {
      for (const [key, val] of Object.entries(params)) {
        if (val !== undefined && val !== null) {
          queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`);
        }
      }
    }

    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return {
      url: `${cleanBase}${cleanPath}${queryString}`,
      cleanPath,
    };
  }

  // React Native's fetch never times out on its own, so every request is bounded here.
  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    meta: { requestId: string; path: string; method: string },
  ): Promise<Response> {
    const controller = new AbortController();
    const externalSignal = init.signal;
    const onExternalAbort = () => controller.abort();
    if (externalSignal) {
      if (externalSignal.aborted) controller.abort();
      else externalSignal.addEventListener('abort', onExternalAbort);
    }

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);

    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (err) {
      if (timedOut) {
        throw new ApiError({
          statusCode: 408,
          code: 'REQUEST_TIMEOUT',
          message: 'The request timed out. Please check your connection and try again.',
          ...meta,
        });
      }
      throw err;
    } finally {
      clearTimeout(timer);
      externalSignal?.removeEventListener('abort', onExternalAbort);
    }
  }

  private async performFetch(
    url: string,
    cleanPath: string,
    method: string,
    options: RequestOptions,
    requestId: string,
    tokenOverride?: string | null,
  ): Promise<Response> {
    const headers: Record<string, string> = {
      'x-client-platform': 'staff-companion',
      'Content-Type': 'application/json',
      'x-request-id': requestId,
    };

    if (options.headers) {
      if (typeof options.headers === 'object' && !Array.isArray(options.headers)) {
        Object.assign(headers, options.headers);
      }
    }

    if (!options.skipAuth) {
      let accessToken = tokenOverride;
      if (accessToken === undefined) {
        const tokens = await tokenStorage.getTokens();
        accessToken = tokens?.accessToken || null;
      }
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
    }

    const fetchInit: RequestInit = {
      cache: options.cache,
      credentials: options.credentials,
      integrity: options.integrity,
      keepalive: options.keepalive,
      mode: options.mode,
      redirect: options.redirect,
      referrer: options.referrer,
      referrerPolicy: options.referrerPolicy,
      signal: options.signal,
      window: options.window,
      method,
      headers,
    };

    if (options.body !== undefined && options.body !== null) {
      fetchInit.body =
        typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    }

    return this.fetchWithTimeout(url, fetchInit, { requestId, path: cleanPath, method });
  }

  private isAuthBypassPath(cleanPath: string): boolean {
    const lower = cleanPath.toLowerCase();
    return (
      lower.includes('/auth/login') ||
      lower.includes('/auth/refresh') ||
      lower.includes('/auth/otp') ||
      lower.includes('/auth/password')
    );
  }

  private async handleRefreshToken(): Promise<string> {
    if (this.refreshPromise) {
      const token = await this.refreshPromise;
      if (!token) throw new Error('Token refresh failed in flight');
      return token;
    }

    this.refreshPromise = (async () => {
      try {
        const tokens = await tokenStorage.getTokens();
        if (!tokens?.refreshToken) {
          throw new Error('No refresh token available');
        }

        const { url } = this.buildUrl('/auth/refresh');
        const refreshRequestId = generateRequestId();

        const response = await this.fetchWithTimeout(
          url,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-client-platform': 'staff-companion',
              'x-request-id': refreshRequestId,
            },
            body: JSON.stringify({ refreshToken: tokens.refreshToken }),
          },
          { requestId: refreshRequestId, path: '/auth/refresh', method: 'POST' },
        );

        if (!response.ok) {
          let errPayload: Record<string, unknown> | null = null;
          try {
            errPayload = (await response.json()) as Record<string, unknown>;
          } catch {}
          const codeVal = typeof errPayload?.code === 'string' ? errPayload.code : undefined;
          const msgVal = typeof errPayload?.message === 'string' ? errPayload.message : undefined;
          throw new ApiError({
            statusCode: response.status,
            code: codeVal || 'REFRESH_FAILED',
            message: msgVal || 'Token refresh failed',
            requestId: refreshRequestId,
            path: '/auth/refresh',
            method: 'POST',
          });
        }

        const json = await response.json();
        const data = json?.data ?? json;
        const newAccessToken: string = data.accessToken;
        const newRefreshToken: string = data.refreshToken || tokens.refreshToken;

        if (!newAccessToken) {
          throw new Error('Refresh endpoint did not return an access token');
        }

        await tokenStorage.setTokens({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        });

        return newAccessToken;
      } catch (err) {
        // Only a definitive rejection ends the session; an unreachable server keeps it.
        if (!isTransientError(err)) {
          await tokenStorage.clearTokens();
          this.notifyUnauthorized();
        }
        throw err;
      } finally {
        this.refreshPromise = null;
      }
    })();

    const token = await this.refreshPromise;
    if (!token) throw new Error('Token refresh failed');
    return token;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = (options.method || 'GET').toUpperCase();
    const requestId = generateRequestId();
    const { url, cleanPath } = this.buildUrl(path, options.params);

    let response = await this.performFetch(url, cleanPath, method, options, requestId);

    if (response.status === 401 && !this.isAuthBypassPath(cleanPath) && !options.skipAuth) {
      try {
        const newAccessToken = await this.handleRefreshToken();
        response = await this.performFetch(
          url,
          cleanPath,
          method,
          options,
          requestId,
          newAccessToken,
        );
      } catch (refreshErr) {
        if (refreshErr instanceof ApiError || isTransientError(refreshErr)) {
          throw refreshErr;
        }
        throw new ApiError({
          statusCode: 401,
          code: 'UNAUTHORIZED',
          message: 'Session expired. Please sign in again.',
          requestId,
          path: cleanPath,
          method,
        });
      }
    }

    if (!response.ok) {
      let errPayload: Record<string, unknown> | null = null;
      try {
        errPayload = (await response.json()) as Record<string, unknown>;
      } catch {}

      const receivedRequestId =
        response.headers && typeof response.headers.get === 'function'
          ? response.headers.get('x-request-id')
          : null;

      const codeVal = typeof errPayload?.code === 'string' ? errPayload.code : undefined;
      const msgVal =
        typeof errPayload?.message === 'string' || Array.isArray(errPayload?.message)
          ? errPayload.message
          : response.statusText || 'Request failed';
      const errorsVal = Array.isArray(errPayload?.errors) ? errPayload.errors : undefined;
      const detailsVal =
        errPayload?.details && typeof errPayload.details === 'object'
          ? (errPayload.details as Record<string, unknown>)
          : undefined;

      throw new ApiError({
        statusCode: response.status,
        code: codeVal,
        message: msgVal,
        errors: errorsVal,
        details: detailsVal,
        requestId: receivedRequestId || requestId,
        path: cleanPath,
        method,
      });
    }

    if (response.status === 204) {
      return undefined as unknown as T;
    }

    const json = await response.json();

    if (json && typeof json === 'object' && 'data' in json && 'success' in json) {
      if (json.meta !== undefined) {
        return { data: json.data, meta: json.meta } as unknown as T;
      }
      return json.data as T;
    }

    return json as T;
  }

  async get<T>(path: string, options: Omit<RequestOptions, 'method'> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  async post<T>(
    path: string,
    body?: unknown,
    options: Omit<RequestOptions, 'method' | 'body'> = {},
  ): Promise<T> {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }

  async patch<T>(
    path: string,
    body?: unknown,
    options: Omit<RequestOptions, 'method' | 'body'> = {},
  ): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PATCH', body });
  }

  async put<T>(
    path: string,
    body?: unknown,
    options: Omit<RequestOptions, 'method' | 'body'> = {},
  ): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PUT', body });
  }

  async delete<T>(path: string, options: Omit<RequestOptions, 'method'> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }

  async getPaginated<T>(
    path: string,
    options: Omit<RequestOptions, 'method'> = {},
  ): Promise<PaginatedResult<T>> {
    return this.get<PaginatedResult<T>>(path, options);
  }
}

export const apiClient = new ApiClient();
