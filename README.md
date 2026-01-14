
# idae-ai-agents Monorepo

This monorepo hosts installable AI agent packages, distributed via npm and runnable with `npx`.

## Overview

- **Installable via npx**: All packages are designed for quick use with `npx`.
- **GitHub integration**: Automated workflows for issues, PRs, CI/CD, and documentation.
- **Centralized documentation**: Major actions are documented in markdown files.
- **Automated CI/CD**: Publishing and deployment via GitHub Actions.

## Getting Started

### Install dependencies
```sh
pnpm install
```


### Generate or update agents
```sh
npx @medyll/idae-agent-full
```

### Run an agent
```sh
npx @medyll/idae-agent-full
```

## Monorepo Structure
- `packages/idae-agent-full/` : Main agent package (`@medyll/idae-agent-full`)
- `scripts/` : Utility scripts (e.g., agent generation)
- `.github/` : GitHub integration files (workflows, instructions, etc.)

## Publishing
- **Release** :
  ```sh
  pnpm -r exec npx commit-and-tag-version
  ```
- **Publish** :
  ```sh
  pnpm -r publish --access public
  ```

## Conventions
- All major actions must be documented
- No implementation without a test plan

## More info
- See `packages/idae-agent-full/src/idae-agent-full.md` for agent logic
- See `scripts/make_agents.js` for agent file generation
- See `.github/workflows/publish.yml` for the CI/CD pipeline

---

For questions or contributions, open an issue or PR!
