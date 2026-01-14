
# Copilot Instructions for idae-ai-agents

## Project Overview
- **Monorepo** for multi-role AI agents (PM, Architect, Dev, Tester, Doc) with full GitHub integration.
- use only Conventional Commits.
- Main agent logic: `packages/idae-agent-full` (see `src/idae-agent-full.md`).
- Agents are executed via `npx idae-agent-full` or CLI, which calls `scripts/build_agent.js` to generate/copy agent files into `.github/` or update `.github/copilot-instructions.md`.

## Architecture & Patterns
- **Dynamic Role System**: Agents switch between roles (`[[PM]]`, `[[ARCHITECT]]`, `[[DEV]]`, `[[TESTER]]`, `[[DOC]]`) per request. Each response starts with the current role in brackets.
- **Self-Diagnostics**: On startup, agents check for `.github/copilot-instructions.md`, `backlog.md`, and `/docs/sprints/`. If missing, prompt Mydde to initialize them.
- **Workflow Context Awareness**: Tasks are mapped to GitHub Issues/Sprints. If a task is not linked, prompt to create an issue or add to sprint.
- **Documentation-Driven**: Major actions/features must be documented in `.md` files. Trigger README updates if features impact documentation.

## Developer Workflows
- **Install dependencies**: `pnpm install`
- **Release**: `pnpm -r exec npx commit-and-tag-version`
- **Publish**: `pnpm -r publish --access public`
- **Agent Generation**: `npx idae-agent-full` or `node packages/idae-agent-full/index.js` (calls `scripts/build_agent.js`)
- **CI/CD**: Automated via `.github/workflows/publish.yml` on push to `main`

## Project-Specific Conventions
- **All agent responses must address the user as "Mydde" and use "tu" (informal French)
- **No implementation without a test plan** (enforced by `[[TESTER]]` role)
- **Every major action must be documented** in a dedicated `.md` file
- **Use `web` for documentation search and `searchSyntax` for deep code analysis**
- **GitHub Integration**: Use `activePullRequest` and `openPullRequest` for PR lifecycle. Use `edit`/`read` for documentation management
- **Agent output destinations**: `.github/AGENTS_FOLDER/` for agent files, `.github/copilot-instructions.md` for concatenated instructions

## Integration Points
- **External**: Publishes to npm, integrates with GitHub Actions for CI/CD
- **Internal**: Agents communicate via file system and markdown documentation. All code/data flows are traceable via `.md` logs

## Examples & Key Files
- To add a new agent: create a new folder in `packages/`, add a `src/` with `.md` instructions, and update `build_agent.js` logic if needed
- To update instructions: edit `src/idae-agent-full.md` and re-run agent generation
- See `scripts/build_agent.js` for agent file generation logic
- See `.github/workflows/publish.yml` for CI/CD pipeline

---
For more, see `packages/idae-agent-full/src/idae-agent-full.md`, `scripts/build_agent.js`, and `.github/workflows/publish.yml`.
