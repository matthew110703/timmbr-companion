import React, { useEffect, useRef } from 'react';
import {
  Keyboard,
  ScrollView,
  TextInput,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { ArrowLeft, type LucideIcon } from 'lucide-react-native';
import {
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  ButtonText,
  Card,
  Pressable,
  Spinner,
  Icon,
} from '@timmbr/native-ui';
import { orderStrings } from '@/strings/orders';

const FOCUS_MARGIN = 16;

interface SheetFormAction {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'destructive';
  icon?: LucideIcon;
}

interface SheetFormLayoutProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  isSubmitting: boolean;
  errorMessage?: string | null;
  primaryAction: SheetFormAction;
  secondaryLabel?: string;
  children: React.ReactNode;
}

/**
 * Header / scrollable body / footer layout for action-sheet forms. The body
 * shrinks when the sheet is lifted above the keyboard, and the focused input
 * is scrolled into view so it is never hidden behind it.
 */
export function SheetFormLayout({
  title,
  subtitle,
  onBack,
  isSubmitting,
  errorMessage,
  primaryAction,
  secondaryLabel = orderStrings.actions.cancel,
  children,
}: SheetFormLayoutProps) {
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const contentRef = useRef<React.ComponentRef<typeof View>>(null);
  const viewportHeight = useRef(0);
  const scrollOffset = useRef(0);

  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      // Wait a frame so the sheet has re-laid out above the keyboard.
      requestAnimationFrame(() => {
        const input = TextInput.State.currentlyFocusedInput();
        const content = contentRef.current;
        if (!input || !content) return;
        input.measureLayout(content, (_x, y, _w, h) => {
          const visibleTop = scrollOffset.current;
          const visibleBottom = visibleTop + viewportHeight.current;
          if (y + h + FOCUS_MARGIN > visibleBottom) {
            scrollRef.current?.scrollTo({
              y: y + h + FOCUS_MARGIN - viewportHeight.current,
              animated: true,
            });
          } else if (y - FOCUS_MARGIN < visibleTop) {
            scrollRef.current?.scrollTo({
              y: Math.max(0, y - FOCUS_MARGIN),
              animated: true,
            });
          }
        });
      });
    });
    return () => sub.remove();
  }, []);

  const isDestructive = primaryAction.tone === 'destructive';

  return (
    <VStack className="w-full shrink">
      <HStack className="items-center pb-3 border-b border-border">
        <Pressable
          onPress={onBack}
          disabled={isSubmitting}
          className="w-9 h-9 items-center justify-center rounded-full bg-secondary mr-3 active:opacity-75"
          accessibilityRole="button"
          accessibilityLabel={orderStrings.actions.back}
        >
          <Icon as={ArrowLeft} size={18} className="text-foreground" />
        </Pressable>
        <VStack className="flex-1">
          <Heading size="sm" className="font-title text-foreground">
            {title}
          </Heading>
          {subtitle ? <Text className="text-xs text-muted-foreground">{subtitle}</Text> : null}
        </VStack>
      </HStack>

      <ScrollView
        ref={scrollRef}
        className="shrink"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={32}
        onLayout={(e: LayoutChangeEvent) => {
          viewportHeight.current = e.nativeEvent.layout.height;
        }}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          scrollOffset.current = e.nativeEvent.contentOffset.y;
        }}
      >
        <View ref={contentRef} collapsable={false}>
          <VStack space="lg" className="py-4">
            {errorMessage ? (
              <Card className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                <Text className="text-xs text-destructive font-medium">
                  {orderStrings.actions.errorPrefix} {errorMessage}
                </Text>
              </Card>
            ) : null}
            {children}
          </VStack>
        </View>
      </ScrollView>

      <HStack space="sm" className="pt-3 border-t border-border">
        <Button
          variant="outline"
          action="secondary"
          size="md"
          className="flex-1 rounded-xl"
          onPress={onBack}
          disabled={isSubmitting}
        >
          <ButtonText>{secondaryLabel}</ButtonText>
        </Button>
        <Button
          variant="solid"
          action={isDestructive ? 'negative' : 'primary'}
          size="md"
          className={`flex-[1.4] rounded-xl ${isDestructive ? 'bg-destructive' : 'bg-primary'}`}
          onPress={primaryAction.onPress}
          disabled={isSubmitting}
        >
          <HStack space="xs" className="items-center justify-center">
            {isSubmitting ? (
              <Spinner size="small" color="#FFFFFF" />
            ) : primaryAction.icon ? (
              <Icon as={primaryAction.icon} size={16} className="text-white" />
            ) : null}
            <ButtonText className="text-white font-bold text-sm" numberOfLines={1}>
              {isSubmitting ? orderStrings.actions.submitting : primaryAction.label}
            </ButtonText>
          </HStack>
        </Button>
      </HStack>
    </VStack>
  );
}

/** Uppercase section label shared by the sheet forms. */
export function SheetFormLabel({
  children,
  trailing,
}: {
  children: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <HStack className="justify-between items-center mb-2">
      <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {children}
      </Text>
      {trailing}
    </HStack>
  );
}
