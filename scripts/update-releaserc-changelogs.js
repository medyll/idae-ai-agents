#!/usr/bin/env node
/**
 * Script to update .releaserc.json with @semantic-release/changelog blocks for all packages
 * Usage: node scripts/update-releaserc-changelogs.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RELEASERC_PATH = path.join(__dirname, '../.releaserc.json');
const PACKAGES_DIR = path.join(__dirname, '../packages');

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

function updateReleaserc() {
  const rc = JSON.parse(fs.readFileSync(RELEASERC_PATH, 'utf8'));
  // Remove all existing changelog plugin blocks
  rc.plugins = rc.plugins.filter(
    (p) => !(Array.isArray(p) && p[0] === '@semantic-release/changelog')
  );
  // Insert new changelog blocks just before git/exec plugins
  const changelogBlocks = getChangelogBlocks();
  // Find index to insert before git or exec
  let insertIdx = rc.plugins.findIndex(
    (p) => Array.isArray(p) && (p[0] === '@semantic-release/git' || p[0] === '@semantic-release/exec')
  );
  if (insertIdx === -1) insertIdx = rc.plugins.length;
  rc.plugins.splice(insertIdx, 0, ...changelogBlocks);
  fs.writeFileSync(RELEASERC_PATH, JSON.stringify(rc, null, 2) + '\n');
  console.log(`✅ .releaserc.json updated with ${changelogBlocks.length} changelog blocks.`);
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  updateReleaserc();
}
