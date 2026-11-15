#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const ROOT_DIR = process.cwd();
const isWin = process.platform === 'win32';
const EMULATOR_READY_TIMEOUT_MS = 180_000;
const POLL_INTERVAL_MS = 1_500;
const SHORT_CMAKE_MARKER = '// [timmbr-short-cmake-staging-v2]';
const LEGACY_SHORT_CMAKE_PATTERN = /\r?\n*\/\/ \[timmbr-short-cmake-staging\](?=\r?\n)[\s\S]*$/;
const REVERSE_PORTS = [8000, 8025];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    if (!env.ANDROID_HOME && env.ANDROID_SDK_ROOT && fs.existsSync(env.ANDROID_SDK_ROOT)) {
      env.ANDROID_HOME = env.ANDROID_SDK_ROOT;
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

function resolveToolBinary(env, subDir, binName) {
  if (env.ANDROID_HOME) {
    const candidate = path.join(env.ANDROID_HOME, subDir, isWin ? `${binName}.exe` : binName);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return binName;
}

function parseAdbDevices(output) {
  const devices = [];
  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('List of devices') || line.startsWith('*')) {
      continue;
    }
    const parts = line.split(/\s+/);
    if (parts.length >= 2) {
      devices.push({ serial: parts[0], state: parts[1] });
    }
  }
  return devices;
}

function getAdbDevices(adbBin, env) {
  const result = spawnSync(adbBin, ['devices'], {
    env,
    encoding: 'utf8',
  });
  if (result.error) {
    throw result.error;
  }
  return parseAdbDevices(result.stdout || '');
}

function isBootCompleted(adbBin, serial, env) {
  const result = spawnSync(adbBin, ['-s', serial, 'shell', 'getprop', 'sys.boot_completed'], {
    env,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    return false;
  }
  return (result.stdout || '').trim() === '1';
}

function listAvds(emulatorBin, env) {
  const result = spawnSync(emulatorBin, ['-list-avds'], {
    env,
    encoding: 'utf8',
  });
  if (result.error || result.status !== 0) {
    return [];
  }
  return (result.stdout || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Cold-booting an Android emulator briefly puts adbd in an `unauthorized` or
 * `offline` state before the ADB host key finishes loading; `expo run:android`
 * aborts if it hits that window, so wait until `device` + `sys.boot_completed=1`.
 */
async function ensureAndroidDeviceReady(env) {
  const adbBin = resolveToolBinary(env, 'platform-tools', 'adb');
  const emulatorBin = resolveToolBinary(env, 'emulator', 'emulator');

  spawnSync(adbBin, ['start-server'], { env, stdio: 'inherit' });

  let devices = getAdbDevices(adbBin, env);
  if (devices.length === 0) {
    const avds = listAvds(emulatorBin, env);
    if (avds.length === 0) {
      throw new Error(
        '[run-android] No connected Android device and no AVDs found. Connect a device or create an emulator in Android Studio.',
      );
    }
    const avdName = avds[0];
    console.log(`[run-android] Launching emulator "${avdName}"...`);
    const child = spawn(emulatorBin, ['-avd', avdName], {
      env,
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
  }

  const deadline = Date.now() + EMULATOR_READY_TIMEOUT_MS;
  let lastStatus = '';

  while (Date.now() < deadline) {
    devices = getAdbDevices(adbBin, env);
    const readyDevices = devices.filter((d) => d.state === 'device');

    for (const { serial } of readyDevices) {
      if (isBootCompleted(adbBin, serial, env)) {
        console.log(`[run-android] Device ${serial} is authorized and booted.`);
        return serial;
      }
    }

    let statusMsg;
    if (readyDevices.length > 0) {
      statusMsg = `[run-android] Waiting for ${readyDevices[0].serial} to finish Android boot...`;
    } else if (devices.some((d) => d.state === 'unauthorized')) {
      const target = devices.find((d) => d.state === 'unauthorized');
      statusMsg = `[run-android] Waiting for ${target.serial} ADB authorization (cold boot handshake or USB debugging prompt)...`;
    } else if (devices.some((d) => d.state === 'offline')) {
      const target = devices.find((d) => d.state === 'offline');
      statusMsg = `[run-android] Waiting for ${target.serial} to come online...`;
    } else {
      statusMsg = '[run-android] Waiting for emulator to register with ADB...';
    }

    if (statusMsg !== lastStatus) {
      console.log(statusMsg);
      lastStatus = statusMsg;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(
    `[run-android] Timed out after ${EMULATOR_READY_TIMEOUT_MS / 1000}s waiting for Android device authorization and boot completion.`,
  );
}

function setupAdbReversePorts(serial, env) {
  const adbBin = resolveToolBinary(env, 'platform-tools', 'adb');
  const forwarded = [];

  for (const port of REVERSE_PORTS) {
    const result = spawnSync(adbBin, ['-s', serial, 'reverse', `tcp:${port}`, `tcp:${port}`], {
      env,
      encoding: 'utf8',
    });
    if (result.status === 0) {
      forwarded.push(`tcp:${port}`);
    } else {
      const reason = (result.stderr || result.stdout || '').trim() || `exit ${result.status}`;
      console.warn(`[run-android] Warning: adb reverse tcp:${port} skipped (${reason}).`);
    }
  }

  if (forwarded.length > 0) {
    console.log(
      `[run-android] Forwarded emulator/device ports via adb reverse (${forwarded.join(', ')}).`,
    );
  }
}

/**
 * Mirrors scripts/build-apk.mjs's Windows MAX_PATH workaround inside
 * android/build.gradle before `apply plugin: "com.facebook.react.rootproject"`
 * triggers evaluation of `:app`, using AGP's `components.finalizeDsl` lifecycle.
 */
function ensureWindowsShortCmakeStaging(env) {
  if (!isWin) return;

  const androidBuildGradle = path.join(ROOT_DIR, 'android', 'build.gradle');
  if (!fs.existsSync(androidBuildGradle)) {
    console.log('[run-android] Generating native android/ directory via expo prebuild...');
    const prebuild = spawnSync('pnpm', ['exec', 'expo', 'prebuild', '--platform', 'android'], {
      cwd: ROOT_DIR,
      env,
      stdio: 'inherit',
      shell: isWin,
    });
    if (prebuild.status !== 0) {
      throw new Error(`[run-android] expo prebuild failed with exit code ${prebuild.status ?? 1}`);
    }
  }

  if (!fs.existsSync(androidBuildGradle)) {
    throw new Error(`[run-android] Expected Gradle file not found at ${androidBuildGradle}`);
  }

  const current = fs.readFileSync(androidBuildGradle, 'utf8');
  const cleaned = current.replace(LEGACY_SHORT_CMAKE_PATTERN, '\n');
  if (cleaned.includes(SHORT_CMAKE_MARKER)) {
    if (cleaned !== current) {
      fs.writeFileSync(androidBuildGradle, cleaned, 'utf8');
    }
    return;
  }

  const snippet = [
    SHORT_CMAKE_MARKER,
    'allprojects { proj ->',
    '  def shortName = Integer.toUnsignedString(proj.path.hashCode(), 36)',
    '  def shortBuildRoot = new File(System.getProperty("user.home"), ".tb")',
    '  ["com.android.library", "com.android.application"].each { pluginId ->',
    '    proj.plugins.withId(pluginId) {',
    '      def components = proj.extensions.findByName("androidComponents")',
    '      if (components != null) {',
    '        components.finalizeDsl { dsl ->',
    '          if (dsl.externalNativeBuild?.cmake != null) {',
    '            dsl.externalNativeBuild.cmake.buildStagingDirectory = new File(shortBuildRoot, shortName)',
    '          }',
    '          if (proj != proj.rootProject) {',
    '            dsl.defaultConfig?.externalNativeBuild?.cmake?.arguments?.add("-DCMAKE_OBJECT_PATH_MAX=245")',
    '          }',
    '        }',
    '      }',
    '    }',
    '  }',
    '}',
  ].join('\n');

  const applyExpoRootPattern = /^([ \t]*apply plugin:\s*["']expo-root-project["'])/m;
  const updated = applyExpoRootPattern.test(cleaned)
    ? cleaned.replace(applyExpoRootPattern, `${snippet}\n\n$1`)
    : `${cleaned.replace(/\s*$/, '\n')}\n${snippet}\n`;

  fs.writeFileSync(androidBuildGradle, updated, 'utf8');
  console.log('[run-android] Applied Windows short CMake staging patch to android/build.gradle.');
}

async function main() {
  const rawArgs = process.argv.slice(2).filter((arg) => arg !== '--');
  const checkOnly = rawArgs.includes('--check-only');
  const forwardedArgs = rawArgs.filter((arg) => arg !== '--check-only');

  const runEnv = resolveAndroidToolingEnv(process.env);
  if (!runEnv.ANDROID_HOME || !fs.existsSync(runEnv.ANDROID_HOME)) {
    throw new Error(
      '[run-android] ANDROID_HOME not found. Install Android Studio / SDK and set ANDROID_HOME.',
    );
  }

  const serial = await ensureAndroidDeviceReady(runEnv);
  setupAdbReversePorts(serial, runEnv);
  ensureWindowsShortCmakeStaging(runEnv);

  if (checkOnly) {
    console.log('[run-android] Pre-flight check complete (--check-only).');
    return;
  }

  const result = spawnSync('pnpm', ['exec', 'expo', 'run:android', ...forwardedArgs], {
    cwd: ROOT_DIR,
    env: runEnv,
    stdio: 'inherit',
    shell: isWin,
  });
  process.exit(result.status ?? 1);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
