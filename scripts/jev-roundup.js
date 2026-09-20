#!/usr/bin/env node
// JEV District nightly decisions roundup - aggregates today's shadow ledger.
// America/Chicago day boundary. Output: markdown to stdout, no LLM calls.
const fs = require('fs');
const LEDGER = '/root/pauli-starnet/registry/jev-shadow-ledger.jsonl';
const tz = 'America/Chicago';
const today = new Date().toLocaleDateString('en-CA', { timeZone: tz }); // YYYY-MM-DD
const lines = fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').trim().split('\n').filter(Boolean) : [];
const rows = [];
for (const l of lines) {
  try {
    const d = JSON.parse(l);
    const day = new Date(d.ts).toLocaleDateString('en-CA', { timeZone: tz });
    if (day === today) rows.push(d);
  } catch {}
}
let cost = 0;
const byProvider = {};
const out = ['# JEV Decisions Roundup - ' + today + ' (America/Chicago)', ''];
out.push('decisions: ' + rows.length);
for (const r of rows) {
  const p = r.provider || 'unknown';
  byProvider[p] = (byProvider[p] || 0) + 1;
  cost += r.costUsd || 0;
}
out.push('providers: ' + Object.entries(byProvider).map(([k, v]) => k + '=' + v).join(', '));
out.push('estimated cost: $' + cost.toFixed(6));
out.push('');
out.push('| time | state (clipped) | agent | action | risk | approval | conf | provider | ms |');
out.push('|---|---|---|---|---|---|---|---|---|');
for (const r of rows) {
  const t = new Date(r.ts).toLocaleTimeString('en-US', { timeZone: tz, hour12: false });
  let st = '';
  try { st = (JSON.parse(r.state).mission || r.state).toString().slice(0, 60); } catch { st = String(r.state).slice(0, 60); }
  const a = r.answers || {};
  out.push('| ' + t + ' | ' + st.replace(/\|/g, '/') + ' | ' + (a.agent && a.agent.choice || '-') + ' | ' + (a.next_action && a.next_action.choice || '-') + ' | ' + (a.risk && a.risk.score || '-') + ' | ' + (a.requires_human_approval && a.requires_human_approval.answer || '-') + ' | ' + (a.confidence != null ? a.confidence : '-') + ' | ' + (r.provider || '-') + ' | ' + (r.latencyMs != null ? r.latencyMs : '-') + ' |');
}
console.log(out.join('\n'));
