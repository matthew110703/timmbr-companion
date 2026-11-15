import React from 'react';
import { Badge, BadgeText } from '@timmbr/native-ui';
import type { OrderStatus } from '../types/order.types';

export interface OrderStatusBadgeProps {
  status: OrderStatus;
  isUnacknowledged?: boolean;
  label?: string;
  className?: string;
}

export function OrderStatusBadge({
  status,
  isUnacknowledged = false,
  label,
  className = '',
}: OrderStatusBadgeProps) {
  const renderBadge = (
    action: React.ComponentProps<typeof Badge>['action'],
    badgeClassName: string,
    textClassName: string,
    text: string,
  ) => (
    <Badge variant="solid" action={action} className={`shrink-0 ${badgeClassName} ${className}`}>
      <BadgeText
        numberOfLines={1}
        style={{ fontFamily: 'Manrope-SemiBold', fontWeight: 'normal' }}
        className={`tracking-normal ${textClassName}`}
      >
        {text}
      </BadgeText>
    </Badge>
  );

  if (status === 'CONFIRMED' && isUnacknowledged) {
    return renderBadge(
      'warning',
      'bg-amber-600 border-amber-600',
      'text-white',
      label ?? 'New Order',
    );
  }

  switch (status) {
    case 'CONFIRMED':
      return renderBadge(
        'primary',
        'bg-primary border-primary',
        'text-white',
        label ?? 'Confirmed',
      );
    case 'PROCESSING':
      return renderBadge(
        'primary',
        'bg-[#C0643A] border-[#C0643A]',
        'text-white',
        label ?? 'Processing',
      );
    case 'SHIPPED':
      return renderBadge(
        'warning',
        'bg-[#CD8361] border-[#CD8361]',
        'text-white',
        label ?? 'Out for Delivery',
      );
    case 'DELIVERED':
      return renderBadge(
        'success',
        'bg-emerald-600 border-emerald-600',
        'text-white',
        label ?? 'Delivered',
      );
    case 'CANCELLED':
      return renderBadge(
        'error',
        'bg-destructive border-destructive',
        'text-white',
        label ?? 'Cancelled',
      );
    case 'PENDING':
    default:
      return renderBadge(
        'muted',
        'bg-muted border-border',
        'text-muted-foreground',
        label ?? status,
      );
  }
}
