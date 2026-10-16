/* pauli-board (board mode: persona seats, weighted vote, chair ruling - built INTO the council) —
   headless proof: board debates open with 2..8 seats and an independent chair; seats speak in
   declared order, each seeing only the seats before it (the information gate generalizes); votes
   are weighted into a tally; the chair locks the section-3 contract extended with statements,
   tally and a scored recommendation; 'halt' escalates; the ASTRA gate prices and refuses BEFORE
   any model call; every run leaves a hashed receipt. The 3-turn debate path is untouched. */
'use strict';
const A = require('./_assert.js');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { makePauliCouncil } = require('../sidecar/pauli-council.js');
const { makePauliCouncilRunner } = require('../sidecar/pauli-council-runner.js');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pauli-board-test-'));
let now = 2000000;
const clock = () => now;
let seq = 0;
const idgen = () => String(++seq).padStart(6, '0');
const PRICES = {
  'free-seat': { inputPerMToken: 0, outputPerMToken: 0 },
  'free-chair': { inputPerMToken: 0, outputPerMToken: 0 },
  'grok-4.5': { inputPerMToken: 0.20, outputPerMToken: 0.50 },
  'claude-fable-5': { inputPerMToken: 3.00, outputPerMToken: 15.00 },
  'gpt-6-astra': { inputPerMToken: 10.00, outputPerMToken: 30.00 }
};
const SEATS = [
  { id: 'operator', model: 'free-seat', weight: 2 },
  { id: 'finance', model: 'grok-4.5' },                 // weight defaults to 1
  { id: 'skeptic', model: 'free-seat' }
];
const CHAIR = 'claude-fable-5';
const PROPOSAL = 'launch the roast-room board'; // 27 chars -> 7 tokens
const GRANT = { missionId: 'msn-board', provider: 'openrouter', model: 'claude-fable-5', expiresAt: 3000000, budgetUSD: 1.00 };

const mkCouncil = () => makePauliCouncil({ fs, pathMod: path, root, clock, idgen, crypto });
const mkRunner = (council, callModel) => makePauliCouncilRunner({ council, callModel, prices: PRICES, fs, pathMod: path, root, clock, idgen, crypto });
const mkRoom = council => council.openRoom({ participants: [{ id: 'p1' }] }).roomId;

// --- council rules: opening a board ----------------------------------------
let council = mkCouncil();
let roomId = mkRoom(council);
A.ok(!council.startBoardDebate(roomId, { proposal: ' ', seats: SEATS, chairModel: CHAIR }).ok, 'empty proposal refused');
A.ok(!council.startBoardDebate(roomId, { proposal: PROPOSAL, seats: [SEATS[0]], chairModel: CHAIR }).ok, 'fewer than 2 seats refused');
A.ok(!council.startBoardDebate(roomId, { proposal: PROPOSAL, seats: SEATS.concat([{ id: 'operator', model: 'grok-4.5' }]), chairModel: CHAIR }).ok, 'duplicate seat id refused');
A.ok(!council.startBoardDebate(roomId, { proposal: PROPOSAL, seats: [{ id: 'x', model: 'free-seat', weight: 0 }, SEATS[1]], chairModel: CHAIR }).ok, 'zero weight refused');
A.ok(!council.startBoardDebate(roomId, { proposal: PROPOSAL, seats: SEATS, chairModel: 'free-seat' }).ok, 'chair sharing a seat model refused (independence)');
A.ok(!council.startBoardDebate(roomId, { proposal: PROPOSAL, seats: SEATS }).ok, 'missing chair refused');
const opened = council.startBoardDebate(roomId, { proposal: PROPOSAL, seats: SEATS, chairModel: CHAIR, expectedCost: 0 });
A.eq(opened.ok, true, 'board debate opens');
const deb = opened.debateId;

// --- ordered turns + the information gate -----------------------------------
A.ok(!council.boardSpeak(roomId, deb, 'finance', { text: 'early', vote: 'APPROVE' }).ok, 'out-of-order seat refused');
A.ok(!council.boardSpeak(roomId, deb, 'operator', { text: ' ', vote: 'APPROVE' }).ok, 'empty statement refused');
A.ok(!council.boardSpeak(roomId, deb, 'operator', { text: 'go', vote: 'YAS' }).ok, 'bad vote refused');
const v0 = council.boardView(roomId, deb, 'operator').visible;
A.eq((v0.statements || []).length, 0, 'first seat sees the proposal only');
A.eq(council.boardSpeak(roomId, deb, 'operator', { text: 'Ship it lean.', vote: 'APPROVE', reason: 'cheap to try' }).ok, true, 'seat 1 speaks');
const v1 = council.boardView(roomId, deb, 'finance').visible;
A.eq(v1.statements.length, 1, 'second seat sees exactly the seats before it');
A.eq(v1.statements[0].seat, 'operator', 'ordered reveal carries the prior seat');
A.eq(v1.statements[0].weight, undefined, 'seats do not see each others weights - the chair weighs');
council.boardSpeak(roomId, deb, 'finance', { text: 'Margin first.', vote: 'MODIFY', reason: 'cap spend' });
const v2 = council.boardView(roomId, deb, 'skeptic').visible;
A.eq(v2.statements.length, 2, 'third seat sees two prior statements');
council.boardSpeak(roomId, deb, 'skeptic', { text: 'Funnel bait risk.', vote: 'REJECT', reason: 'unverified quality' });
A.ok(!council.boardSpeak(roomId, deb, 'operator', { text: 'again', vote: 'APPROVE' }).ok, 'no re-speaks: every seat speaks once');
const early = council.startBoardDebate(roomId, { proposal: PROPOSAL, seats: SEATS, chairModel: CHAIR }).debateId;
council.boardSpeak(roomId, early, 'operator', { text: 'first only', vote: 'APPROVE' });
A.ok(!council.boardRule(roomId, early, { ruling: 'APPROVE', reasoning: 'r', recommendation: 'x' }).ok, 'chair cannot rule before every seat has spoken');
const cv = council.boardView(roomId, deb, 'chair').visible;
A.eq(cv.statements.length, 3, 'chair sees every statement');
A.eq(cv.tally.APPROVE, 2, 'tally weights the operator seat x2');
A.eq(cv.tally.REJECT, 1, 'tally counts the reject');
A.eq(cv.tally.MODIFY, 1, 'tally counts the modify');

// --- chair ruling contract --------------------------------------------------
A.ok(!council.boardRule(roomId, deb, { ruling: 'APPROVE', reasoning: 'fine' }).ok, 'missing recommendation refused');
A.ok(!council.boardRule(roomId, deb, { ruling: 'MODIFY', reasoning: 'r', recommendation: 'x' }).ok, 'MODIFY without new text refused');
const ruled = council.boardRule(roomId, deb, {
  ruling: 'MODIFY', modifications: 'pilot on one real decision', reasoning: 'votes split; cap the blast radius',
  recommendation: 'Run one NW Kids board with free seats, review the receipt.', scores: { confidence: 7, dissent: 4 }
});
A.eq(ruled.ok, true, 'chair locks the ruling');
A.eq(ruled.locked.mode, 'board', 'locked contract carries board mode');
A.eq(ruled.locked.statements.length, 3, 'locked contract carries the statements');
A.eq(ruled.locked.tally.MODIFY, 1, 'locked contract carries the tally');
A.eq(ruled.locked.chair_model, CHAIR, 'locked contract names the chair model');
A.eq(ruled.locked.recommendation.includes('NW Kids'), true, 'scored recommendation locked');
A.ok(!council.boardSpeak(roomId, deb, 'operator', { text: 'late', vote: 'APPROVE' }).ok, 'settled board refuses more turns');
const day = new Date(clock()).toISOString().slice(0, 10);
A.ok(fs.existsSync(path.join(root, 'pauli-council', 'decisions', day, deb + '.json')), 'locked ruling persisted');

// --- halt escalates ----------------------------------------------------------
council = mkCouncil();
roomId = mkRoom(council);
const h = council.startBoardDebate(roomId, { proposal: PROPOSAL, seats: SEATS, chairModel: CHAIR }).debateId;
council.boardSpeak(roomId, h, 'operator', { text: 'a', vote: 'APPROVE' });
council.boardSpeak(roomId, h, 'finance', { text: 'b', vote: 'APPROVE' });
council.boardSpeak(roomId, h, 'skeptic', { text: 'c', vote: 'REJECT' });
const halted = council.boardRule(roomId, h, { ruling: 'halt' });
A.eq(halted.escalated, true, 'halt escalates to the human');

// --- minutes receipt carries board debates ----------------------------------
const closed = council.close(roomId);
A.eq(closed.ok, true, 'room closes');
A.eq(closed.receipt.debates[0].mode, 'board', 'minutes receipt marks the board debate');
A.eq(closed.receipt.debates[0].turns, 3, 'minutes receipt counts statements as turns');

// --- runner: estimate + gates ------------------------------------------------
council = mkCouncil();
let runner = mkRunner(council, () => ({ text: '{}' }));
const est = runner.estimateBoard({ proposal: PROPOSAL, seats: SEATS, chairModel: CHAIR });
A.eq(est.ok, true, 'board estimate succeeds');
A.eq(est.estimate.mode, 'board', 'estimate marked board');
A.eq(est.estimate.turns.length, 4, 'estimate covers 3 seats + chair');
A.eq(est.estimate.turns[0].inputTokens, 7, 'first seat input is the proposal only');
A.eq(est.estimate.turns[1].inputTokens, 407, 'second seat input grows by one expected statement');
A.eq(est.estimate.turns[3].role, 'chair', 'chair priced last');
A.eq(est.estimate.turns[0].costUSD, 0, 'free seat costs $0');
A.ok(est.estimate.totalCostUSD > 0, 'paid seats and chair still priced');
A.ok(!runner.estimateBoard({ proposal: PROPOSAL, seats: [{ id: 'm', model: 'mystery' }, SEATS[0]], chairModel: CHAIR }).ok, 'unpriced seat model refused');
A.ok(!runner.estimateBoard({ proposal: PROPOSAL, seats: SEATS, chairModel: 'free-seat' }).ok, 'chair conflict refused at estimate');

const calls = [];
const boardStub = (req) => {
  calls.push(req);
  if (req.role === 'chair') return { text: JSON.stringify({ ruling: 'APPROVE', judge_reasoning: 'strong yes', recommendation: 'ship the pilot', scores: { confidence: 8, dissent: 2 } }), usage: { costUSD: 0.02 } };
  return { text: JSON.stringify({ position: req.seat + ' position', vote: 'APPROVE', reason: 'r' }), usage: { costUSD: 0 } };
};
const allFree = { missionId: 'msn-board', provider: 'openrouter', model: 'free-seat', expiresAt: 3000000, budgetUSD: 0.5 };
roomId = mkRoom(council);
A.ok(!runner.runBoard({ roomId, proposal: PROPOSAL, seats: SEATS, chairModel: CHAIR }).ok, 'no grant -> refused (deny-by-default)');
A.eq(calls.length, 0, 'no model call without a grant');
A.ok(!runner.runBoard({ roomId, proposal: PROPOSAL, seats: SEATS, chairModel: CHAIR, grant: Object.assign({}, GRANT, { budgetUSD: 0.0000001 }) }).ok, 'over-budget refused before any call');
A.ok(!runner.runBoard({ roomId, proposal: PROPOSAL, seats: SEATS, chairModel: 'gpt-6-astra', grant: GRANT }).ok, 'cheap grant does not unlock an Astra chair');
A.eq(calls.length, 0, 'gates refuse before any model call');

// --- runner: happy path with the information gate in prompts -----------------
calls.length = 0;
council = mkCouncil();
runner = mkRunner(council, boardStub);
roomId = mkRoom(council);
const ran = runner.runBoard({ roomId, proposal: PROPOSAL, seats: SEATS, chairModel: CHAIR, grant: GRANT, seatInstructions: { operator: 'BRAIN: lean operator docs' } });
A.eq(ran.ok, true, 'granted board run executes');
A.eq(calls.map(c => c.role), ['seat', 'seat', 'seat', 'chair'], 'workers called in protocol order');
A.ok(calls[0].prompt.includes('BRAIN: lean operator docs'), 'seat brain folder content reaches its seat prompt');
A.ok(!calls[0].prompt.includes('SEAT finance'), 'first seat prompt carries no other seat');
A.ok(calls[1].prompt.includes('SEAT operator'), 'second seat prompt carries the first seat');
A.ok(!calls[1].prompt.includes('SEAT skeptic'), 'second seat prompt does not leak the third');
A.ok(calls[3].prompt.includes('WEIGHTED TALLY: APPROVE=4'), 'chair prompt carries the weighted tally (operator weight 2 + two x1)');
A.eq(calls.every(c => c.missionId === 'msn-board'), true, 'every call bound to the mission');
A.eq(ran.result.locked.ruling, 'APPROVE', 'locked ruling returned');
A.eq(ran.result.receipt.mode, 'board', 'receipt marked board');
A.eq(typeof ran.result.receipt.receiptHash, 'string', 'receipt hashed');
const ledger = fs.readFileSync(path.join(root, 'pauli-council', 'executions.jsonl'), 'utf8').trim().split('\n');
A.eq(JSON.parse(ledger[ledger.length - 1]).receiptHash, ran.result.receipt.receiptHash, 'board receipt landed in the mission ledger');

// --- runner: failure shapes ---------------------------------------------------
council = mkCouncil();
const badSeat = mkRunner(council, (req) => ({ text: req.role === 'chair' ? '{}' : 'not json' }));
A.eq(badSeat.runBoard({ roomId: mkRoom(council), proposal: PROPOSAL, seats: SEATS, chairModel: CHAIR, grant: GRANT }).error, 'seat-unparseable', 'non-JSON seat output refuses cleanly');
council = mkCouncil();
const haltChair = mkRunner(council, (req) => ({ text: req.role === 'chair' ? JSON.stringify({ ruling: 'halt' }) : JSON.stringify({ position: 'p', vote: 'APPROVE', reason: 'r' }) }));
const hrun = haltChair.runBoard({ roomId: mkRoom(council), proposal: PROPOSAL, seats: SEATS, chairModel: CHAIR, grant: GRANT });
A.eq(hrun.result.escalated, true, 'chair halt escalates');
A.eq(hrun.result.locked, null, 'no locked ruling on halt');
A.eq(hrun.result.receipt.outcome, 'escalated', 'receipt records the escalation');

// free-first: an all-free board prices at $0 and passes a $0 budget
council = mkCouncil();
const freeSeats = [{ id: 'a', model: 'free-seat' }, { id: 'b', model: 'free-seat' }];
const freeRunner = mkRunner(council, boardStub);
const freeEst = freeRunner.estimateBoard({ proposal: PROPOSAL, seats: freeSeats, chairModel: 'free-chair' });
A.eq(freeEst.estimate.totalCostUSD, 0, 'all-free board estimates $0');
A.ok(!freeRunner.estimateBoard({ proposal: PROPOSAL, seats: freeSeats, chairModel: 'free-chair' }).estimate.astra, 'no astra in free lineup');

A.report();
