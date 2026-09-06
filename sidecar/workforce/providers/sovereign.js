'use strict';

// Provider-neutral contract for owned compute. The service behind baseUrl may be a
// VPS VM broker, container-desktop broker, bare-metal pool, or future StarNet daemon.
// StarNet talks only to this stable contract.

function makeSovereignProvider(opts) {
  opts = opts || {};
  const baseUrl = String(opts.baseUrl || '').replace(/\/+$/, '');
  const token = String(opts.token || '');
  const request = opts.request || defaultRequest;

  function configured() { return Boolean(baseUrl && token); }

  function spec(method, path, body) {
    if (!configured()) throw new Error('SOVEREIGN_COMPUTE_NOT_CONFIGURED');
    return {
      method,
      url: baseUrl + path,
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: body || null
    };
  }

  async function call(method, path, body) {
    return request(spec(method, path, body));
  }

  return {
    id: 'sovereign',
    configured,
    safeSummary() { return { id: 'sovereign', configured: configured(), baseConfigured: Boolean(baseUrl) }; },
    createSpec(input) {
      input = input || {};
      const name = String(input.name || '').trim();
      if (!name) throw new Error('computer name required');
      return spec('POST', '/v1/computers', {
        name,
        image: input.image || 'nicks-stack',
        imageVersion: input.imageVersion || '0.2.2',
        agentId: input.agentId || null,
        ephemeral: input.ephemeral === true,
        resources: {
          cpu: Number(input.cpu || 2),
          ramGb: Number(input.ramGb || 4),
          diskGb: Number(input.diskGb || 40)
        }
      });
    },
    createComputer(input) { const s = this.createSpec(input); return request(s); },
    startComputer(id) { return call('POST', '/v1/computers/' + encodeURIComponent(id) + '/start'); },
    stopComputer(id) { return call('POST', '/v1/computers/' + encodeURIComponent(id) + '/stop'); },
    snapshotComputer(id) { return call('POST', '/v1/computers/' + encodeURIComponent(id) + '/snapshot'); },
    destroyComputer(id) { return call('DELETE', '/v1/computers/' + encodeURIComponent(id)); },
    getComputer(id) { return call('GET', '/v1/computers/' + encodeURIComponent(id)); },
    listComputers() { return call('GET', '/v1/computers'); }
  };
}

async function defaultRequest(spec) {
  if (typeof fetch !== 'function') throw new Error('fetch unavailable');
  const init = { method: spec.method, headers: spec.headers };
  if (spec.body != null) init.body = JSON.stringify(spec.body);
  const r = await fetch(spec.url, init);
  const text = await r.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch (_) { data = { raw: text }; }
  if (!r.ok) {
    const e = new Error('SOVEREIGN_COMPUTE_HTTP_' + r.status);
    e.status = r.status;
    e.body = data;
    throw e;
  }
  return data;
}

module.exports = { makeSovereignProvider };
