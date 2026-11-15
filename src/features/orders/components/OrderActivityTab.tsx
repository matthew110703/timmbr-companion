import React from 'react';
import { View } from 'react-native';
import { AlertTriangle, Calendar, Clock, Hammer, Mail, User } from 'lucide-react-native';
import { VStack, HStack, Text, Heading, Card, Badge, BadgeText, Icon } from '@timmbr/native-ui';
import type { OrderActivityResponseDto, OrderTimelineResponseDto } from '../types/order.types';
import { formatActivityTime, groupActivitiesByDay } from '../utils/order-formatters';
import { orderStrings } from '@/strings/orders';

export interface OrderActivityTabProps {
  timeline?: OrderTimelineResponseDto | null;
  isLoading?: boolean;
}

function formatEventTypeTitle(type: string): string {
  if (!type) return 'Activity Event';
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function getRailDotClassName(activity: OrderActivityResponseDto): string {
  const type = activity.eventType?.toUpperCase() ?? '';
  if (
    type.includes('MANUFACTURING') ||
    type.includes('SHIPPED') ||
    type.includes('DELIVERED') ||
    type.includes('DISPATCH')
  ) {
    return 'bg-[#C0643A] border-[#C0643A]';
  }
  if (activity.isCustomerVisible) {
    return 'bg-blue-600 border-blue-600';
  }
  return 'bg-card border-muted-foreground';
}

function TimelineBadge({
  variant,
  action,
  badgeClassName = '',
  textClassName = '',
  label,
}: {
  variant: React.ComponentProps<typeof Badge>['variant'];
  action: React.ComponentProps<typeof Badge>['action'];
  badgeClassName?: string;
  textClassName?: string;
  label: string;
}) {
  return (
    <Badge variant={variant} action={action} className={`shrink-0 ${badgeClassName}`}>
      <BadgeText
        numberOfLines={1}
        style={{ fontFamily: 'Manrope-SemiBold', fontWeight: 'normal' }}
        className={`text-[10px] tracking-normal ${textClassName}`}
      >
        {label}
      </BadgeText>
    </Badge>
  );
}

function ActivityTimelineRow({
  activity,
  isLastInDay,
}: {
  activity: OrderActivityResponseDto;
  isLastInDay: boolean;
}) {
  const formattedTime = formatActivityTime(activity.createdAt);
  const staff = activity.staff;
  const notification = activity.notification;
  const dotClass = getRailDotClassName(activity);

  return (
    <HStack className="items-stretch">
      <View className="w-6 items-center">
        <View className="w-0.5 h-3.5 bg-border" />
        <View className={`w-3 h-3 rounded-full border-2 ${dotClass}`} />
        {!isLastInDay && <View className="w-0.5 flex-1 bg-border" />}
      </View>

      <View className={`flex-1 pl-2 ${isLastInDay ? 'pb-1' : 'pb-3'}`}>
        <Card className="p-3.5 bg-card border border-border rounded-xl">
          <VStack space="sm">
            <HStack className="justify-between items-start gap-2">
              <VStack space="xs" className="flex-1">
                <Text className="font-bold text-sm text-foreground">
                  {formatEventTypeTitle(activity.eventType)}
                </Text>
                {activity.updateCategory && (
                  <Text className="text-[11px] text-muted-foreground uppercase font-mono tracking-wider">
                    {activity.updateCategory.replace(/_/g, ' ')}
                  </Text>
                )}
              </VStack>

              {activity.isCustomerVisible ? (
                <TimelineBadge
                  variant="outline"
                  action="info"
                  badgeClassName="border-blue-600/50 bg-blue-500/10"
                  textClassName="text-blue-600"
                  label={orderStrings.activity.customerBadge}
                />
              ) : (
                <TimelineBadge
                  variant="outline"
                  action="secondary"
                  badgeClassName="border-border bg-secondary/40"
                  textClassName="text-muted-foreground"
                  label={orderStrings.activity.internalBadge}
                />
              )}
            </HStack>

            {activity.description ? (
              <Text className="text-sm text-foreground/90 leading-relaxed">
                {activity.description}
              </Text>
            ) : null}

            <HStack className="justify-between items-center pt-2 border-t border-border/50 mt-0.5 gap-2">
              <HStack space="xs" className="items-center flex-1">
                <Icon as={User} size={13} className="text-muted-foreground" />
                <Text className="text-xs text-muted-foreground flex-1" numberOfLines={1}>
                  {staff
                    ? `${orderStrings.activity.actorStaffPrefix} ${staff.name} (${staff.role})`
                    : orderStrings.activity.actorSystem}
                </Text>
              </HStack>

              <HStack space="xs" className="items-center shrink-0">
                <Icon as={Clock} size={12} className="text-foreground" />
                <Text className="text-xs text-foreground/80 font-semibold">{formattedTime}</Text>
              </HStack>
            </HStack>

            {notification && (
              <HStack className="items-center justify-between bg-secondary/30 rounded-lg px-2.5 py-1.5 mt-0.5 border border-border/40 gap-2">
                <HStack space="xs" className="items-center flex-1">
                  <Icon as={Mail} size={13} className="text-muted-foreground" />
                  <Text className="text-xs text-muted-foreground flex-1" numberOfLines={1}>
                    {notification.recipient}
                  </Text>
                </HStack>

                {notification.status === 'SENT' && (
                  <TimelineBadge
                    variant="solid"
                    action="success"
                    badgeClassName="px-2 py-0.5"
                    textClassName="text-white"
                    label={orderStrings.activity.notificationSent}
                  />
                )}

                {notification.status === 'PENDING' && (
                  <TimelineBadge
                    variant="solid"
                    action="warning"
                    badgeClassName="px-2 py-0.5"
                    textClassName="text-white"
                    label={orderStrings.activity.notificationPending}
                  />
                )}

                {notification.status === 'FAILED' && (
                  <TimelineBadge
                    variant="solid"
                    action="error"
                    badgeClassName="px-2 py-0.5"
                    textClassName="text-white"
                    label={orderStrings.activity.notificationFailed}
                  />
                )}
              </HStack>
            )}
          </VStack>
        </Card>
      </View>
    </HStack>
  );
}

export function OrderActivityTab({
  timeline,
  isLoading: _isLoading = false,
}: OrderActivityTabProps) {
  const activities = timeline?.activities || [];
  const hasManufacturing = timeline?.hasManufacturingStarted ?? false;
  const pendingCancellation = timeline?.pendingCancellationRequest;
  const dayGroups = groupActivitiesByDay(activities);

  return (
    <VStack space="md" className="pb-8">
      {hasManufacturing && (
        <Card className="border-l-4 border-l-[#C0643A] bg-[#C0643A]/10 border-border p-4">
          <HStack space="sm" className="items-start">
            <Icon as={Hammer} size={20} className="text-[#C0643A] mt-0.5" />
            <VStack space="xs" className="flex-1">
              <Text className="font-bold text-sm text-foreground">
                {orderStrings.activity.manufacturingStartedBanner}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {orderStrings.activity.manufacturingStartedDesc}
              </Text>
            </VStack>
          </HStack>
        </Card>
      )}

      {pendingCancellation && (
        <Card className="border-l-4 border-l-destructive bg-destructive/10 border-border p-4">
          <HStack space="sm" className="items-start">
            <Icon as={AlertTriangle} size={20} className="text-destructive mt-0.5" />
            <VStack space="xs" className="flex-1">
              <Text className="font-bold text-sm text-destructive">
                {orderStrings.activity.cancellationAlertTitle}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {orderStrings.activity.cancellationAlertDesc}
              </Text>
            </VStack>
          </HStack>
        </Card>
      )}

      <VStack space="sm">
        <HStack className="justify-between items-center">
          <Heading size="sm" className="font-title text-foreground">
            {orderStrings.activity.title}
          </Heading>
          <TimelineBadge
            variant="outline"
            action="secondary"
            textClassName="text-muted-foreground text-xs"
            label={`${activities.length} ${activities.length === 1 ? 'event' : 'events'}`}
          />
        </HStack>

        {activities.length === 0 ? (
          <Card className="items-center justify-center py-12 border-dashed border-border bg-card/40">
            <Icon as={Clock} size={32} className="text-muted-foreground mb-2" />
            <Text className="text-sm text-muted-foreground text-center">
              {orderStrings.activity.emptyActivities}
            </Text>
          </Card>
        ) : (
          <VStack space="lg" className="mt-1">
            {dayGroups.map((group) => (
              <View key={group.dateKey}>
                <HStack className="items-center justify-between pb-2.5">
                  <HStack
                    space="xs"
                    className="items-center px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30"
                  >
                    <Icon as={Calendar} size={14} className="text-primary" />
                    {group.dayParts ? (
                      <Text className="text-sm text-primary">
                        <Text className="font-bold text-primary">{group.dayParts.dayName}</Text>
                        <Text className="font-medium text-primary">
                          {group.dayParts.isRelative ? ' · ' : ', '}
                          {group.dayParts.date}
                        </Text>
                      </Text>
                    ) : (
                      <Text className="text-sm font-bold text-primary">{group.dayLabel}</Text>
                    )}
                  </HStack>
                  <Text className="text-xs text-muted-foreground">
                    {group.items.length} {group.items.length === 1 ? 'update' : 'updates'}
                  </Text>
                </HStack>

                {group.items.map((activity, idx) => (
                  <ActivityTimelineRow
                    key={activity.id}
                    activity={activity}
                    isLastInDay={idx === group.items.length - 1}
                  />
                ))}
              </View>
            ))}
          </VStack>
        )}
      </VStack>
    </VStack>
  );
}
