import { Stack } from 'expo-router';
import { useThemeStore } from '@/features/theme/store/theme.store';

export default function AuthLayout() {
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: {
          backgroundColor: resolvedTheme === 'dark' ? '#0B0B0B' : '#FFFFFF',
        },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="accept-invite" />
    </Stack>
  );
}
