'use strict';
const test = require('node:test');
const A = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { loadRegistry, selectSkills, chairPicks, pickBoardSkills } = require('../sidecar/pauli-board-skills.js');

const BOARD_DIR = path.join(__dirname, '..', 'districts', 'pauli', 'board');

test('registry: every skill has a file, a seat, keywords and cited sources', () => {
  const reg = loadRegistry(BOARD_DIR);
  A.equal(reg.ok, true, 'registry errors: ' + JSON.stringify(reg.errors));
  A.ok(reg.skills.length >= 6, 'seth + hormozi sets present');
  for (const s of reg.skills) {
    A.ok(fs.existsSync(path.join(BOARD_DIR, s.path)), s.id + ' file exists');
    A.ok(s.keywords.length >= 3, s.id + ' has keywords');
    A.ok(s.sources.length >= 1, s.id + ' cites sources');
    const body = fs.readFileSync(path.join(BOARD_DIR, s.path), 'utf8');
    A.ok(/Sources:/.test(body), s.id + ' file carries a Sources line');
  }
});

test('registry: missing dir fails open, never throws', () => {
  const reg = loadRegistry(path.join(os.tmpdir(), 'no-such-board-dir'));
  A.equal(reg.ok, false);
  A.equal(reg.skills.length, 0);
});

test('registry: path escape and source-less entries are rejected', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reg-'));
  fs.mkdirSync(path.join(tmp, 'skills'));
  fs.writeFileSync(path.join(tmp, 'skills', 'registry.json'), JSON.stringify({ skills: [
    { id: 'bad/escape', seat: 'x', title: 'x', path: '../outside.md', sources: ['s'] },
    { id: 'bad/nosources', seat: 'x', title: 'x', path: 'ok.md', sources: [] }
  ] }));
  const reg = loadRegistry(tmp);
  A.equal(reg.ok, false);
  A.equal(reg.skills.length, 0);
  A.equal(reg.errors.length, 2);
});

test('selection: deterministic, ranked by distinct keyword hits, id tie-break', () => {
  const reg = loadRegistry(BOARD_DIR);
  const picks = selectSkills('fix churn in our subscription billing and pricing tiers', reg.skills);
  A.equal(picks[0].id, 'hormozi/retention-and-money-models');
  const again = selectSkills('fix churn in our subscription billing and pricing tiers', reg.skills);
  A.deepEqual(picks, again, 'same input, same picks');
});

test('selection: no hits means empty, not a guess', () => {
  const reg = loadRegistry(BOARD_DIR);
  A.deepEqual(selectSkills('zxqvkj unrelated tokens', reg.skills), []);
});

test('chair picks: real ids honored, invented ids dropped', () => {
  const reg = loadRegistry(BOARD_DIR);
  const picks = chairPicks(['seth/shipping-and-courage', 'seth/not-a-skill'], reg.skills);
  A.equal(picks.length, 1);
  A.equal(picks[0].id, 'seth/shipping-and-courage');
});

test('receipt block: chair wins over matcher, matcher fills when chair silent', () => {
  const reg = { boardDir: BOARD_DIR };
  const chair = pickBoardSkills({ ...reg, proposal: 'p', verdict: { skills: ['hormozi/offer-architecture'], recommendation: 'sell stuff' } });
  A.equal(chair.pickedBy, 'chair');
  A.equal(chair.skills[0].id, 'hormozi/offer-architecture');
  const matched = pickBoardSkills({ ...reg, proposal: 'our email campaign funnel for the launch', verdict: {} });
  A.equal(matched.pickedBy, 'match');
  A.ok(matched.skills.length > 0);
  const none = pickBoardSkills({ boardDir: null, proposal: 'p', verdict: {} });
  A.equal(none, null, 'no registry -> skills omitted from the receipt');
});
