import React, { useState } from 'react';
import { View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Truck } from 'lucide-react-native';
import { Text, Input, InputField, Textarea, TextareaInput } from '@timmbr/native-ui';
import {
  updateOrderStatusSchema,
  type UpdateOrderStatusFormData,
} from '../schemas/order-operations.schema';
import { SheetFormLabel, SheetFormLayout } from './SheetFormLayout';
import { orderStrings } from '@/strings/orders';

interface DeliveryConfirmationFormProps {
  mode: 'DISPATCH' | 'DELIVER';
  onSubmit: (data: UpdateOrderStatusFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function DeliveryConfirmationForm({
  mode,
  onSubmit,
  onCancel,
  isSubmitting,
}: DeliveryConfirmationFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isDispatch = mode === 'DISPATCH';

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateOrderStatusFormData>({
    resolver: zodResolver(updateOrderStatusSchema),
    defaultValues: {
      status: isDispatch ? 'SHIPPED' : 'DELIVERED',
      notes: '',
      verificationCode: '',
    },
  });

  const onFormSubmit = async (data: UpdateOrderStatusFormData) => {
    setErrorMessage(null);
    try {
      await onSubmit({
        ...data,
        status: isDispatch ? 'SHIPPED' : 'DELIVERED',
        verificationCode: data.verificationCode?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : isDispatch
            ? 'Failed to dispatch order.'
            : 'Failed to confirm delivery.';
      setErrorMessage(msg);
    }
  };

  return (
    <SheetFormLayout
      title={
        isDispatch
          ? orderStrings.deliveryForm.dispatchTitle
          : orderStrings.deliveryForm.confirmDeliveryTitle
      }
      subtitle={
        isDispatch
          ? orderStrings.deliveryForm.dispatchSubtitle
          : orderStrings.deliveryForm.confirmDeliverySubtitle
      }
      onBack={onCancel}
      isSubmitting={isSubmitting}
      errorMessage={errorMessage}
      primaryAction={{
        label: isDispatch
          ? orderStrings.deliveryForm.dispatchSubmitButton
          : orderStrings.deliveryForm.deliverySubmitButton,
        icon: isDispatch ? Truck : CheckCircle2,
        onPress: () => void handleSubmit(onFormSubmit)(),
      }}
    >
      {!isDispatch && (
        <View>
          <SheetFormLabel>{orderStrings.deliveryForm.verificationCodeLabel}</SheetFormLabel>
          <Controller
            control={control}
            name="verificationCode"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input isInvalid={!!errors.verificationCode} className="bg-card rounded-xl">
                <InputField
                  placeholder={orderStrings.deliveryForm.verificationCodePlaceholder}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="characters"
                  editable={!isSubmitting}
                />
              </Input>
            )}
          />
          {errors.verificationCode && (
            <Text className="text-xs text-destructive mt-1.5">
              {errors.verificationCode.message}
            </Text>
          )}
        </View>
      )}

      <View>
        <SheetFormLabel>
          {isDispatch
            ? orderStrings.deliveryForm.dispatchNotesLabel
            : orderStrings.deliveryForm.handoverNotesLabel}
        </SheetFormLabel>
        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, onBlur, value } }) => (
            <Textarea isInvalid={!!errors.notes} className="bg-card rounded-xl min-h-[90px] p-0">
              <TextareaInput
                placeholder={
                  isDispatch
                    ? orderStrings.deliveryForm.dispatchNotesPlaceholder
                    : orderStrings.deliveryForm.handoverNotesPlaceholder
                }
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                editable={!isSubmitting}
                className="text-foreground text-sm leading-5 px-3.5 py-3 min-h-[90px]"
              />
            </Textarea>
          )}
        />
        {errors.notes && (
          <Text className="text-xs text-destructive mt-1.5">{errors.notes.message}</Text>
        )}
      </View>
    </SheetFormLayout>
  );
}
