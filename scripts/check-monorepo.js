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
