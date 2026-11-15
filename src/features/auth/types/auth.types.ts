export type UserRole = 'USER' | 'STAFF' | 'ADMIN' | 'MASTER';

export type StaffPermission =
  'orders:read' | 'orders:update' | 'orders:message' | 'orders:cancel' | 'orders:deliver';

export const STAFF_PERMISSIONS: readonly StaffPermission[] = [
  'orders:read',
  'orders:update',
  'orders:message',
  'orders:cancel',
  'orders:deliver',
] as const;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: string[];
  phone?: string | null;
  emailVerified?: boolean;
}

export interface AuthSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: string[];
  emailVerified: boolean;
  accessToken: string;
  refreshToken: string;
  isNewUser?: boolean;
  hasPassword?: boolean;
  passwordSetupToken?: string;
}

export interface UserProfileDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: string[];
  phone: string | null;
  emailVerified: boolean;
  hasPassword: boolean;
  linkedProviders: string[];
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}
