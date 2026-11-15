import { describe, expect, it } from 'vitest';
import {
  ALL_MANUFACTURING_EVENT_TYPES,
  resolveAvailableOrderActions,
} from '../domain/order-actions-machine';
import type { AuthUser } from '@/features/auth/types/auth.types';

describe('order-actions-machine (Pure Domain Action State Machine)', () => {
  const staffAllPermissions: AuthUser = {
    id: 'user-staff-1',
    name: 'Staff Member',
    email: 'staff@timmbr.com',
    role: 'STAFF',
    permissions: [
      'orders:read',
      'orders:update',
      'orders:message',
      'orders:cancel',
      'orders:deliver',
    ],
  };

  const staffReadOnly: AuthUser = {
    id: 'user-staff-2',
    name: 'Read Only Staff',
    email: 'readonly@timmbr.com',
    role: 'STAFF',
    permissions: ['orders:read'],
  };

  const staffNoDeliver: AuthUser = {
    id: 'user-staff-3',
    name: 'Workshop Staff',
    email: 'workshop@timmbr.com',
    role: 'STAFF',
    permissions: ['orders:read', 'orders:update', 'orders:message', 'orders:cancel'],
  };

  const adminManager: AuthUser = {
    id: 'user-admin-1',
    name: 'Admin Manager',
    email: 'admin@timmbr.com',
    role: 'ADMIN',
    permissions: [],
  };

  const masterManager: AuthUser = {
    id: 'user-master-1',
    name: 'Master Account',
    email: 'master@timmbr.com',
    role: 'MASTER',
    permissions: [],
  };

  describe('Acknowledgement rules', () => {
    it('allows acknowledgement when CONFIRMED, acknowledgedAt is null, and user has orders:update', () => {
      const actions = resolveAvailableOrderActions({
        status: 'CONFIRMED',
        acknowledgedAt: null,
        user: staffAllPermissions,
      });

      expect(actions.canAcknowledge).toBe(true);
    });

    it('disallows acknowledgement when order is already acknowledged', () => {
      const actions = resolveAvailableOrderActions({
        status: 'CONFIRMED',
        acknowledgedAt: '2026-11-08T10:00:00Z',
        user: staffAllPermissions,
      });

      expect(actions.canAcknowledge).toBe(false);
    });

    it('disallows acknowledgement when status is not CONFIRMED', () => {
      const statuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;
      for (const status of statuses) {
        const actions = resolveAvailableOrderActions({
          status,
          acknowledgedAt: null,
          user: staffAllPermissions,
        });
        expect(actions.canAcknowledge).toBe(false);
      }
    });

    it('disallows acknowledgement if user lacks orders:update permission', () => {
      const actions = resolveAvailableOrderActions({
        status: 'CONFIRMED',
        acknowledgedAt: null,
        user: staffReadOnly,
      });

      expect(actions.canAcknowledge).toBe(false);
    });

    it('allows acknowledgement for MASTER unconditionally and for ADMIN when granted orders:update', () => {
      const adminNoPerms = resolveAvailableOrderActions({
        status: 'CONFIRMED',
        acknowledgedAt: null,
        user: adminManager,
      });
      const adminWithPerm = resolveAvailableOrderActions({
        status: 'CONFIRMED',
        acknowledgedAt: null,
        user: { ...adminManager, permissions: ['orders:update'] },
      });
      const masterActions = resolveAvailableOrderActions({
        status: 'CONFIRMED',
        acknowledgedAt: null,
        user: masterManager,
      });

      expect(adminNoPerms.canAcknowledge).toBe(false);
      expect(adminWithPerm.canAcknowledge).toBe(true);
      expect(masterActions.canAcknowledge).toBe(true);
    });
  });

  describe('Status transition rules', () => {
    it('transitions CONFIRMED -> PROCESSING when user has orders:update', () => {
      const actions = resolveAvailableOrderActions({
        status: 'CONFIRMED',
        user: staffAllPermissions,
      });

      expect(actions.nextStatusTransition).toBe('PROCESSING');
    });

    it('transitions PROCESSING -> SHIPPED when user has orders:update', () => {
      const actions = resolveAvailableOrderActions({
        status: 'PROCESSING',
        user: staffAllPermissions,
      });

      expect(actions.nextStatusTransition).toBe('SHIPPED');
    });

    it('transitions SHIPPED -> DELIVERED when user has orders:update AND orders:deliver', () => {
      const actions = resolveAvailableOrderActions({
        status: 'SHIPPED',
        user: staffAllPermissions,
      });

      expect(actions.nextStatusTransition).toBe('DELIVERED');
    });

    it('does NOT transition SHIPPED -> DELIVERED if user lacks orders:deliver', () => {
      const actions = resolveAvailableOrderActions({
        status: 'SHIPPED',
        user: staffNoDeliver,
      });

      expect(actions.nextStatusTransition).toBeNull();
    });

    it('allows SHIPPED -> DELIVERED for MASTER unconditionally and for ADMIN when granted orders:update and orders:deliver', () => {
      const adminNoPerms = resolveAvailableOrderActions({
        status: 'SHIPPED',
        user: adminManager,
      });
      const adminWithPerms = resolveAvailableOrderActions({
        status: 'SHIPPED',
        user: { ...adminManager, permissions: ['orders:update', 'orders:deliver'] },
      });
      const masterActions = resolveAvailableOrderActions({
        status: 'SHIPPED',
        user: masterManager,
      });

      expect(adminNoPerms.nextStatusTransition).toBeNull();
      expect(adminWithPerms.nextStatusTransition).toBe('DELIVERED');
      expect(masterActions.nextStatusTransition).toBe('DELIVERED');
    });

    it('has no next transition from DELIVERED or CANCELLED', () => {
      const deliveredActions = resolveAvailableOrderActions({
        status: 'DELIVERED',
        user: staffAllPermissions,
      });
      const cancelledActions = resolveAvailableOrderActions({
        status: 'CANCELLED',
        user: staffAllPermissions,
      });

      expect(deliveredActions.nextStatusTransition).toBeNull();
      expect(cancelledActions.nextStatusTransition).toBeNull();
    });
  });

  describe('Manufacturing events rules', () => {
    it('allows all 6 events in PROCESSING status with orders:update', () => {
      const actions = resolveAvailableOrderActions({
        status: 'PROCESSING',
        user: staffAllPermissions,
      });

      expect(actions.allowedManufacturingEvents).toEqual(ALL_MANUFACTURING_EVENT_TYPES);
      expect(actions.allowedManufacturingEvents).toContain('MATERIAL_PREPARATION');
      expect(actions.allowedManufacturingEvents).toContain('MANUFACTURING_STARTED');
      expect(actions.allowedManufacturingEvents).toContain('MANUFACTURING_UPDATE');
      expect(actions.allowedManufacturingEvents).toContain('QUALITY_CHECK_COMPLETED');
      expect(actions.allowedManufacturingEvents).toContain('READY_FOR_DISPATCH');
      expect(actions.allowedManufacturingEvents).toContain('DELIVERY_COORDINATION');
    });

    it('allows only DELIVERY_COORDINATION in SHIPPED status with orders:update', () => {
      const actions = resolveAvailableOrderActions({
        status: 'SHIPPED',
        user: staffAllPermissions,
      });

      expect(actions.allowedManufacturingEvents).toEqual(['DELIVERY_COORDINATION']);
    });

    it('returns empty array if user lacks orders:update in PROCESSING', () => {
      const actions = resolveAvailableOrderActions({
        status: 'PROCESSING',
        user: staffReadOnly,
      });

      expect(actions.allowedManufacturingEvents).toEqual([]);
    });

    it('returns empty array in CONFIRMED, DELIVERED, or CANCELLED', () => {
      for (const status of ['CONFIRMED', 'DELIVERED', 'CANCELLED'] as const) {
        const actions = resolveAvailableOrderActions({
          status,
          user: staffAllPermissions,
        });
        expect(actions.allowedManufacturingEvents).toEqual([]);
      }
    });
  });

  describe('Customer communication rules', () => {
    it('allows customer updates in CONFIRMED, PROCESSING, and SHIPPED with orders:message', () => {
      for (const status of ['CONFIRMED', 'PROCESSING', 'SHIPPED'] as const) {
        const actions = resolveAvailableOrderActions({
          status,
          user: staffAllPermissions,
        });
        expect(actions.canSendCustomerUpdate).toBe(true);
      }
    });

    it('disallows customer updates if user lacks orders:message', () => {
      const actions = resolveAvailableOrderActions({
        status: 'PROCESSING',
        user: staffReadOnly,
      });

      expect(actions.canSendCustomerUpdate).toBe(false);
    });

    it('disallows customer updates in DELIVERED or CANCELLED', () => {
      for (const status of ['DELIVERED', 'CANCELLED'] as const) {
        const actions = resolveAvailableOrderActions({
          status,
          user: staffAllPermissions,
        });
        expect(actions.canSendCustomerUpdate).toBe(false);
      }
    });
  });

  describe('Two-tier cancellation rules', () => {
    it('returns DIRECT cancellation mode before manufacturing has started', () => {
      const confirmedActions = resolveAvailableOrderActions({
        status: 'CONFIRMED',
        hasManufacturingStarted: false,
        user: staffAllPermissions,
      });
      const processingActions = resolveAvailableOrderActions({
        status: 'PROCESSING',
        hasManufacturingStarted: false,
        user: staffAllPermissions,
      });

      expect(confirmedActions.cancellationMode).toBe('DIRECT');
      expect(processingActions.cancellationMode).toBe('DIRECT');
    });

    it('returns REQUEST_APPROVAL cancellation mode once manufacturing has started', () => {
      const actions = resolveAvailableOrderActions({
        status: 'PROCESSING',
        hasManufacturingStarted: true,
        user: staffAllPermissions,
      });

      expect(actions.cancellationMode).toBe('REQUEST_APPROVAL');
    });

    it('returns NONE cancellation mode if a cancellation request is already pending', () => {
      const actions = resolveAvailableOrderActions({
        status: 'PROCESSING',
        hasManufacturingStarted: true,
        hasPendingCancellationRequest: true,
        user: staffAllPermissions,
      });

      expect(actions.cancellationMode).toBe('NONE');
    });

    it('returns NONE cancellation mode if user lacks orders:cancel', () => {
      const actions = resolveAvailableOrderActions({
        status: 'CONFIRMED',
        hasManufacturingStarted: false,
        user: staffReadOnly,
      });

      expect(actions.cancellationMode).toBe('NONE');
    });

    it('returns NONE cancellation mode in SHIPPED, DELIVERED, or CANCELLED', () => {
      for (const status of ['SHIPPED', 'DELIVERED', 'CANCELLED'] as const) {
        const actions = resolveAvailableOrderActions({
          status,
          hasManufacturingStarted: false,
          user: staffAllPermissions,
        });
        expect(actions.cancellationMode).toBe('NONE');
      }
    });
  });

  describe('Manager cancellation approval rules', () => {
    it('allows manager approval when pendingCancellationRequest is true and user is ADMIN', () => {
      const actions = resolveAvailableOrderActions({
        status: 'PROCESSING',
        hasPendingCancellationRequest: true,
        user: adminManager,
      });

      expect(actions.canApproveCancellation).toBe(true);
    });

    it('allows manager approval when pendingCancellationRequest is true and user is MASTER', () => {
      const actions = resolveAvailableOrderActions({
        status: 'PROCESSING',
        hasPendingCancellationRequest: true,
        user: masterManager,
      });

      expect(actions.canApproveCancellation).toBe(true);
    });

    it('disallows approval if user is ordinary STAFF even if they have orders:cancel', () => {
      const actions = resolveAvailableOrderActions({
        status: 'PROCESSING',
        hasPendingCancellationRequest: true,
        user: staffAllPermissions,
      });

      expect(actions.canApproveCancellation).toBe(false);
    });

    it('disallows approval if there is no pendingCancellationRequest', () => {
      const actions = resolveAvailableOrderActions({
        status: 'PROCESSING',
        hasPendingCancellationRequest: false,
        user: adminManager,
      });

      expect(actions.canApproveCancellation).toBe(false);
    });
  });

  describe('hasAnyAction aggregate flag', () => {
    it('is true when any single action is permitted', () => {
      const actions = resolveAvailableOrderActions({
        status: 'CONFIRMED',
        acknowledgedAt: null,
        user: staffAllPermissions,
      });

      expect(actions.hasAnyAction).toBe(true);
    });

    it('is false for terminal CANCELLED order with no actions', () => {
      const actions = resolveAvailableOrderActions({
        status: 'CANCELLED',
        user: staffAllPermissions,
      });

      expect(actions.hasAnyAction).toBe(false);
    });

    it('is false for read-only user on DELIVERED order', () => {
      const actions = resolveAvailableOrderActions({
        status: 'DELIVERED',
        user: staffReadOnly,
      });

      expect(actions.hasAnyAction).toBe(false);
    });
  });
});
