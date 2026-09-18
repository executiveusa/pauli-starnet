import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runDaily } from '../scripts/eval/daily-staging.mjs';

const dir = mkdtempSync(join(tmpdir(), 'starnet-daily-eval-'));
process.env.STARNET_DAILY_REPORT = join(dir, 'summary.md');
try {
  const calls = [];
  const green = runDaily({ generatedAt: '2026-09-18T06:17:00.000Z', spawn(command, args) {
    calls.push([command, ...args]);
    return { status: 0, stdout: 'PASS\n', stderr: '' };
  }});
  assert.equal(green.pass, true);
  assert.equal(calls.length, 3);
  assert.deepEqual(calls.map(c => c.join(' ')), ['npm run eval:gate', 'npm run test:pauli-icm', 'npm run test:youtube-icm']);
  const report = readFileSync(green.report, 'utf8');
  assert.match(report, /Verdict: \*\*PASS\*\*/);
  assert.match(report, /Owner: Hermes, Command District/);
  assert.match(report, /staging\/sandbox, credential-free/);

  let i = 0;
  const red = runDaily({ spawn() { i++; return { status: i === 2 ? 1 : 0, stdout: '', stderr: i === 2 ? 'walk failed' : '' }; } });
  assert.equal(red.pass, false);
  assert.match(readFileSync(red.report, 'utf8'), /Verdict: \*\*FAIL\*\*/);
  console.log('daily-staging-eval tests: OK (10 assertions)');
} finally {
  delete process.env.STARNET_DAILY_REPORT;
  rmSync(dir, { recursive: true, force: true });
}
