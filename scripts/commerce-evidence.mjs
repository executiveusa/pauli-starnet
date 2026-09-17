#!/usr/bin/env node
/* Record real Commerce District work in the gateway evidence feed.
   Usage:
     GATEWAY_URL=... GATEWAY_BEARER_TOKEN=... node scripts/commerce-evidence.mjs start ecom-beacon "Research Etsy digital offers"
     ... node scripts/commerce-evidence.mjs settle ecom-beacon <task-id> completed
   This script never schedules work or calls a model. A real worker brackets real work with it. */
const [action, agentId, value, outcome] = process.argv.slice(2);
const base = String(process.env.GATEWAY_URL || '').replace(/\/$/, '');
const token = process.env.GATEWAY_BEARER_TOKEN || '';
if (!base || !token) throw new Error('GATEWAY_URL and GATEWAY_BEARER_TOKEN are required');
if (!['start','settle'].includes(action)) throw new Error('action must be start or settle');
const body = action === 'start'
  ? { action, agentId, task: value }
  : { action, agentId, taskId: value, outcome: outcome === 'failed' ? 'failed' : 'completed' };
const r = await fetch(base + '/v1/commerce/evidence', { method:'POST', headers:{ authorization:'Bearer '+token, 'content-type':'application/json' }, body:JSON.stringify(body) });
const data = await r.json();
if (!r.ok) throw new Error(r.status + ' ' + JSON.stringify(data));
console.log(JSON.stringify({ taskId:data.task_id, status:data.status, agentId:data.context && data.context.agentId, receiptId:data.receipt && data.receipt.receipt_id }));
