import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isStaffEligibleRole, isManagerRole, hasPermission } from '../utils/permissions';
import { authApi } from '../api/auth.api';
import { apiClient } from '@/lib/api/client';
import { tokenStorage } from '@/lib/api/token-storage';
import { ApiError } from '@/lib/api/errors';
import type { AuthSession, StaffPermission } from '../types/auth.types';

describe('Permissions & Role Evaluation', () => {
  describe('isStaffEligibleRole', () => {
    it('returns true for STAFF, ADMIN, and MASTER', () => {
      expect(isStaffEligibleRole('STAFF')).toBe(true);
      expect(isStaffEligibleRole('ADMIN')).toBe(true);
      expect(isStaffEligibleRole('MASTER')).toBe(true);
    });

    it('returns false for customer USER and falsy values', () => {
      expect(isStaffEligibleRole('USER')).toBe(false);
      expect(isStaffEligibleRole(null)).toBe(false);
      expect(isStaffEligibleRole(undefined)).toBe(false);
      expect(isStaffEligibleRole('ANONYMOUS')).toBe(false);
    });
  });

  describe('isManagerRole', () => {
    it('returns true for ADMIN and MASTER users', () => {
      expect(isManagerRole({ role: 'ADMIN' })).toBe(true);
      expect(isManagerRole({ role: 'MASTER' })).toBe(true);
    });

    it('returns false for STAFF and USER accounts', () => {
      expect(isManagerRole({ role: 'STAFF' })).toBe(false);
      expect(isManagerRole({ role: 'USER' })).toBe(false);
      expect(isManagerRole(null)).toBe(false);
      expect(isManagerRole(undefined)).toBe(false);
    });
  });

  describe('hasPermission', () => {
    const allPermissions: StaffPermission[] = [
      'orders:read',
      'orders:update',
      'orders:message',
      'orders:cancel',
      'orders:deliver',
    ];

    it('checks permissions array for ADMIN accounts just like STAFF', () => {
      const limitedAdmin = { role: 'ADMIN' as const, permissions: ['orders:read'] };
      expect(hasPermission(limitedAdmin, 'orders:read')).toBe(true);
      expect(hasPermission(limitedAdmin, 'orders:update')).toBe(false);
    });

    it('grants all permissions to MASTER regardless of permissions array', () => {
      const masterUser = { role: 'MASTER' as const, permissions: [] };
      for (const perm of allPermissions) {
        expect(hasPermission(masterUser, perm)).toBe(true);
      }
    });

    it('strictly checks permissions array for STAFF users', () => {
      const staffUser = {
        role: 'STAFF' as const,
        permissions: ['orders:read', 'orders:update'],
      };

      expect(hasPermission(staffUser, 'orders:read')).toBe(true);
      expect(hasPermission(staffUser, 'orders:update')).toBe(true);
      expect(hasPermission(staffUser, 'orders:message')).toBe(false);
      expect(hasPermission(staffUser, 'orders:cancel')).toBe(false);
      expect(hasPermission(staffUser, 'orders:deliver')).toBe(false);
    });

    it('denies permissions for USER customer accounts even if permissions exist', () => {
      const customerUser = {
        role: 'USER' as const,
        permissions: ['orders:read', 'orders:update'],
      };

      expect(hasPermission(customerUser, 'orders:read')).toBe(false);
      expect(hasPermission(customerUser, 'orders:cancel')).toBe(false);
    });

    it('denies all permissions when user is null or undefined', () => {
      expect(hasPermission(null, 'orders:read')).toBe(false);
      expect(hasPermission(undefined, 'orders:read')).toBe(false);
    });
  });

  describe('Staff Login Guard against USER role', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('rejects customer USER account and clears tokens', async () => {
      const clearTokensSpy = vi.spyOn(tokenStorage, 'clearTokens').mockResolvedValue();
      const setTokensSpy = vi.spyOn(tokenStorage, 'setTokens').mockResolvedValue();

      const userSession: AuthSession = {
        id: 'cust-123',
        name: 'Jane Customer',
        email: 'jane@example.com',
        role: 'USER',
        permissions: [],
        emailVerified: true,
        accessToken: 'access-user-token',
        refreshToken: 'refresh-user-token',
      };

      vi.spyOn(apiClient, 'post').mockResolvedValue(userSession);

      await expect(
        authApi.login({ identifier: 'jane@example.com', password: 'password123' }),
      ).rejects.toThrow(ApiError);

      try {
        await authApi.login({ identifier: 'jane@example.com', password: 'password123' });
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.statusCode).toBe(403);
        expect(apiErr.code).toBe('STAFF_ACCESS_REQUIRED');
      }

      expect(clearTokensSpy).toHaveBeenCalled();
      expect(setTokensSpy).not.toHaveBeenCalled();
    });

    it('accepts STAFF account and persists tokens', async () => {
      const setTokensSpy = vi.spyOn(tokenStorage, 'setTokens').mockResolvedValue();

      const staffSession: AuthSession = {
        id: 'staff-456',
        name: 'Craftsman Bob',
        email: 'bob@timmbr.com',
        role: 'STAFF',
        permissions: ['orders:read', 'orders:update'],
        emailVerified: true,
        accessToken: 'staff-access-jwt',
        refreshToken: 'staff-refresh-jwt',
      };

      vi.spyOn(apiClient, 'post').mockResolvedValue(staffSession);

      const result = await authApi.login({
        identifier: 'bob@timmbr.com',
        password: 'password123',
      });

      expect(result.id).toBe('staff-456');
      expect(result.role).toBe('STAFF');
      expect(setTokensSpy).toHaveBeenCalledWith({
        accessToken: 'staff-access-jwt',
        refreshToken: 'staff-refresh-jwt',
      });
    });
  });
});
