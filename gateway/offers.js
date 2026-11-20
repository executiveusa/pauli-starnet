/* offers.js - mission templates for the money loops (program/starnet-v2/10_offers, PRD §2).
   A template (registry/offers/<id>.json) is an ordered list of steps. plan(template, inputs) turns it into what the city
   can act on: the GREEN steps up to the first gate become MissionEnvelopes for POST /v1/missions ("[district:x]" prefix,
   read-only permissions, the step's persona named in the intent); every later step waits behind that gate. A yellow
   step waits for the captain's tap, a red one is always a person (captain or client): neither ever becomes a mission.
   Inputs are checked against the template's patterns, so a client name or contact can never be pasted into an intent. */
'use strict';

const fs = require('fs');
const path = require('path');

const TIERS = ['green', 'yellow', 'red'];

function loadTemplates(dir) {
  const out = {};
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
    const t = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    out[t.id] = t;
  }
  return out;
}

// Structural check of one template against the persona library and the district registry. Returns a list of problems.
function check(t, { personas, districts }) {
  const bad = [];
  const pIndex = new Map((personas || []).map(p => [p.id, p]));
  const dIds = new Set((districts || []).map(d => d.id));
  if (!t || t.format !== 'starnet-offer-template/v1') return ['format must be starnet-offer-template/v1'];
  if (!/^[a-z0-9-]{2,40}$/.test(t.id || '')) bad.push('bad id');
  if (!Array.isArray(t.inputs) || !t.inputs.some(i => i.name === 'job_id')) bad.push(t.id + ': needs a job_id input');
  for (const i of t.inputs || []) { try { new RegExp(i.pattern); } catch (_) { bad.push(t.id + ': input ' + i.name + ' has no valid pattern'); } }
  const seen = new Set();
  if (!Array.isArray(t.steps) || !t.steps.length) return bad.concat([t.id + ': no steps']);
  for (const s of t.steps) {
    const where = t.id + '/' + s.id;
    if (seen.has(s.id)) bad.push(where + ': duplicate step id'); seen.add(s.id);
    if (!TIERS.includes(s.tier)) bad.push(where + ': tier must be green, yellow or red');
    if (!dIds.has(s.district)) bad.push(where + ': unknown district ' + s.district);
    if (s.tier !== 'green' && !['captain', 'client'].includes(s.gate_owner)) bad.push(where + ': a gate needs gate_owner captain or client');
    if (s.tier === 'green' && !s.via) {
      const p = pIndex.get(s.persona);
      if (!p) bad.push(where + ': persona ' + s.persona + ' is not in the library');
      else if (p.action !== 'allow') bad.push(where + ': persona ' + s.persona + ' is ' + p.action + ' by the skill guard; use an allowed one');
    }
    for (const m of String(s.intent || '').matchAll(/\{\{(\w+)\}\}/g)) if (!(t.inputs || []).some(i => i.name === m[1])) bad.push(where + ': intent uses unknown input ' + m[1]);
  }
  if (!t.steps.some(s => s.judge)) bad.push(t.id + ': no judge step (deliverables are checked by a different model family)');
  if (!t.steps.some(s => s.tier === 'red')) bad.push(t.id + ': no red step (money and go-live are always a person)');
  return bad;
}

function plan(t, inputs) {
  const vals = {};
  for (const i of t.inputs) {
    const v = inputs && inputs[i.name] != null ? String(inputs[i.name]) : '';
    if (!v) { if (i.required) return { error: 'missing input ' + i.name }; continue; }
    if (!new RegExp(i.pattern).test(v)) return { error: 'input ' + i.name + ' does not match ' + i.pattern };
    vals[i.name] = v;
  }
  const fill = s => String(s).replace(/\{\{(\w+)\}\}/g, (_, k) => vals[k] || '');
  const applies = s => !s.when || (([k, v]) => vals[k] === v)(s.when.split('='));
  const steps = t.steps.filter(applies);
  const ready = [], waiting = [];
  let gate = null;
  for (const s of steps) {
    if (gate || s.tier !== 'green') {
      if (!gate && s.tier !== 'green') gate = { step: s.id, tier: s.tier, owner: s.gate_owner, title: s.title };
      waiting.push({ step: s.id, tier: s.tier, behind: gate.step });
      continue;
    }
    if (s.via === 'factory') { gate = { step: s.id, tier: 'green', owner: 'factory', title: s.title }; waiting.push({ step: s.id, tier: s.tier, behind: s.id }); continue; }
    const id = 'offer:' + t.id + ':' + vals.job_id + ':' + s.id;
    ready.push({
      mission_id: id, request_id: id, trace_id: 'offer-' + t.id + '-' + vals.job_id,
      target: 'starnet', route: 'city', permissions: ['research'],
      user_intent: '[district:' + s.district + '] [persona:' + s.persona + '] ' + fill(s.intent) + ' Deliverables: ' + (s.deliverables || []).join(', ') + '.'
    });
  }
  return { offer: t.id, job_id: vals.job_id, ready, gate, waiting };
}

module.exports = { loadTemplates, check, plan, TIERS };
