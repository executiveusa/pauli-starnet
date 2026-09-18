/* Daily StarNet staging/sandbox eval orchestrator.
 * Owner: Hermes, Command District.
 * No credentials, providers, public network, or production services.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(import.meta.dirname, '..', '..');
const REPORT = resolve(ROOT, process.env.STARNET_DAILY_REPORT || 'qa/eval-receipts/daily-staging-summary.md');
const DEFAULT_STEPS = [
  { id: 'credential-free-eval-gate', command: 'npm', args: ['run', 'eval:gate'], proof: 'contract + quality + 1,000 fault rows + 32 parity scenarios + 4 violation probes' },
  { id: 'pauli-icm-cold-walk', command: 'npm', args: ['run', 'test:pauli-icm'], proof: 'cold-agent ICM orientation and callable-database contracts' },
  { id: 'youtube-icm-cold-walk', command: 'npm', args: ['run', 'test:youtube-icm'], proof: 'Creative District workflow/stage/reference/transcript integrity' }
];

export function runDaily({ steps = DEFAULT_STEPS, spawn = spawnSync, generatedAt = new Date().toISOString() } = {}) {
  const results = steps.map(step => {
    const startedAt = Date.now();
    const child = spawn(step.command, step.args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const output = String(child.stdout || '') + String(child.stderr || '');
    return { ...step, exitCode: child.status ?? 2, pass: child.status === 0, durationMs: Date.now() - startedAt,
      tail: output.split(/\r?\n/).filter(Boolean).slice(-12) };
  });
  const pass = results.every(result => result.pass);
  const receiptPath = resolve(ROOT, 'qa/eval-receipts/last-gate-receipt.json');
  let receipt = null;
  try { receipt = JSON.parse(readFileSync(receiptPath, 'utf8')); } catch (_) {}
  const lines = [
    '# StarNet daily staging eval', '',
    `- Verdict: **${pass ? 'PASS' : 'FAIL'}**`,
    `- Generated: ${generatedAt}`,
    '- Owner: Hermes, Command District',
    '- Mode: staging/sandbox, credential-free, read-only against production',
    '- Automation: OFF by default; manual dispatch is available. The daily 00:17 America/Mexico_City cron is staged but commented out.',
    '', '## Checks', '',
    '| Check | Result | Time | What it proves |', '| --- | --- | ---: | --- |',
    ...results.map(r => `| ${r.id} | ${r.pass ? 'PASS' : 'FAIL'} | ${(r.durationMs / 1000).toFixed(1)}s | ${r.proof} |`),
    '', '## Honesty boundary', '',
    '- This daily run proves deterministic source-tree and sandbox plumbing only.',
    '- It does not use a live model, spend money, touch production services, or prove production model quality.',
    `- Credential-free receipt: ${receipt ? '`qa/eval-receipts/last-gate-receipt.json`' : 'not produced'}`,
    '', '## Step tails', '',
    ...results.flatMap(r => [`### ${r.id}`, '```text', ...r.tail, '```', ''])
  ];
  mkdirSync(dirname(REPORT), { recursive: true });
  writeFileSync(REPORT, lines.join('\n') + '\n', 'utf8');
  console.log(`[daily-staging-eval] ${pass ? 'PASS' : 'FAIL'} report=${REPORT}`);
  for (const result of results) console.log(`[daily-staging-eval] ${result.id} ${result.pass ? 'PASS' : 'FAIL'} exit=${result.exitCode}`);
  return { pass, results, report: REPORT };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = runDaily();
  process.exitCode = result.pass ? 0 : 1;
}
