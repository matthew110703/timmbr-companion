import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersKeys } from '../api/orders.keys';
import {
  acknowledgeOrder,
  approveCancellation,
  cancelOrder,
  createCustomerUpdate,
  recordOrderActivity,
  updateOrderStatus,
} from '../api/orders.api';
import type {
  ApproveCancellationDto,
  CancelOrderDto,
  CancelOrderResponseDto,
  CreateCustomerUpdateDto,
  CreateOrderActivityDto,
  OrderActivityResponseDto,
  OrderResponseDto,
  UpdateOrderStatusDto,
} from '../types/order.types';
import { generateClientUuid } from '../utils/client-uuid';

export function useOrderMutations(orderId: string) {
  const queryClient = useQueryClient();

  const invalidateOrderQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ordersKeys.detail(orderId) }),
      queryClient.invalidateQueries({ queryKey: ordersKeys.activities(orderId) }),
      queryClient.invalidateQueries({ queryKey: ordersKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: ordersKeys.dashboardStats() }),
    ]);
  };

  const acknowledge = useMutation<OrderResponseDto, Error, void>({
    mutationFn: () => acknowledgeOrder(orderId),
    onSuccess: invalidateOrderQueries,
  });

  const updateStatus = useMutation<OrderResponseDto, Error, UpdateOrderStatusDto>({
    mutationFn: (data: UpdateOrderStatusDto) => updateOrderStatus(orderId, data),
    onSuccess: invalidateOrderQueries,
  });

  const recordActivity = useMutation<OrderActivityResponseDto, Error, CreateOrderActivityDto>({
    mutationFn: (data: CreateOrderActivityDto) =>
      recordOrderActivity(orderId, {
        ...data,
        idempotencyKey: data.idempotencyKey || generateClientUuid(),
      }),
    onSuccess: invalidateOrderQueries,
  });

  const sendCustomerUpdate = useMutation<OrderActivityResponseDto, Error, CreateCustomerUpdateDto>({
    mutationFn: (data: CreateCustomerUpdateDto) =>
      createCustomerUpdate(orderId, {
        ...data,
        idempotencyKey: data.idempotencyKey || generateClientUuid(),
      }),
    onSuccess: invalidateOrderQueries,
  });

  const cancel = useMutation<CancelOrderResponseDto, Error, CancelOrderDto>({
    mutationFn: (data: CancelOrderDto) => cancelOrder(orderId, data),
    onSuccess: invalidateOrderQueries,
  });

  const approveCancel = useMutation<
    CancelOrderResponseDto,
    Error,
    ApproveCancellationDto | undefined
  >({
    mutationFn: (data?: ApproveCancellationDto) => approveCancellation(orderId, data),
    onSuccess: invalidateOrderQueries,
  });

  return {
    acknowledge,
    updateStatus,
    recordActivity,
    sendCustomerUpdate,
    cancel,
    approveCancel,
    isPending:
      acknowledge.isPending ||
      updateStatus.isPending ||
      recordActivity.isPending ||
      sendCustomerUpdate.isPending ||
      cancel.isPending ||
      approveCancel.isPending,
  };
}
