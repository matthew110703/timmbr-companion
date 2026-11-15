import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Card,
  Badge,
  BadgeText,
  Button,
  ButtonText,
  Avatar,
  AvatarFallbackText,
  Divider,
  Pressable,
} from '@timmbr/native-ui';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { STAFF_PERMISSIONS } from '@/features/auth/types/auth.types';
import { hasPermission } from '@/features/auth/utils/permissions';
import { useThemeStore, type ThemeMode } from '@/features/theme/store/theme.store';
import { tabStrings } from '@/strings/tabs';

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const signOutAll = useAuthStore((state) => state.signOutAll);

  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSigningOutAll, setIsSigningOutAll] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleSignOutAll = async () => {
    setIsSigningOutAll(true);
    try {
      await signOutAll();
    } finally {
      setIsSigningOutAll(false);
    }
  };

  const getInitials = (name?: string): string => {
    if (!name) return 'ST';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const isMaster = user?.role === 'MASTER';
  const assignedPermissions = user?.permissions ?? [];
  const displayedPermissions: string[] = Array.from(
    new Set([...STAFF_PERMISSIONS, ...assignedPermissions]),
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <ScrollView contentContainerClassName="p-5">
        <VStack space="lg" className="max-w-md w-full mx-auto">
          <VStack space="xs">
            <Heading size="xl" className="font-serif text-primary">
              {tabStrings.profile.title}
            </Heading>
            <Text className="text-xs text-muted-foreground">{tabStrings.profile.subtitle}</Text>
          </VStack>

          <Card>
            <HStack space="md" className="items-center">
              <Avatar size="lg">
                <AvatarFallbackText>{getInitials(user?.name)}</AvatarFallbackText>
              </Avatar>

              <VStack space="xs" className="flex-1">
                <Text className="text-base font-bold text-foreground">
                  {user?.name || 'Staff Member'}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {user?.email || 'staff@timmbr.com'}
                </Text>

                <HStack space="xs" className="mt-1">
                  <Badge
                    variant="solid"
                    action={
                      user?.role === 'MASTER' || user?.role === 'ADMIN' ? 'primary' : 'secondary'
                    }
                  >
                    <BadgeText>{user?.role || 'STAFF'}</BadgeText>
                  </Badge>
                </HStack>
              </VStack>
            </HStack>
          </Card>

          <Card>
            <VStack space="sm">
              <HStack className="justify-between items-center">
                <Text className="font-semibold text-sm text-foreground">
                  {tabStrings.profile.permissionsSection}
                </Text>
                {isMaster && (
                  <Badge variant="outline" action="info">
                    <BadgeText>BYPASS ACTIVE</BadgeText>
                  </Badge>
                )}
              </HStack>

              {isMaster && (
                <Text className="text-xs text-muted-foreground">
                  {tabStrings.profile.allPermissionsGranted}
                </Text>
              )}

              {!isMaster && assignedPermissions.length === 0 && (
                <Text className="text-xs text-muted-foreground">
                  {tabStrings.profile.noPermissions}
                </Text>
              )}

              <Box className="flex-row flex-wrap gap-2 mt-2">
                {displayedPermissions.map((perm) => {
                  const isCoreStaffPerm = (STAFF_PERMISSIONS as readonly string[]).includes(perm);
                  const granted =
                    isMaster ||
                    (isCoreStaffPerm
                      ? hasPermission(user, perm as (typeof STAFF_PERMISSIONS)[number])
                      : assignedPermissions.includes(perm));
                  const label = tabStrings.profile.permissionLabels[perm] ?? perm;
                  return (
                    <Badge
                      key={perm}
                      variant={granted ? 'solid' : 'outline'}
                      action={granted ? 'success' : 'muted'}
                    >
                      <BadgeText>{label}</BadgeText>
                    </Badge>
                  );
                })}
              </Box>
            </VStack>
          </Card>

          <Card>
            <VStack space="sm">
              <Text className="font-semibold text-sm text-foreground">
                {tabStrings.profile.themeSection}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {tabStrings.profile.themeDescription}
              </Text>

              <Box className="flex-row rounded-xl bg-secondary/60 p-1 border border-border mt-2">
                {(['light', 'dark', 'system'] as const).map((tMode: ThemeMode) => {
                  const isActive = mode === tMode;
                  const label =
                    tMode === 'light'
                      ? tabStrings.profile.themeLight
                      : tMode === 'dark'
                        ? tabStrings.profile.themeDark
                        : tabStrings.profile.themeSystem;

                  return (
                    <Pressable
                      key={tMode}
                      onPress={() => setMode(tMode)}
                      className={`flex-1 py-2.5 rounded-lg items-center justify-center ${
                        isActive ? 'bg-card border border-border' : 'opacity-70'
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          isActive ? 'text-primary' : 'text-foreground'
                        }`}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </Box>
            </VStack>
          </Card>

          <Card>
            <VStack space="md">
              <Text className="font-semibold text-sm text-foreground">
                {tabStrings.profile.sessionSection}
              </Text>

              <VStack space="xs">
                <Button
                  action="secondary"
                  variant="outline"
                  size="md"
                  isLoading={isSigningOut}
                  isDisabled={isSigningOut || isSigningOutAll}
                  onPress={handleSignOut}
                >
                  <ButtonText className="text-foreground">
                    {isSigningOut
                      ? tabStrings.profile.signingOut
                      : tabStrings.profile.signOutButton}
                  </ButtonText>
                </Button>
                <Text className="text-xs text-muted-foreground px-1">
                  {tabStrings.profile.signOutDescription}
                </Text>
              </VStack>

              <Divider />

              <VStack space="xs">
                <Button
                  action="negative"
                  variant="outline"
                  size="md"
                  isLoading={isSigningOutAll}
                  isDisabled={isSigningOut || isSigningOutAll}
                  onPress={handleSignOutAll}
                >
                  <ButtonText className="text-destructive">
                    {isSigningOutAll
                      ? tabStrings.profile.signingOut
                      : tabStrings.profile.signOutAllButton}
                  </ButtonText>
                </Button>
                <Text className="text-xs text-muted-foreground px-1">
                  {tabStrings.profile.signOutAllDescription}
                </Text>
              </VStack>
            </VStack>
          </Card>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
