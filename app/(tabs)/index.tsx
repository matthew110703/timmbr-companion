import React from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  VStack,
  HStack,
  Text,
  Heading,
  Card,
  Badge,
  BadgeText,
  Button,
  ButtonText,
  Spinner,
} from '@timmbr/native-ui';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { env } from '@/config/env';
import { useDashboardStatsQuery } from '@/features/orders/hooks/useOrdersQueries';
import { StatCard } from '@/features/orders/components/StatCard';
import { OrderCard } from '@/features/orders/components/OrderCard';
import { tabStrings } from '@/strings/tabs';

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const { data: statsData, isLoading, isError, refetch, isRefetching } = useDashboardStatsQuery();

  const counts = statsData?.counts ?? {
    newOrders: 0,
    processing: 0,
    outForDelivery: 0,
    completed: 0,
  };

  const recentOrders = statsData?.recentOrders ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerClassName="p-5 pb-12"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor="#C0643A"
            colors={['#C0643A']}
          />
        }
      >
        <VStack space="lg">
          <HStack className="justify-between items-start">
            <VStack space="xs" className="flex-1 mr-3">
              <Text className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                {user?.role ? `${user.role} WORKSPACE` : 'STAFF WORKSPACE'}
              </Text>
              <Heading size="xl" className="font-serif text-primary" numberOfLines={1}>
                {user?.name ? `Welcome, ${user.name}` : tabStrings.dashboard.title}
              </Heading>
              <Text className="text-xs text-muted-foreground mt-0.5">
                {tabStrings.dashboard.subtitle}
              </Text>
            </VStack>
            <Badge variant="solid" action="primary">
              <BadgeText>{env.EXPO_PUBLIC_APP_ENV.toUpperCase()}</BadgeText>
            </Badge>
          </HStack>

          {isError && (
            <Card className="border border-destructive/40 bg-destructive/10 p-4 rounded-xl">
              <VStack space="sm" className="items-center">
                <Text className="text-sm font-semibold text-destructive text-center">
                  {tabStrings.dashboard.statsError}
                </Text>
                <Button
                  variant="outline"
                  action="negative"
                  size="sm"
                  onPress={() => void refetch()}
                >
                  <ButtonText>{tabStrings.dashboard.retry}</ButtonText>
                </Button>
              </VStack>
            </Card>
          )}

          <VStack space="sm">
            <HStack className="justify-between items-center">
              <Text className="font-bold text-sm text-foreground uppercase tracking-wider">
                {tabStrings.dashboard.statsHeader}
              </Text>
              {isLoading && <Spinner size="small" color="#C0643A" />}
            </HStack>

            <VStack space="sm">
              <HStack space="sm" className="items-stretch">
                <StatCard
                  count={counts.newOrders}
                  label={tabStrings.dashboard.statCards.newOrders.label}
                  subtitle={tabStrings.dashboard.statCards.newOrders.subtitle}
                  preset="NEW"
                  accentColor="#D97706"
                />
                <StatCard
                  count={counts.processing}
                  label={tabStrings.dashboard.statCards.processing.label}
                  subtitle={tabStrings.dashboard.statCards.processing.subtitle}
                  preset="PROCESSING"
                  accentColor="#C0643A"
                />
              </HStack>
              <HStack space="sm" className="items-stretch">
                <StatCard
                  count={counts.outForDelivery}
                  label={tabStrings.dashboard.statCards.outForDelivery.label}
                  subtitle={tabStrings.dashboard.statCards.outForDelivery.subtitle}
                  preset="SHIPPED"
                  accentColor="#CD8361"
                />
                <StatCard
                  count={counts.completed}
                  label={tabStrings.dashboard.statCards.completed.label}
                  subtitle={tabStrings.dashboard.statCards.completed.subtitle}
                  preset="DELIVERED"
                  accentColor="#059669"
                />
              </HStack>
            </VStack>
          </VStack>

          <VStack space="sm">
            <HStack className="justify-between items-center">
              <Heading size="md" className="font-title text-foreground">
                {tabStrings.dashboard.recentHeader}
              </Heading>
              <Button
                variant="link"
                action="primary"
                size="sm"
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/orders',
                    params: { filter: 'ALL' },
                  })
                }
              >
                <ButtonText className="text-primary text-xs font-semibold">
                  {tabStrings.dashboard.viewAll}
                </ButtonText>
              </Button>
            </HStack>

            {isLoading ? (
              <Card className="items-center justify-center py-12 bg-card/60 border border-border">
                <Spinner size="small" color="#C0643A" />
                <Text className="text-xs text-muted-foreground mt-2">
                  {tabStrings.dashboard.loadingStats}
                </Text>
              </Card>
            ) : recentOrders.length === 0 ? (
              <Card className="items-center justify-center py-10 border-dashed border-border bg-card/50">
                <Text className="text-sm text-muted-foreground text-center">
                  {tabStrings.dashboard.emptyRecent}
                </Text>
              </Card>
            ) : (
              <VStack space="sm">
                {recentOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onPress={(orderId) => router.push(`/orders/${orderId}`)}
                  />
                ))}
              </VStack>
            )}
          </VStack>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
