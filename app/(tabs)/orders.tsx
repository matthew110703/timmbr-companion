import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Search, X } from 'lucide-react-native';
import {
  VStack,
  HStack,
  Text,
  Heading,
  Card,
  Input,
  InputField,
  Pressable,
  Spinner,
  Icon,
  Button,
  ButtonText,
} from '@timmbr/native-ui';
import type { AdminOrderListItemDto, OrderFilterPreset } from '@/features/orders/types/order.types';
import { mapFilterPresetToQueryParams } from '@/features/orders/utils/order-formatters';
import { useInfiniteOrdersQuery } from '@/features/orders/hooks/useOrdersQueries';
import { OrderCard } from '@/features/orders/components/OrderCard';
import { tabStrings } from '@/strings/tabs';

interface FilterOption {
  id: OrderFilterPreset;
  label: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { id: 'ALL', label: tabStrings.orders.filterAll },
  { id: 'NEW', label: tabStrings.orders.filterNew },
  { id: 'CONFIRMED', label: tabStrings.orders.filterConfirmed },
  { id: 'PROCESSING', label: tabStrings.orders.filterProcessing },
  { id: 'SHIPPED', label: tabStrings.orders.filterShipped },
  { id: 'DELIVERED', label: tabStrings.orders.filterDelivered },
  { id: 'CANCELLED', label: tabStrings.orders.filterCancelled },
];

export default function OrdersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string }>();

  const [selectedFilter, setSelectedFilter] = useState<OrderFilterPreset>(
    (params.filter as OrderFilterPreset) || 'ALL',
  );
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (params.filter) {
      setSelectedFilter(params.filter as OrderFilterPreset);
    }
  }, [params.filter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const queryParams = useMemo(() => {
    const base = mapFilterPresetToQueryParams(selectedFilter);
    return {
      ...base,
      search: debouncedSearch || undefined,
    };
  }, [selectedFilter, debouncedSearch]);

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useInfiniteOrdersQuery(queryParams);

  const orders = useMemo(() => {
    if (!data?.pages) return [];
    const list: AdminOrderListItemDto[] = [];
    for (const page of data.pages) {
      if (page.data) {
        list.push(...page.data);
      }
    }
    return list;
  }, [data]);

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  };

  const renderHeader = () => (
    <VStack space="md" className="pb-3 bg-background">
      <VStack space="xs">
        <Heading size="xl" className="font-serif text-primary">
          {tabStrings.orders.title}
        </Heading>
        <Text className="text-xs text-muted-foreground">{tabStrings.orders.subtitle}</Text>
      </VStack>

      <Input className="bg-card border-border">
        <Icon as={Search} size={18} className="text-muted-foreground mr-2" />
        <InputField
          placeholder={tabStrings.orders.searchPlaceholder}
          value={searchInput}
          onChangeText={setSearchInput}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {searchInput.length > 0 && (
          <Pressable onPress={() => setSearchInput('')} className="p-1">
            <Icon as={X} size={16} className="text-muted-foreground" />
          </Pressable>
        )}
      </Input>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="-mx-1 py-1"
        contentContainerStyle={{ paddingHorizontal: 4 }}
      >
        <HStack space="xs">
          {FILTER_OPTIONS.map((opt) => {
            const isSelected = selectedFilter === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => setSelectedFilter(opt.id)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full border items-center justify-center ${
                  isSelected ? 'bg-primary border-primary' : 'bg-card border-border'
                }`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  numberOfLines={1}
                  style={{ fontFamily: 'Manrope-SemiBold', fontWeight: 'normal' }}
                  className={`text-xs ${
                    isSelected ? 'text-primary-foreground' : 'text-foreground'
                  }`}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </HStack>
      </ScrollView>

      {!isLoading && !isError && (
        <HStack className="justify-between items-center pt-1">
          <Text className="text-xs text-muted-foreground font-medium">
            {orders.length} {tabStrings.orders.ordersCount}
          </Text>
        </HStack>
      )}
    </VStack>
  );

  const renderFooter = () => {
    if (isFetchingNextPage) {
      return (
        <View className="py-6 items-center justify-center">
          <Spinner size="small" color="#C0643A" />
          <Text className="text-xs text-muted-foreground mt-2">{tabStrings.orders.loadMore}</Text>
        </View>
      );
    }
    if (orders.length > 0 && !hasNextPage) {
      return (
        <View className="py-6 items-center justify-center">
          <Text className="text-xs text-muted-foreground">{tabStrings.orders.allLoaded}</Text>
        </View>
      );
    }
    return <View className="h-6" />;
  };

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <Card className="items-center justify-center py-16 bg-card/40 border border-border mt-4">
          <Spinner size="large" color="#C0643A" />
          <Text className="text-sm text-muted-foreground mt-3">
            {tabStrings.orders.loadingOrders}
          </Text>
        </Card>
      );
    }

    if (isError) {
      return (
        <Card className="items-center justify-center py-12 bg-destructive/10 border border-destructive/30 p-6 mt-4 rounded-xl">
          <Text className="text-sm font-semibold text-destructive text-center mb-3">
            Failed to load orders.
          </Text>
          <Button variant="outline" action="negative" size="sm" onPress={() => void refetch()}>
            <ButtonText>{tabStrings.orders.retry}</ButtonText>
          </Button>
        </Card>
      );
    }

    return (
      <Card className="items-center justify-center py-16 border-dashed border-border bg-card/40 mt-4">
        <Text className="text-sm text-muted-foreground text-center">
          {tabStrings.orders.emptyOrders}
        </Text>
      </Card>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="mb-3">
            <OrderCard order={item} onPress={(orderId) => router.push(`/orders/${orderId}`)} />
          </View>
        )}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor="#C0643A"
            colors={['#C0643A']}
          />
        }
      />
    </SafeAreaView>
  );
}
