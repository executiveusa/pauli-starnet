'use strict';
const test = require('node:test');
const A = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { loadRegistry, selectSkills, chairPicks, pickBoardSkills, termHits } = require('../sidecar/pauli-board-skills.js');

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

test('registry: missing dir fails open with an errors array, never throws', () => {
  const reg = loadRegistry(path.join(os.tmpdir(), 'no-such-board-dir'));
  A.equal(reg.ok, false);
  A.equal(reg.skills.length, 0);
  A.ok(Array.isArray(reg.errors) && reg.errors.length > 0);
  const noDir = loadRegistry(null);
  A.equal(noDir.ok, false);
  A.deepEqual(noDir.errors, ['no-board-dir']);
});

test('registry: path escape, absolute path, null root, null entries, source-less rejected', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reg-'));
  fs.mkdirSync(path.join(tmp, 'skills'));
  fs.writeFileSync(path.join(tmp, 'skills', 'ok.md'), '# ok\nSources: x\n');
  fs.writeFileSync(path.join(tmp, 'skills', 'registry.json'), JSON.stringify({ skills: [
    { id: 'bad/escape', seat: 'x', title: 'x', path: '../outside.md', sources: ['s'] },
    { id: 'bad/absolute', seat: 'x', title: 'x', path: '/etc/passwd', sources: ['s'] },
    { id: 'bad/nosources', seat: 'x', title: 'x', path: 'ok.md', sources: [] },
    null,
    'a string is not an entry'
  ] }));
  const reg = loadRegistry(tmp);
  A.equal(reg.ok, false);
  A.equal(reg.skills.length, 0);
  A.equal(reg.errors.length, 5);
  fs.writeFileSync(path.join(tmp, 'skills', 'registry.json'), 'null');
  const nullReg = loadRegistry(tmp);
  A.equal(nullReg.ok, false);
  A.equal(nullReg.skills.length, 0);
  fs.writeFileSync(path.join(tmp, 'skills', 'registry.json'), '{"skills": "not-array"}');
  const badArr = loadRegistry(tmp);
  A.equal(badArr.ok, false);
  A.ok(badArr.errors.some(e => /array/.test(e)));
});

test('matching: whole-term boundaries, no substring bleed', () => {
  A.equal(termHits('call', 'download files locally'), false, 'call must not hit locally');
  A.equal(termHits('who', 'the whole plan'), false, 'who must not hit whole');
  A.equal(termHits('call', 'book the sales call thursday'), true);
  A.equal(termHits('who', 'who is this for'), true);
  A.equal(termHits('Call', 'BOOK THE CALL'), true, 'case-insensitive');
});

test('selection: deterministic, ranked by distinct keyword hits, id tie-break', () => {
  const reg = loadRegistry(BOARD_DIR);
  const picks = selectSkills('fix churn in our subscription billing and pricing tiers', reg.skills);
  A.equal(picks[0].id, 'hormozi/retention-and-money-models');
  const again = selectSkills('fix churn in our subscription billing and pricing tiers', reg.skills);
  A.deepEqual(picks, again, 'same input, same picks');
});

test('selection: duplicate keywords count once', () => {
  const skills = [{ id: 'a', seat: 's', title: 't', path: 'p', keywords: ['ship', 'ship', 'ship'], sources: ['x'] }];
  const picks = selectSkills('ship it', skills);
  A.equal(picks[0].matched, 1, 'one point per distinct keyword');
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
  const chair = pickBoardSkills({ boardDir: BOARD_DIR, proposal: 'p', verdict: { skills: ['hormozi/offer-architecture'], recommendation: 'sell stuff' } });
  A.equal(chair.pickedBy, 'chair');
  A.equal(chair.skills[0].id, 'hormozi/offer-architecture');
  const matched = pickBoardSkills({ boardDir: BOARD_DIR, proposal: 'our email campaign funnel for the launch', verdict: {} });
  A.equal(matched.pickedBy, 'match');
  A.ok(matched.skills.length > 0);
  const none = pickBoardSkills({ boardDir: null, proposal: 'p', verdict: {} });
  A.equal(none, null, 'no registry -> skills omitted from the receipt');
});

test('selection: equal-hit tie breaks by id without sort contract violation', () => {
  const skills = [
    { id: 'b/beta', seat: 's', title: 't', path: 'p', keywords: ['ship'], sources: ['x'] },
    { id: 'a/alpha', seat: 's', title: 't', path: 'p', keywords: ['ship'], sources: ['x'] }
  ];
  const picks = selectSkills('ship it', skills);
  A.equal(picks.length, 2);
  A.deepEqual(picks.map(p => p.id), ['a/alpha', 'b/beta'], 'tie falls back to id order');
});

test('registry: unusable file path records an error instead of crashing', () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'board-skills-'));
  fs.mkdirSync(path.join(dir, 'skills'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'skills', 'registry.json'), JSON.stringify({ skills: [
    { id: 'bad/nullbyte', seat: 's', title: 't', path: 'bad\0path.md', keywords: ['x'], sources: ['y'] },
    { id: 'good/one', seat: 's', title: 't', path: 'good.md', keywords: ['x'], sources: ['y'] }
  ] }));
  fs.writeFileSync(path.join(dir, 'skills', 'good.md'), 'ok');
  const reg = loadRegistry(dir);
  A.equal(reg.skills.length, 1, 'good skill still loads');
  A.ok(reg.errors.some(e => e.includes('bad/nullbyte') && (e.includes('file check failed') || e.includes('file missing'))), 'bad path recorded in errors, no crash');
});
