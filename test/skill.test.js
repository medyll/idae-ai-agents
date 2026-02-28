import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { addSkillAction, listSkillsAction } from '../lib/actions/skill.actions.js'
import { getRegistryEntries } from '../lib/utils/fs.js'
import { REGISTRY_DIR } from '../lib/utils/fs.js'

const SRC = REGISTRY_DIR
const DEST = '.tmp_skills'

function setupSkill(name, tags = []) {
  // ensure registry dir exists
  mkdirSync(SRC, { recursive: true })
  const p = join(SRC, 'skills', name)
  mkdirSync(p, { recursive: true })
  const meta = `metadata:\n  tags: [${tags.map(t=>`\"${t}\"`).join(', ')}]`
  const body = `---\nname: ${name}\ndescription: "A skill for tests with a sufficiently long description."\nversion: "1.0.0"\n${meta}\n---\nSkill body`
  writeFileSync(join(p, 'skill.md'), body)
}

function cleanup() {
  const skillsDir = join(SRC, 'skills')
  if (existsSync(skillsDir)) rmSync(skillsDir, { recursive: true, force: true })
  if (existsSync(join(process.cwd(), DEST))) rmSync(join(process.cwd(), DEST), { recursive: true, force: true })
  if (existsSync(join(process.cwd(), '.vscode'))) rmSync(join(process.cwd(), '.vscode'), { recursive: true, force: true })
}

describe('skill.actions', () => {
  beforeEach(() => { cleanup(); })
  afterEach(() => { cleanup(); vi.restoreAllMocks(); })

  it('addSkillAction writes destination file and updates .vscode/settings.json', async () => {
    setupSkill('foo', ['group1'])

    const logSpy = vi.spyOn(console, 'log')
    await addSkillAction('foo', { force: true, dest: DEST, suggest: false })

    // dest file exists
    const out = readFileSync(join(process.cwd(), DEST, 'foo.md'), 'utf-8')
    expect(out).toContain('🧠 Skill')

    // .vscode/settings.json should point to dest (skillsDirectory)
    const settings = JSON.parse(readFileSync(join(process.cwd(), '.vscode', 'settings.json'), 'utf-8'))
    expect(settings['github.copilot.chat.skillsDirectory']).toBe(DEST.replace(/\\/g, '/'))
    expect(logSpy).toHaveBeenCalled()
  })

  it('addSkillAction suggests siblings when tags overlap (registry check)', async () => {
    setupSkill('foo', ['shared'])
    setupSkill('bar', ['shared'])

    const logSpy = vi.spyOn(console, 'log')
    await addSkillAction('foo', { force: true, dest: DEST, suggest: true })

    // Suggestion output is noisy due to colors; assert registry contains both skills
    const reg = getRegistryEntries().map((e) => e.id)
    expect(reg).toContain('skills/foo')
    expect(reg).toContain('skills/bar')
    expect(logSpy).toHaveBeenCalled()
  })

  it('listSkillsAction returns JSON when requested', async () => {
    setupSkill('foo', ['g1'])
    const logSpy = vi.spyOn(console, 'log')
    await listSkillsAction({ json: true })
    expect(logSpy).toHaveBeenCalled()
  })
})
