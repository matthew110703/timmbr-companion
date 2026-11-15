import React, { useState } from 'react';
import { Image, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Package } from 'lucide-react-native';
import { Card, Pressable, VStack, HStack, Text, Badge, BadgeText, Icon } from '@timmbr/native-ui';
import type { AdminOrderListItemDto } from '../types/order.types';
import { formatCurrency, formatOrderTimestamp } from '../utils/order-formatters';
import { OrderStatusBadge } from './OrderStatusBadge';

export interface OrderCardProps {
  order: AdminOrderListItemDto;
  onPress?: (orderId: string) => void;
  className?: string;
}

export function OrderCard({ order, onPress, className = '' }: OrderCardProps) {
  const router = useRouter();
  const [imageError, setImageError] = useState(false);

  const isUnacknowledged = order.status === 'CONFIRMED' && !order.acknowledgedAt;

  const handlePress = () => {
    if (onPress) {
      onPress(order.id);
    } else {
      router.push(`/orders/${order.id}`);
    }
  };

  const formattedTotal = formatCurrency(order.grandTotal, order.currency);
  const formattedDate = formatOrderTimestamp(order.placedAt || order.createdAt);
  const itemCountLabel = order.itemsCount === 1 ? '1 item' : `${order.itemsCount} items`;

  return (
    <Pressable
      onPress={handlePress}
      className={`active:opacity-90 ${className}`}
      accessibilityRole="button"
      accessibilityLabel={`Order ${order.orderNumber} for ${order.customer.name}`}
    >
      <Card className="p-4 bg-card border border-border rounded-xl">
        <VStack space="sm">
          <HStack className="justify-between items-center">
            <HStack space="xs" className="items-center">
              <Text className="font-bold text-base text-foreground font-title tracking-tight">
                {order.orderNumber}
              </Text>
            </HStack>
            <OrderStatusBadge status={order.status} isUnacknowledged={isUnacknowledged} />
          </HStack>

          <HStack space="md" className="items-center mt-1">
            <View className="w-16 h-16 rounded-lg bg-secondary border border-border items-center justify-center overflow-hidden">
              {order.thumbnail && !imageError ? (
                <Image
                  source={{ uri: order.thumbnail }}
                  className="w-full h-full"
                  resizeMode="cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <Icon as={Package} size={28} className="text-muted-foreground" />
              )}
            </View>

            <VStack space="xs" className="flex-1 justify-center">
              <Text className="font-semibold text-foreground text-sm" numberOfLines={1}>
                {order.customer.name}
              </Text>
              <HStack space="xs" className="items-center">
                <Text className="text-xs text-muted-foreground">{itemCountLabel}</Text>
                <Text className="text-xs text-muted-foreground">•</Text>
                <Text className="text-xs text-muted-foreground">{formattedDate}</Text>
              </HStack>
            </VStack>
          </HStack>

          <HStack className="justify-between items-center pt-2 border-t border-border mt-1">
            {order.paymentMethod ? (
              <Badge variant="outline" action="secondary" className="px-2 py-0.5">
                <BadgeText className="text-[10px] font-semibold text-muted-foreground uppercase">
                  {order.paymentMethod}
                </BadgeText>
              </Badge>
            ) : (
              <Badge variant="outline" action="secondary" className="px-2 py-0.5">
                <BadgeText className="text-[10px] font-semibold text-muted-foreground uppercase">
                  PREPAID
                </BadgeText>
              </Badge>
            )}

            <Text className="font-bold text-base text-foreground font-sans">{formattedTotal}</Text>
          </HStack>
        </VStack>
      </Card>
    </Pressable>
  );
}
