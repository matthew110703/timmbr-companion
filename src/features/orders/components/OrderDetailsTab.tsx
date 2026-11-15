import React, { useState } from 'react';
import { View, Image } from 'react-native';
import { Phone, MapPin, Wrench, Package } from 'lucide-react-native';
import {
  VStack,
  HStack,
  Text,
  Heading,
  Card,
  Button,
  ButtonText,
  Badge,
  BadgeText,
  Icon,
  Divider,
} from '@timmbr/native-ui';
import type {
  AdminOrderCustomerDto,
  OrderItemResponseDto,
  OrderResponseDto,
} from '../types/order.types';
import {
  extractShippingDetails,
  extractVariantSummary,
  formatCurrency,
} from '../utils/order-formatters';
import { openAddressInMaps, openCustomerPhoneCall } from '../utils/native-linking';
import { orderStrings } from '@/strings/orders';

export interface OrderDetailsTabProps {
  order: OrderResponseDto;
  fallbackCustomer?: AdminOrderCustomerDto | null;
}

function OrderItemRow({ item, currency }: { item: OrderItemResponseDto; currency: string }) {
  const [imageError, setImageError] = useState(false);
  const variantSummary = extractVariantSummary(item.metadata);

  return (
    <Card className="p-3 bg-secondary/30 border border-border rounded-lg">
      <HStack space="md" className="items-start">
        <View className="w-16 h-16 rounded-md bg-secondary border border-border items-center justify-center overflow-hidden">
          {item.thumbnail && !imageError ? (
            <Image
              source={{ uri: item.thumbnail }}
              className="w-full h-full"
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <Icon as={Package} size={24} className="text-muted-foreground" />
          )}
        </View>

        <VStack space="xs" className="flex-1">
          <Text className="font-semibold text-foreground text-sm" numberOfLines={2}>
            {item.name}
          </Text>

          {variantSummary && (
            <Text className="text-xs text-muted-foreground">{variantSummary}</Text>
          )}

          <HStack space="md" className="items-center mt-1">
            {item.sku && (
              <Text className="text-[11px] text-muted-foreground font-mono">
                {orderStrings.details.skuPrefix} {item.sku}
              </Text>
            )}
            <Text className="text-xs font-medium text-foreground">
              {orderStrings.details.qtyPrefix} {item.quantity}
            </Text>
          </HStack>

          <HStack className="justify-between items-center mt-1 pt-1 border-t border-border/50">
            <Text className="text-xs text-muted-foreground">
              {formatCurrency(item.unitPrice, currency)} each
            </Text>
            <Text className="font-bold text-sm text-foreground">
              {formatCurrency(item.totalPrice, currency)}
            </Text>
          </HStack>
        </VStack>
      </HStack>
    </Card>
  );
}

export function OrderDetailsTab({ order, fallbackCustomer }: OrderDetailsTabProps) {
  const [calling, setCalling] = useState(false);
  const [openingMaps, setOpeningMaps] = useState(false);

  const shipping = extractShippingDetails(order.shippingAddress, fallbackCustomer);

  const handleCall = async () => {
    if (!shipping.contactPhone) return;
    setCalling(true);
    try {
      await openCustomerPhoneCall(shipping.contactPhone);
    } finally {
      setCalling(false);
    }
  };

  const handleMaps = async () => {
    if (!shipping.formattedAddress) return;
    setOpeningMaps(true);
    try {
      await openAddressInMaps(shipping.formattedAddress);
    } finally {
      setOpeningMaps(false);
    }
  };

  const hasPhone = Boolean(shipping.contactPhone);

  return (
    <VStack space="md" className="pb-8">
      {order.installationRequired && (
        <Card className="border-l-4 border-l-amber-600 bg-amber-500/10 border-border p-4">
          <HStack space="sm" className="items-start">
            <Icon as={Wrench} size={20} className="text-amber-600 mt-0.5" />
            <VStack space="xs" className="flex-1">
              <Text className="font-bold text-sm text-foreground">
                {orderStrings.details.installationRequiredTitle}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {orderStrings.details.installationRequiredDescription}
              </Text>
            </VStack>
          </HStack>
        </Card>
      )}

      <Card className="p-4 bg-card border border-border rounded-xl">
        <VStack space="sm">
          <Heading size="sm" className="font-title text-foreground">
            {orderStrings.details.customerSection}
          </Heading>

          <VStack space="xs" className="mt-1">
            <Text className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {orderStrings.details.customerName}
            </Text>
            <Text className="text-base font-semibold text-foreground">{shipping.customerName}</Text>
          </VStack>

          <VStack space="xs">
            <Text className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {orderStrings.details.customerPhone}
            </Text>
            <Text className="text-sm text-foreground font-mono">
              {shipping.contactPhone || orderStrings.details.noPhoneAvailable}
            </Text>
          </VStack>

          {hasPhone && (
            <Button
              variant="outline"
              action="primary"
              size="sm"
              className="mt-2 flex-row items-center justify-center border-primary"
              onPress={handleCall}
              isLoading={calling}
            >
              <Icon as={Phone} size={16} className="text-primary mr-2" />
              <ButtonText className="text-primary font-semibold text-xs">
                {orderStrings.details.callCustomer}
              </ButtonText>
            </Button>
          )}
        </VStack>
      </Card>

      <Card className="p-4 bg-card border border-border rounded-xl">
        <VStack space="sm">
          <Heading size="sm" className="font-title text-foreground">
            {orderStrings.details.deliverySection}
          </Heading>

          <VStack space="xs" className="mt-1">
            <Text className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {orderStrings.details.recipientName}
            </Text>
            <Text className="text-base font-semibold text-foreground">
              {shipping.recipientName}
            </Text>
          </VStack>

          <VStack space="xs">
            <Text className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {orderStrings.details.deliverySection}
            </Text>
            <Text className="text-sm text-foreground leading-relaxed">
              {shipping.formattedAddress}
            </Text>
          </VStack>

          {shipping.landmark && (
            <VStack space="xs">
              <Text className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                {orderStrings.details.landmark}
              </Text>
              <Text className="text-sm text-foreground">{shipping.landmark}</Text>
            </VStack>
          )}

          <Button
            variant="outline"
            action="secondary"
            size="sm"
            className="mt-2 flex-row items-center justify-center border-border"
            onPress={handleMaps}
            isLoading={openingMaps}
          >
            <Icon as={MapPin} size={16} className="text-foreground mr-2" />
            <ButtonText className="text-foreground font-semibold text-xs">
              {orderStrings.details.openInMaps}
            </ButtonText>
          </Button>
        </VStack>
      </Card>

      <VStack space="sm">
        <HStack className="justify-between items-center">
          <Heading size="sm" className="font-title text-foreground">
            {orderStrings.details.itemsSection}
          </Heading>
          <Badge variant="outline" action="secondary">
            <BadgeText className="text-xs text-muted-foreground">
              {order.items?.length || 0} items
            </BadgeText>
          </Badge>
        </HStack>

        <VStack space="sm">
          {(order.items || []).map((item) => (
            <OrderItemRow key={item.id} item={item} currency={order.currency || 'INR'} />
          ))}
        </VStack>
      </VStack>

      <Card className="p-4 bg-card border border-border rounded-xl">
        <VStack space="sm">
          <Heading size="sm" className="font-title text-foreground mb-1">
            {orderStrings.details.orderSummarySection}
          </Heading>

          <HStack className="justify-between items-center">
            <Text className="text-sm text-muted-foreground">{orderStrings.details.subtotal}</Text>
            <Text className="text-sm text-foreground font-medium">
              {formatCurrency(order.subtotal, order.currency)}
            </Text>
          </HStack>

          {order.discount > 0 && (
            <HStack className="justify-between items-center">
              <Text className="text-sm text-emerald-600 font-medium">
                {orderStrings.details.discount}
              </Text>
              <Text className="text-sm text-emerald-600 font-medium">
                -{formatCurrency(order.discount, order.currency)}
              </Text>
            </HStack>
          )}

          <HStack className="justify-between items-center">
            <Text className="text-sm text-muted-foreground">
              {orderStrings.details.shippingFee}
            </Text>
            <Text className="text-sm text-foreground font-medium">
              {order.shippingFee > 0
                ? formatCurrency(order.shippingFee, order.currency)
                : orderStrings.details.freeShipping}
            </Text>
          </HStack>

          <HStack className="justify-between items-center">
            <Text className="text-sm text-muted-foreground">{orderStrings.details.tax}</Text>
            <Text className="text-sm text-foreground font-medium">
              {formatCurrency(order.tax, order.currency)}
            </Text>
          </HStack>

          <Divider />

          <HStack className="justify-between items-center">
            <Text className="font-bold text-base text-foreground">
              {orderStrings.details.grandTotal}
            </Text>
            <Text className="font-bold text-lg text-primary font-sans">
              {formatCurrency(order.grandTotal, order.currency)}
            </Text>
          </HStack>

          <HStack className="justify-between items-center pt-2 border-t border-border/50">
            <Text className="text-xs text-muted-foreground">
              {orderStrings.details.paymentMethod}
            </Text>
            <Badge variant="outline" action="secondary">
              <BadgeText className="text-[10px] uppercase font-semibold text-foreground">
                {order.paymentMethod || orderStrings.details.prepaid}
              </BadgeText>
            </Badge>
          </HStack>
        </VStack>
      </Card>
    </VStack>
  );
}
