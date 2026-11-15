import type { GetOrdersQueryParams } from '../types/order.types';

export const ordersKeys = {
  all: ['orders'] as const,
  dashboardStats: () => [...ordersKeys.all, 'dashboard-stats'] as const,
  lists: () => [...ordersKeys.all, 'list'] as const,
  list: (filters?: Partial<GetOrdersQueryParams>) =>
    [...ordersKeys.lists(), filters ?? {}] as const,
  details: () => [...ordersKeys.all, 'detail'] as const,
  detail: (orderId: string) => [...ordersKeys.details(), orderId] as const,
  activities: (orderId: string) => [...ordersKeys.detail(orderId), 'activities'] as const,
};
