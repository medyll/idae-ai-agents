#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Forward all arguments to the build_agent.js script
const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'build_agent.js');
let args = process.argv.slice(2);

// Check if --name is already present
const hasNameArg = args.some((arg, i) => arg === '--name' && args[i+1]);
if (!hasNameArg) {
	// Read package.json to get the default name
	const pkg = JSON.parse(
		require('fs').readFileSync(path.join(__dirname, 'package.json'), 'utf8')
	);
	let agentName = pkg.name;
	if (agentName.startsWith('@')) {
		agentName = agentName.split('/')[1];
	}
	args = ['--name', agentName, ...args];
}

const child = spawn('node', [scriptPath, ...args], { stdio: 'inherit' });
child.on('exit', code => process.exit(code));
