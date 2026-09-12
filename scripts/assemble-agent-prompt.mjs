#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'prompts');
const manifest = JSON.parse(await readFile(resolve(root, 'manifest.json'), 'utf8'));
const agent = process.argv[2]?.toLowerCase();
if (!agent || !manifest.agents[agent]) {
  console.error(`usage: node scripts/assemble-agent-prompt.mjs <${Object.keys(manifest.agents).join('|')}>`);
  process.exit(2);
}
const files = [manifest.constitution, ...manifest.agents[agent]];
const parts = await Promise.all(files.map((file) => readFile(resolve(root, file), 'utf8')));
process.stdout.write(parts.map((part) => part.trim()).join('\n\n---\n\n') + '\n');
