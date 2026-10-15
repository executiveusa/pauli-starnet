'use strict';
// The gateway's knowledge desk (knowledge/CONTEXT.md). One question for every agent: "what does my district
// know about X?" Answers come from the self-hosted Supabase (kb_search over PostgREST) when it is configured,
// otherwise from the transcripts in this repo. Every answer says which backend produced it, so an agent never
// mistakes the small file fallback for the full database.
const fs = require('fs');
const path = require('path');
const L = require('../scripts/knowledge/lib.js');

const DISTRICT_RE = /^[a-z][a-z0-9-]{0,39}$/;

function makeKnowledgeDesk({ supabaseUrl, supabaseKey, fetchImpl = globalThis.fetch, root = path.resolve(__dirname, '..') } = {}) {
  const registry = JSON.parse(fs.readFileSync(path.join(root, 'knowledge', 'sources.json'), 'utf8'));
  const useDb = !!(supabaseUrl && supabaseKey);
  let fileIndex = null;

  function routedSources(district) {
    return new Set(registry.sources.filter(s => !district || s.routes.some(r => r.district === district)).map(s => s.id));
  }

  function buildFileIndex() {
    const docs = [];
    for (const s of registry.sources) {
      if (s.status !== 'indexed') continue;
      const dir = path.join(root, s.location);
      if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;
      for (const name of L.pickFiles(fs.readdirSync(dir))) {
        const p = L.parseTranscript(name, fs.readFileSync(path.join(dir, name), 'utf8'));
        if (p.text.length < 200) continue;
        for (const body of L.chunkText(p.text)) docs.push({ source_id: s.id, external_id: p.external_id || name, title: p.title, url: p.url, body, lower: body.toLowerCase() });
      }
    }
    return docs;
  }

  function fileSearch(q, district, limit) {
    if (!fileIndex) fileIndex = buildFileIndex();
    const terms = q.toLowerCase().split(/\W+/).filter(t => t.length > 2);
    if (!terms.length) return [];
    const allowed = routedSources(district);
    const scored = [];
    for (const d of fileIndex) {
      if (!allowed.has(d.source_id)) continue;
      let score = 0, hit = -1;
      for (const t of terms) {
        let i = d.lower.indexOf(t), n = 0;
        if (i >= 0 && hit < 0) hit = i;
        while (i >= 0 && n < 20) { n++; i = d.lower.indexOf(t, i + t.length); }
        if (!n) { score = 0; break; }                       // every term must appear, like websearch_to_tsquery AND
        score += n;
      }
      if (score) scored.push({ d, score, hit });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(({ d, score, hit }) => ({
      source_id: d.source_id, external_id: d.external_id, title: d.title, url: d.url,
      snippet: d.body.slice(Math.max(0, hit - 120), hit + 240).trim(), rank: score
    }));
  }

  async function rest(pathAndQuery, init = {}) {
    const res = await fetchImpl(supabaseUrl.replace(/\/$/, '') + '/rest/v1/' + pathAndQuery, {
      ...init,
      headers: { apikey: supabaseKey, Authorization: 'Bearer ' + supabaseKey, 'Content-Type': 'application/json', ...(init.headers || {}) }
    });
    const text = await res.text();
    if (!res.ok) throw new Error('knowledge db ' + res.status + ': ' + text.slice(0, 200));
    return text ? JSON.parse(text) : null;
  }

  function check(q, district, limit) {
    if (typeof q !== 'string' || !q.trim() || q.length > 300) return 'q is required (<= 300 chars)';
    if (district && !DISTRICT_RE.test(district)) return 'district must be a district id';
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) return 'limit must be 1..50';
    return null;
  }

  async function search({ q, district = null, limit = 8 }) {
    const bad = check(q, district, limit);
    if (bad) return { code: 400, body: { error: bad } };
    if (useDb) {
      const results = await rest('rpc/kb_search', { method: 'POST', body: JSON.stringify({ p_query: q, p_district: district, p_limit: limit }) });
      return { code: 200, body: { backend: 'supabase', district, q, results } };
    }
    return { code: 200, body: { backend: 'files', district, q, results: fileSearch(q, district, limit), note: 'repo transcripts only; on_server sources need the database' } };
  }

  async function insights({ district, status = null }) {
    if (!district || !DISTRICT_RE.test(district)) return { code: 400, body: { error: 'district is required' } };
    if (status && !['draft', 'reviewed', 'rejected'].includes(status)) return { code: 400, body: { error: 'bad status' } };
    if (useDb) {
      const filter = 'district=eq.' + encodeURIComponent(district) + (status ? '&status=eq.' + status : '');
      const rows = await rest('kb_insights?select=id,source_id,kind,title,body,evidence,status&' + filter + '&order=id');
      return { code: 200, body: { backend: 'supabase', district, insights: rows } };
    }
    return { code: 200, body: { backend: 'files', district, insights: [], note: 'insights live in the database; load it with scripts/knowledge/ingest.js' } };
  }

  function sources(district) {
    if (district && !DISTRICT_RE.test(district)) return { code: 400, body: { error: 'district must be a district id' } };
    const list = registry.sources
      .filter(s => !district || s.routes.some(r => r.district === district))
      .map(s => ({ id: s.id, title: s.title, status: s.status, routes: s.routes }));
    return { code: 200, body: { backend: useDb ? 'supabase' : 'files', sources: list } };
  }

  return { search, insights, sources, backend: useDb ? 'supabase' : 'files' };
}

module.exports = { makeKnowledgeDesk };
