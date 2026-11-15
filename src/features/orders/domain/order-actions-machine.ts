import type { AuthUser, StaffPermission, UserProfileDto } from '@/features/auth/types/auth.types';
import { hasPermission, isManagerRole } from '@/features/auth/utils/permissions';
import type { OrderStatus } from '../types/order.types';

export type ManufacturingEventType =
  | 'MATERIAL_PREPARATION'
  | 'MANUFACTURING_STARTED'
  | 'MANUFACTURING_UPDATE'
  | 'QUALITY_CHECK_COMPLETED'
  | 'READY_FOR_DISPATCH'
  | 'DELIVERY_COORDINATION';

export const ALL_MANUFACTURING_EVENT_TYPES: ManufacturingEventType[] = [
  'MATERIAL_PREPARATION',
  'MANUFACTURING_STARTED',
  'MANUFACTURING_UPDATE',
  'QUALITY_CHECK_COMPLETED',
  'READY_FOR_DISPATCH',
  'DELIVERY_COORDINATION',
];

export type CancellationMode = 'DIRECT' | 'REQUEST_APPROVAL' | 'NONE';

export type NextStatusTransition = 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | null;

export interface OrderActionContext {
  status: OrderStatus;
  acknowledgedAt?: string | Date | null;
  hasManufacturingStarted?: boolean;
  hasPendingCancellationRequest?: boolean;
  user:
    | { role?: string | null; permissions?: (StaffPermission | string)[] | null }
    | AuthUser
    | UserProfileDto
    | null
    | undefined;
}

export interface ResolvedOrderActions {
  canAcknowledge: boolean;
  nextStatusTransition: NextStatusTransition;
  allowedManufacturingEvents: ManufacturingEventType[];
  canSendCustomerUpdate: boolean;
  cancellationMode: CancellationMode;
  canApproveCancellation: boolean;
  hasAnyAction: boolean;
}

export function resolveAvailableOrderActions(context: OrderActionContext): ResolvedOrderActions {
  const {
    status,
    acknowledgedAt,
    hasManufacturingStarted = false,
    hasPendingCancellationRequest = false,
    user,
  } = context;

  const hasUpdatePermission = hasPermission(user, 'orders:update');
  const hasDeliverPermission = hasPermission(user, 'orders:deliver');
  const hasMessagePermission = hasPermission(user, 'orders:message');
  const hasCancelPermission = hasPermission(user, 'orders:cancel');
  const isManager = isManagerRole(user);

  const canAcknowledge = status === 'CONFIRMED' && !acknowledgedAt && hasUpdatePermission;

  let nextStatusTransition: NextStatusTransition = null;
  if (status === 'CONFIRMED' && hasUpdatePermission) {
    nextStatusTransition = 'PROCESSING';
  } else if (status === 'PROCESSING' && hasUpdatePermission) {
    nextStatusTransition = 'SHIPPED';
  } else if (status === 'SHIPPED' && hasUpdatePermission && hasDeliverPermission) {
    nextStatusTransition = 'DELIVERED';
  }

  let allowedManufacturingEvents: ManufacturingEventType[] = [];
  if (status === 'PROCESSING' && hasUpdatePermission) {
    allowedManufacturingEvents = [...ALL_MANUFACTURING_EVENT_TYPES];
  } else if (status === 'SHIPPED' && hasUpdatePermission) {
    allowedManufacturingEvents = ['DELIVERY_COORDINATION'];
  }

  const canSendCustomerUpdate =
    (status === 'CONFIRMED' || status === 'PROCESSING' || status === 'SHIPPED') &&
    hasMessagePermission;

  let cancellationMode: CancellationMode = 'NONE';
  if (
    (status === 'CONFIRMED' || status === 'PROCESSING') &&
    hasCancelPermission &&
    !hasPendingCancellationRequest
  ) {
    cancellationMode = hasManufacturingStarted ? 'REQUEST_APPROVAL' : 'DIRECT';
  }

  const canApproveCancellation =
    (status === 'CONFIRMED' || status === 'PROCESSING') &&
    Boolean(hasPendingCancellationRequest) &&
    isManager;

  const hasAnyAction =
    canAcknowledge ||
    nextStatusTransition !== null ||
    allowedManufacturingEvents.length > 0 ||
    canSendCustomerUpdate ||
    cancellationMode !== 'NONE' ||
    canApproveCancellation;

  return {
    canAcknowledge,
    nextStatusTransition,
    allowedManufacturingEvents,
    canSendCustomerUpdate,
    cancellationMode,
    canApproveCancellation,
    hasAnyAction,
  };
}
