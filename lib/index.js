/**
 * @medyll/ia-agents — Public API
 *
 * Use this when integrating ia-agents programmatically:
 *
 * import { addSkillAction, addAgentAction } from '@medyll/ia-agents';
 */

// Generic
export { listEntries, addEntry, removeEntry, updateEntries, bumpEntry } from './actions.js';

// Typed
export { addSkillAction, listSkillsAction }             from './actions/skill.actions.js';
export { addInstructionAction, listInstructionsAction }  from './actions/instruction.actions.js';
export { addAgentAction, listAgentsAction }              from './actions/agent.actions.js';
export { addMcpAction, listMcpAction }                   from './actions/mcp.actions.js';
export { addHookAction, listHooksAction }                from './actions/hook.actions.js';

// Utilities
export { parseEntry, validateFrontmatter, buildOutput }  from './parser.js';
export { getRegistryEntries, DEST_DIRS, FOLDER_PREFIX_MAP } from './utils/fs.js';
