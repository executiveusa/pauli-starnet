const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(process.cwd(), 'districts/creative/video/youtube-system-agent');
const read = p => fs.readFileSync(p, 'utf8');

assert(fs.existsSync(path.join(root, 'CLAUDE.md')));
assert(read(path.join(root, 'CLAUDE.md')).split('\n').length <= 60);

const flows = fs.readdirSync(path.join(root, 'workflows')).filter(x => /^0\d_/.test(x));
assert.equal(flows.length, 4);
let stages = 0;
let references = 0;

for (const workflow of flows) {
  assert(fs.existsSync(path.join(root, 'workflows', workflow, 'CONTEXT.md')));
  for (const stage of fs.readdirSync(path.join(root, 'workflows', workflow, 'stages'))) {
    const context = path.join(root, 'workflows', workflow, 'stages', stage, 'CONTEXT.md');
    if (!fs.existsSync(context)) continue;
    const text = read(context);
    for (const heading of ['## Inputs', '## Process', '## Outputs', '## Human check']) {
      assert(text.includes(heading), `${context} ${heading}`);
    }
    const referenceLines = text.split('\n').filter(line => line.startsWith('- Reference:'));
    for (const line of referenceLines) {
      const paths = [...line.matchAll(/`([^`]+)`/g)].map(match => match[1]);
      assert(paths.length > 0, `${context} reference line has no path`);
      for (const relative of paths) {
        assert(!/[{}]/.test(relative), `${context} unexpanded reference ${relative}`);
        const resolved = path.resolve(path.dirname(context), relative);
        assert(fs.existsSync(resolved), `${context} broken reference ${relative}`);
        references++;
      }
    }
    stages++;
  }
}
assert.equal(stages, 29);
assert.equal(references, 37);

const corpus = path.join(root, '_shared/corpus/jake-trinder-20');
const manifest = read(path.join(corpus, 'manifest.tsv')).trim().split('\n');
assert.equal(manifest.length, 20);
let transcriptBytes = 0;
for (const row of manifest) {
  const [, id, , title, url] = row.split('\t');
  const transcript = path.join(corpus, 'transcripts', id + '.txt');
  assert(fs.existsSync(transcript), id);
  const text = read(transcript);
  transcriptBytes += Buffer.byteLength(text);
  assert(text.includes(title) && text.includes(url) && /^\[\d\d:\d\d:\d\d\.\d{3}\]/m.test(text) && text.length > 10000, id);
}
assert(transcriptBytes > 1_000_000, `transcript corpus too small: ${transcriptBytes}`);

const provenanceFiles = ['COMPLETENESS.md', 'CONTEXT.md', 'enrichment-status.md'].map(name => read(path.join(corpus, name))).join('\n');
assert(!/blocked|empty|do not call the corpus transcript-complete/i.test(provenanceFiles), 'stale transcript-block language');
assert(/youtube-transcript-api/.test(provenanceFiles), 'missing transcript extraction provenance');
assert(/6:23 AM/.test(provenanceFiles), 'missing transcript extraction time');
assert(/duration/.test(provenanceFiles), 'missing manifest duration-match provenance');

const evidenceMap = read(path.join(corpus, 'evidence-map.md'));
assert(/Creator-claim evidence map/.test(evidenceMap));
assert(!/\| Principle \| Corpus evidence \|/.test(evidenceMap));
assert((evidenceMap.match(/not independently verified/g) || []).length >= 11);

console.log(JSON.stringify({
  walk_test: 'pass',
  workflows: flows.length,
  stage_contracts: stages,
  references,
  transcripts: manifest.length,
  transcript_bytes: transcriptBytes
}));
