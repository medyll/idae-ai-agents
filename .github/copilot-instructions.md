# Copilot Instructions for idae-ai-agents

## Project Overview
- **Monorepo** for multi-role AI agents (PM, Architect, Dev, Tester, Doc) with full GitHub integration.
- Main agent package: `packages/idae-agent-full` (see `src/idae-agent-full.md` for system/role logic).
- Agents are executable via `npx` or CLI, forwarding commands to `scripts/make_agents.js`.

## Key Architectural Patterns
- **Dynamic Role System**: Agents switch between roles (`[[PM]]`, `[[ARCHITECT]]`, `[[DEV]]`, `[[TESTER]]`, `[[DOC]]`) per request context. Each response starts with the current role in brackets.
- **Self-Diagnostics**: On startup, agents check for `.github/copilot-instructions.md`, `backlog.md`, and `/docs/sprints/`. If missing, prompt user to initialize.
- **Workflow Context Awareness**: Tasks are mapped to GitHub Issues/Sprints. If a task is not linked, prompt user to create an issue or add to sprint.
- **Documentation-Driven**: Major actions and features must be documented in `.md` files. Trigger README updates if features impact documentation.

## Developer Workflows
- **Build/Release**: Use `pnpm install` for dependencies. Release with `pnpm -r exec npx commit-and-tag-version`. Publish with `pnpm -r publish --access public`.
- **Agent Generation**: Run `npx idae-agent-full` or `node packages/idae-agent-full/index.js` to invoke agent logic. This calls `scripts/make_agents.js` to copy or concatenate agent files into `.github/` or `.github/copilot-instructions.md`.
- **Versioning**: Per-package versioning via `.versionrc` and `commit-and-tag-version`.
- **CI/CD**: See `.github/workflows/publish.yml` for automated publish on push to `main`.

## Project-Specific Conventions
- **All agent responses must address the user as "Mydde" and use "tu" (informal French).**
- **No implementation without a test plan** (enforced by `[[TESTER]]` role).
- **Every major action must be documented** in a dedicated `.md` file.
- **Use `web` for documentation search and `searchSyntax` for deep code analysis.**
- **GitHub Integration**: Use `activePullRequest` and `openPullRequest` for PR lifecycle. Use `edit`/`read` for documentation management.
- **Agent output destinations**: `.github/AGENTS_FOLDER/` for agent files, `.github/copilot-instructions.md` for concatenated instructions.

## Integration Points
- **External**: Publishes to npm, integrates with GitHub Actions for CI/CD.
- **Internal**: Agents communicate via file system and markdown documentation. All code/data flows are traceable via `.md` logs.

## Examples
- To add a new agent: create a new folder in `packages/`, add a `src/` with `.md` instructions, and update `make_agents.js` logic if needed.
- To update instructions: edit `src/idae-agent-full.md` and re-run agent generation to update `.github/copilot-instructions.md`.

---
For more, see `packages/idae-agent-full/src/idae-agent-full.md`, `scripts/make_agents.js`, and `.github/workflows/publish.yml`.
