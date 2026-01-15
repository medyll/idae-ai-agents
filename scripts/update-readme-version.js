import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fichiers README à mettre à jour
const readmes = [
  path.join(__dirname, '../README.md'),
  path.join(__dirname, '../packages/idae-agent-builder/README.md'),
  path.join(__dirname, '../packages/idae-agent-full/README.md'),
  path.join(__dirname, '../packages/idae-agent-svelte/README.md'),
];

// Récupère la version du package.json principal
const pkgRaw = await fs.readFile(path.join(__dirname, '../package.json'), 'utf8');
const pkg = JSON.parse(pkgRaw);
const version = pkg.version;

const versionPattern = /Version: ([0-9]+\.[0-9]+\.[0-9]+)/;
const versionLine = `Version: ${version}`;

for (const file of readmes) {
  try {
    await fs.access(file);
  } catch {
    continue;
  }
  let content = await fs.readFile(file, 'utf8');
  if (versionPattern.test(content)) {
    content = content.replace(versionPattern, versionLine);
  } else {
    // Ajoute la version en haut du fichier
    content = `${versionLine}\n${content}`;
  }
  await fs.writeFile(file, content, 'utf8');
  console.log(`Version mise à jour dans ${file}`);
}
