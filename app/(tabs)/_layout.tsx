import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, ShoppingBag, User } from 'lucide-react-native';
import { useThemeStore } from '@/features/theme/store/theme.store';
import { tabStrings } from '@/strings/tabs';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const isDark = resolvedTheme === 'dark';

  const bottomPadding = Math.max(insets.bottom, 8);
  const tabBarStyle = {
    backgroundColor: isDark ? '#1F1F1F' : '#FFFFFF',
    borderTopColor: isDark ? '#3C3C3C' : '#E7E7E7',
    borderTopWidth: 1,
    height: 56 + bottomPadding,
    paddingBottom: bottomPadding,
    paddingTop: 8,
  };

  const activeTintColor = '#C0643A';
  const inactiveTintColor = isDark ? '#9D9D9D' : '#6D6D6D';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: activeTintColor,
        tabBarInactiveTintColor: inactiveTintColor,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          fontFamily: 'Manrope',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: tabStrings.navigation.dashboard,
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size ?? 22} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: tabStrings.navigation.orders,
          tabBarIcon: ({ color, size }) => <ShoppingBag color={color} size={size ?? 22} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: tabStrings.navigation.profile,
          tabBarIcon: ({ color, size }) => <User color={color} size={size ?? 22} />,
        }}
      />
    </Tabs>
  );
}
