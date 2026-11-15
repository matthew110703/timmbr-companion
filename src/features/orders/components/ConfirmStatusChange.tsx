import React, { useState } from 'react';
import { ArrowRight, type LucideIcon } from 'lucide-react-native';
import { VStack, HStack, Text, Card, Icon } from '@timmbr/native-ui';
import { SheetFormLayout } from './SheetFormLayout';
import { orderStrings } from '@/strings/orders';

interface ConfirmStatusChangeProps {
  title: string;
  description: string;
  orderNumber: string;
  from: React.ReactNode;
  to: React.ReactNode;
  confirmLabel: string;
  confirmIcon?: LucideIcon;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function ConfirmStatusChange({
  title,
  description,
  orderNumber,
  from,
  to,
  confirmLabel,
  confirmIcon,
  onConfirm,
  onCancel,
  isSubmitting,
}: ConfirmStatusChangeProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConfirm = async () => {
    setErrorMessage(null);
    try {
      await onConfirm();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update the order.');
    }
  };

  return (
    <SheetFormLayout
      title={title}
      onBack={onCancel}
      isSubmitting={isSubmitting}
      errorMessage={errorMessage}
      secondaryLabel={orderStrings.confirmStatusChange.goBack}
      primaryAction={{
        label: confirmLabel,
        icon: confirmIcon,
        onPress: () => void handleConfirm(),
      }}
    >
      <Card className="p-4 bg-secondary/40 border border-border rounded-xl">
        <VStack space="md">
          <HStack className="justify-between items-center">
            <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {orderStrings.confirmStatusChange.statusChangeLabel}
            </Text>
            <Text className="text-xs font-bold text-foreground">{orderNumber}</Text>
          </HStack>
          <HStack space="sm" className="items-center justify-center py-1">
            {from}
            <Icon as={ArrowRight} size={18} className="text-muted-foreground" />
            {to}
          </HStack>
        </VStack>
      </Card>
      <Text className="text-sm text-foreground leading-relaxed">{description}</Text>
    </SheetFormLayout>
  );
}
