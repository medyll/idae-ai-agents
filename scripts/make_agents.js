#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



// Get --agent and --name options from CLI args
let AGENTS_FOLDER = 'idae-agents';
let AGENT_NAME = null;
const agentArg = process.argv.find((arg, i, arr) => arg === '--agent' && arr[i+1]);
if (agentArg) {
    AGENTS_FOLDER = process.argv[process.argv.indexOf('--agent') + 1];
}
const nameArg = process.argv.find((arg, i, arr) => arg === '--name' && arr[i+1]);
if (nameArg) {
    AGENT_NAME = process.argv[process.argv.indexOf('--name') + 1];
}

if (!AGENT_NAME) {
    console.error('\x1b[31m[ERROR]\x1b[0m You must provide an agent name with --name <agent-folder>');
    process.exit(1);
}

console.log(`\x1b[33m[INFO]\x1b[0m Agents output folder: \x1b[1m${AGENTS_FOLDER}\x1b[0m (override with --agent <folder>)`);
console.log(`\x1b[33m[INFO]\x1b[0m Agent name: \x1b[1m${AGENT_NAME}\x1b[0m (required, use --name <agent-folder>)`);

const destinations = [
    '.github/',
    '.github/copilot-instructions.md'
];

console.log('\x1b[32mSelect the destination for agent-generated content:\x1b[0m');
destinations.forEach((dest, idx) => {
    console.log(`${idx + 1}. ${dest}`);
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('\x1b[36mEnter the destination number: \x1b[0m', async (answer) => {
    const idx = parseInt(answer, 10) - 1;
    if (idx >= 0 && idx < destinations.length) {
        const selected = destinations[idx];
        console.log(`Selected destination: ${selected}`);

        // Use agentName as folder under packages
        const agentName = AGENT_NAME;
        const srcDir = path.join(__dirname, '../packages', agentName, 'src');
        if (selected === '.github/') {
            // Always create .github/AGENTS_FOLDER as the main output location for agents
            const destDir = path.join(process.cwd(), '.github', AGENTS_FOLDER, agentName);
            fs.mkdirSync(destDir, { recursive: true });
            // Copy all files from src to the destination directory
            fs.readdirSync(srcDir).forEach(file => {
                const srcFile = path.join(srcDir, file);
                const destFile = path.join(destDir, file);
                fs.copyFileSync(srcFile, destFile);
                console.log(`Copied: ${srcFile} -> ${destFile}`);
            });
            console.log('Copy completed.');
        } else if (selected === '.github/copilot-instructions.md') {
            // Concatenate all src files into .github/copilot-instructions.md
            const instructionsPath = path.join(process.cwd(), '.github', 'copilot-instructions.md');
            let combined = '';
            fs.readdirSync(srcDir).forEach(file => {
                const srcFile = path.join(srcDir, file);
                const content = fs.readFileSync(srcFile, 'utf8');
                combined += `\n\n---\n# ${agentName}: ${file}\n---\n\n`;
                combined += content;
            });
            fs.appendFileSync(instructionsPath, combined);
            console.log(`Appended agent files to ${instructionsPath}`);
        }
    } else {
        console.error('Invalid number.');
        process.exit(1);
    }
    rl.close();
});
