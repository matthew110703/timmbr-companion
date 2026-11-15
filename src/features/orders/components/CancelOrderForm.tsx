import React, { useState } from 'react';
import { View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle } from 'lucide-react-native';
import { HStack, Text, Card, Icon, Textarea, TextareaInput } from '@timmbr/native-ui';
import { cancelOrderSchema, type CancelOrderFormData } from '../schemas/order-operations.schema';
import type { CancellationMode } from '../domain/order-actions-machine';
import { SheetFormLabel, SheetFormLayout } from './SheetFormLayout';
import { orderStrings } from '@/strings/orders';

interface CancelOrderFormProps {
  cancellationMode: CancellationMode;
  onSubmit: (data: CancelOrderFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function CancelOrderForm({
  cancellationMode,
  onSubmit,
  onCancel,
  isSubmitting,
}: CancelOrderFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isApprovalRequired = cancellationMode === 'REQUEST_APPROVAL';

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CancelOrderFormData>({
    resolver: zodResolver(cancelOrderSchema),
    defaultValues: {
      reason: '',
      internalNotes: '',
      requestApproval: isApprovalRequired,
    },
  });

  const onFormSubmit = async (data: CancelOrderFormData) => {
    setErrorMessage(null);
    try {
      await onSubmit({
        ...data,
        requestApproval: isApprovalRequired,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to process cancellation.';
      setErrorMessage(msg);
    }
  };

  return (
    <SheetFormLayout
      title={
        isApprovalRequired
          ? orderStrings.cancelForm.titleApproval
          : orderStrings.cancelForm.titleDirect
      }
      subtitle={
        isApprovalRequired
          ? orderStrings.cancelForm.subtitleApproval
          : orderStrings.cancelForm.subtitleDirect
      }
      onBack={onCancel}
      isSubmitting={isSubmitting}
      errorMessage={errorMessage}
      primaryAction={{
        label: isApprovalRequired
          ? orderStrings.cancelForm.submitApproval
          : orderStrings.cancelForm.submitDirect,
        tone: 'destructive',
        onPress: () => void handleSubmit(onFormSubmit)(),
      }}
    >
      {isApprovalRequired && (
        <Card className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <HStack space="sm" className="items-start">
            <Icon as={AlertTriangle} size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <Text className="text-xs text-amber-600 dark:text-amber-400 font-medium leading-relaxed flex-1">
              {orderStrings.cancelForm.restrictionWarningBanner}
            </Text>
          </HStack>
        </Card>
      )}

      <View>
        <SheetFormLabel>{orderStrings.cancelForm.reasonLabel}</SheetFormLabel>
        <Controller
          control={control}
          name="reason"
          render={({ field: { onChange, onBlur, value } }) => (
            <Textarea isInvalid={!!errors.reason} className="bg-card rounded-xl min-h-[90px] p-0">
              <TextareaInput
                placeholder={orderStrings.cancelForm.reasonPlaceholder}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                editable={!isSubmitting}
                className="text-foreground text-sm leading-5 px-3.5 py-3 min-h-[90px]"
              />
            </Textarea>
          )}
        />
        {errors.reason && (
          <Text className="text-xs text-destructive mt-1.5">{errors.reason.message}</Text>
        )}
      </View>

      <View>
        <SheetFormLabel>{orderStrings.cancelForm.internalNotesLabel}</SheetFormLabel>
        <Controller
          control={control}
          name="internalNotes"
          render={({ field: { onChange, onBlur, value } }) => (
            <Textarea
              isInvalid={!!errors.internalNotes}
              className="bg-card rounded-xl min-h-[80px] p-0"
            >
              <TextareaInput
                placeholder={orderStrings.cancelForm.internalNotesPlaceholder}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                editable={!isSubmitting}
                className="text-foreground text-sm leading-5 px-3.5 py-3 min-h-[80px]"
              />
            </Textarea>
          )}
        />
        {errors.internalNotes && (
          <Text className="text-xs text-destructive mt-1.5">{errors.internalNotes.message}</Text>
        )}
      </View>
    </SheetFormLayout>
  );
}
