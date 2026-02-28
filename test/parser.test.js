import { describe, it, expect } from 'vitest'
import { resolveType, parseEntry, validateFrontmatter, buildOutput } from '../lib/parser.js'

describe('parser utilities', () => {
  it('resolveType maps folder to type', () => {
    expect(resolveType('skills/react-expert')).toBe('skill')
    expect(resolveType('instructions/project-conventions')).toBe('instruction')
    // unknown folder falls back to skill
    expect(resolveType('unknown/foo')).toBe('skill')
  })

  it('validateFrontmatter accepts valid skill and reports no errors', () => {
    const data = {
      name: 'react-expert',
      description: 'A helpful React skill with clear guidance and examples.',
      version: '1.2.3',
    }
    const errors = validateFrontmatter(data, 'skill')
    expect(errors).toHaveLength(0)
  })

  it('validateFrontmatter reports errors for instruction missing scope', () => {
    const data = { name: 'ins', description: 'x'.repeat(30), version: '1.0.0' }
    const errors = validateFrontmatter(data, 'instruction')
    expect(errors).toContain('Missing required field: scope')
  })

  it('validateFrontmatter reports agent role length requirement', () => {
    const data = { name: 'a', description: 'x'.repeat(30), version: '1.0.0', role: 'short' }
    const errors = validateFrontmatter(data, 'agent')
    expect(errors.some((e) => e.includes('role'))).toBeTruthy()
  })

  it('parseEntry parses frontmatter and content', () => {
    const content = `---\nname: react-expert\ndescription: "A helpful React skill with clear guidance and examples."\nversion: "1.0.0"\n---\nThis is the body of the skill.`
    const parsed = parseEntry(content, 'skill.md')
    expect(parsed.data.name).toBe('react-expert')
    expect(parsed.content.trim()).toBe('This is the body of the skill.')
  })

  it('parseEntry throws on invalid frontmatter', () => {
    const bad = `---\nname: short\ndescription: "too short"\n---\nbody`
    expect(() => parseEntry(bad, 'bad.md')).toThrow()
  })

  it('buildOutput creates header and includes provided body', () => {
    const data = { type: 'skill', name: 'react-expert', version: '1.0.0' }
    const out = buildOutput(data, 'Hello world', 'https://repo')
    expect(out).toContain('🧠 Skill')
    expect(out).toContain('Hello world')
    expect(out).toContain('react-expert')
  })
})
