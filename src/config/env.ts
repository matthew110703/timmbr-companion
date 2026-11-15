import { NativeModules } from 'react-native';
import Constants from 'expo-constants';
import { z } from 'zod';

export const EnvSchema = z.object({
  EXPO_PUBLIC_APP_ENV: z.enum(['development', 'preview', 'production']).default('development'),
  EXPO_PUBLIC_API_URL: z.string().url().default('http://localhost:8000/api/v1'),
  EXPO_PUBLIC_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  CLIENT_PLATFORM: z.literal('staff-companion').default('staff-companion'),
});

export type Env = z.infer<typeof EnvSchema>;

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);
const TUNNEL_HOST_SUFFIXES = ['.exp.direct', '.ngrok.io', '.ngrok-free.app', '.trycloudflare.com'];

export function isLocalOrPrivateHost(hostname: string): boolean {
  const clean = hostname.trim().toLowerCase();
  if (LOOPBACK_HOSTS.has(clean) || clean === '10.0.2.2') {
    return true;
  }
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(clean)) {
    return true;
  }
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(clean)) {
    return true;
  }
  const match172 = /^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/.exec(clean);
  if (match172) {
    const secondOctet = Number(match172[1]);
    if (secondOctet >= 16 && secondOctet <= 31) {
      return true;
    }
  }
  return false;
}

export function extractHostFromUri(uri?: string | null): string | null {
  if (!uri || typeof uri !== 'string') return null;
  const trimmed = uri.trim();
  if (!trimmed) return null;

  try {
    const normalized = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)
      ? trimmed.replace(/^exp:\/\//i, 'http://').replace(/^exps:\/\//i, 'https://')
      : `http://${trimmed}`;
    const parsed = new URL(normalized);
    const host = parsed.hostname.trim();
    const lowerHost = host.toLowerCase();
    if (
      !host ||
      LOOPBACK_HOSTS.has(lowerHost) ||
      TUNNEL_HOST_SUFFIXES.some((suffix) => lowerHost.endsWith(suffix))
    ) {
      return null;
    }
    return host;
  } catch {
    return null;
  }
}

export function getRuntimeMetroHost(): string | null {
  const candidates: Array<string | null | undefined> = [];

  try {
    const sourceCode = (NativeModules as { SourceCode?: { scriptURL?: string | null } } | undefined)
      ?.SourceCode;
    if (sourceCode?.scriptURL) {
      candidates.push(sourceCode.scriptURL);
    }
  } catch {}

  try {
    if (Constants?.expoConfig?.hostUri) {
      candidates.push(Constants.expoConfig.hostUri);
    }
    const expConstants = Constants as unknown as {
      expoGoConfig?: { debuggerHost?: string | null } | null;
      experienceUrl?: string | null;
      linkingUri?: string | null;
      manifest2?: { extra?: { expoClient?: { hostUri?: string | null } } } | null;
    };
    if (expConstants?.expoGoConfig?.debuggerHost) {
      candidates.push(expConstants.expoGoConfig.debuggerHost);
    }
    if (expConstants?.manifest2?.extra?.expoClient?.hostUri) {
      candidates.push(expConstants.manifest2.extra.expoClient.hostUri);
    }
    if (expConstants?.experienceUrl) {
      candidates.push(expConstants.experienceUrl);
    }
    if (expConstants?.linkingUri) {
      candidates.push(expConstants.linkingUri);
    }
  } catch {}

  for (const candidate of candidates) {
    const host = extractHostFromUri(candidate);
    if (host) {
      return host;
    }
  }

  return null;
}

export function resolveDevApiUrl(
  rawUrl: string,
  appEnv: Env['EXPO_PUBLIC_APP_ENV'],
  metroHost: string | null = getRuntimeMetroHost(),
): string {
  if (appEnv !== 'development' || !metroHost) {
    return rawUrl;
  }

  try {
    const parsed = new URL(rawUrl);
    if (isLocalOrPrivateHost(parsed.hostname)) {
      parsed.hostname = metroHost;
      return parsed.toString().replace(/\/$/, '');
    }
  } catch {}

  return rawUrl;
}

export function getDevMailpitUrl(metroHost: string | null = getRuntimeMetroHost()): string {
  return `http://${metroHost || 'localhost'}:8025`;
}

// Expo only inlines EXPO_PUBLIC_* vars written as literal dot-notation member
// reads; passing the env object around as a whole yields `{}` in builds.
export function readProcessEnv(): Record<string, unknown> {
  return {
    EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    EXPO_PUBLIC_REQUEST_TIMEOUT_MS: process.env.EXPO_PUBLIC_REQUEST_TIMEOUT_MS,
  };
}

export function parseEnv(rawEnv?: Record<string, unknown>): Env {
  const result = EnvSchema.safeParse(rawEnv ?? readProcessEnv());
  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${errorDetails}`);
  }
  const resolvedApiUrl =
    rawEnv === undefined
      ? resolveDevApiUrl(result.data.EXPO_PUBLIC_API_URL, result.data.EXPO_PUBLIC_APP_ENV)
      : result.data.EXPO_PUBLIC_API_URL;

  return {
    ...result.data,
    EXPO_PUBLIC_API_URL: resolvedApiUrl,
  };
}

export const env: Env = parseEnv();
