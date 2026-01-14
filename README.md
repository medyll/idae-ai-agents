# idae-ai-agents Monorepo

This monorepo contains installable, documented AI agent packages with full GitHub integration and automated CI/CD.

## Overview

- **Modular AI agents**: Each agent is published as an npm package under `packages/`.
- **GitHub integration**: Automated workflows for issues, pull requests, CI/CD, and documentation updates.
- **Documentation-driven**: All major actions and features are documented in markdown files.
- **Automated CI/CD**: Publishing and deployment are managed via GitHub Actions.

## Getting Started

### Install dependencies

```sh
pnpm install
```

### Create a new package

To generate a new package in the monorepo (with full structure and `src/` folder):

```sh
pnpm create-package <package-name>
# or
npm run create-package -- <package-name>
```

This will automatically create the folder in `packages/` with all required files.


## Monorepo Structure

- `packages/idae-agent-builder/`: Main agent package (`@medyll/idae-agent-builder`)
- `packages/idae-agent-full/`: Full agent implementation
- `packages/idae-agent-svelte/`: Svelte-based agent implementation
- `scripts/`: Utility scripts (e.g., agent generation)
- `.github/`: GitHub integration files (workflows, instructions, etc.)

## Conventions

- All major actions must be documented in markdown files
- No implementation is allowed without a test plan

## More Information

- See `packages/idae-agent-full/src/idae-agent-full.md` for agent logic
- See `scripts/build_agent.js` for agent file generation
- See `.github/workflows/publish.yml` for the CI/CD pipeline

---

For questions or contributions, please open an issue or pull request.
