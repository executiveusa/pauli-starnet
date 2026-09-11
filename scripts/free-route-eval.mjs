#!/usr/bin/env node
/* scripts/free-route-eval.mjs — ONE consistent workflow suite across the genuinely FREE model routes.

   What it proves, per route: quality (deterministic per-workflow checks), speed (stream latency),
   reliability (success over bounded attempts), and token usage (provider-reported usage). Receipts
   land in .dogfood/free-route-eval/ (gitignored evidence).

   HARD SCOPE (Commander approval 2026-09-10): free routes ONLY.
   • This script talks to exactly one endpoint family: the Groq free tier (api.groq.com), driven
     through the real provider seam (sidecar/providers/factory.js), credential from the registry's
     documented env names (GROQ_API_TOKEN / GROQ_API_KEY) — never printed, never persisted.
   • It will NEVER touch OpenRouter, OpenCode Zen server-side, or any endpoint that can draw from a
     funded balance, paid credit, or auto-recharge. There is no code path here that names another
     provider id.
   • OpenCode Zen's six free models are CLIENT-ONLY (verified 2026-09-10: server-side calls return
     HTTP 400 MissingSessionID — "OpenCode's free tier can only be used in OpenCode"). They are
     reported as client-lane rows and are never dialed from here.

   usage: node scripts/free-route-eval.mjs [--models id,id] [--attempts N] [--out dir] [--dry-run] */
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const factory = require('../sidecar/providers/factory.js');
const routePolicy = require('../sidecar/providers/route-policy.js');
const { makeCostEngine } = require('../sidecar/cost.js');

const PROVIDER_ID = 'groq';                 // the only provider id this script can name — free tier, $0
const STEP_TIMEOUT_MS = 60000;
const BETWEEN_CALLS_MS = 1500;
const MAX_TOKENS = 400;

// Preferred free-tier candidates, intersected with the live catalog at runtime (catalog wins).
const PREFERRED_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'qwen/qwen3-32b',
  'moonshotai/kimi-k2-instruct',
  'gemma2-9b-it',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
  'compound-mini',
  'compound'
];

// OpenCode Zen free tier — CLIENT-ONLY. Never server-routed; reported for the record.
const CLIENT_ONLY_FREE = [
  { provider: 'opencode-zen', model: 'big-pickle', evidence: 'HTTP 400 MissingSessionID on server-side call (verified 2026-09-10)' },
  { provider: 'opencode-zen', model: 'mimo-v2.5', evidence: 'client-only free tier (same gate)' },
  { provider: 'opencode-zen', model: 'ling-3.0-flash-fin', evidence: 'client-only free tier (same gate)' },
  { provider: 'opencode-zen', model: 'nemotron-3-ultra', evidence: 'client-only free tier (same gate)' },
  { provider: 'opencode-zen', model: 'nemotron-3.5-lightning', evidence: 'client-only free tier (same gate)' },
  { provider: 'opencode-zen', model: 'muse-spark-1.2-contributor', evidence: 'client-only free tier (same gate)' }
];

// The consistent workflow suite: four fleet-shaped jobs with deterministic quality checkers.
const WORKFLOWS = [
  {
    id: 'mission-decomposition',
    label: 'Decompose a mission into crew tasks (Heisenberg planner shape)',
    prompt: 'Decompose this mission into exactly 3 crew tasks. Mission: "Audit a small business website and draft a revenue leak map." Reply with ONLY a JSON array of objects, each with keys "task" (string) and "specialty" (one of: foreman, scout, engineer, apptester, auditor, reviewer, designer, drafter, operator, treasurer, prospector, publisher, optimizer, webdesigner).',
    check: text => {
      try {
        const m = text.match(/\[[\s\S]*\]/); if (!m) return { pass: false, why: 'no JSON array' };
        const arr = JSON.parse(m[0]);
        if (!Array.isArray(arr) || arr.length !== 3) return { pass: false, why: 'not exactly 3 tasks' };
        const ok = arr.every(t => t && typeof t.task === 'string' && t.task.length > 3 && typeof t.specialty === 'string');
        return ok ? { pass: true } : { pass: false, why: 'missing task/specialty keys' };
      } catch (e) { return { pass: false, why: 'JSON parse failed' }; }
    }
  },
  {
    id: 'code-patch',
    label: 'Smallest correct code change (TARS/engineer shape)',
    prompt: 'Write a JavaScript function named clamp01 that takes a number and returns it clamped to the range [0, 1]. Reply with ONLY the function in a single ```javascript code fence.',
    check: text => {
      const hasFence = /```(javascript|js)?[\s\S]*?```/.test(text);
      const body = text.replace(/```(javascript|js)?|```/g, '');
      const named = /function\s+clamp01|const\s+clamp01|clamp01\s*=/.test(body);
      const clamps = /Math\.(min|max)|<=\s*0|>=\s*1|\?\s*0|:\s*1/.test(body);
      return hasFence && named && clamps ? { pass: true } : { pass: false, why: [!hasFence && 'no fence', !named && 'no clamp01', !clamps && 'no clamp logic'].filter(Boolean).join(', ') };
    }
  },
  {
    id: 'route-classify',
    label: 'Classify a work item onto an execution lane (router shape)',
    prompt: 'Classify each work item into exactly one lane: connector, mcp, shell, browser, desktop, vision. Items: 1) "read my gmail inbox" 2) "run the test suite" 3) "fill the form on the dashboard website". Reply with ONLY three lines in the format: <number>: <lane>',
    check: text => {
      const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
      const m1 = lines.some(l => /^1[.:)]\s*(connector|mcp)/i.test(l));
      const m2 = lines.some(l => /^2[.:)]\s*shell/i.test(l));
      const m3 = lines.some(l => /^3[.:)]\s*browser/i.test(l));
      return m1 && m2 && m3 ? { pass: true } : { pass: false, why: 'lane mismatch: ' + JSON.stringify(lines.slice(0, 4)) };
    }
  },
  {
    id: 'receipt-summarize',
    label: 'Compress a run receipt (context-compression shape)',
    prompt: 'Summarize this run receipt in at most 30 words, keeping the provider, model, token count, cost, and result: "Run 7f3a completed on provider groq model openai/gpt-oss-120b with 4,210 tokens, cost $0.0000 (free tier), result done, 3 tool calls, no fallbacks."',
    check: text => {
      const words = text.trim().split(/\s+/).length;
      const t = text.toLowerCase();
      const keeps = ['groq', 'gpt-oss-120b', '4,210', 'done'].every(k => t.includes(k.toLowerCase()));
      return words <= 40 && keeps ? { pass: true } : { pass: false, why: 'words=' + words + ' keeps=' + keeps };
    }
  }
];

function parseArgs(argv) {
  const out = { models: null, attempts: 2, out: path.join(process.cwd(), '.dogfood', 'free-route-eval'), dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--models') out.models = String(argv[++i] || '').split(',').map(s => s.trim()).filter(Boolean);
    else if (a === '--attempts') out.attempts = Math.max(1, Math.min(4, Number(argv[++i]) || 2));
    else if (a === '--out') out.out = String(argv[++i] || '').trim();
    else if (a === '--dry-run') out.dryRun = true;
  }
  return out;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
function withTimeout(promise, ms, label) {
  let t;
  const gate = new Promise((_, reject) => { t = setTimeout(() => reject(new Error(label + ' timed out after ' + ms + 'ms')), ms); });
  return Promise.race([promise, gate]).finally(() => clearTimeout(t));
}

async function drain(provider, req) {
  const got = { text: '', usage: null, finish: null };
  const run = (async () => {
    for await (const ev of provider.stream(req)) {
      if (!ev) continue;
      if (ev.type === 'text') got.text += ev.delta || '';
      else if (ev.type === 'usage') got.usage = ev.usage;
      else if (ev.type === 'done') got.finish = ev.finishReason || 'done';
    }
  })();
  await withTimeout(run, STEP_TIMEOUT_MS, 'stream');
  return got;
}

function envCredential(profile) {
  for (const name of (profile.keyEnv || [])) {
    const v = process.env[name];
    if (v && String(v).trim()) return { key: String(v).trim(), from: name };
  }
  return null;
}

(async () => {
  const args = parseArgs(process.argv);
  const profile = factory.getProviderProfile(PROVIDER_ID);
  const cred = envCredential(profile);

  // Route-policy decision matrix (pure, no network) — the routing half of the evidence.
  const envOn = { STARNET_ROUTE_POLICY: 'heisenberg-v1' };
  const policyMatrix = {
    default: routePolicy.resolve({ requestedProvider: '', requestedModel: '', credentialFor: () => true }, envOn),
    openrouterLaneOff: routePolicy.resolve({ requestedProvider: 'openrouter', requestedModel: 'deepseek/deepseek-chat-v3.1', credentialFor: () => true }, envOn),
    openrouterArmed: routePolicy.resolve({ requestedProvider: 'openrouter', requestedModel: 'deepseek/deepseek-chat-v3.1', credentialFor: () => true },
      Object.assign({}, envOn, { STARNET_OPENROUTER_LANE: '1', STARNET_OPENROUTER_ALLOWED_MODELS: 'deepseek/deepseek-chat-v3.1' }))
  };

  const report = {
    generatedAt: new Date().toISOString(),
    scope: 'FREE ROUTES ONLY — no OpenRouter, no Zen server-side, no funded balance, no auto-recharge, no paid credit',
    provider: PROVIDER_ID,
    credentialFrom: cred ? cred.from : null,     // env var NAME only, never the value
    policyMatrix,
    workflows: WORKFLOWS.map(w => ({ id: w.id, label: w.label })),
    cells: [],
    clientOnlyFree: CLIENT_ONLY_FREE,
    notes: []
  };

  if (args.dryRun) {
    report.notes.push('dry run: no network calls made');
    fs.mkdirSync(args.out, { recursive: true });
    fs.writeFileSync(path.join(args.out, 'report.json'), JSON.stringify(report, null, 2));
    console.log('dry-run report written to ' + path.join(args.out, 'report.json'));
    return;
  }
  if (!cred) { console.error('SKIP: no Groq credential in ' + (profile.keyEnv || []).join('/')); process.exit(2); }

  const provider = factory.selectProvider({ provider: PROVIDER_ID, fetch: globalThis.fetch, key: cred.key });
  let catalog = [];
  try { catalog = await withTimeout(provider.listModels(), STEP_TIMEOUT_MS, 'listModels'); }
  catch (e) { console.error('SKIP: catalog unreachable: ' + String(e && e.message || e)); process.exit(2); }
  const catalogIds = new Set(catalog.map(m => String(m.id || '')));
  const models = (args.models || PREFERRED_MODELS).filter(id => catalogIds.has(id));
  const skipped = (args.models || PREFERRED_MODELS).filter(id => !catalogIds.has(id));
  if (skipped.length) report.notes.push('not in live catalog, skipped: ' + skipped.join(', '));
  if (!models.length) { console.error('SKIP: none of the candidate free models are in the live catalog'); process.exit(2); }

  const cost = makeCostEngine({ priceOf: provider.priceOf });
  for (const model of models) {
    for (const wf of WORKFLOWS) {
      const cell = { model, workflow: wf.id, attempts: [], reliability: 0, avgLatencyMs: null, tokensIn: 0, tokensOut: 0, listRateUsd: 0, qualityPassRate: 0 };
      let latSum = 0, latN = 0, okN = 0, qualN = 0;
      for (let i = 0; i < args.attempts; i++) {
        const started = Date.now();
        const attempt = { ok: false, latencyMs: null, tokensIn: 0, tokensOut: 0, quality: null, error: null };
        try {
          const got = await drain(provider, {
            model,
            messages: [{ role: 'user', content: wf.prompt }],
            max_tokens: MAX_TOKENS,
            temperature: 0
          });
          attempt.latencyMs = Date.now() - started;
          const u = got.usage || {};
          attempt.tokensIn = Number(u.prompt_tokens ?? u.tokensIn ?? 0) || 0;
          attempt.tokensOut = Number(u.completion_tokens ?? u.tokensOut ?? 0) || 0;
          const q = wf.check(got.text || '');
          attempt.quality = q;
          attempt.ok = !!(got.text && got.text.trim() && got.finish);
          if (attempt.ok) {
            okN++; latSum += attempt.latencyMs; latN++;
            cell.tokensIn += attempt.tokensIn; cell.tokensOut += attempt.tokensOut;
            cell.listRateUsd += cost.reconcile(got.usage, model).usd || 0;
            if (q.pass) qualN++;
          } else attempt.error = 'empty text or missing finish';
        } catch (e) {
          attempt.latencyMs = Date.now() - started;
          attempt.error = String(e && e.message || e).slice(0, 200);
        }
        cell.attempts.push(attempt);
        await sleep(BETWEEN_CALLS_MS);
      }
      cell.reliability = okN / args.attempts;
      cell.avgLatencyMs = latN ? Math.round(latSum / latN) : null;
      cell.qualityPassRate = okN ? qualN / okN : 0;
      report.cells.push(cell);
      console.log(`${model} × ${wf.id}: rel=${cell.reliability} lat=${cell.avgLatencyMs}ms qual=${cell.qualityPassRate} tok(in/out)=${cell.tokensIn}/${cell.tokensOut}`);
    }
  }

  fs.mkdirSync(args.out, { recursive: true });
  fs.writeFileSync(path.join(args.out, 'report.json'), JSON.stringify(report, null, 2));
  const md = ['# Free-route workflow eval', '',
    'Generated: ' + report.generatedAt,
    'Scope: ' + report.scope,
    'Credential: env `' + report.credentialFrom + '` (value never printed)', '',
    '| model | workflow | reliability | avg latency ms | quality pass | tokens in | tokens out | list-rate USD |',
    '|---|---|---|---|---|---|---|---|'];
  for (const c of report.cells) {
    md.push(`| ${c.model} | ${c.workflow} | ${(c.reliability * 100).toFixed(0)}% | ${c.avgLatencyMs ?? '—'} | ${(c.qualityPassRate * 100).toFixed(0)}% | ${c.tokensIn} | ${c.tokensOut} | $${c.listRateUsd.toFixed(6)} |`);
  }
  md.push('', 'List-rate USD is the Groq published list price for the tokens used; the fleet runs the free tier, so actual spend is $0 within quota.', '',
    '## Client-only free models (never server-routed)', '');
  for (const m of CLIENT_ONLY_FREE) md.push(`- ${m.provider}/${m.model} — ${m.evidence}`);
  fs.writeFileSync(path.join(args.out, 'report.md'), md.join('\n'));
  console.log('report: ' + path.join(args.out, 'report.md'));
})().catch(e => { console.error('eval failed: ' + String(e && e.stack || e)); process.exit(1); });
