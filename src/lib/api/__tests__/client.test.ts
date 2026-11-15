import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client';
import { ApiError, isTransientError } from '../errors';
import { tokenStorage } from '../token-storage';

describe('ApiClient', () => {
  let client: ApiClient;
  const baseUrl = 'http://localhost:8000/api/v1';

  beforeEach(() => {
    vi.restoreAllMocks();
    client = new ApiClient(baseUrl);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Mandatory Header Injection', () => {
    it('injects x-client-platform, Content-Type, and x-request-id on all requests', async () => {
      let capturedHeaders: Record<string, string> = {};

      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url, init) => {
          capturedHeaders = init?.headers as Record<string, string>;
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ success: true, data: { status: 'healthy' } }),
          });
        }),
      );

      await client.get('/health', { skipAuth: true });

      expect(capturedHeaders['x-client-platform']).toBe('staff-companion');
      expect(capturedHeaders['Content-Type']).toBe('application/json');
      expect(capturedHeaders['x-request-id']).toBeDefined();
      expect(capturedHeaders['x-request-id'].length).toBeGreaterThan(10);
      expect(capturedHeaders['Authorization']).toBeUndefined();
    });

    it('attaches Bearer authorization header when token exists and skipAuth is not set', async () => {
      vi.spyOn(tokenStorage, 'getTokens').mockResolvedValue({
        accessToken: 'valid-test-access-token',
        refreshToken: 'valid-test-refresh-token',
      });

      let capturedHeaders: Record<string, string> = {};
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url, init) => {
          capturedHeaders = init?.headers as Record<string, string>;
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ success: true, data: { id: 'u1' } }),
          });
        }),
      );

      await client.get('/user/me');

      expect(capturedHeaders['Authorization']).toBe('Bearer valid-test-access-token');
      expect(capturedHeaders['x-client-platform']).toBe('staff-companion');
    });
  });

  describe('Envelope Unwrapping', () => {
    it('unwraps ApiResponse<T> to return .data directly', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            statusCode: 200,
            code: 'OK',
            message: 'Profile fetched',
            data: { id: 'user-42', name: 'Alok Craft' },
          }),
        }),
      );

      const result = await client.get<{ id: string; name: string }>('/user/me', {
        skipAuth: true,
      });

      expect(result).toEqual({ id: 'user-42', name: 'Alok Craft' });
    });

    it('returns both data and meta for paginated responses', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            statusCode: 200,
            code: 'OK',
            message: 'Orders list',
            data: [{ id: 'ord-1' }, { id: 'ord-2' }],
            meta: {
              page: 1,
              limit: 10,
              total: 2,
              totalPages: 1,
              hasNextPage: false,
              hasPrevPage: false,
            },
          }),
        }),
      );

      const result = await client.getPaginated<{ id: string }>('/admin/orders', {
        skipAuth: true,
      });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
    });
  });

  describe('Error Normalization', () => {
    it('normalizes validation errors and error response payloads into ApiError', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          headers: new Headers({ 'x-request-id': 'req-err-123' }),
          json: async () => ({
            success: false,
            statusCode: 400,
            code: 'VALIDATION_ERROR',
            message: ['Email is invalid', 'Password is too short'],
            path: '/auth/login',
            requestId: 'req-err-123',
          }),
        }),
      );

      try {
        await client.post('/auth/login', { foo: 'bar' }, { skipAuth: true });
        expect.unreachable('Should have thrown an ApiError');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.statusCode).toBe(400);
        expect(apiErr.code).toBe('VALIDATION_ERROR');
        expect(apiErr.validationErrors).toEqual(['Email is invalid', 'Password is too short']);
        expect(apiErr.message).toBe('Email is invalid, Password is too short');
        expect(apiErr.isUnauthorized()).toBe(false);
        expect(apiErr.isForbidden()).toBe(false);
      }
    });

    it('detects cancellation restricted status codes and codes', () => {
      const err409 = new ApiError({
        statusCode: 409,
        code: 'CONFLICT',
        message: 'Conflict',
      });
      expect(err409.isCancellationRestricted()).toBe(true);

      const errCustom = new ApiError({
        statusCode: 400,
        code: 'ORDER_CANCELLATION_RESTRICTED',
        message: 'Cannot cancel after manufacturing started',
      });
      expect(errCustom.isCancellationRestricted()).toBe(true);
    });
  });

  describe('Single-Flight Token Refresh on 401', () => {
    it('executes single-flight refresh once for concurrent 401 requests and replays both', async () => {
      let tokensInStore = {
        accessToken: 'initial-expired-access',
        refreshToken: 'initial-valid-refresh',
      };

      vi.spyOn(tokenStorage, 'getTokens').mockImplementation(async () => tokensInStore);
      vi.spyOn(tokenStorage, 'setTokens').mockImplementation(async (newTokens) => {
        tokensInStore = newTokens;
      });

      let refreshCallCount = 0;
      let order1Attempts = 0;
      let order2Attempts = 0;

      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
          const authHeader = (init?.headers as Record<string, string>)?.['Authorization'];

          // Token refresh endpoint
          if (url.includes('/auth/refresh')) {
            refreshCallCount++;
            const body = JSON.parse(init?.body as string);
            expect(body.refreshToken).toBe('initial-valid-refresh');

            return {
              ok: true,
              status: 200,
              json: async () => ({
                success: true,
                statusCode: 200,
                data: {
                  accessToken: 'rotated-new-access-token',
                  refreshToken: 'rotated-new-refresh-token',
                },
              }),
            };
          }

          // Order 1 request
          if (url.includes('/admin/orders/1')) {
            order1Attempts++;
            if (authHeader === 'Bearer initial-expired-access') {
              return {
                ok: false,
                status: 401,
                json: async () => ({
                  statusCode: 401,
                  message: 'Token expired',
                  code: 'TOKEN_EXPIRED',
                }),
              };
            }
            if (authHeader === 'Bearer rotated-new-access-token') {
              return {
                ok: true,
                status: 200,
                json: async () => ({
                  success: true,
                  data: { id: 'order-1', status: 'CONFIRMED' },
                }),
              };
            }
          }

          // Order 2 request
          if (url.includes('/admin/orders/2')) {
            order2Attempts++;
            if (authHeader === 'Bearer initial-expired-access') {
              return {
                ok: false,
                status: 401,
                json: async () => ({
                  statusCode: 401,
                  message: 'Token expired',
                  code: 'TOKEN_EXPIRED',
                }),
              };
            }
            if (authHeader === 'Bearer rotated-new-access-token') {
              return {
                ok: true,
                status: 200,
                json: async () => ({
                  success: true,
                  data: { id: 'order-2', status: 'PROCESSING' },
                }),
              };
            }
          }

          return { ok: false, status: 404, json: async () => ({}) };
        }),
      );

      // Launch both requests simultaneously while initial token is expired
      const [res1, res2] = await Promise.all([
        client.get<{ id: string; status: string }>('/admin/orders/1'),
        client.get<{ id: string; status: string }>('/admin/orders/2'),
      ]);

      // Both returned successful data
      expect(res1).toEqual({ id: 'order-1', status: 'CONFIRMED' });
      expect(res2).toEqual({ id: 'order-2', status: 'PROCESSING' });

      // Refresh was called exactly ONCE
      expect(refreshCallCount).toBe(1);

      // Both requests were attempted twice (1st: 401, 2nd: 200)
      expect(order1Attempts).toBe(2);
      expect(order2Attempts).toBe(2);

      // Rotated tokens were stored
      expect(tokensInStore.accessToken).toBe('rotated-new-access-token');
      expect(tokensInStore.refreshToken).toBe('rotated-new-refresh-token');
    });

    it('clears tokens and notifies unauthorized callback when token refresh fails', async () => {
      vi.spyOn(tokenStorage, 'getTokens').mockResolvedValue({
        accessToken: 'expired-access',
        refreshToken: 'revoked-refresh',
      });
      const clearTokensSpy = vi.spyOn(tokenStorage, 'clearTokens').mockResolvedValue();

      let unauthorizedTriggered = false;
      client.onUnauthorized(() => {
        unauthorizedTriggered = true;
      });

      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(async (url: string) => {
          if (url.includes('/auth/refresh')) {
            return {
              ok: false,
              status: 401,
              json: async () => ({
                statusCode: 401,
                code: 'INVALID_REFRESH_TOKEN',
                message: 'Refresh token has been revoked',
              }),
            };
          }
          return {
            ok: false,
            status: 401,
            json: async () => ({ statusCode: 401, message: 'Expired' }),
          };
        }),
      );

      await expect(client.get('/admin/orders/dashboard-stats')).rejects.toThrow(ApiError);

      expect(clearTokensSpy).toHaveBeenCalled();
      expect(unauthorizedTriggered).toBe(true);
    });

    it('keeps tokens when the refresh call fails because the network is unreachable', async () => {
      vi.spyOn(tokenStorage, 'getTokens').mockResolvedValue({
        accessToken: 'expired-access',
        refreshToken: 'valid-refresh',
      });
      const clearTokensSpy = vi.spyOn(tokenStorage, 'clearTokens').mockResolvedValue();

      let unauthorizedTriggered = false;
      client.onUnauthorized(() => {
        unauthorizedTriggered = true;
      });

      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(async (url: string) => {
          if (url.includes('/auth/refresh')) {
            throw new TypeError('Network request failed');
          }
          return {
            ok: false,
            status: 401,
            json: async () => ({ statusCode: 401, message: 'Expired' }),
          };
        }),
      );

      await expect(client.get('/admin/orders/dashboard-stats')).rejects.toThrow(TypeError);

      expect(clearTokensSpy).not.toHaveBeenCalled();
      expect(unauthorizedTriggered).toBe(false);
    });
  });

  describe('Request Timeout', () => {
    it('aborts a hanging request and throws a REQUEST_TIMEOUT ApiError', async () => {
      const timeoutClient = new ApiClient(baseUrl, 20);

      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(
          (_url: string, init?: RequestInit) =>
            new Promise((_resolve, reject) => {
              init?.signal?.addEventListener('abort', () =>
                reject(new DOMException('Aborted', 'AbortError')),
              );
            }),
        ),
      );

      const error = await timeoutClient
        .get('/admin/orders', { skipAuth: true })
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe('REQUEST_TIMEOUT');
      expect(isTransientError(error)).toBe(true);
    });

    it('rethrows caller-initiated aborts unchanged', async () => {
      const controller = new AbortController();

      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(
          (_url: string, init?: RequestInit) =>
            new Promise((_resolve, reject) => {
              init?.signal?.addEventListener('abort', () =>
                reject(new DOMException('Aborted', 'AbortError')),
              );
            }),
        ),
      );

      const pending = client
        .get('/admin/orders', { skipAuth: true, signal: controller.signal })
        .catch((err: unknown) => err);
      controller.abort();
      const error = await pending;

      expect(error).toBeInstanceOf(DOMException);
      expect((error as DOMException).name).toBe('AbortError');
    });
  });
});
