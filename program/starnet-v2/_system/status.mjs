#!/usr/bin/env node
// StarNet v2 status: the same evidence rule as v1 (done = proof + verified_by differs from built_by), run over this program's stages.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { programStatus } from '../../starnet-v1/_system/status.mjs';

const rows = programStatus(path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
for (const r of rows) console.log(`${r.stage.padEnd(22)} ${r.status.padEnd(8)} ${r.note || ''}`);
console.log(`\n${rows.filter(r => r.status === 'done').length}/${rows.length} stages done`);
