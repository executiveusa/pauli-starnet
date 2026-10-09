/* StarNet JEV shadow decision plane - free-floor edition.
   Same contract as netlify/functions/jev-decision.mts (the TypeSafe seam),
   answered by a free-tier OpenRouter model so the shadow pilot spends $0.

   Shadow mode contract (AGENTS_DONE 2026-09-18 sequence):
   - recommend-only: answers typed questions, never routes anything itself
   - current StarNet routing stays authoritative
   - every decision logged as a receipt to registry/jev-shadow-ledger.jsonl
   - kill switches armed: STARNET_JEV_DISABLED=1 env + x-starnet-jev-enabled header gate
*/
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { openRouterChat, gatewayPost } = require('./jev-http.js');

// Test seams: callers inject fetch/sleep; production leaves both undefined.
const httpDeps = { fetchImpl: undefined, sleep: undefined };

const PORT = Number(process.env.JEV_SHADOW_PORT || 8794);
const HOST = process.env.JEV_SHADOW_HOST || '127.0.0.1';
const LEDGER = process.env.JEV_SHADOW_LEDGER
  || path.join(__dirname, '..', 'registry', 'jev-shadow-ledger.jsonl');
const API_KEY = process.env.OPENROUTER_API_KEY || '';
const MODELS = (process.env.JEV_SHADOW_MODELS
  || 'stealth/space-bunny-alpha,deepseek/deepseek-v4-flash-0731:free,z-ai/glm-5.2:free,google/gemma-4-31b-it:free'
).split(',').map(s => s.trim()).filter(Boolean);
// Per-model request extras. Space Bunny Alpha reasons at length by default;
// low effort keeps typed decisions fast. Quality knob lives here, not in prompts.
const MODEL_EXTRA = {
  'stealth/space-bunny-alpha': { reasoning_effort: 'low' },
};
const GATEWAY_TOKEN_FILE = process.env.JEV_GATEWAY_TOKEN_FILE || '/root/.vercel-token';
const GATEWAY_URL = process.env.JEV_GATEWAY_URL || 'https://ai-gateway.vercel.sh/v1/evaluate';
const GATEWAY_MODEL = process.env.JEV_GATEWAY_MODEL || 'typesafe-ai/jev';
const HARD_OFF = String(process.env.STARNET_JEV_DISABLED || '').trim() === '1';
const VERSION = '0.3.0';

const QUESTION_SPEC = `You are the JEV shadow decision plane for StarNet, a fleet of coding/ops agents.
Given a mission state, answer FIVE typed questions. Reply with STRICT JSON only, no prose:
{
  "agent": {"choice": one of ["hermes","heisenberg","frontend","infra","research"]},
  "next_action": {"choice": one of ["inspect","modify","test","deploy_preview","request_approval","stop"]},
  "risk": {"score": one of ["low","medium","high","critical"]},
  "requires_human_approval": {"answer": "yes" or "no"},
  "proof_satisfied": {"answer": "yes" or "no"},
  "confidence": number 0..1
}
Criteria:
- hermes: orchestration, planning, delegation, synthesis. heisenberg: city-level coordination across workers/systems. frontend: UI/UX/browser/visual. infra: hosting, deploy, networking, DNS, servers. research: gathering, comparison, verification.
- inspect: read state before changing. modify: bounded reversible change. test: verification without production authority. deploy_preview: non-production preview. request_approval: ask the human owner. stop: do not continue.
- risk low: read-only/reversible, negligible blast radius. medium: bounded write, clear rollback. high: production, credentials, data, infrastructure. critical: destructive, irreversible, financial, ownership, security.
- requires_human_approval yes: production merge/deploy, destructive, credentials, DNS, money, ownership, irreversible. no: read-only, shadow evaluation, tests, bounded non-production work.
- proof_satisfied: does the supplied state contain enough evidence to claim the requested outcome is verified?`;

function json(res, status, body) {
  const buf = Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': buf.length,
    'cache-control': 'no-store',
  });
  res.end(buf);
}

function clip(v, n) { return String(v == null ? '' : v).slice(0, n); }

function ledgerWrite(entry) {
  try {
    fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
    fs.appendFileSync(LEDGER, JSON.stringify(entry) + '\n');
  } catch (e) {
    console.warn('[jev-shadow] ledger write failed:', e && e.message);
  }
}

function validAnswers(a) {
  if (!a || typeof a !== 'object') return false;
  const agents = ['hermes', 'heisenberg', 'frontend', 'infra', 'research'];
  const actions = ['inspect', 'modify', 'test', 'deploy_preview', 'request_approval', 'stop'];
  const risks = ['low', 'medium', 'high', 'critical'];
  const yn = (x) => x && (x.answer === 'yes' || x.answer === 'no');
  return agents.includes(a.agent && a.agent.choice)
    && actions.includes(a.next_action && a.next_action.choice)
    && risks.includes(a.risk && a.risk.score)
    && yn(a.requires_human_approval)
    && yn(a.proof_satisfied);
}

const GATEWAY_QUESTIONS = {
  agent: { type: 'choice', criteria: {
    hermes: 'orchestration, planning, delegation, synthesis',
    heisenberg: 'city-level coordination across workers and systems',
    frontend: 'UI, UX, browser, visual work',
    infra: 'hosting, deploy, networking, DNS, servers',
    research: 'gathering, comparison, verification' } },
  next_action: { type: 'choice', criteria: {
    inspect: 'read state before changing anything',
    modify: 'bounded reversible change',
    test: 'verification without production authority',
    deploy_preview: 'non-production preview deploy',
    request_approval: 'ask the human owner first',
    stop: 'do not continue' } },
  risk: { type: 'choice', criteria: {
    low: 'read-only or reversible, negligible blast radius',
    medium: 'bounded write with clear rollback',
    high: 'production, credentials, data, infrastructure',
    critical: 'destructive, irreversible, financial, ownership, security' } },
  requires_human_approval: { type: 'boolean',
    instructions: 'Does this need human owner approval? true: production merge/deploy, destructive, credentials, DNS, money, ownership, irreversible. false: read-only, shadow evaluation, tests, bounded non-production work.' },
  proof_satisfied: { type: 'boolean',
    instructions: 'Does the supplied state contain enough evidence to claim the requested outcome is verified?' },
};

function gatewayToken() {
  try { return fs.readFileSync(GATEWAY_TOKEN_FILE, 'utf8').trim(); } catch { return null; }
}

function gatewayAnswersToContract(ans) {
  if (!ans || typeof ans !== 'object') return null;
  const pick = (v) => v && (v.choice !== undefined ? v.choice : v.value);
  const bool = (v) => v && (v.probability !== undefined ? (v.probability >= 0.5 ? 'yes' : 'no') : (v.answer !== undefined ? v.answer : null));
  const conf = (v) => (v && typeof v.probability === 'number') ? Math.max(v.probability, 1 - v.probability) : null;
  const out = {
    agent: { choice: pick(ans.agent) },
    next_action: { choice: pick(ans.next_action) },
    risk: { score: pick(ans.risk) },
    requires_human_approval: { answer: bool(ans.requires_human_approval) },
    proof_satisfied: { answer: bool(ans.proof_satisfied) },
    confidence: Math.max(conf(ans.agent) || 0, conf(ans.risk) || 0, conf(ans.requires_human_approval) || 0, conf(ans.proof_satisfied) || 0) || undefined,
  };
  return validAnswers(out) ? out : null;
}

async function callGateway(state) {
  const token = gatewayToken();
  if (!token) return { ok: false, error: { provider: 'typesafe-gateway', error: 'no_gateway_token' } };
  const started = Date.now();
  try {
    const { resp, text, parsed } = await gatewayPost({
      url: GATEWAY_URL,
      token,
      body: {
        model: GATEWAY_MODEL,
        state: JSON.stringify(state).slice(0, 6000),
        questions: GATEWAY_QUESTIONS,
      },
      ...httpDeps,
    });
    if (!resp.ok) {
      return { ok: false, error: { provider: 'typesafe-gateway', status: resp.status, body: clip(text, 300) } };
    }
    const answers = gatewayAnswersToContract(parsed && parsed.answers);
    if (!answers) return { ok: false, error: { provider: 'typesafe-gateway', status: 200, error: 'shape_invalid', content: clip(text, 300) } };
    const probabilities = {};
    for (const [k, v] of Object.entries(parsed.answers || {})) {
      if (v && v.probabilities) probabilities[k] = v.probabilities;
      else if (v && typeof v.probability === 'number') probabilities[k] = v.probability;
    }
    return { ok: true, provider: 'typesafe-gateway', model: GATEWAY_MODEL, answers, probabilities, usage: parsed.usage || undefined, latencyMs: Date.now() - started };
  } catch (e) {
    return { ok: false, error: { provider: 'typesafe-gateway', error: e && e.message } };
  }
}

function validCustomQuestions(q) {
  if (!q || typeof q !== 'object' || Array.isArray(q)) return false;
  const keys = Object.keys(q);
  if (!keys.length || keys.length > 8) return false;
  for (const k of keys) {
    if (!/^[a-z0-9_]{1,32}$/.test(k)) return false;
    const v = q[k];
    if (!v || typeof v !== 'object') return false;
    if (v.type === 'boolean' && typeof v.instructions === 'string' && v.instructions.length > 0) continue;
    if (v.type === 'choice' && v.criteria && typeof v.criteria === 'object' && !Array.isArray(v.criteria)
        && Object.keys(v.criteria).length >= 2 && Object.keys(v.criteria).length <= 8) continue;
    return false;
  }
  return true;
}

async function callGatewayCustom(state, questions) {
  const token = gatewayToken();
  if (!token) return { ok: false, error: { provider: 'typesafe-gateway', error: 'no_gateway_token' } };
  const started = Date.now();
  try {
    const { resp, text, parsed } = await gatewayPost({
      url: GATEWAY_URL,
      token,
      body: { model: GATEWAY_MODEL, state: JSON.stringify(state).slice(0, 6000), questions },
      ...httpDeps,
    });
    if (!resp.ok) {
      return { ok: false, error: { provider: 'typesafe-gateway', status: resp.status, body: clip(text, 300) } };
    }
    return { ok: true, provider: 'typesafe-gateway', model: GATEWAY_MODEL, rawAnswers: (parsed && parsed.answers) || {}, usage: parsed.usage || undefined, latencyMs: Date.now() - started };
  } catch (e) {
    return { ok: false, error: { provider: 'typesafe-gateway', error: e && e.message } };
  }
}

async function callDecision(state) {
  // Primary: real TypeSafe Jev via Vercel AI Gateway. Fallback: OpenRouter free lane.
  const gw = await callGateway(state);
  if (gw.ok) return gw;
  const or = await callModel(state);
  if (or.ok) { or.gatewayError = gw.error; return or; }
  return { ok: false, error: { gateway: gw.error, openrouter: or.error } };
}

async function callModel(state) {
  const user = 'Mission state:\n' + JSON.stringify(state).slice(0, 6000);
  let lastErr = null;
  for (const model of MODELS) {
    const started = Date.now();
    try {
      const { resp, text, parsed } = await openRouterChat({
        apiKey: API_KEY, model, system: QUESTION_SPEC, user, extra: MODEL_EXTRA[model], ...httpDeps,
      });
      if (!resp.ok) {
        lastErr = { model, status: resp.status, body: clip(text, 300) };
        continue;
      }
      const content = parsed && parsed.choices && parsed.choices[0]
        && parsed.choices[0].message && parsed.choices[0].message.content;
      let answers = null;
      try { answers = JSON.parse(content); } catch {
        const m = typeof content === 'string' && content.match(/\{[\s\S]*\}/);
        if (m) { try { answers = JSON.parse(m[0]); } catch {} }
      }
      if (!validAnswers(answers)) {
        lastErr = { model, status: 200, error: 'shape_invalid', content: clip(content, 300) };
        continue;
      }
      return {
        ok: true,
        model,
        answers,
        usage: parsed.usage || undefined,
        latencyMs: Date.now() - started,
      };
    } catch (e) {
      lastErr = { model, error: e && e.message };
    }
  }
  return { ok: false, error: lastErr };
}


// --- Named question packs (citizen templates) -------------------------------
// Packs are named typed-question sets loaded from sidecar/jev-question-packs.json.
// They let any district ask a JEV-shaped question (ad-gap analyzer, brand
// quality-gate, inbox triage) without hardcoding the questions. Video pattern:
// batch every question into ONE model call (rank wide, read narrow).
// Environment variables are operator-trusted. Never start with untrusted env; keep HOST loopback.
const PACKS_FILE = process.env.JEV_QUESTION_PACKS_FILE
  || path.join(__dirname, 'jev-question-packs.json');
function loadPacks() {
  try {
    const raw = JSON.parse(fs.readFileSync(PACKS_FILE, 'utf8'));
    const out = {};
    for (const [name, q] of Object.entries(raw || {})) {
      if (/^[a-z0-9-]{1,40}$/.test(name) && validCustomQuestions(q)) out[name] = q;
    }
    return out;
  } catch (e) {
    console.warn('[jev-shadow] packs load failed:', e && e.message);
    return {};
  }
}
const QUESTION_PACKS = loadPacks();

function customSpecFromQuestions(questions) {
  const lines = [
    'You are the JEV shadow decision plane. Given the state, answer every typed question below.',
    'Reply with STRICT JSON only, no prose: one object keyed by question name.',
    'Questions:',
  ];
  for (const [k, v] of Object.entries(questions)) {
    if (v.type === 'boolean') {
      lines.push('- "' + k + '": {"answer": "yes" or "no"} - ' + v.instructions);
    } else {
      const opts = Object.keys(v.criteria).map(c => '"' + c + '"').join(',');
      const desc = Object.entries(v.criteria).map(([c, d]) => c + ': ' + d).join('; ');
      lines.push('- "' + k + '": {"choice": one of [' + opts + ']} - ' + desc);
    }
  }
  return lines.join('\n');
}

function validCustomAnswers(questions, a) {
  if (!a || typeof a !== 'object') return false;
  for (const [k, v] of Object.entries(questions)) {
    const ans = a[k];
    if (!ans || typeof ans !== 'object') return false;
    if (v.type === 'boolean') {
      if (ans.answer !== 'yes' && ans.answer !== 'no') return false;
    } else if (!Object.prototype.hasOwnProperty.call(v.criteria, ans.choice)) {
      return false;
    }
  }
  return true;
}

// Free-lane fallback for typed custom questions / packs (mirrors callModel).
async function callModelCustom(state, questions) {
  const spec = customSpecFromQuestions(questions);
  const user = 'State:\n' + JSON.stringify(state).slice(0, 6000);
  let lastErr = null;
  for (const model of MODELS) {
    const started = Date.now();
    try {
      const { resp, text, parsed } = await openRouterChat({
        apiKey: API_KEY, model, system: spec, user, extra: MODEL_EXTRA[model], ...httpDeps,
      });
      if (!resp.ok) {
        lastErr = { model, status: resp.status, body: clip(text, 300) };
        continue;
      }
      const content = parsed && parsed.choices && parsed.choices[0]
        && parsed.choices[0].message && parsed.choices[0].message.content;
      let answers = null;
      try { answers = JSON.parse(content); } catch {
        const m = typeof content === 'string' && content.match(/\{[\s\S]*\}/);
        if (m) { try { answers = JSON.parse(m[0]); } catch {} }
      }
      if (!validCustomAnswers(questions, answers)) {
        lastErr = { model, status: 200, error: 'shape_invalid', content: clip(content, 300) };
        continue;
      }
      return {
        ok: true,
        model,
        rawAnswers: answers,
        usage: parsed.usage || undefined,
        latencyMs: Date.now() - started,
      };
    } catch (e) {
      lastErr = { model, error: e && e.message };
    }
  }
  return { ok: false, error: lastErr };
}

// Custom questions: real Jev gateway first, free lane as fallback (same
// reversible-shadow posture as callDecision).
async function callDecisionCustom(state, questions) {
  const gw = await callGatewayCustom(state, questions);
  if (gw.ok) return gw;
  const or = await callModelCustom(state, questions);
  if (or.ok) { or.gatewayError = gw.error; return or; }
  return { ok: false, error: { gateway: gw.error, openrouter: or.error } };
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && u.pathname === '/healthz') {
    return json(res, 200, { ok: true, version: VERSION, models: MODELS, hardOff: HARD_OFF });
  }
  if (req.method === 'GET' && u.pathname === '/status') {
    let ledgerCount = 0;
    try { ledgerCount = fs.readFileSync(LEDGER, 'utf8').trim().split(/\n/).filter(Boolean).length; } catch {}
    return json(res, 200, { ok: true, district: 'jev', citizen: 'jev-shadow', mode: 'recommend-only', version: VERSION, models: MODELS, hardOff: HARD_OFF, keyConfigured: Boolean(API_KEY), ledgerEntries: ledgerCount, packs: Object.keys(QUESTION_PACKS), uptimeSec: Math.round(process.uptime()) });
  }
  if (req.method !== 'POST' || u.pathname !== '/api/jev-decision') {
    return json(res, 404, { ok: false, error: 'not_found' });
  }
  if (HARD_OFF) {
    return json(res, 503, { ok: false, disabled: true, reason: 'server_kill_switch' });
  }
  if (req.headers['x-starnet-jev-enabled'] !== '1') {
    return json(res, 409, { ok: false, disabled: true, reason: 'jev_toggle_off' });
  }
  if (!API_KEY) {
    return json(res, 503, { ok: false, ready: false, reason: 'openrouter_key_unconfigured' });
  }
  let body = '';
  req.on('data', (c) => { body += c; if (body.length > 65536) req.destroy(); });
  req.on('end', async () => {
    let parsed = null;
    try { parsed = JSON.parse(body); } catch {}
    const state = parsed && parsed.state;
    if (state == null) return json(res, 400, { ok: false, error: 'state_required' });
    let customQ = parsed.questions !== undefined ? parsed.questions : null;
    let packName = null;
    if (parsed.pack !== undefined) {
      if (typeof parsed.pack !== 'string' || !QUESTION_PACKS[parsed.pack]) {
        return json(res, 400, { ok: false, error: 'pack_unknown', packs: Object.keys(QUESTION_PACKS) });
      }
      packName = parsed.pack;
      customQ = QUESTION_PACKS[packName];
    }
    if (customQ !== null && !validCustomQuestions(customQ)) return json(res, 400, { ok: false, error: 'questions_invalid' });
    const requestId = crypto.randomUUID();
    const result = customQ ? await callDecisionCustom(state, customQ) : await callDecision(state);
    ledgerWrite({
      ts: new Date().toISOString(),
      requestId,
      version: VERSION,
      shadow: true,
      state: JSON.stringify(state).slice(0, 2000),
      provider: result.ok ? (result.provider || "openrouter-free") : undefined,
      model: result.ok ? result.model : undefined,
      answers: result.ok ? (result.answers || result.rawAnswers) : undefined,
      customQuestions: customQ ? Object.keys(customQ) : undefined,
      pack: packName || undefined,
      usage: result.ok ? result.usage : undefined,
      probabilities: result.ok ? result.probabilities : undefined,
      upstreamFallback: result.ok && result.gatewayError ? result.gatewayError : undefined,
      latencyMs: result.ok ? result.latencyMs : undefined,
      costUsd: result.ok && result.provider === 'typesafe-gateway' && result.usage && result.usage.inputTokens ? result.usage.inputTokens * 0.042 / 1e6 : 0,
      error: result.ok ? undefined : result.error,
    });
    if (!result.ok) {
      return json(res, 502, { ok: false, error: 'jev_upstream_failed', detail: result.error, requestId });
    }
    return json(res, 200, {
      ok: true,
      shadow: true,
      provider: result.provider || 'openrouter-free',
      model: result.model,
      answers: result.answers || result.rawAnswers,
      usage: result.usage,
      requestId,
    });
  });
});

// Start the server only when run as the service; tests require() this file for the call paths.
if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log('[jev-shadow] listening on http://' + HOST + ':' + PORT + ' models=' + MODELS.join(','));
  });
}

module.exports = { callGateway, callGatewayCustom, callModel, callModelCustom, httpDeps };
