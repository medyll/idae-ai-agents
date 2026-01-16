// scripts/lib/default-content.js
// Shared default content for IDAE monorepo package scaffolding

const REPO = 'idae-ai-agents';
const AUTHOR_NAME = 'Lebrun Meddy';
const SCOPE = '@medyll';

export const DEFAULT_CONTENT = {
  'README.md': (pkg) => `# ${pkg}\n\nThis package ${pkg} is part of the ${REPO} monorepo.\n`,
  'index.js': (pkg) => `// ESM Entrypoint for package ${pkg}\n\nexport default {};\n`,
  'package.json': (pkg) => JSON.stringify({
    name: `${SCOPE}/${pkg}`,
    version: '0.0.1',
    main: 'index.js',
    type: 'module',
    license: 'ISC',
    author: AUTHOR_NAME,
    scope: SCOPE,
    description: '',
    files: [
      'index.js',
      'package.json',
      'README.md'
    ],
    scripts: {
      test: 'echo "Error: no test specified" && exit 1',
      release: 'npx commit-and-tag-version',
      publish: 'npm publish --access public'
    },
  }, null, 2) + '\n',
  'CHANGELOG.md': (pkg) => `# Changelog for ${pkg}\n\n- Initial release\n`,
  'pnpm-lock.yaml': () => '',
};
