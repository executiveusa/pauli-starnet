'use strict';
// STARFACTORY-001: how a worker bridge actually does the work. Reuse, don't rebuild:
//   sidecar - the existing StarNet sidecar /api/run (same call the workforce gateway already makes)
//   http    - any existing runtime (Hermes api_server, Pi) that speaks the small JSON contract below
// An executor is { idempotent, run(ctx) -> { ok, summary, artifacts[], usd, verdict?, findings? } }.
// `idempotent: true` means a re-run after a crash is safe (e.g. edits on an isolated branch). Anything that can
// pay, publish or deploy MUST declare false, and the bridge will then fail visibly rather than repeat it.
const http = require('http');

function postJson({ host, port, path, headers, body, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const buf = Buffer.from(JSON.stringify(body), 'utf8');
    const req = http.request({ host, port, path, method: 'POST', timeout: timeoutMs, headers: Object.assign({ 'Content-Type': 'application/json', 'Content-Length': buf.length }, headers) }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode || 0, text: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(new Error('executor timeout')); });
    req.end(buf);
  });
}

function parseVerdictText(text) {
  const m = /VERDICT:\s*(PASS|FAIL)/i.exec(String(text || ''));
  if (!m) return null;
  const findings = String(text).split('\n').filter(l => /^\s*[-*]\s+/.test(l)).map(l => l.replace(/^\s*[-*]\s+/, '').trim()).slice(0, 20);
  return { verdict: m[1].toUpperCase(), findings };
}

// The sidecar's /api/run contract (sidecar/index.js):
//   request  { model, system?, messages[], agentId?, provider?, isTask? }
//            -> 400 'missing key/model' when `model` is absent or its provider has no credential
//   response NDJSON, one { name, payload } object per line:
//            agent.token     { delta }              incremental assistant text
//            agent.run.end   { reason, usd }        terminal success
//            agent.run.error { message, transient } terminal failure
// Sending {agentId, text} (the old shape) satisfied neither side: the run 400'd before doing any
// work, and even a successful stream carried no `type`/`text` fields to parse.
function makeSidecarExecutor({ port = 8787, host = '127.0.0.1', token = '', agentId, model, provider, system, idempotent = true, timeoutMs = 600000 }) {
  return {
    idempotent,
    async run({ issue, role, mission, runId, route }) {
      // one-system 05: the routed lane's model wins over the configured one; an unverified lane keeps the configured model.
      const useModel = (route && route.model) || model;
      const useProvider = (route && route.provider && route.provider !== 'claude-code-cli') ? route.provider : provider;
      if (!useModel) return { ok: false, summary: 'sidecar executor misconfigured: FACTORY_ROLES[*].executor.model is required by /api/run', artifacts: [], usd: 0 };
      const headers = token ? { 'X-StarNet-Token': token, Authorization: 'Bearer ' + token } : {};
      const prompt = [
        issue.description || issue.title,
        '',
        'Factory context: mission=' + mission + ' role=' + role + ' issue=' + issue.id
      ].join('\n');
      const body = { model: useModel, agentId: agentId || 'agent', messages: [{ role: 'user', content: prompt }], isTask: true };
      if (route && route.reasoning) body.reasoning = { effort: route.reasoning };
      if (system) body.system = system;
      if (useProvider) body.provider = useProvider;
      // Fallbacks from registry/models.json: OpenRouter tries its list itself in one request (routerModels); other
      // providers are tried by the sidecar in order, and any without a key are skipped (fallbackProviders).
      if (route && route.model && useProvider === 'openrouter' && Array.isArray(route.fallback_models) && route.fallback_models.length) body.routerModels = route.fallback_models;
      if (route && route.model && Array.isArray(route.fallback_providers) && route.fallback_providers.length) body.fallbackProviders = route.fallback_providers;
      const r = await postJson({ host, port, path: '/api/run', headers, timeoutMs, body });
      if (r.status >= 400) return { ok: false, summary: 'sidecar returned ' + r.status + ': ' + String(r.text || '').slice(0, 200), artifacts: [], usd: 0 };
      let text = ''; let usd = 0; let error = null; let ended = false;
      for (const line of r.text.split('\n')) {
        if (!line.trim()) continue;
        let e; try { e = JSON.parse(line); } catch { continue; /* non-JSON line */ }
        const p = e.payload || {};
        if (e.name === 'agent.token' && typeof p.delta === 'string') text += p.delta;
        else if (e.name === 'agent.run.end') { ended = true; if (typeof p.usd === 'number') usd = Math.max(usd, p.usd); }
        else if (e.name === 'agent.run.error') { error = String(p.message || 'agent run failed'); if (typeof p.usd === 'number') usd = Math.max(usd, p.usd); }
      }
      if (error) return { ok: false, summary: 'sidecar run failed: ' + error, artifacts: [], usd };
      if (!ended && !text) return { ok: false, summary: 'sidecar produced no result', artifacts: [], usd };
      const finalText = text.trim();
      if (!finalText) return { ok: false, summary: 'sidecar produced no text', artifacts: [], usd };
      const out = { ok: true, summary: finalText.slice(0, 4000), artifacts: [{ type: 'trace', ref: 'starnet://run/' + runId }], usd };
      if (role === 'qa') { const v = parseVerdictText(finalText); if (!v) return { ok: false, summary: 'reviewer gave no VERDICT: PASS|FAIL line', artifacts: out.artifacts, usd }; Object.assign(out, v); }
      return out;
    }
  };
}

function makeHttpExecutor({ url, token = '', idempotent = false, timeoutMs = 600000 }) {
  const u = new URL(url);
  return {
    idempotent,
    async run(ctx) {
      const headers = token ? { Authorization: 'Bearer ' + token } : {};
      const r = await postJson({ host: u.hostname, port: Number(u.port) || 80, path: u.pathname + u.search, headers, timeoutMs, body: { runId: ctx.runId, mission: ctx.mission, role: ctx.role, task: { id: ctx.issue.id, title: ctx.issue.title, description: ctx.issue.description }, checkpoint: ctx.checkpoint || null } });
      let j = null; try { j = JSON.parse(r.text); } catch { /* handled below */ }
      if (r.status >= 400 || !j) return { ok: false, summary: 'executor returned ' + r.status, artifacts: [], usd: 0 };
      return { ok: j.ok !== false, summary: String(j.summary || '').slice(0, 4000), artifacts: Array.isArray(j.artifacts) ? j.artifacts : [], usd: Number(j.usd) || 0, verdict: j.verdict, findings: j.findings };
    }
  };
}

module.exports = { makeSidecarExecutor, makeHttpExecutor, parseVerdictText };
