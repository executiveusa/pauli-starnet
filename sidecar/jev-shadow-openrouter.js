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

const PORT = Number(process.env.JEV_SHADOW_PORT || 8794);
const HOST = process.env.JEV_SHADOW_HOST || '127.0.0.1';
const LEDGER = process.env.JEV_SHADOW_LEDGER
  || path.join(__dirname, '..', 'registry', 'jev-shadow-ledger.jsonl');
const API_KEY = process.env.OPENROUTER_API_KEY || '';
const MODELS = (process.env.JEV_SHADOW_MODELS
  || 'deepseek/deepseek-v4-flash-0731:free,z-ai/glm-5.2:free,google/gemma-4-31b-it:free'
).split(',').map(s => s.trim()).filter(Boolean);
const HARD_OFF = String(process.env.STARNET_JEV_DISABLED || '').trim() === '1';
const VERSION = '0.1.0';

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

async function callModel(state) {
  const user = 'Mission state:\n' + JSON.stringify(state).slice(0, 6000);
  let lastErr = null;
  for (const model of MODELS) {
    const started = Date.now();
    try {
      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          authorization: 'Bearer ' + API_KEY,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: QUESTION_SPEC },
            { role: 'user', content: user },
          ],
          temperature: 0,
          max_tokens: 400,
          response_format: { type: 'json_object' },
        }),
      });
      const text = await resp.text();
      let parsed = null;
      try { parsed = text ? JSON.parse(text) : null; } catch {}
      if (!resp.ok) {
        lastErr = { model, status: resp.status, body: clip(text, 300) };
        if (resp.status === 429 && !callModel._retried) {
          callModel._retried = true;
          await new Promise(r => setTimeout(r, 8000));
          return callModel(state).finally(() => { callModel._retried = false; });
        }
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

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && u.pathname === '/healthz') {
    return json(res, 200, { ok: true, version: VERSION, models: MODELS, hardOff: HARD_OFF });
  }
  if (req.method === 'GET' && u.pathname === '/status') {
    let ledgerCount = 0;
    try { ledgerCount = fs.readFileSync(LEDGER, 'utf8').trim().split(/\n/).filter(Boolean).length; } catch {}
    return json(res, 200, { ok: true, district: 'jev', citizen: 'jev-shadow', mode: 'recommend-only', version: VERSION, models: MODELS, hardOff: HARD_OFF, keyConfigured: Boolean(API_KEY), ledgerEntries: ledgerCount, uptimeSec: Math.round(process.uptime()) });
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
    const requestId = crypto.randomUUID();
    const result = await callModel(state);
    ledgerWrite({
      ts: new Date().toISOString(),
      requestId,
      version: VERSION,
      shadow: true,
      state: JSON.stringify(state).slice(0, 2000),
      model: result.ok ? result.model : undefined,
      answers: result.ok ? result.answers : undefined,
      usage: result.ok ? result.usage : undefined,
      latencyMs: result.ok ? result.latencyMs : undefined,
      costUsd: 0,
      error: result.ok ? undefined : result.error,
    });
    if (!result.ok) {
      return json(res, 502, { ok: false, error: 'jev_upstream_failed', detail: result.error, requestId });
    }
    return json(res, 200, {
      ok: true,
      shadow: true,
      model: result.model,
      answers: result.answers,
      usage: result.usage,
      requestId,
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log('[jev-shadow] listening on http://' + HOST + ':' + PORT + ' models=' + MODELS.join(','));
});
