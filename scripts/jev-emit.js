#!/usr/bin/env node
// JEV shadow emitter CLI - any lane POSTs a decision to the shadow and gets
// a receipt. Usage: node jev-emit.js '<state-json>' ['<questions-json>']
// Exit 0 + JSON response on stdout. Never throws on shadow failure (exit 3).
const [stateArg, questionsArg] = process.argv.slice(2);
if (!stateArg) { console.error('usage: jev-emit.js <state-json> [questions-json]'); process.exit(2); }
const body = { state: JSON.parse(stateArg) };
if (questionsArg) body.questions = JSON.parse(questionsArg);
fetch('http://127.0.0.1:8794/api/jev-decision', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-starnet-jev-enabled': '1' },
  body: JSON.stringify(body),
  signal: AbortSignal.timeout(30000),
}).then(async (r) => {
  const t = await r.text();
  console.log(t);
  process.exit(r.ok ? 0 : 3);
}).catch((e) => { console.error(JSON.stringify({ ok: false, error: e.message })); process.exit(3); });
