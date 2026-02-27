import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { FOLDER_TYPE_MAP, ENTRY_FILENAME } from '../parser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const REGISTRY_DIR      = join(__dirname, '../../src');
export const REGISTRY_REPO_URL = 'https://github.com/medyll/ia-agents';

/**
 * Destination directories in the consumer project (relative to cwd).
 */
export const DEST_DIRS = {
  skill:       '.github/skills',
  instruction: '.github/instructions',
  agent:       '.github/agents',
  mcp:         '.vscode/mcp-configs',
  hook:        '.github/hooks',
};

/**
 * Inverse map: type → src type-folder name
 * e.g. 'skill' → 'skills'
 */
export const TYPE_FOLDER_MAP = Object.fromEntries(
  Object.entries(FOLDER_TYPE_MAP).map(([folder, type]) => [type, folder])
);

// ─── Registry scanning ───────────────────────────────────────────────────────

/**
 * Scan src/ and return all valid entries as { id, type, path }.
 *
 * id format: "<type-folder>/<entry-name>"
 * e.g. "skills/react-expert" | "agents/fullstack-dev"
 */
export function getRegistryEntries() {
  if (!existsSync(REGISTRY_DIR)) return [];

  const entries = [];

  // Each direct child of src/ is a type-folder (skills, agents, …)
  const typeFolders = readdirSync(REGISTRY_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && FOLDER_TYPE_MAP[d.name]);

  for (const typeDir of typeFolders) {
    const type       = FOLDER_TYPE_MAP[typeDir.name];
    const typePath   = join(REGISTRY_DIR, typeDir.name);

    const entryDirs = readdirSync(typePath, { withFileTypes: true })
      .filter((d) => d.isDirectory());

    for (const entryDir of entryDirs) {
      const skillFile = join(typePath, entryDir.name, ENTRY_FILENAME);
      if (existsSync(skillFile)) {
        entries.push({
          id:   `${typeDir.name}/${entryDir.name}`,
          type,
          path: skillFile,
        });
      }
    }
  }

  return entries;
}

export function getRegistrySkillIds() {
  return getRegistryEntries().filter((e) => e.type === 'skill').map((e) => e.id);
}

// ─── Registry read/write ─────────────────────────────────────────────────────

/**
 * Read a registry entry by id ("skills/react-expert" or bare "react-expert").
 * Bare ids are resolved by searching all type-folders.
 */
export function readRegistryEntry(id) {
  // Fully qualified id: "skills/react-expert"
  if (id.includes('/')) {
    const entryPath = join(REGISTRY_DIR, id, ENTRY_FILENAME);
    if (!existsSync(entryPath)) {
      throw new Error(`Entry "${id}" not found in registry (expected: ${entryPath})`);
    }
    return { content: readFileSync(entryPath, 'utf-8'), path: entryPath };
  }

  // Bare name: search across all type-folders
  for (const typeFolder of Object.keys(FOLDER_TYPE_MAP)) {
    const entryPath = join(REGISTRY_DIR, typeFolder, id, ENTRY_FILENAME);
    if (existsSync(entryPath)) {
      return { content: readFileSync(entryPath, 'utf-8'), path: entryPath };
    }
  }

  throw new Error(
    `Entry "${id}" not found in registry.\n` +
    `Searched: ${Object.keys(FOLDER_TYPE_MAP).map((f) => `src/${f}/${id}/skill.md`).join(', ')}`
  );
}

export const readRegistrySkill = readRegistryEntry;

/**
 * Write a registry entry (used by bump).
 * Accepts qualified id ("skills/react-expert") or bare name.
 */
export function writeRegistryEntry(id, content) {
  let entryPath;

  if (id.includes('/')) {
    entryPath = join(REGISTRY_DIR, id, ENTRY_FILENAME);
  } else {
    // Find existing entry
    for (const typeFolder of Object.keys(FOLDER_TYPE_MAP)) {
      const candidate = join(REGISTRY_DIR, typeFolder, id, ENTRY_FILENAME);
      if (existsSync(candidate)) { entryPath = candidate; break; }
    }
  }

  if (!entryPath) throw new Error(`Cannot find registry path for "${id}" to write`);
  writeFileSync(entryPath, content, 'utf-8');
  return entryPath;
}

export const writeRegistrySkill = writeRegistryEntry;

// ─── Destination read/write ──────────────────────────────────────────────────

export function resolveDestDir(type, override) {
  if (override) return override;
  return DEST_DIRS[type] ?? DEST_DIRS.skill;
}

/**
 * Short name = last segment of id, e.g. "skills/react-expert" → "react-expert"
 */
function shortName(id) {
  return id.split('/').pop();
}

export function writeDestEntry(id, content, destDir) {
  const absDir  = join(process.cwd(), destDir);
  if (!existsSync(absDir)) mkdirSync(absDir, { recursive: true });
  const destPath = join(absDir, `${shortName(id)}.md`);
  writeFileSync(destPath, content, 'utf-8');
  return destPath;
}

export const writeDestSkill = writeDestEntry;

export function readDestEntry(id, destDir) {
  const destPath = join(process.cwd(), destDir, `${shortName(id)}.md`);
  if (!existsSync(destPath)) return null;
  return { content: readFileSync(destPath, 'utf-8'), path: destPath };
}

export const readDestSkill = readDestEntry;

export function removeDestEntry(id, destDir) {
  const destPath = join(process.cwd(), destDir, `${shortName(id)}.md`);
  if (!existsSync(destPath)) return false;
  unlinkSync(destPath);
  return true;
}

export const removeDestSkill = removeDestEntry;

export function getInstalledEntries(destDir) {
  const absDir = join(process.cwd(), destDir);
  if (!existsSync(absDir)) return [];
  return readdirSync(absDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));
}

export const getInstalledSkillIds = (dest) => getInstalledEntries(dest);
