import React, { useState } from 'react';
import { View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle } from 'lucide-react-native';
import { VStack, HStack, Text, Card, Icon, Textarea, TextareaInput } from '@timmbr/native-ui';
import {
  approveCancellationSchema,
  type ApproveCancellationFormData,
} from '../schemas/order-operations.schema';
import type { OrderActivityResponseDto } from '../types/order.types';
import { SheetFormLabel, SheetFormLayout } from './SheetFormLayout';
import { orderStrings } from '@/strings/orders';

interface ApproveCancellationFormProps {
  pendingRequest?: OrderActivityResponseDto | null;
  onSubmit: (data: ApproveCancellationFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function ApproveCancellationForm({
  pendingRequest,
  onSubmit,
  onCancel,
  isSubmitting,
}: ApproveCancellationFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ApproveCancellationFormData>({
    resolver: zodResolver(approveCancellationSchema),
    defaultValues: {
      resolutionNotes: '',
    },
  });

  const requestReason =
    pendingRequest?.description ||
    (typeof pendingRequest?.metadata?.reason === 'string'
      ? (pendingRequest.metadata.reason as string)
      : orderStrings.approveCancellationForm.noReasonProvided);

  const requestedByStaff = pendingRequest?.staff?.name
    ? `${orderStrings.activity.actorStaffPrefix} ${pendingRequest.staff.name} (${pendingRequest.staff.role})`
    : null;

  const onFormSubmit = async (data: ApproveCancellationFormData) => {
    setErrorMessage(null);
    try {
      await onSubmit(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to approve cancellation request.';
      setErrorMessage(msg);
    }
  };

  return (
    <SheetFormLayout
      title={orderStrings.approveCancellationForm.title}
      subtitle={orderStrings.approveCancellationForm.subtitle}
      onBack={onCancel}
      isSubmitting={isSubmitting}
      errorMessage={errorMessage}
      primaryAction={{
        label: orderStrings.approveCancellationForm.submitButton,
        tone: 'destructive',
        onPress: () => void handleSubmit(onFormSubmit)(),
      }}
    >
      <Card className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
        <VStack space="xs">
          <HStack space="xs" className="items-center">
            <Icon as={AlertTriangle} size={16} className="text-amber-500" />
            <Text className="text-xs font-bold text-amber-600 dark:text-amber-400">
              {orderStrings.approveCancellationForm.staffRequestReasonLabel}
            </Text>
          </HStack>
          <Text className="text-sm text-foreground font-medium pl-6">"{requestReason}"</Text>
          {requestedByStaff && (
            <Text className="text-xs text-muted-foreground pl-6 mt-1">{requestedByStaff}</Text>
          )}
        </VStack>
      </Card>

      <View>
        <SheetFormLabel>{orderStrings.approveCancellationForm.resolutionNotesLabel}</SheetFormLabel>
        <Controller
          control={control}
          name="resolutionNotes"
          render={({ field: { onChange, onBlur, value } }) => (
            <Textarea
              isInvalid={!!errors.resolutionNotes}
              className="bg-card rounded-xl min-h-[90px] p-0"
            >
              <TextareaInput
                placeholder={orderStrings.approveCancellationForm.resolutionNotesPlaceholder}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                editable={!isSubmitting}
                className="text-foreground text-sm leading-5 px-3.5 py-3 min-h-[90px]"
              />
            </Textarea>
          )}
        />
        {errors.resolutionNotes && (
          <Text className="text-xs text-destructive mt-1.5">{errors.resolutionNotes.message}</Text>
        )}
      </View>
    </SheetFormLayout>
  );
}
