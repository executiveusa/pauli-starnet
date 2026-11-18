'use strict';
// one-system 02_walk_test: every district and agent must be walkable from files alone, on any model.
const assert = require('assert');
const { walkAll, parseCitizens } = require('../scripts/icm/walk.js');

let n = 0;
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); n++; };

// The roster reader handles the subset used here and reports what it cannot read.
const p = parseCitizens('version: 1\ndistrict: x\ncitizens:\n  - id: a\n    role: r\n    routes: [one, two]\n  - id: b\n    status: LIVE\n');
eq(p.district, 'x', 'top-level scalars');
eq(p.citizens.map(c => c.id), ['a', 'b'], 'list items');
eq(p.citizens[0].routes, ['one', 'two'], 'inline lists');
eq(parseCitizens('district: x\ncitizens:\nnonsense\n').errors.length, 1, 'unreadable lines are reported, not guessed');

const r = walkAll();
const failing = r.districts.filter(d => !d.ok).map(d => d.id + ': ' + d.problems.join('; '));
eq(r.entry.problems, [], 'START_HERE.md routes within the line limit and every path exists');
eq(failing, [], 'every district passes the walk test');
assert.ok(r.agents >= 13, 'agents are assigned (council seats included)'); n++;
console.log('icm-walk.test.js: ' + n + ' assertions passed (' + r.districts.length + ' districts, ' + r.agents + ' agents)');
