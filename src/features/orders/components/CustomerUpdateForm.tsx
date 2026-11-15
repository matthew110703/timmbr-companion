import React, { useState } from 'react';
import { View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BellOff, Mail, Send, type LucideIcon } from 'lucide-react-native';
import { HStack, Text, Pressable, Icon, Textarea, TextareaInput } from '@timmbr/native-ui';
import {
  createCustomerUpdateSchema,
  customerUpdateCategories,
  customerUpdateTemplates,
  type CreateCustomerUpdateFormData,
} from '../schemas/order-operations.schema';
import type { CustomerUpdateCategory, CustomerUpdateTemplateKey } from '../types/order.types';
import { SheetFormLabel, SheetFormLayout } from './SheetFormLayout';
import { orderStrings } from '@/strings/orders';

const MESSAGE_MAX_LENGTH = 1000;

const strings = orderStrings.customerUpdateForm;

function templateText(templateKey: CustomerUpdateTemplateKey): string {
  return strings.templates[`${templateKey}_TEXT` as keyof typeof strings.templates];
}

function Chip({
  label,
  isSelected,
  onPress,
  disabled,
  role,
}: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  disabled: boolean;
  role: 'radio' | 'button';
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`px-3.5 py-2 rounded-full border ${
        isSelected ? 'bg-primary border-primary' : 'bg-card border-border active:bg-secondary'
      }`}
      accessibilityRole={role}
      accessibilityState={{ selected: isSelected }}
    >
      <Text className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-foreground'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function SegmentOption({
  label,
  icon,
  isSelected,
  onPress,
  disabled,
}: {
  label: string;
  icon: LucideIcon;
  isSelected: boolean;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-lg ${
        isSelected ? 'bg-card border border-primary shadow-sm' : ''
      }`}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
    >
      <Icon as={icon} size={15} className={isSelected ? 'text-primary' : 'text-muted-foreground'} />
      <Text
        className={`text-xs font-semibold ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

interface CustomerUpdateFormProps {
  onSubmit: (data: CreateCustomerUpdateFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function CustomerUpdateForm({ onSubmit, onCancel, isSubmitting }: CustomerUpdateFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateCustomerUpdateFormData>({
    resolver: zodResolver(createCustomerUpdateSchema),
    defaultValues: {
      category: 'PREDEFINED_UPDATE',
      templateKey: 'IN_PRODUCTION',
      message: templateText('IN_PRODUCTION'),
      notifyCustomer: false,
    },
  });

  const selectedCategory = watch('category');
  const selectedTemplate = watch('templateKey');
  const notifyCustomer = watch('notifyCustomer');
  const messageLength = watch('message')?.length ?? 0;

  const handleSelectCategory = (category: CustomerUpdateCategory) => {
    setValue('category', category);
    if (category === 'PREDEFINED_UPDATE') {
      const template = selectedTemplate || 'IN_PRODUCTION';
      setValue('templateKey', template);
      setValue('message', templateText(template));
    } else {
      setValue('templateKey', undefined);
    }
  };

  const handleSelectTemplate = (templateKey: CustomerUpdateTemplateKey) => {
    setValue('templateKey', templateKey);
    setValue('message', templateText(templateKey), { shouldValidate: true });
  };

  const onFormSubmit = async (data: CreateCustomerUpdateFormData) => {
    setErrorMessage(null);
    try {
      await onSubmit(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send customer update.';
      setErrorMessage(msg);
    }
  };

  return (
    <SheetFormLayout
      title={strings.title}
      subtitle={strings.subtitle}
      onBack={onCancel}
      isSubmitting={isSubmitting}
      errorMessage={errorMessage}
      primaryAction={{
        label: notifyCustomer ? strings.submitPostAndEmail : strings.submitPost,
        icon: notifyCustomer ? Mail : Send,
        onPress: () => void handleSubmit(onFormSubmit)(),
      }}
    >
      <View>
        <SheetFormLabel>{strings.typeLabel}</SheetFormLabel>
        <View className="flex-row flex-wrap gap-2">
          {customerUpdateCategories.map((cat) => (
            <Chip
              key={cat}
              label={strings.categories[cat] || cat}
              isSelected={selectedCategory === cat}
              onPress={() => handleSelectCategory(cat)}
              disabled={isSubmitting}
              role="radio"
            />
          ))}
        </View>
      </View>

      {selectedCategory === 'PREDEFINED_UPDATE' && (
        <View>
          <SheetFormLabel>{strings.templateLabel}</SheetFormLabel>
          <View className="flex-row flex-wrap gap-2">
            {customerUpdateTemplates.map((templateKey) => (
              <Chip
                key={templateKey}
                label={strings.templates[templateKey]}
                isSelected={selectedTemplate === templateKey}
                onPress={() => handleSelectTemplate(templateKey)}
                disabled={isSubmitting}
                role="radio"
              />
            ))}
          </View>
        </View>
      )}

      <View>
        <SheetFormLabel
          trailing={
            <Text
              className={`text-[11px] ${
                messageLength > MESSAGE_MAX_LENGTH ? 'text-destructive' : 'text-muted-foreground'
              }`}
            >
              {messageLength}/{MESSAGE_MAX_LENGTH}
            </Text>
          }
        >
          {strings.messageLabel}
        </SheetFormLabel>
        <Controller
          control={control}
          name="message"
          render={({ field: { onChange, onBlur, value } }) => (
            <Textarea isInvalid={!!errors.message} className="bg-card rounded-xl min-h-[110px] p-0">
              <TextareaInput
                placeholder={strings.messagePlaceholder}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                editable={!isSubmitting}
                className="text-foreground text-sm leading-5 px-3.5 py-3 min-h-[110px]"
              />
            </Textarea>
          )}
        />
        {errors.message && (
          <Text className="text-xs text-destructive mt-1.5">{errors.message.message}</Text>
        )}
      </View>

      <View>
        <SheetFormLabel>{strings.notifyLabel}</SheetFormLabel>
        <HStack className="p-1 rounded-xl bg-secondary border border-border">
          <SegmentOption
            label={strings.activityOnly}
            icon={BellOff}
            isSelected={!notifyCustomer}
            onPress={() => setValue('notifyCustomer', false)}
            disabled={isSubmitting}
          />
          <SegmentOption
            label={strings.activityAndEmail}
            icon={Mail}
            isSelected={notifyCustomer}
            onPress={() => setValue('notifyCustomer', true)}
            disabled={isSubmitting}
          />
        </HStack>
        <Text className="text-xs text-muted-foreground mt-2">
          {notifyCustomer ? strings.activityAndEmailHelp : strings.activityOnlyHelp}
        </Text>
      </View>
    </SheetFormLayout>
  );
}
