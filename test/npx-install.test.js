import { describe, it, expect } from 'vitest';
import path from 'path';
import { spawnSync } from 'child_process';
import fs from 'fs';

describe('export-agent.js CLI', () => {
  it('doit installer agent', () => {
    const scriptPath = path.resolve('scripts/export-agent.js');
    const destFolder = path.resolve('custom-dest-folder');
    // Nettoyage avant test
    if (fs.existsSync(destFolder)) {
      fs.rmSync(destFolder, { recursive: true, force: true });
    }
    const result = spawnSync('node', [scriptPath, '--name', 'idae-agent-full', '--destination', 'custom-dest-folder'], {
      encoding: 'utf-8',
      input: '2\n',  
      stdio: ['pipe', 'pipe', 'pipe']
    }); 
    expect(result.stdout).toMatch(/custom-dest-folder/);
    expect(fs.existsSync(destFolder)).toBe(true);
    // Optionnel : nettoyage après test
    // fs.rmSync(destFolder, { recursive: true, force: true });
  });
});
