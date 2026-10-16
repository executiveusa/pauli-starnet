#!/usr/bin/env node
'use strict';
// Heisenberg's tick, the ambient half of sidecar/district-foreman.js (program/city-247/CONTEXT.md).
// One run: settle finished missions, read every district queue from GitHub, decide, dispatch, write the board.
// Run it every few minutes on the server (deploy/systemd/starnet-foreman.timer); that is what "24/7" means here.
//
// Env (names only, values live in Infisical):
//   GITHUB_TOKEN               read the queue issues (write too, only with FOREMAN_GITHUB_WRITE=1)
//   GATEWAY_URL                default http://127.0.0.1:4000
//   GATEWAY_BEARER_TOKEN       the gateway's inbound token
//   STARNET_DISTRICT_STATE     default gateway/data/districts-state.json (the gateway serves it at /v1/districts)
//   FOREMAN_MAX_DISPATCH       missions one tick may start across the city (default 3)
//   FOREMAN_GITHUB_WRITE=1     comment results on the queue issues and label finished ones needs-review
const fs = require('fs');
const path = require('path');
const F = require('../../sidecar/district-foreman.js');

const ROOT = path.resolve(__dirname, '..', '..');

function makeForeman({ env = process.env, fetchImpl = globalThis.fetch, now = () => Date.now(), log = () => {} } = {}) {
  const gw = (env.GATEWAY_URL || 'http://127.0.0.1:4000').replace(/\/$/, '');
  const stateFile = env.STARNET_DISTRICT_STATE || path.join(ROOT, 'gateway', 'data', 'districts-state.json');
  const ghWrite = env.FOREMAN_GITHUB_WRITE === '1';

  async function call(url, init = {}, expectJson = true) {
    const res = await fetchImpl(url, init);
    const text = await res.text();
    if (!res.ok && res.status !== 202) throw new Error((init.method || 'GET') + ' ' + url.replace(/\?.*/, '') + ' -> ' + res.status + ': ' + text.slice(0, 160));
    return expectJson && text ? JSON.parse(text) : text;
  }
  const gwHeaders = { Authorization: 'Bearer ' + (env.GATEWAY_BEARER_TOKEN || ''), 'Content-Type': 'application/json' };
  const ghHeaders = () => {
    const h = { Accept: 'application/vnd.github+json', 'User-Agent': 'starnet-foreman' };
    if (env.GITHUB_TOKEN) h.Authorization = 'Bearer ' + env.GITHUB_TOKEN;
    return h;
  };

  function loadState() {
    try { return JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch (_) { return { districts: {} }; }
  }
  function saveState(s) {
    fs.mkdirSync(path.dirname(stateFile), { recursive: true });
    const tmp = stateFile + '.tmp-' + process.pid;
    fs.writeFileSync(tmp, JSON.stringify(s, null, 2));
    fs.renameSync(tmp, stateFile);
  }

  async function readQueue(repo) {
    // GitHub answers "list issues" with [] when Issues are turned off, which would look like an empty queue.
    const meta = await call('https://api.github.com/repos/' + repo, { headers: ghHeaders() });
    if (meta && meta.has_issues === false) throw new Error('Issues are disabled on this repo (enable them: Settings > General > Features > Issues)');
    const items = [];
    for (let page = 1; page <= 5; page++) {
      const list = await call('https://api.github.com/repos/' + repo + '/issues?state=open&per_page=100&page=' + page, { headers: ghHeaders() });
      for (const issue of list) {
        const it = F.itemFromIssue(issue);
        if (it.district) items.push({ ...it, repo });
      }
      if (list.length < 100) break;
    }
    return items;
  }

  // The district's own knowledge, cited, goes into the brief: transcripts are used, not stored.
  async function knowledgeFor(district, item) {
    try {
      // Any of the title's key words, ranked by how many match (websearch "or"): a long title must not need
      // every word in one passage, or nothing is ever found.
      const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'our', 'your', 'draft', 'make', 'build', 'create']);
      const words = (item.title || '').toLowerCase().replace(/[^\w\s-]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w));
      const q = [...new Set(words)].slice(0, 6).join(' or ');
      if (!q) return '';
      const r = await call(gw + '/v1/knowledge/search?district=' + encodeURIComponent(district) + '&limit=4&q=' + encodeURIComponent(q), { headers: gwHeaders });
      if (!r.results || !r.results.length) return '';
      return '\n\nDistrict knowledge (' + r.backend + '; cite by source and video id, verify claims before using them as facts):\n' +
        r.results.map(x => '- [' + x.source_id + ' ' + x.external_id + '] ' + (x.title || '') + ': ' + String(x.snippet).replace(/<\/?b>/g, '').replace(/\s+/g, ' ').slice(0, 300)).join('\n');
    } catch (e) { log('knowledge lookup failed: ' + e.message); return ''; }
  }

  async function comment(item, text) {
    if (!ghWrite || !item) return;
    await call('https://api.github.com/repos/' + item.repo + '/issues/' + item.number + '/comments', { method: 'POST', headers: { ...ghHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ body: text + '\n\n_Heisenberg (StarNet foreman)_' }) });
  }
  async function label(item, name) {
    if (!ghWrite || !item) return;
    await call('https://api.github.com/repos/' + item.repo + '/issues/' + item.number + '/labels', { method: 'POST', headers: { ...ghHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ labels: [name] }) });
  }

  function resultNote(result) {
    const lines = ['Mission `' + result.mission_id + '` ended **' + result.status + '**.'];
    if (result.receipt_id) lines.push('Receipt: `' + result.receipt_id + '`');
    if (result.summary) lines.push('', result.summary.slice(0, 1500));
    if (result.failures && result.failures.length) lines.push('', 'Failures: ' + result.failures.join('; ').slice(0, 500));
    if (result.human_blocker) lines.push('', 'Needs the owner: ' + (result.human_blocker.why || result.human_blocker.title || ''));
    return lines.join('\n');
  }

  async function tick() {
    const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry', 'districts.json'), 'utf8'));
    const state = loadState();
    state.districts = state.districts || {};
    const t = now();
    const errors = [];

    // 1. Read the queues (one call set per repo).
    const repos = [...new Set(registry.districts.map(d => d.queue.repo))];
    let items = [];
    const queueErrors = {};
    for (const repo of repos) {
      try { items = items.concat(await readQueue(repo)); }
      catch (e) {
        const why = /\b410\b|disabled/i.test(e.message) ? 'Issues are disabled on this repo (enable them: Settings > General > Features > Issues)' : e.message.slice(0, 160);
        queueErrors[repo] = why;
        errors.push('queue ' + repo + ': ' + why);
      }
    }
    const byNumber = new Map(items.map(i => [i.repo + '#' + i.number, i]));

    // 2. Settle missions that were in flight.
    for (const d of registry.districts) {
      const lane = state.districts[d.id];
      if (!lane || !lane.inflight) continue;
      try {
        const result = await call(gw + '/v1/missions/' + encodeURIComponent(lane.inflight.mission_id), { headers: gwHeaders });
        if (result.status === 'working') continue;
        state.districts[d.id] = F.settle(lane, lane.inflight, result, t);
        const item = byNumber.get(d.queue.repo + '#' + lane.inflight.issue);
        await comment(item, resultNote(result)).catch(e => errors.push('comment: ' + e.message));
        if (result.status === 'done') await label(item, 'needs-review').catch(e => errors.push('label: ' + e.message));
      } catch (e) { errors.push('settle ' + d.id + ': ' + e.message); }
    }

    // 3. Decide, then dispatch.
    const decisions = F.decide({ districts: registry.districts, items, state, now: t, maxDispatch: parseInt(env.FOREMAN_MAX_DISPATCH || '3', 10), queueErrors });
    for (const dec of decisions) {
      if (dec.action !== 'DISPATCH') continue;
      const item = dec.item;
      const missionId = 'd-' + dec.district + '-' + item.number + '-a' + dec.attempt;
      const brief = '[district:' + dec.district + '] #' + item.number + ' ' + item.title + '\n\n' + (item.body || '').slice(0, 4000) + await knowledgeFor(dec.district, item);
      try {
        const res = await call(gw + '/v1/missions', { method: 'POST', headers: gwHeaders, body: JSON.stringify({
          mission_id: missionId, request_id: missionId, trace_id: 'trace-' + missionId, target: 'starnet', route: 'city',
          user_intent: brief.slice(0, 8000), permissions: item.permissions
        }) });
        const inflight = { issue: item.number, mission_id: missionId, attempt: dec.attempt, started_at: new Date(t).toISOString() };
        let lane = { ...(state.districts[dec.district] || {}), inflight };
        if (res.status && res.status !== 'working') lane = F.settle(lane, inflight, res, t);   // parked or settled at once
        state.districts[dec.district] = lane;
        dec.mission_id = missionId;
      } catch (e) {
        errors.push('dispatch ' + dec.district + ' #' + item.number + ': ' + e.message);
        dec.action = 'BLOCKED';
        dec.question = 'Dispatch failed for #' + item.number + ': ' + e.message.slice(0, 160);
      }
      delete dec.item;
    }

    state.board = { at: new Date(t).toISOString(), queued_items: items.length, errors, districts: decisions.map(d => { const { item, ...rest } = d; return rest; }) };
    saveState(state);
    return state.board;
  }

  return { tick, stateFile };
}

if (require.main === module) {
  makeForeman({ log: m => process.stderr.write(m + '\n') }).tick()
    .then(board => {
      for (const d of board.districts) process.stdout.write(d.district.padEnd(14) + d.action.padEnd(9) + (d.issue ? '#' + d.issue + ' ' : '') + (d.question || d.reason || d.mission_id || '') + '\n');
      if (board.errors.length) { process.stderr.write(board.errors.join('\n') + '\n'); process.exitCode = 2; }
    })
    .catch(e => { process.stderr.write(String(e && e.stack || e) + '\n'); process.exit(1); });
}

module.exports = { makeForeman };
