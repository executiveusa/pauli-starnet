/* supervisor (firstmate port, chunk 1) — headless proof: dispatch profiles name merge authority;
   holds carry one concrete question + options; resume needs an explicit answer; status survives a
   "restart" (fresh supervisor over the same dir); reconcile marks confirmed-dead workers stale;
   the zero-token watcher returns only NEW events; worktree names are deterministic. */
'use strict';
const A = require('./_assert.js');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { makeSupervisor } = require('../sidecar/supervisor.js');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'supervisor-test-'));
let now = 1000;
const clock = () => now;
const mk = () => makeSupervisor({ fs, pathMod: path, root, clock });

let sup = mk();
A.eq(Object.keys(sup.PROFILES), ['no-mistakes', 'direct-PR', 'local-only'], 'three dispatch profiles');

// dispatch validation
A.ok(!sup.dispatch({ taskId: 'Bad ID!', profile: 'no-mistakes', title: 'x' }).ok, 'bad taskId refused');
A.ok(!sup.dispatch({ taskId: 't1', profile: 'yolo', title: 'x' }).ok, 'unknown profile refused');
A.ok(!sup.dispatch({ taskId: 't1', profile: 'no-mistakes' }).ok, 'title required');
A.eq(sup.dispatch({ taskId: 't1', profile: 'no-mistakes', title: 'fix the thing' }).ok, true, 'dispatch lands');
A.ok(!sup.dispatch({ taskId: 't1', profile: 'no-mistakes', title: 'dup' }).ok, 'duplicate taskId refused');
A.eq(sup.status('t1').mergeAuthority, 'captain-approval', 'no-mistakes keeps merge authority with the captain');
A.eq(sup.status('t1').state, 'working', 'fresh task works');

// hold lifecycle
A.ok(!sup.hold('t1', { question: '', options: ['a'] }).ok, 'hold without a concrete question refused');
A.ok(!sup.hold('t1', { question: 'which way?', options: [] }).ok, 'hold without options refused');
A.eq(sup.hold('t1', { question: 'merge to main or keep the branch?', options: ['merge', 'keep'] }).ok, true, 'real hold lands');
A.eq(sup.status('t1').state, 'held', 'task held');
A.ok(!sup.complete('t1', { outcome: 'x' }).ok, 'a held task cannot complete');
A.ok(!sup.resume('t1', { answer: ' ' }).ok, 'resume without an answer refused');
A.eq(sup.resume('t1', { answer: 'keep the branch' }).ok, true, 'explicit answer resumes');
A.eq(sup.status('t1').holds[0].answer, 'keep the branch', 'answer recorded on the hold');
A.eq(sup.complete('t1', { outcome: 'branch kept, PR open', evidence: 'pr #9' }).ok, true, 'completion lands');
A.eq(sup.status('t1').state, 'done', 'task done');

// durability across a "restart"
now = 2000;
sup = mk();
A.eq(sup.status('t1').state, 'done', 'status survives a fresh supervisor over the same dir');
A.eq(sup.list().length, 1, 'list reads durable records');

// reconcile: confirmed-dead workers go stale, never invented
sup.dispatch({ taskId: 't2', profile: 'direct-PR', title: 'parallel job' });
sup.dispatch({ taskId: 't3', profile: 'local-only', title: 'another job' });
const rec = sup.reconcile(['t3']);
A.eq(rec.stale, ['t2'], 'only the missing live worker goes stale');
A.eq(sup.status('t2').state, 'stale', 't2 stale');
A.eq(sup.status('t3').state, 'working', 't3 untouched');
A.eq(sup.status('t1').state, 'done', 'completed work never stales');

// zero-token watcher: only NEW events, in order, with a monotone cursor
now = 3000;
const first = sup.poll(0);
A.ok(first.events.length >= 6, 'log replays from zero');
A.ok(first.events.every((e, i, arr) => i === 0 || e.seq > arr[i - 1].seq), 'events strictly ordered');
const cursor = first.nextSeq;
A.eq(sup.poll(cursor).events.length, 0, 'idle poll returns nothing - the watcher sleeps for free');
sup.dispatch({ taskId: 't4', profile: 'no-mistakes', title: 'late task' });
const second = sup.poll(cursor);
A.eq(second.events.length, 1, 'poll returns only the new event');
A.eq(second.events[0].kind, 'dispatch', 'new event is the dispatch');
A.eq(second.events[0].taskId, 't4', 'event names its task');
A.ok(second.nextSeq > cursor, 'cursor advances');

// worktree names
A.eq(sup.worktreeFor('t4').branch, 'pauli/t4', 'deterministic branch name');
A.ok(sup.worktreeFor('t4').path.endsWith(path.join('worktrees', 't4')), 'worktree path under root');
A.eq(sup.worktreeFor('nope!'), null, 'bad slug gets no worktree');

A.report('supervisor');
