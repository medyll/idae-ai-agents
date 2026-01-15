const fs = require('fs');
const path = require('path');

// Fichiers README à mettre à jour
const readmes = [
  path.join(__dirname, '../README.md'),
  path.join(__dirname, '../packages/idae-agent-builder/README.md'),
  path.join(__dirname, '../packages/idae-agent-full/README.md'),
  path.join(__dirname, '../packages/idae-agent-svelte/README.md'),
];

// Récupère la version du package.json principal
const pkg = require(path.join(__dirname, '../package.json'));
const version = pkg.version;

const versionPattern = /Version: ([0-9]+\.[0-9]+\.[0-9]+)/;
const versionLine = `Version: ${version}`;

readmes.forEach((file) => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  if (versionPattern.test(content)) {
    content = content.replace(versionPattern, versionLine);
  } else {
    // Ajoute la version en haut du fichier
    content = `${versionLine}\n${content}`;
  }
  fs.writeFileSync(file, content, 'utf8');
  console.log(`Version mise à jour dans ${file}`);
});
