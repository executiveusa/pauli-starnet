'use strict';

// Optional Orgo adapter. StarNet owns policy; Orgo is only a compute provider.
// Creation is explicit and never happens during status/plan calls.

function makeOrgoProvider(opts) {
  opts = opts || {};
  const apiBase = String(opts.apiBase || 'https://www.orgo.ai/api').replace(/\/+$/, '');
  const apiKey = String(opts.apiKey || '');
  const workspaceId = String(opts.workspaceId || '');
  const request = opts.request || defaultRequest;

  function configured() { return Boolean(apiKey && workspaceId); }

  function createSpec(input) {
    input = input || {};
    if (!configured()) throw new Error('ORGO_NOT_CONFIGURED');
    const name = String(input.name || '').trim();
    if (!name) throw new Error('computer name required');
    return {
      method: 'POST',
      url: apiBase + '/computers',
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: {
        workspace_id: workspaceId,
        name,
        template_ref: input.templateRef || 'default/nicks-stack@0.2.2',
        ram: Number(input.ram || 4),
        cpu: Number(input.cpu || 2)
      }
    };
  }

  async function createComputer(input) {
    const spec = createSpec(input);
    const response = await request(spec);
    return { provider: 'orgo', response };
  }

  return {
    id: 'orgo',
    configured,
    createSpec,
    createComputer,
    safeSummary() { return { id: 'orgo', configured: configured(), workspaceConfigured: Boolean(workspaceId) }; }
  };
}

async function defaultRequest(spec) {
  if (typeof fetch !== 'function') throw new Error('fetch unavailable');
  const r = await fetch(spec.url, {
    method: spec.method,
    headers: spec.headers,
    body: JSON.stringify(spec.body)
  });
  const text = await r.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch (_) { data = { raw: text }; }
  if (!r.ok) {
    const e = new Error('ORGO_HTTP_' + r.status);
    e.status = r.status;
    e.body = data;
    throw e;
  }
  return data;
}

module.exports = { makeOrgoProvider };
