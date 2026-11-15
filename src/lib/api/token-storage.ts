import { Platform } from 'react-native';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const ACCESS_TOKEN_KEY = 'timmbr_access_token';
const REFRESH_TOKEN_KEY = 'timmbr_refresh_token';

const memoryStorage = new Map<string, string>();

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

function getWebStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

export const tokenStorage = {
  async getTokens(): Promise<AuthTokens | null> {
    const secureStore = await getSecureStore();
    if (secureStore && typeof secureStore.getItemAsync === 'function') {
      try {
        const [accessToken, refreshToken] = await Promise.all([
          secureStore.getItemAsync(ACCESS_TOKEN_KEY),
          secureStore.getItemAsync(REFRESH_TOKEN_KEY),
        ]);
        if (accessToken && refreshToken) {
          return { accessToken, refreshToken };
        }
      } catch {}
    }

    const webStorage = getWebStorage();
    if (webStorage) {
      try {
        const accessToken = webStorage.getItem(ACCESS_TOKEN_KEY);
        const refreshToken = webStorage.getItem(REFRESH_TOKEN_KEY);
        if (accessToken && refreshToken) {
          return { accessToken, refreshToken };
        }
      } catch {}
    }

    const accessToken = memoryStorage.get(ACCESS_TOKEN_KEY);
    const refreshToken = memoryStorage.get(REFRESH_TOKEN_KEY);
    if (accessToken && refreshToken) {
      return { accessToken, refreshToken };
    }

    return null;
  },

  async setTokens(tokens: AuthTokens): Promise<void> {
    memoryStorage.set(ACCESS_TOKEN_KEY, tokens.accessToken);
    memoryStorage.set(REFRESH_TOKEN_KEY, tokens.refreshToken);

    const secureStore = await getSecureStore();
    if (secureStore && typeof secureStore.setItemAsync === 'function') {
      try {
        await Promise.all([
          secureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
          secureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken),
        ]);
      } catch {}
    }

    const webStorage = getWebStorage();
    if (webStorage) {
      try {
        webStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
        webStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
      } catch {}
    }
  },

  async clearTokens(): Promise<void> {
    memoryStorage.delete(ACCESS_TOKEN_KEY);
    memoryStorage.delete(REFRESH_TOKEN_KEY);

    const secureStore = await getSecureStore();
    if (secureStore && typeof secureStore.deleteItemAsync === 'function') {
      try {
        await Promise.all([
          secureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
          secureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
        ]);
      } catch {}
    }

    const webStorage = getWebStorage();
    if (webStorage) {
      try {
        webStorage.removeItem(ACCESS_TOKEN_KEY);
        webStorage.removeItem(REFRESH_TOKEN_KEY);
      } catch {}
    }
  },
};
