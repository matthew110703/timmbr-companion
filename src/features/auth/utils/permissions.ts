import type { AuthUser, StaffPermission, UserProfileDto, UserRole } from '../types/auth.types';

export function isStaffEligibleRole(role: UserRole | string | null | undefined): boolean {
  return role === 'STAFF' || role === 'ADMIN' || role === 'MASTER';
}

export function isManagerRole(
  user: { role?: UserRole | string | null } | null | undefined,
): boolean {
  if (!user || !user.role) return false;
  return user.role === 'ADMIN' || user.role === 'MASTER';
}

export function hasPermission(
  user:
    | { role?: UserRole | string | null; permissions?: (StaffPermission | string)[] | null }
    | AuthUser
    | UserProfileDto
    | null
    | undefined,
  permission: StaffPermission,
): boolean {
  if (!user || !user.role) return false;

  if (user.role === 'MASTER') {
    return true;
  }

  if (user.role === 'ADMIN' || user.role === 'STAFF') {
    return Array.isArray(user.permissions) && user.permissions.includes(permission);
  }

  return false;
}
