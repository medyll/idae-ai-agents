import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { getRegistryEntries, getRegistrySkillIds, readRegistryEntry, writeRegistryEntry, writeDestEntry, readDestEntry, removeDestEntry, getInstalledEntries, REGISTRY_DIR } from '../lib/utils/fs.js'

const SRC = REGISTRY_DIR
const DEST = '.tmp_dest'

function setupSample() {
  // ensure registry dir exists
  mkdirSync(SRC, { recursive: true })
  // skills/foo/skill.md
  mkdirSync(join(SRC, 'skills', 'foo'), { recursive: true })
  writeFileSync(join(SRC, 'skills', 'foo', 'skill.md'), `---\nname: foo\ndescription: "A sample foo skill with sufficient length."\nversion: "1.0.0"\n---\nBody`)

  // instructions/bar/skill.md
  mkdirSync(join(SRC, 'instructions', 'bar'), { recursive: true })
  writeFileSync(join(SRC, 'instructions', 'bar', 'skill.md'), `---\nname: bar\ndescription: "An instruction example that is long enough."\nversion: "1.0.0"\nscope: global\n---\nBody`) 
}

function cleanupSample() {
  // remove only test-created subfolders to avoid deleting repo src root
  const skillsDir = join(SRC, 'skills')
  const instrDir  = join(SRC, 'instructions')
  if (existsSync(skillsDir)) rmSync(skillsDir, { recursive: true, force: true })
  if (existsSync(instrDir))  rmSync(instrDir, { recursive: true, force: true })
  if (existsSync(join(process.cwd(), DEST))) rmSync(join(process.cwd(), DEST), { recursive: true, force: true })
}

describe('utils/fs registry operations', () => {
  beforeEach(() => { cleanupSample(); setupSample(); })
  afterEach(() => { cleanupSample(); })

  it('getRegistryEntries finds created entries', () => {
    const entries = getRegistryEntries()
    expect(entries.some(e => e.id === 'skills/foo')).toBeTruthy()
    expect(entries.some(e => e.id === 'instructions/bar')).toBeTruthy()
  })

  it('getRegistrySkillIds returns only skills', () => {
    const ids = getRegistrySkillIds()
    expect(ids).toContain('skills/foo')
    expect(ids).not.toContain('instructions/bar')
  })

  it('readRegistryEntry works with qualified and bare ids', () => {
    const q = readRegistryEntry('skills/foo')
    expect(q.path).toContain('skills\\foo\\skill.md')
    const b = readRegistryEntry('bar')
    expect(b.path).toContain('bar\\skill.md')
  })

  it('writeRegistryEntry updates file content', () => {
    writeRegistryEntry('skills/foo', 'UPDATED')
    const r = readRegistryEntry('skills/foo')
    expect(r.content).toContain('UPDATED')
  })

  it('writeDestEntry and readDestEntry manage destination files', () => {
    const outPath = writeDestEntry('skills/foo', '# dest', DEST)
    const read = readDestEntry('skills/foo', DEST)
    expect(read.content).toContain('# dest')
    expect(getInstalledEntries(DEST)).toContain('foo')
    expect(removeDestEntry('skills/foo', DEST)).toBeTruthy()
  })
})
