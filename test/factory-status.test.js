'use strict';
// frontend/app/factory-status.js: the reducer renders only what the stream says, and never stale data as live.
const assert = require('assert');
const FS = require('../frontend/app/factory-status.js');
let n = 0;
const ok = (v, m) => { assert.ok(v, m); n++; };
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); n++; };

let m = FS.fresh();
eq(Object.keys(m.agents).length, 0, 'nothing is shown before the first resync');
m = FS.applyEvent(m, { id: 'e-1', type: 'factory.resync', data: { epoch: 'e', stopped: false, missions: [], agents: { pi: { name: 'Pi', role: 'engineer', state: 'sleeping', evidence: { source: 'none' } } } } });
eq(m.agents.pi.state, 'sleeping', 'resync installs the server snapshot');
m = FS.applyEvent(m, { id: 'e-2', type: 'factory.agent.state', data: { key: 'pi', to: 'working', mission: 'M-1', evidence: { source: 'bridge-checkpoint', runId: 'run-abcdef12' } } });
ok(m.agents.pi.state === 'working' && m.agents.pi.evidence.runId === 'run-abcdef12', 'a transition event moves the state and keeps its evidence');
ok(m.lastEventId === 'e-2', 'the last event id is tracked for replay on reconnect');
m = FS.applyEvent(m, { id: 'e-3', type: 'factory.handoff', data: { mission: 'M-1', stage: 'review', from: 'heisenberg', to: 'qa', issueId: 'i-2' }, at: 't' });
eq(m.handoffs[0].to, 'qa', 'handoffs are logged from real events');
const off = FS.markDisconnected(m);
ok(off.connected === false && off.agents.pi.state === 'unknown' && off.agents.pi.evidence === null, 'disconnect turns every state into unknown, never stale-as-live');
ok(/offline/.test(FS.renderHtml(off)), 'the panel says it is offline');
ok(/run [a-z0-9]{8}/.test(FS.renderHtml(Object.assign({}, m, { connected: true }))), 'a working row shows the run id that backs it');
ok(!/<script/.test(FS.renderHtml(FS.applyEvent(m, { id: 'e-4', type: 'factory.agent.state', data: { key: 'pi', to: 'working', mission: '<script>x</script>', evidence: null } }))), 'event text is escaped');
const parsed = FS.parseFrames('id: a-1\nevent: factory.agent.state\ndata: {"key":"pi"}\n\nid: a-2\nevent: fact');
eq(parsed.events.length, 1, 'a torn trailing frame is held back, not guessed');
eq(parsed.rest, 'id: a-2\nevent: fact', 'the partial frame is kept for the next chunk');
console.log('factory-status.test.js: ' + n + ' assertions passed');
