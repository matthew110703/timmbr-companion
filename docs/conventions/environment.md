# Environment Conventions

`timmbr-companion` separates configuration into three profiles: `development`, `preview`, and `production`. Configuration is validated at runtime and build boundaries.

## Target Profiles and Identifiers

Each profile configures unique bundle identifiers so staff and QA can install multiple versions side-by-side on the same device:

| Profile | App Display Name | Android Package | iOS Bundle Identifier |
| --- | --- | --- | --- |
| `development` | Timmbr Companion (Dev) | `com.timmbr.companion.dev` | `com.timmbr.companion.dev` |
| `preview` | Timmbr Companion (Preview) | `com.timmbr.companion.preview` | `com.timmbr.companion.preview` |
| `production` | Timmbr Companion | `com.timmbr.companion` | `com.timmbr.companion` |

## Dynamic Build Resolution (`app.config.ts`)

`app.config.ts` exports a pure helper function `resolveExpoConfig(envName?: string)` alongside the default config function:

```typescript
export function resolveExpoConfig(envName?: string): ExpoConfig {
  const env: AppEnvironment =
    envName === 'production' || envName === 'preview' ? envName : 'development';
  const target = ENV_CONFIGS[env];

  return {
    name: target.name,
    slug: 'timmbr-companion',
    scheme: 'timmbr-companion',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      bundleIdentifier: target.bundleIdentifier,
    },
    android: {
      package: target.packageName,
    },
    experiments: {
      typedRoutes: true,
    },
  };
}
```

EAS Build passes `APP_ENV` through `eas.json` to configure the target bundle.

## Runtime Validation (`src/config/env.ts`)

Client-accessible variables begin with `EXPO_PUBLIC_`. The app validates all variables using Zod at startup:

```typescript
import { z } from 'zod';

export const EnvSchema = z.object({
  EXPO_PUBLIC_APP_ENV: z
    .enum(['development', 'preview', 'production'])
    .default('development'),
  EXPO_PUBLIC_API_URL: z
    .string()
    .url()
    .default('http://localhost:8000/api/v1'),
  EXPO_PUBLIC_REQUEST_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15000),
  CLIENT_PLATFORM: z.literal('staff-companion').default('staff-companion'),
});

export type Env = z.infer<typeof EnvSchema>;

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
  return result.data;
}

export const env: Env = parseEnv();
```

## Access Rules
1. Never read `process.env.EXPO_PUBLIC_*` directly in components or features.
2. Import the typed `env` object from `@/config/env`.
3. If an environment variable fails validation, the app halts during module initialization with a descriptive error.
4. Expo inlines `EXPO_PUBLIC_*` values only where they are written as literal `process.env.EXPO_PUBLIC_NAME` reads. Never pass `process.env` around as an object (`parseEnv(process.env)`, destructuring, `process.env[key]`) — it is empty in built apps. Add new variables to `readProcessEnv()`; a test in `env.test.ts` enforces this.
