/* board.js - the city's board (program/starnet-v2/08_city-live, PRD §1.3): dollars earned, outcomes finished,
   factory products finished, spend. Every number is read from a ledger the gateway keeps; none is estimated.
   A ledger with no rows reports has_data:false, never $0 or 0 claimed as measured.
   - dollars: the revenue ledger. Money is red (D4), so only the captain records income (POST /v1/revenue).
   - outcomes: the mission desk's own records (done / failed / waiting on the captain / working).
   - factory: the intake queue and its exit verdicts (done needs the judge AND security receipts, see intake.settle).
   - spend: gateway/spend.js (the same numbers the kill switch and month cap act on). */
'use strict';

const fs = require('fs');
const path = require('path');

const OFFERS = ['kindle', 'smart-sites', 'ai-employee', 'other'];

function makeRevenue({ file, now = () => Date.now() }) {
  function rows() {
    let txt = '';
    try { txt = fs.readFileSync(file, 'utf8'); } catch (_) { return []; }
    const out = [];
    for (const line of txt.split('\n')) {
      if (!line) continue;
      try { const r = JSON.parse(line); if (r && typeof r.usd === 'number' && r.ts) out.push(r); } catch (_) { /* torn line */ }
    }
    return out;
  }
  // The captain records money that actually arrived. `ref` is the order/payout id, never a buyer's name or contact.
  function record({ by, usd, offer, ref }) {
    const n = Number(usd);
    if (by !== 'captain') return { code: 403, body: { error: 'only the captain records revenue (by: "captain")' } };
    if (!Number.isFinite(n) || n <= 0 || n > 100000) return { code: 400, body: { error: 'usd must be a positive amount up to 100000' } };
    if (!OFFERS.includes(offer)) return { code: 400, body: { error: 'offer must be ' + OFFERS.join(', ') } };
    if (typeof ref !== 'string' || !/^[A-Za-z0-9_.:#-]{1,80}$/.test(ref)) return { code: 400, body: { error: 'ref must be an order or payout id (letters, digits, _.:#-, at most 80)' } };
    const row = { ts: new Date(now()).toISOString(), usd: Math.round(n * 100) / 100, offer, ref, by: 'captain' };
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, JSON.stringify(row) + '\n', { mode: 0o600 });
    return { code: 201, body: { revenue: row } };
  }
  return { rows, record };
}

function makeBoard({ revenue, missions, intake, spend, now = () => Date.now() }) {
  const month = t => new Date(t).toISOString().slice(0, 7);
  const day = t => new Date(t).toISOString().slice(0, 10);
  const r2 = n => Math.round(n * 100) / 100;

  function dollars(t) {
    const all = revenue ? revenue.rows() : [];
    const m = all.filter(r => r.ts.slice(0, 7) === month(t));
    const byOffer = {};
    for (const r of m) byOffer[r.offer] = r2((byOffer[r.offer] || 0) + r.usd);
    return { has_data: all.length > 0, month_usd: r2(m.reduce((a, r) => a + r.usd, 0)), all_time_usd: r2(all.reduce((a, r) => a + r.usd, 0)), by_offer: byOffer, source: 'revenue ledger (captain-recorded)' };
  }
  function outcomes(t) {
    const all = missions ? missions.list() : [];
    const count = (list, s) => list.filter(x => x.status === s).length;
    const m = all.filter(x => String(x.completed_at || x.accepted_at || '').slice(0, 7) === month(t));
    const byDistrict = {};
    for (const x of m) if (x.status === 'done') byDistrict[x.district] = (byDistrict[x.district] || 0) + 1;
    return {
      has_data: all.length > 0,
      month: { done: count(m, 'done'), failed: count(m, 'failed'), waiting_on_captain: count(m, 'needs_human') },
      working_now: count(all, 'working'),
      done_by_district: byDistrict,
      source: 'mission desk'
    };
  }
  function factory(t) {
    const all = intake ? intake.read() : [];
    const m = all.filter(r => String(r.day || '').slice(0, 7) === month(t));
    const count = s => m.filter(r => r.status === s).length;
    return {
      has_data: all.length > 0,
      today_intake: all.filter(r => r.day === day(t)).length,
      month: { queued: count('queued'), building: count('building'), done: count('done'), failed: count('failed') },
      done: all.filter(r => r.status === 'done').map(r => ({ id: r.id, repo: r.repo, settled_at: r.settled_at || null })).slice(-20),
      source: 'factory intake + exit verdicts'
    };
  }
  function summary() {
    const t = now();
    return { generated_at: new Date(t).toISOString(), dollars: dollars(t), outcomes: outcomes(t), factory: factory(t), spend: spend ? spend.summary() : { has_data: false } };
  }
  return { summary };
}

/* Missions as city activity (PRD §1.1: every movement is driven by a real event). A mission the desk accepted is a
   task the city can see: bound to the roster agent whose district the mission was routed to (that body walks to its
   post in that district), else to Heisenberg, who holds every mission ("Heisenberg has the mission"). The intent text
   never leaves the gateway: only the district rides along. Returns the gateway activeTasks row shape. */
const MISSION_STATE = { working: 'running', done: 'completed', failed: 'failed', needs_human: 'accepted' };
function missionTasks(list, citizens, limit = 20) {
  const roster = Array.isArray(citizens) ? citizens : [];
  const hero = roster.find(c => c && (c.id === 'agent' || c.role === 'orchestrator')) || null;
  return (Array.isArray(list) ? list : []).slice(0, limit).map(m => {
    const own = roster.find(c => c && c.district === m.district && c !== hero) || null;
    const who = own || hero;
    return {
      id: 'mission:' + m.mission_id,
      status: MISSION_STATE[m.status] || 'unknown',
      task: '',
      context: { district: m.district, source: 'mission', agentId: who ? who.id : null },
      startedAt: m.accepted_at || null,
      completedAt: m.completed_at || null,
      receiptId: null
    };
  });
}

module.exports = { makeBoard, makeRevenue, missionTasks, OFFERS };
