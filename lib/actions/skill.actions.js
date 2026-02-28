/**
 * @file skill.actions.js
 * Skill-specific business logic for add-skill command.
 *
 * Extras over the generic addEntry:
 *  - Validates that the entry is actually of type 'skill'
 *  - Writes to .github/skills/ (VS Code agent skills spec)
 *  - Generates the companion .vscode/settings.json snippet
 *    that registers the skill for the IDE
 *  - Suggests related skills from the same tag group
 */

import chalk from 'chalk';
import semver from 'semver';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { parseEntry, buildOutput } from '../parser.js';
import {
  getRegistryEntries,
  readRegistryEntry,
  writeDestEntry,
  readDestEntry,
  REGISTRY_REPO_URL,
  DEST_DIRS,
} from '../utils/fs.js';

const DEST = DEST_DIRS.skill; // .github/skills

/**
 * Install one or more skills by id.
 * Accepts a single id string or an array (batch install).
 *
 * @param {string|string[]} ids
 * @param {{ force?: boolean, dest?: string, suggest?: boolean }} opts
 */
export async function addSkillAction(ids, { force = false, dest = DEST, suggest = true } = {}) {
  const list = Array.isArray(ids) ? ids : [ids];

  for (const id of list) {
    const fullId = normaliseSkillId(id); // allow bare "react-expert" or "_agents/…" by mistake
    await _installSkill(fullId, { force, dest, suggest });
  }
}

/**
 * List only skills from the registry with tag-based grouping.
 */
export async function listSkillsAction({ json = false, tag } = {}) {
  const all = getRegistryEntries().filter((e) => e.type === 'skill');

  const entries = all.map((e) => {
    const { content } = readRegistryEntry(e.id);
    const { data } = parseEntry(content);
    return {
      id: e.id,
      name: data.name,
      version: data.version,
      description: data.description,
      tags: data.metadata?.tags ?? [],
      userInvokable: data['user-invokable'] ?? true,
    };
  }).filter((e) => !tag || e.tags.includes(tag));

  if (json) return void console.log(JSON.stringify(entries, null, 2));

  if (!entries.length) return void console.log(chalk.yellow('No skills found.'));

  // Group by first tag
  const groups = {};
  for (const e of entries) {
    const key = e.tags[0] ?? 'general';
    (groups[key] = groups[key] ?? []).push(e);
  }

  console.log(chalk.bold('\n🧠  Skills\n'));
  for (const [group, items] of Object.entries(groups)) {
    console.log(chalk.cyan(`  #${group}`));
    for (const e of items) {
      const inv = e.userInvokable ? chalk.gray(' [invokable]') : '';
      console.log(`    ${chalk.white(e.name.padEnd(24))} ${chalk.green('v' + e.version)}${inv}`);
      console.log(`    ${' '.repeat(24)} ${chalk.gray(e.description.slice(0, 60))}`);
    }
  }
  console.log('');
}

// ─── internal ────────────────────────────────────────────────────────────────

async function _installSkill(id, { force, dest, suggest }) {
  const { content: regContent } = readRegistryEntry(id);
  const { data: regData, content: regBody } = parseEntry(regContent);

  if (regData.type !== 'skill') {
    console.error(chalk.red(`✗  "${id}" is not a skill (type: ${regData.type}). Use the matching add-* command.`));
    process.exit(1);
  }

  const installed = readDestEntry(id, dest);
  if (installed && !force) {
    const { data: instData } = parseEntry(installed.content);
    if (semver.gte(instData.version, regData.version)) {
      console.log(chalk.yellow(`⏭  ${id} already at v${instData.version}`));
      return;
    }
    console.log(chalk.blue(`⬆  ${id}: v${instData.version} → v${regData.version}`));
  } else {
    console.log(chalk.blue(`🧠  Installing skill: ${id} v${regData.version}`));
  }

  const output = buildOutput(regData, regBody, REGISTRY_REPO_URL);
  const destPath = writeDestEntry(id, output, dest);
  console.log(chalk.green(`✓  ${destPath}`));

  // Update .vscode/settings.json to reference the new skill
  _patchVscodeSettings(id, dest);

  // Suggest sibling skills by shared tags
  if (suggest) _suggestSiblings(id, regData.metadata?.tags ?? []);
}

/**
 * Ensure .vscode/settings.json references the skills directory
 * under `github.copilot.chat.skillsDirectory`.
 */
function _patchVscodeSettings(installedId, dest) {
  const vscodeDir  = join(process.cwd(), '.vscode');
  const vscodePath = join(vscodeDir, 'settings.json');
  let settings = {};

  if (existsSync(vscodePath)) {
    try { settings = JSON.parse(readFileSync(vscodePath, 'utf-8')); } catch {}
  }

  const skillsDir = join(process.cwd(), dest);
  if (!existsSync(skillsDir)) return;

  const relPath = dest.replace(/\\/g, '/');
  settings['github.copilot.chat.skillsDirectory'] = relPath;

  try {
    mkdirSync(vscodeDir, { recursive: true });
    writeFileSync(vscodePath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
    console.log(chalk.gray(`   ↳ .vscode/settings.json updated (skillsDirectory)`));
  } catch {}
}

function _suggestSiblings(installedId, tags) {
  if (!tags.length) return;
  const siblings = getRegistryEntries()
    .filter((e) => e.type === 'skill' && e.id !== installedId)
    .filter((e) => {
      try {
        const { content } = readRegistryEntry(e.id);
        const { data } = parseEntry(content);
        return (data.metadata?.tags ?? []).some((t) => tags.includes(t));
      } catch (err) {
        // Ignore invalid or unparsable registry entries when suggesting
        return false;
      }
    });

  if (siblings.length) {
    console.log(chalk.gray(`   Related skills: ${siblings.map((s) => chalk.cyan(s.id.split('/').pop())).join(', ')}`));
    console.log(chalk.gray(`   Install with: ia-agents add-skill ${siblings[0].id.split('/').pop()}`));
  }
}

function normaliseSkillId(id) {
  if (id.includes('/')) return id;
  return `skills/${id}`;
}
