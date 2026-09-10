'use strict';

const assert = require('assert');
const {
  CITY_ARCHITECTURE_VERSION,
  CITY_DISTRICTS,
  COMPANY_SPACES,
  canonicalDistrictId,
  projectDistricts
} = require('../gateway/city-manifest');

assert.strictEqual(CITY_ARCHITECTURE_VERSION, 1);
assert.strictEqual(CITY_DISTRICTS.length, 15);
assert.strictEqual(new Set(CITY_DISTRICTS.map(d => d.id)).size, 15);
assert.strictEqual(COMPANY_SPACES.length, 3);

assert.strictEqual(canonicalDistrictId('Fashion & Merch'), 'market');
assert.strictEqual(canonicalDistrictId('e-commerce'), 'market');
assert.strictEqual(canonicalDistrictId('The Impact Office'), 'impact');
assert.strictEqual(canonicalDistrictId('nonprofit'), 'impact');
assert.strictEqual(canonicalDistrictId('Revenue District'), undefined);

const projected = projectDistricts(
  [{ id: 'market', status: 'healthy', revenue: 120 }],
  [
    { id: 'a1', district: 'Fashion', status: 'online' },
    { id: 'a2', district: 'Impact Office', status: 'busy' },
    { id: 'a3', district: 'Unknown', status: 'online' }
  ],
  [
    { id: 'm1', district: 'Market', status: 'running' },
    { id: 'm2', district: 'non-profit', status: 'queued' }
  ]
);

const market = projected.find(d => d.id === 'market');
const impact = projected.find(d => d.id === 'impact');
const bridge = projected.find(d => d.id === 'bridge');

assert.ok(market);
assert.strictEqual(market.name, 'The Market');
assert.strictEqual(market.status, 'healthy');
assert.strictEqual(market.agents, 1);
assert.strictEqual(market.active, 1);
assert.strictEqual(market.revenue, 120);
assert.ok(market.capabilities.includes('printify'));

assert.ok(impact);
assert.strictEqual(impact.name, 'Impact District');
assert.strictEqual(impact.agents, 1);
assert.strictEqual(impact.active, 1);
assert.strictEqual(impact.status, 'active');

assert.ok(bridge);
assert.strictEqual(bridge.status, 'ready');
assert.strictEqual(bridge.revenue, null);
assert.strictEqual(bridge.cost, null);

const postatees = COMPANY_SPACES.find(space => space.id === 'postatees');
assert.ok(postatees);
assert.ok(postatees.homeDistricts.includes('market'));
assert.ok(postatees.homeDistricts.includes('studio'));

console.log('city-manifest.test.js OK — 15 districts, aliases, tenant spaces, truthful projection');
