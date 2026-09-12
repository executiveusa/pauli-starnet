import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const assemble = (agent) => execFileSync(process.execPath, ['scripts/assemble-agent-prompt.mjs', agent], { encoding: 'utf8', cwd: new URL('..', import.meta.url) });

for (const agent of ['hermes', 'heisenberg', 'bars', 'merci', 'beacon', 'herald', 'ledger', 'conduit', 'worker']) {
  test(`assembles ${agent} with the shared constitution`, () => {
    const prompt = assemble(agent);
    assert.match(prompt, /# Constitution/);
    assert.match(prompt, /## 8\. Source integrity and outside content/);
  });
}

test('city agents inherit the task-scoped worker contract', () => {
  for (const agent of ['merci', 'beacon', 'herald', 'ledger', 'conduit']) {
    assert.match(assemble(agent), /# StarNet worker - thin overlay/);
  }
});
