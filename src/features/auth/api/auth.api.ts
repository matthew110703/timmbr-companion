import { apiClient } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { tokenStorage } from '@/lib/api/token-storage';
import type { LoginFormData } from '../schemas/login.schema';
import type { AuthSession, UserProfileDto } from '../types/auth.types';
import { isStaffEligibleRole } from '../utils/permissions';

export const authApi = {
  async login(dto: LoginFormData): Promise<AuthSession> {
    const session = await apiClient.post<AuthSession>('/auth/login', dto, { skipAuth: true });

    if (!isStaffEligibleRole(session.role)) {
      await tokenStorage.clearTokens();
      throw new ApiError({
        statusCode: 403,
        code: 'STAFF_ACCESS_REQUIRED',
        message: 'Access denied. Only organization staff accounts may sign in to Staff Companion.',
        requestId: 'local-staff-guard',
        path: '/auth/login',
        method: 'POST',
      });
    }

    if (session.accessToken && session.refreshToken) {
      await tokenStorage.setTokens({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      });
    }

    return session;
  },

  async getMe(): Promise<UserProfileDto> {
    return apiClient.get<UserProfileDto>('/user/me');
  },

  async validateInviteToken(token: string): Promise<void> {
    await apiClient.get<void>('/auth/validate-token', {
      params: { token, type: 'INVITE' },
      skipAuth: true,
    });
  },

  async acceptInvite(token: string, password: string): Promise<void> {
    await apiClient.post<void>('/auth/accept-invite', { token, password }, { skipAuth: true });
  },

  async logout(refreshToken?: string): Promise<void> {
    try {
      let tokenToRevoke = refreshToken;
      if (!tokenToRevoke) {
        const stored = await tokenStorage.getTokens();
        tokenToRevoke = stored?.refreshToken;
      }
      if (tokenToRevoke) {
        await apiClient.post('/auth/logout', { refreshToken: tokenToRevoke });
      }
    } catch {
    } finally {
      await tokenStorage.clearTokens();
    }
  },

  async logoutAll(): Promise<void> {
    try {
      await apiClient.post('/auth/logout-all');
    } catch {
    } finally {
      await tokenStorage.clearTokens();
    }
  },
};
