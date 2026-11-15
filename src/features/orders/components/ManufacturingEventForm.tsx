import React, { useState } from 'react';
import { View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { VStack, Text, Pressable, Textarea, TextareaInput } from '@timmbr/native-ui';
import {
  recordManufacturingEventSchema,
  type RecordManufacturingEventFormData,
} from '../schemas/order-operations.schema';
import type { ManufacturingEventType } from '../types/order.types';
import { SheetFormLabel, SheetFormLayout } from './SheetFormLayout';
import { orderStrings } from '@/strings/orders';

interface ManufacturingEventFormProps {
  allowedEvents: ManufacturingEventType[];
  onSubmit: (data: RecordManufacturingEventFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function ManufacturingEventForm({
  allowedEvents,
  onSubmit,
  onCancel,
  isSubmitting,
}: ManufacturingEventFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const defaultEvent: ManufacturingEventType = allowedEvents.includes('MANUFACTURING_STARTED')
    ? 'MANUFACTURING_STARTED'
    : allowedEvents[0] || 'MANUFACTURING_UPDATE';

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RecordManufacturingEventFormData>({
    resolver: zodResolver(recordManufacturingEventSchema),
    defaultValues: {
      eventType: defaultEvent,
      description: '',
    },
  });

  const selectedEvent = watch('eventType');

  const onFormSubmit = async (data: RecordManufacturingEventFormData) => {
    setErrorMessage(null);
    try {
      await onSubmit(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record manufacturing milestone.';
      setErrorMessage(msg);
    }
  };

  const getEventTitle = (type: ManufacturingEventType): string => {
    return orderStrings.manufacturingForm.eventTypes[type] || type;
  };

  const getEventDescription = (type: ManufacturingEventType): string => {
    const descKey = `${type}_DESC` as keyof typeof orderStrings.manufacturingForm.eventTypes;
    return orderStrings.manufacturingForm.eventTypes[descKey] || '';
  };

  return (
    <SheetFormLayout
      title={orderStrings.manufacturingForm.title}
      subtitle={orderStrings.manufacturingForm.subtitle}
      onBack={onCancel}
      isSubmitting={isSubmitting}
      errorMessage={errorMessage}
      primaryAction={{
        label: orderStrings.manufacturingForm.submitButton,
        onPress: () => void handleSubmit(onFormSubmit)(),
      }}
    >
      <View>
        <SheetFormLabel>{orderStrings.manufacturingForm.eventTypeLabel}</SheetFormLabel>
        <VStack space="sm">
          {allowedEvents.map((eventType) => {
            const isSelected = selectedEvent === eventType;
            return (
              <Pressable
                key={eventType}
                onPress={() => setValue('eventType', eventType)}
                disabled={isSubmitting}
                className={`p-3 rounded-xl border flex-row items-center justify-between ${
                  isSelected
                    ? 'bg-primary/10 border-primary'
                    : 'bg-card border-border active:bg-secondary/40'
                }`}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
              >
                <VStack space="xs" className="flex-1 mr-3">
                  <Text
                    className={`text-sm font-semibold ${
                      isSelected ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    {getEventTitle(eventType)}
                  </Text>
                  <Text className="text-xs text-muted-foreground leading-snug">
                    {getEventDescription(eventType)}
                  </Text>
                </VStack>
                <View
                  className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                    isSelected ? 'border-primary' : 'border-muted-foreground/40'
                  }`}
                >
                  {isSelected && <View className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </View>
              </Pressable>
            );
          })}
        </VStack>
        {errors.eventType && (
          <Text className="text-xs text-destructive mt-1.5">{errors.eventType.message}</Text>
        )}
      </View>

      <View>
        <SheetFormLabel>{orderStrings.manufacturingForm.descriptionLabel}</SheetFormLabel>
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <Textarea
              isInvalid={!!errors.description}
              className="bg-card rounded-xl min-h-[90px] p-0"
            >
              <TextareaInput
                placeholder={orderStrings.manufacturingForm.descriptionPlaceholder}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                editable={!isSubmitting}
                className="text-foreground text-sm leading-5 px-3.5 py-3 min-h-[90px]"
              />
            </Textarea>
          )}
        />
        {errors.description && (
          <Text className="text-xs text-destructive mt-1.5">{errors.description.message}</Text>
        )}
      </View>
    </SheetFormLayout>
  );
}
