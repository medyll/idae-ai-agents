#!/usr/bin/env node
/**
 * @medyll/ia-agents CLI
 *
 * Usage (no install needed):
 *   pnpm dlx @medyll/ia-agents <command>
 *
 * Command groups:
 *   Generic  : ls, add, rm, update, bump
 *   Typed    : add-skill, add-instruction, add-agent, add-mcp, add-hook
 *              ls-skills, ls-instructions, ls-agents, ls-mcp, ls-hooks
 */

import { program, Command } from 'commander';
import { readFileSync }      from 'fs';
import { fileURLToPath }     from 'url';
import { dirname, join }     from 'path';

import { listEntries, addEntry, removeEntry, updateEntries, bumpEntry } from '../lib/actions.js';
import { addSkillAction, listSkillsAction }            from '../lib/actions/skill.actions.js';
import { addInstructionAction, listInstructionsAction } from '../lib/actions/instruction.actions.js';
import { addAgentAction, listAgentsAction }             from '../lib/actions/agent.actions.js';
import { addMcpAction, listMcpAction }                  from '../lib/actions/mcp.actions.js';
import { addHookAction, listHooksAction }               from '../lib/actions/hook.actions.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

// ─────────────────────────────────────────────────────────────────────────────
//  Root program
// ─────────────────────────────────────────────────────────────────────────────

program
  .name('ia-agents')
  .description(
    '@medyll/ia-agents — Manage the full configuration of your AI agents\n\n' +
    '  🧠  Skills      : add-skill  ls-skills\n' +
    '  📋  Instructions: add-instruction  ls-instructions\n' +
    '  🤖  Agents      : add-agent  ls-agents\n' +
    '  🔌  MCP servers : add-mcp  ls-mcp\n' +
    '  🪝  Hooks       : add-hook  ls-hooks\n' +
    '  📦  Generic     : ls  add  rm  update  bump'
  )
  .version(pkg.version);

// ─────────────────────────────────────────────────────────────────────────────
//  GENERIC commands
// ─────────────────────────────────────────────────────────────────────────────

program
  .command('ls')
  .description('List all entries in the registry')
  .option('--json',           'Output as JSON')
  .option('--type <type>',    'Filter: skill | instruction | agent | mcp | hook')
  .action((o) => listEntries({ json: o.json, type: o.type }));

program
  .command('add <id>')
  .description('Generic install — auto-detects type and destination')
  .option('-f, --force',      'Overwrite even if same version')
  .option('--dest <path>',    'Override destination directory')
  .action((id, o) => addEntry(id, { force: o.force, dest: o.dest }));

program
  .command('rm <id>')
  .description('Remove an installed entry')
  .option('--dest <path>',    'Override destination directory')
  .action((id, o) => removeEntry(id, { dest: o.dest }));

program
  .command('update')
  .description('Sync all installed entries to their latest registry versions')
  .option('--dest <path>',    'Override destination (applies to all types)')
  .option('--dry-run',        'Preview without writing')
  .action((o) => updateEntries({ dest: o.dest, dryRun: o.dryRun }));

program
  .command('bump <id> <type>')
  .description('Increment version: patch | minor | major  (maintainers only)')
  .action((id, type) => {
    if (!['patch', 'minor', 'major'].includes(type)) {
      console.error(`❌  "${type}" is not valid. Use: patch | minor | major`);
      process.exit(1);
    }
    bumpEntry(id, type);
  });

// ─────────────────────────────────────────────────────────────────────────────
//  🧠  SKILL commands
// ─────────────────────────────────────────────────────────────────────────────

program
  .command('add-skill <id>')
  .description(
    '🧠  Install a skill into .github/skills/\n' +
    '    Also patches .vscode/settings.json (skillsDirectory)\n' +
    '    Accepts multiple ids: ia-agents add-skill react-expert typescript-expert'
  )
  .option('-f, --force',       'Overwrite even if same version')
  .option('--dest <path>',     'Override destination (default: .github/skills)')
  .option('--no-suggest',      'Disable related-skills suggestions')
  .action((id, o) => addSkillAction(id, { force: o.force, dest: o.dest, suggest: o.suggest !== false }));

program
  .command('ls-skills')
  .description('🧠  List skills grouped by tag')
  .option('--json',            'Output as JSON')
  .option('--tag <tag>',       'Filter by tag')
  .action((o) => listSkillsAction({ json: o.json, tag: o.tag }));

// ─────────────────────────────────────────────────────────────────────────────
//  📋  INSTRUCTION commands
// ─────────────────────────────────────────────────────────────────────────────

program
  .command('add-instruction <id>')
  .description(
    '📋  Install a custom instruction into .github/instructions/\n' +
    '    Global-scope instructions are merged into .github/copilot-instructions.md\n' +
    '    Merge order is controlled by the `priority` frontmatter field'
  )
  .option('-f, --force',       'Overwrite even if same version')
  .option('--dest <path>',     'Override destination (default: .github/instructions)')
  .option('--no-merge',        'Skip rebuilding copilot-instructions.md')
  .action((id, o) => addInstructionAction(id, { force: o.force, dest: o.dest, merge: o.merge !== false }));

program
  .command('ls-instructions')
  .description('📋  List custom instructions with scope and priority')
  .option('--json',            'Output as JSON')
  .action((o) => listInstructionsAction({ json: o.json }));

// ─────────────────────────────────────────────────────────────────────────────
//  🤖  AGENT commands
// ─────────────────────────────────────────────────────────────────────────────

program
  .command('add-agent <id>')
  .description(
    '🤖  Install an agent and cascade-install all its dependencies\n' +
    '    Skills, MCP servers and hooks declared in the agent\n' +
    '    are installed automatically (use --no-cascade to skip)\n' +
    '    Also writes a .json sidecar for VS Code custom agents spec'
  )
  .option('-f, --force',       'Overwrite even if same version')
  .option('--dest <path>',     'Override destination (default: .github/agents)')
  .option('--no-cascade',      'Skip automatic dependency installation')
  .option('--dry-run',         'Print dependency tree without installing')
  .action((id, o) =>
    addAgentAction(id, {
      force:   o.force,
      dest:    o.dest,
      cascade: o.cascade !== false,
      dryRun:  o.dryRun,
    })
  );

program
  .command('ls-agents')
  .description('🤖  List agents with their dependency counts')
  .option('--json',            'Output as JSON')
  .action((o) => listAgentsAction({ json: o.json }));

// ─────────────────────────────────────────────────────────────────────────────
//  🔌  MCP commands
// ─────────────────────────────────────────────────────────────────────────────

program
  .command('add-mcp <id>')
  .description(
    '🔌  Install an MCP server\n' +
    '    Writes the documentation file to .vscode/mcp-configs/\n' +
    '    Patches .vscode/mcp.json (the live VS Code MCP registry)\n' +
    '    Warns about missing environment variables'
  )
  .option('-f, --force',       'Overwrite even if same version')
  .option('--dest <path>',     'Override destination (default: .vscode/mcp-configs)')
  .option('--tools <list>',    'Comma-separated subset of tools to expose', (v) => v.split(','))
  .action((id, o) => addMcpAction(id, { force: o.force, dest: o.dest, tools: o.tools }));

program
  .command('ls-mcp')
  .description('🔌  List MCP servers with transport and env requirements')
  .option('--json',            'Output as JSON')
  .action((o) => listMcpAction({ json: o.json }));

// ─────────────────────────────────────────────────────────────────────────────
//  🪝  HOOK commands
// ─────────────────────────────────────────────────────────────────────────────

program
  .command('add-hook <id>')
  .description(
    '🪝  Install a lifecycle hook\n' +
    '    Writes the documentation file to .github/hooks/\n' +
    '    Patches .github/hooks/config.json (event → hooks map)\n' +
    '    on-failure: fix  →  AI will auto-correct and retry\n' +
    '    on-failure: block →  AI action halts on non-zero exit'
  )
  .option('-f, --force',       'Overwrite even if same version')
  .option('--dest <path>',     'Override destination (default: .github/hooks)')
  .action((id, o) => addHookAction(id, { force: o.force, dest: o.dest }));

program
  .command('ls-hooks')
  .description('🪝  List hooks grouped by lifecycle event')
  .option('--json',            'Output as JSON')
  .action((o) => listHooksAction({ json: o.json }));

// ─────────────────────────────────────────────────────────────────────────────

program.parse();
