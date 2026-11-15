#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT_DIR = process.cwd();
const DEFAULT_DS_PATH = path.resolve(ROOT_DIR, '../timmbr-ds');
const DS_PATH = process.env.TIMMBR_DS_PATH
  ? path.resolve(ROOT_DIR, process.env.TIMMBR_DS_PATH)
  : DEFAULT_DS_PATH;

const localYalcCmd = path.resolve(
  ROOT_DIR,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'yalc.cmd' : 'yalc',
);
const YALC_EXEC = fs.existsSync(localYalcCmd) ? `"${localYalcCmd}"` : 'pnpm exec yalc';

const CANONICAL_VERSIONS = {
  '@timmbr/native-ui': '1.0.0',
  '@timmbr/theme': '1.3.0',
  '@timmbr/icons': '1.7.0',
  '@timmbr/utils': '1.6.0',
};

function getCanonicalVersion(dep) {
  const rootPkgPath = path.resolve(ROOT_DIR, 'package.json');
  if (fs.existsSync(rootPkgPath)) {
    try {
      const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
      const allRootDeps = {
        ...rootPkg.dependencies,
        ...rootPkg.devDependencies,
      };
      if (allRootDeps[dep] && !allRootDeps[dep].startsWith('file:')) {
        return allRootDeps[dep];
      }
    } catch {}
  }
  return CANONICAL_VERSIONS[dep] || 'latest';
}

function findDSPackages() {
  const packagesDir = path.resolve(DS_PATH, 'packages');
  if (!fs.existsSync(packagesDir)) {
    console.error(`\x1b[31m[ERROR] Design system repository not found at:\x1b[0m ${DS_PATH}`);
    console.error(
      `Please ensure the 'timmbr-ds' repository is cloned in the parent directory (../timmbr-ds) or set TIMMBR_DS_PATH.`,
    );
    process.exit(1);
  }

  const entries = fs.readdirSync(packagesDir, { withFileTypes: true });
  const dsPackages = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const pkgJsonPath = path.resolve(packagesDir, entry.name, 'package.json');
      if (fs.existsSync(pkgJsonPath)) {
        try {
          const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
          if (pkgJson.name && pkgJson.name.startsWith('@timmbr/')) {
            dsPackages.push({
              name: pkgJson.name,
              shortName: entry.name,
              dir: path.resolve(packagesDir, entry.name),
              version: pkgJson.version,
            });
          }
        } catch {}
      }
    }
  }

  return dsPackages;
}

function getCompanionTimmbrDeps() {
  const pkgJsonPath = path.resolve(ROOT_DIR, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) return [];
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  const allDeps = {
    ...pkgJson.dependencies,
    ...pkgJson.devDependencies,
  };
  return Object.keys(allDeps).filter((dep) => dep.startsWith('@timmbr/'));
}

function getPackageStatus(pkgName) {
  const pkgJsonPath = path.resolve(ROOT_DIR, 'package.json');
  let declaredVersion = '';
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      declaredVersion = pkgJson.dependencies?.[pkgName] || pkgJson.devDependencies?.[pkgName] || '';
    } catch {}
  }

  const yalcPkgPath = path.resolve(ROOT_DIR, '.yalc', ...pkgName.split('/'));
  if (declaredVersion.startsWith('file:.yalc')) {
    if (fs.existsSync(yalcPkgPath)) {
      return { status: 'yalc', details: 'Yalc Local Link (.yalc/)' };
    }
    return {
      status: 'stale',
      details: 'Stale link (package.json has file:.yalc but .yalc/ dir missing)',
    };
  }

  if (fs.existsSync(yalcPkgPath)) {
    return { status: 'yalc', details: 'Yalc Local Link (.yalc/)' };
  }

  const nodeModulesPath = path.resolve(ROOT_DIR, 'node_modules', ...pkgName.split('/'));
  if (!fs.existsSync(nodeModulesPath)) {
    return { status: 'not-installed', details: 'Not installed' };
  }

  try {
    const realPath = fs.realpathSync(nodeModulesPath);
    if (realPath.includes('timmbr-ds')) {
      return { status: 'symlink', details: `Symlink (${realPath})` };
    }
    const innerPkgJsonPath = path.resolve(nodeModulesPath, 'package.json');
    let version = '';
    if (fs.existsSync(innerPkgJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(innerPkgJsonPath, 'utf8'));
      version = pkg.version ? `v${pkg.version}` : '';
    }
    return { status: 'registry', details: `Registry (${version || 'npm'})` };
  } catch (err) {
    return { status: 'unknown', details: err.message };
  }
}

function handleStatus() {
  console.log('\n=============================================================');
  console.log('            TIMMBR COMPANION DESIGN SYSTEM LINK STATUS (YALC)');
  console.log('=============================================================');
  console.log(`Design System Source: \x1b[36m${DS_PATH}\x1b[0m\n`);

  const timmbrDeps = getCompanionTimmbrDeps();
  console.log(`\x1b[1mApplication: timmbr-companion\x1b[0m`);

  for (const dep of timmbrDeps) {
    const info = getPackageStatus(dep);
    if (info.status === 'yalc') {
      console.log(`  \x1b[32m✔ ${dep.padEnd(24)}\x1b[0m -> \x1b[32m${info.details}\x1b[0m`);
    } else if (info.status === 'registry') {
      console.log(`  \x1b[34m📦 ${dep.padEnd(24)}\x1b[0m -> \x1b[34m${info.details}\x1b[0m`);
    } else if (info.status === 'symlink') {
      console.log(`  \x1b[33m🔗 ${dep.padEnd(24)}\x1b[0m -> ${info.details}`);
    } else if (info.status === 'stale') {
      console.log(`  \x1b[31m⚠️  ${dep.padEnd(24)}\x1b[0m -> \x1b[31m${info.details}\x1b[0m`);
    } else {
      console.log(`  \x1b[31m⚠️  ${dep.padEnd(24)}\x1b[0m -> ${info.details}`);
    }
  }
  console.log('=============================================================\n');
}

function normalizePackageName(name) {
  const clean = name.trim().toLowerCase();
  return clean.startsWith('@timmbr/') ? clean : `@timmbr/${clean}`;
}

function matchesTarget(pkgName, shortName, targets) {
  if (!targets || targets.length === 0) return true;
  const lowerPkg = pkgName.toLowerCase();
  const lowerShort = (shortName || lowerPkg.replace('@timmbr/', '')).toLowerCase();
  return targets.some((target) => {
    const raw = target.trim().toLowerCase();
    const norm = normalizePackageName(raw);
    const short = norm.replace('@timmbr/', '');
    return lowerPkg === norm || lowerPkg === raw || lowerShort === short || lowerShort === raw;
  });
}

function handleLink(dsPackages, specifiedTargets = []) {
  const hasFilter = specifiedTargets.length > 0;

  const packagesToPublish = hasFilter
    ? dsPackages.filter((pkg) => matchesTarget(pkg.name, pkg.shortName, specifiedTargets))
    : dsPackages;

  if (hasFilter && packagesToPublish.length === 0) {
    console.error(
      `\x1b[31m[ERROR] No matching design system packages found for: ${specifiedTargets.join(', ')}\x1b[0m`,
    );
    console.log(`Available in ${DS_PATH}: ${dsPackages.map((p) => p.name).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n\x1b[36m[Yalc] Publishing packages from: ${DS_PATH}...\x1b[0m\n`);

  for (const pkg of packagesToPublish) {
    try {
      execSync(`${YALC_EXEC} publish --push`, {
        cwd: pkg.dir,
        stdio: 'pipe',
      });
      console.log(`  ✔ Published ${pkg.name} to yalc store (with --push)`);
    } catch (err) {
      console.warn(`  ⚠️ Could not publish ${pkg.name}: ${err.message}`);
    }
  }

  const companionDeps = getCompanionTimmbrDeps();
  const packagesToLink = hasFilter
    ? companionDeps.filter((dep) => matchesTarget(dep, null, specifiedTargets))
    : companionDeps;

  if (packagesToLink.length === 0) {
    console.warn(
      `\x1b[33m[WARN] None of the specified targets (${specifiedTargets.join(', ')}) are dependencies in timmbr-companion.\x1b[0m`,
    );
    handleStatus();
    return;
  }

  console.log(
    `\n\x1b[36m[Yalc] Linking packages into timmbr-companion: ${packagesToLink.join(', ')}...\x1b[0m\n`,
  );
  try {
    execSync(`${YALC_EXEC} add ${packagesToLink.join(' ')}`, {
      cwd: ROOT_DIR,
      stdio: 'inherit',
    });
    console.log(`\n\x1b[36m[Yalc] Running pnpm install to apply links...\x1b[0m`);
    execSync(`pnpm install`, {
      cwd: ROOT_DIR,
      stdio: 'inherit',
    });
    console.log(`\x1b[32m✔ Successfully linked ${packagesToLink.join(', ')} via yalc!\x1b[0m\n`);
  } catch (err) {
    console.error(`\x1b[31m✖ Failed adding yalc packages: ${err.message}\x1b[0m\n`);
  }

  handleStatus();
}

function handleUnlink(specifiedTargets = []) {
  const hasFilter = specifiedTargets.length > 0;
  const companionDeps = getCompanionTimmbrDeps();

  if (hasFilter) {
    const packagesToUnlink = companionDeps.filter((dep) =>
      matchesTarget(dep, null, specifiedTargets),
    );

    if (packagesToUnlink.length === 0) {
      console.warn(
        `\x1b[33m[WARN] None of the specified targets (${specifiedTargets.join(', ')}) are dependencies in timmbr-companion.\x1b[0m`,
      );
      handleStatus();
      return;
    }

    console.log(
      `\n\x1b[36m[Yalc] Unlinking specified packages: ${packagesToUnlink.join(', ')}...\x1b[0m\n`,
    );
    try {
      execSync(`${YALC_EXEC} remove ${packagesToUnlink.join(' ')}`, {
        cwd: ROOT_DIR,
        stdio: 'inherit',
      });
    } catch {}

    for (const dep of packagesToUnlink) {
      const depYalcDir = path.resolve(ROOT_DIR, '.yalc', ...dep.split('/'));
      if (fs.existsSync(depYalcDir)) {
        fs.rmSync(depYalcDir, { recursive: true, force: true });
      }
    }

    const pkgJsonPath = path.resolve(ROOT_DIR, 'package.json');
    if (fs.existsSync(pkgJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      let modified = false;
      for (const dep of packagesToUnlink) {
        if (pkg.dependencies?.[dep] && pkg.dependencies[dep].startsWith('file:.yalc')) {
          pkg.dependencies[dep] = getCanonicalVersion(dep);
          modified = true;
        }
        if (pkg.devDependencies?.[dep] && pkg.devDependencies[dep].startsWith('file:.yalc')) {
          pkg.devDependencies[dep] = getCanonicalVersion(dep);
          modified = true;
        }
      }
      if (modified) {
        fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
      }
    }

    const remainingYalc = getCompanionTimmbrDeps().some(
      (dep) => getPackageStatus(dep).status === 'yalc',
    );
    if (!remainingYalc) {
      const yalcDir = path.resolve(ROOT_DIR, '.yalc');
      if (fs.existsSync(yalcDir)) {
        fs.rmSync(yalcDir, { recursive: true, force: true });
      }
      const yalcLock = path.resolve(ROOT_DIR, 'yalc.lock');
      if (fs.existsSync(yalcLock)) {
        fs.rmSync(yalcLock, { force: true });
      }
    }

    console.log('\n\x1b[36mRestoring registry packages via pnpm install...\x1b[0m');
    execSync('pnpm install', { cwd: ROOT_DIR, stdio: 'inherit' });

    console.log(
      `\x1b[32m✔ Successfully restored registry packages for ${packagesToUnlink.join(', ')}!\x1b[0m\n`,
    );
  } else {
    console.log(`\n\x1b[36m[Yalc] Unlinking all @timmbr packages...\x1b[0m\n`);

    try {
      execSync(`${YALC_EXEC} remove --all`, {
        cwd: ROOT_DIR,
        stdio: 'inherit',
      });
    } catch {}

    const pkgJsonPath = path.resolve(ROOT_DIR, 'package.json');
    if (fs.existsSync(pkgJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      let modified = false;
      for (const dep of companionDeps) {
        if (pkg.dependencies?.[dep] && pkg.dependencies[dep].startsWith('file:.yalc')) {
          pkg.dependencies[dep] = getCanonicalVersion(dep);
          modified = true;
        }
        if (pkg.devDependencies?.[dep] && pkg.devDependencies[dep].startsWith('file:.yalc')) {
          pkg.devDependencies[dep] = getCanonicalVersion(dep);
          modified = true;
        }
      }
      if (modified) {
        fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
      }
    }

    const yalcDir = path.resolve(ROOT_DIR, '.yalc');
    if (fs.existsSync(yalcDir)) {
      fs.rmSync(yalcDir, { recursive: true, force: true });
    }
    const yalcLock = path.resolve(ROOT_DIR, 'yalc.lock');
    if (fs.existsSync(yalcLock)) {
      fs.rmSync(yalcLock, { force: true });
    }

    console.log('\n\x1b[36mRestoring registry packages via pnpm install...\x1b[0m');
    execSync('pnpm install', { cwd: ROOT_DIR, stdio: 'inherit' });

    console.log(`\x1b[32m✔ Successfully restored registry packages!\x1b[0m\n`);
  }

  handleStatus();
}

function handleCheck() {
  const timmbrDeps = getCompanionTimmbrDeps();
  const linkedItems = [];

  for (const dep of timmbrDeps) {
    const info = getPackageStatus(dep);
    if (info.status === 'yalc' || info.status === 'symlink' || info.status === 'stale') {
      linkedItems.push({
        pkg: dep,
        details: info.details,
      });
    }
  }

  const yalcDir = path.resolve(ROOT_DIR, '.yalc');
  const yalcLock = path.resolve(ROOT_DIR, 'yalc.lock');
  if (fs.existsSync(yalcDir) || fs.existsSync(yalcLock)) {
    if (linkedItems.length === 0) {
      linkedItems.push({
        pkg: 'local .yalc artifacts',
        details: 'found .yalc or yalc.lock',
      });
    }
  }

  const pkgJsonPath = path.resolve(ROOT_DIR, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      const allDeps = {
        ...pkgJson.dependencies,
        ...pkgJson.devDependencies,
      };
      for (const [dep, val] of Object.entries(allDeps)) {
        if (dep.startsWith('@timmbr/') && typeof val === 'string' && val.startsWith('file:.yalc')) {
          const already = linkedItems.some((i) => i.pkg === dep);
          if (!already) {
            linkedItems.push({
              pkg: dep,
              details: val,
            });
          }
        }
      }
    } catch {}
  }

  if (linkedItems.length > 0) {
    console.error('\n\x1b[31m=============================================================');
    console.error('  ✖ [PRE-COMMIT BLOCKED] LOCAL YALC DESIGN SYSTEM LINKS FOUND');
    console.error('=============================================================\x1b[0m');
    console.error(
      'Your timmbr-companion repo currently has local development links to timmbr-ds.\n',
    );
    for (const item of linkedItems) {
      console.error(`  - \x1b[33m${item.pkg}\x1b[0m: ${item.details}`);
    }
    console.error(
      '\n\x1b[31mCommit blocked to prevent pushing local file:.yalc references to remote.\x1b[0m',
    );
    console.error(
      '\x1b[36mTo unlink before committing, run:\x1b[0m  \x1b[1mpnpm ds:unlink\x1b[0m\n',
    );
    process.exit(1);
  } else {
    console.log(
      '\x1b[32m✔ [ds:check] No local yalc design system links detected. Safe to commit.\x1b[0m',
    );
    process.exit(0);
  }
}

const args = process.argv.slice(2);
const command = args[0] || 'status';
const targetArgs = args.slice(1);

switch (command) {
  case 'status':
    handleStatus();
    break;
  case 'check':
    handleCheck();
    break;
  case 'link': {
    const dsPackages = findDSPackages();
    handleLink(dsPackages, targetArgs);
    break;
  }
  case 'unlink':
    handleUnlink(targetArgs);
    break;
  default:
    console.error(`Unknown command: ${command}`);
    console.log('Usage: node scripts/ds-link.mjs [status|link|unlink|check]');
    process.exit(1);
}
