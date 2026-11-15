import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TimmbrNativeProvider } from '@timmbr/native-ui';
import { useFonts, DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';

import { useAuthStore } from '@/features/auth/store/auth.store';
import { useThemeStore } from '@/features/theme/store/theme.store';
import '../global.css';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigation() {
  const segments = useSegments();
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const hydrate = useAuthStore((state) => state.hydrate);
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const stackBgColor = resolvedTheme === 'dark' ? '#0B0B0B' : '#FFFFFF';

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (status === 'idle' || status === 'hydrating') return;

    const inAuthGroup = segments[0] === '(auth)';
    const segmentList: readonly string[] = segments;
    const onInviteScreen = inAuthGroup && segmentList[1] === 'accept-invite';

    if (status === 'unauthenticated' && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (status === 'authenticated' && inAuthGroup && !onInviteScreen) {
      router.replace('/(tabs)');
    }
  }, [status, segments, router]);

  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: stackBgColor },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="orders/[orderId]" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
      {(status === 'idle' || status === 'hydrating') && (
        <View className="absolute inset-0 z-50 items-center justify-center bg-background">
          <ActivityIndicator size="large" color="#C0643A" />
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30000,
          },
        },
      }),
  );

  const mode = useThemeStore((state) => state.mode);
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const themeHydrated = useThemeStore((state) => state.hydrated);
  const hydrateTheme = useThemeStore((state) => state.hydrate);
  const { setColorScheme } = useNativeWindColorScheme();

  useEffect(() => {
    void hydrateTheme();
  }, [hydrateTheme]);

  useEffect(() => {
    try {
      setColorScheme(mode);
    } catch {}
  }, [mode, setColorScheme]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(resolvedTheme === 'dark' ? '#0B0B0B' : '#FFFFFF').catch(
      () => {},
    );
  }, [resolvedTheme]);

  const [fontsLoaded, fontError] = useFonts({
    'DM Serif Display': DMSerifDisplay_400Regular,
    Manrope: Manrope_400Regular,
    'Manrope-Medium': Manrope_500Medium,
    'Manrope-SemiBold': Manrope_600SemiBold,
    'Manrope-Bold': Manrope_700Bold,
    Outfit: Outfit_400Regular,
    'Outfit-Medium': Outfit_500Medium,
    'Outfit-SemiBold': Outfit_600SemiBold,
    'Outfit-Bold': Outfit_700Bold,
  });

  useEffect(() => {
    if (themeHydrated && (fontsLoaded || fontError)) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [themeHydrated, fontsLoaded, fontError]);

  if (!themeHydrated || (!fontsLoaded && !fontError)) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
        <TimmbrNativeProvider mode={resolvedTheme}>
          <RootNavigation />
        </TimmbrNativeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
