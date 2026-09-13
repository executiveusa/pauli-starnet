/* pauli-foundry (chunk 8: agent-orchestrator patterns port) — headless proof: worktree-per-task
   with the collision law (two workers, one repo, never a shared path or branch); the CI repair
   loop turns a seeded red build green with bounded attempts and exhausts honestly; the reviewer
   loop addresses comments the same way; the PR gate refuses red CI; plugins fire in order and a
   throwing plugin is isolated; storage fails open. git/ci/repair/reviewer are all injected stubs -
   patterns against interfaces, no code copied. */
'use strict';
const A = require('./_assert.js');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { makePauliFoundry } = require('../sidecar/pauli-foundry.js');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pauli-foundry-test-'));
let now = 300000;
const clock = () => now;
let seq = 0;
const idgen = () => String(++seq).padStart(6, '0');

const worktrees = [];
const git = {
  addWorktree: ({ repo, path: p, branch }) => { worktrees.push({ repo, path: p, branch }); return { ok: true }; },
  removeWorktree: ({ path: p }) => { const i = worktrees.findIndex(w => w.path === p); if (i >= 0) worktrees.splice(i, 1); return { ok: true }; }
};
const mkFoundry = over => makePauliFoundry(Object.assign({ fs, pathMod: path, root, clock, idgen, crypto, git }, over));

// --- spawn + collision law (two workers, one repo) --------------------------
let foundry = mkFoundry({});
A.ok(!foundry.spawn({ repo: '', task: 'x' }).ok, 'spawn without repo refused');
const w1 = foundry.spawn({ repo: '/repo', task: 'Fix the census bug' });
A.eq(w1.ok, true, 'worker 1 spawns');
const w2 = foundry.spawn({ repo: '/repo', task: 'Fix the census bug' });
A.eq(w2.ok, true, 'worker 2 on the SAME repo spawns');
A.ok(w1.worker.worktree !== w2.worker.worktree, 'collision law: distinct worktree paths');
A.ok(w1.worker.branch !== w2.worker.branch, 'collision law: distinct branches');
A.ok(w1.worker.branch.startsWith('foundry/fix-the-census-bug-'), 'branch names carry the task slug');
A.ok(!foundry.spawn({ repo: '/repo', task: 'other', workerId: w1.worker.workerId }).ok, 'reusing an active workerId refused');
A.eq(foundry.status().workers.length, 2, 'status lists the pool');
A.eq(worktrees.length, 2, 'two live worktrees through the git adapter');

// --- CI repair loop with a seeded failing build ------------------------------
const repairCalls = [];
let ciRuns = 0;
foundry = mkFoundry({
  runCi: () => { ciRuns++; return ciRuns < 3 ? { pass: false, log: 'FAIL step ' + ciRuns } : { pass: true, log: 'green' }; },
  repair: ({ log, attempt }) => { repairCalls.push({ log, attempt }); }
});
const w3 = foundry.spawn({ repo: '/repo', task: 'seeded red build' }).worker;
const looped = foundry.ciLoop(w3.workerId, { maxAttempts: 5 });
A.eq(looped.pass, true, 'seeded red build goes green');
A.eq(looped.attempts, 3, 'three CI runs');
A.eq(repairCalls.length, 2, 'repair ran between failures, never after the pass');
A.eq(repairCalls[0].log, 'FAIL step 1', 'repair receives the failing log');
A.eq(looped.history.map(h => h.pass), [false, false, true], 'attempt history recorded');
A.eq(foundry.status(w3.workerId).workers[0].ci, 'green', 'worker marked green');

// exhaustion is honest
ciRuns = 0;
const w4 = foundry.spawn({ repo: '/repo', task: 'never green' }).worker;
foundry = mkFoundry({ runCi: () => ({ pass: false, log: 'still red' }), repair: () => {} });
const w5 = foundry.spawn({ repo: '/repo', task: 'never green' }).worker;
const tired = foundry.ciLoop(w5.workerId, { maxAttempts: 2 });
A.eq(tired.pass, false, 'exhausted loop reports no pass');
A.eq(tired.exhausted, true, 'exhaustion is an explicit flag, never a silent pass');
A.eq(tired.attempts, 2, 'attempt cap respected');

// --- PR gate ------------------------------------------------------------------
A.eq(foundry.openPr(w5.workerId, { title: 'red PR' }).error, 'ci-not-green', 'red CI cannot open a PR');
foundry = mkFoundry({
  runCi: () => ({ pass: true, log: 'green' }),
  repair: () => {},
  reviewer: ({ attempt }) => attempt === 1 ? { comments: ['add a test', 'name the constant'] } : { comments: [] }
});
const w6 = foundry.spawn({ repo: '/repo', task: 'green path' }).worker;
A.eq(foundry.openPr(w6.workerId, { title: 'too early' }).error, 'ci-not-green', 'unknown CI cannot open a PR either');
foundry.ciLoop(w6.workerId, {});
const reviewed = foundry.reviewLoop(w6.workerId, { maxAttempts: 3 });
A.eq(reviewed.approved, true, 'review loop approves after comments are addressed');
A.eq(reviewed.attempts, 2, 'one round of comments, one clean pass');
A.eq(reviewed.history[0].comments, ['add a test', 'name the constant'], 'comments recorded');
const pr = foundry.openPr(w6.workerId, { title: 'Ship it', body: 'green + approved' });
A.eq(pr.ok, true, 'green CI opens the PR');
A.eq(pr.pr.state, 'open', 'PR record lands open');
A.eq(pr.pr.branch, w6.branch, 'PR tracks the worker branch');

// review exhaustion
foundry = mkFoundry({ runCi: () => ({ pass: true }), repair: () => {}, reviewer: () => ({ comments: ['still wrong'] }) });
const w7 = foundry.spawn({ repo: '/repo', task: 'endless review' }).worker;
const rtired = foundry.reviewLoop(w7.workerId, { maxAttempts: 2 });
A.eq(rtired.approved, false, 'endless comments end unapproved');
A.eq(rtired.exhausted, true, 'review exhaustion explicit');

// --- plugin layer ---------------------------------------------------------------
foundry = mkFoundry({ runCi: () => ({ pass: true }), repair: () => {}, reviewer: () => ({ comments: [] }) });
const fired = [];
foundry.registerPlugin({ name: 'recorder', hooks: { beforeSpawn: () => fired.push('recorder.spawn'), afterCi: () => fired.push('recorder.ci') } });
foundry.registerPlugin({ name: 'broken', hooks: { beforeSpawn: () => { throw new Error('plugin bug'); } } });
foundry.registerPlugin({ name: 'late', hooks: { beforeSpawn: () => fired.push('late.spawn') } });
const w8 = foundry.spawn({ repo: '/repo', task: 'plugin order' }).worker;
foundry.ciLoop(w8.workerId, {});
A.eq(fired, ['recorder.spawn', 'late.spawn', 'recorder.ci'], 'plugins fire in registration order around the thrower');
const plog = foundry.pluginLog().events;
A.eq(plog.filter(e => e.plugin === 'broken').length, 1, 'throwing plugin recorded');
A.eq(plog.find(e => e.plugin === 'broken').ok, false, 'throwing plugin marked failed, pool unharmed');

// --- completion + fail-open -------------------------------------------------------
foundry.complete(w8.workerId);
A.ok(!foundry.ciLoop(w8.workerId, {}).ok, 'completed worker rejects further loops');
A.eq(worktrees.some(w => w.path === w8.worktree), false, 'completion releases the worktree');
const dead = makePauliFoundry({ fs, pathMod: path, root: path.join(root, 'no', '\0', 'dir'), clock, idgen, crypto, git, runCi: () => ({ pass: true }), repair: () => {}, reviewer: () => ({ comments: [] }) });
const dw = dead.spawn({ repo: '/repo', task: 'unwritable log' });
A.eq(dw.ok, true, 'spawn stands even when the event log cannot be written');

A.report();
