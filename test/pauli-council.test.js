/* pauli-council (chunk 3: multiplayer-ai port + COUNCIL.md protocol) — headless proof: rooms
   isolate per-participant keychains (cross reads denied, never leaked); the work queue is FIFO
   with monotonic seqs; the debate protocol enforces exactly 3 turns in advocate/critic/judge
   order with per-role information gating; the judge model must differ; the locked ruling carries
   the full COUNCIL.md §3 contract and lands on disk; 'halt' escalates instead of locking;
   close() emits a hashed minutes receipt to the ledger; storage failures fail open. */
'use strict';
const A = require('./_assert.js');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { makePauliCouncil } = require('../sidecar/pauli-council.js');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pauli-council-test-'));
let now = 1000000;
const clock = () => now;
let seq = 0;
const idgen = () => String(++seq).padStart(6, '0');
const mk = () => makePauliCouncil({ fs, pathMod: path, root, clock, idgen, crypto });

let council = mk();

// --- room + participants -------------------------------------------------
A.ok(!council.openRoom({ participants: [] }).ok, 'empty room refused');
A.ok(!council.openRoom({ participants: [{ id: 'a' }, { id: 'a' }] }).ok, 'duplicate participants refused');
const room = council.openRoom({ participants: [{ id: 'advocate-1', model: 'grok-4.5' }, { id: 'critic-1', model: 'qwen-3.5' }, { id: 'judge-1', model: 'claude-fable-5' }] });
A.eq(room.ok, true, 'room opens');
const roomId = room.roomId;

// --- keychain isolation (multiplayer-ai) ---------------------------------
A.eq(council.putSecret(roomId, 'advocate-1', 'openrouter-key', 'sk-adv').ok, true, 'participant writes own keychain');
A.ok(!council.putSecret(roomId, 'intruder', 'k', 'v').ok, 'non-participant cannot write');
const own = council.getSecret(roomId, 'advocate-1', 'advocate-1', 'openrouter-key');
A.eq(own, { ok: true, value: 'sk-adv' }, 'participant reads own secret');
const cross = council.getSecret(roomId, 'critic-1', 'advocate-1', 'openrouter-key');
A.eq(cross.ok, true, 'cross read is answered, not crashed');
A.eq(cross.denied, true, 'cross read denied');
A.eq(cross.value, null, 'cross read leaks nothing');
A.eq(council.getSecret(roomId, 'advocate-1', 'advocate-1', 'missing').value, null, 'missing key reads null');
A.ok(!council.getSecret(roomId, 'intruder', 'advocate-1', 'openrouter-key').ok, 'non-participant cannot read');

// --- work queue FIFO ------------------------------------------------------
A.ok(!council.enqueue(roomId, 'intruder', { t: 1 }).ok, 'non-participant cannot enqueue');
const q1 = council.enqueue(roomId, 'advocate-1', { task: 'score trend' });
const q2 = council.enqueue(roomId, 'critic-1', { task: 'risk check' });
const q3 = council.enqueue(roomId, 'advocate-1', { task: 'channel tick' });
A.ok(q1.seq < q2.seq && q2.seq < q3.seq, 'queue seqs are monotonic');
const drained = council.drain(roomId);
A.eq(drained.items.map(i => i.item.task), ['score trend', 'risk check', 'channel tick'], 'queue drains FIFO');
A.eq(council.drain(roomId).items, [], 'queue empty after drain');

// --- debate thresholds (COUNCIL.md §4) ------------------------------------
A.eq(council.requiresDebate({ blastRadius: 5, servicesTouched: 1 }), false, '$5 flat needs no debate');
A.eq(council.requiresDebate({ blastRadius: 5.01 }), true, 'blast radius > $5 requires debate');
A.eq(council.requiresDebate({ servicesTouched: 2 }), true, 'two services touched requires debate');
A.eq(council.requiresDebate({ servicesTouched: 1 }), false, 'one service needs no debate');

// --- debate protocol ------------------------------------------------------
A.ok(!council.startDebate(roomId, { proposal: ' ', advocateModel: 'grok-4.5', criticModel: 'qwen-3.5', judgeModel: 'claude-fable-5' }).ok, 'empty proposal refused');
A.ok(!council.startDebate(roomId, { proposal: 'x', advocateModel: 'same', criticModel: 'qwen-3.5', judgeModel: 'same' }).ok, 'judge == advocate model refused (COUNCIL.md §1)');
const deb = council.startDebate(roomId, { proposal: 'open a new revenue channel', advocateModel: 'grok-4.5', criticModel: 'qwen-3.5', judgeModel: 'claude-fable-5', expectedCost: 0.42 });
A.eq(deb.ok, true, 'debate starts');
const debateId = deb.debateId;
A.ok(debateId.startsWith('deb_'), 'debate id carries the deb_ prefix');

// information asymmetry: each role sees only what COUNCIL.md allows
A.eq(council.view(roomId, debateId, 'advocate').visible, { proposal: 'open a new revenue channel' }, 'advocate sees only the proposal');
A.ok(!council.speak(roomId, debateId, 'critic', 'premature').ok, 'critic cannot speak before advocate');
A.ok(!council.speak(roomId, debateId, 'judge', 'premature').ok, 'judge cannot speak() at all');
A.ok(!council.rule(roomId, debateId, { ruling: 'APPROVE', reasoning: 'too early' }).ok, 'judge cannot rule before both turns');
A.eq(council.speak(roomId, debateId, 'advocate', 'Thesis: it pays. 3 points: demand, margin, reach.').turn, 1, 'turn 1 is the advocate');
A.eq(council.view(roomId, debateId, 'critic').visible.advocate_arg, 'Thesis: it pays. 3 points: demand, margin, reach.', 'critic sees proposal + advocate');
A.eq(council.view(roomId, debateId, 'critic').visible.critic_arg, undefined, 'critic does not see their own turn early');
A.ok(!council.speak(roomId, debateId, 'advocate', 'again').ok, 'no rebuttals beyond turn order');
A.eq(council.speak(roomId, debateId, 'critic', 'Antithesis: it bleeds. 3 risks: CAC, churn, ops.').turn, 2, 'turn 2 is the critic');
const judgeView = council.view(roomId, debateId, 'judge').visible;
A.eq(judgeView.critic_arg, 'Antithesis: it bleeds. 3 risks: CAC, churn, ops.', 'judge sees both arguments');
A.ok(!council.speak(roomId, debateId, 'advocate', 'a third turn').ok, 'max 3 turns - no rebuttals (COUNCIL.md §5)');
A.ok(!council.rule(roomId, debateId, { ruling: 'MODIFY', reasoning: 'no text' }).ok, 'MODIFY without new proposal text refused');
A.ok(!council.rule(roomId, debateId, { ruling: 'APPROVE' }).ok, 'ruling without reasoning refused');

// locked ruling: full §3 contract
now += 5000;
const ruled = council.rule(roomId, debateId, { ruling: 'MODIFY', modifications: 'open the channel with a $500 pilot cap', reasoning: 'Demand is real; cap the blast radius.' });
A.eq(ruled.ok, true, 'judge rules on turn 3');
const locked = ruled.locked;
A.eq(locked.debate_id, debateId, 'contract carries debate_id');
A.eq(locked.proposal, 'open a new revenue channel', 'contract carries proposal');
A.eq(locked.advocate_arg.includes('Thesis'), true, 'contract carries advocate_arg');
A.eq(locked.critic_arg.includes('Antithesis'), true, 'contract carries critic_arg');
A.eq(locked.ruling, 'MODIFY', 'contract carries ruling');
A.eq(locked.modifications, 'open the channel with a $500 pilot cap', 'MODIFY carries the new text');
A.eq(locked.judge_model, 'claude-fable-5', 'contract names the judge model');
A.eq(locked.judge_reasoning, 'Demand is real; cap the blast radius.', 'contract carries reasoning');
A.eq(typeof locked.expires_at, 'string', 'contract sets a re-debate deadline');
A.ok(new Date(locked.expires_at).getTime() > now, 'expiry is in the future');
A.ok(!council.speak(roomId, debateId, 'advocate', 'late').ok, 'settled debate takes no more turns');
A.ok(!council.rule(roomId, debateId, { ruling: 'APPROVE', reasoning: 'again' }).ok, 'settled debate cannot re-rule');
const day = new Date(now).toISOString().slice(0, 10);
const decisionsFile = path.join(root, 'pauli-council', 'decisions', day, debateId + '.json');
A.eq(fs.existsSync(decisionsFile), true, 'locked ruling saved to icm decisions layout');
A.eq(JSON.parse(fs.readFileSync(decisionsFile, 'utf8').trim()).ruling, 'MODIFY', 'saved ruling round-trips');

// halt escalates, never auto-proceeds
const deb2 = council.startDebate(roomId, { proposal: 'nuke the archive batch', advocateModel: 'grok-4.5', criticModel: 'qwen-3.5', judgeModel: 'claude-fable-5' });
council.speak(roomId, deb2.debateId, 'advocate', 'for');
council.speak(roomId, deb2.debateId, 'critic', 'against');
const halted = council.rule(roomId, deb2.debateId, { ruling: 'halt' });
A.eq(halted, { ok: true, escalated: true }, 'halt escalates to the human');
A.ok(!council.rule(roomId, deb2.debateId, { ruling: 'APPROVE', reasoning: 'override' }).ok, 'escalated debate cannot be re-ruled');

// --- minutes receipt on close ----------------------------------------------
now += 1000;
council.enqueue(roomId, 'advocate-1', { task: 'unhandled' });
const closed = council.close(roomId);
A.eq(closed.ok, true, 'room closes');
const receipt = closed.receipt;
A.eq(receipt.participants, ['advocate-1', 'critic-1', 'judge-1'], 'receipt lists participants');
A.eq(receipt.debates.length, 2, 'receipt covers both debates');
A.eq(receipt.debates[0].ruling, 'MODIFY', 'receipt carries the ruling');
A.eq(receipt.debates[1].escalated, true, 'receipt carries the escalation');
A.eq(receipt.queue_depth_unhandled, 1, 'receipt counts unhandled queue work');
A.eq(typeof receipt.receiptHash, 'string', 'receipt is hashed');
const minutes = fs.readFileSync(path.join(root, 'pauli-council', 'minutes.jsonl'), 'utf8').trim().split('\n');
A.eq(minutes.length, 1, 'minutes ledger appended once');
A.eq(JSON.parse(minutes[0]).receiptHash, receipt.receiptHash, 'ledger receipt matches the returned receipt');
A.ok(!council.putSecret(roomId, 'advocate-1', 'k', 'v').ok, 'closed room rejects writes');
A.ok(!council.close(roomId).ok, 'double close refused');

// fail-open storage
const dead = makePauliCouncil({ fs, pathMod: path, root: path.join(root, 'no', '\0', 'dir'), clock, idgen, crypto });
const droom = dead.openRoom({ participants: [{ id: 'a' }] });
dead.startDebate(droom.roomId, { proposal: 'x', advocateModel: 'm1', criticModel: 'm2', judgeModel: 'm3' });
A.eq(dead.close(droom.roomId).ok, true, 'close succeeds even when the ledger cannot be written');

A.report();
