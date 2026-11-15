#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT_DIR = process.cwd();
const isWin = process.platform === 'win32';

const PROFILES = {
  dev: {
    easProfile: 'development',
    gradleTask: 'assembleDebug',
    apkRelativePath: path.join('app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'),
    outputFileName: 'timmbr-companion-dev.apk',
  },
  stage: {
    easProfile: 'preview',
    gradleTask: 'assembleRelease',
    apkRelativePath: path.join('app', 'build', 'outputs', 'apk', 'release', 'app-release.apk'),
    outputFileName: 'timmbr-companion-stage.apk',
  },
};

function stripJsonComments(raw) {
  return raw.replace(/^\s*\/\/.*$/gm, '');
}

function loadEasProfileEnv(easProfile) {
  const easPath = path.join(ROOT_DIR, 'eas.json');
  if (!fs.existsSync(easPath)) return {};
  try {
    const parsed = JSON.parse(stripJsonComments(fs.readFileSync(easPath, 'utf8')));
    return parsed?.build?.[easProfile]?.env ?? {};
  } catch (err) {
    console.warn(`[build-apk] Warning: failed to parse eas.json env: ${err.message}`);
    return {};
  }
}

function resolveAndroidToolingEnv(baseEnv) {
  const env = { ...baseEnv };

  if (isWin) {
    const defaultJavaHome = 'C:\\Program Files\\Android\\Android Studio\\jbr';
    const defaultAndroidHome = path.join(
      env.LOCALAPPDATA || path.join(env.USERPROFILE || '', 'AppData', 'Local'),
      'Android',
      'Sdk',
    );

    if (!env.JAVA_HOME && fs.existsSync(path.join(defaultJavaHome, 'bin', 'java.exe'))) {
      env.JAVA_HOME = defaultJavaHome;
    }
    if (!env.ANDROID_HOME && fs.existsSync(defaultAndroidHome)) {
      env.ANDROID_HOME = defaultAndroidHome;
    }
  }

  const pathParts = (env.PATH || env.Path || '').split(path.delimiter).filter(Boolean);
  const extraPaths = [];
  if (env.JAVA_HOME) extraPaths.push(path.join(env.JAVA_HOME, 'bin'));
  if (env.ANDROID_HOME) {
    extraPaths.push(path.join(env.ANDROID_HOME, 'emulator'));
    extraPaths.push(path.join(env.ANDROID_HOME, 'platform-tools'));
  }

  const mergedPath = [...extraPaths.filter((p) => !pathParts.includes(p)), ...pathParts].join(
    path.delimiter,
  );
  env.PATH = mergedPath;
  if (isWin) env.Path = mergedPath;

  return env;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: isWin,
    ...options,
  });
  if (result.status !== 0) {
    const err = new Error(`Command failed (${result.status ?? 1}): ${command} ${args.join(' ')}`);
    err.exitCode = result.status ?? 1;
    throw err;
  }
}

/**
 * On Windows, CMake/Ninja `.cxx` staging and object directory paths can exceed the
 * 260-char MAX_PATH limit. Keeping `proj.layout.buildDirectory` intact (required by
 * libraries like `react-native-reanimated` that hardcode `${CMAKE_SOURCE_DIR}/build`),
 * we redirect only `.cxx` staging to `~\.tb\<shortHash>` and cap
 * `CMAKE_OBJECT_PATH_MAX=245` so CMake hashes long object paths without falling back
 * to unhashed paths.
 */
function createShortBuildDirInitScript() {
  const shortBuildRoot = path.join(os.homedir(), '.tb').replace(/\\/g, '/');
  const scriptPath = path.join(os.tmpdir(), 'timmbr-short-builddir.init.gradle');
  const content = [
    'allprojects { proj ->',
    '  def shortName = Integer.toUnsignedString(proj.path.hashCode(), 36)',
    '  ["com.android.library", "com.android.application"].each { pluginId ->',
    '    proj.plugins.withId(pluginId) {',
    '      def components = proj.extensions.findByName("androidComponents")',
    '      if (components != null) {',
    '        components.finalizeDsl { dsl ->',
    '          if (dsl.externalNativeBuild?.cmake != null) {',
    `            dsl.externalNativeBuild.cmake.buildStagingDirectory = new File("${shortBuildRoot}/" + shortName)`,
    '          }',
    '          if (proj != proj.rootProject) {',
    '            dsl.defaultConfig?.externalNativeBuild?.cmake?.arguments?.add("-DCMAKE_OBJECT_PATH_MAX=245")',
    '          }',
    '        }',
    '      }',
    '    }',
    '  }',
    '}',
    '',
  ].join('\n');
  fs.writeFileSync(scriptPath, content, 'utf8');
  return scriptPath;
}

function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== '--');
  const target = args.find((arg) => arg === 'dev' || arg === 'stage');
  const useCloud = args.includes('--cloud');
  const allAbis = args.includes('--all-abis');

  if (!target) {
    console.error('Usage: node scripts/build-apk.mjs <dev|stage> [--cloud] [--all-abis]');
    process.exit(1);
  }

  const config = PROFILES[target];

  if (useCloud) {
    console.log(`[build-apk] Starting EAS cloud build (${config.easProfile})...`);
    run('eas', ['build', '-p', 'android', '--profile', config.easProfile], {
      cwd: ROOT_DIR,
    });
    return;
  }

  const profileEnv = loadEasProfileEnv(config.easProfile);
  const buildEnv = resolveAndroidToolingEnv({
    ...process.env,
    ...profileEnv,
  });

  if (!buildEnv.ANDROID_HOME || !fs.existsSync(buildEnv.ANDROID_HOME)) {
    console.error(
      '[build-apk] ANDROID_HOME not found. Install Android Studio / SDK and set ANDROID_HOME.',
    );
    process.exit(1);
  }

  console.log(
    `[build-apk] Running local Android prebuild for "${target}" (${config.easProfile})...`,
  );
  if (profileEnv.EXPO_PUBLIC_API_URL) {
    console.log(`[build-apk] EXPO_PUBLIC_API_URL=${profileEnv.EXPO_PUBLIC_API_URL}`);
  }

  run('pnpm', ['exec', 'expo', 'prebuild', '--platform', 'android', '--clean'], {
    cwd: ROOT_DIR,
    env: buildEnv,
  });

  const androidDir = path.join(ROOT_DIR, 'android');
  // Absolute path: cmd.exe skips the current directory when
  // NoDefaultCurrentDirectoryInExePath is set (some shells and CI agents).
  const gradleCmd = isWin ? `"${path.join(androidDir, 'gradlew.bat')}"` : './gradlew';
  const gradleArgs = [config.gradleTask];
  if (!allAbis) {
    gradleArgs.push('-PreactNativeArchitectures=arm64-v8a');
  }
  if (isWin) {
    const initScriptPath = createShortBuildDirInitScript();
    gradleArgs.push('--init-script', `"${initScriptPath}"`);
  }

  console.log(
    `[build-apk] Running Gradle ${config.gradleTask} (${allAbis ? 'all ABIs' : 'arm64-v8a'})...`,
  );
  run(gradleCmd, gradleArgs, {
    cwd: androidDir,
    env: buildEnv,
  });

  const builtApk = path.join(androidDir, config.apkRelativePath);
  if (!fs.existsSync(builtApk)) {
    console.error(`[build-apk] Expected APK not found at: ${builtApk}`);
    process.exit(1);
  }

  const distDir = path.join(ROOT_DIR, 'dist-apk');
  fs.mkdirSync(distDir, { recursive: true });
  const destApk = path.join(distDir, config.outputFileName);
  fs.copyFileSync(builtApk, destApk);

  console.log(`\n[build-apk] APK ready: ${destApk}`);
}

try {
  main();
} catch (err) {
  console.error(err.message);
  process.exit(err.exitCode ?? 1);
}
