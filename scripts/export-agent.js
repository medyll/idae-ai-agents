#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


 
const showHelp = () => {
    console.log(`\nUsage: node export-agent.js --name <agent-folder> [--agent <agents-folder>] [--destination <dest>]\n\nOptions:\n  --name <agent-folder>         Nom du dossier agent à exporter (obligatoire)\n  --agent <agents-folder>       Dossier de sortie des agents (défaut: idae-agents)\n  --destination <dest>          Destination directe (répertoire ou .md), saute la question interactive (défaut: .github/)\n  -h, --help                   Affiche cette aide\n\nSi aucune destination n'est précisée, la destination par défaut est .github/\n`);
};

if (process.argv.includes('-h') || process.argv.includes('--help')) {
    showHelp();
    process.exit(0);
}
 

let AGENTS_FOLDER = 'idae-agents';
let AGENT_NAME = null;
let DESTINATION = null;
const agentArg = process.argv.find((arg, i, arr) => arg === '--agent' && arr[i+1]);
if (agentArg) {
    AGENTS_FOLDER = process.argv[process.argv.indexOf('--agent') + 1];
}
const nameArg = process.argv.find((arg, i, arr) => arg === '--name' && arr[i+1]);
if (nameArg) {
    AGENT_NAME = process.argv[process.argv.indexOf('--name') + 1];
}
const destArg = process.argv.find((arg, i, arr) => arg === '--destination' && arr[i+1]);
if (destArg) {
    DESTINATION = process.argv[process.argv.indexOf('--destination') + 1];
}

if (!AGENT_NAME) {
    console.error('\x1b[31m[ERROR]\x1b[0m You must provide an agent name with --name <agent-folder>');
    process.exit(1);
}

console.log(`\x1b[33m[INFO]\x1b[0m Agents output folder: \x1b[1m${AGENTS_FOLDER}\x1b[0m (override with --agent <folder>)`);
console.log(`\x1b[33m[INFO]\x1b[0m Agent name: \x1b[1m${AGENT_NAME}\x1b[0m (required, use --name <agent-folder>)`);

const defaultDestinations = [
    '.github/',
    '.github/copilot-instructions.md'
];

const destinations = DESTINATION ? [DESTINATION] : defaultDestinations;

const runExport = (selected) => {
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
    } else {
        // Custom destination: treat as a directory, copy all src files there
        const destDir = path.isAbsolute(selected) ? selected : path.join(process.cwd(), selected);
        fs.mkdirSync(destDir, { recursive: true });
        fs.readdirSync(srcDir).forEach(file => {
            const srcFile = path.join(srcDir, file);
            const destFile = path.join(destDir, file);
            fs.copyFileSync(srcFile, destFile);
            console.log(`Copied: ${srcFile} -> ${destFile}`);
        });
        console.log(`Copy completed to custom destination: ${destDir}`);
    }
};

if (DESTINATION) {
    runExport(DESTINATION);
} else {
    // Question interactive avec .github/ par défaut (Y/n)
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question('\x1b[36mDestination par défaut : .github/\nUtiliser .github/? (Y/n): \x1b[0m', async (answer) => {
        let selected;
        if (answer.trim().toLowerCase() === 'n') {
            // Affiche les autres choix
            const otherDests = destinations.slice(1);
            if (otherDests.length === 0) {
                console.error('Aucune autre destination disponible.');
                process.exit(1);
            }
            console.log('\x1b[32mAutres destinations disponibles :\x1b[0m');
            otherDests.forEach((dest, idx) => {
                console.log(`${idx + 1}. ${dest}`);
            });
            rl.question('\x1b[36mEntrez le numéro de la destination : \x1b[0m', (num) => {
                const idx = parseInt(num, 10) - 1;
                if (idx >= 0 && idx < otherDests.length) {
                    selected = otherDests[idx];
                    console.log(`Selected destination: ${selected}`);
                    runExport(selected);
                } else {
                    console.error('Numéro invalide.');
                    process.exit(1);
                }
                rl.close();
            });
        } else {
            selected = destinations[0]; // .github/
            console.log(`Selected destination: ${selected}`);
            runExport(selected);
            rl.close();
        }
    });
}
