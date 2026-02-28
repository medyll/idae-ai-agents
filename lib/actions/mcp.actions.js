/**
 * @file mcp.actions.js
 * MCP Server-specific business logic for add-mcp command.
 *
 * Extras over the generic addEntry:
 *  - Validates type === 'mcp'
 *  - Writes to .vscode/mcp-configs/<name>.md (documentation + instructions)
 *  - Patches .vscode/mcp.json (the live VS Code MCP registry file)
 *    with the server entry — this is what actually activates the server
 *  - Detects missing environment variables and warns with setup instructions
 *  - Supports --tools flag to install a subset of tools only
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

const DEST    = DEST_DIRS.mcp;               // .vscode/mcp-configs
const MCP_JSON = '.vscode/mcp.json';          // VS Code MCP registry

/**
 * Install an MCP server.
 *
 * @param {string}  id
 * @param {{ force?: boolean, dest?: string, tools?: string[] }} opts
 *   tools: optional subset of tool names to expose (overrides frontmatter `tools`)
 */
export async function addMcpAction(id, { force = false, dest = DEST, tools } = {}) {
  const fullId = toMcpId(id);
  const { content: regContent } = readRegistryEntry(fullId);
  const { data: regData, content: regBody } = parseEntry(regContent);

  if (regData.type !== 'mcp') {
    console.error(chalk.red(`✗  "${id}" is not an MCP server (type: ${regData.type}).`));
    process.exit(1);
  }

  const installed = readDestEntry(fullId, dest);
  if (installed && !force) {
    const { data: instData } = parseEntry(installed.content);
    if (semver.gte(instData.version, regData.version)) {
      console.log(chalk.yellow(`⏭  ${id} already at v${instData.version}`));
      return;
    }
    console.log(chalk.blue(`🔌  Updating ${id}: v${instData.version} → v${regData.version}`));
  } else {
    console.log(chalk.blue(`🔌  Installing MCP server: ${id} v${regData.version}`));
    console.log(chalk.gray(`    transport: ${regData.transport}  command: ${regData.command ?? regData.url}`));
  }

  // Merge tool override
  const effectiveData = tools?.length
    ? { ...regData, tools }
    : regData;

  // Write documentation file
  const output = buildOutput(effectiveData, regBody, REGISTRY_REPO_URL);
  const destPath = writeDestEntry(fullId, output, dest);
  console.log(chalk.green(`✓  ${destPath}`));

  // Patch .vscode/mcp.json
  _patchMcpJson(effectiveData);

  // Check for missing env vars
  _checkEnvVars(effectiveData);
}

/**
 * List MCP servers with transport + env requirements.
 */
export async function listMcpAction({ json = false } = {}) {
  const all = getRegistryEntries().filter((e) => e.type === 'mcp');
  const entries = all.map((e) => {
    const { content } = readRegistryEntry(e.id);
    const { data } = parseEntry(content);
    return {
      id: e.id,
      name: data.name,
      version: data.version,
      transport: data.transport,
      command: data.command ?? data.url,
      env: Object.keys(data.env ?? {}),
      tools: data.tools ?? [],
      description: data.description,
    };
  });

  if (json) return void console.log(JSON.stringify(entries, null, 2));

  console.log(chalk.bold('\n🔌  MCP Servers\n'));
  for (const e of entries) {
    console.log(`  ${chalk.yellow(e.name.padEnd(24))} ${chalk.green('v' + e.version)}  ${chalk.gray(e.transport)}`);
    console.log(`  ${''.padEnd(24)} cmd: ${e.command}`);
    if (e.env.length) console.log(`  ${''.padEnd(24)} env: ${e.env.map((v) => chalk.red(v)).join(', ')}`);
    if (e.tools.length) console.log(`  ${''.padEnd(24)} tools: ${e.tools.join(', ')}`);
    console.log('');
  }
}

// ─── .vscode/mcp.json patcher ────────────────────────────────────────────────

/**
 * Upsert the server entry into .vscode/mcp.json.
 * Creates the file if it doesn't exist.
 * Format follows the VS Code MCP JSON schema.
 */
function _patchMcpJson(data) {
  const mcpPath = join(process.cwd(), MCP_JSON);
  mkdirSync(join(process.cwd(), '.vscode'), { recursive: true });

  let mcpJson = { inputs: [], servers: {} };
  if (existsSync(mcpPath)) {
    try { mcpJson = JSON.parse(readFileSync(mcpPath, 'utf-8')); } catch {}
  }

  // Build server entry
  const serverEntry = _buildServerEntry(data);
  mcpJson.servers = mcpJson.servers ?? {};
  mcpJson.servers[data.name] = serverEntry;

  // Add env var prompts as inputs if they use ${input:} or ${env:} syntax
  const envEntries = Object.entries(data.env ?? {});
  for (const [, val] of envEntries) {
    const match = val.match(/\$\{input:([^}]+)\}/);
    if (match) {
      const inputId = match[1];
      mcpJson.inputs = mcpJson.inputs ?? [];
      if (!mcpJson.inputs.find((i) => i.id === inputId)) {
        mcpJson.inputs.push({
          id: inputId,
          type: 'promptString',
          description: `Value for ${inputId}`,
          password: inputId.toLowerCase().includes('token') || inputId.toLowerCase().includes('key') || inputId.toLowerCase().includes('secret'),
        });
      }
    }
  }

  writeFileSync(mcpPath, JSON.stringify(mcpJson, null, 2) + '\n', 'utf-8');
  console.log(chalk.gray(`   ↳ ${MCP_JSON} updated (servers.${data.name})`));
}

function _buildServerEntry(data) {
  const base = { type: data.transport };

  if (data.transport === 'stdio') {
    base.command = data.command;
    if (data.args?.length) base.args = data.args;
    if (Object.keys(data.env ?? {}).length) base.env = data.env;
  } else {
    base.url = data.url;
    if (Object.keys(data.env ?? {}).length) base.headers = _envToHeaders(data.env);
  }

  if (data.tools?.length) base.tools = data.tools;

  return base;
}

function _envToHeaders(env) {
  return Object.fromEntries(
    Object.entries(env).map(([k, v]) => [k.toLowerCase().replace(/_/g, '-'), v])
  );
}

function _checkEnvVars(data) {
  const missing = [];
  for (const [key, val] of Object.entries(data.env ?? {})) {
    if (val.startsWith('${env:')) {
      const varName = val.slice(6, -1);
      if (!process.env[varName]) missing.push(varName);
    }
  }
  if (missing.length) {
    console.log(chalk.yellow(`   ⚠  Missing environment variables:`));
    for (const v of missing) {
      console.log(chalk.yellow(`      export ${v}=<your-value>`));
    }
  }
}

function toMcpId(id) {
  if (id.includes('/')) return id;
  return `mcp/${id}`;

}
