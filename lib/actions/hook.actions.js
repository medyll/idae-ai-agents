/**
 * @file hook.actions.js
 * Hook-specific business logic for add-hook command.
 *
 * Extras over the generic addEntry:
 *  - Validates type === 'hook'
 *  - Writes to .github/hooks/<n>.md
 *  - Patches .github/hooks/config.json — the hook runner manifest
 *    consumed by the AI agent at runtime
 *  - Validates that the 'event' value is a known lifecycle event
 *  - Groups hooks by event in the config for fast lookup
 *  - If on-failure: 'fix', emits a note to the AI about auto-fix behaviour
 */

import chalk from 'chalk';
import semver from 'semver';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { parseEntry, buildOutput } from '../parser.js';
import {
  readRegistryEntry,
  writeDestEntry,
  readDestEntry,
  getRegistryEntries,
  REGISTRY_REPO_URL,
  DEST_DIRS,
} from '../utils/fs.js';

const DEST         = DEST_DIRS.hook;          // .github/hooks
const HOOKS_CONFIG = '.github/hooks/config.json';

const KNOWN_EVENTS = [
  'pre-edit', 'post-edit',
  'pre-commit', 'post-commit',
  'on-test-fail', 'on-build-fail', 'on-error',
  'on-session-start', 'on-session-end', 'on-file-save',
];

/**
 * Install a hook.
 *
 * @param {string}  id
 * @param {{ force?: boolean, dest?: string }} opts
 */
export async function addHookAction(id, { force = false, dest = DEST } = {}) {
  const fullId = toHookId(id);
  const { content: regContent } = readRegistryEntry(fullId);
  const { data: regData, content: regBody } = parseEntry(regContent);

  if (regData.type !== 'hook') {
    console.error(chalk.red(`✗  "${id}" is not a hook (type: ${regData.type}).`));
    process.exit(1);
  }

  if (!KNOWN_EVENTS.includes(regData.event)) {
    console.error(chalk.red(`✗  Unknown event "${regData.event}". Known: ${KNOWN_EVENTS.join(', ')}`));
    process.exit(1);
  }

  const installed = readDestEntry(fullId, dest);
  if (installed && !force) {
    const { data: instData } = parseEntry(installed.content);
    if (semver.gte(instData.version, regData.version)) {
      console.log(chalk.yellow(`⏭  ${id} already at v${instData.version}`));
      _patchHooksConfig(regData, dest);
      return;
    }
    console.log(chalk.blue(`🪝  Updating ${id}: v${instData.version} → v${regData.version}`));
  } else {
    console.log(chalk.blue(`🪝  Installing hook: ${id} v${regData.version}`));
    console.log(chalk.gray(`    event: ${regData.event}  on-failure: ${regData['on-failure'] ?? 'warn'}`));
    if (regData.condition) console.log(chalk.gray(`    condition: ${regData.condition}`));
  }

  const output = buildOutput(regData, regBody, REGISTRY_REPO_URL);
  const destPath = writeDestEntry(fullId, output, dest);
  console.log(chalk.green(`✓  ${destPath}`));

  _patchHooksConfig(regData, dest);

  if (regData['on-failure'] === 'fix') {
    console.log(chalk.gray(`   ↳ on-failure: fix — AI will auto-correct and retry on non-zero exit`));
  }
  if (regData['on-failure'] === 'block') {
    console.log(chalk.gray(`   ↳ on-failure: block — AI action will halt if this hook fails`));
  }
}

/**
 * List all hooks grouped by event.
 */
export async function listHooksAction({ json = false } = {}) {
  const all = getRegistryEntries().filter((e) => e.type === 'hook');
  const entries = all.map((e) => {
    const { content } = readRegistryEntry(e.id);
    const { data } = parseEntry(content);
    return {
      id: e.id, name: data.name, version: data.version,
      event: data.event, run: data.run,
      condition: data.condition,
      onFailure: data['on-failure'] ?? 'warn',
      timeoutMs: data['timeout-ms'] ?? 10000,
    };
  });

  if (json) return void console.log(JSON.stringify(entries, null, 2));

  console.log(chalk.bold('\n🪝  Hooks\n'));

  const byEvent = {};
  for (const e of entries) (byEvent[e.event] = byEvent[e.event] ?? []).push(e);

  for (const [event, hooks] of Object.entries(byEvent)) {
    console.log(chalk.red(`  ${event}`));
    for (const h of hooks) {
      const failColor = h.onFailure === 'block' ? chalk.red : h.onFailure === 'fix' ? chalk.yellow : chalk.gray;
      console.log(`    ${chalk.white(h.name.padEnd(26))} ${chalk.green('v' + h.version)}  ${failColor(h.onFailure)}`);
      console.log(`    ${''.padEnd(26)} run: ${chalk.gray(h.run.slice(0, 55))}`);
    }
    console.log('');
  }
}

// ─── config.json patcher ─────────────────────────────────────────────────────

/**
 * Upsert the hook into .github/hooks/config.json.
 * The config is a flat map: event → array of hook descriptors.
 * This file is read by the AI agent runtime to fire hooks at the right moment.
 */
function _patchHooksConfig(data, dest) {
  const configPath = join(process.cwd(), HOOKS_CONFIG);
  mkdirSync(join(process.cwd(), dest), { recursive: true });

  let config = {};
  if (existsSync(configPath)) {
    try { config = JSON.parse(readFileSync(configPath, 'utf-8')); } catch {}
  }

  config[data.event] = config[data.event] ?? [];

  // Remove previous version of this hook if present
  config[data.event] = config[data.event].filter((h) => h.name !== data.name);

  // Append updated entry
  config[data.event].push({
    name:      data.name,
    version:   data.version,
    run:       data.run,
    condition: data.condition ?? null,
    onFailure: data['on-failure'] ?? 'warn',
    timeoutMs: data['timeout-ms'] ?? 10000,
  });

  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  console.log(chalk.gray(`   ↳ ${HOOKS_CONFIG} updated (${data.event})`));
}

function toHookId(id) {
  if (id.includes('/')) return id;
  return `hooks/${id}`;

}
