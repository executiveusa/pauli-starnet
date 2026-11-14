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

function makeSidecarExecutor({ port = 8787, host = '127.0.0.1', token = '', agentId, idempotent = true, timeoutMs = 600000 }) {
  return {
    idempotent,
    async run({ issue, role, mission, runId }) {
      const headers = token ? { 'X-StarNet-Token': token, Authorization: 'Bearer ' + token } : {};
      const r = await postJson({ host, port, path: '/api/run', headers, timeoutMs, body: { agentId, text: issue.description || issue.title, taskId: runId, context: { factory: { mission, role, issueId: issue.id } } } });
      if (r.status >= 400) return { ok: false, summary: 'sidecar returned ' + r.status, artifacts: [], usd: 0 };
      let finalText = null; let usd = 0;
      for (const line of r.text.split('\n')) {
        if (!line.trim()) continue;
        try { const e = JSON.parse(line); if (e.type === 'agent' && e.text) finalText = e.text; if (typeof e.usd === 'number') usd = Math.max(usd, e.usd); } catch { /* ignore non-JSON line */ }
      }
      if (!finalText) return { ok: false, summary: 'sidecar produced no result', artifacts: [], usd };
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
