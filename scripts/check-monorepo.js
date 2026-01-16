#!/usr/bin/env node
/**
 * Script to check the integrity of the IDAE monorepo
 * Verifies that each package has the required files (mask)
 * Usage: node scripts/check-monorepo.js
 */



import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DEFAULT_CONTENT } from './lib/default-content.js';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKAGES_DIR = path.join(__dirname, '../packages');
const REQUIRED_FILES = ['package.json', 'index.js', 'README.md'];
const REQUIRED_FILES_FIELD = [
  'index.js',
  'package.json',
  'README.md'
];

function checkPackageMask(packagePath, packageName, fix = false) {
  let ok = true;
  for (const file of REQUIRED_FILES) {
    const filePath = path.join(packagePath, file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ ${packageName}: missing file: ${file}`);
      ok = false;
      if (fix) {
        fs.writeFileSync(filePath, DEFAULT_CONTENT[file](packageName));
        console.log(`🛠️  ${packageName}: ${file} generated.`);
      }
    }
  }
  // Vérification du champ "files" dans package.json
  const pkgJsonPath = path.join(packagePath, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    let pkgJson;
    try {
      pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    } catch (e) {
      console.error(`❌ ${packageName}: package.json is invalid JSON.`);
      ok = false;
      return ok;
    }
    if (!Array.isArray(pkgJson.files)) {
      console.error(`❌ ${packageName}: missing or invalid 'files' field in package.json.`);
      ok = false;
      if (fix) {
        pkgJson.files = [...REQUIRED_FILES_FIELD];
        fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n');
        console.log(`🛠️  ${packageName}: 'files' field added to package.json.`);
      }
    } else {
      // Vérifie que tous les fichiers requis sont listés
      for (const f of REQUIRED_FILES_FIELD) {
        if (!pkgJson.files.includes(f)) {
          console.error(`❌ ${packageName}: 'files' field missing '${f}' in package.json.`);
          ok = false;
          if (fix) {
            pkgJson.files.push(f);
            fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n');
            console.log(`🛠️  ${packageName}: '${f}' added to 'files' in package.json.`);
          }
        }
      }
    }
  }
  return ok || fix;
}


function getChangelogBlocks() {
  const packages = fs.readdirSync(PACKAGES_DIR).filter((f) => {
    const fullPath = path.join(PACKAGES_DIR, f);
    return fs.statSync(fullPath).isDirectory();
  });
  const blocks = [];
  for (const pkg of packages) {
    const changelogPath = path.join(PACKAGES_DIR, pkg, 'CHANGELOG.md');
    if (fs.existsSync(changelogPath)) {
      blocks.push([
        '@semantic-release/changelog',
        { changelogFile: `packages/${pkg}/CHANGELOG.md` }
      ]);
    }
  }
  return blocks;
}

function updateReleasercChangelogs() {
  const RELEASERC_PATH = path.join(__dirname, '../.releaserc.json');
  const rc = JSON.parse(fs.readFileSync(RELEASERC_PATH, 'utf8'));
  // Remove all existing changelog plugin blocks
  rc.plugins = rc.plugins.filter(
    (p) => !(Array.isArray(p) && p[0] === '@semantic-release/changelog')
  );
  // Insert new changelog blocks just before git/exec plugins
  const changelogBlocks = getChangelogBlocks();
  let insertIdx = rc.plugins.findIndex(
    (p) => Array.isArray(p) && (p[0] === '@semantic-release/git' || p[0] === '@semantic-release/exec')
  );
  if (insertIdx === -1) insertIdx = rc.plugins.length;
  rc.plugins.splice(insertIdx, 0, ...changelogBlocks);
  fs.writeFileSync(RELEASERC_PATH, JSON.stringify(rc, null, 2) + '\n');
  console.log(`✅ .releaserc.json updated with ${changelogBlocks.length} changelog blocks.`);
}

function main() {
  const fix = process.argv.includes('--fix');
  if (!fs.existsSync(PACKAGES_DIR)) {
    console.error('packages/ directory not found.');
    process.exit(1);
  }
  const packages = fs.readdirSync(PACKAGES_DIR).filter((f) => {
    const fullPath = path.join(PACKAGES_DIR, f);
    return fs.statSync(fullPath).isDirectory();
  });
  let allOk = true;
  for (const pkg of packages) {
    const pkgPath = path.join(PACKAGES_DIR, pkg);
    const ok = checkPackageMask(pkgPath, pkg, fix);
    if (!ok) allOk = false;
  }
  // Check and install missing dependencies if needed
  let needInstall = false;
  // List of required packages for monorepo/CI
  const requiredDeps = [
    '@changesets/cli',
    '@semantic-release/commit-analyzer',
    '@semantic-release/git',
    '@semantic-release/github',
    '@semantic-release/npm',
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog',
    'multi-semantic-release',
    'semantic-release',
    'husky',
    'conventional-changelog-conventionalcommits',
    '@semantic-release/exec'
  ];
  const rootPkgJsonPath = path.join(__dirname, '../package.json');
  if (fs.existsSync(rootPkgJsonPath)) {
    const rootPkg = JSON.parse(fs.readFileSync(rootPkgJsonPath, 'utf8'));
    const allDeps = Object.assign({}, rootPkg.dependencies || {}, rootPkg.devDependencies || {});
    for (const dep of requiredDeps) {
      if (!allDeps[dep]) {
        console.warn(`⚠️  Missing dependency: ${dep}`);
        needInstall = true;
      }
    }
    if (needInstall) {
      try {
        console.log('🛠️  Installing missing dependencies with pnpm install ...');
        execSync('pnpm install ', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
        console.log('✅ Dependencies installed.');
        console.log('🛠️  Installing missing dependencies with pnpm install --workspace-root ...');
        execSync('pnpm install --workspace-root', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
        console.log('✅ Dependencies installed.');
      } catch (err) {
        console.error('❌ Error while installing dependencies.');
        process.exit(3);
      }
    }
  }
  if (fix) {
    updateReleasercChangelogs();
  }
  if (allOk) {
    console.log('✅ All packages match the mask.');
    process.exit(0);
  } else if (fix) {
    console.log('🛠️  All packages have been fixed.');
    process.exit(0);
  } else {
    console.error('❌ Some packages do not match the mask. Use --fix to repair.');
    process.exit(2);
  }
}

// ---
// ESM CLI entrypoint detection: always run if called directly (node, pnpm, npm)
// See: https://stackoverflow.com/a/69396336
const isDirectCli = (() => {
  const scriptPath = process.argv[1]?.replace(/\\/g, '/');
  return import.meta.url.endsWith(scriptPath);
})();

if (isDirectCli) {
  main();
}
