import React from 'react';
import { useRouter } from 'expo-router';
import { Card, Pressable, VStack, HStack, Text, Heading } from '@timmbr/native-ui';
import type { OrderFilterPreset } from '../types/order.types';

export interface StatCardProps {
  count: number;
  label: string;
  subtitle: string;
  preset: OrderFilterPreset;
  accentColor?: string;
  onPress?: () => void;
}

export function StatCard({
  count,
  label,
  subtitle,
  preset,
  accentColor = '#C0643A',
  onPress,
}: StatCardProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push({
        pathname: '/(tabs)/orders',
        params: { filter: preset },
      });
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      className="flex-1 active:opacity-85"
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${count} orders`}
    >
      <Card className="flex-1 border border-border p-4 justify-between bg-card">
        <VStack space="xs">
          <HStack className="justify-between items-center">
            <Text className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
              {label}
            </Text>
            <HStack className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accentColor }} />
          </HStack>

          <Heading size="xl" className="font-serif text-foreground font-bold my-1">
            {count}
          </Heading>
        </VStack>

        <Text className="text-xs text-muted-foreground mt-2" numberOfLines={2}>
          {subtitle}
        </Text>
      </Card>
    </Pressable>
  );
}
