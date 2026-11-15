import { describe, it, expect, vi, beforeEach } from 'vitest';
import { acceptInviteSchema } from '../schemas/accept-invite.schema';
import { authApi } from '../api/auth.api';
import { extractInviteToken } from '../utils/invite-token';
import { apiClient } from '@/lib/api/client';

describe('Accept Invite Flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('acceptInviteSchema', () => {
    it('accepts matching strong passwords meeting policy', () => {
      const parsed = acceptInviteSchema.safeParse({
        password: 'StrongPassword1!',
        confirmPassword: 'StrongPassword1!',
      });
      expect(parsed.success).toBe(true);
    });

    it('rejects weak passwords lacking uppercase, number, or symbol', () => {
      const parsed = acceptInviteSchema.safeParse({
        password: 'weakpassword',
        confirmPassword: 'weakpassword',
      });
      expect(parsed.success).toBe(false);
    });

    it('rejects mismatched confirmation password', () => {
      const parsed = acceptInviteSchema.safeParse({
        password: 'StrongPassword1!',
        confirmPassword: 'OtherPassword1!',
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe('authApi invite endpoints', () => {
    it('validates token with type INVITE via skipAuth', async () => {
      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(undefined);

      await authApi.validateInviteToken('tok-123');

      expect(getSpy).toHaveBeenCalledWith('/auth/validate-token', {
        params: { token: 'tok-123', type: 'INVITE' },
        skipAuth: true,
      });
    });

    it('submits token and password to /auth/accept-invite via skipAuth', async () => {
      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(undefined);

      await authApi.acceptInvite('tok-123', 'StrongPassword1!');

      expect(postSpy).toHaveBeenCalledWith(
        '/auth/accept-invite',
        { token: 'tok-123', password: 'StrongPassword1!' },
        { skipAuth: true },
      );
    });
  });

  describe('extractInviteToken', () => {
    it('extracts token from custom timmbr-companion deep links', () => {
      const token = '77646536893dc2c4da9b5716fbc11a42c9ae91f39e755c9cde9bf67c19e8c362';
      expect(extractInviteToken(`  timmbr-companion://accept-invite?token=${token}  `)).toBe(token);
    });

    it('extracts token from standard web URLs with additional params or hashes', () => {
      expect(
        extractInviteToken(
          'https://admin.timmbr.com/accept-invite?source=email&token=abc123%20xyz#top',
        ),
      ).toBe('abc123 xyz');
    });

    it('accepts raw token strings and trims whitespace', () => {
      expect(extractInviteToken('  raw-token-value  ')).toBe('raw-token-value');
      expect(extractInviteToken('   ')).toBe('');
    });
  });
});
