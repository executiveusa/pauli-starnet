'use strict';

// Pure StarNet-side Jev adapter. Ambient fetch/env stay in sidecar/index.js.
// OFF means OFF: disabled calls return locally and never touch the network.
function makeJevClient(opts) {
  opts = opts || {};
  const fetchImpl = opts.fetchImpl;
  const endpoint = String(opts.endpoint || '').trim();
  const hardOff = opts.hardOff === true;

  async function decide(input) {
    input = input || {};
    if (input.enabled !== true) {
      return { ok: true, bypassed: true, disabled: true, reason: 'jev_toggle_off' };
    }
    if (hardOff) {
      return { ok: false, bypassed: true, disabled: true, reason: 'server_kill_switch' };
    }
    if (typeof fetchImpl !== 'function') {
      return { ok: false, error: 'jev_fetch_unavailable' };
    }
    if (!endpoint) {
      return { ok: false, error: 'jev_endpoint_unconfigured' };
    }

    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json',
        'x-starnet-jev-enabled': '1'
      },
      body: JSON.stringify({ state: input.state })
    });

    const text = await response.text();
    let body = text;
    try { body = text ? JSON.parse(text) : null; } catch (_) {}

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: body
      };
    }
    return body && typeof body === 'object' ? body : { ok: true, result: body };
  }

  return { decide };
}

module.exports = { makeJevClient };
