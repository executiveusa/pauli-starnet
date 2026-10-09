const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const district = path.join(root, 'districts/creative/email-copywriter');
test('email specialist has one registry and a non-discoverable example', () => {
  assert.equal(fs.existsSync(path.join(district, 'citizens.yaml')), false);
  assert.equal(fs.existsSync(path.join(district, 'citizens.example.yaml')), true);
  const registry = fs.readFileSync(path.join(root, 'districts/creative/citizens.yaml'), 'utf8');
  assert.match(registry, /id: email-copywriter/);
  assert.match(registry, /mode: draft-and-review-only/);
  assert.equal(fs.existsSync(district), true);
  const knowledge = registry.match(/^    knowledge: (.+)$/m);
  assert.ok(knowledge);
  assert.equal(fs.existsSync(path.join(root, "districts/creative", knowledge[1])), true);
});
test('catalog schema is uniform and retrieved captions exist', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(district, 'knowledge/catalog.json'), 'utf8'));
  assert.ok(catalog.length > 0);
  for (const item of catalog) {
    assert.ok(Object.hasOwn(item, 'words'));
    assert.ok(Object.hasOwn(item, 'caption_file'));
    if (item.transcript_status === 'retrieved') {
      assert.ok(Number.isInteger(item.words) && item.words >= 0);
      assert.equal(typeof item.caption_file, 'string');
      assert.ok(fs.existsSync(path.join(district, 'knowledge/transcripts', item.caption_file)), item.id);
    } else {
      assert.equal(item.words, null);
      assert.equal(item.caption_file, null);
    }
  }
});
test('Middleton experiment paths exist without activating planned jobs', () => {
  for (const p of ['districts/middleton/experiments', 'districts/middleton/experiments/loop.md']) {
    assert.ok(fs.existsSync(path.join(root,p)));
  }
  const registry = fs.readFileSync(path.join(root, 'districts/middleton/citizens.yaml'), 'utf8');
  assert.match(registry, /status: PLANNED/);
});
