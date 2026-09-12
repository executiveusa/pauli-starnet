'use strict';
const assert = require('assert');
const { CATALOG } = require('../sidecar/line-templates/catalog.js');
assert.strictEqual(CATALOG.length, 16, 'duplicates/no-value fragments removed from upstream 19');
assert.ok(!CATALOG.some(x => x.id === 'ship-out'), 'terminal fragment is not presented as orchestration');
assert.strictEqual(CATALOG.filter(x => x.id === 'load-spread').length, 1, 'parallel crew/load balancer normalized');
for (const t of CATALOG) {
  assert.ok(!t.effects.some(x => ['external-send', 'publish', 'spend'].includes(x)), t.id + ' stays preparatory');
  for (const s of t.stages.filter(x => x.mode === 'fan-out')) assert.strictEqual(s.join, true, t.id + ' fan-out rejoins');
}
console.log('line-templates.catalog.test.js OK');
