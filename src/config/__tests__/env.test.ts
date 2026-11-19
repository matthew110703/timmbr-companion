import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, it, expect, vi } from 'vitest';
import {
  extractHostFromUri,
  getDevMailpitUrl,
  isLocalOrPrivateHost,
  parseEnv,
  readProcessEnv,
  resolveDevApiUrl,
} from '../env';
import { resolveExpoConfig } from '../../../app.config';

describe('Environment Boundary Configuration', () => {
  describe('parseEnv', () => {
    it('applies default configuration when given empty environment', () => {
      const config = parseEnv({});
      expect(config.EXPO_PUBLIC_APP_ENV).toBe('development');
      expect(config.EXPO_PUBLIC_API_URL).toBe('http://localhost:8000/api/v1');
      expect(config.EXPO_PUBLIC_REQUEST_TIMEOUT_MS).toBe(15000);
      expect(config.CLIENT_PLATFORM).toBe('staff-companion');
    });

    it('accepts valid development environment', () => {
      const config = parseEnv({
        EXPO_PUBLIC_APP_ENV: 'development',
        EXPO_PUBLIC_API_URL: 'http://localhost:8000/api/v1',
        EXPO_PUBLIC_REQUEST_TIMEOUT_MS: '10000',
      });
      expect(config.EXPO_PUBLIC_APP_ENV).toBe('development');
      expect(config.EXPO_PUBLIC_REQUEST_TIMEOUT_MS).toBe(10000);
    });

    it('accepts valid preview environment', () => {
      const config = parseEnv({
        EXPO_PUBLIC_APP_ENV: 'preview',
        EXPO_PUBLIC_API_URL: 'https://preview-api.timmbr.com/api/v1',
        EXPO_PUBLIC_REQUEST_TIMEOUT_MS: 20000,
      });
      expect(config.EXPO_PUBLIC_APP_ENV).toBe('preview');
      expect(config.EXPO_PUBLIC_API_URL).toBe('https://preview-api.timmbr.com/api/v1');
      expect(config.EXPO_PUBLIC_REQUEST_TIMEOUT_MS).toBe(20000);
    });

    it('accepts valid production environment', () => {
      const config = parseEnv({
        EXPO_PUBLIC_APP_ENV: 'production',
        EXPO_PUBLIC_API_URL: 'https://api.timmbr.com/api/v1',
        EXPO_PUBLIC_REQUEST_TIMEOUT_MS: '30000',
      });
      expect(config.EXPO_PUBLIC_APP_ENV).toBe('production');
      expect(config.EXPO_PUBLIC_API_URL).toBe('https://api.timmbr.com/api/v1');
      expect(config.EXPO_PUBLIC_REQUEST_TIMEOUT_MS).toBe(30000);
    });

    it('rejects invalid URLs for EXPO_PUBLIC_API_URL', () => {
      expect(() =>
        parseEnv({
          EXPO_PUBLIC_API_URL: 'not-a-valid-url',
        }),
      ).toThrowError(/Invalid environment configuration/);
    });

    it('rejects unsupported APP_ENV values', () => {
      expect(() =>
        parseEnv({
          EXPO_PUBLIC_APP_ENV: 'staging',
        }),
      ).toThrowError(/Invalid environment configuration/);
    });

    it('rejects negative or zero request timeouts', () => {
      expect(() =>
        parseEnv({
          EXPO_PUBLIC_REQUEST_TIMEOUT_MS: 0,
        }),
      ).toThrowError(/Invalid environment configuration/);

      expect(() =>
        parseEnv({
          EXPO_PUBLIC_REQUEST_TIMEOUT_MS: -1000,
        }),
      ).toThrowError(/Invalid environment configuration/);
    });

    it('rejects unauthorized client platforms', () => {
      expect(() =>
        parseEnv({
          CLIENT_PLATFORM: 'customer-storefront',
        }),
      ).toThrowError(/Invalid environment configuration/);
    });
  });

  describe('resolveExpoConfig', () => {
    it('resolves development profile with correct bundle identifiers and package name', () => {
      const config = resolveExpoConfig('development');
      expect(config.name).toBe('Timmbr Companion (Dev)');
      expect(config.slug).toBe('timmbr-companion');
      expect(config.scheme).toBe('timmbr-companion');
      expect(config.userInterfaceStyle).toBe('automatic');
      expect(config.experiments?.typedRoutes).toBe(true);
      expect(config.android?.package).toBe('com.timmbr.companion.dev');
      expect(config.ios?.bundleIdentifier).toBe('com.timmbr.companion.dev');
    });

    it('resolves preview profile with correct bundle identifiers and package name', () => {
      const config = resolveExpoConfig('preview');
      expect(config.name).toBe('Timmbr Companion (Preview)');
      expect(config.android?.package).toBe('com.timmbr.companion.preview');
      expect(config.ios?.bundleIdentifier).toBe('com.timmbr.companion.preview');
    });

    it('resolves production profile with correct bundle identifiers and package name', () => {
      const config = resolveExpoConfig('production');
      expect(config.name).toBe('Timmbr Companion');
      expect(config.android?.package).toBe('com.timmbr.companion');
      expect(config.ios?.bundleIdentifier).toBe('com.timmbr.companion');
    });

    it('defaults to development profile when no environment name is supplied', () => {
      const config = resolveExpoConfig();
      expect(config.name).toBe('Timmbr Companion (Dev)');
      expect(config.android?.package).toBe('com.timmbr.companion.dev');
      expect(config.ios?.bundleIdentifier).toBe('com.timmbr.companion.dev');
    });

    it('registers a Firebase client for every profile package so each build can receive push', () => {
      const servicesPath = resolve(__dirname, '../../..', 'google-services.json');
      const services = JSON.parse(readFileSync(servicesPath, 'utf8')) as {
        client: { client_info: { android_client_info: { package_name: string } } }[];
      };
      const firebasePackages = services.client.map(
        (c) => c.client_info.android_client_info.package_name,
      );

      for (const profile of ['development', 'preview', 'production']) {
        const config = resolveExpoConfig(profile);
        expect(config.android?.googleServicesFile).toBe('./google-services.json');
        expect(firebasePackages).toContain(config.android?.package);
        expect(config.plugins).toContainEqual([
          'expo-notifications',
          expect.objectContaining({ defaultChannel: 'orders' }),
        ]);
      }
    });
  });

  describe('Zero-Config Dev LAN Resolution', () => {
    it('extracts LAN IP host from Metro scriptURL, exp:// URIs, and hostUri strings', () => {
      expect(extractHostFromUri('http://192.168.1.42:8081/index.bundle?platform=android')).toBe(
        '192.168.1.42',
      );
      expect(extractHostFromUri('exp://10.0.0.5:8081')).toBe('10.0.0.5');
      expect(extractHostFromUri('172.20.10.2:8081')).toBe('172.20.10.2');
      expect(extractHostFromUri('http://localhost:8081/index.bundle')).toBeNull();
      expect(extractHostFromUri('http://127.0.0.1:8081')).toBeNull();
      expect(extractHostFromUri('https://abc123.anonymous.timmbr.exp.direct:80')).toBeNull();
    });

    it('identifies loopback and private RFC1918 LAN hosts', () => {
      expect(isLocalOrPrivateHost('localhost')).toBe(true);
      expect(isLocalOrPrivateHost('127.0.0.1')).toBe(true);
      expect(isLocalOrPrivateHost('10.0.2.2')).toBe(true);
      expect(isLocalOrPrivateHost('192.168.1.15')).toBe(true);
      expect(isLocalOrPrivateHost('10.12.34.56')).toBe(true);
      expect(isLocalOrPrivateHost('172.20.10.2')).toBe(true);
      expect(isLocalOrPrivateHost('172.32.0.1')).toBe(false);
      expect(isLocalOrPrivateHost('api.timmbr.com')).toBe(false);
    });

    it('rewrites localhost, 127.0.0.1, and stale LAN IPs to the current Metro host IP in development', () => {
      expect(resolveDevApiUrl('http://localhost:8000/api/v1', 'development', '192.168.1.42')).toBe(
        'http://192.168.1.42:8000/api/v1',
      );
      expect(resolveDevApiUrl('http://127.0.0.1:8000/api/v1', 'development', '192.168.1.42')).toBe(
        'http://192.168.1.42:8000/api/v1',
      );
      expect(
        resolveDevApiUrl('http://192.168.1.42:8000/api/v1', 'development', '172.20.10.2'),
      ).toBe('http://172.20.10.2:8000/api/v1');
    });

    it('preserves remote URLs and non-development environments', () => {
      expect(
        resolveDevApiUrl('https://staging-api.timmbr.com/api/v1', 'development', '192.168.1.42'),
      ).toBe('https://staging-api.timmbr.com/api/v1');
      expect(resolveDevApiUrl('http://localhost:8000/api/v1', 'preview', '192.168.1.42')).toBe(
        'http://localhost:8000/api/v1',
      );
      expect(resolveDevApiUrl('http://localhost:8000/api/v1', 'production', '192.168.1.42')).toBe(
        'http://localhost:8000/api/v1',
      );
      expect(resolveDevApiUrl('http://localhost:8000/api/v1', 'development', null)).toBe(
        'http://localhost:8000/api/v1',
      );
    });

    it('builds Mailpit inbox URL using current Metro host or localhost fallback', () => {
      expect(getDevMailpitUrl('192.168.1.42')).toBe('http://192.168.1.42:8025');
      expect(getDevMailpitUrl(null)).toBe('http://localhost:8025');
    });
  });

  describe('readProcessEnv', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('reads each EXPO_PUBLIC_ variable individually', () => {
      vi.stubEnv('EXPO_PUBLIC_APP_ENV', 'preview');
      vi.stubEnv('EXPO_PUBLIC_API_URL', 'https://staging-api.timmbr.com/api/v1');
      vi.stubEnv('EXPO_PUBLIC_REQUEST_TIMEOUT_MS', '20000');

      const config = parseEnv(readProcessEnv());
      expect(config.EXPO_PUBLIC_APP_ENV).toBe('preview');
      expect(config.EXPO_PUBLIC_API_URL).toBe('https://staging-api.timmbr.com/api/v1');
      expect(config.EXPO_PUBLIC_REQUEST_TIMEOUT_MS).toBe(20000);
    });

    it('only accesses process.env through literal EXPO_PUBLIC_ members Expo can inline', () => {
      const source = readFileSync(resolve(__dirname, '../env.ts'), 'utf8');
      const accesses = source.match(/process\.env[^\s;,)]*/g) ?? [];
      expect(accesses.length).toBeGreaterThan(0);
      for (const access of accesses) {
        expect(access).toMatch(/^process\.env\.EXPO_PUBLIC_[A-Z_]+$/);
      }
    });
  });
});
