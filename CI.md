# CI/CD Pipeline for idae-ai-agents Monorepo

This document details the Continuous Integration and Continuous Deployment (CI/CD) process for the `idae-ai-agents` monorepo. The pipeline is designed for reliability, code quality, and automated package publishing across all agent packages.

## Workflow Overview

The main CI workflow is defined in `.github/workflows/publish.yml` and is triggered on every push to the `main` branch. It ensures that all packages are validated, tested, and published in a consistent and automated manner.

### Key Steps

1. **Checkout Repository**
   - Uses `actions/checkout` to fetch the latest code from the repository.

2. **Install pnpm**
   - Uses `pnpm/action-setup` to install the required version of pnpm (10.28.0).

3. **Set up Node.js**
   - Uses `actions/setup-node` to install Node.js v20 and enable pnpm caching for faster builds.

4. **Install Dependencies**
   - Runs `pnpm install` at the root, installing all dependencies for every package in the monorepo.

5. **Monorepo Integrity Check**
   - Runs `node scripts/check-monorepo.js` to ensure every package contains required files (`package.json`, `index.js`, `README.md`, etc.) and a valid `files` field in `package.json`.
   - The build fails if any package is non-compliant.

6. **Linting and Commit Message Validation**
   - `commitlint` is configured (with Husky) to enforce Conventional Commits on every commit via a `commit-msg` hook.
   - This ensures that all commit messages are compatible with semantic-release and changelog generation.

7. **Release & Publish**
   - Runs `npx multi-semantic-release` to:
     - Analyze commits for each package using semantic-release and the `.releaserc.json` config.
     - Generate and update rich `CHANGELOG.md` files for each package.
     - Bump versions and create git tags.
     - Publish updated packages to npm (if changes are detected).
     - Push changelogs and version bumps back to the repository.


## Tooling & Configuration

- **multi-semantic-release**: Handles multi-package semantic versioning and changelog generation.
- **semantic-release**: Automates versioning, changelog, and npm publishing based on commit history.
- **commitlint**: Enforces Conventional Commits for all commit messages.
- **husky**: Manages git hooks, especially for commit message validation.
- **check-monorepo.js**: Custom script to enforce package structure and metadata integrity. This script also checks for required CI/monorepo dependencies and will automatically install any missing ones using `pnpm install` and `pnpm install --workspace-root` if needed.
- **pnpm**: Fast, disk-efficient package manager for monorepos.

### Required CI/Monorepo Dependencies

The following dependencies are required at the root for CI and monorepo operations (auto-checked/installed by `check-monorepo.js`):

```
@changesets/cli
@semantic-release/commit-analyzer
@semantic-release/git
@semantic-release/github
@semantic-release/npm
@semantic-release/release-notes-generator
@semantic-release/changelog
multi-semantic-release
semantic-release
husky
conventional-changelog-conventionalcommits
@semantic-release/exec
```

## Custom Scripts

- `scripts/check-monorepo.js`: Valide que tous les packages ont les fichiers requis et un champ `files` correct dans `package.json`. Avec l'option `--fix`, il :
   - auto-corrige les packages non conformes
   - met à jour dynamiquement `.releaserc.json` pour générer un bloc `@semantic-release/changelog` pour chaque package contenant un `CHANGELOG.md` (multi-changelog natif pour le monorepo)
- `scripts/create-package.js`: Scaffolds new packages with all required files and metadata.
- `scripts/update-readme-version.js`: Updates README files with the latest version after release (triggered by semantic-release exec plugin).

## Release Configuration

- `.releaserc.json` définit les plugins semantic-release, le mapping des types de commit, et le format des changelogs.
- Les blocs `@semantic-release/changelog` sont générés automatiquement pour chaque package via `check-monorepo.js --fix`.
- Seuls les commits sur la branche `main` déclenchent une release.
- Un changelog est généré et mis à jour pour chaque package concerné, puis poussé dans le repo.
- Seuls les packages modifiés sont publiés sur npm.

## Best Practices

- Always use Conventional Commits (enforced by commitlint/husky).
- Never push directly to `main` without PR review and passing CI.
- Use `pnpm create-package <name>` to add new packages, ensuring compliance.
- Run `node scripts/check-monorepo.js` before publishing to catch issues early.

## Troubleshooting

- If a package fails the integrity check, run `node scripts/check-monorepo.js --fix` to auto-correct.
- If commit messages are rejected, reword them to follow the Conventional Commits standard.
- For changelog or versioning issues, ensure all commits are properly formatted and that semantic-release is up to date.

---
For further details, see the workflow file at `.github/workflows/publish.yml` and the root `.releaserc.json`.
