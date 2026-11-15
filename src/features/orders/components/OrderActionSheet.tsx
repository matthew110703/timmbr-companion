import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Layers,
  MessageSquare,
  Truck,
  Wrench,
  XCircle,
} from 'lucide-react-native';
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetItem,
  VStack,
  HStack,
  Text,
  Heading,
  Card,
  Icon,
} from '@timmbr/native-ui';
import type { AuthUser, UserProfileDto } from '@/features/auth/types/auth.types';
import { resolveAvailableOrderActions } from '../domain/order-actions-machine';
import { useOrderMutations } from '../hooks/useOrderMutations';
import { generateClientUuid } from '../utils/client-uuid';
import type { OrderResponseDto, OrderTimelineResponseDto } from '../types/order.types';
import { ManufacturingEventForm } from './ManufacturingEventForm';
import { CustomerUpdateForm } from './CustomerUpdateForm';
import { CancelOrderForm } from './CancelOrderForm';
import { ApproveCancellationForm } from './ApproveCancellationForm';
import { DeliveryConfirmationForm } from './DeliveryConfirmationForm';
import { ConfirmStatusChange } from './ConfirmStatusChange';
import { OrderStatusBadge } from './OrderStatusBadge';
import { orderStrings } from '@/strings/orders';

export interface OrderActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderResponseDto;
  timeline?: OrderTimelineResponseDto | null;
  user: AuthUser | UserProfileDto | null;
}

type ActionSheetView =
  | 'MENU'
  | 'CONFIRM_ACKNOWLEDGE'
  | 'CONFIRM_PROCESSING'
  | 'MFG_EVENT'
  | 'CUSTOMER_UPDATE'
  | 'CANCEL'
  | 'APPROVE_CANCEL'
  | 'DISPATCH'
  | 'DELIVER';

export function OrderActionSheet({
  isOpen,
  onClose,
  order,
  timeline,
  user,
}: OrderActionSheetProps) {
  const [view, setView] = useState<ActionSheetView>('MENU');
  // One key per opened form, reused across resubmits so a retry after an
  // ambiguous failure (e.g. timeout) cannot record the activity twice.
  const [idempotencyKey, setIdempotencyKey] = useState(generateClientUuid);

  const openForm = (formView: ActionSheetView) => {
    setIdempotencyKey(generateClientUuid());
    setView(formView);
  };

  const mutations = useOrderMutations(order.id);

  const actions = useMemo(() => {
    return resolveAvailableOrderActions({
      status: order.status,
      acknowledgedAt: order.acknowledgedAt,
      hasManufacturingStarted: timeline?.hasManufacturingStarted ?? false,
      hasPendingCancellationRequest: Boolean(timeline?.pendingCancellationRequest),
      user,
    });
  }, [
    order.status,
    order.acknowledgedAt,
    timeline?.hasManufacturingStarted,
    timeline?.pendingCancellationRequest,
    user,
  ]);

  const handleClose = () => {
    setView('MENU');
    onClose();
  };

  return (
    <Actionsheet isOpen={isOpen} onClose={handleClose}>
      <ActionsheetBackdrop onPress={handleClose} />
      <ActionsheetContent className="max-h-[90%] pb-6">
        <ActionsheetDragIndicator />

        {view === 'MENU' && (
          <VStack space="md" className="w-full">
            <VStack space="xs" className="pb-2 border-b border-border">
              <Heading size="md" className="font-title text-foreground">
                {orderStrings.actions.sheetTitle}
              </Heading>
              <Text className="text-xs text-muted-foreground">
                {orderStrings.actions.sheetSubtitle}
              </Text>
            </VStack>

            {!actions.hasAnyAction ? (
              <Card className="p-4 bg-secondary/50 border border-border rounded-xl">
                <Text className="text-sm text-muted-foreground text-center">
                  {orderStrings.actions.noActionsAvailable}
                </Text>
              </Card>
            ) : (
              <ScrollView
                className="max-h-[60vh]"
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                <VStack space="xs">
                  {actions.canAcknowledge && (
                    <ActionsheetItem
                      onPress={() => setView('CONFIRM_ACKNOWLEDGE')}
                      disabled={mutations.isPending}
                      className="border border-border mb-1"
                    >
                      <HStack space="md" className="items-center flex-1">
                        <View className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center">
                          <Icon as={CheckCircle2} size={18} className="text-primary" />
                        </View>
                        <VStack space="xs" className="flex-1">
                          <Text className="text-sm font-bold text-foreground">
                            {orderStrings.actions.acknowledgeAction}
                          </Text>
                          <Text className="text-xs text-muted-foreground">
                            {orderStrings.actions.acknowledgeDesc}
                          </Text>
                        </VStack>
                        <Icon as={ChevronRight} size={16} className="text-muted-foreground" />
                      </HStack>
                    </ActionsheetItem>
                  )}

                  {actions.nextStatusTransition === 'PROCESSING' && (
                    <ActionsheetItem
                      onPress={() => setView('CONFIRM_PROCESSING')}
                      disabled={mutations.isPending}
                      className="border border-border mb-1"
                    >
                      <HStack space="md" className="items-center flex-1">
                        <View className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center">
                          <Icon as={Wrench} size={18} className="text-primary" />
                        </View>
                        <VStack space="xs" className="flex-1">
                          <Text className="text-sm font-bold text-foreground">
                            {orderStrings.actions.moveToProcessingAction}
                          </Text>
                          <Text className="text-xs text-muted-foreground">
                            {orderStrings.actions.moveToProcessingDesc}
                          </Text>
                        </VStack>
                        <Icon as={ChevronRight} size={16} className="text-muted-foreground" />
                      </HStack>
                    </ActionsheetItem>
                  )}

                  {actions.nextStatusTransition === 'SHIPPED' && (
                    <ActionsheetItem
                      onPress={() => setView('DISPATCH')}
                      disabled={mutations.isPending}
                      className="border border-border mb-1"
                    >
                      <HStack space="md" className="items-center flex-1">
                        <View className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center">
                          <Icon as={Truck} size={18} className="text-primary" />
                        </View>
                        <VStack space="xs" className="flex-1">
                          <Text className="text-sm font-bold text-foreground">
                            {orderStrings.actions.dispatchAction}
                          </Text>
                          <Text className="text-xs text-muted-foreground">
                            {orderStrings.actions.dispatchDesc}
                          </Text>
                        </VStack>
                        <Icon as={ChevronRight} size={16} className="text-muted-foreground" />
                      </HStack>
                    </ActionsheetItem>
                  )}

                  {actions.nextStatusTransition === 'DELIVERED' && (
                    <ActionsheetItem
                      onPress={() => setView('DELIVER')}
                      disabled={mutations.isPending}
                      className="border border-border mb-1"
                    >
                      <HStack space="md" className="items-center flex-1">
                        <View className="w-9 h-9 rounded-full bg-emerald-500/10 items-center justify-center">
                          <Icon as={CheckCircle2} size={18} className="text-emerald-500" />
                        </View>
                        <VStack space="xs" className="flex-1">
                          <Text className="text-sm font-bold text-foreground">
                            {orderStrings.actions.confirmDeliveryAction}
                          </Text>
                          <Text className="text-xs text-muted-foreground">
                            {orderStrings.actions.confirmDeliveryDesc}
                          </Text>
                        </VStack>
                        <Icon as={ChevronRight} size={16} className="text-muted-foreground" />
                      </HStack>
                    </ActionsheetItem>
                  )}

                  {actions.allowedManufacturingEvents.length > 0 && (
                    <ActionsheetItem
                      onPress={() => openForm('MFG_EVENT')}
                      disabled={mutations.isPending}
                      className="border border-border mb-1"
                    >
                      <HStack space="md" className="items-center flex-1">
                        <View className="w-9 h-9 rounded-full bg-secondary items-center justify-center">
                          <Icon as={Layers} size={18} className="text-foreground" />
                        </View>
                        <VStack space="xs" className="flex-1">
                          <Text className="text-sm font-bold text-foreground">
                            {orderStrings.actions.recordMilestoneAction}
                          </Text>
                          <Text className="text-xs text-muted-foreground">
                            {orderStrings.actions.recordMilestoneDesc}
                          </Text>
                        </VStack>
                        <Icon as={ChevronRight} size={16} className="text-muted-foreground" />
                      </HStack>
                    </ActionsheetItem>
                  )}

                  {actions.canSendCustomerUpdate && (
                    <ActionsheetItem
                      onPress={() => openForm('CUSTOMER_UPDATE')}
                      disabled={mutations.isPending}
                      className="border border-border mb-1"
                    >
                      <HStack space="md" className="items-center flex-1">
                        <View className="w-9 h-9 rounded-full bg-secondary items-center justify-center">
                          <Icon as={MessageSquare} size={18} className="text-foreground" />
                        </View>
                        <VStack space="xs" className="flex-1">
                          <Text className="text-sm font-bold text-foreground">
                            {orderStrings.actions.customerUpdateAction}
                          </Text>
                          <Text className="text-xs text-muted-foreground">
                            {orderStrings.actions.customerUpdateDesc}
                          </Text>
                        </VStack>
                        <Icon as={ChevronRight} size={16} className="text-muted-foreground" />
                      </HStack>
                    </ActionsheetItem>
                  )}

                  {actions.canApproveCancellation && (
                    <ActionsheetItem
                      onPress={() => setView('APPROVE_CANCEL')}
                      disabled={mutations.isPending}
                      className="border border-destructive/30 bg-destructive/10 mb-1"
                    >
                      <HStack space="md" className="items-center flex-1">
                        <View className="w-9 h-9 rounded-full bg-destructive/20 items-center justify-center">
                          <Icon as={AlertTriangle} size={18} className="text-destructive" />
                        </View>
                        <VStack space="xs" className="flex-1">
                          <Text className="text-sm font-bold text-destructive">
                            {orderStrings.actions.approveCancelAction}
                          </Text>
                          <Text className="text-xs text-destructive/80">
                            {orderStrings.actions.approveCancelDesc}
                          </Text>
                        </VStack>
                        <Icon as={ChevronRight} size={16} className="text-destructive" />
                      </HStack>
                    </ActionsheetItem>
                  )}

                  {actions.cancellationMode !== 'NONE' && (
                    <ActionsheetItem
                      onPress={() => setView('CANCEL')}
                      disabled={mutations.isPending}
                      className={`border mb-1 ${
                        actions.cancellationMode === 'REQUEST_APPROVAL'
                          ? 'border-amber-500/30 bg-amber-500/5'
                          : 'border-destructive/30 bg-destructive/5'
                      }`}
                    >
                      <HStack space="md" className="items-center flex-1">
                        <View
                          className={`w-9 h-9 rounded-full items-center justify-center ${
                            actions.cancellationMode === 'REQUEST_APPROVAL'
                              ? 'bg-amber-500/10'
                              : 'bg-destructive/10'
                          }`}
                        >
                          <Icon
                            as={
                              actions.cancellationMode === 'REQUEST_APPROVAL'
                                ? AlertTriangle
                                : XCircle
                            }
                            size={18}
                            className={
                              actions.cancellationMode === 'REQUEST_APPROVAL'
                                ? 'text-amber-500'
                                : 'text-destructive'
                            }
                          />
                        </View>
                        <VStack space="xs" className="flex-1">
                          <Text
                            className={`text-sm font-bold ${
                              actions.cancellationMode === 'REQUEST_APPROVAL'
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-destructive'
                            }`}
                          >
                            {actions.cancellationMode === 'REQUEST_APPROVAL'
                              ? orderStrings.actions.requestCancelAction
                              : orderStrings.actions.cancelAction}
                          </Text>
                          <Text className="text-xs text-muted-foreground">
                            {actions.cancellationMode === 'REQUEST_APPROVAL'
                              ? orderStrings.actions.requestCancelDesc
                              : orderStrings.actions.cancelDesc}
                          </Text>
                        </VStack>
                        <Icon as={ChevronRight} size={16} className="text-muted-foreground" />
                      </HStack>
                    </ActionsheetItem>
                  )}
                </VStack>
              </ScrollView>
            )}
          </VStack>
        )}

        {view === 'CONFIRM_ACKNOWLEDGE' && (
          <ConfirmStatusChange
            title={orderStrings.confirmStatusChange.acknowledgeTitle}
            description={orderStrings.confirmStatusChange.acknowledgeDescription}
            orderNumber={order.orderNumber}
            from={<OrderStatusBadge status={order.status} isUnacknowledged />}
            to={
              <OrderStatusBadge
                status={order.status}
                label={orderStrings.confirmStatusChange.acknowledgedLabel}
              />
            }
            confirmLabel={orderStrings.confirmStatusChange.acknowledgeConfirm}
            confirmIcon={CheckCircle2}
            onConfirm={async () => {
              await mutations.acknowledge.mutateAsync();
              handleClose();
            }}
            onCancel={() => setView('MENU')}
            isSubmitting={mutations.acknowledge.isPending}
          />
        )}

        {view === 'CONFIRM_PROCESSING' && (
          <ConfirmStatusChange
            title={orderStrings.confirmStatusChange.processingTitle}
            description={orderStrings.confirmStatusChange.processingDescription}
            orderNumber={order.orderNumber}
            from={
              <OrderStatusBadge status={order.status} isUnacknowledged={!order.acknowledgedAt} />
            }
            to={<OrderStatusBadge status="PROCESSING" />}
            confirmLabel={orderStrings.confirmStatusChange.processingConfirm}
            confirmIcon={Wrench}
            onConfirm={async () => {
              await mutations.updateStatus.mutateAsync({ status: 'PROCESSING' });
              handleClose();
            }}
            onCancel={() => setView('MENU')}
            isSubmitting={mutations.updateStatus.isPending}
          />
        )}

        {view === 'MFG_EVENT' && (
          <ManufacturingEventForm
            allowedEvents={actions.allowedManufacturingEvents}
            onSubmit={async (data) => {
              await mutations.recordActivity.mutateAsync({ ...data, idempotencyKey });
              handleClose();
            }}
            onCancel={() => setView('MENU')}
            isSubmitting={mutations.recordActivity.isPending}
          />
        )}

        {view === 'CUSTOMER_UPDATE' && (
          <CustomerUpdateForm
            onSubmit={async (data) => {
              await mutations.sendCustomerUpdate.mutateAsync({ ...data, idempotencyKey });
              handleClose();
            }}
            onCancel={() => setView('MENU')}
            isSubmitting={mutations.sendCustomerUpdate.isPending}
          />
        )}

        {view === 'CANCEL' && (
          <CancelOrderForm
            cancellationMode={actions.cancellationMode}
            onSubmit={async (data) => {
              await mutations.cancel.mutateAsync(data);
              handleClose();
            }}
            onCancel={() => setView('MENU')}
            isSubmitting={mutations.cancel.isPending}
          />
        )}

        {view === 'APPROVE_CANCEL' && (
          <ApproveCancellationForm
            pendingRequest={timeline?.pendingCancellationRequest}
            onSubmit={async (data) => {
              await mutations.approveCancel.mutateAsync(data);
              handleClose();
            }}
            onCancel={() => setView('MENU')}
            isSubmitting={mutations.approveCancel.isPending}
          />
        )}

        {view === 'DISPATCH' && (
          <DeliveryConfirmationForm
            mode="DISPATCH"
            onSubmit={async (data) => {
              await mutations.updateStatus.mutateAsync(data);
              handleClose();
            }}
            onCancel={() => setView('MENU')}
            isSubmitting={mutations.updateStatus.isPending}
          />
        )}

        {view === 'DELIVER' && (
          <DeliveryConfirmationForm
            mode="DELIVER"
            onSubmit={async (data) => {
              await mutations.updateStatus.mutateAsync(data);
              handleClose();
            }}
            onCancel={() => setView('MENU')}
            isSubmitting={mutations.updateStatus.isPending}
          />
        )}
      </ActionsheetContent>
    </Actionsheet>
  );
}
