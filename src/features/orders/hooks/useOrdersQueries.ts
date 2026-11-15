import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { PaginatedResult } from '@/lib/api/types';
import { getDashboardStats, getOrderActivities, getOrderById, getOrders } from '../api/orders.api';
import { ordersKeys } from '../api/orders.keys';
import type {
  AdminOrderListItemDto,
  DashboardStatsResponseDto,
  GetOrdersQueryParams,
  OrderResponseDto,
  OrderTimelineResponseDto,
} from '../types/order.types';

export function useDashboardStatsQuery() {
  return useQuery<DashboardStatsResponseDto>({
    queryKey: ordersKeys.dashboardStats(),
    queryFn: () => getDashboardStats(),
    refetchInterval: 30000,
  });
}

export function useInfiniteOrdersQuery(filters: Partial<GetOrdersQueryParams> = {}) {
  return useInfiniteQuery<PaginatedResult<AdminOrderListItemDto>>({
    queryKey: ordersKeys.list(filters),
    queryFn: ({ pageParam = 1 }) =>
      getOrders({
        ...filters,
        page: pageParam as number,
        limit: filters.limit ?? 15,
      }),
    getNextPageParam: (lastPage) => {
      const meta = lastPage.meta;
      if (meta && meta.hasNextPage) {
        return (meta.page ?? 1) + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });
}

export function useOrderDetailQuery(orderId: string) {
  return useQuery<OrderResponseDto>({
    queryKey: ordersKeys.detail(orderId),
    queryFn: () => getOrderById(orderId),
    enabled: Boolean(orderId),
  });
}

export function useOrderActivitiesQuery(orderId: string) {
  return useQuery<OrderTimelineResponseDto>({
    queryKey: ordersKeys.activities(orderId),
    queryFn: () => getOrderActivities(orderId),
    enabled: Boolean(orderId),
  });
}
