# @medyll/ia-agents

> Manage, validate and distribute the **complete configuration of an AI agent** as versioned Markdown packages — skills, custom instructions, agents, MCP servers and hooks.


```bash
# No install needed
pnpm dlx @medyll/ia-agents ls-skills         # Liste toutes les skills
pnpm dlx @medyll/ia-agents ls-instructions   # Liste toutes les instructions
pnpm dlx @medyll/ia-agents add-skill react-expert
pnpm dlx @medyll/ia-agents add-agent fullstack-dev    # cascades skills + mcp + hooks
```

---

## Command Reference

### Generic

| Command | Description |
|---|---|
| `ls-skills` | List all installed skills |
| `ls-instructions` | List all installed instructions |
| `ls` | (deprecated) List all entries. Filter with `--type skill\|instruction\|agent\|mcp\|hook` |
| `add <id>` | Generic install — auto-detects type and destination |
| `rm <id>` | Remove an installed entry |
| `update` | Sync all installed entries to latest registry versions |
| `bump <id> patch\|minor\|major` | Increment version in registry *(maintainers)* |

### Typed commands (with deeper logic)

| Command | Type | What it does beyond `add` |
|---|---|---|
| `add-skill <id>` | 🧠 Skill | Patches `.vscode/settings.json` · Suggests sibling skills by tag |
| `add-instruction <id>` | 📋 Instruction | Rebuilds `.github/copilot-instructions.md` sorted by priority |
| `add-agent <id>` | 🤖 Agent | Cascade-installs all skills + MCP + hooks · Writes JSON sidecar |
| `add-mcp <id>` | 🔌 MCP | Patches `.vscode/mcp.json` · Warns on missing env vars |
| `add-hook <id>` | 🪝 Hook | Patches `.github/hooks/config.json` (event → hooks map) |

```bash
# List commands
ia-agents ls-skills
ia-agents ls-instructions
ia-agents ls-agents
ia-agents ls-mcp
ia-agents ls-hooks

# Typed installs
ia-agents add-skill react-expert --suggest
ia-agents add-instruction project-conventions
ia-agents add-agent fullstack-dev --dry-run   # preview dependency tree first
ia-agents add-mcp github-mcp --tools create_issue,list_pull_requests
ia-agents add-hook pre-commit-lint
```

---

## What Gets Written Where

```
your-project/
├── .github/
│   ├── skills/                   ← add-skill
│   │   └── react-expert.md
│   ├── instructions/             ← add-instruction (per-file)
│   │   └── project-conventions.md
│   ├── copilot-instructions.md   ← auto-merged from global instructions
│   ├── agents/                   ← add-agent
│   │   ├── fullstack-dev.md
│   │   └── fullstack-dev.json    ← JSON sidecar (VS Code agents spec)
│   └── hooks/
│       ├── pre-commit-lint.md    ← add-hook
│       └── config.json           ← event → hooks runtime manifest
└── .vscode/
    ├── settings.json             ← patched with skillsDirectory
    ├── mcp.json                  ← patched with server entries
    └── mcp-configs/
        └── github-mcp.md         ← add-mcp (documentation)
```

---

## The 5 Dimensions

### 🧠 Skill

Reusable AI capability injected into the IDE via `.github/skills/`.

```yaml
---
type: skill
name: react-expert
description: "Trigger: use when optimizing React or managing hooks."
version: 1.1.0
user-invokable: true
metadata:
  author: Medyll
  tags: [react, performance]
---
# AI instructions as comments
```

### 📋 Custom Instruction

Project-wide conventions for all AI code generation.
Global-scope files are merged (by `priority`) into `.github/copilot-instructions.md`.

```yaml
---
type: instruction
name: project-conventions
description: "TypeScript strict, named exports, Conventional Commits."
version: 1.0.0
scope: global          # global | workspace | file-type
priority: 80
---
```

### 🤖 Agent

Named expert with a role, declared dependencies and behavioural constraints.
`add-agent` installs the agent **and all its dependencies** in one command.

```yaml
---
type: agent
name: fullstack-dev
description: "Full-stack agent covering React, Node, Prisma and CI."
version: 1.0.0
role: "You are an expert full-stack engineer…"
skills: [react-expert, typescript-expert]
mcp-servers: [github-mcp]
hooks: [pre-commit-lint]
tools: [codebase, terminal, test-runner]
constraints:
  no-file-deletion: true
  max-iterations: 20
---
```

```bash
ia-agents add-agent fullstack-dev
# Output:
# 🤖  Agent: fullstack-dev v1.0.0
#   ├─ 🧠  skill       react-expert
#   ├─ 🧠  skill       typescript-expert
#   ├─ 🔌  mcp-server  github-mcp
#   ├─ 🪝  hook        pre-commit-lint
#
#    🧠  Installing 2 skill(s)...
#    🔌  Installing 1 MCP server(s)...
#    🪝  Installing 1 hook(s)...
# ✓  Agent "fullstack-dev" ready
```

### 🔌 MCP Server

External tool integration via Model Context Protocol.
Patched into `.vscode/mcp.json` automatically.

```yaml
---
type: mcp
name: github-mcp
description: "GitHub tools for issues, PRs and file management."
version: 1.0.0
transport: stdio
command: npx
args: ["-y", "@modelcontextprotocol/server-github"]
env:
  GITHUB_TOKEN: "${env:GITHUB_TOKEN}"
tools: [create_issue, create_pull_request, push_files]
---
```

### 🪝 Hook

Automated quality gate fired at a lifecycle event.
Registered in `.github/hooks/config.json` for the AI runtime.

```yaml
---
type: hook
name: pre-commit-lint
description: "Runs ESLint + Prettier + tsc before the AI commits."
version: 1.0.0
event: pre-commit
run: "pnpm lint && pnpm format:check && pnpm typecheck"
on-failure: fix        # warn | block | fix
condition: "**/*.{ts,tsx}"
timeout-ms: 30000
---
```

---

## Repository Structure

```
ia-agents/
├── bin/cli.js                         # Commander CLI — all commands
├── lib/
│   ├── index.js                       # Public API
│   ├── actions.js                     # Generic actions + re-exports
│   ├── parser.js                      # Frontmatter parsing & type validation
│   ├── utils/fs.js                    # Registry & destination helpers
│   └── actions/
│       ├── skill.actions.js           # 🧠 add-skill, ls-skills
│       ├── instruction.actions.js     # 📋 add-instruction, ls-instructions
│       ├── agent.actions.js           # 🤖 add-agent, ls-agents (+ cascade)
│       ├── mcp.actions.js             # 🔌 add-mcp, ls-mcp (+ mcp.json patch)
│       └── hook.actions.js            # 🪝 add-hook, ls-hooks (+ config.json)
├── schemas/
│   ├── skill.schema.json
│   ├── instruction.schema.json
│   ├── agent.schema.json
│   ├── mcp.schema.json
│   └── hook.schema.json
└── src/                               # THE REGISTRY
    ├── skills/
    │   ├── react-expert/skill.md      # 🧠
    │   └── typescript-expert/skill.md # 🧠
    ├── instructions/
    │   └── project-conventions/skill.md  # 📋
    ├── agents/
    │   └── fullstack-dev/skill.md        # 🤖
    ├── mcp/
    │   └── github-mcp/skill.md           # 🔌
    └── hooks/
        └── pre-commit/skill.md           # 🪝
```

---

## Self-Maintenance Header

Every installed file gets an AI-readable header:

```
<!--
  🧠 Skill managed by @medyll/ia-agents
  To update : pnpm dlx @medyll/ia-agents add-skill react-expert
  Source    : https://github.com/medyll/ia-agents
  Version   : 1.1.0
-->
```

---

## Programmatic API

```js
import { addAgentAction, addSkillAction } from '@medyll/ia-agents';

// Install an agent and all its dependencies
await addAgentAction('fullstack-dev', { cascade: true });

// Install a single skill silently
await addSkillAction('react-expert', { force: true, suggest: false });
```

---

## Development Workflow

```bash
# 1. Edit the source
nano src/_agents/fullstack-dev/SKILL.md

# 2. Bump version
node bin/cli.js bump _agents/fullstack-dev minor

# 3. Publish
pnpm publish

# 4. Consumers update
pnpm dlx @medyll/ia-agents update
```

---

## License  MIT
