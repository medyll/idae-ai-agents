
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

describe('npx idae-agent-full', () => {
  it('should run and create/copier les fichiers attendus', () => {
    // Préparer un dossier temporaire pour tester l'installation
    const tmpDir = fs.mkdtempSync(path.join(__dirname, 'tmp-'));
    const result = spawnSync('npx', [
      'idae-agent-full',
      '--name', 'test-agent',
      '--output', tmpDir
    ], {
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    expect(result.status).toBe(0);
    // Vérifier qu'un fichier attendu est bien créé (ex: copilot-instructions.md)
    const expectedFile = path.join(tmpDir, '.github', 'copilot-instructions.md');
    expect(fs.existsSync(expectedFile)).toBe(true);
    // Nettoyage
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
