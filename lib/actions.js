/**
 * @file actions.js
 * Generic actions (ls, add, rm, update, bump) — type-agnostic.
 * Type-specific extras live in lib/actions/<type>.actions.js
 */
export * from './actions/skill.actions.js';
export * from './actions/instruction.actions.js';
export * from './actions/agent.actions.js';
export * from './actions/mcp.actions.js';
export * from './actions/hook.actions.js';

import semver from 'semver';
import chalk from 'chalk';
import matter from 'gray-matter';
import { parseEntry, buildOutput } from './parser.js';
import {
  getRegistryEntries,
  readRegistryEntry,
  writeDestEntry,
  readDestEntry,
  removeDestEntry,
  writeRegistryEntry,
  resolveDestDir,
  REGISTRY_REPO_URL,
  DEST_DIRS,
} from './utils/fs.js';

const TYPE_ICONS = { skill:'🧠', instruction:'📋', agent:'🤖', mcp:'🔌', hook:'🪝' };
const TYPE_COLORS = { skill: chalk.cyan, instruction: chalk.blue, agent: chalk.magenta, mcp: chalk.yellow, hook: chalk.red };

// ─── ls (all types) ──────────────────────────────────────────────────────────

export async function listEntries({ json = false, type: filterType } = {}) {
  const all = getRegistryEntries();
  const entries = all
    .filter((e) => !filterType || e.type === filterType)
    .map((e) => {
      const { content } = readRegistryEntry(e.id);
      const { data } = parseEntry(content);
      return { id: e.id, shortName: e.id.split('/').pop(), type: data.type ?? 'skill', name: data.name, version: data.version, description: data.description, tags: data.metadata?.tags ?? [] };
    });

  if (json) return void console.log(JSON.stringify(entries, null, 2));
  if (!entries.length) return void console.log(chalk.yellow('No entries found in registry.'));

  const groups = {};
  for (const e of entries) (groups[e.type] = groups[e.type] ?? []).push(e);

  const ORDER = ['skill', 'instruction', 'agent', 'mcp', 'hook'];
  const LABELS = { skill:'Skills', instruction:'Custom Instructions', agent:'Agents', mcp:'MCP Servers', hook:'Hooks' };
  for (const type of ORDER) {
    if (!groups[type]) continue;
    const colorFn = TYPE_COLORS[type] ?? chalk.white;
    console.log(chalk.bold(`\n${TYPE_ICONS[type]}  ${LABELS[type]}`));
    console.log(chalk.gray('─'.repeat(60)));
    for (const e of groups[type]) {
      console.log(`  ${colorFn(e.shortName.padEnd(26))}${chalk.green(`v${e.version}`).padEnd(12)}${e.description.slice(0, 50)}${e.description.length > 50 ? '…' : ''}`);
      if (e.tags.length) console.log(`  ${''.padEnd(26)}${chalk.gray(e.tags.map((t) => `#${t}`).join(' '))}`);
    }
  }
  console.log('');
}

// ─── add (generic fallback) ──────────────────────────────────────────────────

export async function addEntry(id, { force = false, dest } = {}) {
  const { content: regContent } = readRegistryEntry(id);
  const { data: regData, content: regBody } = parseEntry(regContent);
  const type = regData.type ?? 'skill';
  const destDir = resolveDestDir(type, dest);
  const installed = readDestEntry(id, destDir);

  if (installed && !force) {
    const { data: instData } = parseEntry(installed.content);
    if (semver.gte(instData.version, regData.version)) {
      console.log(chalk.yellow(`⏭  "${id}" already up-to-date (v${instData.version}).`));
      return;
    }
  }

  const output = buildOutput(regData, regBody, REGISTRY_REPO_URL);
  const destPath = writeDestEntry(id, output, destDir);
  console.log(chalk.green(`${TYPE_ICONS[type] ?? '📦'}  ✓  ${destPath}`));
}

// ─── rm ──────────────────────────────────────────────────────────────────────

export async function removeEntry(id, { dest } = {}) {
  let destDir = dest;
  if (!destDir) {
    try {
      const { content } = readRegistryEntry(id);
      const { data } = parseEntry(content);
      destDir = resolveDestDir(data.type ?? 'skill');
    } catch { destDir = DEST_DIRS.skill; }
  }
  const removed = removeDestEntry(id, destDir);
  console.log(removed ? chalk.green(`✓  Removed: ${id}`) : chalk.yellow(`⚠  "${id}" was not installed.`));
}

// ─── update ──────────────────────────────────────────────────────────────────

export async function updateEntries({ dest, dryRun = false } = {}) {
  const registryEntries = getRegistryEntries();
  console.log(chalk.bold(`\n🔄  Checking ${registryEntries.length} registry entries...\n`));
  let updated = 0, skipped = 0;

  for (const { id, type } of registryEntries) {
    const destDir = resolveDestDir(type, dest);
    const installed = readDestEntry(id, destDir);
    if (!installed) { skipped++; continue; }

    let regData, regBody;
    try {
      const { content: regContent } = readRegistryEntry(id);
      ({ data: regData, content: regBody } = parseEntry(regContent));
    } catch { skipped++; continue; }

    const { data: instData } = parseEntry(installed.content);
    if (semver.gt(regData.version, instData.version)) {
      console.log(`  ${TYPE_ICONS[type]} ${chalk.cyan(id.split('/').pop())} ${chalk.gray(instData.version)} → ${chalk.green(regData.version)}${dryRun ? chalk.yellow(' (dry-run)') : ''}`);
      if (!dryRun) writeDestEntry(id, buildOutput(regData, regBody, REGISTRY_REPO_URL), destDir);
      updated++;
    } else skipped++;
  }

  console.log(`\n${chalk.green(`✓ ${updated} updated`)}  ${chalk.gray(`${skipped} already current`)}\n`);
}

// ─── bump ────────────────────────────────────────────────────────────────────

export async function bumpEntry(id, bumpType) {
  const { content } = readRegistryEntry(id);
  const parsed = matter(content);
  const oldVersion = parsed.data.version;
  const newVersion = semver.inc(oldVersion, bumpType);
  if (!newVersion) { console.error(chalk.red(`✗  Cannot bump "${oldVersion}" with "${bumpType}"`)); process.exit(1); }
  parsed.data.version = newVersion;
  const destPath = writeRegistryEntry(id, matter.stringify(parsed.content, parsed.data));
  console.log(chalk.green(`${TYPE_ICONS[parsed.data.type ?? 'skill']}  Bumped "${id}": v${oldVersion} → v${newVersion}`));
  console.log(chalk.gray(`   ${destPath}`));
}
