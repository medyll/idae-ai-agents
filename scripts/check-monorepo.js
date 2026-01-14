#!/usr/bin/env node
/**
 * Script de vérification de la solidité du monorepo IDAE
 * Vérifie que chaque package possède les fichiers obligatoires (mask)
 * Usage: node scripts/check-monorepo.js
 */

const fs = require('fs');
const path = require('path');

const PACKAGES_DIR = path.join(__dirname, '../packages');
const REQUIRED_FILES = ['package.json', 'index.js', 'README.md'];
const DEFAULT_CONTENT = {
  'README.md': (pkg) => `# ${pkg}\n\nCe package fait partie du monorepo idae-ai-agents.\n`,
  'index.js': (pkg) => `// Entrypoint du package ${pkg}\n\nmodule.exports = {};\n`,
  'package.json': (pkg) => JSON.stringify({
    name: `@idae-ai-agents/${pkg}`,
    version: '1.0.0',
    main: 'index.js',
    license: 'ISC',
    description: '',
  }, null, 2) + '\n',
};


function checkPackageMask(packagePath, packageName, fix = false) {
  let ok = true;
  for (const file of REQUIRED_FILES) {
    const filePath = path.join(packagePath, file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ ${packageName} : fichier manquant : ${file}`);
      ok = false;
      if (fix) {
        fs.writeFileSync(filePath, DEFAULT_CONTENT[file](packageName));
        console.log(`🛠️  ${packageName} : ${file} généré.`);
      }
    }
  }
  return ok || fix;
}


function main() {
  const fix = process.argv.includes('--fix');
  if (!fs.existsSync(PACKAGES_DIR)) {
    console.error('Dossier packages/ introuvable.');
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
    console.log('✅ Tous les packages respectent le mask.');
    process.exit(0);
  } else if (fix) {
    console.log('🛠️  Tous les packages ont été réparés.');
    process.exit(0);
  } else {
    console.error('❌ Certains packages ne respectent pas le mask. Utilise --fix pour corriger.');
    process.exit(2);
  }
}

if (require.main === module) {
  main();
}
