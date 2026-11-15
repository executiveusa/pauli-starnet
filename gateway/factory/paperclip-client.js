'use strict';
// STARFACTORY-001: thin REST client for the ONE canonical mission authority (Paperclip).
// Endpoints follow docs.paperclip.ing / docs/api (issues, agents, approvals, activity, costs).
// This client holds no state. Every mutating call during a heartbeat can carry X-Paperclip-Run-Id.

class PaperclipError extends Error {
  constructor(status, message, body) {
    super('paperclip ' + status + ': ' + message);
    this.status = status;
    this.body = body;
  }
}

function makePaperclipClient({ baseUrl, token, companyId, fetchImpl, timeoutMs = 15000 }) {
  if (!baseUrl) throw new Error('PAPERCLIP_URL is required');
  if (!token) throw new Error('PAPERCLIP_TOKEN is required');
  if (!companyId) throw new Error('PAPERCLIP_COMPANY_ID is required');
  const f = fetchImpl || globalThis.fetch;
  const root = String(baseUrl).replace(/\/+$/, '') + '/api';

  async function call(method, path, { body, runId, query } = {}) {
    let url = root + path;
    if (query) {
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
      const s = q.toString();
      if (s) url += '?' + s;
    }
    const headers = { Authorization: 'Bearer ' + token, Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (runId) headers['X-Paperclip-Run-Id'] = runId;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    let res;
    try {
      res = await f(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: ctl.signal });
    } catch (e) {
      throw new PaperclipError(0, e && e.name === 'AbortError' ? 'request timed out' : (e && e.message) || 'network error');
    } finally { clearTimeout(timer); }
    const text = await res.text();
    let json = null;
    if (text) { try { json = JSON.parse(text); } catch { json = null; } }
    if (!res.ok) throw new PaperclipError(res.status, (json && json.error) || res.statusText || 'request failed', json);
    return json;
  }

  const c = (p) => '/companies/' + encodeURIComponent(companyId) + p;
  return {
    companyId,
    health: () => call('GET', c('')),
    listAgents: () => call('GET', c('/agents')),
    getAgent: (id) => call('GET', '/agents/' + encodeURIComponent(id)),
    pauseAgent: (id) => call('POST', '/agents/' + encodeURIComponent(id) + '/pause'),
    resumeAgent: (id) => call('POST', '/agents/' + encodeURIComponent(id) + '/resume'),
    invokeHeartbeat: (id) => call('POST', '/agents/' + encodeURIComponent(id) + '/heartbeat/invoke'),
    cancelRun: (runId) => call('POST', '/heartbeat-runs/' + encodeURIComponent(runId) + '/cancel'),
    listIssues: (query) => call('GET', c('/issues'), { query }),
    getIssue: (id) => call('GET', '/issues/' + encodeURIComponent(id)),
    createIssue: (body) => call('POST', c('/issues'), { body }),
    patchIssue: (id, body, runId) => call('PATCH', '/issues/' + encodeURIComponent(id), { body, runId }),
    checkout: (id, body, runId) => call('POST', '/issues/' + encodeURIComponent(id) + '/checkout', { body, runId }),
    release: (id, runId) => call('POST', '/issues/' + encodeURIComponent(id) + '/release', { runId }),
    listComments: (id) => call('GET', '/issues/' + encodeURIComponent(id) + '/comments'),
    addComment: (id, body, runId) => call('POST', '/issues/' + encodeURIComponent(id) + '/comments', { body, runId }),
    listApprovals: (status) => call('GET', c('/approvals'), { query: { status } }),
    activity: () => call('GET', c('/activity')),
    costsSummary: () => call('GET', c('/costs/summary')),
    costsByAgent: () => call('GET', c('/costs/by-agent'))
  };
}

module.exports = { makePaperclipClient, PaperclipError };
