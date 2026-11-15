import type { ExpoConfig, ConfigContext } from 'expo/config';

export type AppEnvironment = 'development' | 'preview' | 'production';

export interface EnvironmentConfig {
  name: string;
  bundleIdentifier: string;
  packageName: string;
}

export const ENV_CONFIGS: Record<AppEnvironment, EnvironmentConfig> = {
  development: {
    name: 'Timmbr Companion (Dev)',
    bundleIdentifier: 'com.timmbr.companion.dev',
    packageName: 'com.timmbr.companion.dev',
  },
  preview: {
    name: 'Timmbr Companion (Preview)',
    bundleIdentifier: 'com.timmbr.companion.preview',
    packageName: 'com.timmbr.companion.preview',
  },
  production: {
    name: 'Timmbr Companion',
    bundleIdentifier: 'com.timmbr.companion',
    packageName: 'com.timmbr.companion',
  },
};

export function resolveExpoConfig(envName?: string): ExpoConfig {
  const env: AppEnvironment =
    envName === 'production' || envName === 'preview' ? envName : 'development';
  const target = ENV_CONFIGS[env];

  return {
    name: target.name,
    slug: 'timmbr-companion',
    owner: 'unknownloop11',
    version: '0.1.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'timmbr-companion',
    userInterfaceStyle: 'automatic',
    ios: {
      supportsTablet: false,
      bundleIdentifier: target.bundleIdentifier,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#0B0B0B',
      },
      package: target.packageName,
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      'expo-font',
      'expo-status-bar',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash.png',
          resizeMode: 'contain',
          backgroundColor: '#0B0B0B',
        },
      ],
      [
        'expo-build-properties',
        {
          android: {
            enableMinifyInReleaseBuilds: true,
            enableShrinkResourcesInReleaseBuilds: true,
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      appEnv: env,
      eas: {
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || '492ad38f-2ff3-4530-8890-5e9159d91359',
      },
    },
  };
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const envName = process.env.APP_ENV || process.env.EXPO_PUBLIC_APP_ENV || 'development';
  const resolved = resolveExpoConfig(envName);
  return {
    ...config,
    ...resolved,
  };
};
