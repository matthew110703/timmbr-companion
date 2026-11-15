import { Appearance, Platform } from 'react-native';
import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeState {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const THEME_STORAGE_KEY = 'timmbr_theme_mode';

let secureStoreModule: typeof import('expo-secure-store') | null = null;
let secureStoreChecked = false;

async function getSecureStore() {
  if (Platform.OS === 'web') return null;
  if (!secureStoreChecked) {
    secureStoreChecked = true;
    try {
      secureStoreModule = await import('expo-secure-store');
    } catch {
      secureStoreModule = null;
    }
  }
  return secureStoreModule;
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

function applyNativeAppearance(mode: ThemeMode): void {
  try {
    if (typeof Appearance.setColorScheme === 'function') {
      Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
    }
  } catch {}
}

function getInitialModeSync(): ThemeMode {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (isThemeMode(stored)) {
        return stored;
      }
    } catch {}
  }
  return 'system';
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') {
    const colorScheme = Appearance.getColorScheme();
    return colorScheme === 'dark' ? 'dark' : 'light';
  }
  return mode;
}

async function readPersistedMode(): Promise<ThemeMode | null> {
  const secureStore = await getSecureStore();
  if (secureStore && typeof secureStore.getItemAsync === 'function') {
    try {
      const stored = await secureStore.getItemAsync(THEME_STORAGE_KEY);
      if (isThemeMode(stored)) {
        return stored;
      }
    } catch {}
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (isThemeMode(stored)) {
        return stored;
      }
    } catch {}
  }

  return null;
}

async function persistMode(mode: ThemeMode): Promise<void> {
  const secureStore = await getSecureStore();
  if (secureStore && typeof secureStore.setItemAsync === 'function') {
    try {
      await secureStore.setItemAsync(THEME_STORAGE_KEY, mode);
    } catch {}
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {}
  }
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const initialMode = getInitialModeSync();
  const initialResolved = resolveTheme(initialMode);
  let modeVersion = 0;
  let hydratePromise: Promise<void> | null = null;

  Appearance.addChangeListener(({ colorScheme }) => {
    if (get().mode === 'system') {
      set({ resolvedTheme: colorScheme === 'dark' ? 'dark' : 'light' });
    }
  });

  return {
    mode: initialMode,
    resolvedTheme: initialResolved,
    hydrated: false,

    hydrate: async () => {
      if (get().hydrated) return;
      if (hydratePromise) return hydratePromise;

      const versionAtStart = modeVersion;
      hydratePromise = (async () => {
        try {
          const stored = await readPersistedMode();
          if (stored && modeVersion === versionAtStart) {
            applyNativeAppearance(stored);
            set({
              mode: stored,
              resolvedTheme: resolveTheme(stored),
            });
          }
        } finally {
          hydratePromise = null;
          set({ hydrated: true });
        }
      })();

      return hydratePromise;
    },

    setMode: (mode: ThemeMode) => {
      modeVersion += 1;
      applyNativeAppearance(mode);
      void persistMode(mode);
      set({
        mode,
        resolvedTheme: resolveTheme(mode),
        hydrated: true,
      });
    },

    toggleMode: () => {
      const current = get().mode;
      const next: ThemeMode =
        current === 'system'
          ? get().resolvedTheme === 'dark'
            ? 'light'
            : 'dark'
          : current === 'dark'
            ? 'light'
            : 'dark';

      get().setMode(next);
    },
  };
});
