import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { addAgentAction, listAgentsAction } from '../lib/actions/agent.actions.js'
import { REGISTRY_DIR } from '../lib/utils/fs.js'

const SRC = REGISTRY_DIR

function setupAgent(agentName, body) {
  const p = join(SRC, 'agents', agentName)
  mkdirSync(p, { recursive: true })
  writeFileSync(join(p, 'skill.md'), body)
}

function cleanup() {
  if (existsSync(SRC)) rmSync(SRC, { recursive: true, force: true })
}

describe('agent.actions', () => {
  beforeEach(() => { cleanup(); })
  afterEach(() => { cleanup(); vi.restoreAllMocks(); })

  it('addAgentAction dry-run for agent with no deps', async () => {
    const body = `---\nname: test-agent\ndescription: "Agent for tests with a sufficiently long description for validation."\nversion: "1.0.0"\ntype: agent\nrole: "A test agent role that is long enough."\n---\nAgent body`
    setupAgent('test-agent', body)

    // Should not throw and should return (dry-run)
    await expect(addAgentAction('test-agent', { dryRun: true })).resolves.toBeUndefined()
  })

  it('addAgentAction exits when dependencies missing', async () => {
    const body = `---\nname: bad-agent\ndescription: "Agent with missing deps."\nversion: "1.0.0"\ntype: agent\nrole: "A test agent role that is long enough."\nskills: [missing-skill]\n---\nAgent body`
    setupAgent('bad-agent', body)

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => { throw new Error('process.exit:' + code) })
    await expect(addAgentAction('bad-agent', { dryRun: true })).rejects.toThrow('process.exit:1')
    expect(exitSpy).toHaveBeenCalled()
  })

  it('listAgentsAction JSON output', async () => {
    const body = `---\nname: test-agent\ndescription: "Agent for tests with a sufficiently long description for validation."\nversion: "1.0.0"\ntype: agent\nrole: "A test agent role that is long enough."\n---\nAgent body`
    setupAgent('test-agent', body)

    const logSpy = vi.spyOn(console, 'log')
    await listAgentsAction({ json: true })
    expect(logSpy).toHaveBeenCalled()
  })
})
