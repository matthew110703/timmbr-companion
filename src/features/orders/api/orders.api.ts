import { apiClient } from '@/lib/api/client';
import type { PaginatedResult } from '@/lib/api/types';
import type {
  AdminOrderListItemDto,
  ApproveCancellationDto,
  CancelOrderDto,
  CancelOrderResponseDto,
  CreateCustomerUpdateDto,
  CreateOrderActivityDto,
  DashboardStatsResponseDto,
  GetOrdersQueryParams,
  OrderActivityResponseDto,
  OrderResponseDto,
  OrderTimelineResponseDto,
  UpdateOrderStatusDto,
} from '../types/order.types';
import { isEligibleFulfilmentOrder } from '../utils/order-formatters';

export async function getDashboardStats(): Promise<DashboardStatsResponseDto> {
  const result = await apiClient.get<DashboardStatsResponseDto>('/admin/orders/dashboard-stats');

  return {
    ...result,
    recentOrders: (result.recentOrders || []).filter(isEligibleFulfilmentOrder),
  };
}

export async function getOrders(
  params: GetOrdersQueryParams = {},
): Promise<PaginatedResult<AdminOrderListItemDto>> {
  const queryParams: Record<string, string | number | boolean | undefined> = {};

  if (params.page !== undefined) queryParams.page = params.page;
  if (params.limit !== undefined) queryParams.limit = params.limit;
  if (params.status !== undefined) queryParams.status = params.status;
  if (params.search !== undefined && params.search.trim()) {
    queryParams.search = params.search.trim();
  }
  if (params.unacknowledgedOnly !== undefined) {
    queryParams.unacknowledgedOnly = params.unacknowledgedOnly;
  }
  if (params.paidOnly !== undefined) {
    queryParams.paidOnly = params.paidOnly;
  }
  if (params.sortBy !== undefined) queryParams.sortBy = params.sortBy;
  if (params.order !== undefined) queryParams.order = params.order;

  const result = await apiClient.getPaginated<AdminOrderListItemDto>('/admin/orders', {
    params: queryParams,
  });

  return {
    ...result,
    data: (result.data || []).filter(isEligibleFulfilmentOrder),
  };
}

export async function getOrderById(orderId: string): Promise<OrderResponseDto> {
  return apiClient.get<OrderResponseDto>(`/admin/orders/${orderId}`);
}

export async function getOrderActivities(orderId: string): Promise<OrderTimelineResponseDto> {
  return apiClient.get<OrderTimelineResponseDto>(`/admin/orders/${orderId}/activities`);
}

export async function acknowledgeOrder(orderId: string): Promise<OrderResponseDto> {
  return apiClient.post<OrderResponseDto>(`/admin/orders/${orderId}/acknowledge`);
}

export async function updateOrderStatus(
  orderId: string,
  data: UpdateOrderStatusDto,
): Promise<OrderResponseDto> {
  return apiClient.patch<OrderResponseDto>(`/admin/orders/${orderId}/status`, data);
}

export async function recordOrderActivity(
  orderId: string,
  data: CreateOrderActivityDto,
): Promise<OrderActivityResponseDto> {
  return apiClient.post<OrderActivityResponseDto>(`/admin/orders/${orderId}/activities`, data);
}

export async function createCustomerUpdate(
  orderId: string,
  data: CreateCustomerUpdateDto,
): Promise<OrderActivityResponseDto> {
  return apiClient.post<OrderActivityResponseDto>(
    `/admin/orders/${orderId}/customer-updates`,
    data,
  );
}

export async function cancelOrder(
  orderId: string,
  data: CancelOrderDto,
): Promise<CancelOrderResponseDto> {
  return apiClient.post<CancelOrderResponseDto>(`/admin/orders/${orderId}/cancel`, data);
}

export async function approveCancellation(
  orderId: string,
  data?: ApproveCancellationDto,
): Promise<CancelOrderResponseDto> {
  return apiClient.post<CancelOrderResponseDto>(
    `/admin/orders/${orderId}/cancel/approve`,
    data ?? {},
  );
}
