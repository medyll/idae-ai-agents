import { describe, it, expect } from 'vitest';
import path from 'path';
import { spawnSync } from 'child_process';


describe('idae-agent-full package', () => {
  it('doit être exécutable via le script local', () => {
    const scriptPath = path.resolve('packages/idae-agent-full/index.js');
    const result = spawnSync('node', [scriptPath, '--help'], {
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Agents output folder|Agent name/i);
  });
});
describe('build_agent.js CLI', () => {
  it('doit installer agent', () => {
    const scriptPath = path.resolve('scripts/build_agent.js');
    const result = spawnSync('node', [scriptPath, '--name', 'idae-agent-full', '--AGENTS_DEST', 'custom-dest-folder'], {
      encoding: 'utf-8',
      input: '2\n', // Sélectionne la 2e destination (custom-dest-folder)
      stdio: ['pipe', 'pipe', 'pipe']
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/custom-dest-folder/);
  });
});
