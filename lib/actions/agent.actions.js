/**
 * @file agent.actions.js
 * Agent-specific business logic for add-agent command.
 *
 * Extras over the generic addEntry:
 *  - Validates type === 'agent'
 *  - Cascade-installs all declared skills, mcp-servers and hooks
 *    automatically (with --no-cascade to opt out)
 *  - Generates the .github/agents/<name>.json sidecar file
 *    (VS Code custom agents spec — JSON for IDE parsing)
 *  - Validates that referenced skill/mcp/hook ids exist in registry
 *  - Prints a dependency tree summary
 */

import chalk from 'chalk';
import semver from 'semver';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
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
import { addSkillAction } from './skill.actions.js';
import { addMcpAction } from './mcp.actions.js';
import { addHookAction } from './hook.actions.js';

const DEST = DEST_DIRS.agent; // .github/agents

/**
 * Install an agent and all its declared dependencies.
 *
 * @param {string}  id
 * @param {{ force?: boolean, dest?: string, cascade?: boolean, dryRun?: boolean }} opts
 */
export async function addAgentAction(id, { force = false, dest = DEST, cascade = true, dryRun = false } = {}) {
  const fullId = toAgentId(id);
  const { content: regContent } = readRegistryEntry(fullId);
  const { data: regData, content: regBody } = parseEntry(regContent);

  if (regData.type !== 'agent') {
    console.error(chalk.red(`✗  "${id}" is not an agent (type: ${regData.type}).`));
    process.exit(1);
  }

  // ── Validate all dependencies exist in registry before installing anything ──
  const missing = _validateDependencies(regData);
  if (missing.length) {
    console.error(chalk.red(`✗  Agent "${id}" has unresolvable dependencies:`));
    for (const m of missing) console.error(chalk.red(`   - ${m}`));
    process.exit(1);
  }

  // ── Print dependency tree ──
  console.log(chalk.bold(`\n🤖  Agent: ${id} v${regData.version}`));
  _printDepTree(regData);

  if (dryRun) {
    console.log(chalk.yellow('\n   (dry-run — nothing written)\n'));
    return;
  }

  // ── Install the agent file itself ──
  const installed = readDestEntry(fullId, dest);
  if (installed && !force) {
    const { data: instData } = parseEntry(installed.content);
    if (semver.gte(instData.version, regData.version)) {
      console.log(chalk.yellow(`   ⏭  Agent already at v${instData.version}`));
    } else {
      console.log(chalk.blue(`   ⬆  v${instData.version} → v${regData.version}`));
      _writeAgent(fullId, regData, regBody, dest);
    }
  } else {
    _writeAgent(fullId, regData, regBody, dest);
  }

  // ── Cascade installs ──
  if (cascade) {
    const skills   = regData.skills       ?? [];
    const mcps     = regData['mcp-servers'] ?? [];
    const hooks    = regData.hooks        ?? [];

    if (skills.length) {
      console.log(chalk.bold(`\n   🧠  Installing ${skills.length} skill(s)...`));
      for (const s of skills) await addSkillAction(s, { force, suggest: false });
    }
    if (mcps.length) {
      console.log(chalk.bold(`\n   🔌  Installing ${mcps.length} MCP server(s)...`));
      for (const m of mcps) await addMcpAction(m, { force });
    }
    if (hooks.length) {
      console.log(chalk.bold(`\n   🪝  Installing ${hooks.length} hook(s)...`));
      for (const h of hooks) await addHookAction(h, { force });
    }
  } else {
    const all = [
      ...(regData.skills ?? []).map((s) => `ia-agents add-skill ${s}`),
      ...(regData['mcp-servers'] ?? []).map((m) => `ia-agents add-mcp ${m}`),
      ...(regData.hooks ?? []).map((h) => `ia-agents add-hook ${h}`),
    ];
    if (all.length) {
      console.log(chalk.yellow('\n   --no-cascade: install dependencies manually:'));
      for (const cmd of all) console.log(chalk.gray(`   ${cmd}`));
    }
  }

  console.log(chalk.green(`\n✓  Agent "${id}" ready\n`));
}

/**
 * List agents with their dependency counts.
 */
export async function listAgentsAction({ json = false } = {}) {
  const all = getRegistryEntries().filter((e) => e.type === 'agent');
  const entries = all.map((e) => {
    const { content } = readRegistryEntry(e.id);
    const { data } = parseEntry(content);
    return {
      id: e.id,
      name: data.name,
      version: data.version,
      skills: data.skills ?? [],
      mcpServers: data['mcp-servers'] ?? [],
      hooks: data.hooks ?? [],
      tools: data.tools ?? [],
      description: data.description,
    };
  });

  if (json) return void console.log(JSON.stringify(entries, null, 2));

  console.log(chalk.bold('\n🤖  Agents\n'));
  for (const e of entries) {
    console.log(`  ${chalk.magenta(e.name.padEnd(24))} ${chalk.green('v' + e.version)}`);
    if (e.skills.length)     console.log(`  ${''.padEnd(24)} 🧠 skills: ${e.skills.join(', ')}`);
    if (e.mcpServers.length) console.log(`  ${''.padEnd(24)} 🔌 mcp: ${e.mcpServers.join(', ')}`);
    if (e.hooks.length)      console.log(`  ${''.padEnd(24)} 🪝 hooks: ${e.hooks.join(', ')}`);
    if (e.tools.length)      console.log(`  ${''.padEnd(24)} 🔧 tools: ${e.tools.join(', ')}`);
    console.log('');
  }
}

// ─── internal ────────────────────────────────────────────────────────────────

function _writeAgent(fullId, regData, regBody, dest) {
  const output = buildOutput(regData, regBody, REGISTRY_REPO_URL);
  const destPath = writeDestEntry(fullId, output, dest);
  console.log(chalk.green(`   ✓  ${destPath}`));

  // Write companion JSON sidecar for VS Code custom agents spec
  _writeJsonSidecar(fullId, regData, dest);
}

/**
 * Write a .json companion file alongside the .md, following the
 * VS Code custom agents JSON schema.
 */
function _writeJsonSidecar(fullId, data, dest) {
  const shortName = fullId.split('/').pop();
  const destAbs = join(process.cwd(), dest);
  if (!existsSync(destAbs)) mkdirSync(destAbs, { recursive: true });

  const sidecar = {
    name: data.name,
    version: data.version,
    description: data.description,
    role: data.role,
    skills: data.skills ?? [],
    'mcp-servers': data['mcp-servers'] ?? [],
    hooks: data.hooks ?? [],
    tools: data.tools ?? [],
    constraints: data.constraints ?? {},
    _managed: `@medyll/ia-agents — update with: ia-agents add-agent ${data.name}`,
  };

  const jsonPath = join(destAbs, `${shortName}.json`);
  writeFileSync(jsonPath, JSON.stringify(sidecar, null, 2) + '\n', 'utf-8');
  console.log(chalk.gray(`   ↳ Sidecar: ${jsonPath}`));
}

function _validateDependencies(data) {
  const registryIds = new Set(getRegistryEntries().map((e) => e.id.split('/').pop()));
  const missing = [];

  for (const s of data.skills ?? []) {
    if (!registryIds.has(s)) missing.push(`skill "${s}" not in registry`);
  }
  for (const m of data['mcp-servers'] ?? []) {
    if (!registryIds.has(m)) missing.push(`mcp-server "${m}" not in registry`);
  }
  for (const h of data.hooks ?? []) {
    if (!registryIds.has(h)) missing.push(`hook "${h}" not in registry`);
  }
  return missing;
}

function _printDepTree(data) {
  const lines = [];
  for (const s of data.skills ?? [])        lines.push(`  ├─ 🧠  skill       ${chalk.cyan(s)}`);
  for (const m of data['mcp-servers'] ?? []) lines.push(`  ├─ 🔌  mcp-server  ${chalk.yellow(m)}`);
  for (const h of data.hooks ?? [])          lines.push(`  ├─ 🪝  hook        ${chalk.red(h)}`);
  for (const t of data.tools ?? [])          lines.push(`  ├─ 🔧  tool        ${chalk.gray(t)}`);
  if (lines.length) console.log(lines.join('\n'));
  else console.log(chalk.gray('  (no dependencies)'));
}

function toAgentId(id) {
  if (id.includes('/')) return id;
  return `agents/${id}`;
}`;
}
