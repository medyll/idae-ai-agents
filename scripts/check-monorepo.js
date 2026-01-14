#!/usr/bin/env node
/**
 * Script to check the integrity of the IDAE monorepo
 * Verifies that each package has the required files (mask)
 * Usage: node scripts/check-monorepo.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKAGES_DIR = path.join(__dirname, '../packages');
const REQUIRED_FILES = ['package.json', 'index.js', 'README.md'];
const DEFAULT_CONTENT = {
  'README.md': (pkg) => `# ${pkg}\n\nThis package is part of the idae-ai-agents monorepo.\n`,
  'index.js': (pkg) => `// Entrypoint for package ${pkg}\n\nexport default {};\n`,
  'package.json': (pkg) => JSON.stringify({
    name: `@idae-ai-agents/${pkg}`,
    version: '1.0.0',
    main: 'index.js',
    type: 'module',
    license: 'ISC',
    description: '',
  }, null, 2) + '\n',
};

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
