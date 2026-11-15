import React, { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Edit3 } from 'lucide-react-native';
import {
  VStack,
  HStack,
  Text,
  Heading,
  Card,
  Button,
  ButtonText,
  Pressable,
  Spinner,
  Icon,
} from '@timmbr/native-ui';
import {
  useOrderActivitiesQuery,
  useOrderDetailQuery,
} from '@/features/orders/hooks/useOrdersQueries';
import { OrderStatusBadge } from '@/features/orders/components/OrderStatusBadge';
import { OrderDetailsTab } from '@/features/orders/components/OrderDetailsTab';
import { OrderActivityTab } from '@/features/orders/components/OrderActivityTab';
import { OrderActionSheet } from '@/features/orders/components/OrderActionSheet';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { orderStrings } from '@/strings/orders';

type TabType = 'details' | 'activity';

export default function OrderDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const user = useAuthStore((state) => state.user);

  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

  const {
    data: order,
    isLoading: isOrderLoading,
    isError: isOrderError,
    refetch: refetchOrder,
    isRefetching: isOrderRefetching,
  } = useOrderDetailQuery(orderId || '');

  const {
    data: timeline,
    isLoading: isTimelineLoading,
    refetch: refetchTimeline,
    isRefetching: isTimelineRefetching,
  } = useOrderActivitiesQuery(orderId || '');

  const isRefreshing = isOrderRefetching || isTimelineRefetching;

  const handleRefresh = async () => {
    await Promise.all([refetchOrder(), refetchTimeline()]);
  };

  const isUnacknowledged = order?.status === 'CONFIRMED' && !order.acknowledgedAt;

  if (isOrderLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
        <HStack className="px-5 py-3 items-center border-b border-border">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center rounded-full bg-secondary mr-2"
          >
            <Icon as={ArrowLeft} size={20} className="text-foreground" />
          </Pressable>
          <Text className="text-base font-semibold text-foreground">
            {orderStrings.details.title}
          </Text>
        </HStack>
        <View className="flex-1 items-center justify-center p-6">
          <Spinner size="large" color="#C0643A" />
          <Text className="text-sm text-muted-foreground mt-3">
            {orderStrings.details.loadingOrder}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isOrderError || !order) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
        <HStack className="px-5 py-3 items-center border-b border-border">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center rounded-full bg-secondary mr-2"
          >
            <Icon as={ArrowLeft} size={20} className="text-foreground" />
          </Pressable>
          <Text className="text-base font-semibold text-foreground">
            {orderStrings.details.title}
          </Text>
        </HStack>
        <View className="flex-1 items-center justify-center p-6">
          <Card className="p-6 bg-destructive/10 border border-destructive/30 items-center rounded-xl max-w-sm">
            <Text className="text-base font-semibold text-destructive text-center mb-2">
              {orderStrings.details.orderNotFound}
            </Text>
            <Button
              variant="outline"
              action="negative"
              size="sm"
              onPress={() => void handleRefresh()}
              className="mt-2"
            >
              <ButtonText>{orderStrings.details.retryButton}</ButtonText>
            </Button>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <HStack className="px-5 py-3 items-center justify-between border-b border-border bg-card">
        <HStack space="sm" className="items-center flex-1 mr-2">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center rounded-full bg-secondary active:opacity-75"
            accessibilityRole="button"
            accessibilityLabel="Back to orders"
          >
            <Icon as={ArrowLeft} size={20} className="text-foreground" />
          </Pressable>

          <VStack space="xs" className="flex-1">
            <Heading size="md" className="font-title text-foreground font-bold tracking-tight">
              {order.orderNumber}
            </Heading>
          </VStack>
        </HStack>

        <OrderStatusBadge status={order.status} isUnacknowledged={isUnacknowledged} />
      </HStack>

      <View className="px-5 pt-3 pb-2 bg-background border-b border-border">
        <HStack className="p-1 rounded-xl bg-secondary border border-border">
          <Pressable
            onPress={() => setActiveTab('details')}
            className={`flex-1 py-2 items-center justify-center rounded-lg ${
              activeTab === 'details' ? 'bg-card border border-border' : 'opacity-75'
            }`}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'details' }}
          >
            <Text
              className={`text-sm font-semibold font-sans ${
                activeTab === 'details' ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {orderStrings.details.detailsTab}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('activity')}
            className={`flex-1 py-2 items-center justify-center rounded-lg ${
              activeTab === 'activity' ? 'bg-card border border-border' : 'opacity-75'
            }`}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'activity' }}
          >
            <Text
              className={`text-sm font-semibold font-sans ${
                activeTab === 'activity' ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {orderStrings.details.activityTab}
            </Text>
          </Pressable>
        </HStack>
      </View>

      <ScrollView
        contentContainerClassName="p-5 pb-24"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void handleRefresh()}
            tintColor="#C0643A"
            colors={['#C0643A']}
          />
        }
      >
        {activeTab === 'details' ? (
          <OrderDetailsTab order={order} />
        ) : (
          <OrderActivityTab timeline={timeline} isLoading={isTimelineLoading} />
        )}
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 bg-card border-t border-border px-5 py-3 shadow-lg"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <Button
          variant="solid"
          action="primary"
          size="lg"
          className="w-full bg-primary rounded-xl flex-row items-center justify-center"
          onPress={() => setIsActionSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={orderStrings.details.updateOrder}
        >
          <Icon as={Edit3} size={18} className="text-white mr-2" />
          <ButtonText className="text-white font-bold text-base">
            {orderStrings.details.updateOrder}
          </ButtonText>
        </Button>
      </View>

      <OrderActionSheet
        isOpen={isActionSheetOpen}
        onClose={() => setIsActionSheetOpen(false)}
        order={order}
        timeline={timeline}
        user={user}
      />
    </SafeAreaView>
  );
}
