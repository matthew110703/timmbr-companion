import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Appearance, Platform } from 'react-native';

const secureStoreData = new Map<string, string>();

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async (key: string) => secureStoreData.get(key) ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => {
    secureStoreData.set(key, value);
  }),
  deleteItemAsync: vi.fn(async (key: string) => {
    secureStoreData.delete(key);
  }),
}));

import * as SecureStore from 'expo-secure-store';
import { useThemeStore } from '../store/theme.store';

describe('Theme Store', () => {
  const originalOs = Platform.OS;

  beforeEach(() => {
    (Platform as { OS: string }).OS = 'android';
    secureStoreData.clear();
    vi.clearAllMocks();
    useThemeStore.setState({
      mode: 'system',
      resolvedTheme: 'light',
      hydrated: false,
    });
  });

  afterEach(() => {
    (Platform as { OS: string }).OS = originalOs;
  });

  it('persists selected theme mode to SecureStore and updates resolvedTheme', async () => {
    useThemeStore.getState().setMode('dark');

    expect(useThemeStore.getState().mode).toBe('dark');
    expect(useThemeStore.getState().resolvedTheme).toBe('dark');
    expect(useThemeStore.getState().hydrated).toBe(true);

    await vi.waitFor(() => {
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('timmbr_theme_mode', 'dark');
    });
    expect(secureStoreData.get('timmbr_theme_mode')).toBe('dark');
  });

  it('hydrates previously saved theme mode from SecureStore on startup', async () => {
    secureStoreData.set('timmbr_theme_mode', 'dark');

    await useThemeStore.getState().hydrate();

    expect(useThemeStore.getState().mode).toBe('dark');
    expect(useThemeStore.getState().resolvedTheme).toBe('dark');
    expect(useThemeStore.getState().hydrated).toBe(true);
  });

  it('marks hydrated=true with default system mode when no preference is stored', async () => {
    vi.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');

    await useThemeStore.getState().hydrate();

    expect(useThemeStore.getState().mode).toBe('system');
    expect(useThemeStore.getState().resolvedTheme).toBe('light');
    expect(useThemeStore.getState().hydrated).toBe(true);
  });

  it('does not let slow hydration overwrite a newer manual mode selection', async () => {
    let resolveRead!: (value: string | null) => void;
    vi.mocked(SecureStore.getItemAsync).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRead = resolve;
        }),
    );

    const hydratePromise = useThemeStore.getState().hydrate();
    await vi.waitFor(() => {
      expect(typeof resolveRead).toBe('function');
    });
    useThemeStore.getState().setMode('light');
    resolveRead('dark');
    await hydratePromise;

    expect(useThemeStore.getState().mode).toBe('light');
    expect(useThemeStore.getState().resolvedTheme).toBe('light');
  });

  it('toggles between light and dark modes', () => {
    useThemeStore.getState().setMode('light');
    useThemeStore.getState().toggleMode();
    expect(useThemeStore.getState().mode).toBe('dark');
    expect(useThemeStore.getState().resolvedTheme).toBe('dark');

    useThemeStore.getState().toggleMode();
    expect(useThemeStore.getState().mode).toBe('light');
    expect(useThemeStore.getState().resolvedTheme).toBe('light');
  });
});
