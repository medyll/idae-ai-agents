#!/usr/bin/env node

/**
 * Script to create a new package in the IDAE monorepo
 * Usage: node scripts/create-package.js <package-name>
 */


import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const PACKAGES_DIR = path.join(__dirname, '../packages');
const REQUIRED_FILES = ['package.json', 'index.js', 'README.md', 'CHANGELOG.md', 'pnpm-lock.yaml'];
const DEFAULT_CONTENT = {
  'README.md': (pkg) => `# ${pkg}\n\nThis package ${pkg} is part of the idae-ai-agents monorepo.\n`,
  'index.js': (pkg) => `// Entrypoint for package ${pkg}\n\nexport default {};\n`,
  'package.json': (pkg) => JSON.stringify({
    name: `@idae-ai-agents/${pkg}`,
    version: '1.0.0',
    main: 'index.js',
    type: 'module',
    license: 'ISC',
    description: '',
  }, null, 2) + '\n',
  'CHANGELOG.md': (pkg) => `# Changelog for ${pkg}\n\n- Initial release\n`,
  'pnpm-lock.yaml': () => '',
};


import { execSync } from 'child_process';

function createPackage(packageName) {
  if (!packageName) {
    console.error('\x1b[31m[ERROR]\x1b[0m No package name provided.\n\nUsage: pnpm create-package <package-name>\nor\nnpm run create-package -- <package-name>');
    process.exit(1);
  }
  const packagePath = path.join(PACKAGES_DIR, packageName);
  if (fs.existsSync(packagePath)) {
    console.error(`Package ${packageName} already exists.`);
    process.exit(2);
  }
  fs.mkdirSync(packagePath);
  fs.mkdirSync(path.join(packagePath, 'src'));
  for (const file of REQUIRED_FILES) {
    const filePath = path.join(packagePath, file);
    fs.writeFileSync(filePath, DEFAULT_CONTENT[file](packageName));
    console.log(`Created: ${filePath}`);
  }

  fs.writeFileSync(path.join(packagePath, 'src', `${packageName}.md`), `# Instructions for ${packageName}\n`);
  console.log(`Package ${packageName} has been created in packages/`);

  // Automatically run pnpm install in the new package directory
  try {
    console.log('Running pnpm install in the new package...');
    execSync('pnpm install', { cwd: packagePath, stdio: 'inherit' });
    console.log('pnpm install completed.');
  } catch (err) {
    console.error('\x1b[31m[ERROR]\x1b[0m pnpm install failed. Please run pnpm install manually in the new package directory.');
  }
}

// ---
// ESM CLI entrypoint detection: always run if called directly (node, pnpm, npm)
// This works reliably for ESM scripts in all major Node.js runners
// See: https://stackoverflow.com/a/69396336
const isDirectCli = (() => {
  // Handles both Windows and POSIX paths
  const scriptPath = process.argv[1]?.replace(/\\/g, '/');
  return import.meta.url.endsWith(scriptPath);
})();

if (isDirectCli) {
  const packageName = process.argv[2];
  createPackage(packageName);
}
