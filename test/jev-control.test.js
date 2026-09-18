'use strict';

const assert = require('node:assert/strict');
const { makeJevClient } = require('../sidecar/jev-client.js');

async function main() {
  let calls = 0;
  const clientOff = makeJevClient({
    endpoint: 'https://example.test/api/jev-decision',
    fetchImpl: async () => { calls++; throw new Error('must not call'); }
  });

  const off = await clientOff.decide({ enabled: false, state: { task: 'inspect' } });
  assert.equal(off.bypassed, true);
  assert.equal(off.reason, 'jev_toggle_off');
  assert.equal(calls, 0, 'OFF must make zero network calls');

  let seen = null;
  const clientOn = makeJevClient({
    endpoint: 'https://example.test/api/jev-decision',
    fetchImpl: async (url, init) => {
      calls++;
      seen = { url, init };
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ ok: true, answers: { agent: { choice: 'hermes' } } })
      };
    }
  });

  const on = await clientOn.decide({ enabled: true, state: { task: 'route' } });
  assert.equal(on.ok, true);
  assert.equal(on.answers.agent.choice, 'hermes');
  assert.equal(calls, 1);
  assert.equal(seen.url, 'https://example.test/api/jev-decision');
  assert.equal(seen.init.headers['x-starnet-jev-enabled'], '1');
  assert.deepEqual(JSON.parse(seen.init.body), { state: { task: 'route' } });

  const hardOff = makeJevClient({
    endpoint: 'https://example.test',
    hardOff: true,
    fetchImpl: async () => { calls++; throw new Error('must not call'); }
  });
  const killed = await hardOff.decide({ enabled: true, state: {} });
  assert.equal(killed.reason, 'server_kill_switch');
  assert.equal(calls, 1, 'hard-off must make zero additional calls');

  console.log('jev-control: PASS');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
