import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/features/auth/store/auth.store';

export default function IndexScreen() {
  const status = useAuthStore((state) => state.status);

  if (status === 'idle' || status === 'hydrating') {
    return null;
  }

  if (status === 'authenticated') {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
