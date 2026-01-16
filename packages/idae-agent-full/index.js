#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import { cwd } from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// cwd is the package directory
cwd();
// Forward all arguments to the build_agent.js script
const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'build_agent.js');
let args = process.argv.slice(2);

// Check if --name is already present
const hasNameArg = args.some((arg, i) => arg === '--name' && args[i+1]);
async function main() {
	if (!hasNameArg) {
		// Read package.json to get the default name
		const fs = await import('fs/promises');
		const pkgRaw = await fs.readFile(path.join(__dirname, 'package.json'), 'utf8');
		const pkg = JSON.parse(pkgRaw);
		let agentName = pkg.name;
		if (agentName.startsWith('@')) {
			agentName = agentName.split('/')[1];
		}
		args = ['--name', agentName, ...args];
	}

	const child = spawn('node', [scriptPath, ...args], { stdio: 'inherit' });
	child.on('exit', code => process.exit(code));
}

main();

