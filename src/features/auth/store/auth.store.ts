import { create } from 'zustand';
import { apiClient } from '@/lib/api/client';
import { isTransientError } from '@/lib/api/errors';
import { tokenStorage } from '@/lib/api/token-storage';
import { authApi } from '../api/auth.api';
import type { LoginFormData } from '../schemas/login.schema';
import type { AuthUser } from '../types/auth.types';
import { isStaffEligibleRole } from '../utils/permissions';

export type AuthStatus = 'idle' | 'hydrating' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
  error: string | null;
  hydrate: () => Promise<void>;
  signIn: (dto: LoginFormData) => Promise<void>;
  signOut: () => Promise<void>;
  signOutAll: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: 'idle',
  error: null,

  clearError: () => set({ error: null }),

  hydrate: async () => {
    if (get().status === 'hydrating') return;
    set({ status: 'hydrating', error: null });

    try {
      const tokens = await tokenStorage.getTokens();
      if (!tokens?.accessToken) {
        set({ user: null, status: 'unauthenticated' });
        return;
      }

      const profile = await authApi.getMe();
      if (!isStaffEligibleRole(profile.role)) {
        await tokenStorage.clearTokens();
        set({
          user: null,
          status: 'unauthenticated',
          error: 'Account does not have staff permissions',
        });
        return;
      }

      const user: AuthUser = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        permissions: profile.permissions || [],
        phone: profile.phone,
        emailVerified: profile.emailVerified,
      };

      set({ user, status: 'authenticated', error: null });
    } catch (err: unknown) {
      // Keep stored tokens when the server is merely unreachable so the
      // session is restored on the next launch instead of forcing a re-login.
      if (!isTransientError(err)) {
        await tokenStorage.clearTokens();
      }
      set({ user: null, status: 'unauthenticated' });
    }
  },

  signIn: async (dto: LoginFormData) => {
    set({ error: null });
    try {
      const session = await authApi.login(dto);

      const user: AuthUser = {
        id: session.id,
        name: session.name,
        email: session.email,
        role: session.role,
        permissions: session.permissions || [],
        emailVerified: session.emailVerified,
      };

      set({ user, status: 'authenticated', error: null });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to sign in. Please check your credentials.';
      set({ error: errorMessage });
      throw err;
    }
  },

  signOut: async () => {
    try {
      await authApi.logout();
    } finally {
      set({ user: null, status: 'unauthenticated', error: null });
    }
  },

  signOutAll: async () => {
    try {
      await authApi.logoutAll();
    } finally {
      set({ user: null, status: 'unauthenticated', error: null });
    }
  },
}));

apiClient.setUnauthorizedHandler(() => {
  const currentStatus = useAuthStore.getState().status;
  if (currentStatus === 'authenticated') {
    useAuthStore.getState().signOut();
  }
});
