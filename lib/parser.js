import matter from 'gray-matter';
import semver from 'semver';

/**
 * Maps src/ subdirectory names to their entry type.
 * New flat structure: src/<type-folder>/<name>/skill.md
 */
export const FOLDER_TYPE_MAP = {
  'skills':       'skill',
  'instructions': 'instruction',
  'agents':       'agent',
  'mcp':          'mcp',
  'hooks':        'hook',
};

/** Filename used inside each entry folder */
export const ENTRY_FILENAME = 'skill.md';

/**
 * Resolve the type of a registry entry from its full id.
 * id format: "<type-folder>/<name>"  e.g. "skills/react-expert"
 */
export function resolveType(id) {
  const typeFolder = id.split('/')[0];
  return FOLDER_TYPE_MAP[typeFolder] ?? 'skill';
}

/**
 * Parse any registry skill.md file.
 * Validates frontmatter against the detected type.
 */
export function parseEntry(content, filePath = 'skill.md') {
  let parsed;
  try {
    parsed = matter(content);
  } catch (err) {
    throw new Error(`[${filePath}] Failed to parse frontmatter: ${err.message}`);
  }

  // Type can come from frontmatter OR be inferred from folder
  const type = parsed.data.type ?? 'skill';
  const errors = validateFrontmatter(parsed.data, type, filePath);
  if (errors.length > 0) {
    throw new Error(`[${filePath}] Validation errors:\n  - ${errors.join('\n  - ')}`);
  }

  return { data: { type, ...parsed.data }, content: parsed.content };
}

export const parseSkill = parseEntry;

function validateCommon(data) {
  const errors = [];
  if (!data.name) errors.push('Missing required field: name');
  else if (!/^[a-z][a-z0-9-]*$/.test(data.name))
    errors.push(`"name" must be kebab-case, got: "${data.name}"`);
  if (!data.description) errors.push('Missing required field: description');
  else if (data.description.length < 20)
    errors.push('"description" must be at least 20 characters');
  if (!data.version) errors.push('Missing required field: version');
  else if (!semver.valid(data.version))
    errors.push(`"version" must be valid semver, got: "${data.version}"`);
  return errors;
}

export function validateFrontmatter(data, type, filePath = '') {
  const errors = validateCommon(data);

  switch (type) {
    case 'skill':
      break;
    case 'instruction':
      if (!data.scope) errors.push('Missing required field: scope');
      else if (!['global', 'workspace', 'file-type'].includes(data.scope))
        errors.push('"scope" must be global | workspace | file-type');
      if (data.scope === 'file-type' && (!data['applies-to'] || !data['applies-to'].length))
        errors.push('"applies-to" is required when scope is "file-type"');
      break;
    case 'agent':
      if (!data.role) errors.push('Missing required field: role');
      else if (data.role.length < 10) errors.push('"role" must be at least 10 characters');
      break;
    case 'mcp':
      if (!data.transport) errors.push('Missing required field: transport');
      else if (!['stdio', 'http', 'sse'].includes(data.transport))
        errors.push('"transport" must be stdio | http | sse');
      if (data.transport === 'stdio' && !data.command)
        errors.push('"command" is required for stdio transport');
      if (['http', 'sse'].includes(data.transport) && !data.url)
        errors.push('"url" is required for http/sse transport');
      break;
    case 'hook':
      if (!data.event) errors.push('Missing required field: event');
      if (!data.run) errors.push('Missing required field: run');
      break;
    default:
      errors.push(`Unknown type: "${type}". Must be skill | instruction | agent | mcp | hook`);
  }

  return errors;
}

const TYPE_LABELS = {
  skill:       '🧠 Skill',
  instruction: '📋 Custom Instruction',
  agent:       '🤖 Agent',
  mcp:         '🔌 MCP Server',
  hook:        '🪝 Hook',
};

export function buildOutput(data, body, registryRepoUrl) {
  const label = TYPE_LABELS[data.type ?? 'skill'] ?? '📦 AI Config';
  const header = [
    `<!--`,
    `  ${label} managed by @medyll/ia-agents`,
    `  To update : pnpm dlx @medyll/ia-agents add-${data.type ?? 'skill'} ${data.name}`,
    `  Source    : ${registryRepoUrl}`,
    `  Version   : ${data.version}`,
    `-->`,
  ].join('\n');
  return `${header}\n\n${matter.stringify(body, data)}`;
}

export const buildSkillOutput = buildOutput;
